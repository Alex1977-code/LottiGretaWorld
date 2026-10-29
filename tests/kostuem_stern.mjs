// Sternenglanz-Kostüm der Heldinnen und Pflaumes Sternenhalsband (Vertrag docs/KURS-ARCHITEKTUR.md „Präzisierung (Figuren
// Bonuswelten): Sternenglanz-Kostüm“; Freischaltung: Baustein `sternenglanz` in S-2, Hilfen blocks/starkit.js). Vite-Entwicklungs-
// server wie tests/kostuem_w7.mjs (Avatar-Klassen, Schalter three/lib/outfit.js und Spielstand lassen sich im Browser laden).
//
// Teile (KST_PARTS, Standard alle; Heldinnen KST_HEROES=lotti,greta):
//   map      Freischalten über den Spielstand (S-2: Baustein sternenglanz → courseSave.data.outfits.stern = { from: 'S-2' }, das
//            Kostüm wird erst getragen, wenn man es wählt), Schalter auf der Kurs-Weltkarte (sichtbar erst nach dem Freischalten,
//            Hinweis einmal, Klick und Taste K, Wunsch im Spielstand courseSave.data.outfit), Kostüm im Level (aus dem Spielstand,
//            auch nach Neuladen), Halloween-Vorrang (H-Level, Kürbisinsel-Karte: Halloween-Verkleidung, Schalter merkt nur),
//            URL ?outfit=stern / ?outfit=0, Spielstand löschen; Bilder Karte/Level/Weltraum (S-2)
//   mech     echter Motor (Übungsplatz 0-0, HeroRig im Takt der Simulation): Kosten Stand ohne → mit → wieder ohne (Zeichenaufrufe
//            inkl. Schattenpass ≤ +1, Dreiecke ≤ 1,3×, wieder ohne exakt wie vorher), Funkeln (Stand selten, Lauf oft, Absprung),
//            Sternenschweif beim Weitsprung, Klone (lite: Kostüm ohne Funkeln/Schweif/Schatten, Kosten), Pflaume (Kosten, Halsband)
//   close    Bank (Licht aus 1-1), in drei Teilen: nah – Nahansichten vorn/seitlich/hinten/oben/Gesicht/Haarschmuck, Kurs-
//            Kamera, ohne Kostüm zum Vergleich; posen – Lauf, Sprung, Salto, Weitsprung mit Schweif, Fallen, Hocke, Jubel,
//            Klettern, Wand, Schwimmen, Tauchen, Kanone, Trapez, Tragen, Rutschen, Stampfen, Statue, Schlittschuh, Treffer;
//            kostueme – Power-up-Kostüme darüber (Krallen, Funken, Gleitblatt, Wurfsichel, Stern-Glanz, Riese), Trage-Helm
//            (Diadem ruht), klein
//   ride     Pflaume mit Sternenhalsband (vorn/seitlich/hinten, Kraftfarbe bleibt) und Ritt mit Sternenkleid
// Bilder tests/out/kostuem_stern_*.png, Übersichtsbögen tests/out/kostuem_stern_sheet_<gruppe>.png. Keine Konsolenfehler.
// Aufruf: npm run build && PORT_BASE=0 node tests/kostuem_stern.mjs (Port 4385 + PORT_BASE); unter Last die Teile einzeln
// (KST_PARTS=map | mech | nah | posen | kostueme | ride, je < 10 min; close = nah,posen,kostueme), KST_HEROES=lotti,
// KST_SHOTS=0 ohne Bilder.
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4385 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const PARTS = (process.env.KST_PARTS ?? 'map,mech,close,ride').split(',').filter(Boolean).flatMap((p) => (p === 'close' ? ['nah', 'posen', 'kostueme'] : [p]));
const HEROES = (process.env.KST_HEROES ?? 'lotti,greta').split(',').filter(Boolean);
const SHOTS = process.env.KST_SHOTS !== '0';
const on = (p) => PARTS.includes(p);

const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-kst`, logLevel: 'warn', clearScreen: false,
  server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false },
});
await server.listen();
const stop = async () => { try { await server.close(); } catch { /* schon zu */ } };
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const S = (fn, arg) => page.evaluate(fn, arg);
const shotList = [];
const base = `http://127.0.0.1:${PORT}`;

async function fail(msg) {
  console.log(msg); for (const x of errors) console.log('  ', x);
  await browser.close(); await stop(); process.exit(1);
}
async function waitCourse(url, id = null) {
  if (url) await page.goto(url, { waitUntil: 'load' });
  try {
    await page.waitForFunction((id) => window.__course && window.__course.level && (!id || window.__course.levelId === id) && window.__game.scene.isActive('CourseUI'), id, { timeout: 240000 });
  } catch { await fail(`Kurs startet nicht (${url}). Konsole:`); }
  await page.waitForTimeout(300);
}
async function waitMap(world = null) {
  try {
    await page.waitForFunction((w) => window.__courseMap && window.__courseMap.player && window.__courseMap.hud && (!w || window.__courseMap.map?.world === w) && window.__game.scene.isActive('CourseMap'), world, { timeout: 240000 });
  } catch { await fail('Weltkarte startet nicht. Konsole:'); }
  await S(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
}
/** Szene wechseln (aus Karte bzw. Level) und warten. */
async function startScene(key, data, wait) {
  await S(([k, d]) => {
    const g = window.__game;
    const map = g.scene.isActive('CourseMap'), from = map ? g.scene.getScene('CourseMap') : g.scene.getScene('Course');
    if (map) from.leaving = true;
    else for (const s of ['CoursePause', 'CourseResult', 'CourseUI']) from.scene.stop(s);
    from.scene.start(k, d);
  }, [key, data]);
  await page.waitForTimeout(200);
  await wait();
}

// ---------------------------------------------------------------- Bilder
async function snap(name, group, clip) {
  if (!SHOTS) return;
  const path = `${OUT}kostuem_stern_${name}.png`;
  try { await page.screenshot({ path, clip, timeout: 120000 }); shotList.push({ name, path, group }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}
const VIEWS = {
  front: { mode: 'close', rel: -0.5, el: 0.12, dist: 2.6, fov: 30, h: 0.55 },
  front0: { mode: 'close', rel: 0, el: 0.1, dist: 2.6, fov: 30, h: 0.55 },
  face: { mode: 'close', rel: -0.4, el: 0.1, dist: 1.25, fov: 30, h: 0.8 },
  side: { mode: 'close', rel: -Math.PI / 2, el: 0.08, dist: 2.6, fov: 30, h: 0.55 },
  side2: { mode: 'close', rel: Math.PI / 2, el: 0.08, dist: 2.6, fov: 30, h: 0.55 },
  back: { mode: 'close', rel: Math.PI - 0.4, el: 0.25, dist: 2.6, fov: 30, h: 0.55 },
  back0: { mode: 'close', rel: Math.PI, el: 0.2, dist: 2.6, fov: 30, h: 0.55 },
  top: { mode: 'close', rel: Math.PI - 0.7, el: 0.75, dist: 2.6, fov: 30, h: 0.55 },
  hair: { mode: 'close', rel: Math.PI - 0.9, el: 0.45, dist: 1.3, fov: 30, h: 0.85 },
  hairF: { mode: 'close', rel: -0.3, el: 0.35, dist: 1.3, fov: 30, h: 0.88 },
  kursnah: { mode: 'close', rel: Math.PI, el: 0.62, dist: 5.2, fov: 34, h: 0.45 },
  weit: { mode: 'close', rel: -1.1, el: 0.15, dist: 6.5, fov: 34, h: 0.5 },
  course: { mode: 'course' },
};
async function shot(name, view, group, o = {}) {
  if (!SHOTS) return;
  await S(([v, e]) => { window.__kst.cam = { ...v, ...e }; if (v.mode === 'course') window.__course.snapCamera(); }, [VIEWS[view], o.cam ?? {}]);
  await S((n) => window.__kst.frames(n), view === 'course' ? 6 : 3);
  let clip = { x: 290, y: 50, width: 380, height: 440 };
  if (view === 'course') {
    const p = await S(() => window.__kst.screen(0.5));
    const w = o.w ?? 260, h = o.h ?? 200;
    clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
  }
  if (o.clip) clip = o.clip;
  await snap(name, group, clip);
  await S(() => { window.__kst.cam = null; });
}

// ---------------------------------------------------------------- Prüfstand im Level (wie kostuem_w7)
async function setupBench({ drive = false } = {}) {
  await S(async (drive) => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
    const heroMod = await import('/src/three/avatars/hero.js');
    const outfit = await import('/src/three/lib/outfit.js');
    const { courseSave } = await import('/src/course/level/CourseSave.js');
    const THREE = (await import('/src/course/models/lib/kit.js')).THREE;
    const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const H = window.__kst = { THREE, V, heroMod, outfit, courseSave, t: c.view.time, cam: null, drive: false };
    const rig = c.rig, upd = Object.getPrototypeOf(rig).update;
    rig.update = () => {};   // HeroRig nur im Takt von H.tick (Motor) bzw. gar nicht (Bank: H.pose)
    void drive;
    H.rig = rig;
    H.av = () => rig.avatar;
    const P = () => c.player, L = () => c.level;
    H.tick = (n = 1, each = null) => {
      for (let i = 0; i < n; i++) {
        c.step(1);
        H.t += 1 / 120;
        H.drive = true; upd.call(rig, 1 / 120, H.t); H.drive = false;
        each?.(i);
      }
    };
    H.place = (pos, o = {}) => {
      const p = P();
      c.setInput(null); c.setInput({});
      c.squad?.clear?.();
      p.dead = false; p.hidden = false;
      p.big = o.big ?? true;
      p.power = 'none'; p.powerTime = 0;
      p.holding = null;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      if (o.power) p.setPower(o.power);
      p.invuln = 0;
      p.updateHalf();
      L().runtime.status = 'play';
      L().runtime.save.lives = 99;
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap(p);
      H.tick(o.settle ?? 30);
      for (let i = 0; i < 400 && (rig.squash !== 0 || rig.squashV !== 0); i++) H.tick(1);
      return p.info();
    };
    /** Kostüm-Zustand eines Avatars. */
    H.parts = (av = H.av()) => {
      const F = av.sg;
      const vis = (o) => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === av.root) return true; } return false; };
      return {
        outfit: av.outfit, costume: av.costume ?? null, stern: !!av.lookStern,
        hair: av.hairMesh.geometry.uuid.slice(0, 6), torso: av.torsoMesh.geometry.uuid.slice(0, 6), skirt: av.skirtMesh.geometry.uuid.slice(0, 6),
        fx: !!F?.on, glints: F ? F.glints.filter((g) => g.mesh.parent && vis(g.mesh)).length : 0,
        trail: F ? F.trail.filter((p) => p.mesh.parent && vis(p.mesh)).length : 0,
        fxShadow: F ? [...F.glints.map((g) => g.mesh), ...F.trail.map((p) => p.mesh)].some((m) => m.castShadow) : false,
        label: av.blender.state, lite: av.liteLook, hat: !!av.hw?.hat?.parent, tail: !!av.hw?.tail?.anchor.parent,
        cap: !!av.sk?.cap?.parent, helm: av.foreignHeadgear(),
      };
    };
    // Kamera: 'close' = um die Hülle (rel zur Blickrichtung, el, dist, fov, h), 'course' = Kameraschiene
    c.view.rig.custom = () => {
      const k = H.cam;
      if (!k || k.mode === 'course') return false;
      const cam = c.view.camera, hull = (k.hull ?? H.hull ?? rig.hull);
      const s = hull.scale.y * 1.5;
      const tg = V(hull.position.x, hull.position.y + (k.h ?? 0.55) * s, hull.position.z);
      if (k.target) tg.set(...k.target);
      const az = hull.rotation.y + Math.PI / 2 + (k.rel ?? -0.5);
      const d = (k.dist ?? 2.6) * (0.4 + 0.6 * s), el = k.el ?? 0.12;
      cam.position.set(tg.x + d * Math.cos(el) * Math.sin(az), tg.y + d * Math.sin(el), tg.z + d * Math.cos(el) * Math.cos(az));
      cam.lookAt(tg);
      const fov = k.fov ?? 30;
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
      c.view.rig.target.copy(tg);
      return true;
    };
    H.screen = (up = 0.5, hull = rig.hull) => {
      const v = V(hull.position.x, hull.position.y + up * hull.scale.y * 1.5, hull.position.z);
      v.project(c.view.camera);
      return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
    };
    H.frames = (n) => { for (let i = 0; i < n; i++) c.renderFrame(); };
    const grab = () => { c.renderFrame(); const r = c.view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
    /** Zeichenaufrufe/Dreiecke von Hüllen (inkl. Schattenpass, Figur-Bündel): Median aus fünf Paaren sichtbar/unsichtbar. */
    H.cost = (hulls = [rig.hull], av0 = H.av()) => {
      if (av0) { av0.blinker.phase = 0; av0.blinker.timer = 99; av0.applyEyes(av0.blender.cur.eyes); }
      const cam0 = H.cam;
      H.cam = { mode: 'close', rel: -0.5, el: 0.1, dist: 5, fov: 36, hull: hulls[0] };
      const still = c.still; c.still = true;
      const dc = [], dt = [];
      grab();
      for (let k = 0; k < 5; k++) {
        for (const h of hulls) h.visible = true; grab(); const a = grab();
        for (const h of hulls) h.visible = false; grab(); const b = grab();
        dc.push(a.calls - b.calls); dt.push(a.tris - b.tris);
      }
      for (const h of hulls) h.visible = true; grab();
      c.still = still;
      H.cam = cam0;
      if (av0) av0.blinker.timer = 2;
      const med = (l) => l.slice().sort((p, q) => p - q)[2];
      return { calls: med(dc), tris: med(dt), pairs: dc.join('/') };
    };
    H.noBlink = (av = H.av()) => { if (av.__nb) return; av.__nb = true; av.blinker.update = () => 1; };
    H.base = { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: false, climbing: false, fenceMove: { x: 0, y: 0 }, fencePunch: 0, skates: false, sichelFlying: 0, sichelReady: true, sichelCatch: 0 };
    /** Bank-Pose: Avatar n Bilder mit eigenem course-Objekt (HeroRig steht). */
    H.pose = (cc = {}, n = 30, dt = 1 / 60) => {
      const av = H.av(), keep = rig.proxy.course;
      H.noBlink();
      for (let i = 0; i < n; i++) {
        H.t += dt;
        av.obj.course = { ...H.base, ...cc };
        av.animate(dt, H.t);
        if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004;
      }
      av.obj.course = keep;
      return H.parts();
    };
    /** Pflaume (Hülle „pflaume“, wie tests/outfit_hw.mjs) – bei Bedarf anlegen. */
    H.pflaume = () => {
      if (H.pfl) return H.pfl;
      const pHull = new THREE.Group(); pHull.name = 'pflaume'; c.view.three.add(pHull);
      const proxy = { texture: { key: 'pflaume' }, key: 'pflaume', x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true, flipX: false,
        body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }, power: 'none',
        course: { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: null, rider: null } };
      const av = new heroMod.PflaumeAvatar(c.view, proxy);
      av.setCourseMode(true);
      pHull.add(av.root);
      pHull.scale.setScalar(1.3 / 1.5);
      pHull.visible = false;
      H.pfl = { hull: pHull, av };
      return H.pfl;
    };
    H.pflPose = (cc = {}, n = 30) => {
      const P2 = H.pflaume(), av = P2.av;
      if (!av.__nb) { av.__nb = true; av.blinker.update = () => 1; }
      for (let i = 0; i < n; i++) { H.t += 1 / 60; av.obj.course = { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: null, rider: null, ...cc }; av.animate(1 / 60, H.t); }
      return { outfit: av.outfit, fur: av.headFur.geometry.uuid.slice(0, 6), bandana: av.bandana.geometry.uuid.slice(0, 6), color: av.bandanaMat.color.getHexString() };
    };
  }, drive);
}
const setHero = (k) => S((k) => { window.__course.setHero(k); window.__kst.tick?.(2); window.__kst.noBlink(); }, k);

// ---------------------------------------------------------------- Teil map: Freischalten, Schalter, Level, Halloween-Vorrang
async function mapPart() {
  const r = {};
  const G = 'karte';
  // frischer Spielstand, S-2 laden
  await waitCourse(`${base}/?course=S-2&scale=2&adapt=0`, 'S-2');
  await S(async () => { const { courseSave } = await import('/src/course/level/CourseSave.js'); courseSave.reset(); });
  await waitCourse(`${base}/?course=S-2&scale=2&adapt=0`, 'S-2');
  await setupBench({ drive: true });
  r.before = await S(() => {
    const H = window.__kst, c = window.__course;
    H.tick(6);
    return { outfits: H.courseSave.data.outfits ?? null, wish: H.outfit.outfitWish(), av: H.av().outfit, scene: c.outfit, glanz: c.level.named.get('glanz')?.info() ?? null };
  });
  // Baustein sternenglanz (wie beim Zielmast): Kostüm im Spielstand freischalten
  r.unlock = await S(() => {
    const H = window.__kst, c = window.__course;
    const g = c.level.named.get('glanz');
    g.start();
    H.tick(10);
    const saved = JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}');
    return { info: g.info(), from: H.courseSave.data.outfits?.stern?.from ?? null, saved: saved.outfits?.stern?.from ?? null, outfit: H.courseSave.data.outfit, wish: H.outfit.outfitWish(), av: H.av().outfit };
  });
  // Weltraum-Bilder in S-2: mit Kostüm (über den Wunsch im Spielstand) – Kurs-Kamera, Lauf, Weitsprung
  r.space = await S(() => {
    const H = window.__kst, c = window.__course;
    H.courseSave.data.outfit = 'stern';
    H.tick(4);
    const a = H.parts();
    H.courseSave.data.outfit = undefined;
    H.tick(2);
    return { on: a, off: H.parts() };
  });
  for (const hero of HEROES) {
    await setHero(hero);
    await S(() => { const H = window.__kst; H.courseSave.data.outfit = 'stern'; H.place(window.__course.level.data.marks.start, { settle: 40 }); });
    await shot(`s2_${hero}_stand`, 'front', G);
    await shot(`s2_${hero}_kurs`, 'course', G, { w: 320, h: 240 });
    await S(() => { const H = window.__kst, c = window.__course; c.setInput({ y: 1, run: true }); H.tick(40); });
    await shot(`s2_${hero}_lauf_kurs`, 'course', G, { w: 320, h: 240 });
    await S(() => { const H = window.__kst, c = window.__course; c.setInput({ y: 1, run: true, crouch: true }); H.tick(3); c.setInput({ y: 1, run: true, crouch: true, jump: true }); H.tick(1); c.setInput({ y: 1, run: true }); H.tick(26); });
    await shot(`s2_${hero}_weitsprung_kurs`, 'course', G, { w: 360, h: 260 });
    await shot(`s2_${hero}_weitsprung_seite`, 'weit', G);
    await S(() => { const H = window.__kst, c = window.__course; c.setInput({}); H.tick(120); H.courseSave.data.outfit = undefined; H.tick(2); });
  }
  await setHero('lotti');
  // Weltkarte: Schalter sichtbar, Kostüm noch nicht getragen; Hinweis einmal
  await page.goto(`${base}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
  await waitMap();
  r.map0 = await S(() => {
    const m = window.__courseMap, hud = m.hud;
    for (let i = 0; i < 4; i++) m.renderFrame();
    const vis = hud.outfitBtn.c.visible;
    hud.update(3);   // Hinweis nach 2,6 s
    const toast = hud.toastText.visible ? hud.toastText.text : '';
    return { vis, toast, outfit: window.__courseSave.data.outfit ?? 'undef', av: m.rig.avatar.outfit, hintT: hud.outfitHintT };
  });
  r.click = await S(() => {
    const m = window.__courseMap, hud = m.hud;
    const on = hud.toggleOutfit();
    for (let i = 0; i < 3; i++) m.renderFrame();
    const a = { on, outfit: window.__courseSave.data.outfit, av: m.rig.avatar.outfit, toast: hud.toastText.text, saved: JSON.parse(localStorage.getItem('lotti-greta-course-v1')).outfit, btn: hud.outfitBtn.key };
    return a;
  });
  await S(() => { const m = window.__courseMap; m.hud.toastText.setVisible(false); for (let i = 0; i < 3; i++) m.renderFrame(); });
  await snap('karte_mit', G, { x: 0, y: 0, width: 960, height: 540 });
  await snap('karte_mit_hud', G, { x: 0, y: 0, width: 300, height: 180 });
  // Taste K: aus und wieder an
  await page.keyboard.press('KeyK');
  r.keyOff = await S(() => { const m = window.__courseMap; for (let i = 0; i < 3; i++) m.renderFrame(); return { outfit: window.__courseSave.data.outfit, av: m.rig.avatar.outfit }; });
  await S(() => { const m = window.__courseMap; m.hud.toastText.setVisible(false); for (let i = 0; i < 3; i++) m.renderFrame(); });
  await snap('karte_ohne_hud', G, { x: 0, y: 0, width: 300, height: 180 });
  await page.keyboard.press('KeyK');
  r.keyOn = await S(() => { const m = window.__courseMap; for (let i = 0; i < 3; i++) m.renderFrame(); return { outfit: window.__courseSave.data.outfit, av: m.rig.avatar.outfit }; });
  // Greta auf der Karte
  r.mapGreta = await S(() => { const m = window.__courseMap; m.selectHero('greta'); for (let i = 0; i < 4; i++) m.renderFrame(); return { hero: m.player.hero, av: m.rig.avatar.outfit }; });
  await S(() => { const m = window.__courseMap; m.hud.toastText.setVisible(false); for (let i = 0; i < 3; i++) m.renderFrame(); });
  await snap('karte_greta', G, { x: 240, y: 120, width: 480, height: 330 });
  await S(() => { const m = window.__courseMap; m.selectHero('lotti'); });
  // Level von der Karte aus: Kostüm aus dem Spielstand
  await startScene('Course', { id: '1-1' }, () => waitCourse(null, '1-1'));
  await setupBench({ drive: true });
  r.level = await S(() => { const H = window.__kst, c = window.__course; H.tick(10); return { scene: c.outfit, av: H.av().outfit, parts: H.parts() }; });
  await shot('level_1-1_kurs', 'course', G, { w: 320, h: 240 });
  // Neuladen: Wunsch bleibt (Spielstand)
  await waitCourse(`${base}/?course=1-2&scale=1&adapt=0`, '1-2');
  r.reload = await S(() => { const c = window.__course; for (let i = 0; i < 3; i++) c.renderFrame(); return { scene: c.outfit, av: c.rig.avatar.outfit }; });
  // Halloween-Level: Halloween-Verkleidung hat Vorrang
  await waitCourse(`${base}/?course=H-1&scale=1&adapt=0`, 'H-1');
  r.hwLevel = await S(() => { const c = window.__course; for (let i = 0; i < 3; i++) c.renderFrame(); return { scene: c.outfit, av: c.rig.avatar.outfit, hat: !!c.rig.avatar.hw?.hat?.parent, stern: !!c.rig.avatar.lookStern, wish: window.__courseSave?.data?.outfit ?? null }; });
  // Kürbisinsel-Karte: Verkleidung der Insel, Schalter merkt den Wunsch nur
  await startScene('CourseMap', { world: 31 }, () => waitMap(31));
  r.hwMap = await S(() => {
    const m = window.__courseMap, hud = m.hud;
    for (let i = 0; i < 3; i++) m.renderFrame();
    const a = { scene: m.outfit, av: m.rig.avatar.outfit, vis: hud.outfitBtn.c.visible };
    hud.toggleOutfit();
    for (let i = 0; i < 2; i++) m.renderFrame();
    const b = { outfit: window.__courseSave.data.outfit, av: m.rig.avatar.outfit };
    hud.toggleOutfit();
    for (let i = 0; i < 2; i++) m.renderFrame();
    return { a, b, c: { outfit: window.__courseSave.data.outfit, av: m.rig.avatar.outfit, toast: hud.toastText.text } };
  });
  await snap('karte_kuerbisinsel', G, { x: 240, y: 120, width: 480, height: 330 });
  // zurück in Welt 1: wieder Sternenglanz
  await startScene('CourseMap', { world: 1 }, () => waitMap(1));
  r.backMap = await S(() => { const m = window.__courseMap; for (let i = 0; i < 3; i++) m.renderFrame(); return { scene: m.outfit, av: m.rig.avatar.outfit }; });
  // URL-Schalter: ?outfit=0 schaltet auch den Wunsch ab
  await waitCourse(`${base}/?course=1-1&scale=1&adapt=0&outfit=0`, '1-1');
  r.url0 = await S(() => { const c = window.__course; for (let i = 0; i < 2; i++) c.renderFrame(); return c.rig.avatar.outfit; });
  // Spielstand löschen (Karte): Schalter weg, Kostüm aus
  await page.goto(`${base}/?map=1&scale=1&adapt=0`, { waitUntil: 'load' });
  await waitMap();
  r.reset = await S(async () => {
    const m = window.__courseMap;
    const before = { vis: m.hud.outfitBtn.c.visible, av: m.rig.avatar.outfit };
    m.resetSave();
    return before;
  });
  await waitMap();
  r.reset2 = await S(() => { const m = window.__courseMap; for (let i = 0; i < 3; i++) m.renderFrame(); return { vis: m.hud.outfitBtn.c.visible, av: m.rig.avatar.outfit, outfits: window.__courseSave.data.outfits ?? null, toggle: m.hud.toggleOutfit() }; });
  // URL-Schalter ?outfit=stern (ohne Freischaltung, zum Testen)
  await waitCourse(`${base}/?course=1-1&scale=1&adapt=0&outfit=stern`, '1-1');
  r.urlStern = await S(() => { const c = window.__course; for (let i = 0; i < 2; i++) c.renderFrame(); return { scene: c.outfit, av: c.rig.avatar.outfit }; });
  return r;
}

// ---------------------------------------------------------------- Teil mech: echter Motor, Kosten, Funkeln, Schweif, Klone
async function mechPart() {
  const R = {};
  await waitCourse(`${base}/?course=0-0&scale=1&adapt=0`, '0-0');
  await setupBench({ drive: true });
  await S(() => { const H = window.__kst; H.courseSave.data.outfits = { stern: { from: 'S-2', at: 1 } }; H.courseSave.data.outfit = null; });
  for (const hero of HEROES) {
    const r = R[hero] = {};
    await setHero(hero);
    const lane = await S(() => window.__course.level.data.marks.lane);
    r.costNone = await S((lane) => { const H = window.__kst; H.place(lane, { settle: 90 }); return { cost: H.cost(), parts: H.parts() }; }, lane);
    r.costStern = await S((lane) => { const H = window.__kst; H.courseSave.data.outfit = 'stern'; H.place(lane, { settle: 90 }); return { cost: H.cost(), parts: H.parts() }; }, lane);
    // Funkeln im Stand (selten) und beim Laufen (oft): Glitzer zählen
    r.sparkle = await S((lane) => {
      const H = window.__kst, c = window.__course, av = H.av();
      const count = (n, only = null) => {
        let spawns = 0, maxVis = 0, ticks = 0, sp = 0;
        const F = av.sg, last = F.glints.map((g) => g.t);
        H.tick(n, () => {
          const ok = !only || only();
          F.glints.forEach((g, i) => { if (g.t < last[i] && ok) spawns++; last[i] = g.t; });
          if (ok) { ticks++; sp += Math.hypot(c.player.vel.x, c.player.vel.z); maxVis = Math.max(maxVis, H.parts().glints); }
        });
        return { spawns, maxVis, s: +(ticks / 120).toFixed(2), rate: +(spawns / Math.max(1e-3, ticks / 120)).toFixed(2), speed: +(sp / Math.max(1, ticks)).toFixed(2) };
      };
      H.place(lane, { settle: 20 });
      const idle = count(600);   // 5 s
      c.setInput({ y: 1, run: true });
      const run = count(240, () => H.rig.proxy.course.state === 'run' && Math.hypot(c.player.vel.x, c.player.vel.z) > 4);
      c.setInput({});
      H.tick(120);
      return { idle, run };
    }, lane);
    // Weitsprung: Sternenschweif
    r.longjump = await S((lane) => {
      const H = window.__kst, c = window.__course;
      H.place(lane, { settle: 20 });
      c.setInput({ y: 1, run: true }); H.tick(100);
      const before = H.parts().trail;
      c.setInput({ y: 1, run: true, crouch: true }); H.tick(3);
      c.setInput({ y: 1, run: true, crouch: true, jump: true }); H.tick(1);
      c.setInput({ y: 1, run: true });
      let maxTrail = 0, seen = false, n = 0;
      for (let i = 0; i < 60; i++) { H.tick(1); const s = H.rig.proxy.course.state; if (s === 'longjump') { seen = true; n++; } maxTrail = Math.max(maxTrail, H.parts().trail); }
      return { before, seen, n, maxTrail };
    }, lane);
    await shot(`${hero}_motor_weitsprung`, 'course', `${hero}_motor`, { w: 360, h: 260 });
    await shot(`${hero}_motor_weitsprung_seite`, 'weit', `${hero}_motor`);
    r.after = await S(() => { const H = window.__kst, c = window.__course; c.setInput({}); H.tick(180); return H.parts(); });
    // Kosten im Lauf (Funkeln sichtbar)
    r.costRun = await S((lane) => {
      const H = window.__kst, c = window.__course;
      H.place(lane, { settle: 10 });
      c.setInput({ y: 1 }); H.tick(50);
      const cost = H.cost();
      c.setInput({}); H.tick(120);
      return cost;
    }, lane);
    // wieder ohne: exakt wie vorher
    r.costOff = await S((lane) => { const H = window.__kst; H.courseSave.data.outfit = null; H.place(lane, { settle: 90 }); return { cost: H.cost(), parts: H.parts() }; }, lane);
    // Klone (Spiegelfrucht): Kostüm ohne Funkeln, Schweif und Schatten
    r.clones = await S((lane) => {
      const H = window.__kst, c = window.__course, p = c.player;
      H.courseSave.data.outfit = 'stern';
      H.place([lane[0] + 3, lane[1], lane[2] - 6], { settle: 20 });
      const figs = [c.level.addClone(p), c.level.addClone(p)].filter(Boolean);
      const rigs = figs.map((f) => c.squad.rigs.get(f));
      const up = Object.getPrototypeOf(rigs[0]).update;
      for (const rg of rigs) rg.update = () => {};
      const cup = () => { for (const rg of rigs) up.call(rg, 1 / 120, H.t); };
      const settled = () => figs.every((f) => f.state === 'idle') && rigs.every((rg) => rg.squash === 0 && rg.squashV === 0);
      H.tick(30, cup);
      for (let i = 0; i < 600 && !settled(); i++) H.tick(1, cup);
      const parts = rigs.map((rg) => H.parts(rg.avatar));
      const shadows = rigs.map((rg) => { let n = 0; rg.avatar.root.traverse((o) => { if (o.isMesh && o.castShadow) n++; }); return n; });
      const cost = H.cost(rigs.map((rg) => rg.hull), null);
      H.courseSave.data.outfit = null;
      H.tick(10, cup);
      for (let i = 0; i < 600 && !settled(); i++) H.tick(1, cup);
      const costNone = H.cost(rigs.map((rg) => rg.hull), null);
      H.courseSave.data.outfit = 'stern';
      H.tick(10, cup);
      c.setInput({ y: 1 }); H.tick(60, cup); c.setInput({});
      const runParts = rigs.map((rg) => H.parts(rg.avatar));
      return { k: figs.length, parts, shadows, cost, costNone, runParts };
    }, lane);
    await shot(`${hero}_klone_kurs`, 'course', `${hero}_motor`, { w: 360, h: 260 });
    await S(() => { const H = window.__kst, c = window.__course; for (const rg of c.squad.rigs.values()) if (rg !== H.rig) delete rg.update; H.tick(200); c.squad?.clear?.(); H.courseSave.data.outfit = null; H.tick(2); });
  }
  // Pflaume: Kosten ohne → mit → ohne (Bank-Pose, Halstuch in Kraftfarbe)
  R.pflaume = await S(() => {
    const H = window.__kst, c = window.__course, P = H.pflaume();
    const p0 = c.player.pos;
    P.hull.position.set(p0.x + 2.5, p0.y, p0.z - 1.5); P.hull.rotation.set(0, Math.PI / 2, 0); P.hull.visible = true;
    H.rig.hull.visible = false;
    const pose = (o) => { H.pflPose({}, 40); return { ...H.pflPose({}, 2), cost: H.cost([P.hull], null) }; };
    const a = pose(); P.av.setOutfit('stern'); const b = pose(); P.av.setOutfit('auto'); const d = pose();
    P.hull.visible = false; H.rig.hull.visible = true;
    return { none: a, stern: b, off: d };
  });
  return R;
}

// ---------------------------------------------------------------- Teil close: Nahansichten, Posen, Power-ups (Bank in 1-1)
async function closePart(hero) {
  const G = `${hero}_nah`, GP = `${hero}_posen`, GK = `${hero}_kostueme`, r = {};
  await setHero(hero);
  await S(() => { const H = window.__kst; H.av().setOutfit('stern'); });
  r.idle = await S(() => window.__kst.pose({ state: 'idle' }, 60));
  r.none = await S(() => { const H = window.__kst; H.av().setOutfit(null); const a = H.pose({ state: 'idle' }, 20); H.av().setOutfit('stern'); H.pose({ state: 'idle' }, 20); return a; });
  if (on('nah')) {
    for (const v of ['front', 'side', 'back', 'back0', 'top', 'face', 'hair', 'hairF']) await shot(`${hero}_${v}`, v, G);
    await shot(`${hero}_kursnah`, 'kursnah', G);
    // ohne Kostüm zum Vergleich
    await S(() => { const H = window.__kst; H.av().setOutfit(null); H.pose({ state: 'idle' }, 20); });
    await shot(`${hero}_ohne_front`, 'front', G);
    await shot(`${hero}_ohne_back`, 'back', G);
    await S(() => { const H = window.__kst; H.av().setOutfit('stern'); H.pose({ state: 'idle' }, 20); });
  }
  if (on('posen')) await closePoses(hero, GP, r);
  if (on('kostueme')) await closeCostumes(hero, GK, r);
  await S(() => { const H = window.__kst; H.av().setOutfit('auto'); H.pose({ state: 'idle' }, 10); });
  return r;
}

async function closePoses(hero, GP, r) {
  const list = [
    ['lauf', { state: 'run', speed: 8 }, 50, 'side'],
    ['lauf_kursnah', { state: 'run', speed: 8 }, 7, 'kursnah'],
    ['sprung', { state: 'jump', vy: 5, grounded: false }, 8, 'side'],
    ['fallen', { state: 'fall', vy: -9, grounded: false }, 30, 'front'],
    ['salto', { state: 'jump3', phase: 0.35, grounded: false, vy: 3 }, 6, 'side'],
    ['weitsprung', { state: 'longjump', grounded: false, vy: 1, speed: 9 }, 20, 'side'],
    ['weitsprung_kursnah', { state: 'longjump', grounded: false, vy: 1, speed: 9 }, 6, 'kursnah'],
    ['hocke', { state: 'crouch' }, 20, 'front'],
    ['jubel', { state: 'victory' }, 60, 'front'],
    ['klettern', { state: 'climb', vy: 2, grounded: false }, 40, 'back'],
    ['wandrutschen', { state: 'wallslide', vy: -2, grounded: false }, 30, 'side'],
    ['schwimmen', { state: 'swim', speed: 3 }, 40, 'side'],
    ['tauchen', { state: 'swimUnder', speed: 2 }, 40, 'side'],
    ['kanone', { state: 'cannon', phase: 0.4, speed: 10, vy: 2, grounded: false }, 30, 'side'],
    ['trapez', { state: 'trapeze', swing: 0.5, swingVel: 1, grounded: false }, 30, 'side'],
    ['tragen', { state: 'idle', holding: 'over' }, 30, 'front'],
    ['rutschen', { state: 'slide', speed: 6 }, 30, 'side'],
    ['stampfen', { state: 'groundpound', phase: 0.6, grounded: false, vy: -8 }, 12, 'side'],
    ['statue', { state: 'statue', phase: 0.3 }, 30, 'front'],
    ['schlittschuh', { state: 'skate', speed: 5 }, 40, 'back'],
    ['verletzt', { state: 'hurt' }, 10, 'side'],
  ];
  r.poses = {};
  for (const [name, cc, n, view] of list) {
    r.poses[name] = await S(([cc, n]) => window.__kst.pose(cc, n), [cc, n]);
    await shot(`${hero}_${name}`, view, GP);
  }
  await S(() => window.__kst.pose({ state: 'idle' }, 40));
}

async function closeCostumes(hero, GK, r) {
  // Power-up-Kostüme über dem Sternenkleid
  r.costumes = {};
  for (const [power, view, cc] of [['krallen', 'front', {}], ['funken', 'front', {}], ['gleitblatt', 'back', {}], ['sichel', 'front', {}], ['stern', 'front', {}], ['riese', 'front', {}], ['krallen', 'back', { state: 'run', speed: 6 }]]) {
    const key = `${power}${cc.state ? `_${cc.state}` : ''}`;
    r.costumes[key] = await S(([p, cc]) => window.__kst.pose({ state: 'idle', power: p, ...cc }, 40), [power, cc]);
    await shot(`${hero}_kostuem_${key}`, view, GK);
  }
  r.costumes.wieder = await S(() => window.__kst.pose({ state: 'idle' }, 30));
  // Trage-Helm: Diadem ruht (Lottis Spange bleibt an der Schleife)
  r.helm = await S(() => { const H = window.__kst; H.rig.setHelmet('propeller'); return H.pose({ state: 'idle' }, 20); });
  await shot(`${hero}_helm`, 'front', GK);
  r.helmOff = await S(() => { const H = window.__kst; H.rig.setHelmet(null); return H.pose({ state: 'idle' }, 20); });
  // klein
  r.small = await S(() => { const H = window.__kst; H.rig.hull.scale.setScalar(0.7 / 1.5); return H.pose({ state: 'idle', big: false }, 40); });
  await shot(`${hero}_klein`, 'front', GK);
  await shot(`${hero}_klein_kursnah`, 'kursnah', GK);
  await S(() => { const H = window.__kst; H.rig.hull.scale.setScalar(1 / 1.5); H.pose({ state: 'idle' }, 10); });
}

// ---------------------------------------------------------------- Teil ride: Pflaume und Ritt
async function ridePart() {
  const G = 'pflaume', r = {};
  r.pfl = await S(() => {
    const H = window.__kst, c = window.__course, P = H.pflaume();
    const hull = H.rig.hull;
    P.hull.position.copy(hull.position); P.hull.rotation.set(0, hull.rotation.y, 0); P.hull.visible = true;
    hull.visible = false;
    P.av.setOutfit('stern');
    const a = H.pflPose({}, 40);
    H.hull = P.hull;
    return a;
  });
  for (const v of ['front', 'side', 'back', 'top']) await shot(`pflaume_${v}`, v, G, { cam: { dist: 2.4, h: 0.35 } });
  r.red = await S(() => { const H = window.__kst; return H.pflPose({ power: 'red', state: 'walk', speed: 2 }, 30); });
  await shot('pflaume_kraft_rot', 'front', G, { cam: { dist: 2.4, h: 0.35 } });
  await S(() => { const H = window.__kst; H.pflPose({ power: 'none' }, 10); });
  // Ritt: Heldin mit Sternenkleid auf Pflaume
  for (const hero of HEROES) {
    await setHero(hero);
    r[hero] = await S(() => {
      const H = window.__kst, P = H.pflaume();
      const hull = H.rig.hull;
      hull.visible = true;
      hull.position.copy(P.hull.position); hull.position.y += 0.5;
      hull.rotation.set(0, P.hull.rotation.y, 0);
      H.av().setOutfit('stern');
      const av = H.av();
      for (let i = 0; i < 60; i++) {
        H.pose({ state: 'ride', speed: i > 30 ? 4 : 0 }, 1);
        P.av.obj.course = { state: 'ride', speed: i > 30 ? 4 : 0, vy: 0, grounded: true, power: 'none', gear: null, rider: av };
        P.av.animate(1 / 60, H.t);
      }
      return { hero: H.parts(), pfl: P.av.outfit };
    });
    await shot(`ritt_${hero}_seite`, 'side', G, { cam: { dist: 3.4, h: 0.3 } });
    await shot(`ritt_${hero}_hinten`, 'back', G, { cam: { dist: 3.4, h: 0.3 } });
    await S(() => { const H = window.__kst; H.rig.hull.position.y -= 0.5; });
  }
  await S(() => { const H = window.__kst; H.pfl.hull.visible = false; H.pfl.av.setOutfit('auto'); H.hull = null; H.rig.hull.visible = true; H.av().setOutfit('auto'); });
  return r;
}

// ---------------------------------------------------------------- Läufe
const results = {};
if (on('map')) {
  console.log('\nmap');
  results.map = await mapPart();
  const m = results.map;
  console.log(`  vorher ${JSON.stringify(m.before)}`);
  console.log(`  frei ${JSON.stringify(m.unlock)}`);
  console.log(`  Karte ${JSON.stringify(m.map0)} → Klick ${JSON.stringify(m.click)}; K ${JSON.stringify(m.keyOff)} → ${JSON.stringify(m.keyOn)}; Greta ${JSON.stringify(m.mapGreta)}`);
  console.log(`  Level ${JSON.stringify(m.level)}; neu geladen ${JSON.stringify(m.reload)}`);
  console.log(`  Halloween: Level ${JSON.stringify(m.hwLevel)}; Karte ${JSON.stringify(m.hwMap)}; zurück ${JSON.stringify(m.backMap)}`);
  console.log(`  URL ?outfit=0 ${m.url0}; ?outfit=stern ${JSON.stringify(m.urlStern)}; löschen ${JSON.stringify(m.reset)} → ${JSON.stringify(m.reset2)}`);
  const u = m.unlock;
  check('S-2 vorher: kein Kostüm im Spielstand, Figur ohne Verkleidung', !m.before.outfits?.stern && m.before.av === null && m.before.wish === null && m.before.glanz && !m.before.glanz.unlocked);
  check(`S-2 Baustein sternenglanz: courseSave.data.outfits.stern = { from: '${u.from}' } (gespeichert: ${u.saved}), neu`, u.from === 'S-2' && u.saved === 'S-2' && u.info.isNew && u.info.unlocked);
  check('Freischalten zieht das Kostüm noch nicht an (Wunsch leer, Figur ohne Verkleidung)', (u.outfit === undefined || u.outfit === null) && u.wish === null && u.av === null);
  check('Wunsch im Spielstand (data.outfit = stern) zieht das Kostüm sofort an, ohne Wunsch wieder aus', m.space.on.outfit === 'stern' && m.space.on.stern && m.space.off.outfit === null && !m.space.off.stern);
  check(`Karte: Schalter sichtbar (freigeschaltet), Hinweis einmal („${m.map0.toast}“), Figur noch ohne Kostüm`, m.map0.vis && /Sternenglanz/.test(m.map0.toast) && m.map0.av === null);
  check(`Karte: Klick → Wunsch 'stern' im Spielstand (gespeichert ${m.click.saved}), Figur trägt das Kostüm`, m.click.on === true && m.click.outfit === 'stern' && m.click.saved === 'stern' && m.click.av === 'stern');
  check('Karte: Taste K zieht aus und wieder an', m.keyOff.outfit === null && m.keyOff.av === null && m.keyOn.outfit === 'stern' && m.keyOn.av === 'stern');
  check('Karte: Figurwechsel zu Greta – Greta trägt das Kostüm', m.mapGreta.hero === 'greta' && m.mapGreta.av === 'stern');
  check(`Level von der Karte (1-1): Kostüm aus dem Spielstand (__course.outfit ${m.level.scene})`, m.level.scene === 'stern' && m.level.av === 'stern' && m.level.parts.stern && m.level.parts.fx);
  check('Neu geladenes Level (1-2): Kostüm bleibt (Spielstand)', m.reload.av === 'stern');
  check('Halloween-Level H-1: Halloween-Verkleidung hat Vorrang (Hexenhut, kein Sternenkleid)', m.hwLevel.av === 'halloween' && m.hwLevel.scene === 'halloween' && m.hwLevel.hat && !m.hwLevel.stern);
  check('Kürbisinsel-Karte: Halloween-Verkleidung, Schalter sichtbar, Umschalten merkt nur den Wunsch', m.hwMap.a.scene === 'halloween' && m.hwMap.a.av === 'halloween' && m.hwMap.a.vis && m.hwMap.b.outfit === null && m.hwMap.b.av === 'halloween' && m.hwMap.c.outfit === 'stern' && m.hwMap.c.av === 'halloween' && /gemerkt/.test(m.hwMap.c.toast));
  check('Zurück in Welt 1: wieder Sternenglanz', m.backMap.av === 'stern' && m.backMap.scene === 'stern');
  check('URL ?outfit=0 schaltet auch das Wunsch-Kostüm ab', m.url0 === null);
  check('Spielstand löschen: Schalter weg, Kostüm aus, Umschalten geht nicht', m.reset.vis && m.reset.av === 'stern' && !m.reset2.vis && m.reset2.av === null && !m.reset2.outfits?.stern && m.reset2.toggle === false);
  check('URL ?outfit=stern zieht das Kostüm auch ohne Freischaltung an (Test)', m.urlStern.av === 'stern');
}
if (on('mech')) {
  console.log('\nmech');
  results.mech = await mechPart();
  for (const hero of HEROES) {
    const r = results.mech[hero], N = hero === 'lotti' ? 'Lotti' : 'Greta';
    console.log(`  ${N}: Stand ohne ${JSON.stringify(r.costNone.cost)} · mit ${JSON.stringify(r.costStern.cost)} · wieder ohne ${JSON.stringify(r.costOff.cost)} · Lauf mit ${JSON.stringify(r.costRun)}`);
    console.log(`  ${N}: Funkeln ${JSON.stringify(r.sparkle)}; Weitsprung ${JSON.stringify(r.longjump)}; danach ${JSON.stringify(r.after)}`);
    console.log(`  ${N}: Klone ${JSON.stringify({ k: r.clones.k, cost: r.clones.cost, costNone: r.clones.costNone, shadows: r.clones.shadows, parts: r.clones.parts.map((p) => [p.outfit, p.stern, p.fx, p.lite]), run: r.clones.runParts.map((p) => [p.glints, p.trail]) })}`);
    const a = r.costNone.cost, b = r.costStern.cost, d = r.costOff.cost;
    check(`${N}: Zeichenaufrufe Stand mit Kostüm ${b.calls} ≤ ohne ${a.calls} + 1 (Ziel 0)`, b.calls <= a.calls + 1);
    check(`${N}: Dreiecke mit Kostüm ${b.tris} ≤ 1,3 × ohne ${a.tris} (${(b.tris / a.tris).toFixed(2)}×)`, b.tris <= 1.3 * a.tris);
    check(`${N}: wieder ohne Kostüm exakt wie vorher (${d.calls}/${d.tris})`, d.calls === a.calls && d.tris === a.tris);
    check(`${N}: Lauf mit Funkeln – Zeichenaufrufe ${r.costRun.calls} ≤ ohne ${a.calls} + 1`, r.costRun.calls <= a.calls + 1);
    check(`${N}: Kostüm über den Spielstand an (Kleid, Haarschmuck, Funkeln) und aus`, r.costStern.parts.outfit === 'stern' && r.costStern.parts.stern && r.costStern.parts.fx && r.costOff.parts.outfit === null && !r.costOff.parts.stern && !r.costOff.parts.fx);
    check(`${N}: Funkeln – Stand selten (${r.sparkle.idle.spawns} in 5 s), Lauf oft (${r.sparkle.run.rate}/s bei ${r.sparkle.run.speed} m/s), Glitzer ohne Schatten`, r.sparkle.idle.spawns >= 1 && r.sparkle.idle.spawns <= 5 && r.sparkle.run.s > 0.5 && r.sparkle.run.rate >= 3 && r.sparkle.run.rate >= 3 * r.sparkle.idle.rate && !r.costStern.parts.fxShadow);
    check(`${N}: Weitsprung mit Sternenschweif (${r.longjump.n} Schritte im Weitsprung, bis zu ${r.longjump.maxTrail} Sternchen), vorher keiner, danach vergangen`, r.longjump.seen && r.longjump.before === 0 && r.longjump.maxTrail >= 4 && r.after.trail === 0);
    const cl = r.clones;
    check(`${N}: Klone (lite) tragen das Kostüm ohne Funkeln/Schweif und ohne Schatten (${cl.k} Klone)`, cl.k === 2 && cl.parts.every((p) => p.outfit === 'stern' && p.stern && !p.fx && p.lite) && cl.shadows.every((n) => n === 0) && cl.runParts.every((p) => p.glints === 0 && p.trail === 0));
    check(`${N}: Zeichenaufrufe zweier Klone mit Kostüm ${cl.cost.calls} ≤ ohne ${cl.costNone.calls} + 1`, cl.cost.calls > 0 && cl.cost.calls <= cl.costNone.calls + 1);
  }
  const p = results.mech.pflaume;
  console.log(`  Pflaume: ohne ${JSON.stringify(p.none)} · mit ${JSON.stringify(p.stern)} · wieder ohne ${JSON.stringify(p.off)}`);
  check(`Pflaume: Sternenhalsband im Fell-Mesh (Geometrie ${p.none.fur} → ${p.stern.fur} → ${p.off.fur}), Halstuch bleibt`, p.stern.outfit === 'stern' && p.stern.fur !== p.none.fur && p.off.fur === p.none.fur && p.stern.bandana === p.none.bandana);
  check(`Pflaume: Zeichenaufrufe mit Halsband ${p.stern.cost.calls} ≤ ohne ${p.none.cost.calls} + 1, Dreiecke ${p.stern.cost.tris} ≤ 1,3 × ${p.none.cost.tris}`, p.stern.cost.calls <= p.none.cost.calls + 1 && p.stern.cost.tris <= 1.3 * p.none.cost.tris);
  check('Pflaume: wieder ohne exakt wie vorher', p.off.cost.calls === p.none.cost.calls && p.off.cost.tris === p.none.cost.tris);
}
if (on('nah') || on('posen') || on('kostueme') || on('ride')) {
  await waitCourse(`${base}/?course=1-1&scale=2&adapt=0`, '1-1');
  await setupBench({ drive: false });
  await S(() => { const H = window.__kst; const c = window.__course; const p = c.player; H.rig.hull.position.set(p.pos.x, p.pos.y, p.pos.z); H.rig.hull.rotation.set(0, Math.PI / 2, 0); H.rig.hull.scale.setScalar(1 / 1.5); });
}
if (on('nah') || on('posen') || on('kostueme')) {
  results.close = {};
  for (const hero of HEROES) {
    console.log(`\nclose ${hero}`);
    const c = results.close[hero] = await closePart(hero);
    const N = hero === 'lotti' ? 'Lotti' : 'Greta';
    const P = c.poses;
    console.log(`  Stand ${JSON.stringify(c.idle)}; ohne ${JSON.stringify(c.none)}`);
    check(`${N}: Stand mit Sternenkleid (Kleid, Haarschmuck, Funkeln an)`, c.idle.outfit === 'stern' && c.idle.stern && c.idle.fx && c.idle.hair !== c.none.hair && c.idle.torso !== c.none.torso && c.idle.skirt !== c.none.skirt);
    if (P) {
      console.log(`  Weitsprung ${JSON.stringify(P.weitsprung)}; Statue ${JSON.stringify(P.statue)}`);
      check(`${N}: alle Posen tragen das Kostüm`, Object.values(P).every((p) => p.outfit === 'stern' && p.stern));
      check(`${N}: Weitsprung (Bank) mit Sternenschweif (${P.weitsprung.trail} Sternchen)`, P.weitsprung.trail >= 3);
      check(`${N}: Statue ohne Funkeln`, P.statue.glints === 0 && P.statue.label === 'statue');
    }
    const K = c.costumes;
    if (K) {
    console.log(`  Kostüme ${JSON.stringify(Object.fromEntries(Object.entries(K).map(([k, v]) => [k, [v.costume, v.stern, v.hair, v.torso, v.cap]])))}`);
    console.log(`  Helm ${JSON.stringify(c.helm)} → ${JSON.stringify(c.helmOff)}`);
    check(`${N}: Power-up-Kostüme sitzen darüber (Krallen-Kapuze, Feuer-Kleid, Gleitblatt, Wurfsichel-Mütze, Stern-Glanz, Riese)`,
      K.krallen.costume === 'krallen' && K.krallen.stern && K.funken.costume === 'funken' && K.funken.torso !== c.idle.torso && K.gleitblatt.costume === 'gleitblatt' && K.sichel.cap && K.sichel.costume === 'sichel'
      && K.stern.stern && K.riese.stern && K.wieder.hair === c.idle.hair && K.wieder.torso === c.idle.torso);
    const helmOk = hero === 'greta' ? c.helm.helm && c.helm.hair !== c.idle.hair && c.helmOff.hair === c.idle.hair : c.helm.helm && c.helm.stern && c.helmOff.hair === c.idle.hair;
    check(`${N}: Trage-Helm – ${hero === 'greta' ? 'Diadem ruht' : 'Spange bleibt an der Schleife'}, danach wie vorher`, helmOk);
    check(`${N}: klein – Kostüm vollständig`, c.small.stern && c.small.fx);
    }
  }
}
if (on('ride')) {
  console.log('\nride');
  const r = results.ride = await ridePart();
  console.log(`  ${JSON.stringify(r)}`);
  check(`Pflaume mit Sternenhalsband, Kraftfarbe bleibt sichtbar (Halstuch ${r.pfl.color} → ${r.red.color})`, r.pfl.outfit === 'stern' && r.red.outfit === 'stern' && r.red.color !== r.pfl.color);
  for (const hero of HEROES) check(`Ritt mit ${hero === 'lotti' ? 'Lotti' : 'Greta'}: Sternenkleid in der Reitpose, Pflaume mit Halsband`, r[hero].hero.label === 'ride' && r[hero].hero.stern && r[hero].pfl === 'stern');
}
check('Keine Konsolenfehler', errors.length === 0);
const ok = summary(errors);

// Übersichtsbögen
try {
  await page.goto('about:blank');
  await page.setViewportSize({ width: 1700, height: 400 });
  const b64 = (p) => readFileSync(p).toString('base64');
  for (const g of [...new Set(shotList.map((s) => s.group))]) {
    const list = shotList.filter((s) => s.group === g);
    const imgs = list.map((s) => `<figure><img src="data:image/png;base64,${b64(s.path)}"><figcaption>${s.name}</figcaption></figure>`).join('');
    await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${imgs}</div><style>figure{margin:2px}img{display:block;max-height:300px}</style></body></html>`);
    await page.screenshot({ path: `${OUT}kostuem_stern_sheet_${g}.png`, fullPage: true });
  }
} catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }

await browser.close();
await stop();
process.exit(ok ? 0 : 1);
