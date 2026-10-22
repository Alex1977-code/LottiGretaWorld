// Kurs-Modus, Motor-Erweiterungen Welt 2 in der Klonwiese 0-3: Spiegelfrucht (Klone, gespiegelte Eingabe, Treffer/
// Absturz/verloren, Kamera-Rahmung, HUD), Druckfelder, Viererlift, Figurenschalter (Heldin über das Pause-Menü
// wechseln), Trage-Helme (Kanone + Holzwand, Propeller, Licht + Testgeist), Topfpflanze, Treibsand, Sandblöcke.
// Deterministisch über window.__course.step(n)/setInput; Bilder tests/out/w2e_*.png, Kennzahlen mit 1 und 5 Figuren.
// Aufruf: PORT_BASE=3200 node tests/course_w2engine.mjs   (Port 4199; vorher npm run build; nutzt vite preview)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4199;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W2E_SHOTS !== '0';

await page.goto(`http://localhost:${port}/?course=0-3&scale=2&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
} catch {
  console.log('Klonwiese startet nicht. Konsole:');
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
  const info = (f) => f && { ...f.info(), main: f === L().player };
  window.__t = {
    marks: c.level.data.marks,
    /** Haupt-Figur setzen (Lotti, groß, ohne Power-up/Helm, Klone weg) und landen lassen. */
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setInput({});
      c.squad.clear();
      p.dropHeld();
      p.helmet = null; p.helmetFx = null; p.helmetCooldown = 0;
      p.setHero(o.hero ?? 'lotti');
      p.dead = false; p.removedFigure = null; p.hidden = false;
      p.big = o.big ?? true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      if (o.power) p.setPower(o.power);
      p.invuln = o.invuln ?? 0;
      p.updateHalf();
      L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap(p);
      c.step(o.settle ?? 30);
      return info(p);
    },
    /** Klon der Haupt-Figur erzeugen und (optional) an pos setzen → Index in level.players (−1 = keiner). */
    clone(pos, o = {}) {
      const f = L().addClone(P());
      if (!f) return -1;
      if (pos) { f.reset(pos, o.yaw ?? Math.PI / 2); f.invuln = o.invuln ?? 0; }
      return L().players.indexOf(f);
    },
    /** Figur i versetzen. */
    put(i, pos, o = {}) { const f = L().players[i]; f.reset(pos, o.yaw ?? f.yaw); f.invuln = o.invuln ?? 0; return info(f); },
    figs: () => L().players.map(info),
    fig: (i) => info(L().players[i]),
    count: () => L().players.length,
    steps(n) { c.step(n); return L().players.map(info); },
    /** Eingaben abspielen: [[input, n], …]; liefert Spur der Haupt-Figur [x, y, z, mode, state]. */
    play(segs) {
      const tr = [];
      for (const [inp, n] of segs) {
        c.setInput(inp);
        for (let i = 0; i < n; i++) { c.step(1); const p = P(); tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state]); }
      }
      c.setInput({});
      return tr;
    },
    /** Haupt-Figur auf eine Stelle zulaufen lassen (Stick kamerabezogen), bis Bedingung oder max Schritte. */
    chase(target, max, run = false, stopAt = 0.3) {
      for (let i = 0; i < max; i++) {
        const p = P();
        const dx = target[0] - p.pos.x, dz = target[2] - p.pos.z, l = Math.hypot(dx, dz);
        if (l < stopAt) { c.setInput({}); return i; }
        const cy = L().controlYaw, cs = Math.cos(cy), sn = Math.sin(cy);
        c.setInput({ x: (cs * dx - sn * dz) / l, y: (-sn * dx - cs * dz) / l, run });
        c.step(1);
      }
      c.setInput({});
      return max;
    },
    ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed).map((e) => ({ x: +e.pos.x.toFixed(2), y: +e.pos.y.toFixed(2), z: +e.pos.z.toFixed(2), alive: e.alive, defeated: !!e.defeated, hidden: !!e.hidden, state: e.state })),
    named: (id) => { const e = L().named.get(id); return e ? { alive: e.alive !== false, removed: !!e.removed, hidden: !!e.hidden, defeated: !!e.defeated, state: e.state, done: e.done, count: e.count, s: e.s, wrong: e.wrongCount, fired: e.fired, light: e.light, lightCalls: e.lightCalls, bites: e.bites, crumbles: e.crumbles, knocks: e.knocks, x: e.pos?.x, y: e.pos?.y, z: e.pos?.z, badge: e.badge?.key ?? null, prog: e.progress?.() ?? null } : null; },
    spawn(kind, spec) { const e = L().spawn(kind, spec); return !!e; },
    starHidden: (index) => { const s = L().entities.find((e) => e.kind === 'star' && e.index === index && !e.removed); return s ? s.hidden : null; },
    resetStars() { L().runtime.stars = L().runtime.stars.map(() => false); },
    rt: () => L().runtime.info(),
    coins: () => L().runtime.coins,
    log: () => c.squad.log.slice(-6),
    cam: () => c.view.rig.info(),
    hud: () => { const u = window.__game.scene.getScene('CourseUI'); return { visible: u.squadText.visible, text: u.squadText.text }; },
  };
});

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const marks = await sc(() => window.__t.marks);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const stats = [];
/** Auf ein neues Bild warten (Anzeigen werden je Bild gezeichnet). */
async function frame() {
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame > f, f0, { timeout: 60000 }).catch(() => {});
}
async function shot(name, wait = 1400) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  // auf ein frisches Bild warten (Software-Rendering)
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame > f + 2, f0, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles, await T('count')]);
  try { await page.screenshot({ path: `${OUT}w2e_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

console.log('Klonwiese 0-3');
const kinds = await sc(() => [...new Set(window.__course.level.entities.map((e) => e.kind))].sort());
console.log(`  Arten: ${kinds.join(', ')}`);
check('Level geladen (pfeld, figurenschalter, Helme, Testgeist, Topfpflanze, Holzwand, Sandblock)', ['pfeld', 'figurenschalter', 'helm_kanone', 'helm_propeller', 'helm_licht', 'testgeist', 'topfpflanze', 'holzwand', 'sandblock'].every((k) => kinds.includes(k)));
check('Bausteine Viererlift und Treibsand angelegt', await sc(() => !!window.__course.level.named.get('vierer') && !!window.__course.level.named.get('sandbecken') && window.__course.level.world.hasQuicksand));
check('Keine Konsolenfehler beim Laden', errors.length === 0);
await shot('start');

// ---------------------------------------------------------------- Spiegelfrucht: Klon entsteht
{
  await T('place', [0, 1, -3]);
  const tr = await T('play', [[{ y: 1 }, 50], [{}, 40]]);
  const figs = await T('figs');
  console.log(`  Spiegelfrucht: ${figs.length} Figuren, Klon bei ${figs[1] ? `${f2(figs[1].x)}, ${f2(figs[1].z)}` : '–'}, Haupt ${f2(figs[0].x)}, ${f2(figs[0].z)}`);
  check('Spiegelfrucht einsammeln erzeugt einen Klon (2 Figuren)', figs.length === 2 && figs[1].clone && !figs[0].clone);
  check('Klon: gleiche Heldin, neben der Figur', figs.length === 2 && figs[1].hero === figs[0].hero && dist(figs[0], figs[1]) > 0.4 && dist(figs[0], figs[1]) < 2.2);
  const rigs = await sc(() => ({ n: window.__course.squad.rigs.size, lite: [...window.__course.squad.rigs.values()].map((r) => r.lite), hasAv: [...window.__course.squad.rigs.values()].every((r) => !!r.avatar) }));
  check('Eigener HeroRig je Figur (Klon in Spardarstellung)', rigs.n === 2 && rigs.hasAv && rigs.lite.filter(Boolean).length === 1);
  await frame();
  const hud = await T('hud');
  check('HUD zeigt die Figurenzahl (×2)', hud.visible && hud.text === '×2');
  // Eingabe gespiegelt: alle bekommen dieselbe Eingabe
  const a = await T('figs');
  await T('play', [[{ x: 1 }, 60]]);
  const b = await T('figs');
  const d0 = b[0].x - a[0].x, d1 = b[1].x - a[1].x;
  console.log(`  Stick rechts: Haupt +${f2(d0)} m, Klon +${f2(d1)} m`);
  check('Eingabe gespiegelt: beide laufen gleich weit nach rechts', d0 > 2 && Math.abs(d0 - d1) < 0.35);
  await T('play', [[{}, 30]]);
  await sc(() => window.__course.setInput({ jump: true }));
  const j = await T('steps', 6);
  await T('play', [[{ jump: true }, 30], [{}, 80]]);
  console.log(`  Sprung: ${j.map((f) => `${f.mode}/${f2(f.vy)}`).join(', ')}`);
  check('Sprung gespiegelt: beide springen im selben Schritt', j.every((f) => f.mode === 'air' && f.vy > 3));
  // weiches Abstoßen: beide auf denselben Punkt
  await T('put', 0, [0, 1, -10]);
  await T('put', 1, [0, 1, -10]);
  const s1 = await T('steps', 60);
  console.log(`  Abstoßen: Abstand nach 0,5 s ${f2(dist(s1[0], s1[1]))} m`);
  check('Figuren stoßen sich leicht ab (kein Ineinanderstecken, kein hartes Blockieren)', dist(s1[0], s1[1]) > 0.45 && dist(s1[0], s1[1]) < 1.2);
  // stapelbar bis 5
  for (let i = 0; i < 4; i++) await T('clone');
  const n5 = await T('count');
  const n6 = (await T('clone')) === -1 ? await T('count') : -1;
  console.log(`  Stapeln: ${n5} Figuren, weitere Spiegelfrucht → ${n6}`);
  check('Spiegelfrucht stapelbar bis 5 Figuren (nicht mehr)', n5 === 5 && n6 === 5);
  await T('steps', 90);
  await frame();
  check('HUD zeigt ×5', (await T('hud')).text === '×5');
  // Power-ups wirken auf alle, Münzen zählen einmal
  await sc(() => window.__course.player.collectPowerup('funken'));
  const pw = await T('figs');
  check('Power-up wirkt auf alle Figuren', pw.every((f) => f.power === 'funken'));
  const c0 = await T('coins');
  const p0 = pw[0];
  await sc((p) => { for (let k = 0; k < 3; k++) window.__course.level.spawn('coin', { pos: [p.x, p.y, p.z - 0.2 * k] }); }, p0);
  await T('steps', 4);
  const c1 = await T('coins');
  await sc((p) => { const L = window.__course.level; L.players.forEach((f, i) => f.reset([p.x + i * 0.05, 1, p.z], f.yaw)); L.spawn('coin', { pos: [p.x, 1, p.z] }); }, p0);
  await T('steps', 4);
  const c2 = await T('coins');
  console.log(`  Münzen: +${c1 - c0} (3 Münzen), alle 5 Figuren auf einer Münze: +${c2 - c1}`);
  check('Sammelobjekte zählen einmal (Münze unter 5 Figuren +1)', c1 - c0 === 3 && c2 - c1 === 1);
  // Kennzahlen mit 5 Figuren (stehend, Kamera rahmt)
  await T('play', [[{}, 60]]);
  await shot('klone5');
}

// ---------------------------------------------------------------- Treffer, Absturz, verloren, Kamera
{
  await T('place', [6, 1, -4]);
  const ci = await T('clone', [3.5, 1, -4]);
  await T('steps', 20);
  // Pilzling direkt neben den Klon (seitlich, gleiche Höhe)
  await sc(() => { const k = window.__course.level.players[1]; window.__course.level.spawn('pilzling', { id: 'pz_test', pos: [k.pos.x - 0.9, 1, k.pos.z], dir: [1, 0], wake: 30 }); });
  const s = await T('steps', 60);
  const log = await T('log');
  const main = s[0];
  console.log(`  Treffer Klon: ${s.length} Figur(en), Haupt groß=${main.big} tot=${main.dead}, Log ${JSON.stringify(log.slice(-1))}`);
  check('Treffer entfernt nur die betroffene Figur (Klon weg, Haupt-Figur heil)', ci === 1 && s.length === 1 && main.big && !main.dead && log.some((e) => e.what === 'remove' && e.cause === 'hit'));
  await sc(() => { const e = window.__course.level.named.get('pz_test'); e?.kill(); });
  // Haupt-Figur getroffen, Klon übernimmt
  await T('place', [6, 1, -4]);
  await T('clone', [8, 1, -4]);
  await T('steps', 10);
  const promo = await sc(() => {
    const c = window.__course, L = c.level;
    const clone = L.players[1], rigOfClone = c.squad.rigs.get(clone);
    L.players[0].hurt({ pos: { x: 5, y: 1, z: -4 } });
    c.step(10);
    return { n: L.players.length, mainIsClone: L.player === clone, sceneRig: c.rig === rigOfClone, scenePlayer: c.player === clone, lite: rigOfClone?.lite, dead: L.player.dead };
  });
  console.log(`  Treffer Haupt-Figur: ${JSON.stringify(promo)}`);
  check('Haupt-Figur getroffen: Klon wird Haupt-Figur (Kamera, volle Darstellung)', promo.n === 1 && promo.mainIsClone && promo.sceneRig && promo.scenePlayer && promo.lite === false && !promo.dead);
  // letzte Figur: normaler Treffer (groß → klein)
  await sc(() => window.__course.player.hurt({ pos: { x: 5, y: 1, z: -4 } }));
  await T('steps', 5);
  const last = await T('fig', 0);
  check('Letzte Figur: normaler Treffer (groß → klein)', !last.big && !last.dead);
  // Absturz entfernt nur den Klon
  await T('place', [-9, 1, -115]);
  await T('clone', [-9, 1, -120.5]);   // über der Lücke neben der Sandblock-Brücke: Abgrund
  const fall = await T('steps', 200);
  const lf = await T('log');
  console.log(`  Absturz Klon: ${fall.length} Figur(en), Log ${JSON.stringify(lf.slice(-1))}`);
  check('Absturz entfernt nur die Figur (kein Tod, kein Leben weg)', fall.length === 1 && !fall[0].dead && lf.some((e) => e.cause === 'fall') && (await T('rt')).status === 'play');
  // Kamera rahmt alle Figuren, zoomt bei Streuung heraus
  await T('place', [0, 1, -8]);
  await T('clone', [-5, 1, -8]);
  await T('put', 0, [5, 1, -8]);
  await T('steps', 10);
  const cam = await sc(() => { const c = window.__course; c.view.rig.snap(c.player); return c.view.rig.info(); });
  console.log(`  Kamera: Ziel ${cam.target}, Streuung ${cam.spread}, Zoom ×${cam.group}`);
  check('Kamera rahmt den Schwerpunkt aller Figuren und zoomt bei Streuung heraus', Math.abs(cam.target[0]) < 0.5 && cam.spread > 4 && cam.group > 1.05);
  // zu weit zurückgefallen → verloren
  await T('put', 1, [0, 1, 7]);
  await T('put', 0, [0, 1, -8]);
  const lost = await T('steps', 80);
  const ll = await T('log');
  console.log(`  Verloren: ${lost.length} Figur(en), Log ${JSON.stringify(ll.slice(-1))}`);
  check('Zu weit zurückgefallene Figur geht verloren (Poff)', lost.length === 1 && ll.some((e) => e.cause === 'lost') && !lost[0].dead);
}

// ---------------------------------------------------------------- Druckfelder
{
  await T('resetStars');
  const pf = marks.pf2;
  await T('place', [pf[0] - 0.4, 1.4, pf[2]]);
  await T('steps', 60);
  const one = await T('named', 'pf2');
  await frame();
  const oneB = await T('named', 'pf2');
  check('Druckfeld: eine Figur reicht nicht (Anzeige 1/2)', one.count === 1 && !one.done && (await T('starHidden', 0)) === true && String(oneB.badge).startsWith('1/2'));
  await T('clone', [pf[0] + 0.45, 1.4, pf[2]]);
  await T('steps', 60);
  const two = await T('named', 'pf2');
  console.log(`  Druckfeld (2): zwei Figuren → count ${two.count}, fertig ${!!two.done}, Stern sichtbar ${(await T('starHidden', 0)) === false}`);
  check('Druckfeld mit 2 Figuren gleichzeitig löst aus (Stern erscheint)', two.done && (await T('starHidden', 0)) === false);
  if (SHOTS) await shot('druckfeld');
  // Gruppe: zwei Felder gleichzeitig
  await T('place', [marks.paar_a[0], 1.4, marks.paar_a[2]]);
  await T('steps', 60);
  const g1 = await T('named', 'paar_a');
  check('Feld-Paar: ein Feld belegt reicht nicht', !g1.done && (await T('starHidden', 1)) === true);
  await T('clone', [marks.paar_b[0], 1.4, marks.paar_b[2]]);
  await T('steps', 60);
  const g2 = await T('named', 'paar_a');
  console.log(`  Feld-Paar: beide belegt → fertig ${!!g2.done}, Stern 2 sichtbar ${(await T('starHidden', 1)) === false}`);
  check('Feld-Paar gleichzeitig belegt (Klon) löst aus', g2.done && (await T('named', 'paar_b')).done && (await T('starHidden', 1)) === false);
}

// ---------------------------------------------------------------- Viererlift
{
  const lp = marks.lift;
  await T('place', [lp[0] - 0.8, 1.6, lp[2] + 0.8]);
  await T('clone', [lp[0] + 0.8, 1.6, lp[2] + 0.8]);
  await T('clone', [lp[0] - 0.8, 1.6, lp[2] - 0.8]);
  await T('steps', 150);
  await frame();
  const l3 = await T('named', 'vierer');
  console.log(`  Viererlift mit 3: count ${l3.count}, Weg ${f2(l3.s)} m, Anzeige ${l3.badge}`);
  check('Viererlift fährt mit 3 Figuren nicht (Anzeige 3/4)', l3.count === 3 && l3.s < 0.01 && String(l3.badge).startsWith('3/4'));
  await T('clone', [lp[0] + 0.8, 1.6, lp[2] - 0.8]);
  await T('steps', 330);
  const l4 = await T('named', 'vierer');
  const ys = (await T('figs')).map((f) => f.y);
  console.log(`  Viererlift mit 4: count ${l4.count}, Weg ${f2(l4.s)} m, Figuren y ${ys.map(f2).join(', ')}`);
  check('Viererlift fährt mit 4 Figuren nach oben und trägt alle mit', l4.s > 5.9 && ys.every((y) => y > 7.3));
  if (SHOTS) await shot('viererlift');
  // runter: alle weg → fährt zurück
  await T('place', [6, 1, -40]);
  await T('steps', 600);
  const back = await T('named', 'vierer');
  check('Viererlift fährt ohne Figuren zurück', back.s < 0.01);
}

// ---------------------------------------------------------------- Figurenschalter (Heldin im Pause-Menü wechseln)
{
  const sg = marks.sw_greta;
  await T('place', [sg[0], 1.6, sg[2]], { hero: 'lotti' });
  await T('steps', 60);
  await frame();
  const swg = await sc(() => { const e = window.__course.level.entities.find((x) => x.kind === 'figurenschalter' && x.hero === 'greta'); return { done: e.done, wrong: e.wrongCount, badge: e.badge.key }; });
  console.log(`  Greta-Schalter mit Lotti: fertig ${swg.done}, falsch ${swg.wrong}, Hinweis „${String(swg.badge).split('|')[0]}“`);
  check('Figurenschalter (Greta) reagiert nicht auf Lotti (Hinweis „Nur für Greta!“)', !swg.done && swg.wrong >= 1 && (await T('named', 'truhe_g')).hidden && String(swg.badge).startsWith('Nur für Greta'));
  if (SHOTS) await shot('schalter_falsch', 900);
  // Pause → „Figur“ → Greta
  await T('place', [sg[0], 1, sg[2] + 2.5], { hero: 'lotti' });
  await T('clone', [sg[0] + 1.5, 1, sg[2] + 2.5]);
  await sc(() => window.__course.pauseGame());
  await page.waitForFunction(() => window.__game.scene.isActive('CoursePause'), null, { timeout: 20000 });
  await sc(() => window.__game.scene.getScene('CoursePause').switchHero());
  await sc(() => window.__course.resumeGame());
  await page.waitForFunction(() => !window.__game.scene.isActive('CoursePause'), null, { timeout: 20000 });
  const heroes = (await T('figs')).map((f) => f.hero);
  await page.waitForTimeout(500);
  const rigKeys = await sc(() => [...window.__course.squad.rigs.values()].map((r) => r.key));
  console.log(`  Pause → Figur: Heldinnen ${heroes.join(', ')}, Darstellung ${rigKeys.join(', ')}`);
  check('Pause-Menü „Figur“ wechselt die Heldin aller Figuren im Level (Darstellung neu)', heroes.every((h) => h === 'greta') && rigKeys.every((k) => k === 'greta'));
  await T('chase', sg, 200, false, 0.25);
  await T('steps', 60);
  const swg2 = await sc(() => { const e = window.__course.level.entities.find((x) => x.kind === 'figurenschalter' && x.hero === 'greta'); return { done: e.done }; });
  const chest = await T('named', 'truhe_g');
  console.log(`  Greta-Schalter mit Greta: fertig ${swg2.done}, Truhe sichtbar ${!chest.hidden}`);
  check('Figurenschalter nur mit passender Heldin: Greta löst aus (Truhe erscheint)', swg2.done && !chest.hidden);
  if (SHOTS) await shot('schalter');
  // Lotti-Schalter mit Greta → nichts; mit Lotti → aus
  await T('place', [marks.sw_lotti[0], 1.6, marks.sw_lotti[2]], { hero: 'greta' });
  await T('steps', 60);
  const swl = await sc(() => window.__course.level.entities.find((x) => x.kind === 'figurenschalter' && x.hero === 'lotti').done);
  await sc(() => window.__course.setHero('lotti'));
  await T('place', [marks.sw_lotti[0], 1.6, marks.sw_lotti[2]], { hero: 'lotti' });
  await T('steps', 60);
  const swl2 = await sc(() => window.__course.level.entities.find((x) => x.kind === 'figurenschalter' && x.hero === 'lotti').done);
  check('Lotti-Schalter: Greta nein, Lotti ja', !swl && swl2 && !(await T('named', 'truhe_l')).hidden);
}

// ---------------------------------------------------------------- Kanonen-Helm: Holzwand und Gegner
{
  const hk = marks.helm_k;
  await T('place', [hk[0], 1, hk[2] + 1.6]);
  await T('play', [[{ y: 1 }, 45], [{}, 20]]);
  const worn = (await T('fig', 0)).helmet;
  check('Kanonen-Helm aufheben (auf dem Kopf)', worn === 'kanone');
  await frame();
  const rigHelm = await sc(() => ({ kind: window.__course.rig.helmetKind, attached: !!window.__course.rig.helmet?.root.parent }));
  check('Avatar trägt den Helm als Mesh am Kopf (HeroRig)', rigHelm.kind === 'kanone' && rigHelm.attached);
  // feuert selbst (alle 0,6 s) in Blickrichtung (−Z) auf die Holzwand
  await sc(() => { const p = window.__course.player; p.yaw = Math.PI / 2; });
  let balls = 0;
  for (let k = 0; k < 8; k++) { await T('steps', 15); balls = Math.max(balls, (await T('ents', 'kanonenkugel')).length); }
  const wall = await T('named', 'holzwand');
  console.log(`  Kanone: Kugeln unterwegs ≤ ${balls}, Holzwand weg ${wall ? !wall.alive || wall.removed : 'entfernt'}`);
  check('Kanonen-Helm feuert Kanonenkugeln (automatisch)', balls >= 1);
  check('Kanonenkugel zerstört die Holzwand (breakable: \'cannon\')', !wall || !wall.alive || wall.removed);
  // Pilzling hinter der Wand in die Schusslinie (läuft auf die Figur zu)
  await sc(() => { const e = window.__course.level.named.get('pz_wand'); if (e && !e.defeated) { e.pos.set(-7, 1, -75); e.path = null; e.dir = { x: 0, z: 1 }; e.wake = 40; } });
  await T('steps', 150);
  const pz = await sc(() => { const e = window.__course.level.named.get('pz_wand'); return e ? { defeated: !!e.defeated, alive: e.alive } : { gone: true }; });
  console.log(`  Kanone: Pilzling hinter der Wand ${JSON.stringify(pz)}`);
  check('Kanonenkugel besiegt Gegner', pz.gone || pz.defeated);
  // Aktion feuert sofort
  await sc(() => { window.__course.player.helmetFx.t = 99; });
  await T('steps', 220);
  const nBefore = (await T('ents', 'kanonenkugel')).length;
  await sc(() => window.__course.setInput({ action: true }));
  await T('steps', 2);
  await sc(() => window.__course.setInput({}));
  const nAfter = (await T('ents', 'kanonenkugel')).length;
  check('Aktion feuert sofort eine Kugel', nAfter > nBefore);
  if (SHOTS) await shot('kanone', 600);
  // Holzwand hält Stampfen aus
  await sc(() => window.__course.level.spawn('holzwand', { id: 'hw2', pos: [-10, 1, -68], size: [2, 1, 2] }));
  await T('place', [-10, 4, -68], { settle: 1 });
  await sc(() => window.__course.player.startPound());
  await T('steps', 80);
  const hw2 = await T('named', 'hw2');
  const pl = await T('fig', 0);
  console.log(`  Holzwand gestampft: steht ${hw2.alive && !hw2.removed}, Klopfer ${hw2.knocks}, Figur y ${f2(pl.y)} (${pl.mode})`);
  check('Holzwand: Stampfen zerbricht sie nicht (Figur landet oben)', hw2.alive && !hw2.removed && pl.mode === 'ground' && pl.y > 1.9);
  // Treffer wirft den Helm ab (fängt den Treffer ab)
  await T('place', [hk[0] + 3, 1, hk[2] + 1]);
  await sc(() => window.__course.player.wearHelmet('kanone'));
  await sc(() => window.__course.player.hurt({ pos: { x: -3, y: 1, z: -64 } }));
  await T('steps', 40);
  const hit = await T('fig', 0);
  const loose = (await T('ents', 'helm_kanone')).length;
  console.log(`  Treffer mit Helm: Helm ${hit.helmet}, groß ${hit.big}, lose Helme ${loose}`);
  check('Treffer wirft den Helm ab (Figur bleibt groß), Helm liegt wieder im Level', hit.helmet === null && hit.big && loose >= 1);
  // Ducken + Aktion setzt ihn ab
  await T('place', [hk[0] + 3, 1, hk[2] + 1]);
  await sc(() => window.__course.player.wearHelmet('kanone'));
  await T('play', [[{ crouch: true }, 4], [{ crouch: true, action: true }, 3], [{}, 30]]);
  const off = await T('fig', 0);
  check('Ducken + Aktion setzt den Helm ab', off.helmet === null);
}

// ---------------------------------------------------------------- Propeller-Helm
{
  const hp = marks.helm_p;
  await T('place', [hp[0], 1, hp[2] + 1.6]);
  await T('play', [[{ y: 1 }, 45], [{}, 20]]);
  check('Propeller-Helm aufheben', (await T('fig', 0)).helmet === 'propeller');
  const y0 = (await T('fig', 0)).y;
  const up = await T('play', [[{ action: true }, 2], [{}, 110]]);
  const ymax = Math.max(...up.map((s) => s[1]));
  console.log(`  Propeller: Aufstieg ${f2(ymax - y0)} m`);
  check('Propeller-Helm: Aktion → steiler Aufstieg ≈ 8 m', ymax - y0 > 7.3 && ymax - y0 < 9);
  // gehalten: langsam sinken
  const fallHold = await T('play', [[{ run: true }, 60]]);
  const vHold = (fallHold[fallHold.length - 1][1] - fallHold[fallHold.length - 31][1]) / 0.25;
  const free = await T('play', [[{}, 20]]);
  const vFree = (free[free.length - 1][1] - free[free.length - 11][1]) / (10 / 120);
  console.log(`  Propeller: Sinken gehalten ${f2(vHold)} m/s, losgelassen ${f2(vFree)} m/s`);
  check('Propeller-Helm: gehalten langsames Sinken (≤ 2,7 m/s), sonst schneller', vHold < 0 && vHold > -2.7 && vFree < -4);
  // auf den Sims (8 m) fliegen
  await T('place', [0, 1, -75.4]);
  await sc(() => window.__course.player.wearHelmet('propeller'));
  const c0 = await T('coins');
  await T('play', [[{ action: true }, 2], [{}, 80], [{ y: 1, run: true }, 50], [{ run: true }, 90], [{}, 40]]);
  const top = await T('fig', 0);
  const c1 = await T('coins');
  console.log(`  Propeller auf den Sims: y ${f2(top.y)}, ${top.mode}, Münzen +${c1 - c0}`);
  check('Propeller-Helm: hinauf auf den 8-m-Sims', top.y > 7.9 && top.mode === 'ground');
  if (SHOTS) await shot('propeller', 600);
}

// ---------------------------------------------------------------- Licht-Helm und Testgeist
{
  const g = marks.geist;
  // abgewandt: kein Licht
  await T('place', [g[0], 1, g[2] + 3.5], { yaw: -Math.PI / 2 });
  await sc(() => window.__course.player.wearHelmet('licht'));
  await T('steps', 60);
  const away = await T('named', 'geist');
  check('Licht-Helm: abgewandt kein onLight', away.lightCalls === 0);
  await sc(() => { window.__course.player.yaw = Math.PI / 2; });
  await T('steps', 30);
  await frame();
  const lit = await T('named', 'geist');
  const cone = await sc(() => ({ cone: !!window.__course.rig.cone, kind: window.__course.rig.helmetKind }));
  console.log(`  Licht: onLight-Aufrufe ${lit.lightCalls}, Licht ${f2(lit.light)} s, Kegel ${cone.cone}`);
  check('Licht-Helm ruft onLight am Testgeist (Kegel nach vorn)', lit.lightCalls > 10 && cone.kind === 'licht');
  if (SHOTS) await shot('licht', 600);
  await T('steps', 100);
  const gone = await sc(() => { const e = window.__course.level.named.get('geist'); return { defeated: !!e?.defeated, removed: !!e?.removed }; });
  check('Testgeist löst sich im Licht auf', gone.defeated);
}

// ---------------------------------------------------------------- Topfpflanze
{
  const pf = marks.pflanze;
  await T('place', [pf[0], 1, pf[2] + 1.1]);
  await T('play', [[{ action: true }, 2], [{}, 10]]);
  const held = await sc(() => window.__course.player.holding?.kind ?? null);
  check('Topfpflanze aufheben (Tragen-System)', held === 'topfpflanze');
  // zum Gehege laufen: die Pflanze schnappt nach dem Pilzling
  await T('chase', [pf[0], 1, -90.3], 200, false, 0.2);
  for (let k = 0; k < 30; k++) { await T('steps', 20); const e = await sc(() => window.__course.level.named.get('pz_pflanze')); if (!e) break; }
  const pz = await sc(() => { const e = window.__course.level.named.get('pz_pflanze'); return { defeated: !!e?.defeated }; });
  const bites = await T('named', 'pflanze');
  console.log(`  Topfpflanze: Bisse ${bites.bites}, Pilzling besiegt ${pz.defeated}`);
  check('Topfpflanze besiegt den Pilzling', pz.defeated && bites.bites >= 1);
  if (SHOTS) await shot('topfpflanze', 600);
  await T('play', [[{ action: true }, 2], [{}, 90]]);
  const thrown = await sc(() => { const e = window.__course.level.named.get('pflanze'); return { held: !!e.carrier, x: e.pos.x, z: e.pos.z, grounded: e.grounded }; });
  check('Topfpflanze werfen (liegt danach wieder)', !thrown.held && thrown.grounded);
}

// ---------------------------------------------------------------- Treibsand
{
  const sd = marks.sand;
  await T('place', [sd[0], 1.05, -103]);
  const in1 = await T('fig', 0);
  await T('steps', 30);
  const in2 = await T('fig', 0);
  console.log(`  Treibsand: Tiefe ${in1.sand} → ${in2.sand} m (${in2.mode})`);
  check('Treibsand: Figur steht im Sand und sinkt ein', in2.mode === 'ground' && in2.sand > in1.sand && in2.sand > 0.05);
  const w = await T('play', [[{ x: 1 }, 60]]);
  const sp = Math.abs(w[59][0] - w[29][0]) / 0.25;
  console.log(`  Treibsand: Lauftempo ${f2(sp)} m/s (normal 6)`);
  check('Treibsand: Laufen verlangsamt (< 3,2 m/s)', sp > 0.3 && sp < 3.2);
  await T('place', [sd[0], 1.05, -103]);
  await T('steps', 40);
  const yj = (await T('fig', 0)).y;
  const jt = await T('play', [[{ jump: true }, 60], [{}, 30]]);
  const jh = Math.max(...jt.map((s) => s[1])) - yj;
  console.log(`  Treibsand: Sprunghöhe ${f2(jh)} m (normal 3,8)`);
  check('Treibsand: Springen geht schwer (Sprung < 2,3 m)', jh > 0.3 && jh < 2.3);
  await T('place', [sd[0], 1.05, -103]);
  const sink = await T('play', [[{}, 480]]);
  const dead = await T('fig', 0);
  const iDead = sink.findIndex((s) => s[4] === 'dead');
  console.log(`  Treibsand: tot nach ${f2(iDead / 120)} s (${dead.dead}, Ursache ${await sc(() => window.__course.player.deathCause)})`);
  check('Treibsand: ganz eingesunken = Tod', dead.dead && iDead > 120 && iDead < 480 && (await sc(() => window.__course.player.deathCause)) === 'sand');
  if (SHOTS) {
    await T('place', [sd[0] - 1, 1.05, -102]);
    await T('clone', [sd[0] + 1.2, 1.05, -102.5]);
    await T('steps', 150);
    await shot('treibsand', 600);
  }
  // Gegner sinken auch
  await T('place', [-8, 1, -103]);
  await sc((p) => window.__course.level.spawn('pilzling', { id: 'pz_sand', pos: p, dir: [0, -1], wake: 40 }), [1.5, 1.05, -104]);
  await T('steps', 60);
  const ez = await sc(() => { const e = window.__course.level.named.get('pz_sand'); return { y: e.pos.y, depth: e._sandDepth ?? 0 }; });
  await T('steps', 600);
  const eg = await sc(() => { const e = window.__course.level.named.get('pz_sand'); return { removed: !!e.removed, defeated: !!e.defeated }; });
  console.log(`  Treibsand: Pilzling Tiefe ${f2(ez.depth)} m → versunken ${eg.removed}`);
  check('Treibsand: Gegner sinken ein und verschwinden', ez.depth > 0.1 && eg.removed);
  // Klon im Sand: nur er verschwindet
  await T('place', [-8, 1, -103]);
  await T('clone', [2, 1.05, -105]);
  const cs = await T('steps', 480);
  const ls = await T('log');
  check('Treibsand: eingesunkener Klon verschwindet, Haupt-Figur bleibt', cs.length === 1 && !cs[0].dead && ls.some((e) => e.cause === 'sand'));
  // fließender Treibsand trägt zur Kante
  const fl = marks.sand_flow;
  await T('place', [fl[0] - 2.5, 1.05, fl[2]]);
  const fx0 = (await T('fig', 0)).x;
  await T('steps', 120);
  const fx1 = (await T('fig', 0)).x;
  console.log(`  Treibsand fließt: x ${f2(fx0)} → ${f2(fx1)}`);
  check('Fließender Treibsand trägt die Figur mit (Richtung flow)', fx1 - fx0 > 1.0);
}

// ---------------------------------------------------------------- Sandblock
{
  const sb = marks.sandblock;
  await T('place', [0, 1.05, -118.5]);
  const st = await T('steps', 90);
  const blk = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'sandblock').map((e) => ({ z: e.pos.z, state: e.state, crumbles: e.crumbles })));
  const first = blk.find((b) => Math.abs(b.z + 118.5) < 0.01);
  console.log(`  Sandblock: Zustand ${first.state}, Figur y ${f2(st[0].y)} (${st[0].mode})`);
  check('Sandblock bröselt nach dem Betreten weg (Figur fällt)', first.state === 'gone' && first.crumbles >= 1 && st[0].y < 0.9);
  await T('place', [0, 1, -115]);
  await T('steps', 400);
  const blk2 = await sc(() => window.__course.level.entities.find((e) => e.kind === 'sandblock' && Math.abs(e.pos.z + 118.5) < 0.01).state);
  check('Sandblock kommt wieder', blk2 === 'solid');
  if (SHOTS) {
    await T('place', [0, 1.05, -120.5]);
    await T('steps', 30);
    await shot('sandblock', 500);
  }
}

// ---------------------------------------------------------------- Zielmast mit Klon
{
  const gl = marks.goal;
  await T('place', [gl[0] - 2, 1, gl[2] + 4]);
  await T('clone', [gl[0] + 1.5, 1, gl[2] + 1.5]);
  await sc(() => { const L = window.__course.level; L.players[1].reset([L.data.goal[0] - 0.8, 2.2, L.data.goal[2]], Math.PI); });
  const gs = await T('steps', 40);
  const gm = await sc(() => { const c = window.__course, L = c.level; return { mainClone: !!L.player.clone, script: L.player.script?.type, status: L.runtime.status, other: L.players[1]?.script?.type ?? L.players[1]?.mode }; });
  await T('steps', 240);
  const gm2 = await sc(() => { const L = window.__course.level; return { other: L.players[1]?.script?.type ?? L.players[1]?.mode, state: L.players[1]?.state }; });
  console.log(`  Zielmast: ${JSON.stringify(gm)}, danach ${JSON.stringify(gm2)}`);
  check('Zielmast: die greifende Figur (Klon) wird Haupt-Figur, die andere jubelt', gm.mainClone && gm.script === 'goal' && gm.status === 'goal' && gm2.other === 'cheer' && gm2.state === 'victory');
}

// ---------------------------------------------------------------- Kennzahlen
{
  await sc(() => { const c = window.__course; c.finished = false; c.scene.stop('CourseResult'); });
  await T('place', [0, 1, -2]);
  await shot('kennzahl_1', 1200);
  for (let i = 0; i < 4; i++) await T('clone');
  await T('steps', 120);
  await shot('kennzahl_5', 1200);
  console.log('\n  Kennzahlen (Zeichenaufrufe inkl. Schattenpass, Dreiecke, Figuren):');
  for (const [n, c, t, f] of stats) console.log(`    ${n.padEnd(16)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke  ${f} Figur(en)`);
  const k1 = stats.find((s) => s[0] === 'kennzahl_1'), k5 = stats.find((s) => s[0] === 'kennzahl_5');
  if (k1 && k5) {
    console.log(`    je Klon ≈ ${((k5[1] - k1[1]) / 4).toFixed(1)} Aufrufe`);
    check('5 Figuren: < 140 Zeichenaufrufe inkl. Schattenpass', k5[1] < 140);
  }
}

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
