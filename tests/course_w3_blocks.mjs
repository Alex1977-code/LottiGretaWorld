// Kurs-Modus, Welt-3-Bausteine in der Winterwerkstatt 0-13: je Baustein das Kernverhalten deterministisch über
// window.__course.step(n) und setInput prüfen; Sichtprüfung über Bilder tests/out/w3b_*.png (Kurs-Kamera), Kennzahlen
// (Zeichenaufrufe, Dreiecke), Themen-Bilder je Welt-3-Thema (w3b_thema_*.png), Unterwasser-Stimmung und Stimmungswechsel.
// Aufruf: PORT_BASE=3900 node tests/course_w3_blocks.mjs   (Port 4350; vorher npm run build; nutzt vite preview)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4350;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W3B_SHOTS !== '0';

async function load(extra = '') {
  await page.goto(`http://localhost:${port}/?course=0-13&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log('Winterwerkstatt startet nicht. Konsole:');
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
        if (o.power) p.setPower(o.power);
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        c.step(o.settle ?? 30);
        return p.info();
      },
      play(segs, every = 1) {
        const tr = [];
        for (const [inp, n] of segs) {
          c.setInput(inp);
          for (let i = 0; i < n; i++) {
            c.step(1);
            const p = P();
            if (i % every === 0) tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state, p.script?.kind ?? p.script?.type ?? '', +p.hSpeed().toFixed(2), p.ground?.tag ?? '']);
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
      ground: () => { const g = P().ground; return g ? { tag: g.tag, top: g.top, ice: !!g.ice } : null; },
      ray: (x, y, z, opts) => { const h = L().world.raycastDown(x, y, z, 40, opts); return h ? { y: +h.y.toFixed(3), tag: h.shape.tag } : null; },
      starsAlive: (index) => L().entities.filter((e) => e.kind === 'star' && e.index === index && e.alive && !e.hidden).map((e) => [e.pos.x, e.pos.y, e.pos.z]),
      starGot: (index) => !!L().runtime.stars?.[index],
      jump(n = 30) { c.setInput({ jump: true }); c.step(n); c.setInput({}); },
      /** Stampfattacke aus dem Stand: springen, in der Luft ducken. */
      pound() {
        c.setInput({ jump: true }); c.step(16);
        c.setInput({ crouch: true }); c.step(70);
        c.setInput({}); c.step(30);
        return P().info();
      },
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const stats = [];
async function freshFrames(n = 3, timeout = 30000) {
  const f0 = await sc(() => window.__course.view.frame);
  try { await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + n, { timeout }); } catch { /* weiter */ }
}
async function shot(name, wait = 1600) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  await freshFrames();
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  try { await page.screenshot({ path: `${OUT}w3b_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

await load();
const marks = await sc(() => window.__t.marks);
console.log('Winterwerkstatt 0-13');
{
  const st = await sc(() => ({ kinds: [...new Set(window.__course.level.entities.map((e) => e.kind))].sort(), named: [...window.__course.level.named.keys()] }));
  console.log(`  Arten: ${st.kinds.join(', ')}`);
  const need = ['schneeblock', 'eisblock', 'eiszapfen', 'schneehaufen', 'tanne', 'schaltblock', 'buecherregal', 'bilderrahmen', 'zielmast_spuk', 'spuk_tuer', 'wasserschalter', 'wandriss', 'goldring', 'kurbelrad', 'vehicle', 'endlessblock', 'warpbox'];
  check('Level geladen (Welt-3-Entitäten vorhanden)', need.every((k) => st.kinds.includes(k)));
  const ids = ['n1', 'tafel', 'treppe', 'sofa', 'leuchter', 'dreh', 'see', 'hsteg', 'rohr', 'ampel', 'sf', 'bb', 'kp', 'wl', 'gondel', 'sbr'];
  check('Bausteine benannt (level.named)', ids.every((id) => st.named.includes(id)));
  check('Keine Konsolenfehler beim Laden', errors.length === 0);
  if (errors.length) for (const e of errors.slice(0, 8)) console.log('   ', e);
  await shot('start', 1500);
}

// ---------------------------------------------------------------- Schnee und Eis
{
  const c0 = await T('coins');
  await T('place', marks.sb, { settle: 20 });
  await T('play', [[{ jump: true }, 40], [{}, 60]]);
  const sb = await sc(() => window.__t.named('sbr').blocks.map((b) => !!b.broken));
  const c1 = await T('coins');
  console.log(`  Schneeblöcke: zerbrochen ${JSON.stringify(sb)}, Münzen +${c1 - c0}`);
  check('Schneeblock: Kopfstoß zerbricht ihn, Inhalt (Münze) kommt heraus, Nachbarn bleiben', sb[1] && !sb[0] && !sb[2] && c1 - c0 === 1);
  // Eisblock oben (Kopfstoß, 3 Münzen) und Eisblock am Boden (Feuerball)
  await T('place', [-1, 1, -10], { settle: 20 });
  await T('play', [[{ jump: true }, 40], [{}, 60]]);
  const c2 = await T('coins');
  const hoch = await sc(() => window.__t.ent('eis_hoch'));
  await T('place', marks.eis_f, { power: 'funken', yaw: Math.PI / 2, settle: 20 });
  await T('play', [[{ action: true }, 3], [{}, 90]]);
  const c3 = await T('coins');
  const unten = await sc(() => window.__t.ent('eis_f'));
  console.log(`  Eisblöcke: Kopfstoß → weg ${!hoch}, Münzen +${c2 - c1}; Feuerball → weg ${!unten}, Münzen +${c3 - c2}`);
  check('Eisblock: Kopfstoß zerbricht ihn (3 Münzen)', !hoch && c2 - c1 === 3);
  check('Eisblock: Feuerball (Funkenblüte) zerbricht ihn', !unten && c3 - c2 === 1);
  await shot('schnee', 1200);
  // Eiszapfen: Figur darunter → zittert, fällt, trifft
  await T('place', marks.ez, { settle: 10 });
  await T('play', [[{}, 150]]);
  const ez = await sc(() => { const e = window.__t.ent('ez1'); return { state: e.state, falls: e.falls }; });
  const pi = await T('info');
  await T('place', [marks.ez[0] - 5, 1, marks.ez[2]], { settle: 3.3 * 120 });
  const ez2 = await sc(() => window.__t.ent('ez1').state);
  console.log(`  Eiszapfen: Fall ${ez.falls}, Zustand ${ez.state} → nach 3 s ${ez2}; Figur groß ${pi.big}, unverwundbar ${pi.invuln}`);
  check('Eiszapfen: fällt, wenn eine Figur darunter steht, trifft sie und wächst nach', ez.falls >= 1 && (pi.invuln > 0 || !pi.big) && ez2 === 'hang');
  // Schneehaufen: Stampfen → Münzen
  const c4 = await T('coins');
  await T('place', [marks.haufen[0], 2.2, marks.haufen[2]], { settle: 30 });
  await T('pound');
  const c5 = await T('coins');
  const hf = await sc(() => !!window.__t.ent('haufen'));
  console.log(`  Schneehaufen: noch da ${hf}, Münzen +${c5 - c4}`);
  check('Schneehaufen: Stampfen zerstiebt ihn, 5 versteckte Münzen kommen heraus', !hf && c5 - c4 === 5);
  // Tanne: Hineinrennen schüttelt Schnee ab und gibt den Inhalt
  await T('place', [marks.tanne[0], 1, marks.tanne[2] + 5], { yaw: Math.PI / 2, settle: 10 });
  await T('play', [[{ y: 1, run: true }, 110], [{}, 60]]);
  const tn = await sc(() => { const e = window.__t.ent('tanne1'); return { shakes: e.shakes, given: e.given }; });
  const c6 = await T('coins');
  console.log(`  Tanne: geschüttelt ${tn.shakes}×, Inhalt ${tn.given}, Münzen +${c6 - c5}`);
  check('Tanne: Hineinrennen schüttelt sie, der Inhalt (3 Münzen) fällt heraus', tn.shakes >= 1 && tn.given && c6 - c5 === 3);
  // Eisfläche: Flag ice am Boden; nach dem Loslassen gleitet die Figur weiter (normaler Boden: steht sofort)
  await T('place', marks.eis, { yaw: Math.PI / 2, settle: 20 });
  const g = await T('ground');
  await T('play', [[{ y: 1 }, 120]]);
  const a = await T('play', [[{}, 30]]);
  await T('place', [0, 1, -16], { yaw: Math.PI / 2, settle: 20 });
  await T('play', [[{ y: 1 }, 120]]);
  const b = await T('play', [[{}, 30]]);
  console.log(`  Eisfläche: Boden ${JSON.stringify(g)}; 0,25 s nach Loslassen Tempo Eis ${a.at(-1)[6]} m/s, Schnee ${b.at(-1)[6]} m/s`);
  check('Eisfläche: Kollision mit Flag ice, die Figur rutscht nach (≥ 3 m/s), auf Schnee steht sie (0 m/s)', g?.ice && a.at(-1)[6] >= 3 && b.at(-1)[6] < 0.2);
  await shot('eis', 1200);
}

// ---------------------------------------------------------------- Schienen: Schalttafel, Weiche, Schaltblock
{
  const b0 = await sc(() => window.__t.named('tafel').info());
  await T('place', [6, 1, -36], { settle: 120 });
  const b1 = await sc(() => window.__t.named('tafel').info());
  check('Schalttafel: ohne Figur fährt sie nicht', Math.abs(b1.z - b0.z) < 1e-3 && b1.v === 0);
  // Figur in die Mitte der Tafel: fährt los (geradeaus Richtung −Z)
  await T('place', [b1.x, b1.y + 0.9, b1.z], { settle: 20 });
  await T('play', [[{}, 120]]);
  const b2 = await sc(() => window.__t.named('tafel').info());
  const g2 = await T('ground');
  console.log(`  Schalttafel: z ${f2(b1.z)} → ${f2(b2.z)} (v ${b2.v}), Figur auf ${g2?.tag}`);
  check('Schalttafel: fährt, solange eine Figur draufsteht, und trägt sie', b2.z < b1.z - 2.5 && g2?.tag === 'schalttafel');
  // Figur weg → Tafel bremst und bleibt stehen
  await T('place', [6, 1, -36], { settle: 60 });
  const b3 = await sc(() => window.__t.named('tafel').info());
  await T('play', [[{}, 60]]);
  const b4 = await sc(() => window.__t.named('tafel').info());
  console.log(`  ohne Figur: v ${b3.v}, z ${f2(b3.z)} → ${f2(b4.z)}`);
  check('Schalttafel: ohne Figur bremst sie sofort und bleibt stehen', b3.v === 0 && Math.abs(b4.z - b3.z) < 1e-3);
  await shot('schienen', 1200);
  // Weiche nach links: Figur steht auf der linken Hälfte (Neigung links)
  await T('place', [b4.x - 1.1, b4.y + 0.9, b4.z], { settle: 20 });
  await T('play', [[{}, 14 * 120]]);
  const b5 = await sc(() => window.__t.named('tafel').info());
  const p5 = await T('info');
  console.log(`  Weiche: Wahl ${b5.lastChoice}, Ende x ${f2(b5.x)} z ${f2(b5.z)} (stopped ${b5.stopped}); Figur x ${f2(p5.x)} z ${f2(p5.z)}`);
  check('Schalttafel: an der Weiche entscheidet die Neigung (links) – Fahrt auf den linken Strang bis zum Ende', b5.lastChoice === 'links' && Math.abs(b5.x + 6) < 0.05 && Math.abs(b5.z + 74) < 0.05 && b5.stopped && Math.abs(p5.x - b5.x) < 1.6);
  // Schaltblock: Kopfstoß kehrt die Schienen um → Tafel fährt mit Figur zurück zum Anfang
  await T('place', [4, 1, -38], { settle: 20 });
  await T('play', [[{ jump: true }, 40], [{}, 40]]);
  const net = await sc(() => window.__t.named('n1').info());
  await T('place', [b5.x, b5.y + 0.9, b5.z], { settle: 20 });
  await T('play', [[{}, 16 * 120]]);
  const b6 = await sc(() => window.__t.named('tafel').info());
  console.log(`  Schaltblock: Netz ${JSON.stringify(net)}; Tafel zurück bei x ${f2(b6.x)} z ${f2(b6.z)} (stopped ${b6.stopped})`);
  check('Schaltblock: Kopfstoß kehrt die Fahrtrichtung um, die Tafel fährt zurück bis zum Anfang', net.sign === -1 && Math.abs(b6.x) < 0.05 && Math.abs(b6.z + 37) < 0.05 && b6.stopped);
  // Weiche rechts (Richtung wieder umkehren, Figur rechts)
  await sc(() => window.__t.named('n1').reverse());
  await T('place', [b6.x + 1.1, b6.y + 0.9, b6.z], { settle: 20 });
  await T('play', [[{}, 15 * 120]]);
  const b7 = await sc(() => window.__t.named('tafel').info());
  console.log(`  Weiche rechts: Wahl ${b7.lastChoice}, Ende x ${f2(b7.x)} z ${f2(b7.z)}`);
  check('Schalttafel: Neigung rechts → rechter Strang', b7.lastChoice === 'rechts' && Math.abs(b7.x - 6) < 0.05);
}

// ---------------------------------------------------------------- Spukhaus
{
  // Bücherregal: Hineinlaufen schiebt es; am Ende des Wegs erscheint der Stern dahinter
  const r0 = await sc(() => window.__t.ent('regal').off);
  await T('place', marks.regal_push, { yaw: 0, settle: 10 });
  await T('play', [[{ x: 1 }, 260], [{}, 20]]);
  const r1 = await sc(() => { const e = window.__t.ent('regal'); return { off: e.off, opened: e.opened }; });
  const st0 = await T('starsAlive', 0);
  console.log(`  Bücherregal: Versatz ${f2(r0)} → ${f2(r1.off)} (Ende erreicht ${r1.opened}), Stern 0 ${JSON.stringify(st0)}`);
  check('Bücherregal: Hineinlaufen schiebt es bis ans Ende, onOpen zeigt den Stern', r1.off > 2.49 && r1.opened && st0.length === 1);
  // Angriff (Tatze) von der rechten Seite stößt es 1 m zurück
  await sc(() => { const e = window.__t.ent('regal'); window.__t.regalX = e.pos.x; });
  const rx = await sc(() => window.__t.regalX);
  await T('place', [rx + 1.75, 1, -86], { yaw: Math.PI, power: 'krallen', settle: 10 });
  await T('play', [[{ action: true }, 3], [{}, 80]]);
  const r2 = await sc(() => window.__t.ent('regal').off);
  console.log(`  Bücherregal nach Tatzenhieb: ${f2(r1.off)} → ${f2(r2)}`);
  check('Bücherregal: Angriff stößt es 1 m weiter (weg vom Angreifer)', Math.abs(r1.off - r2 - 1) < 0.05);
  await shot('regal', 1200);
  // Verschiebbare Treppe: Annäherung → fährt aus der Wand an ihren Platz
  const k0 = await sc(() => window.__t.named('treppe').k);
  await T('place', marks.treppe, { settle: 10 });
  await T('play', [[{}, 240]]);
  const k1 = await sc(() => window.__t.named('treppe').k);
  const s1 = await T('ray', 5.3, 6, -88), s4 = await T('ray', 7.1, 6, -88);
  console.log(`  Spuk-Treppe: k ${k0} → ${k1}; Stufe 1 ${JSON.stringify(s1)}, Stufe 4 ${JSON.stringify(s4)}`);
  check('Spuk-Treppe: fährt bei Annäherung aus, Stufen 0,58 / 2,08 m hoch begehbar', k0 === 0 && k1 === 1 && s1?.tag === 'spuk_treppe' && Math.abs(s1.y - 1.58) < 0.01 && Math.abs(s4.y - 3.08) < 0.01);
  // Spuk-Sofa: Lift
  await T('place', marks.sofa, { settle: 20 });
  await T('play', [[{}, 4.2 * 120]]);
  const so = await sc(() => { const s = window.__t.named('sofa'); return { state: s.state, y: s.y }; });
  const ps = await T('info');
  const star1 = await T('starGot', 1);
  console.log(`  Spuk-Sofa: ${so.state}, Sofa y ${f2(so.y)}, Figur y ${f2(ps.y)} (${ps.mode}), Stern 1 ${star1}`);
  check('Spuk-Sofa: hebt mit der Figur ab und schwebt 4 m hoch (Stern oben)', so.state === 'top' && Math.abs(so.y - 5) < 0.01 && Math.abs(ps.y - 5.75) < 0.05 && star1);
  await shot('sofa', 1200);
  await T('place', [0, 1, -92], { settle: 10 });
  await T('play', [[{}, 6 * 120]]);
  const so2 = await sc(() => { const s = window.__t.named('sofa'); return { state: s.state, y: s.y }; });
  check('Spuk-Sofa: ohne Figur sinkt es nach back s wieder', so2.state === 'idle' && Math.abs(so2.y - 1) < 0.01);
  // Kronleuchter: Figur steht auf dem Ring und schwingt mit
  const kl = await sc(() => { const s = window.__t.named('leuchter'); return [s.x, s.y, s.z]; });
  await T('place', [kl[0], kl[1] + 0.3, kl[2]], { settle: 6 });
  const tr = await T('play', [[{}, 150]]);
  const kl2 = await sc(() => { const s = window.__t.named('leuchter'); return [s.x, s.y, s.z]; });
  const pk = await T('info');
  const onAll = tr.slice(10).every((r) => r[7] === 'kronleuchter');
  console.log(`  Kronleuchter: x ${f2(kl[0])} → ${f2(kl2[0])}; Figur x ${f2(pk.x)} (immer auf dem Ring ${onAll})`);
  check('Kronleuchter: schwingt und trägt die Figur mit', onAll && Math.abs((pk.x - kl2[0])) < 0.6 && Math.abs(kl2[0] - kl[0]) > 0.2);
  // Gemälde: Hineinspringen klappt es auf, die Warp-Box erscheint; hinein → Drehraum
  await T('place', marks.bild, { settle: 10 });
  await T('play', [[{ jump: true }, 30], [{}, 80]]);
  const bild = await sc(() => ({ opened: window.__t.ent('bild').opened, warp: !window.__t.named('bild_warp').hidden }));
  await shot('gemaelde', 1200);
  const wb = await sc(() => { const w = window.__t.named('bild_warp'); return [w.pos.x, w.pos.y + 2.2, w.pos.z]; });
  await T('place', wb, { settle: 6 });
  await T('play', [[{}, 260]]);
  const pw = await T('info');
  console.log(`  Gemälde: aufgeklappt ${bild.opened}, Warp-Box sichtbar ${bild.warp}; nach dem Sprung hinein x ${f2(pw.x)} z ${f2(pw.z)}`);
  check('Gemälde: Hineinspringen öffnet es, die Warp-Box dahinter erscheint und führt in den Drehraum', bild.opened && bild.warp && Math.abs(pw.x - 60) < 1.5);
  await T('place', [0, 1, -112], { settle: 10 });   // aus dem Drehraum (sein Takt beginnt neu, sobald jemand drin ist)
  // Drehraum: dreht sich in Vierteldrehungen, die Einbauten wandern (Boden → Wand)
  await T('place', marks.dreh, { settle: 10 });
  const d0 = await T('ray', 64.4, 10, -110);
  await T('play', [[{}, 4.2 * 120]]);
  const dmid = await sc(() => { const d = window.__t.named('dreh'); return { turning: d.turning, angle: d.angle }; });
  await shot('drehraum', 600);
  await T('play', [[{}, 1.5 * 120]]);
  const d1 = await sc(() => { const d = window.__t.named('dreh'); return { quarter: d.quarter, turns: d.turns }; });
  const dr = await T('ray', 64.4, 10, -110);
  const pd = await T('info');
  console.log(`  Drehraum: dreht ${dmid.turning} (Winkel ${f2(dmid.angle)}), danach Viertel ${d1.quarter}; Einbau rechts ${JSON.stringify(d0)} → ${JSON.stringify(dr)}; Figur ${pd.mode} y ${f2(pd.y)}`);
  check('Drehraum: dreht sich um die Längsachse, Einbauten liegen danach gedreht (Boden-Bank wird Wand-Leiste)', dmid.turning && d1.quarter === 1 && Math.abs(d0.y - 1) < 0.01 && dr?.tag === 'drehraum:teil' && Math.abs(dr.y - 5) < 0.01 && !pd.dead);
  // Falscher Zielmast
  await T('place', marks.falsch, { settle: 6 });
  await T('play', [[{ y: 1 }, 20], [{}, 10]]);
  const fz = await sc(() => ({ tricked: window.__t.ent('falsch')?.tricked, banner: window.__course.level.lastBanner, status: window.__course.level.runtime.status }));
  await T('play', [[{}, 200]]);
  const fz2 = await sc(() => ({ hidden: window.__t.ent('falsch')?.hidden }));
  const base = await T('ray', -5, 5, -122);
  console.log(`  Falscher Zielmast: reingelegt ${fz.tricked} („${fz.banner}“), Level ${fz.status}; danach weg ${fz2.hidden}, Sockel ${JSON.stringify(base)}`);
  check('Falscher Zielmast: Berührung → „Reingelegt!“, kein Levelende, Mast verschwindet', fz.tricked && fz.banner === 'Reingelegt!' && fz.status === 'play' && fz2.hidden && Math.abs(base.y - 1) < 0.01);
  // Spuk-Tür: Durchgang mit Raumwechsel
  await T('place', marks.tuerA, { yaw: Math.PI / 2, settle: 10 });
  await T('play', [[{ y: 1 }, 150], [{}, 60]]);
  const pt = await T('info');
  const mood = await sc(() => window.__course.view.mood?.info?.() ?? null);
  console.log(`  Spuk-Tür: Figur danach x ${f2(pt.x)} z ${f2(pt.z)}; Stimmung ${JSON.stringify(mood)}`);
  check('Spuk-Tür: Hineingehen führt durch die Zieltür (Raumwechsel)', Math.abs(pt.x - 90) < 2 && pt.mode === 'ground');
}

// ---------------------------------------------------------------- Lagune
{
  const w0 = await sc(() => ({ top: window.__t.named('see').top, deck: window.__t.named('hsteg').deckY }));
  await T('place', marks.schalter, { settle: 20 });
  await T('play', [[{}, 140]]);
  const w1 = await sc(() => ({ top: window.__t.named('see').top, deck: window.__t.named('hsteg').deckY, pressed: window.__t.ent('wschalter').pressed }));
  const deck = await T('ray', -3, 6, -172);
  console.log(`  Wasserschalter: gedrückt ${w1.pressed}; Wasser ${f2(w0.top)} → ${f2(w1.top)}; Holzsteg ${f2(w0.deck)} → ${f2(w1.deck)} (${JSON.stringify(deck)})`);
  check('Wasserschalter: Draufspringen hebt das Wasser (Aktion water) auf y', w1.pressed && Math.abs(w0.top + 0.6) < 0.01 && Math.abs(w1.top - 0.9) < 0.01);
  check('Holzsteg: schwimmt auf und hebt sich mit dem Wasserstand (bis hub)', w0.deck > -0.6 && w0.deck < -0.4 && Math.abs(w1.deck - 0.9) < 0.01 && deck?.tag === 'holzsteg' && Math.abs(deck.y - 0.9) < 0.01);
  await shot('lagune', 1200);
  // Röhren-Netz: hineinlaufen → gleitet durch, sammelt die Münzen
  const c0 = await T('coins');
  await T('place', marks.rohr, { yaw: Math.PI / 2, settle: 10 });
  const tr = await T('play', [[{ y: 1 }, 40], [{}, 500]]);
  const c1 = await T('coins');
  const inPipe = tr.some((r) => r[5] === 'glasspipe');
  console.log(`  Röhren-Netz: im Rohr ${inPipe}, Münzen +${c1 - c0}, Ende ${JSON.stringify(tr.at(-1).slice(0, 5))}`);
  check('Röhren-Netz: Figur gleitet durch die Wasserröhre und sammelt die Münzen', inPipe && c1 - c0 >= 4 && tr.at(-1)[3] !== 'script');
  // Wandriss: Stampfwelle/Seitentreffer nein, Kanonenkugel ja
  const c2 = await T('coins');
  const rs = await sc(() => {
    const e = window.__t.ent('riss');
    e.onHit('pound', { pos: { x: e.pos.x + 2, y: e.pos.y, z: e.pos.z } });
    e.onHit('claw');
    const a = e.broken;
    e.onHit('cannon', {});
    return { a, b: e.broken };
  });
  await T('play', [[{}, 10]]);
  const c3 = await T('coins');
  console.log(`  Wandriss: nach Stampfen/Tatze ${rs.a}, nach Kanonenkugel ${rs.b}, Münzen +${c3 - c2}`);
  check('Wandriss: nur Kanonenkugel (Bombe, Riesentrank) sprengt ihn, dahinter Belohnung', !rs.a && rs.b && c3 - c2 === 3);
}

// ---------------------------------------------------------------- Rennstrecke
{
  await T('place', [0, 1, -192.5], { yaw: Math.PI / 2, settle: 10 });
  const tr = await T('play', [[{ y: 1 }, 140]]);
  const ampel = await sc(() => window.__t.named('ampel').go);
  const vmax = Math.max(...tr.map((r) => r[6]));
  console.log(`  Startbogen: Ampel grün ${ampel}; Boost-Tor: Tempo bis ${vmax} m/s`);
  check('Start-Ziel-Bogen: Ampel springt beim Durchlaufen auf Grün', ampel);
  check('Boost-Tor: wer hindurchläuft, wird auf ≥ 15 m/s beschleunigt', vmax >= 15);
  await T('place', marks.rampe, { yaw: Math.PI / 2, settle: 10 });
  const tr2 = await T('play', [[{ y: 1 }, 50]]);
  const v2 = Math.max(...tr2.map((r) => r[6])), y2 = Math.max(...tr2.map((r) => r[1]));
  console.log(`  Boost-Schräge: Tempo bis ${v2} m/s, Höhe bis ${f2(y2)}`);
  check('Boost-Schräge: beschleunigt die Figur die Rampe hinauf', v2 >= 15 && y2 > 1.5);
  // Sprungfeld: schleudert genau auf das Ziel
  await T('place', marks.sf, { settle: 4 });
  const tr3 = await T('play', [[{}, 240]]);
  const p3 = await T('info');
  const launched = tr3.some((r) => r[5] === 'sprungfeld');
  console.log(`  Sprungfeld: geflogen ${launched}, gelandet bei ${f2(p3.x)} ${f2(p3.y)} ${f2(p3.z)} (${p3.mode})`);
  check('Sprungfeld: schleudert über die 7-m-Lücke genau aufs Ziel (±0,15 m)', launched && Math.hypot(p3.x - 0, p3.z + 215) < 0.15 && Math.abs(p3.y - 1) < 0.05 && p3.mode === 'ground');
  await shot('rennen', 1200);
  // Pilztrampolin: Landen federt hoch
  await T('place', marks.pilz, { settle: 1 });
  const tr4 = await T('play', [[{}, 90]]);
  const up = Math.max(...tr4.map((r) => r[1]));
  console.log(`  Pilztrampolin: Höhe nach dem Aufprall bis ${f2(up)}`);
  check('Pilztrampolin: Landen auf dem Hut schleudert hoch (> 5 m über dem Hut)', up > 2.25 + 5);
  // Rutschhang: ohne Eingabe rutscht die Figur schnell bergab
  await T('place', marks.hang, { yaw: Math.PI / 2, settle: 2 });
  const tr5 = await T('play', [[{}, 150]]);
  const sl = tr5.filter((r) => r[4] === 'slide').length;
  const p5 = await T('info');
  console.log(`  Rutschhang: ${sl} Schritte im Rutschen, z ${marks.hang[2]} → ${f2(p5.z)}, Tempo bis ${Math.max(...tr5.map((r) => r[6]))}`);
  check('Rutschhang (Flag slide): Figur rutscht ohne Ducken bergab', sl > 60 && p5.z < marks.hang[2] - 8);
}

// ---------------------------------------------------------------- Himmel
{
  // Kurbelrad: Tatzenhiebe drehen es, die Plattform steigt
  const k0 = await sc(() => { const e = window.__t.ent('kurbel'); return { a: e.angle, y: e.platformY }; });
  await T('place', marks.kurbel, { yaw: Math.PI, power: 'krallen', settle: 10 });
  for (let i = 0; i < 3; i++) await T('play', [[{ action: true }, 3], [{}, 60]]);
  const k1 = await sc(() => { const e = window.__t.ent('kurbel'); return { a: e.angle, y: e.platformY }; });
  // Laufen neben dem Rad dreht es mit
  await T('place', [-8, -3, -248.6], { yaw: 0, settle: 5 });
  await T('play', [[{ x: 0.35 }, 40]]);
  const k2 = await sc(() => { const e = window.__t.ent('kurbel'); return { a: e.angle, y: e.platformY }; });
  console.log(`  Kurbelrad: Winkel ${f2(k0.a)} → ${f2(k1.a)} (Hiebe) → ${f2(k2.a)} (Laufen); Plattform y ${f2(k0.y)} → ${f2(k2.y)}`);
  check('Kurbelrad: Angriffe drehen es, die Plattform hebt sich', k1.a > 6 && k1.y > k0.y + 1.5);
  check('Kurbelrad: Laufen neben dem Rad dreht es weiter', k2.a > k1.a + 0.3);
  await shot('himmel', 1200);
  // Bröckelblöcke
  await T('place', marks.bb, { settle: 20 });
  const bst = await sc(() => window.__t.named('bb').blocks[1].state);
  await T('play', [[{}, 70]]);
  const b1 = await sc(() => window.__t.named('bb').blocks[1].state);
  const pb = await T('info');
  await T('place', [0, -3, -252], { settle: 3.2 * 120 });
  const b2 = await sc(() => window.__t.named('bb').blocks[1].state);
  console.log(`  Bröckelblock: ${bst} → ${b1}, Figur y ${f2(pb.y)}; nach 3 s ${b2}`);
  check('Bröckelblock: zerbröselt nach dem Betreten, die Figur fällt; kommt nach respawn s wieder', (bst === 'shake' || bst === 'idle') && b1 === 'gone' && pb.y < -2.2 && b2 === 'idle');
  // Goldring
  const c0 = await T('coins');
  await T('place', marks.ring, { yaw: Math.PI / 2, settle: 5 });
  await T('play', [[{ y: 1 }, 100], [{}, 90]]);
  const c1 = await T('coins');
  const ring = await sc(() => !!window.__t.ent('ring'));
  console.log(`  Goldring: Münzen +${c1 - c0}, Ring noch da ${ring}`);
  check('Goldring: Hindurchlaufen gibt 5 Münzen, der Ring verschwindet', c1 - c0 === 5 && !ring);
  // Kettenplattform trägt
  const kp0 = await sc(() => ({ ...window.__t.named('kp').pos }));
  await T('place', [kp0.x, kp0.y + 0.6, kp0.z], { settle: 4 });
  await T('play', [[{}, 3 * 120]]);
  const kp1 = await sc(() => ({ ...window.__t.named('kp').pos }));
  const pk = await T('info');
  const gk = await T('ground');
  console.log(`  Kettenplattform: z ${f2(kp0.z)} → ${f2(kp1.z)}, Figur z ${f2(pk.z)} auf ${gk?.tag}`);
  check('Kettenplattform: fährt ihre Bahn und trägt die Figur', kp1.z < kp0.z - 4 && gk?.tag === 'kettenplattform' && Math.abs(pk.z - kp1.z) < 1.6);
  // Wolkenlift: unsichtbar, erscheint beim Betreten und hebt die Figur
  const wl0 = await sc(() => ({ shown: window.__t.named('wl').shown }));
  await T('place', marks.wl, { settle: 30 });
  const wl1 = await sc(() => ({ shown: window.__t.named('wl').shown, state: window.__t.named('wl').state }));
  await T('play', [[{}, 5 * 120]]);
  const wl2 = await sc(() => ({ state: window.__t.named('wl').state, y: window.__t.named('wl').pos.y }));
  const pwl = await T('info');
  const star2 = await T('starGot', 2);
  console.log(`  Wolkenlift: anfangs sichtbar ${wl0.shown}; betreten → ${wl1.shown}/${wl1.state}; oben ${wl2.state} y ${f2(wl2.y)}, Figur y ${f2(pwl.y)}, Stern 2 ${star2}`);
  check('Wolkenlift: unsichtbar, erscheint bei Berührung und fährt die Figur hinauf', !wl0.shown && wl1.shown && wl2.state === 'top' && Math.abs(pwl.y - 2.55) < 0.05 && star2);
  await shot('wolkenlift', 1200);
}

// ---------------------------------------------------------------- Zug, Zirkus, Pastell
{
  const zr = await sc(() => {
    const t = window.__t;
    const V = ['lok', 'wagen', 'flach'].map((id) => { const v = t.named(id); return { id, model: !!v.ext, top: v.size.h }; });
    return { V, cab: t.ray(-14, 3, -304.5), kessel: t.ray(-14, 3, -309), wagen: t.ray(-14, 3, -318), flach: t.ray(-14, 3, -329) };
  });
  console.log(`  Zug: ${JSON.stringify(zr.V)}; Führerhaus ${JSON.stringify(zr.cab)}, Kessel ${JSON.stringify(zr.kessel)}, Wagendach ${JSON.stringify(zr.wagen)}, Flachwagen ${JSON.stringify(zr.flach)}`);
  check('Zug: Lok/Wagen/Flachwagen mit Modell zug_waggon, begehbare Oberkanten 3,96 / 3,75 / 1,39 m', zr.V.every((v) => v.model)
    && Math.abs(zr.cab.y - 0.96) < 0.01 && Math.abs(zr.kessel.y - 0.2) < 0.01 && Math.abs(zr.wagen.y - 0.75) < 0.01 && Math.abs(zr.flach.y + 1.61) < 0.01);
  await T('place', [-14, 1.5, -318], { settle: 30 });
  await shot('zug', 1200);
  // Seilbahn
  await T('place', marks.gondel, { settle: 20 });
  await T('play', [[{}, 6.5 * 120]]);
  const gd = await sc(() => { const g = window.__t.named('gondel'); return { u: g.u, floor: g.floorY }; });
  const pg = await T('info');
  console.log(`  Seilbahn: u ${f2(gd.u)}, Boden y ${f2(gd.floor)}, Figur y ${f2(pg.y)} (${pg.mode})`);
  check('Seilbahn: Gondel fährt mit der Figur bis zum Ziel', gd.u === 1 && Math.abs(pg.y - gd.floor) < 0.05);
  await shot('zirkus', 1200);
  // Endlos-Münzblock: in kurzer Folge treffen → Münzen; dann leer
  const c0 = await T('coins');
  await T('place', marks.endlos, { settle: 10 });
  for (let i = 0; i < 4; i++) await T('play', [[{ jump: true }, 12], [{}, 70]]);
  const c1 = await T('coins');
  await T('play', [[{}, 2 * 120]]);
  const used = await sc(() => window.__t.ent('endlos')?.used);
  console.log(`  Endlos-Münzblock: Münzen +${c1 - c0}, danach leer ${used}`);
  check('Endlos-Münzblock: gibt Münzen, solange man ihn in kurzer Folge trifft, danach leer', c1 - c0 >= 4 && used);
}

// ---------------------------------------------------------------- Unterwasser und Stimmungen
{
  // erzwungen (Thema snow ohne underwater): Gewicht steigt auf 1, Überlagerung sichtbar
  await sc(() => { window.__course.view.setUnderwater(true); window.__course.step(90); });
  await freshFrames(2);
  await sc(() => window.__course.step(90));
  await freshFrames(2);
  const u1 = await sc(() => ({ ...window.__course.view.mood.info(), overlay: !!window.__course.view.mood.overlay?.visible, fog: window.__course.view.three.fog.far }));
  await sc(() => { window.__course.view.setUnderwater('auto'); window.__course.step(90); });
  await freshFrames(2);
  await sc(() => window.__course.step(90));
  await freshFrames(2);
  const u2 = await sc(() => ({ ...window.__course.view.mood.info(), fog: window.__course.view.three.fog.far }));
  console.log(`  setUnderwater(true): ${JSON.stringify(u1)}; danach 'auto': ${JSON.stringify(u2)}`);
  check('view.setUnderwater(true) blendet die Unterwasser-Stimmung ein (naher Nebel, Lichtflecken), auto wieder aus', u1.water > 0.95 && u1.overlay && u1.fog < 60 && u2.water < 0.05 && u2.fog > 200);
}

// ---------------------------------------------------------------- Ziel, Kennzahlen
{
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 70], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel der Winterwerkstatt erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 140 Zeichenaufrufe in allen Bildern', stats.every((s) => s[1] < 140));
  check('Budget: < 400 k Dreiecke in allen Bildern', stats.every((s) => s[2] < 400000));
}
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);

// ---------------------------------------------------------------- Themen (Stimmung), je ein Bild
if (SHOTS) {
  const themes = [['snow', [0, 1, -20]], ['skyway', [-4, -3, -259]], ['ghost', [0, 1, -96]], ['plaza', [-2, -3, -338]], ['fortress', [0, 1, -38]],
    ['water', [0, 1, -144]], ['race', [0, 1, -196]], ['autumn', [3, 1, -38]], ['train', [-4, -3, -322]], ['circus', [10, -3, -325]], ['diorama', [0, 1, -10]]];
  const tstats = [];
  for (const [th, pos] of themes) {
    await load(`&theme=${th}`);
    await sc((p) => { const c = window.__course; for (const s of c.view.rig.sections) { s.pitch = Math.min(s.pitch, 24); s.dist = 15; } c.player.reset(p, Math.PI / 2); c.step(60); c.snapCamera(); }, pos);
    await page.waitForTimeout(1800);
    await freshFrames();
    const s = await sc(() => window.__course.stats());
    tstats.push([th, s.calls, s.triangles]);
    try { await page.screenshot({ path: `${OUT}w3b_thema_${th}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${th} übersprungen)`); }
    if (th === 'ghost') {
      const f0 = await sc(() => window.__course.view.three.fog.far);
      await sc(() => { window.__course.view.setMood('aussen'); window.__course.step(240); });
      await freshFrames(4);
      const m = await sc(() => ({ ...window.__course.view.mood.info(), fog: window.__course.view.three.fog.far }));
      console.log(`  Thema ghost: Nebel ${f0} → Stimmung aussen ${JSON.stringify(m)}`);
      check('Thema ghost: Stimmung „aussen“ (Außenhof bei Nacht) blendet über (weiterer Nebel, Mondlicht)', m.mood === 'aussen' && m.fog > f0 + 30);
      try { await page.screenshot({ path: `${OUT}w3b_thema_ghost_aussen.png`, timeout: 120000 }); } catch { /* weiter */ }
    }
    if (th === 'water') {
      // tauchen: Figur unter die Wasseroberfläche der Lagune → Unterwasser-Stimmung automatisch
      await sc(() => { const c = window.__course; c.setManual(true); c.player.reset([-1, -2.6, -164], Math.PI / 2); c.setInput({ crouch: true }); c.step(90); c.snapCamera(); });
      await freshFrames(4);
      const u = await sc(() => ({ ...window.__course.view.mood.info(), mode: window.__course.player.mode, under: window.__course.view.underwater }));
      console.log(`  Thema water, getaucht: ${JSON.stringify(u)}`);
      check('Thema water: Kopf unter Wasser → Unterwasser-Stimmung automatisch', u.mode === 'swim' && u.under);
      try { await page.screenshot({ path: `${OUT}w3b_unterwasser.png`, timeout: 120000 }); } catch { /* weiter */ }
      await sc(() => window.__course.setInput({}));
    }
  }
  console.log('  Themen (Zeichenaufrufe, Dreiecke): ' + tstats.map((s) => `${s[0]} ${s[1]}/${s[2]}`).join(', '));
  check('Themen snow/skyway/ghost/plaza/fortress/water/race/autumn/train (+ circus, diorama) laden ohne Fehler', errors.length === 0);
  check('Themen im Budget (< 140 Aufrufe)', tstats.every((s) => s[1] < 140));
  if (errors.length) for (const e of errors.slice(0, 10)) console.log('   ', e);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
