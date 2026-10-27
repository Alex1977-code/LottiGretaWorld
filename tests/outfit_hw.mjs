// Halloween-Verkleidung der Figuren (Vertrag docs/KURS-ARCHITEKTUR.md „Präzisierung (Figuren Halloween): Verkleidung“):
// Lotti Hexenhut, Greta Katzenohren/-schwanz/Schnurrhaare, Pflaume Streifen-Halstuch und Fledermausflügelchen, Krümel
// Mini-Vampirumhang. Vite-Entwicklungsserver (wie tests/figurenstil.mjs: Avatar-Klassen, Modell-Register und der Schalter
// three/lib/outfit.js lassen sich im Browser laden); Kurs-Licht aus Level 1-1.
//
// Teile (OH_PARTS, Standard alle; je Lauf < 10 min, Teilläufe unter Last einzeln):
//   metrics  Kennzahlen je Figur als Differenz zweier Bilder (sichtbar/unsichtbar, inkl. Schattenpass, Figur-Bündel und
//            Schatten-Stellvertreter): ohne → mit → wieder ohne Verkleidung. Prüft Zeichenaufrufe mit ≤ ohne + 1, Dreiecke
//            mit ≤ 1,2 × ohne, wieder ohne exakt wie vorher (gleiche Aufrufe/Dreiecke), dazu Lauf/Sprung/Trapez/Kanone.
//   close    Nahansichten vorn/seitlich/hinten/Gesicht je Heldin mit und ohne Verkleidung, Kurs-Kamera
//   posen    Posen-Bogen mit Verkleidung: Lauf, Sprung, Fallen, Salto, Trapez (vorn/hinten), Kanone, Klettern (Wand, Ranke,
//            Zaun), Gleiten, Schwimmen (oben/unten), Statue, Tragen, Trage-Helm, klein, Jubel
//   costume  Power-up-Kostüme mit Verkleidung (Krallen, Funken, Stern, Gleitblatt, Riese)
//   pets     Pflaume (Stand, Hoppeln, Galopp, Sprung, Jubel, Kraftfarbe, Paddeln, Lampe), Reiten, Krümel (Modell und
//            KruemelRig), Gruppenbild, Kurs-Kamera
//   clones   Spiegelfrucht-Klone (lite) mit Verkleidung: ohne Schatten, Kennzahl
//   level    Schalter im Spiel: outfitForLevel/outfitForMap, CourseScene (LEVEL.outfit, Neustart), URL ?outfit=halloween,
//            echte Kurs-Kamera in 1-1, 1-4 (Ritt), 3-Kapitän (Krümel) – Gesamt-Zeichenaufrufe mit/ohne
//   hwlevel  Halloween-Testlevel 0-20/0-21/0-22 (ohne URL-Schalter): Szene setzt die Verkleidung, Bilder im Halloween-Thema
//   w5       Trapez und Röhrenkanone im echten Motor (Strandwerkstatt 0-17, ?outfit=halloween): Fäuste an der Stange, Zubehör
//            getragen, Zeichenaufrufe ≤ Stand-Pose; Bilder Seite/Kurs-Kamera
//   map      Kurs-Weltkarte: MAP.outfit setzt die Verkleidung, Karte ohne bleibt unverändert
// Bilder tests/out/outfit_hw_*.png, Übersichtsbögen outfit_hw_sheet_<gruppe>.png, Kennzahlen outfit_hw.json.
// Keine Konsolenfehler.
// Aufruf: PORT_BASE=0 node tests/outfit_hw.mjs   (Port 4550 + PORT_BASE; OH_PARTS=metrics,close OH_HEROES=lotti,greta;
// Kennzahlen-Teilläufe OH_ONLY=heldin bzw. OH_ONLY=pflaume,ritt,kruemel – unter Software-WebGL je Teil < 10 min)
import { createServer } from 'vite';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4550 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const PARTS = (process.env.OH_PARTS ?? 'metrics,close,posen,costume,pets,clones,level,hwlevel,w5,map').split(',').filter(Boolean);
const HEROES = (process.env.OH_HEROES ?? 'lotti,greta').split(',').filter(Boolean);
const on = (p) => PARTS.includes(p);

const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-oh`, logLevel: 'warn', clearScreen: false,
  server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false },
});
await server.listen();
const stop = async () => { try { await server.close(); } catch { /* schon zu */ } };
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const shots = [];
const metrics = existsSync(`${OUT}outfit_hw.json`) ? JSON.parse(readFileSync(`${OUT}outfit_hw.json`, 'utf8')) : {};
const base = `http://127.0.0.1:${PORT}`;

async function waitCourse(url) {
  await page.goto(url, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 240000 });
  } catch {
    console.log(`Kurs startet nicht (${url}). Konsole:`); for (const x of errors) console.log('  ', x);
    await browser.close(); await stop(); process.exit(1);
  }
  await page.waitForTimeout(400);
}

/** Prüfstand in 1-1 (wie figurenstil): HeroRig festgehalten, Pflaume (Hülle „pflaume“), Krümel-Modell, Kamera-Haken. */
async function openBench() {
  // nur Kennzahlen: Auflösung 1 (Aufrufe/Dreiecke hängen nicht davon ab, Software-WebGL rechnet schneller)
  const scale = PARTS.some((p) => ['close', 'posen', 'costume', 'pets', 'clones'].includes(p)) ? 2 : 1;
  await waitCourse(`${base}/?course=1-1&scale=${scale}&adapt=0`);
  await sc(async () => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
    const heroMod = await import('/src/three/avatars/hero.js');
    const outfit = await import('/src/three/lib/outfit.js');
    const reg = await import('/src/course/models/index.js');
    const kit = await import('/src/course/models/lib/kit.js');
    const krMod = await import('/src/course/archetypes/KruemelRig.js');
    const THREE = kit.THREE;
    const view = c.view;
    const H = window.__oh = { c, view, THREE, heroMod, outfit, reg, krMod, t: 10, dt: 1 / 60, figs: {}, cam: { mode: 'close', rel: -0.45, el: 0.12, dist: 2.6, fov: 30, h: 0.62 }, focus: null };
    H.base = c.player.pos.clone();
    const rig = c.rig;
    rig.update = () => {};
    H.figs.hero = { kind: 'hero', hull: rig.hull, get avatar() { return rig.avatar; }, rig, h: 1.0 };
    const pHull = new THREE.Group(); pHull.name = 'pflaume'; view.three.add(pHull);
    const pProxy = {
      texture: { key: 'pflaume' }, key: 'pflaume', x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true, flipX: false,
      body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }, power: 'none',
      course: { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: null, rider: null },
    };
    const pfl = new heroMod.PflaumeAvatar(view, pProxy);
    pfl.setCourseMode(true);
    pHull.add(pfl.root);
    H.figs.pflaume = { kind: 'pflaume', hull: pHull, avatar: pfl, h: 0.75, scale: 1.3 / 1.5 };
    const kHull = new THREE.Group(); kHull.name = 'kruemel-test'; view.three.add(kHull);
    const km = reg.getModel('kruemel');
    km.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    kHull.add(km.root);
    H.figs.kruemel = { kind: 'kruemel', hull: kHull, model: km, h: 0.5, scale: 1.35 };
    H.setOutfit = (k) => outfit.setOutfit(k, 'test');
    H.place = (key, dx = 0, dz = 0, yaw = Math.PI / 2, big = true, dy = 0) => {
      const f = H.figs[key];
      f.hull.position.set(H.base.x + dx, H.base.y + dy, H.base.z + dz);
      f.hull.rotation.set(0, yaw, 0);
      if (f.rig) f.rig.yaw = yaw;
      f.hull.scale.setScalar(f.kind === 'hero' ? (big ? 1 : 0.7) / 1.5 : f.scale);
      f.big = big;
      f.hull.visible = true;
    };
    H.hide = (key) => { H.figs[key].hull.visible = false; };
    H.place('hero'); H.place('pflaume', 0, -6); H.place('kruemel', 0, -8);
    H.hide('pflaume'); H.hide('kruemel');
    /** Blinzeln aus (Augen offen): offene und geschlossene Augen sind verschiedene Meshes – Kennzahlen bleiben vergleichbar. */
    H.noBlink = false;   // nur während der Kennzahlen (triple)
    H.freezeBlink = (f) => {
      if (f.avatar) {
        const av = f.avatar;
        if (!av.__fb) { av.__fb = true; const u = av.blinker.update.bind(av.blinker); av.blinker.update = (...a) => (H.noBlink ? 1 : u(...a)); }
        return;
      }
      const root = f.rig ? f.rig.model.root : f.model.root;
      root.traverse((o) => { if (typeof o.userData?.blink === 'function' && !o.userData.__fb) { const b = o.userData.blink; o.userData.blink = (k) => b(H.noBlink ? 1 : k); o.userData.__fb = true; } });
    };
    H.pose = (key, cc = {}, n = 30) => {
      const f = H.figs[key];
      H.freezeBlink(f);
      for (let i = 0; i < n; i++) {
        H.t += H.dt;
        if (f.kind === 'kruemel') { if (f.rig) { Object.assign(f.player, cc.player ?? {}); f.rig.update(H.dt, H.t); } else f.model.update(H.dt, cc); continue; }
        const av = f.avatar;
        av.obj.course = f.kind === 'hero'
          ? { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: f.big ?? true, holding: false, climbing: false, ...cc }
          : { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: null, rider: null, ...cc };
        av.animate(H.dt, H.t);
        if (av.mouthO && f.kind === 'hero') av.mouthO.visible = av.mouthO.scale.x > 0.004;   // wie HeroRig.update
      }
    };
    H.size = (f) => (f.kind === 'hero' ? f.hull.scale.y * 1.5 : f.kind === 'pflaume' ? 0.9 * f.hull.scale.y / (1.3 / 1.5) : 1.0 * f.hull.scale.y / 1.35);
    view.rig.custom = () => {
      const cam = view.camera, k = H.cam, f = H.figs[H.focus ?? 'hero'];
      const s = H.size(f);
      const tg = new THREE.Vector3().copy(f.hull.position);
      let az;
      if (k.mode === 'course') { tg.y += 1.0; az = k.az ?? 0; } else { tg.y += k.h * s; az = k.az ?? f.hull.rotation.y + Math.PI / 2 + k.rel; }
      if (k.target) tg.set(k.target[0], k.target[1], k.target[2]);
      const d = k.mode === 'course' ? (k.dist ?? 13) : k.dist * (0.4 + 0.6 * s);
      cam.position.set(tg.x + d * Math.cos(k.el) * Math.sin(az), tg.y + d * Math.sin(k.el), tg.z + d * Math.cos(k.el) * Math.cos(az));
      cam.lookAt(tg);
      const fov = k.mode === 'course' ? 38 : k.fov;
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
      view.rig.target.copy(tg);
      return true;
    };
    H.screen = (key, up = 0.5) => {
      const f = H.figs[key];
      const v = new THREE.Vector3().copy(f.hull.position); v.y += up * f.hull.scale.y * 1.5;
      v.project(view.camera);
      return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
    };
    const grab = () => { c.renderFrame(); const r = view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
    H.cost = (keys) => {
      const hulls = keys.map((k) => H.figs[k].hull);
      grab();
      const a = grab();
      for (const h of hulls) h.visible = false;
      grab();
      const b = grab();
      for (const h of hulls) h.visible = true;
      grab();
      return { calls: a.calls - b.calls, tris: a.tris - b.tris };
    };
    // Mehrfach messen, häufigstes Ergebnis (Szenen-Culling wechselt gelegentlich zwischen zwei Bildern)
    const cost1 = H.cost;
    H.cost = (keys) => {
      const a = cost1(keys), b = cost1(keys);
      if (a.calls === b.calls && a.tris === b.tris) return a;
      const c3 = cost1(keys);
      return c3.calls === b.calls && c3.tris === b.tris ? b : a;
    };
    H.frames = (n) => { for (let i = 0; i < n; i++) c.renderFrame(); };
    /** Sichtbare Teile einer Figur (Fehlersuche bei abweichenden Kennzahlen). */
    H.vis = (key) => {
      const out = [];
      H.figs[key].hull.traverseVisible((o) => { if (o.isMesh || o.isSprite || o.isLine) out.push(`${o.type}:${o.name || '-'}:${o.geometry?.index ? o.geometry.index.count / 3 : (o.geometry?.attributes.position.count ?? 0) / 3}`); });
      return out.join(' ');
    };
    /** Zustand des Zubehörs (Prüfungen). */
    H.parts = (key) => {
      const f = H.figs[key];
      if (f.kind === 'kruemel') {
        let cape = null; f.hull.traverse((o) => { if (o.name === 'umhang') cape = o; });
        return { cape: !!cape && !!cape.parent, pack: f.rig ? f.rig.gear.pack.visible : null };
      }
      const av = f.avatar, hw = av.hw;
      if (f.kind === 'pflaume') return { outfit: av.outfit, wings: !!hw?.root.parent, bandana: av.bandana.material === hw?.bandanaMat, color: av.bandana.material.color.getHexString() };
      const lotti = av.variant === 'lotti';
      const head = lotti ? !!hw?.hat?.parent : !!av.lookHead && av.hairMesh.geometry !== av.look0.hair;
      return {
        outfit: av.outfit, head, headName: head ? (lotti ? 'hexenhut' : 'katzenohren') : null, tail: !!hw?.tail?.anchor.parent,
        shadow: lotti && hw?.hat?.parent ? hw.hat.castShadow : null, whiskers: av.headMesh.geometry !== av.look0.head, bow: av.hairMesh.geometry === av.look0.hair,
      };
    };
    // Heldin wechseln (nur bei anderer Variante: ein Neubau derselben Variante behält in view/ShadowProxy.js das alte
    // Figur-Bündel – gleiche geteilte Geometrien, gleiche Signatur –, das verfälscht die Kennzahlen; im Spiel tritt das nicht auf)
    H.setHero = (k) => { const r = H.figs.hero.rig; if (r.avatar?.variant !== k) { r.player.hero = k; r.build(k); } H.place('hero'); };
  });
}

const VIEWS = {
  front: { mode: 'close', rel: -0.5, el: 0.12, dist: 2.7, fov: 30, h: 0.6 },
  front0: { mode: 'close', rel: 0, el: 0.1, dist: 2.7, fov: 30, h: 0.6 },
  face: { mode: 'close', rel: -0.42, el: 0.06, dist: 1.25, fov: 30, h: 0.8 },
  side: { mode: 'close', rel: -Math.PI / 2, el: 0.08, dist: 2.7, fov: 30, h: 0.6 },
  back: { mode: 'close', rel: Math.PI - 0.4, el: 0.3, dist: 2.7, fov: 30, h: 0.6 },
  top: { mode: 'close', rel: Math.PI - 0.7, el: 0.75, dist: 2.7, fov: 30, h: 0.6 },
  course: { mode: 'course', el: Math.PI / 4, az: 0 },
};
const cam = (v, extra = {}) => sc(([v, e]) => { window.__oh.cam = { ...v, ...e }; }, [v, extra]);
const focus = (key) => sc((k) => { window.__oh.focus = k; }, key);
const pose = (key, cc, n = 30) => sc(([k, cc, n]) => window.__oh.pose(k, cc, n), [key, cc ?? {}, n]);
const place = (key, ...a) => sc(([k, a]) => window.__oh.place(k, ...a), [key, a]);
const hide = (key) => sc((k) => window.__oh.hide(k), key);
const outfit = (k) => sc((k) => window.__oh.setOutfit(k), k);
const parts = (key) => sc((k) => window.__oh.parts(k), key);
const cost = (keys) => sc((k) => window.__oh.cost(k), keys);
async function shot(name, view, group, o = {}) {
  await cam(VIEWS[view], o.cam ?? {});
  await sc(() => window.__oh.frames(3));
  let clip = { x: 280, y: 40, width: 400, height: 460 };
  if (view === 'course') {
    const p = await sc((k) => window.__oh.screen(k, 0.5), o.focus ?? 'hero');
    const w = o.w ?? 320, h = o.h ?? 240;
    clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
  }
  if (o.clip) clip = o.clip;
  const path = `${OUT}outfit_hw_${name}.png`;
  try { await page.screenshot({ path, clip, timeout: 120000 }); shots.push({ name, path, group }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}
const log = (name, m) => console.log(`  ${name.padEnd(34)} Aufrufe ${String(m.calls).padStart(3)}  Dreiecke ${String(m.tris).padStart(6)}`);

// ---------------------------------------------------------------- Kennzahlen
/** ohne → mit → wieder ohne; Pose/Modellzustand cc, n Bilder je Schritt. */
async function triple(label, key, cc, keys = [key], n = 40, poser = null) {
  const doPose = () => (poser ? poser(n) : pose(key, cc, n));
  await cam(VIEWS.front, { dist: 4.5 });   // ganze Figur samt Ohren/Hut sicher im Bild (kein Kamera-Culling einzelner Teile)
  await sc(() => { window.__oh.noBlink = true; });
  const vis = (k) => sc((x) => window.__oh.vis(x), k);
  await outfit(null); await doPose();
  await sc(() => window.__oh.frames(6));   // Aufwärmen (Bündel/Stellvertreter neu aufgebaut, Shader übersetzt)
  const off = await cost(keys);
  const v0 = await vis(key);
  await outfit('halloween'); await doPose();
  await sc(() => window.__oh.frames(4));
  const hw = await cost(keys);
  const p = await parts(key);
  await outfit(null); await doPose();
  await sc(() => window.__oh.frames(4));
  const off2 = await cost(keys);
  if (off2.calls !== off.calls || off2.tris !== off.tris) console.log(`    vorher: ${v0}\n    nachher: ${await vis(key)}`);
  await sc(() => { window.__oh.noBlink = false; });
  metrics[label] = { off, hw, off2 };
  log(`${label} ohne`, off); log(`${label} Halloween`, hw); log(`${label} wieder ohne`, off2);
  check(`${label}: Zeichenaufrufe mit Verkleidung ${hw.calls} ≤ ohne ${off.calls} + ${keys.length}`, hw.calls <= off.calls + keys.length);
  check(`${label}: Dreiecke mit Verkleidung ${hw.tris} ≤ 1,2 × ${off.tris} (${(hw.tris / Math.max(1, off.tris)).toFixed(2)}×)`, hw.tris <= 1.2 * off.tris);
  check(`${label}: wieder ohne Verkleidung exakt wie vorher (${off2.calls}/${off2.tris} = ${off.calls}/${off.tris})`, off2.calls === off.calls && off2.tris === off.tris);
  return { off, hw, off2, parts: p };
}

async function metricsPart() {
  const only = (process.env.OH_ONLY ?? 'heldin,pflaume,ritt,kruemel').split(',');
  for (const key of only.includes('heldin') ? HEROES : []) {
    await sc((k) => window.__oh.setHero(k), key);
    await focus('hero'); await place('hero');
    const r = await triple(`${key} idle`, 'hero', { state: 'idle' });
    if (key === 'lotti') check('Lotti: Hexenhut am Kopf (Stoff, wirft Schatten), Haar ohne Schleife (sie sitzt am Hut)', r.parts.head && r.parts.headName === 'hexenhut' && r.parts.shadow === true && !r.parts.bow);
    else check('Greta: Katzenohren, Katzenschwanz, Schnurrhaare', r.parts.head && r.parts.headName === 'katzenohren' && r.parts.tail && r.parts.whiskers);
    await triple(`${key} lauf`, 'hero', { state: 'run', speed: 8 });
    await triple(`${key} sprung`, 'hero', { state: 'jump', vy: 4, grounded: false });
    await triple(`${key} trapez`, 'hero', { state: 'trapeze', swing: 0.5, swingVel: 0.3, phase: 0.5, grounded: false });
    await triple(`${key} kanone`, 'hero', { state: 'cannon', phase: 0.45, speed: 9, vy: 2, grounded: false });
    await place('hero', 0, 0, Math.PI / 2, false);
    await triple(`${key} klein`, 'hero', { state: 'idle', big: false });
    await place('hero');
  }
  await place('hero'); await hide('hero');
  await focus('pflaume'); await place('pflaume');
  if (only.includes('pflaume')) {
    const pr = await triple('pflaume idle', 'pflaume', { state: 'idle' });
    check(`Pflaume: Flügelchen und Streifen-Halstuch (orange: ${pr.parts.color})`, pr.parts.wings && pr.parts.bandana && pr.parts.color === 'ff8a1e');
    await triple('pflaume hoppeln', 'pflaume', { state: 'walk', speed: 2 });
  }
  // Ritt: Heldin (erste aus OH_HEROES) auf Pflaume (beide Hüllen 1 m wie im Floß-Level), zwei Figuren → höchstens +2
  await place('pflaume', 0, 0, Math.PI / 2 - 1.1); await place('hero', 0, 0, Math.PI / 2 - 1.1, true, 0.5);
  await sc(() => { const H = window.__oh; H.figs.pflaume.hull.scale.setScalar(1 / 1.5); });
  // Stand (speed 0): Hoppel-Takt und offener Mund wechseln sonst zwischen den Messungen
  const ridePose = (n) => sc((n) => {
    const H = window.__oh, av = H.figs.hero.avatar;
    for (let i = 0; i < n; i++) { H.pose('hero', { state: 'ride', speed: 0 }, 1); H.t -= H.dt; H.pose('pflaume', { state: 'ride', speed: 0, rider: av }, 1); }
  }, n);
  if (only.includes('ritt')) await triple('ritt', 'pflaume', {}, ['hero', 'pflaume'], 40, ridePose);
  await place('pflaume'); await place('hero'); await hide('hero');
  await hide('pflaume');
  if (!only.includes('kruemel')) { await place('hero'); await outfit('halloween'); return; }
  await focus('kruemel'); await place('kruemel');
  const kr = await triple('kruemel idle', 'kruemel', { anim: 'idle' });
  check('Krümel (Modell): Mini-Vampirumhang', kr.parts.cape);
  await triple('kruemel hüpfen', 'kruemel', { anim: 'hop' });
  // Kapitän-Rig (KruemelRig): Umhang, Mütze bleibt, Rucksack unter dem Umhang
  await sc(() => {
    const H = window.__oh, THREE = H.THREE;
    const pl = { pos: H.base.clone(), yaw: -Math.PI / 2 + 0.45, vel: { x: 0, y: 0, z: 0 }, mode: 'ground', state: 'idle', big: true, invuln: 0 };
    const rig = new H.krMod.KruemelRig(H.view, pl);
    H.figs.krig = { kind: 'kruemel', hull: rig.hull, rig, player: pl, scale: 1.35 };
    H.figs.kruemel.hull.visible = false;
  });
  await focus('krig');
  const kg = await triple('kruemel kapitän', 'krig', {});
  check(`KruemelRig: Umhang, Kapitänsmütze bleibt, Rucksack unter dem Umhang (${JSON.stringify(kg.parts)})`, kg.parts.cape && kg.parts.pack === false);
  await sc(() => { const H = window.__oh; H.figs.krig.rig.dispose(); delete H.figs.krig; H.figs.kruemel.hull.visible = true; });
  await hide('kruemel');
  await place('hero');
  await outfit('halloween');
}

// ---------------------------------------------------------------- Nahansichten
async function closePart(key) {
  const P = key, G = `${P}_nah`;
  await sc((k) => window.__oh.setHero(k), key);
  await focus('hero'); await place('hero');
  for (const k of [null, 'halloween']) {
    await outfit(k);
    await pose('hero', { state: 'idle' }, 60);
    const tag = k ? 'hw' : 'ohne';
    for (const v of ['front', 'side', 'back', 'face']) await shot(`${P}_${v}_${tag}`, v, G);
    if (k) { await shot(`${P}_top_hw`, 'top', G); await shot(`${P}_front0_hw`, 'front0', G); }
    await shot(`${P}_course_${tag}`, 'course', `${P}_kurs`);
  }
  // Kurs-Kamera: Lauf von der Seite, von vorn
  await place('hero', 0, 0, 0); await pose('hero', { state: 'run', speed: 8 }, 40); await shot(`${P}_course_run_hw`, 'course', `${P}_kurs`);
  await place('hero', 0, 0, -Math.PI / 2 + 0.3); await pose('hero', { state: 'idle' }, 40); await shot(`${P}_course_front_hw`, 'course', `${P}_kurs`);
  await place('hero');
}

// ---------------------------------------------------------------- Posen-Bogen
async function posenPart(key) {
  const P = key, G = `${P}_posen`, S = { cam: { dist: 3.0 } };
  await sc((k) => window.__oh.setHero(k), key);
  await outfit('halloween');
  await focus('hero'); await place('hero');
  await pose('hero', { state: 'idle' }, 30);
  const list = [
    ['lauf', { state: 'run', speed: 8 }, 40, 'side'],
    ['gehen', { state: 'walk', speed: 3 }, 40, 'front'],
    ['sprung', { state: 'jump', vy: 5, grounded: false }, 14, 'front'],
    ['fallen', { state: 'fall', vy: -9, grounded: false }, 40, 'front'],
    ['landen', { state: 'land' }, 3, 'front'],
    ['trapez_vorn', { state: 'trapeze', swing: 0.75, swingVel: 0, phase: 0.8, grounded: false }, 30, 'side'],
    ['trapez_durch', { state: 'trapeze', swing: 0, swingVel: -2.4, phase: 0.2, grounded: false }, 30, 'side'],
    ['trapez_hinten', { state: 'trapeze', swing: -0.7, swingVel: 0, phase: 0.8, grounded: false }, 30, 'back'],
    ['kanone', { state: 'cannon', phase: 0.35, speed: 10, vy: 3, grounded: false }, 30, 'side'],
    ['kanone_landen', { state: 'cannon', phase: 0.92, speed: 4, vy: -2, grounded: false }, 30, 'front'],
    ['klettern', { state: 'climb', vy: 3, grounded: false }, 40, 'back'],
    ['ranke', { state: 'beanstalk', vy: 2, grounded: false }, 40, 'back'],
    ['zaun', { state: 'fence', fenceMove: { x: 0, y: 1 }, grounded: false }, 40, 'back'],
    ['wandrutschen', { state: 'wallslide', vy: -2, grounded: false }, 30, 'front'],
    ['schwimmen', { state: 'swim', speed: 3 }, 40, 'side'],
    ['tauchen', { state: 'swimUnder', speed: 2 }, 60, 'side'],
    ['hocke', { state: 'crouch' }, 20, 'front'],
    ['rutschen', { state: 'slide', speed: 8 }, 20, 'side'],
    ['weitsprung', { state: 'longjump', grounded: false, vy: 1, speed: 9 }, 20, 'side'],
    ['stampfen', { state: 'groundpound', phase: 0.6, grounded: false, vy: -8 }, 12, 'side'],
    ['tragen', { state: 'idle', holding: 'over' }, 30, 'front'],
    ['jubel', { state: 'victory' }, 50, 'front'],
    ['werfen', { state: 'throw', phase: 0.45 }, 4, 'front'],
    ['statue', { state: 'statue', grounded: true }, 40, 'front'],
    ['tot', { state: 'dead', grounded: false }, 20, 'front'],
  ];
  for (const [name, c, n, view] of list) {
    if (name === 'tauchen' || name === 'schwimmen') await place('hero', 0, 0, Math.PI / 2, true, 0.4);
    await pose('hero', c, n);
    await shot(`${P}_${name}`, view, G, S);
    if (name === 'tauchen' || name === 'schwimmen') await place('hero');
  }
  // Salto (Phase exakt)
  for (const [st, ph] of [['jump3', 0.4], ['backflip', 0.45]]) {
    await pose('hero', { state: st, phase: 0, grounded: false, vy: 5 }, 6);
    for (let i = 1; i <= 8; i++) await pose('hero', { state: st, phase: (ph * i) / 8, grounded: false, vy: 5 - i }, 1);
    await shot(`${P}_${st}`, 'side', G, S);
  }
  // Gleiten (Gleitblatt-Kostüm: dessen Blatt-Ohren/-Schweif ersetzen Hut bzw. Ohren und Schwanz)
  await pose('hero', { state: 'glide', power: 'gleitblatt', grounded: false, vy: -1.5, speed: 3 }, 60); await shot(`${P}_gleiten`, 'front', G, S);
  // Trage-Helm (HeroRig.setHelmet): Kopfschmuck ruht, ohne Helm wieder da
  const helm = await sc(() => {
    const H = window.__oh, r = H.figs.hero.rig;
    r.setHelmet('propeller'); H.pose('hero', { state: 'idle' }, 10);
    const a = H.parts('hero');
    return a;
  });
  await shot(`${P}_helm`, 'front', G, S);
  const helm2 = await sc(() => { const H = window.__oh, r = H.figs.hero.rig; r.setHelmet(null); H.pose('hero', { state: 'idle' }, 10); return H.parts('hero'); });
  check(`${P}: unter dem Trage-Helm ruht der Kopfschmuck, ohne Helm wieder da`, !helm.head && helm2.head);
  // klein
  await place('hero', 0, 0, Math.PI / 2, false);
  await pose('hero', { state: 'idle', big: false, power: 'none' }, 30); await shot(`${P}_klein`, 'front', G); await shot(`${P}_klein_kurs`, 'course', G);
  await place('hero');
  await pose('hero', { state: 'idle', power: 'none' }, 30);
}

// ---------------------------------------------------------------- Kostüme
async function costumePart(key) {
  const P = key, G = `${P}_kostuem`;
  await sc((k) => window.__oh.setHero(k), key);
  await outfit('halloween');
  await focus('hero'); await place('hero');
  const res = {};
  for (const power of ['krallen', 'funken', 'stern', 'gleitblatt', 'riese']) {
    await pose('hero', { state: 'idle', power }, 30);
    res[power] = await parts('hero');
    await shot(`${P}_${power}`, 'front', G); await shot(`${P}_${power}_hinten`, 'back', G);
  }
  await pose('hero', { state: 'idle', power: 'none' }, 30);
  res.none = await parts('hero');
  console.log(`  ${P} Kostüme: ${JSON.stringify(res)}`);
  check(`${P}: Krallen/Gleitblatt ersetzen Kopfschmuck und Schwanz, Funken/Stern/Riese tragen die Verkleidung, danach wieder da`,
    !res.krallen.head && !res.krallen.tail && !res.gleitblatt.head && !res.gleitblatt.tail && res.funken.head && res.stern.head && res.riese.head && res.none.head
    && (key === 'lotti' || (res.funken.tail && res.stern.tail && res.none.tail)));
  // Stern: Regenbogen-Glanz erfasst das Zubehör (Materialkopie)
  const glow = await sc(() => {
    const H = window.__oh;
    H.pose('hero', { state: 'idle', power: 'none' }, 4);
    H.setOutfit(null); H.pose('hero', { state: 'idle', power: 'stern' }, 4);
    H.setOutfit('halloween'); H.pose('hero', { state: 'idle', power: 'stern' }, 4);
    const av = H.figs.hero.avatar, m = av.hw.hat ?? av.hw.tail.mesh;
    const ok = !!av.glow.entries.get(m) && m.material === av.glow.entries.get(m).glow;
    H.pose('hero', { state: 'idle', power: 'none' }, 4);
    return ok;
  });
  check(`${P}: Stern-Glanz erfasst das später angelegte Zubehör`, glow);
  await pose('hero', { state: 'idle', power: 'none' }, 20);
}

// ---------------------------------------------------------------- Pflaume, Reiten, Krümel
async function petsPart() {
  await outfit('halloween');
  await place('hero'); await hide('hero');
  await focus('pflaume'); await place('pflaume');
  const PC = { h: 0.5, dist: 3.8 };
  for (const k of [null, 'halloween']) {
    await outfit(k);
    await pose('pflaume', { state: 'idle' }, 60);
    const tag = k ? 'hw' : 'ohne';
    await shot(`pflaume_vorn_${tag}`, 'front', 'pflaume', { cam: PC }); await shot(`pflaume_seite_${tag}`, 'side', 'pflaume', { cam: { ...PC, dist: 4.4 } });
    await shot(`pflaume_hinten_${tag}`, 'back', 'pflaume', { cam: PC });
  }
  await shot('pflaume_oben_hw', 'top', 'pflaume', { cam: PC });
  await pose('pflaume', { state: 'walk', speed: 2 }, 33); await shot('pflaume_hoppeln', 'side', 'pflaume_pose', { cam: { ...PC, dist: 4.4 } });
  await pose('pflaume', { state: 'walk', speed: 2 }, 9); await shot('pflaume_hoppeln2', 'back', 'pflaume_pose', { cam: { ...PC, dist: 4.4 } });
  await pose('pflaume', { state: 'run', speed: 6 }, 30); await shot('pflaume_galopp', 'side', 'pflaume_pose', { cam: { ...PC, dist: 4.4 } });
  await pose('pflaume', { state: 'jump', vy: 4, grounded: false }, 14); await shot('pflaume_sprung', 'side', 'pflaume_pose', { cam: { ...PC, dist: 4.4 } });
  await pose('pflaume', { state: 'victory' }, 20); await shot('pflaume_jubel', 'front', 'pflaume_pose', { cam: { ...PC, h: 0.7 } });
  await pose('pflaume', { state: 'idle', power: 'red' }, 20); await shot('pflaume_kraft_rot', 'front', 'pflaume_pose', { cam: PC });
  const red = await parts('pflaume');
  check(`Pflaume: mit Kraft Streifen in der Kraftfarbe (${red.color})`, red.color === 'e0393f');
  await pose('pflaume', { state: 'idle', power: 'none', gear: 'lamp' }, 30); await shot('pflaume_lampe', 'back', 'pflaume_pose', { cam: PC });
  await pose('pflaume', { state: 'paddle', speed: 1, gear: null }, 40); await shot('pflaume_paddeln', 'side', 'pflaume_pose', { cam: { ...PC, dist: 4.8, h: 0.4, el: 0.3 } });
  await pose('pflaume', { state: 'dig' }, 20); await shot('pflaume_buddeln', 'side', 'pflaume_pose', { cam: { ...PC, dist: 4.4 } });
  await pose('pflaume', { state: 'idle' }, 30);
  await shot('pflaume_kurs', 'course', 'pflaume', { focus: 'pflaume' });
  // Reiten: Heldin auf Pflaume (beide Hüllen 1 m wie im Floß-Level), Lotti und Greta
  for (const key of HEROES) {
    await sc((k) => window.__oh.setHero(k), key);
    await place('pflaume', 0, 0, Math.PI / 2 - 1.1); await place('hero', 0, 0, Math.PI / 2 - 1.1, true, 0.5);
    await sc(() => { const H = window.__oh; H.figs.pflaume.hull.scale.setScalar(1 / 1.5); });
    for (let i = 0; i < 30; i++) {
      await sc(() => { const H = window.__oh, av = H.figs.hero.avatar; H.pose('hero', { state: 'ride', speed: 4 }, 1); H.t -= H.dt; H.pose('pflaume', { state: 'ride', speed: 4, rider: av }, 1); });
    }
    await focus('pflaume');
    await shot(`ritt_${key}`, 'front', 'ritt', { cam: { h: 0.75, dist: 3.4, rel: -1.0 } });
    await shot(`ritt_${key}_hinten`, 'back', 'ritt', { cam: { h: 0.75, dist: 3.4 } });
    await shot(`ritt_${key}_kurs`, 'course', 'ritt', { focus: 'pflaume' });
    if (key === HEROES[0]) {
      const m = await cost(['hero', 'pflaume']);
      metrics['ritt halloween'] = m; log('ritt (heldin + pflaume) halloween', m);
    }
  }
  await place('pflaume'); await hide('pflaume');
  await place('hero');
  await sc(() => window.__oh.setHero('lotti'));
  // Krümel (Modell)
  await hide('hero');
  await focus('kruemel'); await place('kruemel');
  for (const k of [null, 'halloween']) {
    await outfit(k);
    await pose('kruemel', { anim: 'idle' }, 40);
    const tag = k ? 'hw' : 'ohne';
    await shot(`kruemel_vorn_${tag}`, 'front', 'kruemel', { cam: { h: 0.5 } }); await shot(`kruemel_seite_${tag}`, 'side', 'kruemel', { cam: { h: 0.5 } });
    await shot(`kruemel_hinten_${tag}`, 'back', 'kruemel', { cam: { h: 0.5 } });
  }
  await pose('kruemel', { anim: 'hop' }, 13); await shot('kruemel_huepfen', 'side', 'kruemel', { cam: { h: 0.5 } });
  await pose('kruemel', { anim: 'scared' }, 30); await shot('kruemel_angst', 'front', 'kruemel', { cam: { h: 0.5 } });
  await pose('kruemel', { anim: 'cheer' }, 20); await shot('kruemel_jubel', 'front', 'kruemel', { cam: { h: 0.5 } });
  await pose('kruemel', { anim: 'idle' }, 20);
  // Kapitän-Rig
  await sc(() => {
    const H = window.__oh;
    const pl = { pos: H.base.clone(), yaw: -Math.PI / 2 + 0.45, vel: { x: 0, y: 0, z: 0 }, mode: 'ground', state: 'idle', big: true, invuln: 0 };
    const rig = new H.krMod.KruemelRig(H.view, pl);
    H.figs.krig = { kind: 'kruemel', hull: rig.hull, rig, player: pl, scale: 1.35 };
    H.figs.kruemel.hull.visible = false;
  });
  await focus('krig');
  await pose('krig', {}, 40);
  await shot('kruemel_kapitaen', 'front0', 'kruemel', { cam: { h: 0.55, az: 0.25 } });
  await shot('kruemel_kapitaen_hinten', 'back', 'kruemel', { cam: { h: 0.55 } });
  await pose('krig', { player: { vel: { x: 2, y: 0, z: 0 } } }, 20); await shot('kruemel_kapitaen_lauf', 'side', 'kruemel', { cam: { h: 0.55 } });
  await shot('kruemel_kapitaen_kurs', 'course', 'kruemel', { focus: 'krig' });
  await sc(() => { const H = window.__oh; H.figs.krig.rig.dispose(); delete H.figs.krig; });
  await place('hero');
  // Gruppenbild: Lotti, Pflaume, Krümel, Greta
  await sc(() => window.__oh.setHero('lotti'));
  await place('hero', -1.05, 0, -Math.PI / 2 + 0.3); await place('pflaume', 0.15, -0.15, -Math.PI / 2 + 0.55); await place('kruemel', 1.25, 0.15, -Math.PI / 2 + 0.35);
  await pose('hero', { state: 'idle' }, 30); await pose('pflaume', { state: 'idle' }, 30); await pose('kruemel', { anim: 'idle' }, 30);
  await focus('pflaume');
  const tgt = await sc(() => { const b = window.__oh.base; return [b.x + 0.05, b.y + 0.5, b.z]; });
  await shot('gruppe', 'front0', 'gruppe', { cam: { target: tgt, dist: 4.8, el: 0.1, az: 0 }, clip: { x: 130, y: 70, width: 700, height: 400 } });
  await shot('gruppe_kurs', 'course', 'gruppe', { focus: 'pflaume', cam: { az: 0.0 }, w: 360, h: 260 });
  await sc(() => window.__oh.setHero('greta'));
  await place('hero', -1.05, 0, -Math.PI / 2 + 0.3);
  await pose('hero', { state: 'idle' }, 30);
  await shot('gruppe_greta', 'front0', 'gruppe', { cam: { target: tgt, dist: 4.8, el: 0.1, az: 0 }, clip: { x: 130, y: 70, width: 700, height: 400 } });
  await hide('pflaume'); await hide('kruemel');
  await sc(() => window.__oh.setHero('lotti'));
  await place('hero');
}

// ---------------------------------------------------------------- Klone
async function clonesPart() {
  await outfit('halloween');
  for (const key of HEROES) {
    await sc((k) => window.__oh.setHero(k), key);
    const ok = await sc(() => {
      const H = window.__oh, c = H.c;
      H.clones = [];
      for (const dz of [-1.3, 1.3]) {
        const f = c.level.addClone(c.player);
        if (!f) continue;
        const rig = c.squad.rigs.get(f);
        rig.update = () => {};
        if (rig.key !== c.player.hero) rig.build(c.player.hero);
        const key = `klon${H.clones.length}`;
        H.figs[key] = { kind: 'hero', hull: rig.hull, get avatar() { return rig.avatar; }, rig, h: 1.0 };
        H.place(key, 1.1, dz);
        H.clones.push(key);
      }
      H.place('hero');
      return H.clones.length;
    });
    check(`${key}: zwei Klone (lite) angelegt`, ok === 2);
    if (ok !== 2) return;
    for (const k of ['hero', 'klon0', 'klon1']) await pose(k, { state: 'idle' }, 40);
    const lite = await sc(() => {
      const H = window.__oh, av = H.figs.klon0.avatar;
      let shadow = false;
      for (const o of [av.hw?.hat, av.hw?.tail?.mesh]) if (o?.castShadow) shadow = true;
      return { parts: H.parts('klon0'), shadow };
    });
    check(`${key}: Klon trägt die Verkleidung ohne Schattenwurf (${JSON.stringify(lite.parts)})`, lite.parts.head && !lite.shadow);
    await focus('klon0');
    const m = await cost(['klon0']); metrics[`${key} klon halloween`] = m; log(`${key} klon (lite) halloween`, m);
    await focus('hero');
    await sc(() => { const H = window.__oh; for (const k of ['hero', ...H.clones]) H.figs[k].hull.rotation.y = -Math.PI / 2 + 0.25; });
    const ktg = await sc(() => { const b = window.__oh.base; return [b.x + 0.55, b.y + 0.5, b.z]; });
    await shot(`${key}_klone`, 'front0', 'klone', { cam: { target: ktg, dist: 5.2, az: 0.45, el: 0.22 } });
    await sc(() => { const H = window.__oh; for (const k of ['hero', ...H.clones]) H.figs[k].hull.rotation.y = Math.PI / 2; });
    for (const k of ['hero', 'klon0', 'klon1']) await pose(k, { state: 'run', speed: 7 }, 30);
    await shot(`${key}_klone_kurs`, 'course', 'klone', { w: 360, h: 260 });
    await sc(() => { const H = window.__oh, c = H.c; for (const k of H.clones) delete H.figs[k]; c.squad?.clear?.(); H.clones = []; });
  }
}

// ---------------------------------------------------------------- Schalter im Spiel
async function levelPart() {
  await waitCourse(`${base}/?course=1-1&scale=2&adapt=0`);
  const logic = await sc(async () => {
    const o = await import('/src/three/lib/outfit.js');
    return {
      h1: o.outfitForLevel('H-1', { world: 31 }), hk: o.outfitForLevel('H-Kapitän', {}), t20: o.outfitForLevel('0-20', { world: 0 }), t22: o.outfitForLevel('0-22', {}),
      w1: o.outfitForLevel('1-1', { world: 1 }), own: o.outfitForLevel('1-1', { outfit: 'halloween' }), off: o.outfitForLevel('H-2', { outfit: null }), w31: o.outfitForLevel('X-1', { world: 31 }),
      flag: o.outfitForLevel('0-99', { world: 0, halloween: true }),
      m31: o.outfitForMap({ world: 31 }), m1: o.outfitForMap({ world: 1 }), mo: o.outfitForMap({ world: 1, outfit: 'halloween' }), m31off: o.outfitForMap({ world: 31, outfit: null }),
      scene: window.__course.outfit, av: window.__course.rig.avatar.outfit,
    };
  });
  console.log(`  Schalter: ${JSON.stringify(logic)}`);
  check('outfitForLevel: H-…, Welt 31, LEVEL.halloween, Testlevel 0-20/0-22, LEVEL.outfit → halloween; 1-1, LEVEL.outfit null → aus',
    logic.h1 === 'halloween' && logic.hk === 'halloween' && logic.t20 === 'halloween' && logic.t22 === 'halloween' && logic.w1 === null && logic.own === 'halloween' && logic.off === null && logic.w31 === 'halloween' && logic.flag === 'halloween');
  check('outfitForMap: Welt 31 bzw. MAP.outfit → halloween, Welt 1 → aus', logic.m31 === 'halloween' && logic.m1 === null && logic.mo === 'halloween' && logic.m31off === null);
  check('1-1: Szene und Heldin ohne Verkleidung', logic.scene === null && logic.av === null);
  // Gesamtbild 1-1 ohne Verkleidung (Standbild) – Vergleichswert
  const stat = async () => sc(() => { const c = window.__course; c.view.rig.snap(c.player); for (let i = 0; i < 4; i++) c.renderFrame(); const s = c.stats(); return { calls: s.calls ?? s.drawCalls, tris: s.triangles ?? s.tris, raw: s }; });
  // LEVEL.outfit = 'halloween' → Neustart: CourseScene setzt die Verkleidung (wie ein H-Level)
  const res = await sc(async () => {
    const lv = await import('/src/course/levels/index.js');
    const d = lv.getLevel('1-1');
    d.outfit = 'halloween';
    window.__course.restartLevel();
    return true;
  });
  void res;
  await page.waitForFunction(() => window.__course && window.__course.level && window.__course.outfit === 'halloween' && window.__game.scene.isActive('CourseUI'), null, { timeout: 120000 });
  await page.waitForTimeout(800);
  const st1 = await sc(() => { const c = window.__course; c.setManual(true); for (let i = 0; i < 5; i++) c.renderFrame(); const av = c.rig.avatar; return { scene: c.outfit, av: av.outfit, hat: !!av.hw?.hat?.parent }; });
  check(`CourseScene mit LEVEL.outfit: Verkleidung gesetzt, Lotti trägt den Hut (${JSON.stringify(st1)})`, st1.scene === 'halloween' && st1.av === 'halloween' && st1.hat);
  await page.screenshot({ path: `${OUT}outfit_hw_spiel_1-1.png` }); shots.push({ name: 'spiel_1-1', path: `${OUT}outfit_hw_spiel_1-1.png`, group: 'spiel' });
  // Figurwechsel zur Laufzeit (HeroRig baut den Avatar neu): Greta trägt die Verkleidung sofort
  const sw = await sc(() => { const c = window.__course; c.setHero('greta'); c.rig.update(1 / 60, 1); for (let i = 0; i < 3; i++) c.renderFrame(); const av = c.rig.avatar; return { variant: av.variant, ears: !!av.lookHead && av.hairMesh.geometry !== av.look0.hair, tail: !!av.hw?.tail?.anchor.parent }; });
  check(`Figurwechsel: neue Heldin trägt die Verkleidung (${JSON.stringify(sw)})`, sw.variant === 'greta' && sw.ears && sw.tail);
  await page.screenshot({ path: `${OUT}outfit_hw_spiel_1-1_greta.png` }); shots.push({ name: 'spiel_1-1_greta', path: `${OUT}outfit_hw_spiel_1-1_greta.png`, group: 'spiel' });
  await sc(() => { const c = window.__course; c.setHero('lotti'); });
  // zurück: ohne LEVEL.outfit → aus
  await sc(async () => { const lv = await import('/src/course/levels/index.js'); delete lv.getLevel('1-1').outfit; window.__course.restartLevel(); });
  await page.waitForFunction(() => window.__course && window.__course.level && window.__course.outfit === null && window.__game.scene.isActive('CourseUI'), null, { timeout: 120000 });
  await page.waitForTimeout(500);
  const st2 = await sc(() => { const c = window.__course; for (let i = 0; i < 3; i++) c.renderFrame(); return { av: c.rig.avatar.outfit, hat: !!c.rig.avatar.hw?.hat?.parent }; });
  check('Neustart ohne LEVEL.outfit: keine Verkleidung', st2.av === null && !st2.hat);
  // Echte Level mit URL-Schalter (Standbild ?still=1, echte Rigs): Kosten der Figuren (Hüllen „heldin“, „ritt“, „pflaume“,
  // „kruemel“ sichtbar/unsichtbar, häufigstes von drei Messungen) mit/ohne; Gesamtbild zur Information
  for (const [id, figs, label] of [['1-1', 1, 'heldin'], ['1-4', 2, 'heldin + pflaume (ritt)'], ['3-Kapitän', 1, 'krümel'], ['1-Schatz', 1, 'pflaume (diorama)']]) {
    const m = {};
    for (const k of ['', 'halloween']) {
      await waitCourse(`${base}/?course=${encodeURIComponent(id)}&scale=1&adapt=0&still=1${k ? `&outfit=${k}` : ''}`);
      await sc(() => { const c = window.__course; c.setManual(true); c.level.muted = true; try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ } });
      for (let i = 0; i < 3; i++) await stat();
      const fig = await sc(() => {
        const c = window.__course, v = c.view;
        const hulls = v.three.children.filter((o) => ['heldin', 'ritt', 'pflaume', 'kruemel'].includes(o.name) && o.visible);
        const grab = () => { c.renderFrame(); const r = v.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
        const once = () => { grab(); const a = grab(); for (const h of hulls) h.visible = false; grab(); const b = grab(); for (const h of hulls) h.visible = true; grab(); return { calls: a.calls - b.calls, tris: a.tris - b.tris }; };
        // Rigs setzen die Sichtbarkeit ihrer Hülle je Bild (Blinken) – während der Messung angehalten (Standbild)
        const upd = c.rig.update; c.rig.update = () => {};
        const seen = new Map();
        for (let i = 0; i < 3; i++) { const r = once(), key = `${r.calls}/${r.tris}`; seen.set(key, { r, n: (seen.get(key)?.n ?? 0) + 1 }); }
        c.rig.update = upd;
        return { ...[...seen.values()].sort((x, y) => y.n - x.n)[0].r, hulls: hulls.map((h) => h.name).join('+') };
      });
      m[k || 'ohne'] = { fig, total: await stat() };
      const name = `spiel_${id}_${k || 'ohne'}`.replace('ä', 'ae');
      await page.screenshot({ path: `${OUT}outfit_hw_${name}.png` }); shots.push({ name, path: `${OUT}outfit_hw_${name}.png`, group: 'spiel' });
    }
    metrics[`spiel ${id}`] = m;
    const a = m.ohne.fig, b = m.halloween.fig;
    console.log(`  ${id} (${a.hulls}): Figuren ohne ${a.calls} Aufrufe / ${a.tris} Dreiecke, Halloween ${b.calls} / ${b.tris}; Gesamtbild ohne ${m.ohne.total.calls} / ${m.ohne.total.tris}, Halloween ${m.halloween.total.calls} / ${m.halloween.total.tris}`);
    check(`${id} (${label}): Zeichenaufrufe der Figuren mit Verkleidung ${b.calls} ≤ ohne ${a.calls} + ${figs}, Dreiecke ${b.tris} ≤ 1,2 × ${a.tris}`, b.calls <= a.calls + figs && b.tris <= 1.2 * a.tris);
  }
}

// ---------------------------------------------------------------- Halloween-Testlevel
async function hwLevelPart() {
  // Halloween-Testlevel (Werkstatt 0-20, Gruselwerkstatt 0-21, Schlossdach 0-22) ohne URL-Schalter: die Szene zieht an
  for (const id of ['0-20', '0-21', '0-22']) {
    await waitCourse(`${base}/?course=${id}&scale=2&adapt=0`);
    const r = await sc(() => {
      const c = window.__course; c.setManual(true); c.level.muted = true;
      try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
      for (let i = 0; i < 4; i++) c.renderFrame();
      const av = c.rig.avatar;
      return { scene: c.outfit, av: av?.outfit ?? null, hat: !!av?.hw?.hat?.parent, rig: c.rig.constructor.name };
    });
    check(`${id}: Halloween-Testlevel – Verkleidung an, Lotti mit Hut (${JSON.stringify(r)})`, r.scene === 'halloween' && r.av === 'halloween' && r.hat);
    await page.screenshot({ path: `${OUT}outfit_hw_spiel_${id}.png` }); shots.push({ name: `spiel_${id}`, path: `${OUT}outfit_hw_spiel_${id}.png`, group: 'spiel' });
    if (id === '0-20') {
      await sc(() => { const c = window.__course; c.setHero('greta'); c.rig.update(1 / 60, 1); for (let i = 0; i < 4; i++) c.renderFrame(); });
      await page.screenshot({ path: `${OUT}outfit_hw_spiel_${id}_greta.png` }); shots.push({ name: `spiel_${id}_greta`, path: `${OUT}outfit_hw_spiel_${id}_greta.png`, group: 'spiel' });
      await sc(() => { window.__course.setHero('lotti'); });
    }
  }
}

// ---------------------------------------------------------------- Kurs-Weltkarte
async function mapPart() {
  await page.goto(`${base}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__courseMap && window.__courseMap.player && window.__game.scene.isActive('CourseMap'), null, { timeout: 240000 });
  await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
  await page.waitForTimeout(1500);
  const a = await sc(() => { const m = window.__courseMap; return { scene: m.outfit, av: m.rig.avatar.outfit }; });
  check('Weltkarte Welt 1: ohne Verkleidung', a.scene === null && a.av === null);
  // MAP.outfit = 'halloween' (wie Welt 31) → Neustart der Karte
  await sc(async () => {
    const w = await import('/src/course/map/worlds/index.js');
    w.getWorldMap(1).outfit = 'halloween';
    window.__game.scene.getScene('CourseMap').scene.restart({});
  });
  await page.waitForFunction(() => window.__courseMap && window.__courseMap.player && window.__courseMap.outfit === 'halloween', null, { timeout: 240000 });
  await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
  await page.waitForTimeout(2500);
  const b = await sc(() => { const m = window.__courseMap; for (let i = 0; i < 3; i++) m.renderFrame?.(); return { scene: m.outfit, av: m.rig.avatar.outfit, hat: !!m.rig.avatar.hw?.hat?.parent }; });
  check(`Weltkarte mit MAP.outfit: Heldin verkleidet (${JSON.stringify(b)})`, b.scene === 'halloween' && b.av === 'halloween' && b.hat);
  await page.screenshot({ path: `${OUT}outfit_hw_karte.png` }); shots.push({ name: 'karte', path: `${OUT}outfit_hw_karte.png`, group: 'karte' });
  const p = await sc(() => {
    const m = window.__courseMap, v = m.view, pos = m.player.pos.clone(); pos.y += 0.5;
    pos.project(v.camera);
    return { x: (pos.x + 1) / 2 * window.innerWidth, y: (1 - pos.y) / 2 * window.innerHeight };
  });
  const clip = { x: Math.round(Math.max(0, Math.min(960 - 240, p.x - 120))), y: Math.round(Math.max(0, Math.min(540 - 180, p.y - 90))), width: 240, height: 180 };
  await page.screenshot({ path: `${OUT}outfit_hw_karte_nah.png`, clip }); shots.push({ name: 'karte_nah', path: `${OUT}outfit_hw_karte_nah.png`, group: 'karte' });
  await sc(async () => { const w = await import('/src/course/map/worlds/index.js'); delete w.getWorldMap(1).outfit; });
}

// ---------------------------------------------------------------- Welt 5 im echten Motor (Strandwerkstatt 0-17, ?outfit=halloween)
/** Trapez und Röhrenkanone wie tests/posen_w5.mjs, mit Verkleidung: Fäuste an der Stange, Aufrufe wie die Stand-Pose, Bilder in
 *  Seitenansicht und Kurs-Kamera. */
async function w5Part() {
  for (const hero of HEROES) {
    await waitCourse(`${base}/?course=0-17&scale=2&adapt=0&outfit=halloween`);
    await sc((h) => {
      const c = window.__course;
      c.setManual(true); c.level.muted = true;
      try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
      const V3 = c.view.camera.position.constructor, V = (x = 0, y = 0, z = 0) => new V3(x, y, z);
      const rig = c.rig, upd = Object.getPrototypeOf(rig).update;
      const W = window.__w5 = { t: c.view.time, drive: false, cam: null, V };
      rig.update = function (dt, t) { if (W.drive) upd.call(this, dt, t); };
      W.hr = () => rig.footRig ?? rig;
      W.tick = (n = 1) => { for (let i = 0; i < n; i++) { c.step(1); W.t += 1 / 120; W.drive = true; rig.update(1 / 120, W.t); W.drive = false; } };
      const P = () => c.player, L = () => c.level;
      W.place = (pos, o = {}) => {
        const p = P();
        c.setInput(null); c.setInput({});
        p.dead = false; p.hidden = false; p.big = o.big ?? true; p.power = 'none'; p.powerTime = 0;
        p.reset(pos, o.yaw ?? Math.PI / 2); p.skidTurnTime = 0; p.invuln = 0; p.updateHalf();
        L().runtime.status = 'play'; L().runtime.save.lives = 99;
        L().controlYaw = c.view.rig.controlYaw(p.pos);
        c.view.rig.snap(p);
        W.tick(o.settle ?? 30);
      };
      W.play = (segs) => { for (const [inp, n] of segs) { c.setInput(inp); W.tick(n); } c.setInput({}); };
      W.until = (cond, max = 1200) => { for (let i = 0; i < max; i++) { if (cond()) return i; W.tick(1); } return -1; };
      W.center = () => { const av = W.hr().avatar; av.root.updateWorldMatrix(true, true); const w = V(); av.pelvis.getWorldPosition(w); const hd = V(); av.head.getWorldPosition(hd); return w.lerp(hd, 0.35); };
      W.screen = () => { const v = W.center(); v.project(c.view.camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; };
      c.view.rig.custom = () => {
        const k = W.cam;
        if (!k) return false;
        const cam = c.view.camera, tg = W.center();
        const az = W.hr().hull.rotation.y + Math.PI / 2 + k.rel, d = k.dist, el = k.el;
        cam.position.set(tg.x + d * Math.cos(el) * Math.sin(az), tg.y + d * Math.sin(el), tg.z + d * Math.cos(el) * Math.cos(az));
        cam.lookAt(tg);
        if (Math.abs(cam.fov - 34) > 0.01) { cam.fov = 34; cam.updateProjectionMatrix(); }
        c.view.rig.target.copy(tg);
        return true;
      };
      const grab = () => { c.renderFrame(); const r = c.view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
      W.cost = () => {
        const hull = W.hr().hull, cam0 = W.cam;
        W.cam = { rel: -Math.PI / 2, dist: 3.6, el: 0.06 };
        const once = () => { grab(); const a = grab(); hull.visible = false; grab(); const b = grab(); hull.visible = true; grab(); return { calls: a.calls - b.calls, tris: a.tris - b.tris }; };
        const a = once(), b = once();
        W.cam = cam0;
        return a.calls === b.calls ? a : once();
      };
      W.hands = (tr) => {
        for (const f of c.view.frameFns) if (f.obj === tr.root) f.fn(0, c.view.time);
        let m = null; tr.root.children[0].traverse((o) => { if (!m && o.isMesh) m = o; });
        m.updateWorldMatrix(true, false);
        const c0 = m.localToWorld(V(0, -tr.L, 0)), ax = m.localToWorld(V(1, -tr.L, 0)).sub(c0).normalize();
        const av = W.hr().avatar; av.root.updateWorldMatrix(true, true);
        return [av.armN, av.armF].map((sh) => { const w = V(); sh.carm.hand.getWorldPosition(w); const d = w.sub(c0), al = d.dot(ax); return +d.addScaledVector(ax, -al).length().toFixed(3); });
      };
      W.parts = () => { const av = W.hr().avatar; return { outfit: av.outfit, hat: !!av.hw?.hat?.parent, ears: !!av.lookHead && !av.braids, tail: !!av.hw?.tail?.anchor.parent, label: av.blender.state }; };
      c.setHero(h); W.tick(2);
    }, hero);
    const w5shot = async (name, view) => {
      if (view === 'kurs') await sc(() => { const W = window.__w5; W.cam = null; window.__course.view.rig.snap(window.__course.player); });
      else await sc(() => { window.__w5.cam = { rel: -Math.PI / 2 + 0.5, dist: 4.0, el: 0.08 }; });
      await sc(() => { for (let i = 0; i < 3; i++) window.__course.renderFrame(); });
      const p = await sc(() => window.__w5.screen());
      const w = view === 'kurs' ? 260 : 300, h = view === 'kurs' ? 200 : 340;
      const clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
      const path = `${OUT}outfit_hw_w5_${hero}_${name}_${view}.png`;
      try { await page.screenshot({ path, clip, timeout: 120000 }); shots.push({ name: `${hero} ${name} ${view}`, path, group: 'w5' }); } catch (err) { console.log(`  (Bild übersprungen: ${err.message.split('\n')[0]})`); }
      await sc(() => { window.__w5.cam = null; });
    };
    // Trapez t1: greifen, aufschaukeln, Umkehrpunkt vorn
    await sc(() => {
      const W = window.__w5, c = window.__course, tr = c.level.named.get('t1'), b = tr.bar({});
      W.place([b.x, b.y - 1.21 - 0.15, b.z + 0.1], { settle: 0 });
      c.player.vel.y = 2; W.tick(45);
      W.play([[{ y: 1 }, 240]]);
      W.until(() => tr.omega <= 0 && tr.theta > 0.3, 900);
    });
    const tr = await sc(() => { const W = window.__w5, tr = window.__course.level.named.get('t1'); return { parts: W.parts(), hands: W.hands(tr), cost: W.cost() }; });
    await w5shot('trapez', 'seite'); await w5shot('trapez', 'kurs');
    await sc(() => { const W = window.__w5, tr = window.__course.level.named.get('t1'); W.until(() => tr.omega < -1 && Math.abs(tr.theta) < 0.06, 900); });
    await w5shot('trapez_durch', 'seite');
    // Röhrenkanone: Flug bis zum Scheitel
    await sc(() => { const W = window.__w5; W.place([0, 4.6, -122.5], { settle: 0 }); W.until(() => window.__course.player.state === 'cannon', 600); W.until(() => (window.__course.player.phase ?? 0) >= 0.45 || window.__course.player.state !== 'cannon', 600); });
    const kn = await sc(() => { const W = window.__w5; return { parts: W.parts(), cost: W.cost() }; });
    await w5shot('kanone', 'seite'); await w5shot('kanone', 'kurs');
    // Vergleich: Stand-Pose an derselben Stelle (wie posen_w5 „Rückfall“)
    const idle = await sc(() => {
      const W = window.__w5, av = W.hr().avatar, keep = av.obj.course, saved = { ...keep };
      for (let i = 0; i < 40; i++) { av.obj.course = { ...saved, state: 'idle' }; av.animate(1 / 60, W.t + i / 60); if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004; }
      const r = W.cost(); av.obj.course = keep; return r;
    });
    console.log(`  ${hero} Welt 5: Trapez ${JSON.stringify(tr)}; Kanone ${JSON.stringify(kn)}; Stand ${JSON.stringify(idle)}`);
    const worn = (p) => (hero === 'lotti' ? p.hat : p.tail);
    check(`${hero} Trapez (Motor, verkleidet): Pose trapeze, Fäuste an der Stange (${tr.hands.join('/')} m), Zubehör getragen, Aufrufe ${tr.cost.calls} ≤ Stand ${idle.calls}`,
      tr.parts.label === 'trapeze' && tr.hands.every((h) => h <= 0.05) && worn(tr.parts) && tr.cost.calls <= idle.calls);
    check(`${hero} Kanone (Motor, verkleidet): Pose cannon, Zubehör getragen, Aufrufe ${kn.cost.calls} ≤ Stand ${idle.calls}`, kn.parts.label === 'cannon' && worn(kn.parts) && kn.cost.calls <= idle.calls);
  }
}

// ---------------------------------------------------------------- Ablauf
if (on('metrics') || on('close') || on('posen') || on('costume') || on('pets') || on('clones')) {
  await openBench();
  check('Kurs 1-1 lädt ohne Konsolenfehler', errors.length === 0);
  if (on('metrics')) await metricsPart();
  if (on('close')) for (const k of HEROES) await closePart(k);
  if (on('posen')) for (const k of HEROES) await posenPart(k);
  if (on('costume')) for (const k of HEROES) await costumePart(k);
  if (on('pets')) await petsPart();
  if (on('clones')) await clonesPart();
}
if (on('level')) await levelPart();
if (on('hwlevel')) await hwLevelPart();
if (on('w5')) await w5Part();
if (on('map')) await mapPart();

writeFileSync(`${OUT}outfit_hw.json`, JSON.stringify(metrics, null, 1));
check('Keine Konsolenfehler', errors.length === 0);
const ok = summary(errors);

try {
  await page.goto('about:blank');
  await page.setViewportSize({ width: 1700, height: 400 });
  const b64 = (p) => readFileSync(p).toString('base64');
  for (const g of [...new Set(shots.map((s) => s.group))]) {
    const list = shots.filter((s) => s.group === g);
    const imgs = list.map((s) => `<figure><img src="data:image/png;base64,${b64(s.path)}"><figcaption>${s.name}</figcaption></figure>`).join('');
    await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${imgs}</div><style>figure{margin:2px}img{display:block;max-height:300px}</style></body></html>`);
    await page.screenshot({ path: `${OUT}outfit_hw_sheet_${g}.png`, fullPage: true });
  }
} catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }

await browser.close();
await stop();
process.exit(ok ? 0 : 1);
