// Kurs-Modus, Welt-8-Mechaniken, -Bausteine, -Themen und Abspann in der Rummelwerkstatt 0-31: je Baustein das Kernverhalten
// deterministisch über window.__course.step(n) und setInput prüfen – mit Gegenprobe (Leuchtstege: begehbar unsichtbar, nur um
// die Figur sichtbar, Aufleuchten bei Stampfstein/Stampfattacke/Signal; Kristall-Felsklotz: ruht, fährt mit der Figur los,
// Stampfen beschleunigt, versinkt und kommt wieder; Würfel-Felsklotz mit zwei Abstürzen; Steigbecken; schwebende Wasser-
// körper; Stachelblöcke blau/rot und Stachelwand; Keksräder und Keks-Zahnräder; Schubfeld; Riesenrad mit Schubser;
// Lavabrocken-Regen mit Landemarken; großer Spiegel mit Spiegel-Stern; Fallblock-Brücke; Super-POW-Block 4×; Abspann-
// Auslöser; Hüllen als kind), Sichtprüfung über Bilder tests/out/w8b_*.png (Kurs-Kamera), Kennzahlen (Zeichenaufrufe,
// Dreiecke), Themen-Bilder je Welt-8-Thema (w8b_thema_*.png) und der Abspann (?credits=1: startet, Musik course_abspann,
// Texte rollen, endet von selbst, zurück zur Karte, courseSave.data.finished, Pokal im Karten-HUD; Weg aus dem Level über
// die Aktion { credits: true }; Bilder w8b_abspann_*.png).
// Aufruf: node tests/course_w8_blocks.mjs   (Port 4760 + PORT_BASE; vorher npm run build; nutzt vite preview)
// W8B_SHOTS=0 → ohne Bilder; W8B_PART=mech|themes|credits → nur ein Teil; W8B_DEBUG=1 → mehr Ausgaben.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4760;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SHOTS = process.env.W8B_SHOTS !== '0';
const PART = process.env.W8B_PART ?? 'all';
const DEBUG = !!process.env.W8B_DEBUG;

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-31&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Rummelwerkstatt startet nicht. Konsole:');
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
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        window.__t.tick(o.settle ?? 30);
        return p.info();
      },
      until(cond, n = 1200) { for (let i = 0; i < n; i++) { if (cond()) return i; c.step(1); } return cond() ? n : -1; },
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      hurt: () => { const p = P(); return p.dead || !p.big || p.invuln > 0.05; },
      hs: () => Math.hypot(P().vel.x, P().vel.z),
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const stats = [];
async function freshFrames(n = 3, timeout = 30000) {
  const f0 = await sc(() => (window.__course ?? window.__credits)?.view?.frame ?? 0);
  try { await page.waitForFunction((f) => ((window.__course ?? window.__credits)?.view?.frame ?? 1e9) >= f, f0 + n, { timeout }); } catch { /* weiter */ }
}
async function shot(name, wait = 1500, credits = false) {
  if (!SHOTS) return;
  if (!credits) await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  await freshFrames();
  const s = await sc((cr) => (cr ? window.__credits : window.__course).stats(), credits);
  stats.push([name, s.calls, s.triangles]);
  if (DEBUG) console.log('  [Bild]', name, s.calls, s.triangles);
  try { await page.screenshot({ path: `${OUT}w8b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

if (PART === 'all' || PART === 'mech') {
await load();
const marks = await sc(() => window.__t.marks);
console.log('Rummelwerkstatt 0-31');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()] }));
  const ids = ['steg1', 'steg2', 'treppe', 'klotz1', 'wuerfel', 'becken', 'wuerfel1', 'wuerfel2', 'blau1', 'rot1', 'wand1', 'keks1', 'keks2', 'zahn1', 'zahn2', 'schub1', 'rad', 'regen', 'spiegel', 'fallbr', 'superpow'];
  const miss = ids.filter((id) => !st.named.includes(id));
  check('Level geladen, Welt-8-Bausteine benannt (level.named)', miss.length === 0 && st.kinds.includes('stampfstein') && st.kinds.includes('schubser'));
  if (miss.length) console.log('   fehlen:', miss.join(', '));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
}

// ---------------------------------------------------------------- Leuchtstege
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const s1 = t.named('steg1'), s2 = t.named('steg2');
    // unsichtbar, aber begehbar; sichtbar nur um die Figur
    t.place([0, 0.05, -18], { settle: 40 });
    const stand = p.mode === 'ground' && Math.abs(p.pos.y) < 0.06 && !p.dead;
    const near = s1.visibleAt(0, 0, -19), far = s1.visibleAt(0, 0, -23.8), farS2 = s2.visibleAt(-2, 0, -30);
    // Stampfstein: Figur unter den Stein → er fällt auf den Steg → großflächiges Aufleuchten
    const imp0 = L.w8.impacts;
    t.place([3, 0.05, -26.6], { settle: 1, invuln: 99 });
    const stone = t.ent('stampf');
    const fell = t.until(() => stone.state === 'land', 600);
    p.pos.set(0, 0, -11); p.vel.set(0, 0, 0);
    t.tick(30);
    const lit = s2.visibleAt(-2, 0, -30), byStone = L.w8.flashes.some((f) => f.by === 'stampfstein');
    t.tick(400);
    const faded = s2.visibleAt(-2, 0, -30);
    // Stampfattacke der Figur auf dem Steg
    t.place([0, 3.2, -14], { settle: 0, invuln: 99 });
    c.setInput({ crouch: true }); t.tick(2); c.setInput({});
    const landed = t.until(() => p.mode === 'ground' && p.poundLanded, 300);
    t.tick(30);
    const byPound = L.w8.flashes.some((f) => f.by === 'stampfen'), poundLit = s1.visibleAt(0, 0, -20.2);
    // Signal 'aufschlag' (Schnittstelle für Gegner)
    const n0 = L.w8.impacts;
    L.signal('aufschlag', { pos: [0, 0, -28], radius: 6 });
    t.tick(30);
    const sig = L.w8.impacts - n0 === 1 && s2.visibleAt(0, 0, -30) > 0.5;
    t.tick(400);
    return { stand, near: +near.toFixed(2), far: +far.toFixed(2), farS2: +farS2.toFixed(2), fell, lit: +lit.toFixed(2), byStone, faded: +faded.toFixed(2), landed, byPound, poundLit: +poundLit.toFixed(2), sig, impacts: L.w8.impacts - imp0 };
  });
  console.log(`  Leuchtsteg: steht ${r.stand}, nah ${r.near}, fern ${r.far}/${r.farS2}; Stampfstein (nach ${r.fell} Schritten) → ${r.lit} (${r.byStone}), später ${r.faded}; Stampfattacke → ${r.poundLit} (${r.byPound}); Signal ${r.sig}; Aufschläge ${r.impacts}`);
  check('Leuchtsteg: unsichtbar begehbar; sichtbar nur im Umkreis der Figur (Gegenprobe: 5,8 m entfernt unsichtbar)', r.stand && r.near > 0.9 && r.far < 0.05 && r.farS2 < 0.05);
  check('Leuchtsteg: Aufschlag des Stampfsteins lässt ihn großflächig aufleuchten, danach verblasst er wieder', r.fell >= 0 && r.byStone && r.lit > 0.6 && r.faded < 0.05);
  check('Leuchtsteg: Stampfattacke der Figur und Signal „aufschlag“ lassen ihn aufleuchten', r.landed >= 0 && r.byPound && r.poundLit > 0.6 && r.sig);
  await T('place', marks.stegMitte, { settle: 30 });
  await shot('leuchtsteg', 900);
}

// ---------------------------------------------------------------- Kristall-Felsklotz
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const k = t.named('klotz1');
    k.reset();
    t.place([0, 0, -40], { settle: 10 });
    t.tick(360);
    const rest = k.state === 'ruhe' && k.s === 0;
    // aufsteigen: fährt los und nimmt die Figur mit
    t.place([0, 0.4, -44.2], { settle: 20, invuln: 99 });
    const on = k.carries(p);
    t.tick(240);
    const moving = k.state === 'faehrt' && k.s > 1.5, z1 = p.pos.z, carried = k.carries(p) && z1 < -45.5;
    const sp0 = k.speed, b0 = k.boosts;
    // Stampfattacke auf dem Klotz → Schub
    c.setInput({ jump: true }); t.tick(14); c.setInput({ crouch: true }); t.tick(2); c.setInput({});
    t.until(() => p.mode === 'ground', 240);
    t.tick(4);
    const boosts = k.boosts - b0, sp1 = k.speed, still = k.carries(p) && !p.dead;
    // Ende: abspringen auf das Plateau, der Klotz versinkt und kommt am Start wieder
    t.until(() => k.state === 'ende', 1800);
    t.place([0, 0, -63], { settle: 2, invuln: 99 });
    const sank = t.until(() => k.state === 'weg', 1200);
    const back = t.until(() => k.state === 'ruhe', 900);
    return { rest, on, moving, carried, sp0: +sp0.toFixed(2), sp1: +sp1.toFixed(2), boosts, still, sank, back, s: k.s };
  });
  console.log(`  Felsklotz: ruht ohne Figur ${r.rest}; drauf ${r.on} → fährt ${r.moving}, trägt ${r.carried}; Stampfen ×${r.boosts}: ${r.sp0} → ${r.sp1} m/s (Figur bleibt ${r.still}); versinkt ${r.sank}, wieder da ${r.back} (s ${r.s})`);
  check('Kristall-Felsklotz: ruht in der Lava, bis jemand draufsteht (Gegenprobe), fährt dann los und trägt die Figur', r.rest && r.on && r.moving && r.carried);
  check('Kristall-Felsklotz: Stampfattacke beschleunigt ihn', r.boosts >= 1 && r.sp1 > r.sp0 + 1 && r.still);
  check('Kristall-Felsklotz: versinkt am Ende und erscheint am Start wieder', r.sank >= 0 && r.back >= 0 && r.s === 0);
  await T('place', marks.klotzOben, { settle: 60 });
  await shot('felsklotz', 900);
  const w = await sc(() => {
    const t = window.__t, p = window.__course.player;
    const k = t.named('wuerfel');
    k.reset();
    t.place([0, 0.4, -70.6], { settle: 20, invuln: 99 });
    let minGap = 9;
    const n = t.until(() => { if (k.falls >= 1) minGap = Math.min(minGap, Math.abs(p.pos.y - (k.mb.pos.y + k.mb.size.y))); return k.state === 'ende'; }, 3000);
    t.tick(60);
    return { n, falls: k.falls, dead: p.dead, y: +p.pos.y.toFixed(2), top: +(k.mb.pos.y + k.mb.size.y).toFixed(2), on: k.carries(p) };
  });
  console.log(`  Würfel-Felsklotz: ${w.falls} Abstürze (nach ${w.n} Schritten), Figur heil ${!w.dead}, y ${w.y} auf Oberkante ${w.top} (trägt ${w.on})`);
  check('Würfel-Felsklotz: zwei 3-m-Abstürze, die Figur fährt heil mit hinunter', w.falls === 2 && !w.dead && Math.abs(w.y - w.top) < 0.15 && w.on);
}

// ---------------------------------------------------------------- Steigbecken, Wasserkörper
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const b = t.named('becken');
    let lo = 99, hi = -99;
    for (let i = 0; i < 12 * 120; i++) { t.tick(1); lo = Math.min(lo, b.top); hi = Math.max(hi, b.top); }
    t.until(() => b.state === 'unten', 2000);
    t.place([2, -3.95, -122], { settle: 20, invuln: 99 });
    const dry = p.mode;
    t.until(() => b.state === 'oben', 2000);
    t.tick(30);
    const wet = p.mode, py = p.pos.y;
    return { lo: +lo.toFixed(2), hi: +hi.toFixed(2), dry, wet, py: +py.toFixed(2) };
  });
  console.log(`  Steigbecken: Spiegel ${r.lo} … ${r.hi}; Figur unten ${r.dry}, Wasser oben → ${r.wet} (y ${r.py})`);
  check('Steigbecken: Wasser füllt und leert sich im Takt; die Figur schwimmt bei vollem Becken (Gegenprobe leer: steht)', r.lo < -3.5 && r.hi > 0.4 && r.dry === 'ground' && r.wet === 'swim' && r.py > -3);
  const w = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const k = t.named('wuerfel1');
    t.place([0, 1.6, -138.5], { settle: 20, invuln: 99 });
    const inside = p.mode, inn = k.inside(p);
    t.place([0, 0, -132], { settle: 20 });
    const outside = p.mode;
    // unten hinausschwimmen → fällt
    t.place([0, 0.6, -138.5], { settle: 2, invuln: 99 });
    c.setInput({ crouch: true, y: 0 }); t.tick(150); c.setInput({});
    const fell = p.pos.y < 0;
    t.place([0, 0, -132], { settle: 5 });
    return { inside, inn, outside, fell };
  });
  console.log(`  Wasserkörper: drinnen ${w.inside} (${w.inn}), draußen ${w.outside}; unten hinaus → fällt ${w.fell}`);
  check('Wasserkörper: im schwebenden Würfel schwimmt die Figur (Gegenprobe daneben: steht), unten hinaus fällt sie', w.inside === 'swim' && w.inn && w.outside === 'ground' && w.fell);
  await T('place', marks.wuerfel, { settle: 30 });
  await shot('wasser', 900);
}

// ---------------------------------------------------------------- Stachelblöcke
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const b = t.named('blau1');
    b.stop();
    t.tick(2);
    const bx = b.mb.pos.x, bz = b.mb.pos.z;
    t.place([bx, 0, bz + 2.4], { settle: 2 });
    let far = false;
    for (let i = 0; i < 120; i++) { p.pos.set(bx, 0, bz + 2.4); t.tick(1); far = far || t.hurt(); }
    t.place([bx, 0, bz + 1.32], { settle: 0 });
    let near = false;
    for (let i = 0; i < 30 && !near; i++) { t.tick(1); near = t.hurt(); }
    b.start();
    const hits = b.hits;
    t.place([0, 0, -152], { settle: 2 });
    // blau fährt im Takt (hält), rot wandert ohne Pause, die Wand rückt vor und weicht zurück
    const rot = t.named('rot1'), wand = t.named('wand1');
    const xs = [], rs = [], ws = [];
    for (let i = 0; i < 8 * 30; i++) { t.tick(4); xs.push(b.mb.pos.x); rs.push([rot.mb.pos.x, rot.mb.pos.z]); ws.push(wand.mb.pos.z); }
    const blueStops = xs.filter((x, i) => i && Math.abs(x - xs[i - 1]) < 1e-4).length;
    let redStops = 0;
    for (let i = 1; i < rs.length; i++) if (Math.hypot(rs[i][0] - rs[i - 1][0], rs[i][1] - rs[i - 1][1]) < 1e-4) redStops++;
    const wMin = Math.min(...ws), wMax = Math.max(...ws);
    return { far, near, hits, blueRange: +(Math.max(...xs) - Math.min(...xs)).toFixed(2), blueStops, redStops, wMin: +wMin.toFixed(2), wMax: +wMax.toFixed(2) };
  });
  console.log(`  Stachelblock blau: abseits heil ${!r.far}, an den Stacheln getroffen ${r.near} (${r.hits}); fährt ${r.blueRange} m, hält ${r.blueStops}×; rot hält ${r.redStops}×; Wand z ${r.wMin} … ${r.wMax}`);
  check('Stachelblock: Stacheln verletzen (Gegenprobe 1 m davor: heil)', r.near && !r.far && r.hits >= 1);
  check('Stachelblock blau fährt im Takt mit Pausen, rot wandert ohne Pause, Stachelwand rückt vor und zurück', r.blueRange > 7 && r.blueStops > 20 && r.redStops < 3 && r.wMax - r.wMin > 4.5);
  await T('place', marks.stachel, { settle: 30 });
  await shot('stachel', 900);
}

// ---------------------------------------------------------------- Keksräder, Keks-Zahnräder
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const k1 = t.named('keks1'), k2 = t.named('keks2'), z2 = t.named('zahn2');
    t.place([1.5, 0.3, -191.5], { settle: 20, invuln: 99 });
    const a0 = Math.atan2(-(p.pos.z + 191.5), p.pos.x);
    t.tick(240);
    const a1 = Math.atan2(-(p.pos.z + 191.5), p.pos.x);
    let turn = a1 - a0; if (turn < -Math.PI) turn += 2 * Math.PI;
    k1.stop();
    const q0 = [p.pos.x, p.pos.z];
    t.tick(120);
    const still = Math.hypot(p.pos.x - q0[0], p.pos.z - q0[1]);
    k1.start();
    // senkrechter Keks: Oberseite läuft wie ein Band (+Z)
    t.place([0, 0.6, -199], { settle: 20, invuln: 99 });
    const zA = p.pos.z;
    t.tick(60);
    const drift = p.pos.z - zA;
    k2.stop();
    const zB = p.pos.z;
    t.tick(60);
    const drift0 = p.pos.z - zB;
    k2.start();
    // stehendes Zahnrad: Zähne fahren im Kreis und tragen die Figur
    const top = () => z2.teeth.reduce((b, q, i) => (q.y > b.y ? { ...q, i } : b), { y: -99 });
    const tt = top();
    t.place([tt.x, tt.y + 0.5, tt.z], { settle: 6, invuln: 99 });
    const i0 = tt.i, y0 = z2.teeth[i0].y;
    t.tick(90);
    const tooth = z2.teeth[i0];
    const ride = Math.abs(p.pos.y - (tooth.y + 0.45)) < 0.15 && Math.abs(p.pos.z - tooth.z) < 0.8, moved = Math.hypot(tooth.y - y0, tooth.z - tt.z);
    return { turn: +turn.toFixed(2), still: +still.toFixed(3), drift: +drift.toFixed(2), drift0: +drift0.toFixed(3), ride, moved: +moved.toFixed(2) };
  });
  console.log(`  Keksrad waagerecht: Figur dreht ${r.turn} rad in 2 s (angehalten ${r.still} m); senkrecht: Band +${r.drift} m (angehalten ${r.drift0}); Zahnrad: Zahn trägt ${r.ride} (${r.moved} m)`);
  check('Keksrad waagerecht: nimmt die Figur auf der Drehung mit (Gegenprobe angehalten: steht still)', Math.abs(r.turn - 1.2) < 0.25 && r.still < 0.05);
  check('Keksrad senkrecht: Oberseite läuft wie ein Band (Gegenprobe angehalten: keine Mitnahme)', r.drift > 0.4 && Math.abs(r.drift0) < 0.05);
  check('Keks-Zahnrad senkrecht: Zähne fahren im Kreis und tragen die Figur', r.ride && r.moved > 0.4);
  await T('place', marks.keks, { settle: 30 });
  await shot('keks', 900);
}

// ---------------------------------------------------------------- Schubfeld
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const f = t.named('schub1');
    const h0 = f.hits;
    const run = (x) => {
      t.place([x, 0, -213], { settle: 4 });
      c.setInput({ y: 1 });
      let mx = 0;
      for (let i = 0; i < 150; i++) { t.tick(1); mx = Math.max(mx, t.hs()); }
      c.setInput({});
      return mx;
    };
    const side = run(5);
    const onField = run(0);
    return { side: +side.toFixed(2), onField: +onField.toFixed(2), hits: f.hits - h0 };
  });
  console.log(`  Schubfeld: daneben ${r.side} m/s, drüber ${r.onField} m/s (Treffer ${r.hits})`);
  check('Schubfeld: beschleunigt in Pfeilrichtung (Gegenprobe daneben: normales Tempo)', r.onField > 13 && r.side < 10 && r.hits >= 1);
  await T('place', marks.schub, { settle: 30 });
  await shot('schubfeld', 900);
}

// ---------------------------------------------------------------- Riesenrad
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const rad = t.named('rad'), sb = t.ent('schub_rad');
    const g = rad.gondolas;
    const near = (e) => g.reduce((b, q, i) => { const d = Math.hypot(e.pos.x - q.mb.pos.x, e.pos.z - q.mb.pos.z) + Math.abs(e.pos.y - q.mb.top); return d < b.d ? { d, i } : b; }, { d: 99, i: -1 });
    const a0 = rad.angle, s0 = sb ? [sb.pos.x, sb.pos.y] : null, gi = sb ? near(sb).i : -1;
    // Figur auf die unterste Gondel
    const low = g.reduce((b, q) => (q.mb.pos.y < b.mb.pos.y ? q : b));
    t.place([low.mb.pos.x, low.mb.top + 0.3, low.mb.pos.z], { settle: 10, invuln: 99 });
    const f0 = [p.pos.x, p.pos.y];
    t.tick(240);
    const turned = rad.angle - a0;
    const onG = Math.abs(p.pos.y - low.mb.top) < 0.12 && low.mb.carries(p), fMoved = Math.hypot(p.pos.x - f0[0], p.pos.y - f0[1]);
    const sbOn = sb && !sb.removed ? near(sb) : null;
    const sMoved = sb ? Math.hypot(sb.pos.x - s0[0], sb.pos.y - s0[1]) : 0;
    return { turned: +turned.toFixed(3), onG, fMoved: +fMoved.toFixed(2), sbOn: sbOn ? +sbOn.d.toFixed(2) : null, sbSame: sbOn?.i === gi, sMoved: +sMoved.toFixed(2) };
  });
  console.log(`  Riesenrad: dreht ${r.turned} rad/2 s; Figur auf der Gondel ${r.onG} (${r.fMoved} m); Schubser bleibt auf seiner Gondel ${r.sbSame} (Abstand ${r.sbOn}, ${r.sMoved} m gefahren)`);
  check('Riesenrad: dreht sich, Gondeln bleiben waagerecht und tragen die Figur', r.turned > 0.25 && r.onG && r.fMoved > 0.5);
  check('Riesenrad: ein Schubser steht auf einer Gondel und fährt mit', r.sbSame && r.sbOn < 0.3 && r.sMoved > 0.5);
  await T('place', marks.rad, { settle: 30 });
  await shot('riesenrad', 900);
}

// ---------------------------------------------------------------- Lavabrocken-Regen
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const rg = t.named('regen');
    const before = rg.info();
    t.place([0, 0, -272], { settle: 2 });
    t.tick(240);
    const idle = rg.info();
    t.place([0, 0, -285], { settle: 2, invuln: 999 });
    let warnSeen = 0;
    for (let i = 0; i < 6 * 120; i++) { t.tick(1); warnSeen = Math.max(warnSeen, rg.info().warn); }
    const after = rg.info();
    rg.stop();
    // gezielter Brocken: trifft die Figur am Ziel; Gegenprobe 3,5 m daneben heil
    const one = (x, z, fx, fz) => {
      const e = L.spawn('lavabrocken_regen', { targets: [[x, 0, z]], period: 0.6, flight: 1, warn: 0.6, radius: 1, start: 'auto' });
      t.place([fx, 0, fz], { settle: 0 });
      let hit = false;
      for (let i = 0; i < 2.2 * 120 && !hit; i++) { p.pos.set(fx, 0, fz); t.tick(1); hit = t.hurt(); }
      e?.handle?.stop();
      e?.kill?.();
      return hit;
    };
    const missed = one(8, -296, 8, -292.5);
    t.tick(120);
    const hit = one(-8, -296, -8, -296);
    return { before: before.state, idle: idle.impacts, state: after.state, impacts: after.impacts, warnSeen, hit, missed };
  });
  console.log(`  Lavabrocken-Regen: vor dem Bereich ${r.before}/${r.idle} Einschläge; im Bereich ${r.state}, ${r.impacts} Einschläge, Landemarken ${r.warnSeen}; Treffer am Ziel ${r.hit}, daneben ${r.missed}`);
  check('Lavabrocken-Regen: startet erst im Bereich (Gegenprobe davor: nichts), Landemarken vor jedem Einschlag', r.before === 'aus' && r.idle === 0 && r.state === 'an' && r.impacts >= 3 && r.warnSeen >= 1);
  check('Lavabrocken-Regen: Einschlag trifft die Figur am Ziel (Gegenprobe 3,5 m daneben: heil)', r.hit && !r.missed);
  await T('place', marks.regenMitte, { settle: 2, invuln: 999 });
  await sc(() => { window.__t.named('regen').start(); window.__t.tick(150); });
  await shot('lavaregen', 600);
  await sc(() => { window.__t.named('regen').stop(); });
}

// ---------------------------------------------------------------- großer Spiegel
{
  await T('place', marks.spiegel, { settle: 30 });
  await page.waitForTimeout(800);
  await freshFrames(4);
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const m = t.named('spiegel');
    const star = m.star;
    let layered = !!star?.model;
    star?.model?.root.traverse((o) => { if (o.isMesh && o.layers.mask !== (1 << 5)) layered = false; });
    const renders = m.renders, active = m.active;
    // Spiegel-Stufen: im Raum unsichtbar, aber begehbar
    t.place([1.6, 1.7, -312.4], { settle: 30 });
    const step = p.mode === 'ground' && Math.abs(p.pos.y - 1.4) < 0.06;
    const got0 = !!L.runtime.stars[2];
    t.place([2.6, 2.62, -315.4], { settle: 30 });
    const got = !!L.runtime.stars[2];
    return { layered, renders, active, step, got0, got, inFront: m.inFront(0, -312), mirror: m.mirror(1, 0, -318) };
  });
  console.log(`  Spiegel: Stern nur im Spiegel (Ebene 5) ${r.layered}, Spiegel zeichnet ${r.active} (${r.renders} Durchgänge); Spiegel-Stufe begehbar ${r.step}; Stern ${r.got0} → ${r.got}; Spiegelpunkt ${r.mirror}`);
  check('Großer Spiegel: zeichnet ein Spiegelbild, der Stern ist nur im Spiegel sichtbar (Zeichen-Ebene 5)', r.layered && r.renders > 0 && r.inFront && Math.abs(r.mirror[2] + 322) < 0.01);
  check('Großer Spiegel: Spiegel-Stufen im Raum unsichtbar begehbar, Spiegel-Stern einsammelbar (Gegenprobe vorher: fehlt)', r.step && !r.got0 && r.got);
  await sc(() => { const c = window.__course; c.level.runtime.stars[2] = false; });
  await T('place', marks.spiegel, { settle: 30 });
  await shot('spiegel', 1500);
}

// ---------------------------------------------------------------- Fallblock-Brücke
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, p = c.player;
    const fb = t.named('fallbr');
    fb.reset();
    t.place([0, 0, -324], { settle: 30 });
    const quiet = fb.info().blocks;
    t.place([0, 0.3, -327.5], { settle: 4, invuln: 99 });
    t.until(() => fb.state === 'stuerzt', 120);
    const started = fb.state;
    t.tick(60);
    const early = fb.info().blocks;
    let fell = false;
    for (let i = 0; i < 240 && !fell; i++) { t.tick(1); fell = p.pos.y < -3; }
    // retten (ein Absturz-Neustart setzt die Brücke zurück) und den Rest einstürzen lassen
    t.place([0, 0, -324], { settle: 2 });
    t.tick(600);
    const fallen = fb.fallen;
    fb.reset();
    t.place([0, 0, -324], { settle: 2 });
    return { quiet, started, early, fell, fallen };
  });
  console.log(`  Fallblock-Brücke: ruhig ${r.quiet}; betreten → ${r.started}, nach 0,6 s ${r.early}; Figur stürzt mit ${r.fell}; gefallen ${r.fallen}`);
  check('Fallblock-Brücke: stürzt nach dem Betreten Block für Block ein (Gegenprobe vorher: alle fest), die Figur fällt mit', /^#+$/.test(r.quiet) && r.started === 'stuerzt' && /^[v~]/.test(r.early) && r.early.endsWith('#') && r.fell && r.fallen >= 6);
  await T('place', marks.fallbr, { settle: 30 });
  await shot('fallblock', 900);
}

// ---------------------------------------------------------------- Super-POW-Block
{
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const pw = t.named('superpow');
    const sig = [];
    L.onSignal('super_pow', (d) => sig.push(d));
    const c0 = L.runtime.coins;
    // Kopfstoß von unten
    t.place([0, 0, -362], { settle: 10 });
    c.setInput({ jump: true });
    t.until(() => pw.hits >= 1, 120);
    c.setInput({});
    const h1 = pw.hits, again = pw.hit('test');
    t.tick(60);
    // Stampfattacke von oben
    t.tick(80);
    t.place([0, 6.8, -362], { settle: 0, invuln: 99 });
    c.setInput({ crouch: true }); t.tick(2); c.setInput({});
    t.until(() => p.mode === 'ground', 300);
    const h2 = pw.hits;
    t.tick(80); pw.hit('test');
    t.tick(80); pw.hit('test');
    t.tick(30);
    return { h1, again, h2, hits: pw.hits, done: pw.done, state: pw.state, sig: sig.map((d) => `${d.hit}/${d.of}${d.done ? '!' : ''}`).join(' '), coins: L.runtime.coins - c0 };
  });
  console.log(`  Super-POW-Block: Kopfstoß → ${r.h1} (gleich danach noch einmal: ${r.again}), Stampfen → ${r.h2}; gesamt ${r.hits}, ${r.state}, Signale ${r.sig}, +${r.coins} Münzen`);
  check('Super-POW-Block: Kopfstoß und Stampfattacke zählen je einen Stoß (Gegenprobe: Sperre direkt danach)', r.h1 === 1 && r.again === false && r.h2 === 2);
  check('Super-POW-Block: nach 4 Stößen fertig, Signal je Stoß (done beim vierten), Aktion onDone', r.hits === 4 && r.done && r.state === 'fertig' && r.sig === '1/4 2/4 3/4 4/4!' && r.coins >= 5);
}

// ---------------------------------------------------------------- Abspann-Auslöser, Hüllen als kind, Ziel
{
  const r = await sc(async () => {
    const t = window.__t, c = window.__course, L = c.level;
    t.place([0, 0, -380], { settle: 4 });
    const before = L.creditsWanted ?? null;
    L.spawn('abspann_ausloeser', { pos: [0, 0, -380], size: [3, 3, 3] });
    await new Promise((res) => setTimeout(res, 0));
    t.tick(4);
    const after = L.creditsWanted;
    L.creditsWanted = null;
    const e1 = L.spawn('leuchtsteg', { id: 'huelle1', pos: [10, 0, -10], size: [2, 0.4, 2] });
    const e2 = L.spawn('super_pow_block', { id: 'huelle2', pos: [10, 3, -370], hidden: true });
    await new Promise((res) => setTimeout(res, 0));
    t.tick(2);
    const h2 = L.named.get('huelle2');
    const s0 = h2?.state;
    h2?.reveal();
    t.tick(200);
    return { before, after, k1: e1?.kind, k2: e2?.kind, vis: typeof L.named.get('huelle1')?.visibleAt, s0, s1: h2?.state };
  });
  console.log(`  Abspann-Auslöser: ${r.before} → ${r.after}; Hüllen: ${r.k1}/${r.k2}, visibleAt ${r.vis}, Super-POW ${r.s0} → ${r.s1}`);
  check('Abspann-Auslöser (kind abspann_ausloeser): fordert den Abspann nach dem Ziel an (Gegenprobe vorher: nicht)', r.before === null && r.after === 'nach-ziel');
  check('Hüllen: Welt-8-Bausteine auch als kind (named liefert den Griff des Bausteins, versteckt + reveal)', r.k1 === 'leuchtsteg' && r.k2 === 'super_pow_block' && r.vis === 'function' && r.s0 === 'versteckt' && r.s1 === 'bereit');
  await T('place', marks.pow, { settle: 30 });
  await shot('superpow', 900);
  await T('place', marks.start, { settle: 30 });
  await shot('start', 900);
  await T('place', marks.goal);
  await sc(() => { const c = window.__course, t = window.__t; c.setInput({ y: 1, run: true }); t.tick(70); c.setInput({ y: 1, run: true, jump: true }); t.tick(40); c.setInput({}); t.tick(400); });
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Rummelwerkstatt erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 120 Zeichenaufrufe (inkl. Schattenpass und Spiegel) in allen Bildern', stats.every((s) => s[1] < 120));
  check('Budget: < 300 k Dreiecke in allen Bildern', stats.every((s) => s[2] < 300000));
}
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);
}

// ---------------------------------------------------------------- Themen (?theme=) mit Bildern
if ((PART === 'all' || PART === 'themes') && SHOTS) {
  console.log('Welt-8-Themen');
  const VIEWS = { rainfort: ['start'], dunes: ['schub'], cookie: ['keks'], nightfort: ['steg', 'stegMitte'], dungeon: ['becken', 'wuerfel'], darkghost: ['spiegel'], inferno: ['klotz'], baronpark: ['rad', 'start'] };
  const labels = {};
  const e0all = errors.length;
  const t0 = stats.length;
  for (const th of Object.keys(VIEWS)) {
    const e0 = errors.length;
    await load(`&theme=${th}`);
    const m = await sc(() => window.__t.marks);
    labels[th] = await sc(() => { const t = window.__course.view.theme; return { label: t.label, backdrop: t.backdrop ?? null, uw: !!t.underwater, hemi: t.hemi.intensity, pl: !!t.playerLight }; });
    for (const [k, w] of VIEWS[th].entries()) {
      await T('place', m[w], { settle: 30 });
      await shot(k ? `thema_${th}_${w}` : `thema_${th}`, 1700);
    }
    if (th === 'dungeon') {
      await T('place', [0, 1.6, -138.5], { settle: 60, invuln: 99 });
      await page.waitForTimeout(600);
      labels[th].under = await sc(() => window.__course.view.underwater);
      await shot('thema_dungeon_unterwasser', 1200);
    }
    console.log(`  ${th}: ${labels[th].label} (Kulisse ${labels[th].backdrop}${labels[th].uw ? ', Unterwasser' : ''}${labels[th].pl ? ', Figurenlicht' : ''}, Himmelslicht ${labels[th].hemi})${errors.length > e0 ? ' – Fehler!' : ''}`);
  }
  const ls = Object.values(labels).map((l) => l.label);
  check('Themen: alle acht Welt-8-Themen registriert (eigene Namen, eigene Kulisse)', ls.every((l) => l && l !== 'Wiese') && new Set(ls).size === 8 && Object.values(labels).every((l) => l.backdrop));
  check('Themen: nightfort und darkghost sehr dunkel mit Figurenlicht; dungeon mit Unterwasser-Stimmung', labels.nightfort.hemi < 0.5 && labels.nightfort.pl && labels.darkghost.hemi < 0.3 && labels.darkghost.pl && labels.dungeon.uw && labels.dungeon.under === true);
  const ts = stats.slice(t0);
  for (const s of ts) console.log(`    ${s[0].padEnd(30)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Themen-Bilder: < 120 Zeichenaufrufe, < 300 k Dreiecke', ts.length >= 8 && ts.every((s) => s[1] < 120 && s[2] < 300000));
  check('Themen: keine Konsolenfehler', errors.length === e0all);
  if (errors.length > e0all) for (const e of errors.slice(e0all, e0all + 10)) console.log('   ', e);
}

// ---------------------------------------------------------------- Abspann
if (PART === 'all' || PART === 'credits') {
  console.log('Abspann');
  const e0 = errors.length;
  const t0 = stats.length;
  // frischer Spielstand ohne „finished“
  await page.goto(`http://localhost:${port}/?course=0-31&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
  await sc(() => { try { const k = 'lotti-greta-course-v1'; const d = JSON.parse(localStorage.getItem(k) ?? 'null'); if (d) { delete d.finished; localStorage.setItem(k, JSON.stringify(d)); } } catch { /* leer */ } });
  await page.goto(`http://localhost:${port}/?credits=1&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
  let ok = true;
  try { await page.waitForFunction(() => window.__credits && window.__credits.view && window.__game.scene.isActive('Credits'), null, { timeout: 90000 }); } catch { ok = false; }
  check('Abspann startet über ?credits=1 (Szene Credits mit eigener 3D-Bühne)', ok);
  if (ok) {
    await page.waitForTimeout(1200);
    const s0 = await sc(() => { window.__credits.setManual(true); return window.__credits.state(); });
    await shot('abspann_start', 400, true);
    const s1 = await sc(() => window.__credits.advance(20));
    await shot('abspann_freunde', 1200, true);
    const s2 = await sc(() => window.__credits.advance(26));
    await shot('abspann_reise', 1200, true);
    const s3 = await sc(() => window.__credits.advance(24));
    await shot('abspann_danke', 1200, true);
    // Musik endet von selbst (Taktuhr auf der Testuhr): danach playing false
    const mus = await sc(() => { const m = window.__audio.music; const info = m.themeInfo?.('course_abspann'); m.setManualClock(true); m.advanceClock((info?.seconds ?? 76) + 2); const b = m.beat(); const r = { seconds: info?.seconds, loop: info?.loop, playing: b.playing }; m.setManualClock(false); return r; });
    if (DEBUG) console.log(JSON.stringify({ s0, s1, s2, s3, mus }));
    console.log(`  Abspann: Musik ${s0.music} (${mus.seconds?.toFixed?.(1)} s, Schleife ${mus.loop}), läuft ${s0.playing}; Darsteller ${s0.actors}, Konfetti ${s0.confetti}; Rolle y ${s0.roll} → ${s1.roll} → ${s2.roll} → ${s3.roll}; Feuerwerk ${s3.fireworks}; gespeichert ${s0.finished}`);
    console.log(`    Zeilen am Anfang: ${s0.shown.slice(0, 2).join(' | ')}; am Ende: ${s3.shown.slice(-2).join(' | ')}`);
    check('Abspann: Musik course_abspann läuft einmal (keine Schleife, endet von selbst)', s0.music === 'course_abspann' && s0.playing && mus.loop === false && mus.playing === false);
    check('Abspann: Darsteller (Lotti, Greta, Pflaume, Krümel, Freunde), Konfetti und Feuerwerk', s0.actors >= 10 && s0.confetti > 100 && s3.fireworks >= 3);
    check('Abspann: Danksagungen rollen nach oben und enden mit „Danke fürs Spielen!“', s0.shown.includes('Lotti & Greta') && s0.roll > s1.roll && s1.roll > s2.roll && s3.shown.includes('Danke fürs Spielen!'));
    check('Abspann: Spielstand merkt sich courseSave.data.finished = true', s0.finished === true && await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1')).finished === true));
    await sc(() => window.__credits.advance(20));
    let back = true;
    try { await page.waitForFunction(() => window.__game.scene.isActive('CourseMap') && window.__courseMap?.hud, null, { timeout: 60000 }); } catch { back = false; }
    await page.waitForTimeout(1500);
    const hud = back ? await sc(() => ({ trophy: !!window.__courseMap.hud.trophyShown, credits: !window.__game.scene.isActive('Credits') })) : {};
    if (SHOTS && back) { try { await page.screenshot({ path: `${OUT}w8b_abspann_karte.png` }); } catch { /* weiter */ } }
    check('Abspann: danach zurück zur Weltkarte, Pokal im Karten-HUD', back && hud.trophy && hud.credits);
  }
  // aus dem Level: Aktion { credits: true } → „Weiter“ nach dem Ziel führt in den Abspann
  await load();
  const viaLevel = await sc(async () => {
    const c = window.__course, L = c.level;
    L.creditsWanted = null;
    const before = !!L.creditsWanted;
    L.spawn('abspann_ausloeser', { pos: [0, 0, -2], size: [6, 3, 6], when: 'nach-ziel' });
    await new Promise((res) => setTimeout(res, 0));
    c.step(4);
    const wanted = L.creditsWanted;
    c.exitToMap({ done: '0-31' });
    return { before, wanted };
  });
  let started = true;
  try { await page.waitForFunction(() => window.__game.scene.isActive('Credits') && window.__credits?.from === '0-31', null, { timeout: 60000 }); } catch { started = false; }
  check('Abspann aus dem Level: Aktion { credits } → „Weiter“ startet den Abspann statt der Karte (Gegenprobe vorher: nicht angefordert)', !viaLevel.before && viaLevel.wanted === 'nach-ziel' && started);
  const cs = stats.slice(t0);
  for (const s of cs) console.log(`    ${s[0].padEnd(30)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  if (cs.length) check('Abspann-Bilder: < 120 Zeichenaufrufe, < 300 k Dreiecke', cs.every((s) => s[1] < 120 && s[2] < 300000));
  check('Abspann: keine Konsolenfehler', errors.length === e0);
  if (errors.length > e0) for (const e of errors.slice(e0, e0 + 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
