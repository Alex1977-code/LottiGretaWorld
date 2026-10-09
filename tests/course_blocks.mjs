// Kurs-Modus, Sonder-Bausteine (Welt 1) im Bausteinpark 0-2: je Baustein die Kernfunktion deterministisch über
// window.__course.step(n) und setInput prüfen; Sichtprüfung über Bilder tests/out/cb_*.png (Kurs-Kamera).
// Aufruf: PORT_BASE=1700 node tests/course_blocks.mjs   (vorher npm run build; nutzt vite preview)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4194;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.CB_SHOTS !== '0';

await page.goto(`http://localhost:${port}/?course=0-2&scale=2&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
} catch {
  console.log('Bausteinpark startet nicht. Konsole:');
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
    /** Figur setzen (Heldin Lotti, groß, ohne Power-up) und landen lassen. */
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
      if (o.power) p.setPower(o.power);
      p.invuln = o.invuln ?? 0;
      p.updateHalf();
      L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap(p);
      c.step(o.settle ?? 30);
      return p.info();
    },
    /** Eingaben abspielen: [[input, n], …]; liefert Spur [x, y, z, mode, state, script]. */
    play(segs, every = 1) {
      const tr = [];
      for (const [inp, n] of segs) {
        c.setInput(inp);
        for (let i = 0; i < n; i++) {
          c.step(1);
          const p = P();
          if (i % every === 0) tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state, p.script?.kind ?? p.script?.type ?? '']);
        }
      }
      c.setInput({});
      return tr;
    },
    info: () => P().info(),
    rt: () => L().runtime.info(),
    named: (id) => L().named.get(id),
    ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
    /** Sterne dieses Laufs zurücksetzen (jede Station prüft ihren eigenen Stern). */
    resetStars() { L().runtime.stars = L().runtime.stars.map(() => false); for (const e of L().entities) if (e.kind === 'star') e.kill(); },
    starsAlive: (index) => L().entities.filter((e) => e.kind === 'star' && e.index === index && e.alive && !e.hidden).map((e) => [e.pos.x, e.pos.y, e.pos.z]),
    /** Figur auf eine Stelle zulaufen lassen (Stick kamerabezogen), bis Bedingung oder max Schritte. */
    chase(target, max, run = true) {
      for (let i = 0; i < max; i++) {
        const p = P();
        const t = typeof target === 'function' ? target() : target;
        if (!t) return i;
        const dx = t[0] - p.pos.x, dz = t[2] - p.pos.z, l = Math.hypot(dx, dz) || 1;
        const cy = L().controlYaw, cs = Math.cos(cy), sn = Math.sin(cy);
        // Welt (dx, dz) → Stick: wx = c·mx − s·my, wz = −s·mx − c·my
        const mx = (cs * dx - sn * dz) / l, my = (-sn * dx - cs * dz) / l;
        c.setInput({ x: mx, y: my, run });
        c.step(1);
      }
      c.setInput({});
      return max;
    },
    coins: () => L().runtime.coins,
  };
});

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const marks = await sc(() => window.__t.marks);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const stats = [];
async function shot(name, wait = 1600) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  // Software-Rendering kann unter Last sehr langsam sein: Bild verpasst ≠ Fehler der Bausteine
  try { await page.screenshot({ path: `${OUT}cb_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}

console.log('Bausteinpark 0-2');
const st0 = await sc(() => window.__course.state());
const types = await sc(() => [...new Set(window.__course.level.entities.map((e) => e.kind))].sort());
console.log(`  ${st0.entities} Entitäten, Arten: ${types.join(', ')}`);
check('Level geladen (Sonder-Bausteine vorhanden)', ['bunny', 'chest', 'crate', 'endlessblock', 'itemtree', 'lantern', 'megacolumn', 'pixelegg', 'pow', 'pswitch', 'rouletteblock', 'spotter', 'starring', 'task', 'timering', 'warpbox'].every((k) => types.includes(k)));
check('Keine Konsolenfehler beim Laden', errors.length === 0);
await shot('start', 1500);

// ---------------------------------------------------------------- Glasröhre: Transport, Gabelung, Kanone
{
  const c0 = await T('coins');
  await T('place', marks.gp_in);
  let tr = await T('play', [[{ y: 1 }, 40], [{}, 160]]);
  const entered = tr.some((s) => s[5] === 'glasspipe');
  const mid = tr.find((s, i) => i > 70 && s[5] === 'glasspipe');
  tr = tr.concat(await T('play', [[{}, 200]]));
  const exitI = tr.findIndex((s, i) => i > 0 && tr[i - 1][5] === 'glasspipe' && s[5] !== 'glasspipe');
  const ex = tr[exitI] ?? tr[tr.length - 1];
  const c1 = await T('coins');
  console.log(`  Glasröhre: Eingang ${entered}, Mitte ${mid?.slice(0, 3)}, Ausgang ${ex.slice(0, 3)} (${ex[3]}), Münzen +${c1 - c0}`);
  check('Glasröhre: Figur gleitet hindurch und kommt am Hauptende heraus', entered && !!mid && exitI > 0 && dist(ex, marks.gp_out_main) < 1.5 && Math.abs(ex[1] - (marks.gp_out_main[1] - 0.475)) < 1);
  check('Glasröhre: Münzen im Rohr eingesammelt', c1 - c0 >= 4);
  const land = await T('info');
  check('Glasröhre: nach dem Austritt wieder normal unterwegs', land.mode === 'ground' && land.x > marks.gp_out_main[0]);
  // Gabelung: Stick nach links → Abzweig
  await T('place', marks.gp_in);
  tr = await T('play', [[{ y: 1 }, 40], [{ x: -1 }, 120], [{}, 150]]);
  const exB = tr.findIndex((s, i) => i > 0 && tr[i - 1][5] === 'glasspipe' && s[5] !== 'glasspipe');
  const eb = tr[exB] ?? tr[tr.length - 1];
  console.log(`  Gabelung (Stick links): Ausgang ${eb.slice(0, 3)}`);
  check('Glasröhre: an der Gabelung wählt der Stick den Abzweig', exB > 0 && dist(eb, marks.gp_out_branch) < 1.5);
  // Rückweg: am Abzweig-Ende hinein (beide Enden sind Eingänge) → Gabelung geradeaus = zurück zum Anfang
  await T('place', [marks.gp_out_branch[0], 1, marks.gp_out_branch[2] - 2.2], { yaw: -Math.PI / 2 });
  tr = await T('play', [[{ y: -1 }, 40], [{}, 220]]);
  const exR = tr.findIndex((s, i) => i > 0 && tr[i - 1][5] === 'glasspipe' && s[5] !== 'glasspipe');
  const er = tr[exR] ?? tr[tr.length - 1];
  console.log(`  Rückweg vom Abzweig: Ausgang ${er.slice(0, 3)}`);
  check('Glasröhre: Eingang an beiden Enden (Abzweig-Ende → Anfang)', exR > 0 && er[2] > -10 && Math.abs(er[0] - -8) < 1.5);
  // Bild: mitten in der Fahrt
  await T('place', marks.gp_in);
  await T('play', [[{ y: 1 }, 40], [{}, 75]]);
  await shot('glasroehre');
  // Kanone
  await T('place', marks.cannon_in);
  tr = await T('play', [[{ y: 1 }, 40], [{}, 150]]);
  await shot('kanone');
  tr = tr.concat(await T('play', [[{}, 260]]));
  const flying = tr.filter((s) => s[5] === 'glasspipe' && s[1] > 6).length;
  const fin = await T('info');
  console.log(`  Kanone: höchste y ${f2(Math.max(...tr.map((s) => s[1])))}, Landung ${fin.x}, ${fin.y}, ${fin.z} (${fin.mode})`);
  check('Glasrohr-Kanone: Flug im hohen Bogen, Landung genau am Ziel', flying > 10 && fin.mode === 'ground' && dist([fin.x, fin.y, fin.z], marks.cannon_target) < 0.4 && Math.abs(fin.y - marks.cannon_target[1]) < 0.05);
  // Spülrohr: ein Pilzling läuft hinein und kommt am anderen Ende heraus
  await T('place', [8, 1, -6]);
  await sc(() => { const e = window.__t.named('pz_flush'); e.pos.set(12, 1, -9); e.vel.set(0, 0, 0); e.dir.x = 0; e.dir.z = -1; e.state = 'walk'; });
  const pz = [];
  for (let i = 0; i < 8; i++) { await T('play', [[{}, 120]]); pz.push(await sc(() => { const e = window.__t.named('pz_flush'); return [+e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2), window.__course.level.entities.includes(e)]; })); }
  const inPipe = pz.some((q) => !q[3]);
  const outZ = pz[pz.length - 1][2];
  console.log(`  Spülrohr: Pilzling ${pz.map((q) => `${q[2]}${q[3] ? '' : '*'}`).join(' → ')}`);
  check('Glasröhre (optional): Gegner wird hindurchgespült', inPipe && outZ < -23 && pz[pz.length - 1][3]);
}

// ---------------------------------------------------------------- Kipp-Schaltfelder
{
  const tiles = await sc(() => window.__t.named('sw_a').tiles.map((t) => [t.x, t.y, t.z]));
  const before = await sc(() => window.__course.level.world.raycastDown(-6, 10, -57.5, 20)?.y ?? null);
  for (const [i, t] of tiles.entries()) {
    await T('place', [t[0], t[1] + 0.4, t[2]], { settle: 20 });
    if (i === 2) await shot('schaltfelder');
  }
  await T('play', [[{}, 120]]);
  const g = await sc(() => { const g = window.__t.named('sw_a'); return { done: g.done, count: g.count }; });
  const after = await sc(() => window.__course.level.world.raycastDown(-6, 10, -57.5, 20)?.y ?? null);
  console.log(`  Schaltfelder fest: ${g.count}/${tiles.length}, fertig ${g.done}; Weg-Teil vorher ${before}, nachher ${f2(after)}`);
  check('Kipp-Schaltfelder: alle an → Ereignis (Weg erscheint, fest)', g.done && g.count === tiles.length && (before === null || before < 2) && after > 5.5);
  // über den erschienenen Weg hinauf zur Truhe
  await T('place', [-6, 2.4, -50]);
  await T('play', [[{ y: 1, jump: true }, 30], [{ y: 1 }, 12], [{ y: 1, jump: true }, 30], [{ y: 1 }, 12], [{ y: 1, jump: true }, 30], [{ y: 1 }, 12], [{ y: 1, jump: true }, 30], [{ y: 1 }, 30]]);
  const top = await T('info');
  await shot('weg_erschienen');
  console.log(`  Weg hinauf: y ${top.y} z ${top.z}`);
  check('Erscheinender Weg ist begehbar (oben auf dem Sockel)', top.y > 5.9);
  // fahrende Wechselschalter: Felder fahren mit, Toggle, alle an → Stern + Plattform stürzt ab
  await T('resetStars');
  const tileAt = (i) => sc((k) => { const t = window.__t.named('sw_b').tiles[k]; return [t.x, t.y, t.z]; }, i);
  const p0 = await tileAt(0);
  await T('play', [[{}, 120]]);
  const p1 = await tileAt(0);
  const moved = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
  let t0 = await tileAt(0);
  await T('place', [t0[0], t0[1] + 0.4, t0[2]], { settle: 15 });
  const on1 = await sc(() => window.__t.named('sw_b').tiles[0].on);
  await T('play', [[{ jump: true }, 6], [{}, 140]]);
  const on2 = await sc(() => window.__t.named('sw_b').tiles[0].on);
  console.log(`  Wechselschalter: Felder fahren ${f2(moved)} m mit; Feld 0 nach Betreten ${on1}, nach erneutem Landen ${on2}`);
  check('Wechselschalter auf fahrender Plattform: Felder fahren mit, jedes Betreten schaltet um', moved > 1 && on1 === true && on2 === false);
  for (let i = 0; i < 4; i++) {
    if (await sc((k) => window.__t.named('sw_b').tiles[k].on, i)) continue;
    const t = await tileAt(i);
    await T('place', [t[0], t[1] + 0.4, t[2]], { settle: 15 });
  }
  await T('play', [[{}, 40]]);
  const gb = await sc(() => { const g = window.__t.named('sw_b'); return { done: g.done, count: g.count }; });
  const star0 = await T('starsAlive', 0);
  await T('play', [[{}, 120]]);
  const fp = await sc(() => { const f = window.__t.named('fp_s2'); return { state: f.state, y: f.y }; });
  console.log(`  Wechselschalter alle an: ${gb.count}/4 fertig ${gb.done}, Stern ${JSON.stringify(star0)}, Absturz-Plattform ${fp.state} y ${f2(fp.y)}`);
  check('Wechselschalter: alle an → Stern erscheint und Plattform stürzt ab (Signal drop)', gb.done && star0.length === 1 && (fp.state === 'fall' || fp.state === 'gone'));
}

// ---------------------------------------------------------------- Laternen
{
  const hid = () => sc(() => window.__t.ents('coin').filter((e) => e.hiddenUntilLit).map((e) => (e.hidden ? 1 : 0)));
  const h0 = await hid();
  await T('place', marks.lantern1);
  await T('play', [[{ y: 1 }, 30], [{}, 10]]);
  const lit = await sc(() => window.__t.named('lant1').lit);
  const h1 = await hid();
  const c0 = await T('coins');
  await T('place', [-2, 1, -80]);
  await T('play', [[{ x: 1 }, 70]]);
  const c1 = await T('coins');
  console.log(`  Laterne: versteckt vorher ${h0.reduce((a, b) => a + b, 0)}/${h0.length}, an ${lit}, danach versteckt ${h1.reduce((a, b) => a + b, 0)}; Münzen eingesammelt +${c1 - c0}`);
  check('Laterne: Anfassen zündet sie an und zeigt versteckte Münzen im Radius', lit && h0.every((v) => v === 1) && h1.reduce((a, b) => a + b, 0) === h0.length - 5 && c1 - c0 >= 3);
  await shot('laterne');
  // hängende Laterne mit Brenndauer: anspringen, Münzen erscheinen, nach 8 s wieder weg
  await T('place', [5, 1, -83.4]);
  await T('play', [[{ jump: true }, 50], [{}, 30]]);
  const lit2 = await sc(() => window.__t.named('lant2').lit);
  const ring = () => sc(() => window.__t.ents('coin').filter((e) => e.hiddenUntilLit && Math.hypot(e.pos.x - 5, e.pos.z + 86.5) < 2).map((e) => e.hidden));
  const r1 = await ring();
  await T('play', [[{}, 1000]]);
  const r2 = await ring();
  console.log(`  Hängende Laterne: an ${lit2}, Münzen sichtbar ${r1.filter((v) => !v).length}/${r1.length}, nach 8 s versteckt ${r2.filter((v) => v).length}`);
  check('Hängende Laterne mit Brenndauer: Münzen erscheinen und verschwinden wieder', lit2 && r1.length === 6 && r1.every((v) => !v) && r2.every((v) => v));
}

// ---------------------------------------------------------------- Unsichtbare Blockkette
{
  const shown = () => sc(() => window.__t.named('chain').shown);
  const solidAt = (x, y, z) => sc(([a, b, d]) => window.__course.level.world.raycastDown(a, b, d, 1.5)?.y ?? null, [x, y, z]);
  const s0 = await shown();
  const b1Before = await solidAt(-1, 4.5, -98);
  await T('place', marks.chain_lead);
  const s1 = await shown();
  const b1 = await solidAt(-1, 4.5, -98);
  const b2Before = await solidAt(1.5, 6.5, -98);
  // Block 1 betreten → Block 2 erscheint; Block 2 betreten → Block 3
  await T('place', [-1, 4.2, -98]);
  const onB1 = await T('info');
  const s2 = await shown();
  await T('place', [1.5, 6.2, -98]);
  const s3 = await shown();
  await shot('blockkette');
  // von Block 3 hinüber auf den Sims (Sprung), dort den Stempel holen
  await T('place', [4, 8.2, -98]);
  await T('play', [[{ x: 1, jump: true }, 30], [{ jump: true }, 40], [{}, 50], [{ x: 1 }, 30], [{}, 20]]);
  const end = await T('info');
  const stamp = await sc(() => window.__course.level.runtime.stamp);
  console.log(`  Blockkette: gezeigt ${s0} → ${s1} → ${s2} → ${s3}; Block 1 fest ${b1Before} → ${b1}, Block 2 vorher ${b2Before}; auf Block 1 y ${onB1.y}; Sims y ${end.y}, Stempel ${stamp}`);
  check('Unsichtbare Blockkette: jeder Block erscheint erst nach dem vorigen', s0 === 0 && s1 === 1 && b1Before === null && Math.abs(b1 - 4) < 0.01 && b2Before === null && s2 === 2 && s3 === 3 && Math.abs(onB1.y - 4) < 0.05);
  check('Blockkette führt zum Sims mit dem Stempel', end.y > 7.9 && stamp);
}

// ---------------------------------------------------------------- Kristallblöcke / versteckter Raum
{
  const cr = () => sc(() => window.__t.ents('crystal').filter((e) => Math.abs(e.pos.z + 116) < 2).length);
  const n0 = await cr();
  await T('place', [0, 5.2, -116], { settle: 20 });
  const onTop = await T('info');
  await T('play', [[{ jump: true }, 30], [{ crouch: true }, 1], [{}, 150]]);
  const n1 = await cr();
  const inside = await T('info');
  console.log(`  Kristall-Luke: Blöcke ${n0} → ${n1}, oben y ${onTop.y}, danach y ${inside.y} (${inside.mode})`);
  check('Kristallblöcke: Stampfen öffnet ein Loch → Figur fällt in den Raum darunter', n0 === 4 && n1 < n0 && onTop.y > 4.9 && inside.y < 1.2 && inside.mode === 'ground');
  await shot('kristallraum');
}

// ---------------------------------------------------------------- Warp-Box hin und zurück, Rätselbox mit Aufgabe
{
  await T('place', marks.wb1, { settle: 10 });
  let tr = await T('play', [[{}, 200]]);
  const there = await T('info');
  console.log(`  Warp-Box: hin → ${there.x}, ${there.y}, ${there.z} (${there.mode})`);
  check('Warp-Box: Hineinspringen teleportiert in den Unterbereich', Math.abs(there.x - 80) < 1 && Math.abs(there.z + 128) < 1 && there.mode === 'ground');
  await shot('warpraum');
  // erst absteigen, dann zurück
  await T('play', [[{ y: -1 }, 40], [{}, 30]]);
  const stillThere = await T('info');
  await T('place', [80, 2.4, -128], { settle: 10 });
  tr = await T('play', [[{}, 200]]);
  const back = await T('info');
  console.log(`  Warp-Box: zurück → ${back.x}, ${back.y}, ${back.z}`);
  check('Warp-Box: Ankunft löst nicht sofort aus; Rückweg in die Ausgangsbox', Math.abs(stillThere.x - 80) < 3 && Math.abs(back.x + 5) < 1 && Math.abs(back.z + 132) < 1);
  // Rätselbox: Aufgabe „alle Gegner besiegen“ → Stern
  await T('resetStars');
  await T('place', marks.rb1, { settle: 10 });
  await T('play', [[{}, 200]]);
  const inRoom = await T('info');
  await shot('raetselbox');
  const taskState0 = await sc(() => window.__course.level.entities.find((e) => e.kind === 'task').state);
  const stomp = async (id) => {
    for (let k = 0; k < 3; k++) {
      const e = await sc((i) => { const e = window.__t.named(i); return e.alive ? [e.pos.x, e.pos.y, e.pos.z] : null; }, id);
      if (!e) return;
      await T('place', [e[0], e[1] + 1.6, e[2]], { settle: 1 });
      await T('play', [[{}, 40]]);
    }
  };
  await stomp('pz_room1');
  await stomp('pz_room2');
  await T('play', [[{}, 120]]);
  const task = await sc(() => window.__course.level.entities.find((e) => e.kind === 'task').state);
  const star1 = await T('starsAlive', 1);
  console.log(`  Rätselbox: im Raum ${inRoom.x}, ${inRoom.z}; Aufgabe ${taskState0} → ${task}; Stern ${JSON.stringify(star1)}`);
  check('Rätselbox: Raum erreicht, alle Gegner besiegt → Stern erscheint', Math.abs(inRoom.x - 110) < 1 && taskState0 === 'active' && task === 'done' && star1.length === 1);
  await shot('raetselbox_stern');
}

// ---------------------------------------------------------------- POW-Block
{
  const before = await sc(() => ({ en: ['pz_pow1', 'pz_pow2'].map((i) => window.__t.named(i).state), bricks: window.__t.ents('brick').length }));
  await T('place', [2, 3.2, -148], { settle: 1 });
  await T('play', [[{}, 40]]);
  await shot('pow', 200);
  await T('play', [[{}, 100]]);
  const after = await sc(() => ({ en: ['pz_pow1', 'pz_pow2'].map((i) => { const e = window.__t.named(i); return e.removed ? 'weg' : e.state; }), bricks: window.__t.ents('brick').length, uses: window.__t.named('pow1').uses }));
  console.log(`  POW: Gegner ${before.en} → ${after.en}, Ziegel ${before.bricks} → ${after.bricks}, Benutzungen übrig ${after.uses}`);
  check('POW-Block: besiegt Gegner am Boden im Umkreis', before.en.every((s) => s === 'walk' || s === 'idle') && after.en.every((s) => s !== 'walk' && s !== 'idle'));
  check('POW-Block: zerstört Ziegel im Umkreis (legt die Röhre frei), 3 Benutzungen', before.bricks >= 4 && after.bricks === before.bricks - 4 && after.uses === 2);
  // freigelegte Röhre → Druckschalter-Raum
  await T('place', marks.pow_pipe, { settle: 20 });
  await T('play', [[{ crouch: true }, 2], [{}, 220]]);
  const ps = await T('info');
  console.log(`  Röhre unter den Ziegeln → ${ps.x}, ${ps.y}, ${ps.z}`);
  check('Freigelegte Röhre führt in den Druckschalter-Raum', Math.abs(ps.x - 135) < 1.5 && Math.abs(ps.z + 144) < 1.5);
}

// ---------------------------------------------------------------- Druckschalter (P-Schalter)
{
  await T('resetStars');
  await T('place', [140, 2.4, -150], { settle: 1 });
  await T('play', [[{}, 30]]);
  const st = await sc(() => { const e = window.__t.named('ps1'); return { state: e.state, coins: window.__t.ents('bluecoin').length }; });
  await shot('druckschalter');
  const spots = await sc(() => window.__t.ents('bluecoin').map((e) => [e.pos.x, e.pos.y, e.pos.z]));
  for (const s of spots) { await T('place', [s[0], s[1] - 0.2, s[2]], { settle: 4 }); }
  await T('play', [[{}, 30]]);
  const done = await sc(() => window.__t.named('ps1').state);
  const star0 = await T('starsAlive', 0);
  console.log(`  Druckschalter: ${st.state}, blaue Münzen ${st.coins}; danach ${done}, Stern ${JSON.stringify(star0)}`);
  check('Druckschalter: Draufspringen → blaue Münzen; alle eingesammelt → Stern', st.state === 'active' && st.coins === 8 && done === 'done' && star0.length === 1);
}

// ---------------------------------------------------------------- Wolken, Wolkenkanone → Münzhimmel
{
  // Einweg-Wolke: von unten durchspringen, oben landen
  await T('place', marks.cloud_low);
  await T('play', [[{ jump: true }, 60], [{}, 60]]);
  const onCloud = await T('info');
  console.log(`  Wolke: gelandet y ${onCloud.y} z ${onCloud.z}`);
  check('Wolke (Einweg): von unten durchspringen, oben stehen', onCloud.mode === 'ground' && Math.abs(onCloud.y - 3.6) < 0.05);
  // fahrende Wolke trägt die Figur
  const cm0 = await sc(() => window.__t.named('cloud_mov').pm.pos.x);
  await T('place', [cm0, 3.9, -175.5], { settle: 10 });
  const ride = [];
  for (let i = 0; i < 6; i++) { await T('play', [[{}, 40]]); ride.push(await sc(() => [window.__t.named('cloud_mov').pm.pos.x, window.__course.player.pos.x, window.__course.player.mode])); }
  const span = Math.max(...ride.map((r) => r[0])) - Math.min(...ride.map((r) => r[0]));
  console.log(`  Fahrende Wolke: ${ride.map((r) => `${f2(r[0])}/${f2(r[1])}`).join(' ')}`);
  check('Fahrende Wolke trägt die Figur', ride.every((r) => r[2] === 'ground' && Math.abs(r[0] - r[1]) < 0.3) && span > 1);
  // Wolkenkanone
  const c0 = await T('coins');
  await T('place', [8, 4.2, -160], { settle: 1 });
  let tr = await T('play', [[{}, 120]]);
  await shot('wolkenkanone', 300);
  tr = tr.concat(await T('play', [[{}, 260]]));
  const sky = await T('info');
  console.log(`  Wolkenkanone: höchste y ${f2(Math.max(...tr.map((s) => s[1])))}, Landung ${sky.x}, ${sky.y}, ${sky.z} (${sky.mode})`);
  check('Wolkenkanone schießt in den Münzhimmel (Landung auf der Wolke)', sky.mode === 'ground' && dist([sky.x, sky.y, sky.z], marks.sky) < 0.5 && sky.y > 39.5);
  await shot('muenzhimmel');
  await T('play', [[{ y: 1 }, 110], [{}, 30]]);
  const c1 = await T('coins');
  console.log(`  Münzhimmel: +${c1 - c0} Münzen`);
  check('Münzhimmel: Münzen einsammeln', c1 - c0 >= 5);
}

// ---------------------------------------------------------------- Sternenring, Zeitring
{
  await T('resetStars');
  await T('place', [-5, 1, -198.6]);
  await T('play', [[{ y: 1 }, 45], [{}, 5]]);
  const st = await sc(() => ({ s: window.__t.named('ring1').state, n: window.__t.ents('starcoin').length }));
  await T('play', [[{ y: 1 }, 30], [{}, 10]]);
  await shot('sternenring');
  const spots = await sc(() => window.__t.ents('starcoin').map((e) => [e.pos.x, e.pos.y, e.pos.z]));
  for (const s of spots) await T('place', [s[0], 1, s[2]], { settle: 6 });
  await T('play', [[{}, 30]]);
  const done = await sc(() => window.__t.named('ring1').state);
  const star2 = await T('starsAlive', 2);
  console.log(`  Sternenring: ${st.s}, Sternmünzen ${st.n} → Ring ${done}, Stern ${JSON.stringify(star2)}`);
  check('Sternenring: Durchlaufen → 8 Sternmünzen; alle gesammelt → grüner Stern', st.s === 'active' && st.n === 8 && done === 'done' && star2.length === 1);
  // Zeitring: Zeit läuft ab → Münzen weg, Ring wieder bereit; zweiter Versuch gelingt
  await T('place', [5, 1, -198.6]);
  await T('play', [[{ y: 1 }, 45], [{}, 5]]);
  const a = await sc(() => ({ s: window.__t.named('ring2').state, n: window.__t.ents('bluecoin').length }));
  await T('play', [[{}, 1220]]);
  const b = await sc(() => ({ s: window.__t.named('ring2').state, n: window.__t.ents('bluecoin').length }));
  await T('place', [5, 1, -198.6]);
  await T('play', [[{ y: 1 }, 45], [{}, 130]]);
  const spots2 = await sc(() => window.__t.ents('bluecoin').map((e) => [e.pos.x, e.pos.y, e.pos.z]));
  for (const s of spots2) await T('place', [s[0], 1, s[2]], { settle: 6 });
  await T('play', [[{}, 30]]);
  const c = await sc(() => ({ s: window.__t.named('ring2').state, oneup: window.__t.ents('powerup').filter((e) => e.power === 'oneup' && Math.abs(e.pos.z + 201) < 3).length }));
  console.log(`  Zeitring: ${a.s} (${a.n} Münzen) → nach 10 s ${b.s} (${b.n}) → 2. Versuch ${c.s}, 1-Up ${c.oneup}`);
  check('Zeitring: blaue Münzen für 10 s, danach verschwunden; neuer Versuch → Belohnung', a.s === 'active' && a.n === 8 && b.s === 'idle' && b.n === 0 && c.s === 'done' && c.oneup === 1);
}

// ---------------------------------------------------------------- Fang-Hasen
{
  await T('resetStars');
  await T('place', [-5, 1, -219.5]);
  const b0 = await sc(() => { const b = window.__t.named('bunny1'); return [b.pos.x, b.pos.z]; });
  await T('play', [[{ y: 1 }, 30]]);
  const fled = await sc(() => { const b = window.__t.named('bunny1'); return { s: b.state, p: [b.pos.x, b.pos.z] }; });
  await shot('hase', 300);
  await sc(() => {
    window.__t.chaseBunny = (id, max) => window.__t.chase(() => { const b = window.__t.named(id); return b.state === 'caught' || b.removed ? null : [b.pos.x, b.pos.y, b.pos.z]; }, max);
  });
  const n = await sc(() => window.__t.chaseBunny('bunny1', 1800));
  await T('play', [[{}, 60]]);
  const caught = await sc(() => { const b = window.__t.named('bunny1'); return b.state === 'caught' || b.removed; });
  const inArea = await sc(() => { const b = window.__t.named('bunny1'); return Math.hypot(b.pos.x + 5, b.pos.z + 226); });
  const star1 = await T('starsAlive', 1);
  console.log(`  Hase: Start ${b0}, flieht ${fled.s} → ${fled.p.map(f2)}; gefangen nach ${n} Schritten (${caught}), Abstand zur Bereichsmitte ${f2(inArea)}, Stern ${JSON.stringify(star1)}`);
  check('Fang-Hase: flieht, bleibt im Bereich, fangen → Stern', fled.s === 'flee' && caught && n < 1800 && inArea < 6.6 && star1.length === 1);
  await T('place', [6, 1, -223]);
  const n2 = await sc(() => window.__t.chaseBunny('bunny2', 1800));
  await T('play', [[{}, 60]]);
  const big = await sc(() => window.__t.ents('powerup').filter((e) => e.power === 'riese' && Math.abs(e.pos.z + 229) < 7).length + (window.__course.player.power === 'riese' ? 1 : 0));
  console.log(`  Großer Hase: gefangen nach ${n2} Schritten, Riesentrank ${big}`);
  check('Großer Hase: fangen → Riesentrank', n2 < 1800 && big === 1);
  await T('place', [0, 1, -236]);
}

// ---------------------------------------------------------------- Endlos-Block, Roulette-Block
{
  const c0 = await T('coins');
  await T('place', [-3, 1, -245]);
  for (let i = 0; i < 4; i++) await T('play', [[{ jump: true }, 12], [{}, 45]]);
  const mid = await sc(() => ({ used: window.__t.named('endless').used, count: window.__t.named('endless').count }));
  await T('play', [[{}, 200]]);
  const end = await sc(() => window.__t.named('endless').used);
  await T('play', [[{ jump: true }, 12], [{}, 45]]);
  const c1 = await T('coins');
  console.log(`  Endlos-Block: ${mid.count} Münzen in Folge (benutzt ${mid.used}), nach Pause benutzt ${end}, Münzen +${c1 - c0}`);
  check('Endlos-Münzblock: Münzen solange in kurzer Folge getroffen, dann leer', mid.count === 4 && !mid.used && end && c1 - c0 === 4);
  await T('place', [3, 1, -245]);
  await T('play', [[{ jump: true }, 6]]);
  const want = await sc(() => { const r = window.__t.named('roulette'); return r.contents[r.current].power; });
  await T('play', [[{ jump: true }, 6], [{}, 120]]);
  const got = await sc(() => window.__t.ents('powerup').filter((e) => Math.abs(e.pos.z + 245) < 3 && Math.abs(e.pos.x - 3) < 4).map((e) => e.power));
  const used = await sc(() => window.__t.named('roulette').used);
  await shot('bloecke');
  console.log(`  Roulette-Block: gezeigt ${want} beim Absprung, erhalten ${got}, leer ${used}`);
  check('Roulette-Block: Inhalt wechselt im Takt, Treffer gibt den gezeigten Inhalt', used && got.length === 1 && ['wachstumsbeere', 'krallen', 'funken', 'stern'].includes(got[0]));
  const cyc = await sc(() => { const r = window.__t.named('roulette'); const L = window.__course.level; const t0 = L.time; const out = []; for (let i = 0; i < 4; i++) { L.time = t0 + i * 0.5; out.push(r.current); } L.time = t0; return out; });
  check('Roulette-Block: Takt 0,5 s durchläuft alle Inhalte', new Set(cyc).size === 4);
}

// ---------------------------------------------------------------- Fallende Plattform
{
  const fpY = () => sc(() => { const s = window.__course.level.world.raycastDown(0, 3, -263, 4); return s ? s.y : null; });
  const y0 = await fpY();
  await T('place', marks.fall1, { settle: 10 });
  await T('play', [[{}, 80]]);
  const y1 = await fpY();
  await shot('fallplattform', 300);
  await T('play', [[{}, 60]]);
  const y2 = await sc(() => window.__course.player.pos.y);
  await T('place', [0, 1, -256]);
  await T('play', [[{}, 260]]);
  const gone = await fpY();
  await T('play', [[{}, 200]]);
  const y3 = await fpY();
  console.log(`  Fallende Plattform: Oberseite ${y0} → nach 0,67 s ${y1} → Figur fällt mit (y ${f2(y2)}) → weg ${gone} → nach 4 s ${y3}`);
  check('Fallende Plattform: wackelt 0,8 s, fällt (trägt die Figur), erscheint nach 4 s wieder', Math.abs(y0 - 1.5) < 0.01 && Math.abs(y1 - 1.5) < 0.01 && y2 < 0.5 && gone === null && Math.abs(y3 - 1.5) < 0.01);
}

// ---------------------------------------------------------------- Krallenrad
{
  const px = () => sc(() => window.__course.level.world.raycastDown(3.5, 6, -298, 3)?.y ?? null);
  const before = await px();
  await T('place', [0, 1, -296.6], { power: 'krallen' });
  await T('play', [[{ y: 1 }, 20], [{ y: 1, jump: true }, 10], [{ y: 1 }, 140], [{}, 60]]);
  const w = await sc(() => window.__t.named('wheel').progress);
  const after = await px();
  await shot('krallenrad', 300);
  await T('place', [0, 1, -296.6], { power: 'none' });
  console.log(`  Krallenrad: Fortschritt ${f2(w)}, Plattform bei x 3,5: ${before} → ${after}`);
  check('Krallenrad: Hochklettern dreht das Rad → Plattformen fahren aus', w > 0.95 && before === null && Math.abs(after - 4.5) < 0.05);
  // ohne Krallen: nichts bewegt sich
  const p0 = await sc(() => window.__t.named('wheel').progress);
  await T('play', [[{ y: 1 }, 20], [{ y: 1, jump: true }, 10], [{ y: 1 }, 100]]);
  const p1 = await sc(() => window.__t.named('wheel').progress);
  check('Krallenrad: ohne Krallen-Anzug kein Fortschritt', p1 === p0);
}

// ---------------------------------------------------------------- Graue Blockwand
{
  const cols = () => sc(() => window.__t.ents('megacolumn').length);
  const n0 = await cols();
  // Stampfen von oben und Tatzenhieb: nichts
  await T('place', [0, 6, -316], { settle: 1 });
  await T('play', [[{ crouch: true }, 1], [{}, 100]]);
  await T('place', marks.megawall, { power: 'krallen' });
  await T('play', [[{ y: 1 }, 15], [{ action: true }, 2], [{}, 40]]);
  const n1 = await cols();
  // Bombe (wie die Kickbombe des Gegner-Agenten): level.attackArea(pos, r, 'bomb')
  await sc(() => window.__course.level.attackArea({ x: -2, y: 1, z: -315.4 }, 1.6, 'bomb'));
  await T('play', [[{}, 5]]);
  const n2 = await cols();
  await shot('blockwand', 300);
  // Riesentrank: hindurchlaufen
  await T('place', marks.megawall, { power: 'riese' });
  await T('play', [[{ y: 1 }, 80]]);
  const n3 = await cols();
  const pz = await T('info');
  await T('place', marks.megawall, { power: 'none' });
  console.log(`  Blockwand: Spalten ${n0} → Stampfen/Krallen ${n1} → Bombe ${n2} → Riesentrank ${n3} (Figur z ${pz.z})`);
  check('Graue Blockwand: Stampfen und Krallen wirkungslos', n0 === 6 && n1 === 6);
  check('Graue Blockwand: Bombe sprengt Teile im Radius, Riesentrank bricht hindurch', n2 > 0 && n2 < 6 && n3 < n2 && pz.z < -317);
}

// ---------------------------------------------------------------- Kobold, Pixel-Ei
{
  await T('place', [-3, 1, -331]);
  await T('play', [[{}, 120]]);
  const sp = await sc(() => window.__t.ents('spotter').map((e) => ({ anim: e.anim, yaw: +e.yaw.toFixed(2), x: e.pos.x })));
  console.log(`  Kobolde: ${JSON.stringify(sp)}`);
  check('Kobold mit Fernglas: schaut der Figur nach', sp.length === 2 && sp.every((s) => s.anim === 'look' || s.anim === 'cheer') && Math.abs(sp.find((s) => s.x < 0).yaw) < 0.6);
  const c0 = await T('coins');
  await T('place', marks.egg);
  await T('play', [[{}, 300]]);
  const early = await sc(() => window.__t.named('egg').shown);
  await T('play', [[{}, 260]]);
  const egg = await sc(() => window.__t.named('egg').shown);
  const c1 = await T('coins');
  await T('play', [[{}, 150]]);
  await shot('pixelei');
  console.log(`  Pixel-Ei: nach 2,5 s ${early}, nach 4,7 s ${egg}, Münzen +${c1 - c0}`);
  check('Easter-Egg-Pixelfigur erscheint erst nach Warten (4 s)', !early && egg && c1 - c0 === 10);
}

// ---------------------------------------------------------------- Kisten, Truhe, Baum
{
  const c0 = await T('coins');
  await T('place', [-5, 3.2, -344], { settle: 1 });
  await T('play', [[{}, 6], [{ crouch: true }, 1], [{}, 80]]);
  const crate1 = await sc(() => window.__t.named('crate1').removed || !window.__t.named('crate1').alive);
  const c1 = await T('coins');
  // Tatzenhieb gegen eine Kiste
  const n0 = await sc(() => window.__t.ents('crate').filter((e) => e.pos.z < -340).length);
  const fell = await sc(() => window.__t.ents('crate').filter((e) => e.pos.z < -340).map((e) => +e.pos.y.toFixed(2)));
  await T('place', [-2.6, 1, -344], { power: 'krallen', yaw: Math.PI });
  await T('play', [[{ action: true }, 2], [{}, 30]]);
  const n1 = await sc(() => window.__t.ents('crate').filter((e) => e.pos.z < -340).length);
  console.log(`  Kisten übrig nach dem Stampfen: Höhen ${fell}`);
  await T('place', [-2.6, 1, -340], { power: 'none' });
  console.log(`  Kisten: Stampfen ${crate1} (+${c1 - c0} Münzen), Tatzenhieb ${n0} → ${n1}`);
  check('Holzkiste: Stampfen zerbricht sie, Inhalt erscheint', crate1 && c1 - c0 === 3);
  check('Holzkiste: Tatzenhieb zerbricht sie', n1 < n0);
  // Truhe
  const c2 = await T('coins');
  await T('place', marks.chest1);
  await T('play', [[{ y: 1 }, 30], [{}, 60]]);
  const open = await sc(() => window.__t.named('chest1').open);
  const c3 = await T('coins');
  // Baum mit Krallen-Anzug
  await T('place', marks.tree1);
  await T('play', [[{ y: 1 }, 30], [{}, 120]]);
  const drop = await sc(() => window.__t.ents('powerup').filter((e) => e.power === 'krallen' && Math.abs(e.pos.z + 348) < 4).map((e) => +e.pos.y.toFixed(2)));
  if (await sc(() => window.__course.player.power === 'krallen')) drop.push(1);
  await shot('kisten_truhe_baum', 300);
  console.log(`  Truhe offen ${open} (+${c3 - c2}), Baum: Krallen-Anzug fällt auf y ${drop}`);
  check('Schatztruhe: Berühren öffnet, Inhalt springt heraus', open && c3 - c2 === 5);
  check('Baum mit Versteck: Berühren → Krallen-Anzug fällt herunter', drop.length === 1 && Math.abs(drop[0] - 1) < 0.05);
}

// ---------------------------------------------------------------- Fluss: Floß mit Pflaume (Reit-Level 1-4)
{
  const raft = () => sc(() => { const r = window.__t.named('floss'); return { x: +r.pos.x.toFixed(2), y: +r.pos.y.toFixed(2), z: +r.pos.z.toFixed(2), air: r.air, water: r.onWater, sp: +Math.hypot(r.vel.x, r.vel.z).toFixed(2), rider: !!r.rider }; });
  const c0 = await T('coins');
  await T('place', [-70, 1, -11.5]);
  await T('play', [[{ y: 1, jump: true }, 40], [{}, 10]]);
  for (let i = 0; i < 20 && (await T('info')).mode !== 'mount'; i++) await T('play', [[{}, 10]]);
  const on = await T('info');
  const r0 = await raft();
  await T('play', [[{}, 120]]);
  const r1 = await raft();
  console.log(`  Floß: aufgesessen ${on.mode}, treibt ${r0.z} → ${r1.z} (${r1.sp} m/s)`);
  check('Floß: aufspringen → Reiten (mount), Strömung trägt beide', on.mode === 'mount' && r1.rider && r0.z - r1.z > 3 && Math.abs(r1.sp - 4) < 0.6);
  // Temposchwelle und Schanze (neutraler Stick)
  let maxSp = 0, maxY = -99, air = false;
  for (let i = 0; i < 18; i++) {
    await T('play', [[{}, 20]]);
    const r = await raft();
    maxSp = Math.max(maxSp, r.sp); if (r.z < -33 && r.z > -42) { maxY = Math.max(maxY, r.y); air ||= r.air; }
    if (i === 12) await shot('fluss_schanze', 600);
  }
  console.log(`  Temposchwelle: bis ${maxSp} m/s; Schanze: in der Luft ${air}, höchste y ${maxY}`);
  check('Temposchwelle beschleunigt das Floß', maxSp > 8);
  check('Schanze im Fluss: Floß springt ab', air && maxY > 1.4);
  // Lenken nach rechts
  const a = await raft();
  await T('play', [[{ x: 1 }, 50], [{}, 10]]);
  const b = await raft();
  console.log(`  Lenken: x ${a.x} → ${b.x}`);
  check('Floß: Stick lenkt quer zur Strömung', b.x - a.x > 0.8);
  // Hüpfen im Sattel, Treffer im Sattel
  const y0 = (await T('info')).y;
  const tr = await T('play', [[{ jump: true }, 2], [{}, 40]]);
  const hop = Math.max(...tr.map((q) => q[1])) - y0;
  await sc(() => { const p = window.__course.player; p.invuln = 0; p.hurt({ pos: { x: p.pos.x + 1, y: p.pos.y, z: p.pos.z } }); });
  const hurt = await T('info');
  await sc(() => { const p = window.__course.player; p.big = true; p.updateHalf(); p.invuln = 0; });
  console.log(`  Hüpfer im Sattel ${f2(hop)} m (${tr.filter((q) => q[3] === 'mount').length}/${tr.length} im Sattel); Treffer: ${hurt.mode}, groß ${hurt.big}`);
  check('Floß: Sprung lässt Floß und Reiterin hüpfen', hop > 1 && tr.every((q) => q[3] === 'mount'));
  check('Treffer im Sattel: kleiner, bleibt aber sitzen', hurt.mode === 'mount' && !hurt.big);
  // weiter um die Kehren, den Wasserfall hinab, Absteigen am Strand
  let fell = false, low = 99, done = null;
  for (let i = 0; i < 70 && !done; i++) {
    await T('play', [[{}, 30]]);
    const r = await raft();
    if (r.air && r.y < 0) fell = true;
    low = Math.min(low, r.y);
    if (i === 30) await shot('fluss_kehre', 600);
    const p = await T('info');
    if (p.mode !== 'mount' && i > 2) done = p;
  }
  await T('play', [[{}, 90]]);
  const end = await T('info');
  const c1 = await T('coins');
  await shot('fluss_strand', 600);
  console.log(`  Wasserfall: Absturz ${fell}, tiefste y ${low}; Ende ${end.x}, ${end.y}, ${end.z} (${end.mode}); Münzen +${c1 - c0}`);
  check('Wasserfall: Floß stürzt mit der Reiterin hinab und fährt weiter', fell && low < -5);
  check('Strand: Absteigen, Figur steht an Land', !!done && end.mode === 'ground' && end.z < -84 && end.y > -5.2);
  check('Münzen beim Reiten eingesammelt', c1 - c0 >= 8);
  // Floß wartet ohne Reiterin; neu aufsitzen
  await T('place', [-58, 0.8, -50]);
  await sc(() => { const r = window.__t.named('floss'); r.goHome({ x: -58, y: 0.55, z: -53 }); });
  await T('place', [-58, 1.5, -53], { settle: 45 });
  const re = await T('info');
  await sc(() => window.__course.player.dismount(4.5, 8, 0));
  await T('play', [[{}, 150]]);
  const wait = await raft();
  console.log(`  Neu aufgesessen ${re.mode}; nach dem Absteigen wartet das Floß: ${wait.sp} m/s`);
  check('Floß: wartet ohne Reiterin, wieder aufsitzen möglich', re.mode === 'mount' && wait.sp < 0.6);
  // Neustart am Checkpoint beim Steg: Floß legt dort an
  await sc(() => { const c = window.__course; c.level.runtime.setCheckpoint([-70, 1.05, -9.5], Math.PI / 2); c.player.die('fall'); });
  await T('play', [[{}, 260]]);
  const home = await raft();
  await sc(() => { window.__course.level.runtime.checkpoint = null; });
  console.log(`  Nach Neustart: Floß bei ${home.x}, ${home.z}`);
  check('Neustart am Steg: Floß wartet am nächsten Flusspunkt', Math.abs(home.x + 70) < 0.5 && home.z > -14 && !home.rider);
}

// ---------------------------------------------------------------- Ziel erreichbar, Kennzahlen
{
  await T('place', marks.goal);
  await T('play', [[{ y: 1, run: true }, 60], [{ y: 1, run: true, jump: true }, 40], [{}, 400]]);
  const st = await sc(() => window.__course.level.runtime.status);
  check('Ziel des Bausteinparks erreichbar', st === 'done' || st === 'goal');
}
if (stats.length) {
  console.log('  Kennzahlen (Bild, Zeichenaufrufe, Dreiecke):');
  for (const s of stats) console.log(`    ${s[0].padEnd(18)} ${String(s[1]).padStart(4)} ${String(s[2]).padStart(8)}`);
  check('Budget: < 120 Zeichenaufrufe in allen Bildern', stats.every((s) => s[1] < 120));
}
check('Keine Konsolenfehler', errors.length === 0);

// Laterne im Thema Höhle (Punktlicht), eigener Seitenaufruf
if (SHOTS) {
  await page.goto(`http://localhost:${port}/?course=0-2&scale=2&adapt=0&theme=cave`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
  await sc(() => {
    const c = window.__course; c.setManual(true); c.level.muted = true;
    const p = c.player; p.reset([-3, 1, -76.6], Math.PI / 2); c.setInput({ y: 1 }); c.step(30); c.setInput({}); c.step(30);
    p.reset([1, 1, -78], Math.PI / 2); c.step(30);
  });
  const lit = await sc(() => window.__course.level.named.get('lant1').lit);
  await shot('laterne_hoehle', 2000);
  check('Laterne im Höhlen-Thema: leuchtet', lit);
}

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
