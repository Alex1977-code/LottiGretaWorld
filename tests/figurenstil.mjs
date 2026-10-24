// Figurenstil (Rückmeldung „figurenstil mehr wie supermarioworld“): Vergleichsbilder und Kennzahlen der Figuren Lotti, Greta,
// Pflaume und Krümel im Kurs-Licht (Level 1-1, CourseView). Vite-Entwicklungsserver (kein Build nötig) – so lassen sich die
// Avatar-Klassen und das Modell-Register direkt im Browser laden.
//
// Bilder (tests/out/fs_<label>_*.png, label = FS_LABEL, Standard „nachher“): Nahaufnahmen vorne/seitlich/hinten, Gesicht,
// Posen (Sprung, Lauf, Landung), Kostüme (Krallen, Funken, Stern, Gleitblatt, Schlittschuh), klein, Klone (lite), Reiten auf
// Pflaume, Pflaume mit Stirnlampe, Krümel (idle/scared/cheer), Gruppenbild, Kurs-Kamera (45°, 13 m, FOV 38) und die
// Kurs-Weltkarte. Übersichtsbögen fs_<label>_sheet_*.png; liegen Bilder mit dem Label „vorher“ vor, zusätzlich
// Vergleichsbögen fs_vergleich_*.png (links vorher, rechts nachher).
// Kennzahlen (fs_<label>.json): Zeichenaufrufe und Dreiecke je Figur als Differenz zweier Bilder (Figur sichtbar/unsichtbar,
// inkl. Schattenpass, Figur-Bündel und Schatten-Stellvertreter), dazu Meshes und Dreiecke der Geometrie.
// Prüfungen: keine Konsolenfehler; Zeichenaufrufe je Heldin ≤ FS_MAX_CALLS (Standard 11); Dreiecke je Heldin höchstens 1,5× der
// Vorher-Messung (falls fs_vorher.json vorhanden).
//
// Vorher-Bilder: einen zweiten Arbeitsbaum mit dem alten Stand anlegen und den Test mit FS_ROOT=<pfad> FS_LABEL=vorher laufen
// lassen (Bilder landen trotzdem hier unter tests/out/).
// Aufruf: PORT_BASE=3300 node tests/figurenstil.mjs   (FS_PARTS=hero,pets,extra,map für Teilläufe; Port 4350 + PORT_BASE)
import { createServer } from 'vite';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4350 + Number(process.env.PORT_BASE ?? 0);
const ROOT = process.env.FS_ROOT ?? new URL('..', import.meta.url).pathname;
const LABEL = process.env.FS_LABEL ?? 'nachher';
const PARTS = (process.env.FS_PARTS ?? 'hero,pets,extra,map').split(',').filter(Boolean);
const on = (p) => PARTS.includes(p);
const MAX_CALLS = Number(process.env.FS_MAX_CALLS ?? 11);

const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-fs-${LABEL}`, logLevel: 'warn', clearScreen: false,
  server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false },
});
await server.listen();
const stop = async () => { try { await server.close(); } catch { /* schon zu */ } };
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const shots = [];
const metrics = {};
const prev = existsSync(`${OUT}fs_${LABEL}.json`) ? JSON.parse(readFileSync(`${OUT}fs_${LABEL}.json`, 'utf8')) : {};
Object.assign(metrics, prev);   // Teilläufe ergänzen sich

async function openCourse() {
  await page.goto(`http://127.0.0.1:${PORT}/?course=1-1&scale=2&adapt=0`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 240000 });
  } catch {
    console.log('Kurs startet nicht. Konsole:'); for (const x of errors) console.log('  ', x);
    await browser.close(); await stop(); process.exit(1);
  }
  await page.waitForTimeout(500);
  await sc(async () => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
    const heroMod = await import('/src/three/avatars/hero.js');
    const reg = await import('/src/course/models/index.js');
    const kit = await import('/src/course/models/lib/kit.js');
    const THREE = kit.THREE;
    const view = c.view;
    const H = window.__fs = { c, view, THREE, heroMod, reg, t: 10, dt: 1 / 60, figs: {}, cam: { mode: 'close', rel: -0.45, el: 0.12, dist: 2.6, fov: 30, h: 0.62 }, focus: null };
    H.base = c.player.pos.clone();
    // Gegner, Münzen und Effekte in der Nähe stören die Bilder nicht (bleiben, Simulation steht)
    // Haupt-Heldin: HeroRig festhalten (kein Füllen aus der Simulation)
    const rig = c.rig;
    rig.update = () => {};
    H.figs.hero = { kind: 'hero', hull: rig.hull, get avatar() { return rig.avatar; }, rig, h: 1.0 };
    // Pflaume: eigene Hülle (Name „pflaume“ → Schatten-Stellvertreter/Figur-Bündel wie im Spiel), 1,3 m wie die Diorama-Figur
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
    // Krümel: Registry-Modell (wie KruemelRig × 1,35)
    const kHull = new THREE.Group(); kHull.name = 'kruemel-test'; view.three.add(kHull);
    const km = reg.getModel('kruemel');
    km.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    kHull.add(km.root);
    H.figs.kruemel = { kind: 'kruemel', hull: kHull, model: km, h: 0.5, scale: 1.35 };
    // Lage: Figur an (dx, dz) neben dem Start, Gier yaw (π/2 = Blick nach −Z), Maßstab
    H.place = (key, dx = 0, dz = 0, yaw = Math.PI / 2, big = true, dy = 0) => {
      const f = H.figs[key];
      f.hull.position.set(H.base.x + dx, H.base.y + dy, H.base.z + dz);
      f.hull.rotation.set(0, yaw, 0);
      if (f.rig) f.rig.yaw = yaw;
      const s = f.kind === 'hero' ? (big ? 1 : 0.7) / 1.5 : f.scale / (f.kind === 'pflaume' ? 1 : 1);
      f.hull.scale.setScalar(s);
      f.big = big;
      f.hull.visible = true;
    };
    H.hide = (key) => { H.figs[key].hull.visible = false; };
    H.place('hero'); H.place('pflaume', 0, -6); H.place('kruemel', 0, -8);
    H.hide('pflaume'); H.hide('kruemel');
    // Zustand setzen und n Bilder animieren
    H.pose = (key, cc = {}, n = 30) => {
      const f = H.figs[key];
      for (let i = 0; i < n; i++) {
        H.t += H.dt;
        if (f.kind === 'kruemel') { f.model.update(H.dt, cc); continue; }
        const av = f.avatar;
        av.obj.course = f.kind === 'hero'
          ? { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: f.big ?? true, holding: false, climbing: false, ...cc }
          : { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: null, rider: null, ...cc };
        av.animate(H.dt, H.t);
        if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004;   // wie HeroRig.update
      }
    };
    // Kamera: Nahaufnahme relativ zur Blickrichtung der Figur (rel 0 = von vorn) oder Kurs-Kamera (45°, 13 m, FOV 38)
    // Größe der Figur in Metern (Kamera-Abstand und Zielhöhe skalieren damit): Heldin 1 m (klein 0,7), Pflaume ≈ 0,9 m, Krümel ≈ 1 m (mit Ohren)
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
    // Kennzahlen: Zeichenaufrufe/Dreiecke als Differenz (Figur sichtbar – unsichtbar), gleicher Kamerastand
    const grab = () => { c.renderFrame(); const r = view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
    H.cost = (keys) => {
      const hulls = keys.map((k) => (typeof k === 'string' ? H.figs[k].hull : k));
      grab();
      const a = grab();
      for (const h of hulls) h.visible = false;
      grab();
      const b = grab();
      for (const h of hulls) h.visible = true;
      grab();
      return { calls: a.calls - b.calls, tris: a.tris - b.tris };
    };
    /** Meshes und Dreiecke der sichtbaren Geometrie einer Figur (ohne Schattenpass). */
    H.geo = (key) => {
      let meshes = 0, tris = 0;
      H.figs[key].hull.traverseVisible((o) => {
        if (!(o.isMesh || o.isLine || o.isSprite)) return;
        meshes++;
        const g = o.geometry; if (!g) return;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      });
      return { meshes, tris: Math.round(tris) };
    };
    H.frames = (n) => { for (let i = 0; i < n; i++) c.renderFrame(); };
  });
}

const VIEWS = {
  front: { mode: 'close', rel: -0.5, el: 0.12, dist: 2.7, fov: 30, h: 0.6 },
  front0: { mode: 'close', rel: 0, el: 0.1, dist: 2.7, fov: 30, h: 0.6 },
  face: { mode: 'close', rel: -0.42, el: 0.06, dist: 1.25, fov: 30, h: 0.8 },
  faceSide: { mode: 'close', rel: -1.25, el: 0.06, dist: 1.25, fov: 30, h: 0.8 },
  side: { mode: 'close', rel: -Math.PI / 2, el: 0.08, dist: 2.7, fov: 30, h: 0.6 },
  back: { mode: 'close', rel: Math.PI - 0.4, el: 0.3, dist: 2.7, fov: 30, h: 0.6 },
  course: { mode: 'course', el: Math.PI / 4, az: 0 },
};
const cam = (v, extra = {}) => sc(([v, e]) => { window.__fs.cam = { ...v, ...e }; }, [v, extra]);
const focus = (key) => sc((k) => { window.__fs.focus = k; }, key);
const pose = (key, cc, n = 30) => sc(([k, cc, n]) => window.__fs.pose(k, cc, n), [key, cc ?? {}, n]);
const place = (key, ...a) => sc(([k, a]) => window.__fs.place(k, ...a), [key, a]);
const hide = (key) => sc((k) => window.__fs.hide(k), key);
async function shot(name, view, group, o = {}) {
  await cam(VIEWS[view], o.cam ?? {});
  await sc(() => window.__fs.frames(3));
  let clip = { x: 280, y: 40, width: 400, height: 460 };
  if (view === 'course') {
    const p = await sc((k) => window.__fs.screen(k, 0.5), o.focus ?? 'hero');
    const w = o.w ?? 320, h = o.h ?? 240;
    clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
  }
  if (o.clip) clip = o.clip;
  const path = `${OUT}fs_${LABEL}_${name}.png`;
  try { await page.screenshot({ path, clip, timeout: 120000 }); shots.push({ name, path, group }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}
const cost = (keys) => sc((k) => window.__fs.cost(k), keys);
const geoOf = (key) => sc((k) => window.__fs.geo(k), key);
async function measure(name, keys = ['hero'], key = keys[0]) {
  await cam(VIEWS.front);
  const c = await cost(keys), g = await geoOf(key);
  metrics[name] = { calls: c.calls, tris: c.tris, meshes: g.meshes, geoTris: g.tris };
  console.log(`  ${name.padEnd(30)} Aufrufe ${String(c.calls).padStart(3)}  Dreiecke ${String(c.tris).padStart(6)}  (Meshes ${g.meshes}, Geometrie ${g.tris})`);
  return metrics[name];
}

// ---------------------------------------------------------------- Heldinnen
async function heroine(key) {
  const P = key;
  await focus('hero');
  await place('hero');
  await pose('hero', { state: 'idle' }, 60);
  await measure(`${key} idle`);
  await shot(`${P}_front`, 'front', `${P}`); await shot(`${P}_front0`, 'front0', `${P}`); await shot(`${P}_side`, 'side', `${P}`); await shot(`${P}_back`, 'back', `${P}`);
  await shot(`${P}_face`, 'face', `${P}_face`); await shot(`${P}_face_side`, 'faceSide', `${P}_face`);
  // Blinzeln (Augen zu) und Lächeln
  await sc(() => { const av = window.__fs.figs.hero.avatar; av.__bl = av.blinker.update; av.blinker.update = () => 0.08; });
  await pose('hero', { state: 'idle' }, 2); await shot(`${P}_face_blink`, 'face', `${P}_face`);
  await sc(() => { const av = window.__fs.figs.hero.avatar; av.blinker.update = av.__bl; });
  await pose('hero', { state: 'jump', vy: 5, grounded: false }, 14); await shot(`${P}_jump`, 'front', `${P}_pose`); await shot(`${P}_jump_face`, 'face', `${P}_face`);
  await pose('hero', { state: 'run', speed: 8 }, 40); await shot(`${P}_run`, 'side', `${P}_pose`);
  await pose('hero', { state: 'land' }, 3); await shot(`${P}_land`, 'front', `${P}_pose`);
  await pose('hero', { state: 'victory' }, 50); await shot(`${P}_victory`, 'front', `${P}_pose`);
  await pose('hero', { state: 'idle' }, 30);
  // Kurs-Kamera: von hinten (Blick −Z), seitlich (Blick +X) und von vorn
  await shot(`${P}_course_back`, 'course', `${P}_course`);
  await place('hero', 0, 0, 0); await pose('hero', { state: 'run', speed: 8 }, 30); await shot(`${P}_course_run`, 'course', `${P}_course`);
  await place('hero', 0, 0, -Math.PI / 2 + 0.3); await pose('hero', { state: 'idle' }, 30); await shot(`${P}_course_front`, 'course', `${P}_course`);
  await place('hero');
  if (!on('extra')) return;
  // Kostüme
  for (const power of ['krallen', 'funken', 'stern', 'gleitblatt']) {
    await pose('hero', { state: 'idle', power }, 30);
    if (power !== 'stern') await measure(`${key} ${power}`);
    await shot(`${P}_${power}`, 'front', `${P}_kostuem`); await shot(`${P}_${power}_back`, 'back', `${P}_kostuem`);
  }
  await pose('hero', { state: 'glide', power: 'gleitblatt', grounded: false, vy: -1.5, speed: 3 }, 60); await shot(`${P}_glide`, 'front', `${P}_kostuem`);
  await pose('hero', { state: 'idle', power: 'gleitblatt' }, 20); await shot(`${P}_gleitblatt_course`, 'course', `${P}_course`);
  await place('hero', 0, 0, Math.PI / 2, true, 0.1);
  await pose('hero', { state: 'skate', skates: true, speed: 5, power: 'none' }, 40); await shot(`${P}_skate`, 'front', `${P}_kostuem`);
  await place('hero');
  await pose('hero', { state: 'idle', power: 'none' }, 40);
  // klein
  await place('hero', 0, 0, Math.PI / 2, false);
  await pose('hero', { state: 'idle', big: false }, 30);
  await measure(`${key} klein`);
  await shot(`${P}_small`, 'front', `${P}_course`); await shot(`${P}_small_course`, 'course', `${P}_course`);
  await place('hero');
  await pose('hero', { state: 'idle' }, 30);
}

// ---------------------------------------------------------------- Pflaume, Krümel, Gruppe, Reiten, Klone
async function pets() {
  await place('hero', 0, 0, Math.PI / 2); await hide('hero');
  await focus('pflaume'); await place('pflaume');
  await pose('pflaume', { state: 'idle' }, 60);
  await measure('pflaume idle', ['pflaume']);
  await shot('pflaume_front', 'front', 'pflaume', { cam: { h: 0.5 } }); await shot('pflaume_front0', 'front0', 'pflaume', { cam: { h: 0.5 } });
  await shot('pflaume_side', 'side', 'pflaume', { cam: { h: 0.5 } }); await shot('pflaume_back', 'back', 'pflaume', { cam: { h: 0.5 } });
  await shot('pflaume_face', 'face', 'pflaume', { cam: { h: 0.78, dist: 1.5, rel: -0.6 } });
  await pose('pflaume', { state: 'walk', speed: 2 }, 30); await shot('pflaume_walk', 'side', 'pflaume_pose', { cam: { h: 0.45 } });
  await pose('pflaume', { state: 'jump', vy: 4, grounded: false }, 14); await shot('pflaume_jump', 'side', 'pflaume_pose', { cam: { h: 0.45 } });
  await pose('pflaume', { state: 'victory' }, 20); await shot('pflaume_victory', 'front', 'pflaume_pose', { cam: { h: 0.45 } });
  await pose('pflaume', { state: 'idle', gear: 'lamp' }, 40); await shot('pflaume_lamp', 'front', 'pflaume_pose', { cam: { h: 0.45 } });
  await shot('pflaume_lamp_course', 'course', 'pflaume_pose', { focus: 'pflaume' });
  await pose('pflaume', { state: 'idle', gear: null }, 10);
  await hide('pflaume');
  // Krümel
  await focus('kruemel'); await place('kruemel');
  await pose('kruemel', { anim: 'idle' }, 40);
  await measure('kruemel idle', ['kruemel']);
  await shot('kruemel_front', 'front', 'kruemel', { cam: { h: 0.5 } }); await shot('kruemel_side', 'side', 'kruemel', { cam: { h: 0.5 } });
  await shot('kruemel_back', 'back', 'kruemel', { cam: { h: 0.5 } }); await shot('kruemel_face', 'face', 'kruemel', { cam: { h: 0.62, dist: 1.6 } });
  await pose('kruemel', { anim: 'scared' }, 30); await shot('kruemel_scared', 'front', 'kruemel', { cam: { h: 0.5 } });
  await pose('kruemel', { anim: 'cheer' }, 20); await shot('kruemel_cheer', 'front', 'kruemel', { cam: { h: 0.5 } });
  await pose('kruemel', { anim: 'idle' }, 20);
  // Gruppenbild: Lotti, Pflaume, Krümel nebeneinander (Blick zur Kamera +Z, leicht gedreht)
  await place('hero', -1.05, 0, -Math.PI / 2 + 0.3); await place('pflaume', 0.15, -0.15, -Math.PI / 2 + 0.55); await place('kruemel', 1.25, 0.15, -Math.PI / 2 + 0.35);
  await pose('hero', { state: 'idle' }, 30); await pose('pflaume', { state: 'idle' }, 30); await pose('kruemel', { anim: 'idle' }, 30);
  await focus('pflaume');
  const tgt = await sc(() => { const b = window.__fs.base; return [b.x + 0.05, b.y + 0.5, b.z]; });
  await shot('gruppe', 'front0', 'gruppe', { cam: { target: tgt, dist: 4.8, el: 0.1, az: 0 }, clip: { x: 130, y: 70, width: 700, height: 400 } });
  await shot('gruppe_course', 'course', 'gruppe', { focus: 'pflaume', cam: { az: 0.0 }, w: 360, h: 260 });
  // Reiten: Heldin auf Pflaume (Fußpunkt 0,5 m über Pflaume, beide Hüllen 1 m wie im Floß-Level)
  await place('pflaume', 0, 0, Math.PI / 2 - 1.1); await place('hero', 0, 0, Math.PI / 2 - 1.1, true, 0.5); await hide('kruemel');
  await sc(() => { const H = window.__fs; H.figs.pflaume.hull.scale.setScalar(1 / 1.5); });
  for (let i = 0; i < 24; i++) {
    await sc(() => { const H = window.__fs, av = H.figs.hero.avatar; H.pose('hero', { state: 'ride', speed: 4 }, 1); H.t -= H.dt; H.pose('pflaume', { state: 'ride', speed: 4, rider: av }, 1); });
  }
  await shot('ride', 'front', 'ride', { cam: { h: 0.75, dist: 3.4, rel: -1.0 } });
  await shot('ride_course', 'course', 'ride', { focus: 'pflaume' });
  await measure('ritt (heldin + pflaume)', ['hero', 'pflaume'], 'hero');
  await place('pflaume'); await hide('pflaume');
  await place('hero');
  await pose('hero', { state: 'idle' }, 30);
}

async function clones() {
  const ok = await sc(() => {
    const H = window.__fs, c = H.c;
    H.clones = [];
    for (const dz of [-1.3, 1.3]) {
      const f = c.level.addClone(c.player);
      if (!f) continue;
      const rig = c.squad.rigs.get(f);
      rig.update = () => {};
      const key = `klon${H.clones.length}`;
      H.figs[key] = { kind: 'hero', hull: rig.hull, get avatar() { return rig.avatar; }, rig, h: 1.0 };
      H.place(key, 1.1, dz);
      H.clones.push(key);
    }
    H.place('hero');
    return H.clones.length;
  });
  check('Zwei Klone (lite) angelegt', ok === 2);
  if (ok !== 2) return;
  for (const k of ['hero', 'klon0', 'klon1']) await pose(k, { state: 'idle' }, 30);
  await focus('klon0');
  await measure('klon (lite) idle', ['klon0']);
  await focus('hero');
  await shot('klone_front', 'front', 'klone', { cam: { dist: 4.4, h: 0.55 } });
  await shot('klone_course', 'course', 'klone', { w: 360, h: 260 });
  for (const k of ['hero', 'klon0', 'klon1']) await pose(k, { state: 'run', speed: 7, power: 'gleitblatt' }, 30);
  await shot('klone_run_course', 'course', 'klone', { w: 360, h: 260 });
  for (const k of ['hero', 'klon0', 'klon1']) await pose(k, { state: 'idle', power: 'none' }, 30);
}

if (on('hero') || on('pets') || on('extra')) {
  await openCourse();
  check('Kurs 1-1 lädt ohne Konsolenfehler', errors.length === 0);
  if (on('hero')) {
    await heroine('lotti');
    await sc(() => { const H = window.__fs, r = H.figs.hero.rig; r.player.hero = 'greta'; r.build('greta'); H.place('hero'); });
    check('Greta-Avatar gebaut', await sc(() => window.__fs.figs.hero.avatar.variant === 'greta'));
    await heroine('greta');
    await sc(() => { const H = window.__fs, r = H.figs.hero.rig; r.player.hero = 'lotti'; r.build('lotti'); H.place('hero'); });
  }
  if (on('pets')) await pets();
  if (on('extra')) await clones();
  for (const k of ['lotti idle', 'greta idle']) {
    const m = metrics[k];
    if (!m) continue;
    check(`${k}: ${m.calls} Zeichenaufrufe (höchstens ${MAX_CALLS})`, m.calls <= MAX_CALLS);
  }
}

// ---------------------------------------------------------------- Kurs-Weltkarte (Karten-Figur)
if (on('map')) {
  await page.goto(`http://127.0.0.1:${PORT}/?map=1&scale=2&adapt=0`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__courseMap && window.__courseMap.player && window.__game.scene.isActive('CourseMap'), null, { timeout: 240000 });
    await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}fs_${LABEL}_karte.png` }); shots.push({ name: 'karte', path: `${OUT}fs_${LABEL}_karte.png`, group: 'karte' });
    const p = await sc(() => {
      const m = window.__courseMap, v = m.view, pos = m.player.pos.clone(); pos.y += 0.5;
      pos.project(v.camera);
      return { x: (pos.x + 1) / 2 * window.innerWidth, y: (1 - pos.y) / 2 * window.innerHeight };
    });
    const clip = { x: Math.round(Math.max(0, Math.min(960 - 240, p.x - 120))), y: Math.round(Math.max(0, Math.min(540 - 180, p.y - 90))), width: 240, height: 180 };
    await page.screenshot({ path: `${OUT}fs_${LABEL}_karte_nah.png`, clip }); shots.push({ name: 'karte_nah', path: `${OUT}fs_${LABEL}_karte_nah.png`, group: 'karte' });
    check('Kurs-Weltkarte mit Heldin', true);
  } catch (err) { console.log('  Weltkarte:', err.message.split('\n')[0]); check('Kurs-Weltkarte mit Heldin', false); }
}

// ---------------------------------------------------------------- Kennzahlen, Vergleich, Übersichtsbögen
writeFileSync(`${OUT}fs_${LABEL}.json`, JSON.stringify(metrics, null, 1));
const before = LABEL !== 'vorher' && existsSync(`${OUT}fs_vorher.json`) ? JSON.parse(readFileSync(`${OUT}fs_vorher.json`, 'utf8')) : null;
if (before) {
  console.log('\n  Kennzahl                        vorher (Aufrufe/Dreiecke)   nachher');
  for (const [k, m] of Object.entries(metrics)) {
    const b = before[k];
    console.log(`  ${k.padEnd(30)} ${b ? `${String(b.calls).padStart(3)} / ${String(b.tris).padStart(6)}` : '      –     '}         ${String(m.calls).padStart(3)} / ${String(m.tris).padStart(6)}`);
  }
  for (const k of ['lotti idle', 'greta idle', 'pflaume idle']) {
    const a = before[k], b = metrics[k];
    if (a && b) check(`${k}: Dreiecke ${b.tris} ≤ 1,5 × ${a.tris}`, b.tris <= 1.5 * a.tris);
    if (a && b && k !== 'pflaume idle') check(`${k}: Zeichenaufrufe ${b.calls} ≤ vorher ${a.calls}`, b.calls <= a.calls);
  }
}
check('Keine Konsolenfehler', errors.length === 0);
const ok = summary(errors);

try {
  await page.goto('about:blank');
  await page.setViewportSize({ width: 1700, height: 400 });
  const b64 = (p) => readFileSync(p).toString('base64');
  for (const g of [...new Set(shots.map((s) => s.group))]) {
    const list = shots.filter((s) => s.group === g);
    const imgs = list.map((s) => `<figure><img src="data:image/png;base64,${b64(s.path)}"><figcaption>${s.name}</figcaption></figure>`).join('');
    await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${imgs}</div><style>figure{margin:2px}img{display:block;max-height:320px}</style></body></html>`);
    await page.screenshot({ path: `${OUT}fs_${LABEL}_sheet_${g}.png`, fullPage: true });
  }
  // Vergleich vorher | nachher (je Bild ein Paar)
  if (LABEL !== 'vorher') {
    for (const g of [...new Set(shots.map((s) => s.group))]) {
      const pairs = shots.filter((s) => s.group === g).map((s) => [`${OUT}fs_vorher_${s.name}.png`, s.path, s.name]).filter(([a]) => existsSync(a));
      if (!pairs.length) continue;
      const html = pairs.map(([a, b, n]) => `<figure><div style="display:flex"><img src="data:image/png;base64,${b64(a)}"><img src="data:image/png;base64,${b64(b)}"></div><figcaption>${n}: vorher | nachher</figcaption></figure>`).join('');
      await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${html}</div><style>figure{margin:3px}img{display:block;max-height:300px;margin-right:2px}</style></body></html>`);
      await page.screenshot({ path: `${OUT}fs_vergleich_${g}.png`, fullPage: true });
    }
  }
} catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }

await browser.close();
await stop();
process.exit(ok ? 0 : 1);
