// Kurs-Modus: Level 0-0 laden und das Bewegungsset deterministisch prüfen (Simulation schrittweise über
// window.__course.step(n) mit Testeingaben setInput – unabhängig von der Bildrate des Headless-Browsers).
// Aufruf: PORT_BASE=1000 node tests/course.mjs
import { startServer, launchBrowser, makeChecker } from './helpers.mjs';

const PORT = 4192;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);

await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
} catch {
  console.log('Kurs-Level startet nicht. Konsole:');
  for (const x of errors) console.log('  ', x);
  stop(); process.exit(1);
}
await page.waitForTimeout(300);

// Hilfen in der Seite: Figur setzen, Eingaben abspielen, Spur aufzeichnen
await sc(() => {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  const P = () => c.player;
  window.__t = {
    marks: c.level.data.marks,
    /** Figur an einen Punkt setzen (Heldin, groß, ohne Power-up) und landen lassen. */
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setInput({});
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = o.big ?? true;
      p.power = o.power ?? 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = 0;
      c.level.runtime.status = 'play';
      c.level.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 40);
      return p.info();
    },
    /** segments: [[input, steps], …] → Spur [x, y, z, vx, vy, vz, mode, state] je Schritt. */
    play(segments) {
      const tr = [];
      for (const [inp, n] of segments) {
        c.setInput(inp);
        for (let i = 0; i < n; i++) {
          c.step(1);
          const p = P();
          tr.push([p.pos.x, p.pos.y, p.pos.z, p.vel.x, p.vel.y, p.vel.z, p.mode, p.state]);
        }
      }
      return tr;
    },
    /** Kettensprung: Sprung in der Luft gehalten, nach jeder Landung einen Schritt loslassen und erneut drücken. */
    chain(input, jumps, maxSteps = 1200) {
      const apex = [], kinds = [];
      let done = 0, inAir = false, cur = 0, base = P().pos.y, since = 1;
      for (let i = 0; i < maxSteps && done < jumps; i++) {
        const ground = P().mode === 'ground';
        const jump = inAir || (ground && since === 1);
        c.setInput({ ...input, jump });
        c.step(1);
        const q = P();
        if (q.mode === 'air') {
          if (!inAir) { inAir = true; kinds.push(q.state); cur = q.pos.y; }
          cur = Math.max(cur, q.pos.y);
        } else {
          if (inAir) { inAir = false; apex.push(cur - base); base = q.pos.y; done++; since = 0; }
          else since++;
        }
      }
      return { apex, kinds };
    },
    info: () => P().info(),
    rt: () => c.level.runtime.info(),
    ent: (kind) => c.level.entities.filter((e) => e.kind === kind).map((e) => ({ x: e.pos.x, y: e.pos.y, z: e.pos.z, state: e.state, alive: e.alive })),
  };
});

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const marks = await sc(() => window.__t.marks);
const apexOf = (tr, y0) => Math.max(...tr.map((s) => s[1])) - y0;

console.log('Kurs-Level 0-0');
const st0 = await sc(() => window.__course.state());
check('Level geladen (Entitäten, Formen, Figur)', st0.entities > 40 && (await sc(() => window.__course.world.count)) > 50 && st0.player.mode === 'ground');
check('Keine Konsolenfehler beim Laden', errors.length === 0);

// ---------------------------------------------------------------- Sprunghöhe nach Haltedauer
const lane = marks.lane;
await T('place', lane);
let tr = await T('play', [[{ jump: true }, 1], [{}, 120]]);
const tap = apexOf(tr, lane[1]);
await T('place', lane);
tr = await T('play', [[{ jump: true }, 80], [{}, 60]]);
const hold = apexOf(tr, lane[1]);
console.log(`  Sprung kurz ${f2(tap)} m, gehalten ${f2(hold)} m (Lotti ×1,08)`);
check('Sprunghöhe nach Haltedauer (kurz ≈ 2,5–3, gehalten ≈ 3,5–4)', tap > 2.3 && tap < 3.1 && hold > 3.4 && hold < 4.2 && hold - tap > 0.6);

// ---------------------------------------------------------------- Lotti höher als Greta, Greta weiter
await T('place', lane, { hero: 'greta' });
tr = await T('play', [[{ jump: true }, 80], [{}, 60]]);
const holdGreta = apexOf(tr, lane[1]);
console.log(`  Greta gehalten ${f2(holdGreta)} m`);
check('Lotti springt höher als Greta', hold > holdGreta + 0.15);

const runJump = async (hero) => {
  await T('place', lane, { hero });
  // anlaufen (Rennen, nach vorn), springen, Weite = Absprung bis Landung (gleiche Höhe)
  const t = await T('play', [[{ y: 1, run: true }, 110], [{ y: 1, run: true, jump: true }, 80], [{ y: 1, run: true }, 120]]);
  let z0 = null, z1 = null;
  for (let i = 1; i < t.length; i++) {
    if (z0 === null && t[i][6] === 'air' && t[i - 1][6] === 'ground') z0 = t[i - 1][2];
    if (z0 !== null && z1 === null && t[i][6] === 'ground' && t[i - 1][6] === 'air') z1 = t[i][2];
  }
  return z0 !== null && z1 !== null ? z0 - z1 : 0;
};
const wLotti = await runJump('lotti');
const wGreta = await runJump('greta');
console.log(`  Weite Renn-Sprung Lotti ${f2(wLotti)} m, Greta ${f2(wGreta)} m`);
check('Greta springt weiter als Lotti', wGreta > wLotti + 0.5 && wLotti > 6);

// ---------------------------------------------------------------- Dreifachsprung
await T('place', lane);
await T('play', [[{ y: 1 }, 60]]);
const tri = await T('chain', { y: 1, run: false }, 3);
console.log(`  Dreifachsprung ${tri.apex.map(f2).join(' / ')} m (${tri.kinds.join(', ')})`);
check('Dreifachsprung: Höhen steigend, dritter ≈ 5,5–6,5 m mit Salto', tri.apex.length === 3 && tri.apex[0] < tri.apex[1] && tri.apex[1] < tri.apex[2] && tri.apex[2] > 5.2 && tri.kinds[2] === 'jump3');

// ---------------------------------------------------------------- Rückwärtssalto
await T('place', [lane[0], lane[1], lane[2] - 12]);
tr = await T('play', [[{ crouch: true }, 10], [{ crouch: true, jump: true }, 1], [{ jump: true }, 150]]);
const bf = apexOf(tr, lane[1]);
const bfBack = tr[tr.length - 1][2] - (lane[2] - 12);
console.log(`  Rückwärtssalto ${f2(bf)} m hoch, ${f2(bfBack)} m zurück, Zustand ${tr[5][7]}`);
check('Rückwärtssalto ≈ 5 m hoch, kaum Weite (nach hinten)', bf > 4.7 && bf < 6 && bfBack > 0.5 && bfBack < 3.5 && tr.some((s) => s[7] === 'backflip'));

// ---------------------------------------------------------------- Seitwärtssalto (Umkehr aus dem Lauf)
await T('place', lane);
tr = await T('play', [[{ y: 1, run: true }, 70], [{ y: -1, run: true }, 4], [{ y: -1, jump: true }, 1], [{ y: -1, jump: true }, 150]]);
const sf = apexOf(tr, lane[1]);
console.log(`  Seitwärtssalto ${f2(sf)} m (${tr.some((s) => s[7] === 'skid') ? 'nach Schleudern' : 'ohne Schleudern'})`);
check('Seitwärtssalto nach Richtungswechsel ≈ 4,5–5,2 m', tr.some((s) => s[7] === 'sideflip') && sf > 4.3 && sf < 5.4);

// ---------------------------------------------------------------- Weitsprung
await T('place', lane);
tr = await T('play', [[{ y: 1, run: true }, 100], [{ y: 1, run: true, crouch: true }, 3], [{ y: 1, run: true, crouch: true, jump: true }, 1], [{ y: 1, run: true }, 120]]);
{
  let i0 = -1, i1 = -1;
  for (let i = 1; i < tr.length; i++) {
    if (i0 < 0 && tr[i][7] === 'longjump') i0 = i - 1;
    if (i0 >= 0 && i1 < 0 && tr[i][6] === 'ground') i1 = i;
  }
  const dist = i0 >= 0 && i1 >= 0 ? tr[i0][2] - tr[i1][2] : 0;
  const h = i0 >= 0 ? Math.max(...tr.slice(i0, i1).map((s) => s[1])) - lane[1] : 0;
  console.log(`  Weitsprung ${f2(dist)} m weit, ${f2(h)} m hoch`);
  check('Weitsprung ≈ 7 m weit und flach', dist > 6.2 && dist < 8.6 && h < 1.6);
}

// ---------------------------------------------------------------- Coyote-Zeit und Sprungpuffer
// Kante: linke Bahn endet bei z = −24 (dahinter Abgrund)
const edge = [lane[0], lane[1], -22.5];
const coyoteTry = async (delay) => {
  await T('place', edge);
  // laufen bis zur Kante (Modus air), dann delay Schritte warten, dann springen
  return sc(([d]) => {
    const c = window.__course, p = c.player;
    c.setInput({ y: 0.6 });
    let n = 0;
    while (p.mode === 'ground' && n++ < 400) c.step(1);
    for (let i = 0; i < d; i++) { c.setInput({ y: 0.6 }); c.step(1); }
    c.setInput({ y: 0.6, jump: true });
    c.step(1);
    const vy = p.vel.y;
    c.setInput({});
    return { vy, mode: p.mode };
  }, [delay]);
};
const co1 = await coyoteTry(6);   // 50 ms nach der Kante
const co2 = await coyoteTry(30);  // 250 ms nach der Kante
console.log(`  Coyote: 50 ms → vy ${f2(co1.vy)}, 250 ms → vy ${f2(co2.vy)}`);
check('Coyote-Zeit: kurz nach der Kante noch springen, später nicht', co1.vy > 8 && co2.vy < 0);

const buf = await sc(() => {
  const c = window.__course, p = c.player, t = window.__t;
  t.place([t.marks.lane[0], 4, 0]);
  // fallen; 0,08 s vor der Landung Sprung drücken (aus der Höhe vorausberechnet)
  c.setInput({});
  let n = 0;
  while (p.pos.y > 1 + 0.9 && n++ < 300) c.step(1);
  c.setInput({ jump: true });
  c.step(1);
  c.setInput({ jump: true });
  let landed = false, jumped = false;
  for (let i = 0; i < 30; i++) { c.step(1); if (p.mode === 'ground') landed = true; if (landed && p.vel.y > 5) { jumped = true; break; } if (p.mode === 'air' && p.vel.y > 5) { jumped = true; break; } }
  c.setInput({});
  return { jumped };
});
check('Sprungpuffer: kurz vor der Landung gedrückt → Sprung bei Landung', buf.jumped);

// ---------------------------------------------------------------- Wandrutschen und Wandsprung
await T('place', marks.wall);
tr = await T('play', [[{ x: -1, jump: true }, 30], [{ x: -1 }, 30]]);
const wallState = tr[tr.length - 1];
tr = await T('play', [[{ x: -1, jump: true }, 1], [{ x: 0 }, 20]]);
const wj = tr[3];
console.log(`  Wand: ${wallState[6]}/${wallState[7]}, nach Sprung vx ${f2(wj[3])} vy ${f2(wj[4])} (${wj[7]})`);
check('Wandrutschen an der Mauer', wallState[6] === 'wall' && wallState[7] === 'wallslide');
check('Wandsprung von der Wand weg', wj[7] === 'walljump' && wj[3] > 5 && wj[4] > 5);

// ---------------------------------------------------------------- Stampfattacke zerbricht Ziegel
const bricks0 = (await T('ent', 'brick')).length;
await T('place', marks.bricks);
tr = await T('play', [[{ jump: true }, 18], [{ crouch: true }, 2], [{}, 120]]);
const bricks1 = (await T('ent', 'brick')).length;
const pAfter = await T('info');
console.log(`  Ziegel ${bricks0} → ${bricks1}, Figur y ${f2(pAfter.y)} (${pAfter.state})`);
check('Stampfattacke zerbricht Ziegel (Figur fällt in die Kammer)', bricks1 < bricks0 && pAfter.y < 6 && tr.some((s) => s[7] === 'groundpound'));

// ---------------------------------------------------------------- Block von unten gibt Münze
const coins0 = (await T('rt')).coins;
await T('place', marks.block);
await T('play', [[{ jump: true }, 10], [{}, 80]]);
const coins1 = (await T('rt')).coins;
const usedBlocks = await sc(() => window.__course.level.entities.filter((e) => e.kind === 'used').length);
check('Block von unten gibt Münze und wird leer', coins1 === coins0 + 1 && usedBlocks >= 1);

// ---------------------------------------------------------------- Versteckter Block, Power-ups, Klein/Groß
const pw = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const hb = c.level.entities.find((e) => e.kind === 'hidden');
  const hx = hb.pos.x, hz = hb.pos.z;
  t.place([hx, 1, hz]);
  c.setInput({ jump: true }); c.step(12); c.setInput({}); c.step(80);
  const revealed = hb.kind === 'question' || hb.kind === 'used';
  const up = c.level.entities.find((e) => e.kind === 'powerup' && Math.abs(e.pos.x - hx) < 2 && Math.abs(e.pos.z - hz) < 2);
  const lives0 = c.level.runtime.lives;
  let gotLife = false;
  if (up) { t.place([up.pos.x, up.pos.y + 0.1, up.pos.z], { settle: 4 }); gotLife = c.level.runtime.lives === lives0 + 1; }
  // klein werden, Wachstumsbeere nehmen
  t.place(t.marks.lane);
  p.hurt({ pos: { x: p.pos.x + 1, z: p.pos.z } });
  const small = !p.big;
  c.step(200);
  const berry = c.level.spawn('powerup', { pos: [p.pos.x, p.pos.y, p.pos.z], power: 'wachstumsbeere' });
  c.step(3);
  const big = p.big && !berry.alive;
  // Krallen-Anzug aus dem ?-Block
  const kb = c.level.entities.find((e) => e.kind === 'question' && e.content?.power === 'krallen');
  t.place([kb.pos.x, 1, kb.pos.z]);
  c.setInput({ jump: true }); c.step(12); c.setInput({}); c.step(90);
  const suit = c.level.entities.find((e) => e.kind === 'powerup' && e.power === 'krallen');
  if (suit) t.place([suit.pos.x, suit.pos.y + 0.1, suit.pos.z], { settle: 4, power: 'none' });
  return { revealed, oneup: !!up && up.power === 'oneup', gotLife, small, big, suit: !!suit, power: p.power };
});
check('Versteckter Block erscheint von unten und gibt ein 1-Up', pw.revealed && pw.oneup && pw.gotLife);
check('Treffer macht klein, Wachstumsbeere wieder groß', pw.small && pw.big);
check('Krallen-Anzug aus dem ?-Block einsammeln', pw.suit && pw.power === 'krallen');

// ---------------------------------------------------------------- Figurwechsel zur Laufzeit
const swap = await sc(() => {
  const c = window.__course;
  c.setHero('greta'); c.step(2);
  const a = c.player.hero, ok = !!c.rig.avatar && c.rig.key === 'greta';
  c.setHero('lotti');
  return { a, ok };
});
check('Figurwechsel Lotti ↔ Greta zur Laufzeit', swap.a === 'greta');

// ---------------------------------------------------------------- Rampe, sanfter Hügel, Einweg-Wolke
const geo = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  t.place([-8, 1, -75.3]);
  c.setInput({ y: 1 }); c.step(150); c.setInput({});
  const ramp = { y: p.pos.y, z: p.pos.z, mode: p.mode };
  t.place([5.5, 1, 4.6]);
  let top = 0;
  c.setInput({ y: 1 });
  for (let i = 0; i < 120; i++) { c.step(1); if (p.mode === 'ground') top = Math.max(top, p.pos.y); if (p.pos.z < 1) break; }
  c.setInput({});
  // Einweg-Wolke: von unten durch, oben landen
  const cl = [...c.world.shapes.values()].find((s) => s.oneWay);
  t.place([(cl.x0 + cl.x1) / 2, cl.bot - 0.9, (cl.z0 + cl.z1) / 2], { settle: 0 });
  p.vel.y = 11; p.mode = 'air'; p.enterAir('jump', false);
  let passed = false;
  for (let i = 0; i < 160; i++) { c.step(1); if (p.pos.y > cl.top + 0.2) passed = true; if (passed && p.mode === 'ground') break; }
  return { ramp, mound: top, cloud: { passed, y: p.pos.y, top: cl.top, mode: p.mode } };
});
console.log(`  Rampe: y ${f2(geo.ramp.y)} (${geo.ramp.mode}), Hügel höchste y ${f2(geo.mound)}, Wolke: durch=${geo.cloud.passed} y ${f2(geo.cloud.y)}`);
check('Rampe hinauf auf den Sockel (ohne Springen)', geo.ramp.mode === 'ground' && geo.ramp.y > 2.9);
check('Sanfter Hügel ohne Springen begehbar', geo.mound > 1.7);
check('Einweg-Wolke: von unten durchspringen, oben landen', geo.cloud.passed && geo.cloud.mode === 'ground' && Math.abs(geo.cloud.y - geo.cloud.top) < 0.02);

// ---------------------------------------------------------------- Drehscheibe dreht die Figur mit
const turn = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player;
  const tt = [...c.world.shapes.values()].find((s) => s.mover && s.type === 'cyl');
  t.place([tt.x + 1.1, tt.top + 0.05, tt.z], { settle: 10 });
  const a0 = Math.atan2(p.pos.z - tt.z, p.pos.x - tt.x), y0 = p.yaw;
  c.setInput({}); c.step(120);
  const a1 = Math.atan2(p.pos.z - tt.z, p.pos.x - tt.x);
  return { da: a1 - a0, dyaw: p.yaw - y0, r: Math.hypot(p.pos.x - tt.x, p.pos.z - tt.z), mode: p.mode };
});
console.log(`  Drehscheibe: Winkel ${f2(turn.da)} rad, Blick ${f2(turn.dyaw)} rad, Radius ${f2(turn.r)}`);
check('Drehscheibe dreht Figur und Blickrichtung mit (Radius bleibt)', Math.abs(Math.abs(turn.da) - 0.9) < 0.08 && Math.abs(turn.dyaw - 0.9) < 0.08 && Math.abs(turn.r - 1.1) < 0.05 && turn.mode === 'ground');

// ---------------------------------------------------------------- Krallen-Sturzflug, Boost-Pfeil, Förderband, Kristallblock
const misc = await sc(() => {
  const c = window.__course, t = window.__t, p = c.player, out = {};
  // Sturzflug: Krallen-Anzug, in der Luft mit Richtung ducken
  t.place(t.marks.lane, { power: 'krallen' });
  c.setInput({ y: 1, jump: true }); c.step(25);
  c.setInput({ y: 1, crouch: true }); c.step(1);
  out.dive = p.state; out.diveVy = p.vel.y;
  c.setInput({ y: 1 });
  for (let i = 0; i < 120 && p.mode !== 'ground'; i++) c.step(1);
  out.diveLand = p.state;
  // Boost-Pfeil
  const bs = [...c.world.shapes.values()].find((s) => s.boost);
  t.place([(bs.x0 + bs.x1) / 2, bs.bot + 0.1, bs.z1 + 0.6]);
  c.setInput({ y: 0.5 }); c.step(40);
  out.boost = Math.hypot(p.vel.x, p.vel.z);
  // Förderband (läuft nach +X): stehen bleiben, wird getragen
  const cv = [...c.world.shapes.values()].find((s) => s.conveyor);
  t.place([(cv.x0 + cv.x1) / 2 - 2, cv.top + 0.05, (cv.z0 + cv.z1) / 2]);
  const x0 = p.pos.x;
  c.setInput({}); c.step(120);
  out.conveyor = p.pos.x - x0;
  // Kristallblock: Kopfstoß wirkungslos, Stampfen zerbricht
  const cr = c.level.entities.find((e) => e.kind === 'crystal');
  t.place([cr.pos.x, cr.pos.y + 1.05, cr.pos.z]);
  c.setInput({ jump: true }); c.step(20); c.setInput({ crouch: true }); c.step(2); c.setInput({}); c.step(90);
  out.crystal = !cr.alive;
  c.setInput({});
  return out;
});
console.log(`  Sturzflug ${misc.dive} (vy ${f2(misc.diveVy)}) → ${misc.diveLand}, Boost ${f2(misc.boost)} m/s, Förderband ${f2(misc.conveyor)} m/s·1 s`);
check('Krallen-Sturzflug schräg nach unten, Landung rutscht', misc.dive === 'dive' && misc.diveVy < -5 && misc.diveLand === 'slide');
check('Boost-Pfeil beschleunigt (> 12 m/s)', misc.boost > 12);
check('Förderband trägt die stehende Figur (≈ 3 m/s)', misc.conveyor > 2.5 && misc.conveyor < 3.5);
check('Kristallblock: Stampfattacke zerbricht ihn', misc.crystal);

// ---------------------------------------------------------------- Bewegliche Plattform trägt die Figur
const mv = await sc(() => { const s = [...window.__course.world.shapes.values()].find((x) => x.tag === 'mover'); return [(s.x0 + s.x1) / 2, s.top + 0.05, (s.z0 + s.z1) / 2]; });
await T('place', mv, { settle: 12 });
const platOf = () => sc(() => { const s = [...window.__course.world.shapes.values()].find((x) => x.tag === 'mover'); return { z: (s.z0 + s.z1) / 2, top: s.top }; });
const m0 = await T('info');
const pl0 = await platOf();
await T('play', [[{}, 150]]);
const m1 = await T('info');
const pl1 = await platOf();
console.log(`  Plattform: Figur z ${f2(m0.z)} → ${f2(m1.z)}, Plattform z ${f2(pl0.z)} → ${f2(pl1.z)}`);
check('Bewegliche Plattform trägt die Figur', Math.abs(pl1.z - pl0.z) > 1 && Math.abs((m1.z - m0.z) - (pl1.z - pl0.z)) < 0.05 && Math.abs(m1.y - pl1.top) < 0.05 && m1.mode === 'ground');

// ---------------------------------------------------------------- Trampolin
await T('place', marks.trampoline, { settle: 0 });
tr = await T('play', [[{}, 220]]);
const tramp = Math.max(...tr.map((s) => s[1]));
console.log(`  Trampolin: Scheitel y ${f2(tramp)}`);
check('Trampolin schleudert hoch (> 5 m über dem Boden)', tramp > 6);

// ---------------------------------------------------------------- Wasser
await T('place', marks.water, { settle: 0 });
tr = await T('play', [[{}, 150]]);
const swim = tr[tr.length - 1];
tr = await T('play', [[{ y: 1 }, 60], [{ jump: true }, 1], [{}, 30]]);
const stroke = Math.max(...tr.slice(60).map((s) => s[4]));
console.log(`  Wasser: ${swim[6]}/${swim[7]} y ${f2(swim[1])}, Schwimmzug vy ${f2(stroke)}`);
check('Wasser: Schwimmen an der Oberfläche, Sprung = Schwimmzug/Aussprung', swim[6] === 'swim' && swim[1] > -1.2 && swim[1] < 0.6 && stroke > 4);

// ---------------------------------------------------------------- Checkpoint, Lava → Tod → Neustart am Checkpoint
await T('place', marks.checkpoint);
await T('play', [[{}, 5]]);
const cp = (await T('rt')).checkpoint;
const lives0 = (await T('rt')).lives;
await T('place', marks.lava, { settle: 0 });
tr = await T('play', [[{}, 90]]);
const died = await T('info');
await T('play', [[{}, 300]]);
const after = await T('info');
const lives1 = (await T('rt')).lives;
console.log(`  Lava: tot=${died.dead}, danach z ${f2(after.z)} (Checkpoint ${cp}), Leben ${lives0} → ${lives1}`);
check('Checkpoint aktiviert', Array.isArray(cp) && Math.abs(cp[2] - marks.checkpoint[2]) < 1);
check('Lava → Tod → Neustart am Checkpoint (Leben −1)', died.dead && !after.dead && Math.abs(after.z - cp[2]) < 1.5 && lives1 === lives0 - 1);

// ---------------------------------------------------------------- Pilzling: draufspringen besiegt, seitlich verletzt
const stomp = await sc(() => {
  const c = window.__course, t = window.__t;
  const e = c.level.entities.find((x) => x.kind === 'pilzling' && x.alive && x.pos.z > -20);
  t.place([e.pos.x, e.pos.y + 3, e.pos.z], { settle: 0 });
  let bounced = false;
  for (let i = 0; i < 90; i++) { c.setInput({}); c.step(1); const p = c.player; p.pos.x = e.pos.x; p.pos.z = e.pos.z; if (p.vel.y > 5) { bounced = true; break; } }
  return { state: e.state, bounced, hurt: c.player.invuln > 0 || !c.player.big };
});
check('Pilzling: draufspringen besiegt ihn (Abprall, kein Treffer)', stomp.state === 'squashed' && stomp.bounced && !stomp.hurt);
const side = await sc(() => {
  const c = window.__course, t = window.__t;
  const e = c.level.entities.find((x) => x.kind === 'pilzling' && x.alive && x.pos.z < -30 && x.pos.z > -45);
  e.speed = 0;
  t.place([e.pos.x + 1.5, e.pos.y, e.pos.z], { settle: 2 });
  for (let i = 0; i < 90; i++) { c.setInput({ x: -1 }); c.step(1); if (c.player.invuln > 0) break; }
  c.setInput({});
  return { invuln: c.player.invuln, big: c.player.big, alive: e.alive };
});
check('Pilzling: seitliche Berührung = Treffer (groß → klein, unverwundbar)', side.invuln > 0 && !side.big && side.alive);

// ---------------------------------------------------------------- Sammeln: Münze, Stern, Stempel
const col = await sc(() => {
  const c = window.__course, t = window.__t, rt = c.level.runtime;
  const coin = c.level.entities.find((x) => x.kind === 'coin');
  const c0 = rt.coins;
  t.place([coin.pos.x, coin.pos.y, coin.pos.z], { settle: 3 });
  const c1 = rt.coins;
  const s = c.level.data.stars[0];
  t.place([s[0], s[1], s[2]], { settle: 3 });
  const st = c.level.data.stamp;
  t.place([st[0], st[1], st[2]], { settle: 3 });
  return { coin: c1 - c0, star: rt.stars[0], stamp: rt.stamp };
});
check('Münze einsammeln (+1)', col.coin === 1);
check('Stern einsammeln', col.star === true);
check('Stempel einsammeln', col.stamp === true);

// ---------------------------------------------------------------- Kletterwand mit Krallen-Anzug, Bohnenranke
await T('place', marks.climb, { power: 'krallen' });
tr = await T('play', [[{ y: 1 }, 10], [{ y: 1, jump: true }, 1], [{ y: 1 }, 260]]);
const climbTop = tr[tr.length - 1];
console.log(`  Kletterwand: ${tr.some((s) => s[7] === 'climb') ? 'klettert' : 'kein Klettern'}, Ende y ${f2(climbTop[1])} (${climbTop[7]})`);
check('Krallen-Anzug: Kletterwand hoch aufs Plateau', tr.some((s) => s[7] === 'climb') && climbTop[1] > 6.9);
await T('place', marks.climb);
tr = await T('play', [[{ y: 1 }, 10], [{ y: 1, jump: true }, 1], [{ y: 1 }, 200]]);
check('Ohne Krallen: Wandrutschen statt Klettern', !tr.some((s) => s[7] === 'climb') && tr.some((s) => s[7] === 'wallslide') && tr[tr.length - 1][1] < 2);
await T('place', marks.stalk);
tr = await T('play', [[{ y: 1 }, 260]]);
const stalkMax = Math.max(...tr.map((s) => s[1]));
console.log(`  Bohnenranke: höchste y ${f2(stalkMax)}`);
check('Bohnenranke: klettern', tr.some((s) => s[7] === 'beanstalk') && stalkMax > 6);

// ---------------------------------------------------------------- Röhre in den Bonusraum
await T('place', marks.pipe);
tr = await T('play', [[{ crouch: true }, 2], [{}, 200]]);
const pipeEnd = tr[tr.length - 1];
console.log(`  Röhre: Ende x ${f2(pipeEnd[0])} z ${f2(pipeEnd[2])} (${pipeEnd[6]})`);
check('Röhre führt in den Bonusraum', pipeEnd[0] > 60 && tr.some((s) => s[7] === 'pipe'));

// ---------------------------------------------------------------- Timer abgelaufen → Tod
const timeout = await sc(() => {
  const c = window.__course, t = window.__t;
  t.place(t.marks.lane);
  c.level.runtime.timeLeft = 0.3;
  c.setInput({});
  c.step(60);
  return { dead: c.player.dead, cause: c.player.deathCause };
});
check('Timer läuft ab → Tod', timeout.dead && timeout.cause === 'time');
await sc(() => window.__course.step(300));

// ---------------------------------------------------------------- Zielmast beendet das Level und speichert
const goal = await sc(() => {
  const c = window.__course, t = window.__t;
  const g = c.level.entities.find((e) => e.kind === 'goal');
  t.place([g.pos.x - 1.2, g.pos.y + 1, g.pos.z], { settle: 10 });
  c.setInput({ x: 1, jump: true });
  let i = 0;
  while (!c.finished && i++ < 1200) { c.step(1); if (i === 30) c.setInput({ x: 1 }); }
  const saved = JSON.parse(localStorage.getItem('lotti-greta-course-v1') || '{}');
  return { finished: c.finished, result: c.lastResult, saved: saved.levels?.['0-0'] ?? null };
});
console.log(`  Ziel: ${goal.finished ? 'fertig' : 'nicht fertig'}, Mast ${f2(goal.result?.pole)} → ${goal.result?.points} Punkte, gespeichert ${JSON.stringify(goal.saved)}`);
check('Zielmast beendet das Level', goal.finished && goal.result && goal.result.points > 0);
check('Ergebnis gespeichert (done, Sterne, Bestzeit)', !!goal.saved?.done && goal.saved.stars[0] === true && goal.saved.bestTime > 0);
// Die Ergebnis-Szene startet nach einer kurzen Siegessequenz in Spielzeit – im langsamen Headless-Renderer
// kann das mehrere Sekunden Wanduhr dauern, daher auf den Zustand warten statt fest zu schlafen.
const resultShown = await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 15000 }).then(() => true, () => false);
check('Ergebnis-Szene sichtbar', resultShown);

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
