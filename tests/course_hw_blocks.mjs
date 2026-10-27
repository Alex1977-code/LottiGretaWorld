// Kurs-Modus, Halloween-Welt „Kürbisinsel“: Bausteine und Gimmicks in der Halloween-Werkstatt 0-20 – je Baustein das
// Kernverhalten deterministisch über window.__course.step(n) und setInput prüfen (Laternenlicht: Geisterplattformen nur im
// Licht begehbar, Vorwarnung, blinkender Laternenpfahl; Besen-Plattform trägt; Hexenkessel federt, Zaubertrank-Blasen tragen
// nach oben; Spinnennetz-Trampolin; Kürbis-Kanone; Süßigkeiten-Türen klingeln (Hinlaufen, Stampfen, Antippen) mit Inhalt,
// Signal und Zähler; Riesenkürbis rollt bergab und verletzt; Grabstein-Schalter; Glibberbach (Floß, Hineinfallen = Neustart);
// Nebel; Süßigkeiten zählen; Ziel); Sichtprüfung über Bilder tests/out/hwb_*.png (Kurs-Kamera), Kennzahlen (Zeichenaufrufe,
// Dreiecke), Themen-Bilder je Halloween-Thema (hwb_thema_*.png).
// Aufruf: PORT_BASE=3200 node tests/course_hw_blocks.mjs   (Port 4530; vorher npm run build; nutzt vite preview)
// HWB_SHOTS=0 → ohne Bilder/Themen (schneller); HWB_PART=mech|themes → nur ein Teil; HWB_DEBUG=1 → mehr Ausgaben.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4530;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.HWB_SHOTS !== '0';
const PART = process.env.HWB_PART ?? 'all';
const DEBUG = !!process.env.HWB_DEBUG;

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-20&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Halloween-Werkstatt startet nicht. Konsole:');
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    if (c.level.runtime.save) c.level.runtime.save.lives = 99;
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
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.skidTurnTime = 0;
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        window.__t.tick(o.settle ?? 30);
        return p.info();
      },
      play(segs) {
        for (const [inp, n] of segs) { c.setInput(inp); for (let i = 0; i < n; i++) window.__t.tick(1); }
        c.setInput({});
      },
      info: () => P().info(),
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      ground: () => { const g = P().ground; return g ? { tag: g.tag, top: g.top } : null; },
      ray: (x, y, z) => { const h = L().world.raycastDown(x, y, z, 40); return h ? { y: +h.y.toFixed(3), tag: h.shape.tag } : null; },
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
  try { await page.screenshot({ path: `${OUT}hwb_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

if (PART !== 'themes') {
await load();
const marks = await sc(() => window.__t.marks);
console.log('Halloween-Werkstatt 0-20');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()], theme: window.__course.view.theme.label }));
  console.log(`  Arten: ${st.kinds.join(', ')} · Thema ${st.theme}`);
  const need = ['laterne', 'laternenpfahl', 'suessigkeit', 'suessigkeiten_tuer', 'grabstein_schalter', 'raft'];
  check('Level geladen (Halloween-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['geist1', 'geist2', 'pfahl1', 'besen', 'kessel', 'kessel2', 'netz', 'kanone', 'tuer1', 'tuer2', 'tuer3', 'spender', 'schalter', 'zeitschalter', 'pfahl2', 'grabweg', 'glibber', 'floss'];
  check('Bausteine benannt (level.named)', ids.every((id) => st.named.includes(id)));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
}

// ---------------------------------------------------------------- Laternenlicht und Geisterplattformen
{
  const mid = marks.geistMitte;
  // ohne Laterne: die Geisterplatte ist nicht da → die Figur fällt hindurch
  const dark = await sc((m) => {
    const t = window.__t, c = window.__course, g = t.named('geist1');
    c.level.hwLight.carry(false);
    t.place([m[0], m[1] + 0.6, m[2]], { settle: 0 });
    let minY = 9;
    for (let i = 0; i < 90; i++) { t.tick(1); minY = Math.min(minY, c.player.pos.y); }
    return { solid: g.parts[1].solid, lit: g.parts[1].lit, minY, carried: c.level.hwLight.carried };
  }, mid);
  console.log(`  Geisterplatte ohne Laterne: fest ${dark.solid}, im Licht ${dark.lit}, Figur fällt bis y ${f2(dark.minY)}`);
  check('Geisterplattform: ohne Licht unsichtbar und nicht begehbar (Figur fällt hindurch)', !dark.carried && !dark.solid && !dark.lit && dark.minY < 0);
  // Laterne aufheben
  await sc(() => { const L = window.__course.level; L.runtime.respawn?.(); window.__t.tick(5); });
  const pick = await sc((m) => {
    const t = window.__t, c = window.__course, it = t.ents('laterne')[0];
    t.place([it.pos.x, it.pos.y + 0.1, it.pos.z], { settle: 6 });
    return { carried: c.level.hwLight.carried, hidden: it.hidden, figLantern: !!c.player.hwLantern, pickups: c.level.hwLight.pickups, src: c.level.hwLight.list.filter((s) => s.kind === 'figur').length };
  }, marks.laterne);
  console.log(`  Laterne aufgehoben: trägt ${pick.carried} (Figur ${pick.figLantern}), Item weg ${pick.hidden}, Lichtquellen an Figuren ${pick.src}`);
  check('Item laterne: Berühren → die Figur trägt eine Laterne (Lichtquelle in Handhöhe)', pick.carried && pick.hidden && pick.figLantern && pick.src === 1);
  // mit Laterne: dieselbe Platte trägt
  const lit = await sc((m) => {
    const t = window.__t, c = window.__course, g = t.named('geist1');
    t.place([m[0], m[1] + 0.6, m[2]], { settle: 0 });
    let minY = 9;
    for (let i = 0; i < 90; i++) { t.tick(1); minY = Math.min(minY, c.player.pos.y); }
    return { solid: g.parts[1].solid, lit: g.parts[1].lit, k: g.parts[1].k, minY, ground: t.ground(), far: g.parts[3].lit, y: c.player.pos.y };
  }, mid);
  console.log(`  Mit Laterne: Platte fest ${lit.solid} (Licht ${f2(lit.k)}), Figur steht auf ${lit.ground?.tag} bei y ${f2(lit.y)}; ferne Platte im Licht ${lit.far}`);
  check('Geisterplattform: im Lichtradius der Laterne sichtbar und begehbar', lit.solid && lit.lit && lit.ground?.tag === 'geisterplattform' && Math.abs(lit.y - 1) < 0.05 && lit.minY > 0.9);
  check('Geisterplattform: nur im Radius (die ferne Platte bleibt dunkel)', lit.far === false);
  // Vorwarnung: Licht weg → noch linger s fest (flackert), dann weg
  const warn = await sc(() => {
    const t = window.__t, c = window.__course, g = t.named('geist1'), q = g.parts[1];
    c.level.hwLight.carry(false);
    let warnT = 0, solidT = 0, fellAt = null;
    for (let i = 0; i < 240; i++) {
      t.tick(1);
      if (q.warn) warnT += 1 / 120;
      if (q.solid) solidT += 1 / 120;
      if (fellAt === null && c.player.mode === 'air' && c.player.vel.y < -1) fellAt = i / 120;
    }
    c.level.hwLight.carry(true);
    return { warnT, solidT, fellAt, y: c.player.pos.y };
  });
  console.log(`  Vorwarnung: flackert ${f2(warn.warnT)} s, noch fest ${f2(warn.solidT)} s, Figur fällt ab ${f2(warn.fellAt)} s`);
  check('Geisterplattform: Vorwarnung – nach dem Licht noch ≈ 0,8 s fest und flackernd, dann löst sie sich auf', warn.warnT > 0.7 && warn.warnT < 0.9 && warn.solidT > 0.7 && warn.solidT < 0.9 && warn.fellAt !== null && warn.fellAt > 0.7);
  await sc(() => { window.__course.level.runtime.respawn?.(); window.__t.tick(5); });
  // Steckt die Figur in der Platte, wenn das Licht kommt, wird sie erst danach fest
  const inside = await sc((m) => {
    const t = window.__t, c = window.__course, g = t.named('geist1'), q = g.parts[0];
    c.level.hwLight.carry(false);
    t.tick(130);
    t.place([q.p.x, q.p.y + 0.05, q.p.z], { settle: 0 });
    c.level.hwLight.carry(true);
    const w0 = q.waits;
    t.tick(2);
    return { waits: q.waits - w0, solidNow: q.solid };
  }, mid);
  console.log(`  Figur steckt in der Platte: wartet ${inside.waits} Schritte, fest ${inside.solidNow}`);
  check('Geisterplattform: wird nicht fest, solange eine Figur darin steckt', inside.waits > 0 && !inside.solidNow);
  await T('place', marks.geist1, { settle: 40 });
  await shot('laterne', 1600);
  // Laternenpfahl blinkt: die blaue Brücke folgt nur ihm (nicht der Handlaterne), mit Vorwarnung
  const post = await sc(() => {
    const t = window.__t, c = window.__course, g = t.named('geist2'), pf = t.named('pfahl1');
    let on = 0, off = 0, solidOn = 0, solidOff = 0, flick = 0, warn = 0;
    for (let i = 0; i < 8 * 120; i++) {
      t.tick(1);
      if (pf.on) on++; else off++;
      if (pf.flick) flick++;
      if (g.parts[1].warn) warn++;
      if (g.parts[1].solid && pf.on) solidOn++;
      if (g.parts[1].solid && !pf.on) solidOff++;
    }
    return { on: on / 120, off: off / 120, solidOn: solidOn / 120, solidOff: solidOff / 120, flick: flick / 120, warn: warn / 120, toggles: pf.toggles };
  });
  console.log(`  Laternenpfahl blinkt: an ${f2(post.on)} s, aus ${f2(post.off)} s, flackert ${f2(post.flick)} s; Brücke fest bei Licht ${f2(post.solidOn)} s, danach noch ${f2(post.solidOff)} s (Vorwarnung ${f2(post.warn)} s)`);
  check('Laternenpfahl: blinkt (an/aus) und flackert vor dem Ausgehen', post.on > 3 && post.off > 1.5 && post.flick > 0.5);
  check('Geisterbrücke (light pfahl): fest, solange der Pfahl leuchtet, danach nur noch kurz', post.solidOn > 3 && post.solidOff > 0.3 && post.solidOff < 2 && post.warn > 0.3);
  const notHand = await sc((m) => {
    const t = window.__t, c = window.__course, g = t.named('geist2'), pf = t.named('pfahl1');
    pf.stop();
    t.tick(130);
    t.place([m[0], m[1] + 0.6, m[2]], { settle: 0 });
    let minY = 9;
    for (let i = 0; i < 90; i++) { t.tick(1); minY = Math.min(minY, c.player.pos.y); }
    const r = { solid: g.parts[1].solid, minY, carried: c.level.hwLight.carried };
    pf.start();
    return r;
  }, marks.geist2b);
  check('Geisterbrücke (light pfahl): die Handlaterne allein zeigt sie nicht', notHand.carried && !notHand.solid && notHand.minY < 0);
  await sc(() => { window.__course.level.runtime.respawn?.(); window.__t.tick(5); });
  await T('place', marks.pfahl, { settle: 20 });
  await shot('pfahl', 1600);
}

// ---------------------------------------------------------------- Besen-Plattform
{
  const b0 = await sc(() => window.__t.named('besen').info());
  const ride = await sc((m) => {
    const t = window.__t, c = window.__course, b = t.named('besen');
    t.place([m[0], m[1] + 0.4, m[2]], { settle: 20 });
    const started = b.running;
    let minZ = 0, onT = 0, maxY = 0;
    for (let i = 0; i < 6 * 120; i++) {
      t.tick(1);
      minZ = Math.min(minZ, c.player.pos.z);
      maxY = Math.max(maxY, c.player.pos.y);
      if (c.player.mode === 'ground' && c.player.ground?.tag === 'besen_plattform') onT++;
    }
    return { started, minZ, onT: onT / 120, maxY, dead: c.player.dead, info: b.info() };
  }, marks.besen);
  console.log(`  Besen: wartet ${!b0.running}, startet beim Draufstellen ${ride.started}; trägt die Figur ${f2(ride.onT)} s bis z ${f2(ride.minZ)} (Scheitel y ${f2(ride.maxY)})`);
  check('Besen-Plattform: wartet, bis eine Figur draufsteht (start stand), fliegt dann los', !b0.running && ride.started);
  check('Besen-Plattform: trägt die Figur über die Schlucht (Bahn mit Bogen)', ride.onT > 5 && ride.minZ < -66 && ride.maxY > 1.6 && !ride.dead);
  await sc((m) => { const t = window.__t, b = t.named('besen'); b.reset(); t.tick(2); t.place([m[0], m[1] + 0.4, m[2]], { settle: 150 }); }, marks.besen);
  await shot('besen', 1500);
}

// ---------------------------------------------------------------- Hexenkessel, Zaubertrank-Blasen, Spinnennetz
{
  const k = await sc((m) => {
    const t = window.__t, c = window.__course, h = t.named('kessel');
    t.place([m[0], m[1] + 1.2, m[2]], { settle: 0 });
    let maxY = 0;
    for (let i = 0; i < 2.2 * 120; i++) { t.tick(1); maxY = Math.max(maxY, c.player.pos.y); }
    return { maxY, top: h.top, bounces: h.bounces, strength: h.strength };
  }, marks.kesselTop);
  console.log(`  Hexenkessel: Abprall ${k.bounces}, Scheitel ${f2(k.maxY)} (Rand ${f2(k.top)}, +${f2(k.maxY - k.top)} m)`);
  check('Hexenkessel: federt die Figur hoch (≈ 7,5 m über den Rand)', k.bounces >= 1 && k.maxY - k.top > 6.5);
  const pot = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('kessel2');
    let b = null;
    for (let i = 0; i < 6 * 120 && !b; i++) { t.tick(1); b = h.bubbles.find((q) => q.sid !== null && q.state === 'rise' && q.y < h.top + 2.5) ?? null; }
    if (!b) return { none: true, info: h.info() };
    t.place([b.x, b.shape.y1 + 0.05, b.z], { settle: 0 });
    const y0 = c.player.pos.y;
    let onT = 0, maxY = y0;
    for (let i = 0; i < 2 * 120; i++) { t.tick(1); if (c.player.mode === 'ground' && c.player.ground?.tag === 'zaubertrank_blase') onT++; maxY = Math.max(maxY, c.player.pos.y); }
    const pops0 = h.pops;
    let popped = false;
    for (let i = 0; i < 8 * 120 && !popped; i++) { t.tick(1); popped = h.pops > pops0; }
    return { y0, maxY, onT: onT / 120, popped, spawned: h.spawned };
  });
  console.log(`  Zaubertrank-Blase: trägt ${f2(pot.onT)} s, Figur steigt von y ${f2(pot.y0)} auf ${f2(pot.maxY)}; platzt ${pot.popped} (Blasen bisher ${pot.spawned})${pot.none ? ' – keine Blase! ' + JSON.stringify(pot.info) : ''}`);
  check('Zaubertrank-Blasen: steigen als Plattformen auf, tragen die Figur nach oben und platzen', !pot.none && pot.onT > 1.5 && pot.maxY - pot.y0 > 2.5 && pot.popped);
  const n = await sc((m) => {
    const t = window.__t, c = window.__course, h = t.named('netz');
    t.place([m[0], m[1] + 1.5, m[2]], { settle: 0 });
    let maxY = 0, sag = 0;
    for (let i = 0; i < 2 * 120; i++) { t.tick(1); maxY = Math.max(maxY, c.player.pos.y); }
    return { maxY, top: h.top, bounces: h.bounces };
  }, marks.netz);
  console.log(`  Spinnennetz-Trampolin: Abprall ${n.bounces}, Scheitel +${f2(n.maxY - n.top)} m über dem Netz`);
  check('Spinnennetz-Trampolin: federt (≈ 5,5 m)', n.bounces >= 1 && n.maxY - n.top > 4.5 && n.maxY - n.top < 7.5);
  await T('place', marks.kessel, { settle: 30 });
  await shot('kessel', 1600);
}

// ---------------------------------------------------------------- Kürbis-Kanone
{
  const kn = await sc(() => {
    const t = window.__t, c = window.__course, h = t.named('kanone');
    t.place([h.from.x, h.from.y + 1.3, h.from.z], { settle: 0 });
    let st = { load: 0, fly: 0, cannon: 0, hidden: 0 };
    for (let i = 0; i < 6 * 120; i++) {
      t.tick(1);
      if (h.state === 'load') st.load++;
      if (h.state === 'fly') st.fly++;
      if (c.player.state === 'cannon') st.cannon++;
      if (c.player.hidden) st.hidden++;
      if (h.shots > 0 && h.state === 'idle' && c.player.mode === 'ground') break;
    }
    const p = c.player;
    return { st, shots: h.shots, x: p.pos.x, y: p.pos.y, z: p.pos.z, to: h.to, dead: p.dead };
  });
  console.log(`  Kürbis-Kanone: lädt ${f2(kn.st.load / 120)} s (Figur versteckt ${f2(kn.st.hidden / 120)} s), Flug ${f2(kn.st.fly / 120)} s (state cannon ${f2(kn.st.cannon / 120)} s) → landet bei ${f2(kn.x)} ${f2(kn.y)} ${f2(kn.z)}`);
  check('Kürbis-Kanone: hineinspringen → laden → Flug (Zustand cannon) genau aufs Ziel (Röhrenkanonen-Mechanik)', kn.shots === 1 && kn.st.load > 50 && kn.st.cannon > 60 && Math.hypot(kn.x - kn.to.x, kn.z - kn.to.z) < 1 && Math.abs(kn.y - kn.to.y) < 0.1 && !kn.dead);
  await T('place', marks.kanone, { settle: 30 });
  await shot('kanone', 1500);
}

// ---------------------------------------------------------------- Süßigkeiten-Türen
{
  const sig = await sc(() => { const L = window.__course.level; window.__klingeln = []; L.onSignal('klingeln', (d) => window.__klingeln.push({ id: d.id, content: d.content, n: d.n, of: d.of, via: d.via })); return true; });
  // Hinlaufen: vor der Tür stehen und zu ihr schauen
  const d1 = await sc((m) => {
    const t = window.__t, c = window.__course, L = c.level, door = t.ent('tuer1');
    const coins0 = L.runtime.coins, ncoin0 = t.ents('coin').length;
    t.place(m, { settle: 0, yaw: Math.PI });
    const states = new Set();
    for (let i = 0; i < 3.5 * 120; i++) { t.tick(1); states.add(door.state); }
    return { states: [...states], rings: door.rings, via: door.via, lit: door.lit, coins: L.runtime.coins - coins0, spawned: t.ents('coin').length - ncoin0, hud: L._hwHud?.state() ?? null };
  }, marks.tuer1);
  console.log(`  Tür 1 (Hinlaufen): Zustände ${d1.states.join('→')}, klingelt ${d1.rings}× über ${d1.via}; Bitcoins +${d1.coins} gesammelt, ${d1.spawned} liegen noch; HUD ${JSON.stringify(d1.hud)}`);
  check('Süßigkeiten-Tür: Hinlaufen klingelt → Tür geht auf und wieder zu, Bitcoins kommen heraus', d1.rings === 1 && d1.via === 'walk' && d1.states.includes('open') && d1.states.includes('done') && d1.coins + d1.spawned === 5 && d1.lit);
  // Stampfen auf die Schwelle: Süßigkeiten fliegen heraus
  const d2 = await sc((m) => {
    const t = window.__t, c = window.__course, L = c.level, door = t.ent('tuer2');
    const n0 = t.ents('suessigkeit').length, candy0 = L.hwCandy ?? 0;
    // über die Schwelle (0,45 m vor der Tür), dann Stampfattacke
    t.place([door.pos.x + door.nx * 0.45, door.pos.y + 2.4, door.pos.z + door.nz * 0.45], { settle: 0, yaw: 0 });
    c.setInput({ crouch: true });
    for (let i = 0; i < 60; i++) t.tick(1);
    c.setInput({});
    for (let i = 0; i < 2.4 * 120; i++) t.tick(1);
    const candies = t.ents('suessigkeit').filter((e) => Math.hypot(e.pos.x - door.pos.x, e.pos.z - door.pos.z) < 6);
    return { rings: door.rings, via: door.via, out: door.out, spawned: t.ents('suessigkeit').length - n0 + (L.hwCandy ?? 0) - candy0, landed: candies.filter((e) => !e.flying).length + (L.hwCandy ?? 0) - candy0, pos: candies.map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(2), +e.pos.z.toFixed(1)]) };
  }, marks.tuer2);
  console.log(`  Tür 2 (Stampfen): klingelt ${d2.rings}× über ${d2.via}; ${d2.out} Süßigkeiten heraus, gelandet ${d2.landed} ${DEBUG ? JSON.stringify(d2.pos) : ''}`);
  check('Süßigkeiten-Tür: Stampfen auf die Schwelle klingelt; Süßigkeiten fliegen heraus und landen', d2.rings === 1 && d2.via === 'stomp' && d2.out === 6 && d2.spawned === 6 && d2.landed === 6);
  // Süßigkeiten einsammeln: zählen wie Bitcoins (+1), level.hwCandy, HUD „Süßes n“
  const col = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, door = t.ent('tuer2');
    const coins0 = L.runtime.coins, candy0 = L.hwCandy ?? 0;
    const list = t.ents('suessigkeit').filter((e) => Math.hypot(e.pos.x - door.pos.x, e.pos.z - door.pos.z) < 6);
    const n = list.length;
    for (const e of list) t.place([e.pos.x, e.pos.y + 0.05, e.pos.z], { settle: 3 });
    return { n, coins: L.runtime.coins - coins0, candy: (L.hwCandy ?? 0) - candy0, left: list.filter((e) => !e.removed).length, total: L.hwCandy, hud: L._hwHud?.state()?.suesses ?? null };
  });
  console.log(`  Süßigkeiten gesammelt: +${col.candy} (Bitcoins +${col.coins}), übrig ${col.left}; HUD ${JSON.stringify(col.hud)}`);
  check('Süßigkeit: zählt wie eine Münze (+1 Bitcoin), level.hwCandy zählt, HUD „Süßes n“', col.n > 0 && col.candy === col.n && col.coins === col.n && col.left === 0 && col.hud?.text === `Süßes ${col.total}`);
  // Antippen (Touch-Ziel): Kürbling springt heraus; alle drei Türen → onAll
  const d3 = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, door = t.ent('tuer3');
    t.place([0, 1, -158], { settle: 10 });
    const coins0 = L.runtime.coins;
    const enemies0 = L.entities.filter((e) => e.enemy && !e.removed).length;
    L.taps.tapTarget(door.tap);
    for (let i = 0; i < 2 * 120; i++) t.tick(1);
    const en = L.entities.filter((e) => e.enemy && !e.removed);
    return { rings: door.rings, via: door.via, newEnemies: en.length - enemies0, kinds: [...new Set(en.map((e) => e.kind))], count: L.hwDoors.tueren, coins: L.runtime.coins - coins0, hud: L._hwHud?.state()?.['tueren:tueren'] ?? null };
  });
  const sigs = await sc(() => window.__klingeln);
  console.log(`  Tür 3 (Antippen): klingelt ${d3.rings}× über ${d3.via}; Gegner heraus ${d3.newEnemies} (${d3.kinds.join(', ')}); Zähler ${JSON.stringify(d3.count)}, onAll Bitcoins +${d3.coins}; HUD ${JSON.stringify(d3.hud)}`);
  console.log(`  Signale klingeln: ${sigs.map((s) => `${s.id}:${s.content}:${s.n}/${s.of}:${s.via}`).join(' · ')}`);
  check('Süßigkeiten-Tür: Antippen klingelt, ein Gegner (Kürbling bzw. Ersatz) springt heraus', d3.rings === 1 && d3.via === 'tap' && d3.newEnemies === 1);
  check('Süßigkeiten-Türen: Signal level.signal(\'klingeln\') je Tür, Zähler n/N, alle → onAll', sigs.length === 3 && sigs[2].n === 3 && sigs[2].of === 3 && d3.count.done && d3.coins === 5 && d3.hud?.text === 'Türen 3/3');
  await T('place', marks.tueren, { settle: 30 });
  await shot('tueren', 1600);
}

// ---------------------------------------------------------------- Riesenkürbis
{
  const rk = await sc((m) => {
    const t = window.__t, c = window.__course, L = c.level, sp = t.named('spender');
    t.place(m, { settle: 0, yaw: Math.PI / 2 });
    const run0 = sp.running;
    let hurt = null, maxV = 0, maxVramp = 0, first = null;
    for (let i = 0; i < 9 * 120 && !hurt; i++) {
      t.tick(1);
      for (const e of t.ents('riesenkuerbis')) { maxV = Math.max(maxV, e.speed()); if (e.pos.x < -4.5) maxVramp = Math.max(maxVramp, e.speed()); first ??= e.info(); }
      if (c.player.invuln > 0 || !c.player.big) hurt = { t: i / 120, big: c.player.big, invuln: c.player.invuln, vx: c.player.vel.x };
    }
    return { run0, running: sp.running, spawned: sp.spawned, maxV, maxVramp, hurt, first };
  }, marks.kuerbisBahn);
  console.log(`  Riesenkürbis: Spender läuft ${rk.running} (vorher ${rk.run0}), ausgestoßen ${rk.spawned}; Tempo bergab bis ${f2(rk.maxVramp)} m/s (Start 2,5); Treffer ${JSON.stringify(rk.hurt)}`);
  check('Riesenkürbis: Spender startet in der Nähe und stößt Kürbisse aus; bergab werden sie schneller', !rk.run0 && rk.running && rk.spawned >= 1 && rk.maxVramp > 4);
  check('Riesenkürbis: rollt in die Figur → Treffer (klein, unverwundbar) und Stoß weg', !!rk.hurt && !rk.hurt.big && rk.hurt.invuln > 0);
  const pd = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level;
    L.named.get('spender').stop();
    const e = L.spawn('riesenkuerbis', { pos: [0, 1, -194], dir: [1, 0], speed: 0.4, id: 'testkuerbis' });
    t.tick(10);
    t.place([e.pos.x, e.pos.y + 3.2, e.pos.z], { settle: 0 });
    c.setInput({ crouch: true });
    let st = null;
    for (let i = 0; i < 90 && !st; i++) { t.tick(1); if (e.state === 'burst') st = { t: i / 120, big: c.player.big, inv: c.player.invuln }; }
    c.setInput({});
    return { st };
  });
  check('Riesenkürbis: Stampfattacke von oben lässt ihn zerplatzen (ohne Treffer)', !!pd.st && pd.st.big && pd.st.inv === 0);
  // Bahn (path): folgt den Punkten, bergab schneller, zerplatzt am Ende
  const pa = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level;
    t.place([-6, 1, -175], { settle: 0 });
    const e = L.spawn('riesenkuerbis', { path: [[8, 3, -172], [8, 1, -180], [4, 1, -196]], speed: 2 });
    let maxDx = 0, maxV = 0, burstAt = null;
    for (let i = 0; i < 12 * 120 && burstAt === null; i++) {
      t.tick(1);
      if (e.state === 'burst') { burstAt = i / 120; break; }
      // Abstand zur Polylinie (nur xz)
      const z = e.pos.z, x = e.pos.x;
      const ex = z > -180 ? 8 : 8 - (z + 180) / -16 * 4;
      maxDx = Math.max(maxDx, Math.abs(x - ex));
      if (z > -180) maxV = Math.max(maxV, e.speed());
    }
    return { maxDx, maxV, burstAt, end: [+e.pos.x.toFixed(2), +e.pos.z.toFixed(2)] };
  });
  console.log(`  Riesenkürbis auf Bahn: Abweichung ≤ ${f2(pa.maxDx)} m, bergab bis ${f2(pa.maxV)} m/s, zerplatzt am Ende nach ${f2(pa.burstAt)} s bei ${JSON.stringify(pa.end)}`);
  check('Riesenkürbis auf einer Bahn (path): folgt den Punkten, bergab schneller, zerplatzt am Ende', pa.maxDx < 0.05 && pa.maxV > 2.5 && pa.burstAt !== null && Math.abs(pa.end[1] + 196) < 0.6);
  await sc(() => window.__course.level.named.get('spender').start());
  await T('place', marks.kuerbis, { settle: 4 * 120 });
  await shot('kuerbis', 1500);
}

// ---------------------------------------------------------------- Grabstein-Schalter
{
  const gs = await sc((m) => {
    const t = window.__t, c = window.__course, L = c.level, h = t.named('schalter');
    let sig = 0; L.onSignal('grabstein', () => sig++);
    const before = t.ray(0, 3, -216);
    const plate0 = h.info().top;
    t.place([m[0], plate0 + 0.4, m[2]], { settle: 0 });
    for (let i = 0; i < 120; i++) t.tick(1);
    return { pressed: h.pressed, presses: h.presses, sig, before, after: t.ray(0, 3, -216), plate0, plate: h.info().top };
  }, marks.schalter);
  console.log(`  Grabstein-Schalter: gedrückt ${gs.pressed} (${gs.presses}×, Signal ${gs.sig}), Druckfläche ${gs.plate0} → ${gs.plate}; Weg vorher ${JSON.stringify(gs.before)} → nachher ${JSON.stringify(gs.after)}`);
  check('Grabstein-Schalter: Draufspringen drückt (Druckfläche sinkt), Aktion on (Weg erscheint) und Signal', gs.pressed && gs.presses === 1 && gs.sig === 1 && gs.plate < gs.plate0 - 0.15 && (!gs.before || gs.before.y < 0) && gs.after?.tag === 'appear');
  const zs = await sc((m) => {
    const t = window.__t, c = window.__course, h = t.named('zeitschalter'), pf = t.named('pfahl2');
    const off0 = pf.on;
    t.place([m[0], h.info().top + 0.4, m[2]], { settle: 0 });
    for (let i = 0; i < 60; i++) t.tick(1);
    const on1 = pf.on;
    t.place([0, 1, -207], { settle: 0 });
    let offAt = null;
    for (let i = 0; i < 7 * 120 && offAt === null; i++) { t.tick(1); if (!pf.on) offAt = i / 120; }
    return { off0, on1, offAt, pressed: h.pressed };
  }, marks.zeitschalter);
  console.log(`  Zeit-Schalter: Laterne vorher ${zs.off0}, gedrückt → an ${zs.on1}; geht nach ${f2(zs.offAt)} s wieder aus`);
  check('Grabstein-Schalter mit time: schaltet die Laterne an (start) und nach der Zeit wieder aus (off)', zs.off0 === false && zs.on1 === true && zs.offAt > 3.5 && zs.offAt < 5.5 && !zs.pressed);
  await T('place', marks.schalterBlick, { settle: 30 });
  await shot('schalter', 1500);
}

// ---------------------------------------------------------------- Glibberbach
{
  const gk = await sc((m) => {
    const t = window.__t, c = window.__course, L = c.level;
    t.place([0, 1, -235], { settle: 20 });   // Checkpoint anfassen
    t.place([0, 1.6, -250], { settle: 0 });
    let dead = null, tag = null;
    for (let i = 0; i < 2 * 120 && !dead; i++) { t.tick(1); if (c.player.dead) dead = c.player.deathCause; }
    for (const s of L.world.overlapAABB({ x: 0, y: -0.7, z: -250 }, { x: 0.1, y: 0.1, z: 0.1 })) if (s.glibber) tag = s.tag;
    for (let i = 0; i < 6 * 120 && c.player.dead; i++) t.tick(1);
    return { dead, tag, alive: !c.player.dead, z: c.player.pos.z };
  });
  console.log(`  Glibber: hineingefallen → ${gk.dead} (Form ${gk.tag}); Neustart bei z ${f2(gk.z)}`);
  check('Glibberbach: Hineinfallen = Neustart am Checkpoint (kein Schwimmwasser)', gk.dead === 'fall' && gk.tag === 'glibberbach' && gk.alive && Math.abs(gk.z + 235) < 2);
  const fl = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, r = t.ent('floss');
    t.place([r.pos.x, r.pos.y + 1.2, r.pos.z], { settle: 0 });
    let mounted = 0, minZ = 0, dis = null;
    for (let i = 0; i < 25 * 120; i++) {
      t.tick(1);
      if (c.player.mode === 'mount') mounted++;
      minZ = Math.min(minZ, c.player.pos.z);
      if (mounted && c.player.mode !== 'mount' && dis === null) dis = i / 120;
      if (dis !== null && c.player.mode === 'ground') break;
    }
    return { mounted: mounted / 120, minZ, dis, mode: c.player.mode, y: c.player.pos.y, z: c.player.pos.z, dead: c.player.dead };
  });
  console.log(`  Floß auf dem Glibberbach: geritten ${f2(fl.mounted)} s bis z ${f2(fl.minZ)}, abgestiegen nach ${f2(fl.dis)} s → ${fl.mode} bei y ${f2(fl.y)}, z ${f2(fl.z)}`);
  check('Glibberbach: das Floß (Pflaume) fährt auf dem Glibber mit der Strömung bis ans Ende, Absteigen an Land', fl.mounted > 5 && fl.dis !== null && fl.mode === 'ground' && !fl.dead && fl.z < -276 && Math.abs(fl.y - 1) < 0.05);
  const sink = await sc(() => {
    const t = window.__t, L = window.__course.level, g = t.named('glibber');
    const s0 = g.sunk;
    L.spawn('pilzling', { pos: [0, 0.6, -258] });
    for (let i = 0; i < 3 * 120; i++) t.tick(1);
    return { sunk: g.sunk - s0 };
  });
  check('Glibberbach: Gegner versinken blubbernd (zählen als besiegt)', sink.sunk === 1);
  await sc(() => { const t = window.__t, r = t.ent('floss'); r.goHome(); });
  await T('place', marks.glibber, { settle: 30 });
  await shot('glibber', 1500);
}

// ---------------------------------------------------------------- Nebel, Kulisse, Ziel
{
  const nb = await sc(() => { const o = window.__course.view.three.getObjectByName('nebel'); return o ? { layers: o.material.uniforms.uLayers.value, density: o.material.uniforms.uDensity.value } : null; });
  check('Nebel: Bodennebel-Feld (Schichten, rein optisch, keine Kollision)', !!nb && nb.layers === 3 && (await T('ray', 0, 3, -300))?.tag !== 'nebel');
  await T('place', marks.nebel, { settle: 30 });
  await shot('nebel', 1600);
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 70], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Halloween-Werkstatt erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 120 Zeichenaufrufe in allen Bildern', stats.every((s) => s[1] < 120));
  check('Budget: < 300 k Dreiecke in allen Bildern', stats.every((s) => s[2] < 300000));
}
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);
}

// ---------------------------------------------------------------- Themen (?theme=) mit Bildern
if (PART !== 'mech' && SHOTS) {
  console.log('Halloween-Themen');
  const VIEWS = { pumpkin: ['start', 'kanoneZiel'], pumpkin_night: ['start'], candyvillage: ['tueren'], graveyard: ['geist1:l'], witchtower: ['kessel'], castle_night: ['schalterBlick'] };
  const labels = {};
  const t0 = stats.length;
  for (const th of Object.keys(VIEWS)) {
    const e0 = errors.length;
    await load(`&theme=${th}`);
    const m = await sc(() => window.__t.marks);
    labels[th] = await sc(() => ({ label: window.__course.view.theme.label, backdrop: window.__course.view.theme.backdrop ?? null, dark: !!window.__course.view.toyLight?.dark }));
    for (const [k, w0] of VIEWS[th].entries()) {
      const [w, lant] = w0.split(':');
      if (lant) await sc(() => window.__course.level.hwLight?.carry(true));
      await T('place', m[w], { settle: 30 });
      await shot(k ? `thema_${th}_${w}` : `thema_${th}`, 1700);
    }
    console.log(`  ${th}: ${labels[th].label} (Kulisse ${labels[th].backdrop}, dunkel ${labels[th].dark})${errors.length > e0 ? ' – Fehler!' : ''}`);
  }
  const ls = Object.values(labels).map((l) => l.label);
  check('Themen: alle sechs Halloween-Themen registriert (eigene Namen, eigene Kulisse)', ls.every((l) => l && l !== 'Wiese') && new Set(ls).size === 6 && Object.values(labels).every((l) => l.backdrop));
  check('Themen: Figurenlicht (Spielzeug-Randlicht der dunklen Themen) überall aktiv', Object.values(labels).every((l) => l.dark));
  const ts = stats.slice(t0);
  for (const s of ts) console.log(`    ${s[0].padEnd(26)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Themen-Bilder: < 120 Zeichenaufrufe, < 300 k Dreiecke', ts.length >= 6 && ts.every((s) => s[1] < 120 && s[2] < 300000));
  check('Themen: keine Konsolenfehler', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
