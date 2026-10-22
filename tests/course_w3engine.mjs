// Kurs-Modus, Motor-Erweiterungen Welt 3 im Schneegarten 0-9: Gleitblatt (Schwanzhieb, Gleiten über eine 8-m-Lücke,
// Statue), Eis (Bremsweg, Wenden, Anlauf, Gegner rutschen), Schlittschuh (Einsteigen, Tempo Gras/Eis, Sprung, Stacheln,
// Treffer wirft heraus, Aussteigen, ?-Block), Schneeball (schieben, wächst, besiegt Gegner, zerbricht an der Wand,
// Inhalt, Draufstehen, Schwanzhieb stößt), Kettenzaun (greifen, klettern, Faustschlag durch den Zaun, abspringen,
// mitfahren), Unterwasser (abtauchen, ruhiges Sinken, Schwimmzug, Auftauchen, Strömung, Wasserspiegel, Druckfeld,
// schwimmende Gegenstände, Kamera-Haken), Blick-Schnittstelle isFacing, HeroRig-Zustände. Deterministisch über
// window.__course.step(n)/setInput; Bilder tests/out/w3e_*.png, Kennzahlen.
// Aufruf: PORT_BASE=3200 node tests/course_w3engine.mjs   (Port 4229; vorher npm run build; nutzt vite preview)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4229;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const SHOTS = process.env.W3E_SHOTS !== '0';

await page.goto(`http://localhost:${port}/?course=0-9&scale=2&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
} catch {
  console.log('Schneegarten startet nicht. Konsole:');
  for (const x of errors) console.log('  ', x);
  stop(); process.exit(1);
}
await page.waitForTimeout(300);

await sc(() => {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  c.level.runtime.save.lives = 99;
  const P = () => c.player;
  const L = () => c.level;
  const info = (f) => f && { ...f.info(), main: f === L().player };
  const ent = (id) => L().named.get(id);
  window.__t = {
    marks: c.level.data.marks,
    /** Haupt-Figur setzen (Lotti, groß, ohne Power-up, ohne Schlittschuh/Zaun/Statue) und landen lassen. */
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setInput({});
      c.squad.clear();
      p.dropHeld();
      p.helmet = null; p.helmetFx = null;
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
      L().runtime.save.lives = 99;
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap(p);
      c.step(o.settle ?? 30);
      return info(p);
    },
    info: () => info(P()),
    steps(n) { c.step(n); return info(P()); },
    /** Eingaben abspielen: [[input, n], …]; Spur der Haupt-Figur [x, y, z, mode, state, vx, vy, vz]. */
    play(segs) {
      const tr = [];
      for (const [inp, n] of segs) {
        c.setInput(inp);
        for (let i = 0; i < n; i++) { c.step(1); const p = P(); tr.push([+p.pos.x.toFixed(3), +p.pos.y.toFixed(3), +p.pos.z.toFixed(3), p.mode, p.state, +p.vel.x.toFixed(2), +p.vel.y.toFixed(2), +p.vel.z.toFixed(2)]); }
      }
      c.setInput({});
      return tr;
    },
    /** Stick (Weltrichtung dx, dz) in kamerabezogene Eingabe umrechnen. */
    stick(dx, dz) {
      const l = Math.hypot(dx, dz) || 1, cy = L().controlYaw, cs = Math.cos(cy), sn = Math.sin(cy);
      return { x: (cs * dx - sn * dz) / l, y: (-sn * dx - cs * dz) / l };
    },
    named(id) { const e = ent(id); return e ? { alive: e.alive !== false, removed: !!e.removed, defeated: !!e.defeated, state: e.state, x: e.pos?.x, y: e.pos?.y, z: e.pos?.z, vx: e.vel?.x, vz: e.vel?.z, info: e.info?.() ?? null, rider: e.rider ? true : false } : null; },
    spawn(kind, spec) { const e = L().spawn(kind, spec); return e ? L().entities.indexOf(e) : -1; },
    count: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed).length,
    rig() { c.rig.update(1 / 60, c.view.time + 1 / 60); const k = c.rig.proxy.course; return { state: k.state, speed: +(k.speed ?? 0).toFixed(2), fenceMove: k.fenceMove ? { ...k.fenceMove } : null, power: k.power, phase: +(k.phase ?? 0).toFixed(2), skates: k.skates }; },
    coins: () => L().runtime.coins,
    uw: () => c.underwater?.info() ?? null,
  };
});

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const marks = await sc(() => window.__t.marks);
const stats = [];
async function shot(name, wait = 1400) {
  if (!SHOTS) return;
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame > f + 2, f0, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  try { await page.screenshot({ path: `${OUT}w3e_${name}.png`, timeout: 120000 }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}
/** Auf n neue Bilder warten (Ansichts-Haken laufen je Bild). */
async function frames(n = 3) {
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction(([f, k]) => window.__course.view.frame >= f + k, [f0, n], { timeout: 60000 }).catch(() => {});
}

console.log('Schneegarten 0-9');
const kinds = await sc(() => [...new Set(window.__course.level.entities.map((e) => e.kind))].sort());
console.log(`  Arten: ${kinds.join(', ')}`);
check('Level geladen (Schneeball, Schlittschuh, Kettenzaun, Kettenplattform, Gleitblatt-Item)', ['schneeball', 'schlittschuh', 'kettenzaun', 'kettenplattform', 'powerup'].every((k) => kinds.includes(k)));
const shapes = await sc(() => { const W = window.__course.level.world; let ice = 0, snow = 0, spikes = 0, water = 0; W.forEach((s) => { if (s.ice) ice++; if (s.snow) snow++; if (s.spikes) spikes++; if (s.water) water++; }); return { ice, snow, spikes, water, fences: window.__course.level.fences.length }; });
console.log(`  Formen: ${JSON.stringify(shapes)}`);
check('Bausteine: Eisbahn (ice), Schneefeld (snow), Stachelboden (spikes), Wasser, 4 Zäune', shapes.ice >= 2 && shapes.snow >= 4 && shapes.spikes === 1 && shapes.water === 2 && shapes.fences === 4);
check('Keine Konsolenfehler beim Laden', errors.length === 0);
await shot('start');

// ================================================================ Gleitblatt
{
  await T('place', [0, 1, 3]);
  await T('play', [[{ y: 1 }, 60], [{}, 20]]);
  const p = await T('info');
  const leafModel = await sc(() => { const e = window.__course.level.entities.find((q) => q.kind === 'powerup'); return e ? (e.model?.root?.name ?? '') : 'weg'; });
  console.log(`  Gleitblatt eingesammelt: power ${p.power}, groß ${p.big}`);
  check('Gleitblatt: Item einsammeln → power gleitblatt (Figur groß)', p.power === 'gleitblatt' && p.big);
  const rg = await T('rig');
  check('HeroRig: proxy.course.power = gleitblatt', rg.power === 'gleitblatt');
  // ?-Block mit Gleitblatt: Modell powerup_gleitblatt (kein Platzhalter)
  await T('place', [3, 1, -2]);
  await T('play', [[{ jump: true }, 30], [{}, 60]]);
  const pm = await sc(() => { const e = window.__course.level.entities.find((q) => q.kind === 'powerup' && q.power === 'gleitblatt'); return e ? { ph: !!e.model?.placeholder, name: e.model?.root?.name ?? '' } : null; });
  console.log(`  ?-Block: ${JSON.stringify(pm)} (Item am Weg: ${leafModel})`);
  check('?-Block gibt ein Gleitblatt (Modell powerup_gleitblatt, kein Platzhalter)', !!pm && !pm.ph);
}

// Schwanzhieb rundum: Pilzling hinter der Figur, Ziegel neben der Figur
{
  const pz = await T('named', 'pz_tail');
  await T('place', [Math.min(pz.x + 1.05, -5.6), 1, -7.5], { power: 'gleitblatt', yaw: 0, settle: 2 });
  const pz2 = await T('named', 'pz_tail');
  await sc((x) => { const p = window.__course.player; p.pos.x = x; p.yaw = 0; }, pz2.x + 1.05);
  await T('play', [[{ action: true }, 1]]);
  const rg = await T('rig');
  await T('play', [[{}, 20]]);
  const d = await T('named', 'pz_tail');
  const p = await T('info');
  console.log(`  Schwanzhieb: Pilzling hinter der Figur ${d.defeated ? 'besiegt' : 'steht'} (Avatar ${rg.state}, phase ${rg.phase}), Figur ${p.state}`);
  check('Schwanzhieb (Aktion) besiegt einen Pilzling hinter der Figur (rundum)', d.defeated);
  check('HeroRig: Schwanzhieb meldet state tailswipe', rg.state === 'tailswipe');
  await T('place', [-3, 1, -14.85], { power: 'gleitblatt', yaw: -Math.PI / 2 });
  const b0 = await T('count', 'brick');
  await T('play', [[{ action: true }, 1], [{}, 30]]);
  const b1 = await T('count', 'brick');
  console.log(`  Ziegel: ${b0} → ${b1}`);
  check('Schwanzhieb zerstört Ziegel neben/hinter der Figur', b0 - b1 >= 2);
}

// Gleiten über die 8-m-Lücke (im Gehtempo): ohne Gleitblatt Absturz, mit Gleitblatt drüben
{
  const run = async (power) => {
    await T('place', [-6, 1, -21], { power });
    return sc(() => {
      const c = window.__course, p = c.player;
      c.setInput({ y: 1 });
      let n = 0;
      while (p.pos.z > -27.55 && n < 300) { c.step(1); n++; }
      const z0 = p.pos.z, v0 = Math.hypot(p.vel.x, p.vel.z);
      c.setInput({ y: 1, jump: true });
      let minVy = 0, glideVy = 0, gl = 0;
      for (let i = 0; i < 480; i++) {
        c.step(1);
        if (p.state === 'glide') { gl++; if (p.stateTime > 0.25) glideVy = Math.min(glideVy, p.vel.y); }
        minVy = Math.min(minVy, p.vel.y);
        if (p.mode === 'ground' || p.dead || p.pos.y < -3) break;
      }
      c.setInput({});
      return { z0: +z0.toFixed(2), v0: +v0.toFixed(2), z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2), mode: p.mode, dead: p.dead, glideSteps: gl, glideVy: +glideVy.toFixed(2), minVy: +minVy.toFixed(2) };
    });
  };
  const a = await run(undefined);
  const b = await run('gleitblatt');
  console.log(`  Lücke ohne Gleitblatt: ${JSON.stringify(a)}`);
  console.log(`  Lücke mit Gleitblatt:  ${JSON.stringify(b)}`);
  check('Ohne Gleitblatt: Sprung im Gehtempo schafft die 8-m-Lücke nicht', a.v0 > 5 && (a.dead || a.y < 0) && a.z > -36);
  check('Mit Gleitblatt: Gleiten (Sprung gehalten) trägt über die 8-m-Lücke', b.mode === 'ground' && b.z < -36 && b.y > 0.9 && b.glideSteps > 30);
  check(`Gleiten: Fall höchstens ≈ 2 m/s (${f2(b.glideVy)} m/s)`, b.glideVy >= -2.05 && b.glideVy < -1.5);
  // Gleiten-Zustand für den Avatar + leichte Vorwärtsfahrt ohne Stick
  await T('place', [-6, 6, -40], { power: 'gleitblatt', settle: 0 });
  const tr = await T('play', [[{ jump: true }, 90]]);
  const rg = await T('rig');
  const last = tr[tr.length - 1];
  const drift = Math.hypot(last[0] + 6, last[2] + 40);
  console.log(`  Gleiten im Stand: state ${last[4]}, vy ${last[6]}, Vorwärtsfahrt ${f2(drift)} m in 0,75 s, Avatar ${rg.state}`);
  check('Gleiten: leichte Vorwärtsfahrt ohne Stick, Avatar-Zustand glide', last[4] === 'glide' && drift > 0.8 && rg.state === 'glide');
  await T('play', [[{}, 120]]);
}

// Statue: Ducken + Aktion in der Luft → fällt als Stampfer, unverwundbar ≈ 3 s, Gegner ignorieren sie
{
  const pz = await T('named', 'pz_statue');
  await T('place', [pz.x, 4.5, pz.z], { power: 'gleitblatt', settle: 0 });
  await sc(() => { const p = window.__course.level.named.get('pz_statue'); const f = window.__course.player; f.pos.x = p.pos.x; f.pos.z = p.pos.z; });
  await T('play', [[{ crouch: true, action: true }, 1]]);
  const st0 = await T('info');
  const rg = await T('rig');
  await T('play', [[{ crouch: true }, 60]]);
  const squashed = await T('named', 'pz_statue');
  console.log(`  Statue: ${st0.statue ? 'ja' : 'nein'} (mode ${st0.mode}, Avatar ${rg.state}), Pilzling darunter ${squashed.defeated ? 'besiegt' : 'steht'}`);
  check('Statue: Ducken + Aktion in der Luft → Statue (mode script), Avatar-Zustand statue', st0.statue && st0.mode === 'script' && rg.state === 'statue');
  check('Statue fällt als Stampfer: Pilzling darunter besiegt', squashed.defeated);
  // Unverwundbar und für Gegner unsichtbar: jagender Pilzling neben der Statue, direkter Treffer
  const sp = await sc(() => {
    const c = window.__course, p = c.player, L = c.level;
    const e = L.spawn('pilzling', { id: 'pz_jaeger', pos: [p.pos.x - 3, 1, p.pos.z + 0.3], behavior: 'chase', sight: 8, dir: [1, 0] });
    const hit = p.hurt(e);
    const active = e.playerActive();
    return { hit, active };
  });
  const tr = await T('play', [[{ crouch: true }, 150]]);
  const mid = await sc(() => { const c = window.__course, e = c.level.named.get('pz_jaeger'), p = c.player; return { state: e.state, statue: p.statue, big: p.big, power: p.power, dead: p.dead, t: +(p.script?.t ?? -1).toFixed(2) }; });
  await T('play', [[{ crouch: true }, 170]]);
  const end = await sc(() => { const c = window.__course, e = c.level.named.get('pz_jaeger'), p = c.player; return { statue: p.statue, mode: p.mode, state: e.state, cool: +p.statueCool.toFixed(2) }; });
  const statueSteps = tr.filter((s) => s[4] === 'statue').length;
  console.log(`  Statue: Treffer ${sp.hit}, Gegner sieht Figur ${sp.active}; nach ${mid.t} s ${JSON.stringify(mid)}; danach (3,18 s) ${JSON.stringify(end)}`);
  check('Statue unverwundbar: Treffer wirkungslos, Figur bleibt groß mit Gleitblatt', sp.hit === false && mid.statue && mid.big && mid.power === 'gleitblatt' && !mid.dead && statueSteps === 150);
  check('Gegner ignorieren die Statue (Jäger-Pilzling bleibt in walk)', sp.active === false && mid.state === 'walk');
  check('Statue endet nach ≈ 3 s (auch mit gehaltenem Ducken), danach wieder steuerbar', !end.statue && end.mode !== 'script');
  // Ducken loslassen beendet sie früher; Treffer → wieder normal groß
  await T('place', [-2, 1, -20], { power: 'gleitblatt' });
  await T('play', [[{ crouch: true, action: true }, 1], [{ crouch: true }, 80], [{}, 2]]);
  const early = await T('info');
  await sc(() => { const p = window.__course.player; p.statueCool = 0; p.invuln = 0; p.hurt({ pos: { x: p.pos.x + 1, y: p.pos.y, z: p.pos.z } }); });
  const hurt = await T('info');
  console.log(`  Statue am Boden, Ducken losgelassen nach 0,67 s: statue ${early.statue}; Treffer danach: power ${hurt.power}, groß ${hurt.big}`);
  check('Statue am Boden: Ducken loslassen beendet sie (nach der Mindestzeit)', !early.statue && early.mode === 'ground');
  check('Treffer mit Gleitblatt → zurück zu normal groß', hurt.power === 'none' && hurt.big && !hurt.dead);
  await T('place', [7, 1, -13]);
  await sc(() => { const e = window.__course.level.named.get('pz_jaeger'); if (e) e.kill(); });
}

// ================================================================ Eis
{
  const brake = async (x) => {
    await T('place', [x, 1, -37]);
    return sc(() => {
      const c = window.__course, p = c.player;
      c.setInput({ y: 1 });
      for (let i = 0; i < 160; i++) c.step(1);
      const v0 = Math.hypot(p.vel.x, p.vel.z), z0 = p.pos.z;
      c.setInput({});
      let n = 0;
      while (Math.hypot(p.vel.x, p.vel.z) > 0.05 && n < 600) { c.step(1); n++; }
      return { v0: +v0.toFixed(2), dist: +(z0 - p.pos.z).toFixed(2), t: +(n / 120).toFixed(2), ice: !!p.ground?.ice };
    });
  };
  const g = await brake(-6);
  const i = await brake(6);
  console.log(`  Bremsweg: Gras aus ${g.v0} m/s ${g.dist} m (${g.t} s), Eis aus ${i.v0} m/s ${i.dist} m (${i.t} s, auf Eis ${i.ice})`);
  check('Eis: Bremsweg deutlich länger als auf Gras (≥ 4×, ≥ 2,5 m)', i.ice && Math.abs(i.v0 - g.v0) < 0.2 && i.dist > g.dist * 4 && i.dist > 2.5);
  const turn = async (x) => {
    await T('place', [x, 1, -38]);
    return sc(() => {
      const c = window.__course, p = c.player;
      c.setInput({ y: 1 });
      for (let k = 0; k < 150; k++) c.step(1);
      c.setInput({ x: 1 });
      for (let k = 0; k < 30; k++) c.step(1);
      return { vz: +p.vel.z.toFixed(2), vx: +p.vel.x.toFixed(2) };
    });
  };
  const tg = await turn(-6), ti = await turn(6);
  console.log(`  Wenden nach 0,25 s: Gras vz ${tg.vz} vx ${tg.vx}, Eis vz ${ti.vz} vx ${ti.vx}`);
  check('Eis: Wenden rutscht (nach 0,25 s noch Tempo in der alten Richtung)', ti.vz < -3 && Math.abs(tg.vz) < 1);
  const runUp = async (x) => {
    await T('place', [x, 1, -38]);
    return sc(() => {
      const c = window.__course, p = c.player;
      c.setInput({ y: 1, run: true });
      for (let k = 0; k < 120; k++) c.step(1);
      c.setInput({});
      return +Math.hypot(p.vel.x, p.vel.z).toFixed(2);
    });
  };
  const rg = await runUp(-6), ri = await runUp(6);
  console.log(`  Rennen nach 1 s: Gras ${rg} m/s, Eis ${ri} m/s`);
  check('Eis: Rennen beschleunigt langsamer', ri < rg - 2);
  // Gegner rutschen: Pilzling auf dem Eis kehrt um, rutscht aber weiter; auf Gras sofort
  await T('place', [0, 1, -48]);
  const slide = await sc(() => {
    const c = window.__course, L = c.level;
    const ei = L.spawn('pilzling', { id: 'pz_eis2', pos: [4, 1, -58], dir: [1, 0], edges: false });
    ei.setState('walk');
    const eg = L.spawn('pilzling', { id: 'pz_gras', pos: [-10, 1, -58], dir: [1, 0], edges: false });
    eg.setState('walk');
    c.step(150);
    const vi0 = ei.vel.x, vg0 = eg.vel.x;
    ei.dir.x = -1; eg.dir.x = -1;
    c.step(18);
    const r = { vi0: +vi0.toFixed(2), vg0: +vg0.toFixed(2), vi: +ei.vel.x.toFixed(2), vg: +eg.vel.x.toFixed(2), onIce: !!ei.ground?.ice };
    eg.kill(); ei.kill();
    return r;
  });
  console.log(`  Gegner: Eis vx ${slide.vi0} → nach Umkehr 0,15 s ${slide.vi}; Gras ${slide.vg0} → ${slide.vg}`);
  check('Gegner auf Eis rutschen (Umkehr träge), auf Gras sofort', slide.onIce && slide.vi0 > 1.4 && slide.vi > 0.4 && slide.vg < -1.2);
  await shot('eis', 800);
}

// ================================================================ Schlittschuh
{
  await T('place', [-6, 1, -62.5], { yaw: Math.PI / 2 });
  await T('play', [[{ y: 1 }, 70], [{}, 10]]);
  const p = await T('info');
  const sk = await T('named', 'skate1');
  const rg = await T('rig');
  console.log(`  Einsteigen: skate ${p.skate}, Entität rider ${sk.rider}, state ${p.state}, Avatar ${rg.state} (skates ${rg.skates})`);
  check('Schlittschuh: Hineinlaufen → Figur steigt ein (state skate)', p.skate && sk.rider && p.state === 'skate');
  await shot('schlittschuh', 600);
  const speed = async (x, z) => {
    await sc(([x2, z2]) => { const c = window.__course, p = c.player; p.pos.set(x2, 1.02, z2); p.vel.set(0, 0, 0); p.gs = 0; p.yaw = Math.PI / 2; c.view.rig.snap(p); }, [x, z]);
    await T('steps', 5);
    return sc(() => {
      const c = window.__course, p = c.player;
      c.setInput({ y: 1, run: true });
      let vmax = 0;
      for (let k = 0; k < 330; k++) { c.step(1); if (p.mode === 'ground') vmax = Math.max(vmax, Math.hypot(p.vel.x, p.vel.z)); }
      c.setInput({});
      return { vmax: +vmax.toFixed(2), skate: !!p.skate, ice: !!p.ground?.ice, z: +p.pos.z.toFixed(1) };
    });
  };
  const sg = await speed(-11, -62);
  const rgs = await T('rig');
  const si = await speed(7.5, -61);
  console.log(`  Tempo auf Gras ${sg.vmax} m/s (Avatar ${rgs.state}, speed ${rgs.speed}), auf Eis ${si.vmax} m/s`);
  check('Schlittschuh: sehr schnell (Gras > 11 m/s, normal rennen 10 m/s)', sg.skate && sg.vmax > 11);
  check('Schlittschuh: auf Eis noch schneller (> 14 m/s)', si.skate && si.ice && si.vmax > 14 && si.vmax > sg.vmax + 2);
  check('HeroRig: state skate mit proxy.course.speed', rgs.state === 'skate' && rgs.speed > 8);
  // Schwung: enge Kurven schwer – bei Tempo dreht die Fahrtrichtung langsam
  const curve = await sc(() => {
    const c = window.__course, p = c.player;
    p.pos.set(7.5, 1.02, -62); p.vel.set(0, -2, -12); p.gs = 12; p.yaw = Math.PI / 2; c.step(2);
    c.setInput({ x: 1, run: true }); c.step(30); c.setInput({});
    return { vx: +p.vel.x.toFixed(2), vz: +p.vel.z.toFixed(2) };
  });
  console.log(`  Kurve aus 12 m/s, 0,25 s Stick quer: v = (${curve.vx}, ${curve.vz})`);
  check('Schlittschuh: enge Kurven schwer (nach 0,25 s noch überwiegend alte Richtung)', curve.vz < -6 && curve.vx < 6);
  // Sprung mit Schwung
  const jmp = await sc(() => {
    const c = window.__course, p = c.player;
    p.pos.set(7.5, 1.02, -62); p.vel.set(0, -2, -10); p.gs = 10; p.yaw = Math.PI / 2; c.step(2);
    c.setInput({ y: 1, jump: true }); c.step(10);
    const r = { mode: p.mode, vy: +p.vel.y.toFixed(2), hv: +Math.hypot(p.vel.x, p.vel.z).toFixed(2), skate: !!p.skate };
    c.setInput({}); c.step(90);
    r.after = p.mode; r.skate2 = !!p.skate;
    return r;
  });
  console.log(`  Sprung: ${JSON.stringify(jmp)}`);
  check('Schlittschuh: springen mit vollem Schwung, landet wieder auf den Kufen', jmp.mode === 'air' && jmp.vy > 5 && jmp.hv > 8 && jmp.after === 'ground' && jmp.skate2);
  // Stacheln: ohne Schlittschuh Treffer, mit Schlittschuh sicher
  const spikes = async (skate) => sc((sk) => {
    const c = window.__course, p = c.player;
    if (!sk && p.skate) p.skate.release(p, 'gone');
    p.pos.set(-6, 1.02, -76.6); p.vel.set(0, -2, 0); p.gs = 0; p.yaw = Math.PI / 2; p.invuln = 0; p.big = true; p.updateHalf(); c.step(3);
    c.setInput({ y: 1 }); let hurt = false, on = false;
    for (let k = 0; k < 150; k++) { c.step(1); if (p.ground?.spikes) on = true; if (p.invuln > 0 || !p.big) hurt = true; if (p.pos.z < -83) break; }
    c.setInput({});
    return { hurt, on, big: p.big, skate: !!p.skate, z: +p.pos.z.toFixed(1) };
  }, skate);
  const ss = await spikes(true);
  await T('place', [-6, 1, -76.6]);
  const sn = await spikes(false);
  console.log(`  Stachelboden mit Schlittschuh ${JSON.stringify(ss)}, ohne ${JSON.stringify(sn)}`);
  check('Stachelboden: mit Schlittschuh sicher', ss.on && !ss.hurt && ss.skate);
  check('Stachelboden: ohne Schlittschuh Treffer', sn.hurt);
  // Treffer wirft heraus
  await T('place', [-6, 1, -88]);
  const hit = await sc(() => {
    const c = window.__course, p = c.player, L = c.level;
    const s = L.spawn('schlittschuh', { id: 'skate2', pos: [p.pos.x, p.pos.y, p.pos.z] });
    s.wear(p);
    const e = L.named.get('pz_skate');
    e.setState('walk');
    let out = null;
    for (let k = 0; k < 400 && !out; k++) {
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
      const cy = L.controlYaw, cs = Math.cos(cy), sn = Math.sin(cy);
      c.setInput({ x: (cs * dx - sn * dz) / l * 0.6, y: (-sn * dx - cs * dz) / l * 0.6 });
      c.step(1);
      if (!p.skate) out = { k, big: p.big, power: p.power, invuln: +p.invuln.toFixed(2), rider: !!s.rider, svy: +s.vel.y.toFixed(2), dead: p.dead };
    }
    c.setInput({});
    c.step(120);
    if (out) { out.sx = +s.pos.x.toFixed(2); out.sy = +s.pos.y.toFixed(2); out.lying = s.grounded; }
    return out;
  });
  console.log(`  Treffer auf dem Schlittschuh: ${JSON.stringify(hit)}`);
  check('Schlittschuh: Treffer wirft heraus (Figur bleibt groß, kurz unverwundbar, Schlittschuh fliegt davon)', !!hit && hit.big && !hit.dead && hit.invuln > 1 && !hit.rider && hit.svy > 3 && hit.lying);
  // Aussteigen mit Aktion, Ducken + Sprung
  await T('place', [-11, 1, -100]);
  const off = await sc(() => {
    const c = window.__course, p = c.player, L = c.level;
    const s = L.spawn('schlittschuh', { id: 'skate3', pos: [p.pos.x, p.pos.y, p.pos.z] });
    s.wear(p); c.step(10);
    const on = !!p.skate;
    c.setInput({ action: true }); c.step(1); c.setInput({}); c.step(60);
    const a = { on, off: !p.skate, s: !!s.rider };
    // wieder einsteigen (nach der Sperrzeit) und mit Ducken + Sprung abspringen
    p.pos.set(s.pos.x, s.pos.y + 0.1, s.pos.z); c.step(40);
    a.again = !!p.skate;
    c.setInput({ crouch: true }); c.step(2); c.setInput({ crouch: true, jump: true }); c.step(1);
    a.jumpOff = !p.skate && p.mode === 'air' && p.vel.y > 5;
    c.setInput({}); c.step(60);
    return a;
  });
  console.log(`  Aussteigen: ${JSON.stringify(off)}`);
  check('Schlittschuh: Aktion = aussteigen, Ducken + Sprung = abspringen', off.on && off.off && !off.s && off.again && off.jumpOff);
  // ?-Block mit Schlittschuh (Power-up-Name → Entität)
  await T('place', [-4, 1, -66]);
  const n0 = await T('count', 'schlittschuh');
  await T('play', [[{ jump: true }, 30], [{}, 90]]);
  const n1 = await T('count', 'schlittschuh');
  console.log(`  ?-Block: Schlittschuh-Entitäten ${n0} → ${n1}`);
  check('?-Block content schlittschuh erzeugt die Schlittschuh-Entität', n1 === n0 + 1);
}

// ================================================================ Schneeball
{
  await T('place', [0, 1, -115.3]);
  const push = await T('play', [[{ y: 1 }, 120]]);
  const b1 = await T('named', 'ball1');
  console.log(`  Schieben 1 s: Ball z ${f2(b1.z)}, Tempo ${b1.info.speed}, Größe ${b1.info.size}`);
  check('Schneeball: Hineinlaufen schiebt ihn (rollt)', b1.z < -119 && b1.info.speed > 2);
  // weiter schieben (hinterherlaufen) bis er an der Mauer zerbricht
  const res = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, b = L.named.get('ball1'), pz = L.named.get('pz_ball');
    const coins0 = L.runtime.coins;
    let maxSize = b.size, defeatedAt = null, broke = null;
    for (let k = 0; k < 1200 && !b.broken; k++) {
      const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
      const cy = L.controlYaw, cs = Math.cos(cy), sn = Math.sin(cy);
      c.setInput({ x: (cs * dx - sn * dz) / l, y: (-sn * dx - cs * dz) / l });
      c.step(1);
      maxSize = Math.max(maxSize, b.size);
      if (pz.defeated && defeatedAt === null) defeatedAt = +b.pos.z.toFixed(1);
    }
    if (b.broken) broke = { z: +b.pos.z.toFixed(2), size: +b.size.toFixed(2) };
    c.setInput({});
    c.step(10);
    return { maxSize: +maxSize.toFixed(2), rolled: +b.rolled.toFixed(1), defeatedAt, broke, defeats: b.defeats, coins: L.runtime.coins - coins0 };
  });
  console.log(`  Schneeball: ${JSON.stringify(res)}`);
  check('Schneeball wächst beim Rollen über Schnee (> 1,6 m)', res.maxSize > 1.6);
  check('Schneeball besiegt den Pilzling im Weg', res.defeatedAt !== null && res.defeats >= 1);
  check('Schneeball zerbricht an der Mauer und gibt seinen Inhalt frei (5 Münzen)', !!res.broke && res.broke.z > -147 && res.broke.z < -144 && res.coins === 5);
  // Figur kann auf einem Schneeball stehen; Schwanzhieb stößt ihn an
  await T('place', [-8, 4.5, -121], { settle: 90 });
  const on = await sc(() => { const p = window.__course.player; return { y: +p.pos.y.toFixed(2), owner: p.ground?.owner?.kind ?? null, mode: p.mode }; });
  console.log(`  Auf dem großen Schneeball: ${JSON.stringify(on)}`);
  check('Figur kann auf einem Schneeball stehen', on.mode === 'ground' && on.owner === 'schneeball' && on.y > 2.5);
  await T('place', [-6.3, 1, -121], { power: 'gleitblatt', yaw: 0 });
  await T('play', [[{ action: true }, 1], [{}, 30]]);
  const kick = await T('named', 'ball_gross');
  console.log(`  Schwanzhieb gegen den Schneeball: x ${f2(kick.x)}, Tempo ${kick.info.speed}`);
  check('Schwanzhieb stößt den Schneeball weg', kick.x < -8.5 && kick.info.speed > 1);
  await shot('schneeball', 600);
}

// ================================================================ Kettenzaun
{
  // an den Zaun springen (Stick zum Zaun), hochklettern, seitlich
  await T('place', [-6, 1, -155.5]);
  const tr = await T('play', [[{ y: 1 }, 12], [{ y: 1, jump: true }, 50]]);
  const g = await T('info');
  const rgf = await T('rig');
  console.log(`  Zaun: mode ${g.mode}, state ${g.state}, Seite ${g.fence}, Avatar ${rgf.state}`);
  check('Kettenzaun: an den Zaun springen → mode wall, state fence (Vorderseite)', g.mode === 'wall' && g.state === 'fence' && g.fence === 1);
  await T('play', [[{ y: -1 }, 70]]);
  const down = await T('info');
  const y0 = down.y;
  await T('play', [[{ y: 1 }, 60]]);
  const up = await T('info');
  const rgu = await T('rig');
  await T('play', [[{ x: 1 }, 40]]);
  const side = await T('info');
  const rgs = await T('rig');
  await T('play', [[{ x: -1 }, 40]]);
  console.log(`  Klettern: gegriffen bei y ${f2(g.y)}, runter ${f2(down.y - g.y)} m, hoch ${f2(up.y - y0)} m (fenceMove ${JSON.stringify(rgu.fenceMove)}), seitlich ${f2(side.x - up.x)} m (${JSON.stringify(rgs.fenceMove)}), z ${f2(side.z)}`);
  check('Klettern: Stick runter/hoch → am Zaun hinab/hinauf, Stick rechts → am Zaun entlang nach rechts', down.y - g.y < -1.5 && down.mode === 'wall' && up.y - y0 > 1.2 && side.x - up.x > 0.9 && Math.abs(side.z - (-158 + 0.38)) < 0.02);
  check('HeroRig: state fence mit fenceMove (x/y −1..1)', rgu.state === 'fence' && rgu.fenceMove?.y === 1 && rgs.fenceMove?.x === 1);
  await shot('kettenzaun', 600);
  // abspringen
  const jt = await T('play', [[{ jump: true }, 1], [{}, 12]]);
  const ja = jt[jt.length - 1];
  console.log(`  Abspringen: mode ${ja[3]}, vz ${ja[7]}, vy ${ja[6]}`);
  check('Abspringen: Sprung löst vom Zaun (vom Zaun weg, nach oben)', ja[3] === 'air' && ja[7] > 2 && jt[2][6] > 3);
  await T('play', [[{}, 90]]);
  // Faustschlag durch den Zaun: Pilzling auf der Rückseite
  await T('place', [-6, 1, -157.3]);
  const punch = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, e = L.named.get('pz_zaun');
    e.setState('walk');
    c.step(2);
    p.pos.x = Math.max(-8, Math.min(-4, e.pos.x)); c.step(1);
    c.setInput({ action: true }); c.step(1); c.setInput({}); c.step(3);
    const grabbed = !!p.fence && p.mode === 'wall';
    p.pos.x = Math.max(-8, Math.min(-4, e.pos.x)); c.step(1);
    c.setInput({ action: true }); c.step(1); c.setInput({});
    const r = { grabbed, punching: p.punchTime > 0, side: p.fence?.side ?? 0 };
    c.step(30);
    r.defeated = e.defeated; r.ez = +e.pos.z.toFixed(2); r.hurt = p.invuln > 0 || !p.big;
    return r;
  });
  console.log(`  Faustschlag: ${JSON.stringify(punch)}`);
  check('Am Boden Aktion vor dem Zaun greift ihn', punch.grabbed && punch.side === 1);
  check('Faustschlag durch den Zaun besiegt den Gegner auf der Rückseite', punch.punching && punch.defeated && !punch.hurt);
  await T('play', [[{ crouch: true }, 2], [{}, 60]]);
  // Mitfahren auf dem fahrenden Zaun
  const ride = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, f = L.named.get('zaun_fahrt');
    p.reset([f.pos.x, 1, -165.3], Math.PI / 2); p.invuln = 0; c.step(3);
    c.setInput({ action: true }); c.step(1); c.setInput({}); c.step(2);
    const on = !!p.fence;
    const fx0 = f.pos.x, px0 = p.pos.x;
    let maxErr = 0;
    for (let k = 0; k < 240; k++) { c.step(1); maxErr = Math.max(maxErr, Math.abs((p.pos.x - px0) - (f.pos.x - fx0))); }
    return { on, still: !!p.fence, dfx: +(f.pos.x - fx0).toFixed(2), dpx: +(p.pos.x - px0).toFixed(2), maxErr: +maxErr.toFixed(3) };
  });
  console.log(`  Mitfahren: ${JSON.stringify(ride)}`);
  check('Fahrender Zaun: Figur fährt mit (gleiche Verschiebung)', ride.on && ride.still && Math.abs(ride.dfx) > 1 && ride.maxErr < 0.05);
  // Kettenplattform: auf dem Deck mitfahren, Zaun an der Rückseite greifbar
  const plat = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, f = L.named.get('plattform');
    p.reset([f.pos.x, 5.5, f.pos.z + 0.5], Math.PI / 2); c.step(60);
    const stand = p.ground?.owner === f;
    let path = 0, maxErr = 0, fx = f.pos.x;
    const fx0 = f.pos.x, px0 = p.pos.x;
    for (let k = 0; k < 150; k++) { c.step(1); path += Math.abs(f.pos.x - fx); fx = f.pos.x; maxErr = Math.max(maxErr, Math.abs((f.pos.x - fx0) - (p.pos.x - px0))); }
    const r = { stand, path: +path.toFixed(2), maxErr: +maxErr.toFixed(3), still: p.ground?.owner === f };
    c.setInput({ y: 1 }); c.step(30); c.setInput({ y: 1, jump: true }); c.step(40); c.setInput({});
    r.fence = !!p.fence;
    c.step(5);
    return r;
  });
  console.log(`  Kettenplattform: ${JSON.stringify(plat)}`);
  check('Kettenplattform: Deck trägt mit, Zaun an der Rückseite greifbar', plat.stand && plat.still && plat.path >= 1 && plat.maxErr < 0.05 && plat.fence);
  await shot('plattform', 600);
  await T('play', [[{ crouch: true }, 2], [{}, 30]]);
  // Zaun auf einem Fahrzeug (attach): kletternde Figur fährt mit dem Wagen
  const veh = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, w = L.named.get('zaunwagen'), f = L.named.get('zaun_wagen');
    c.step(2);
    const P = f.plane;
    p.reset([P.x, w.pos.y + 0.32, P.z + 0.7], Math.PI / 2); p.invuln = 0; c.step(20);
    const onDeck = p.ground?.mover === w.mover;
    c.setInput({ action: true }); c.step(1); c.setInput({}); c.step(2);
    const on = !!p.fence && p.fence.obj === f;
    const wx0 = w.pos.x, px0 = p.pos.x;
    let maxErr = 0, path = 0, lx = w.pos.x;
    for (let k = 0; k < 180; k++) { c.step(1); path += Math.abs(w.pos.x - lx); lx = w.pos.x; maxErr = Math.max(maxErr, Math.abs((p.pos.x - px0) - (w.pos.x - wx0))); }
    const r = { onDeck, on, still: !!p.fence, path: +path.toFixed(2), maxErr: +maxErr.toFixed(3), fx: +(f.pos.x - P.x).toFixed(2) };
    c.setInput({ crouch: true }); c.step(2); c.setInput({}); c.step(30);
    return r;
  });
  console.log(`  Zaun auf dem Fahrzeug: ${JSON.stringify(veh)}`);
  check('Zaun auf einem Fahrzeug (attach): Figur klettert und fährt mit dem Wagen', veh.on && veh.still && veh.path > 1 && veh.maxErr < 0.05);
}

// ================================================================ Unterwasser
{
  await T('place', [-4, 2, -214], { settle: 240 });
  const s0 = await T('info');
  console.log(`  Becken: mode ${s0.mode}, state ${s0.state}, y ${s0.y}`);
  check('Wasser: Figur schwimmt an der Oberfläche (state swim)', s0.mode === 'swim' && s0.state === 'swim' && s0.y > -0.6 && s0.y < 0.6);
  const dive = await T('play', [[{ crouch: true }, 180]]);
  const d1 = dive[dive.length - 1];
  const rgd = await T('rig');
  console.log(`  Abtauchen 1,5 s: y ${d1[1]}, state ${d1[4]}, Avatar ${rgd.state}`);
  check('Abtauchen: Ducken taucht tief ab (state swimUnder)', d1[1] < s0.y - 3.5 && d1[4] === 'swimUnder');
  check('HeroRig: state swimUnder', rgd.state === 'swimUnder');
  const sink = await T('play', [[{}, 120]]);
  const sv = sink[sink.length - 1];
  console.log(`  Ruhiges Sinken: vy ${sv[6]} m/s, state ${sv[4]}`);
  check('Unter Wasser: ruhiges Sinken (≈ 0,9 m/s), bleibt getaucht', sv[6] < -0.6 && sv[6] > -1.1 && sv[4] === 'swimUnder');
  // Kamera-Haken unter Wasser
  await sc(() => window.__course.snapCamera());
  await frames(16);
  const uw = await T('uw');
  console.log(`  Unterwasser-Ansicht: ${JSON.stringify(uw)}`);
  check('Kamera unter Wasser: Nebel/Tönung aktiv (Kamera in der Wasserform)', !!uw && uw.cameraUnder && uw.k > 0.6 && uw.fogFar < 120);
  await shot('unterwasser', 700);
  const stroke = await T('play', [[{ jump: true }, 1], [{}, 4]]);
  console.log(`  Schwimmzug: vy ${stroke[1][6]}`);
  check('Schwimmzug (Sprung) unter Wasser: kräftig nach oben', stroke[1][6] > 3.5);
  const rise = await sc(() => {
    const c = window.__course, p = c.player;
    c.setInput({ jump: true });
    let n = 0;
    for (; n < 1200 && (p.diving || p.state === 'swimUnder'); n++) { if (n % 50 === 0) { c.setInput({}); c.step(1); c.setInput({ jump: true }); } c.step(1); }
    c.setInput({}); c.step(60);
    return { n, state: p.state, diving: p.diving, y: +p.pos.y.toFixed(2), mode: p.mode };
  });
  console.log(`  Auftauchen: ${JSON.stringify(rise)}`);
  check('Auftauchen: Schwimmzüge/Sprung gehalten bringen die Figur wieder an die Oberfläche', rise.mode === 'swim' && rise.state === 'swim' && !rise.diving && rise.y > -0.6);
  await sc(() => window.__course.snapCamera());
  await frames(30);
  const uw2 = await T('uw');
  console.log(`  Ansicht an der Oberfläche: ${JSON.stringify(uw2)}`);
  check('Kamera-Haken: an der Oberfläche wieder normal (Nebel wie im Thema)', uw2 && uw2.k < 0.05 && uw2.fogFar > 200);
  // Strömung (current [3, 0, 0]) versetzt nach +X
  const cur = await sc(() => {
    const c = window.__course, p = c.player;
    p.reset([2, -4, -205], Math.PI / 2); c.step(2);
    p.diving = true;
    const x0 = p.pos.x;
    c.step(120);
    const inZone = { dx: +(p.pos.x - x0).toFixed(2) };
    p.reset([-5, -4, -215], Math.PI / 2); c.step(2); p.diving = true;
    const x1 = p.pos.x; c.step(120);
    inZone.out = +(p.pos.x - x1).toFixed(2);
    const ca = c.level.currentAt(5, -3, -205);
    inZone.api = [ca.x, ca.y, ca.z];
    return inZone;
  });
  console.log(`  Strömung: im Feld ${cur.dx} m/s·s, außerhalb ${cur.out}; currentAt ${JSON.stringify(cur.api)}`);
  check('Strömung versetzt die Figur (≈ 3 m in 1 s), außerhalb nicht', cur.dx > 2.5 && Math.abs(cur.out) < 0.2 && cur.api[0] === 3);
  // Wasserspiegel steigt und hebt die Figur; schwimmende Gegenstände steigen mit
  await T('place', [-4, 1.5, -214], { settle: 200 });
  const w0 = await sc(() => {
    const c = window.__course, L = c.level;
    L.spawn('schlittschuh', { id: 'boje', pos: [-7, -5, -220] });
    c.step(240);
    return { y: +c.player.pos.y.toFixed(2), top: L.waterLevel('see'), boje: +L.named.get('boje').pos.y.toFixed(2) };
  });
  const n = await sc(() => {
    const L = window.__course.level, b = L.named.get('boje');
    b.wl = 0; b.onWaterLevel = (shape, top, dy) => { if (dy > 0) b.wl++; };
    return L.setWaterLevel('see', 3.6, 2);
  });
  const w1 = await sc(() => {
    const c = window.__course, L = c.level;
    const tr = [];
    for (let k = 0; k < 300; k++) { c.step(1); if (k % 60 === 0) tr.push(+c.player.pos.y.toFixed(2)); }
    return { y: +c.player.pos.y.toFixed(2), top: L.waterLevel('see'), mode: c.player.mode, tr, boje: +L.named.get('boje').pos.y.toFixed(2), wl: L.named.get('boje').wl };
  });
  console.log(`  Wasserspiegel: ${w0.top} → ${w1.top} (${n} Form), Figur y ${w0.y} → ${w1.y} (${w1.tr.join(' ')}), Boje ${w0.boje} → ${w1.boje}`);
  check('Wasserspiegel steigt (setWaterLevel) und hebt die schwimmende Figur', n === 1 && Math.abs(w1.top - 3.6) < 0.01 && w1.y - w0.y > 2.7 && w1.mode === 'swim');
  check('Schwimmende Gegenstände (floats) treiben oben und steigen mit; onWaterLevel meldet den Anstieg', Math.abs(w0.boje - (0.6 - 0.12)) < 0.05 && Math.abs(w1.boje - (3.6 - 0.12)) < 0.05 && w1.wl > 100);
  await shot('wasserspiegel', 700);
  // Absenken sofort, Druckfeld am Beckenrand startet den Anstieg (Signal start)
  const sw = await sc(() => {
    const c = window.__course, L = c.level, p = c.player;
    L.setWaterLevel('see', 0.6, 0);
    c.step(2);
    const low = L.waterLevel('see');
    p.reset(L.data.marks.pf_see, Math.PI / 2); c.step(90);
    const top = L.waterLevel('see');
    c.step(240);
    return { low, top, after: L.waterLevel('see') };
  });
  console.log(`  Druckfeld: Wasser ${sw.low} → ${sw.top} → ${sw.after}`);
  check('Druckfeld { start: see } lässt das Wasser auf rise.to steigen', sw.low === 0.6 && sw.top > 0.7 && Math.abs(sw.after - 3.6) < 0.01);
  await sc(() => window.__course.level.setWaterLevel('see', 0.6, 0));
}

// ================================================================ Blick-Schnittstelle (Geister)
{
  await T('place', [0, 1, -235], { yaw: Math.PI / 2 });
  const fa = await sc(() => {
    const c = window.__course, L = c.level, p = c.player;
    return {
      front: L.isFacing(p, [0, 1, -240]), back: L.isFacing(p, [0, 1, -230]), side: L.isFacing(p, [5, 1, -235]),
      wide: L.isFacing(p, [3, 1, -237]), narrow: L.isFacing(p, [3, 1, -237], 30), any: L.anyFacing({ x: 0, y: 1, z: -240 }),
      dotF: +p.facingDot([0, 1, -240]).toFixed(2), dotB: +p.facingDot({ x: 0, z: -230 }).toFixed(2), dotS: +p.facingDot([5, 1, -235]).toFixed(2),
      nearest: L.isFacing(L.nearestPlayer({ x: 0, y: 1, z: -240 }), [0, 1, -240]),
    };
  });
  console.log(`  Blick: ${JSON.stringify(fa)}`);
  check('isFacing/facingDot: vorn ja, hinten/seitlich nein, Kegel ±70° (Standard) bzw. eigener Winkel', fa.front && !fa.back && !fa.side && fa.wide && !fa.narrow && fa.any && fa.nearest && fa.dotF === 1 && fa.dotB === -1 && Math.abs(fa.dotS) < 0.01);
  const st = await sc(() => {
    const c = window.__course, L = c.level, p = c.player;
    p.setPower('gleitblatt'); p.statueCool = 0;
    c.setInput({ crouch: true, action: true }); c.step(1); c.setInput({ crouch: true }); c.step(10);
    const r = { statue: p.statue, facing: L.isFacing(p, [0, 1, -240]) };
    c.setInput({}); c.step(120);
    return r;
  });
  check('isFacing: Statue (Skript-Modus) sieht nichts', st.statue && !st.facing);
}

// ================================================================ Kennzahlen
{
  await T('place', [0, 1, 5]);
  await shot('kennzahl_start', 1000);
  await T('place', [0, 1, -175]);
  await shot('kennzahl_zaun', 1000);
  console.log('\n  Kennzahlen (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
  for (const [nm, cl, t] of stats) console.log(`    ${nm.padEnd(16)} ${String(cl).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
  if (stats.length) check('Zeichenaufrufe im Budget (< 120 inkl. Schattenpass)', Math.max(...stats.map((s) => s[1])) < 120);
}

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
