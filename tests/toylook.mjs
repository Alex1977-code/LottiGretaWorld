// Spielzeug-Look (three/lib/toyLook.js, Licht-Feinschliff in view/CourseView.js): Vorher/Nachher-Bilder und Kennzahlen.
//
// Jede Ansicht wird zweimal aufgenommen – mit ?toy=0 (Materialien und Licht wie vor dem Spielzeug-Look) und ohne
// Schalter (Spielzeug-Look an) –, beide Bilder übereinander in tests/out/toy_cmp_<name>.png (oben vorher, unten nachher),
// einzeln als toy_0_<name>.png / toy_1_<name>.png. Ansichten: je Welt 2–4 Level aus der Spielkamera (Tag, Höhle, Spuk,
// Unterwasser, Lava …), Figuren-Galerien (Gegner, Bosse, Items/Blöcke, Heldin) aus der Kurs-Kamera und nah, Kurs-Weltkarte.
// Prüfungen: keine Konsolenfehler/-warnungen, Zeichenaufrufe mit und ohne Look gleich, Shader-Programme höchstens
// wenige mehr, Bildzeit (Software-WebGL, readPixels je Bild, gleiche Seite Look an/aus) im Median höchstens +20 %, Spielzeug-
// Materialien vorhanden (bzw. bei ?toy=0 keine), kein Tonemapping (die weiche Schulter sitzt in den Figuren-Materialien).
//
// Aufruf: PORT_BASE=3900 node tests/toylook.mjs   (Vite-Entwicklungsserver, kein Build nötig; Port 4480 + PORT_BASE)
//   TOY_PART=w1,w2,w3,w4,w4x,gallery,map (Standard alle; je Teil ≤ 10 min) · TOY_ONLY=<Namensteil> · TOY_FRAMES=3 (Bildzeit: Runden)
//   TOY_URL=&tone=aces (zusätzliche URL-Parameter für den Nachher-Lauf, z. B. Tonemapping-Vergleich) · TOY_MODES=1
//   (nur nachher) · TOY_TAG=_x (Namenszusatz der Einzelbilder, dann ohne Vergleichsbilder)
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4480 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const PARTS = new Set((process.env.TOY_PART ?? 'w1,w2,w3,w4,w4x,gallery,map').split(','));
const ONLY = process.env.TOY_ONLY ?? '';
const FRAMES = Number(process.env.TOY_FRAMES ?? 3);
const EXTRA = process.env.TOY_URL ?? '';
const MODES = (process.env.TOY_MODES ?? '0,1').split(',');   // TOY_MODES=1 nur nachher (Versuche mit TOY_URL)
const TAG = process.env.TOY_TAG ?? '';                         // Namenszusatz der Einzelbilder (toy_1<TAG>_…)

// [Level, Name, Lage (null = Start), Schritte zum Einschwingen]
const LEVELS = {
  w1: [['1-1', 'start', null, 20], ['1-1', 'terrasse', [-2, 4, -15], 20], ['1-2', 'hoehle', null, 20], ['1-5', 'zirkus', null, 20]],
  w2: [['2-1', 'wueste', null, 20], ['2-3', 'schatten', null, 20], ['2-A', 'lava', null, 20]],
  w3: [['3-1', 'schnee', [0, 1, -12], 20], ['3-3', 'spuk', [64, 1, -38], 20], ['3-5', 'riff', [0, 1, -33], 20], ['3-5', 'unterwasser', [0, -4, -56], 60]],
  w4: [['4-1', 'kolonne', [0, 1, -18], 20], ['4-2', 'giftwald', null, 20], ['4-Burg', 'lavaburg', null, 20]],
  w4x: [['4-3', 'technik', null, 20], ['4-B', 'festung', null, 20], ['3-7', 'herbst', null, 20]],
};
// Galerien: [Level (Licht/Thema), Name, Reihen [[Modell, opts?] …]]
const ROWS = {
  w12: [['pilzling'], ['krallen_pilzling'], ['panzerkroete'], ['schnappblume'], ['krabbelkaefer'], ['brummer'], ['hackvogel'], ['huepfmaus'], ['muenzmarder']],
  w34: [['pilzling_eis'], ['spuk'], ['funkenkaefer'], ['huepfqualle'], ['stachelfisch'], ['ameisensoldat'], ['stachelpanzer'], ['lavabrocken'], ['springklotz']],
  items: [['powerup_wachstumsbeere'], ['powerup_krallen'], ['powerup_stern'], ['oneup'], ['coin'], ['star'], ['question_block'], ['brick_block'], ['pow_block'], ['trampoline']],
  bosse: [['baron_brummbaer'], ['schlangenkoenig'], ['lavafelsen_koenig']],
};
const GALLERIES = [['1-1', 'tag', null], ['3-3', 'spuk', [176, 1, -134]], ['4-Burg', 'lava', null]];   // [Level, Name, Lage der Heldin]

const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-toy`, logLevel: 'warn', clearScreen: false,
  server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false },
});
await server.listen();
const stopServer = async () => { try { await server.close(); } catch { /* schon zu */ } };
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const base = `http://127.0.0.1:${PORT}/`;
const allErrors = [];
const metrics = [];   // { name, mode, calls, tris, programs, ms, toy }
const pairs = [];

const want = (name) => !ONLY || name.includes(ONLY);
const relevant = (list) => list.filter((e) => !/GPU stall|Automatic fallback to software WebGL/.test(e));

let loaded = null;
async function loadCourse(id, mode) {
  const key = `${id}|${mode}`;
  allErrors.push(...relevant(errors.splice(0)));
  if (loaded !== key) {
    await page.goto(`${base}?course=${encodeURIComponent(id)}&scale=2&adapt=0&still=1${mode === '0' ? '&toy=0' : EXTRA}`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 180000 });
    loaded = key;
  }
  await page.waitForTimeout(200);
}

/**
 * Kennzahlen des aktuellen Bildes: Zeichenaufrufe, Dreiecke, Programme, Bildzeit (ms je Bild, Median über Runden).
 * Mit Spielzeug-Look zusätzlich msPlain: dieselbe Seite, abwechselnd Look aus (alle Stärken 0 → Shader überspringt den
 * Block, Tonemapping aus) – so stört die Last anderer Prozesse den Vergleich kaum.
 */
async function measure(kind = 'course', timed = true) {
  return sc(async ([n, k]) => {
    const host = k === 'map' ? window.__courseMap : window.__course;
    const v = host.view, r = v.renderer, gl = r.getContext();
    const lib = await import('/src/three/lib/toyLook.js');
    const draw = () => (k === 'gallery' ? window.__toyGal.render() : host.renderFrame());
    const px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // wartet, bis das Bild fertig ist
    const tone = r.toneMapping, toy = !!v.toyLight;
    for (let i = 0; i < 2; i++) draw();
    // Programme vor dem An/Aus-Wechsel; der übersetzt Programme ohne Tonemapping dazu – die zählen nicht mit
    const programs = r.info.programs.length - (window.__toyPlainProgs ?? 0);
    const progBefore = r.info.programs.length;
    if (toy && !v.__toyWrapped) {
      const orig = v.syncToy;
      v.syncToy = function () { orig.call(this); if (window.__toyOff) lib.setToyLookEnv({ rimStrength: 0, specStrength: 0, saturation: 0, fill: 0 }); };
      v.__toyWrapped = true;
    }
    const set = (off) => { window.__toyOff = off; r.toneMapping = off ? 0 : tone; };
    // ein Bild zeichnen und warten (das erste nach einem Wechsel nicht gemessen) → ms
    const one = () => { const t0 = performance.now(); draw(); sync(); return performance.now() - t0; };
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const A = [], B = [];
    let callsOn = 0, callsOff = 0;
    for (let i = 0; i < 2; i++) draw();
    sync();
    // fein verschränkt (an, aus, an, aus …), Median je Zustand: Lastspitzen anderer Prozesse treffen beide gleich
    // Reihenfolge abwechselnd an→aus / aus→an (ABBA), damit ein Trend (Wärme, Speicherbereinigung) keinen Zustand bevorzugt
    for (let rep = 0; rep < (toy ? 2 * n : n); rep++) {
      const on = () => { set(false); one(); A.push(one()); callsOn = r.info.render.calls; };
      const off = () => { set(true); one(); B.push(one()); callsOff = r.info.render.calls; set(false); };
      if (!toy) on(); else if (rep & 1) { off(); on(); } else { on(); off(); }
    }
    draw(); sync();
    window.__toyPlainProgs = (window.__toyPlainProgs ?? 0) + (r.info.programs.length - progBefore);
    const ms = med(A), msPlain = toy ? med(B) : null;
    return { calls: r.info.render.calls, tris: r.info.render.triangles, programs, ms: +ms.toFixed(1), msPlain: msPlain && +msPlain.toFixed(1), callsOn, callsOff: toy ? callsOff : null, toy: lib.toyStats(), tone: r.toneMapping, exposure: r.toneMappingExposure };
  }, [timed ? FRAMES : 1, kind]);
}

async function settle(frames = 8) {
  const host = await sc(() => (window.__courseMap ? 'map' : 'course'));
  const f0 = await sc((h) => (h === 'map' ? window.__courseMap : window.__course).view.frame, host);
  await page.waitForFunction(([h, f, k]) => (h === 'map' ? window.__courseMap : window.__course).view.frame >= f + k, [host, f0, frames], { timeout: 120000 });
}

async function shoot(name, mode, kind = 'course', timed = true) {
  const m = await measure(kind, timed);
  metrics.push({ name, mode, ...m });
  await page.screenshot({ path: `${OUT}toy_${mode}${TAG}_${name}.png` });
  return m;
}

// ------------------------------------------------------------------ Level-Ansichten
async function levelShots(list) {
  for (const [id, label, pos, steps] of list) {
    const name = `${id}_${label}`;
    if (!want(name)) continue;
    for (const mode of MODES) {
      await loadCourse(id, mode);
      await sc(([p, n]) => {
        const c = window.__course, pl = c.player;
        c.setInput(null);
        if (p) { pl.reset(p, Math.PI / 2); c.level.controlYaw = c.view.rig.controlYaw(pl.pos); }
        c.step(n);
        pl.invuln = 0;
        c.snapCamera();
      }, [pos, steps]);
      await settle();
      const m = await shoot(name, mode);
      console.log(`  ${name.padEnd(22)} toy=${mode}  ${String(m.calls).padStart(3)} Aufrufe  ${String(Math.round(m.tris / 1000)).padStart(4)} k  ${String(m.programs).padStart(3)} Progr.  ${String(m.ms).padStart(6)} ms`);
    }
    pairs.push(name);
  }
}

// ------------------------------------------------------------------ Galerien (Modelle neben der Heldin)
async function gallery(id, label, pos) {
  for (const mode of MODES) {
    loaded = null;
    await loadCourse(id, mode);
    const info = await sc(async ([rows, pos]) => {
      const c = window.__course, v = c.view, pl = c.player;
      if (pos) { pl.reset(pos, Math.PI / 2); c.level.controlYaw = c.view.rig.controlYaw(pl.pos); }
      const reg = await import('/src/course/models/index.js');
      const { THREE } = await import('/src/course/models/lib/kit.js');
      c.setInput(null);
      c.step(10);
      pl.invuln = 0;
      const p0 = pl.pos.clone();
      const stage = new THREE.Group();
      stage.name = 'toy-galerie';
      v.three.add(stage);
      const live = [], fails = [];
      const tb = new THREE.Box3();
      // Umriss eines Modells aus seinen Meshes (ohne Sprites/Instanzen), auf ±2,5 m um den Fußpunkt begrenzt
      const boxOf = (root) => {
        const mb = new THREE.Box3();
        root.updateMatrixWorld(true);
        root.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); mb.union(tb); });
        const p = root.position;
        if (mb.isEmpty()) mb.setFromCenterAndSize(p.clone().setY(p.y + 0.5), new THREE.Vector3(0.8, 1, 0.8));
        return mb.intersect(new THREE.Box3(new THREE.Vector3(p.x - 2.5, p.y - 0.2, p.z - 2.5), new THREE.Vector3(p.x + 2.5, p.y + 4, p.z + 2.5)));
      };
      const put = (list, z, gap, scale = 1) => {
        const ms = [];
        for (const [name, opts] of list) {
          try {
            const m = reg.getModel(name, opts ?? {});
            m.root.scale.setScalar(scale);
            for (let i = 0; i < 20; i++) m.update(1 / 30, 'idle');
            stage.add(m.root);
            ms.push(m); live.push(m);
          } catch (e) { fails.push(`${name}: ${e.message}`); }
        }
        for (const m of ms) { m.root.position.set(p0.x, p0.y, p0.z + z); m.root.rotation.y = -Math.PI / 2 + 0.5; }
        const B = ms.map((m) => boxOf(m.root));
        const W = B.map((b) => Math.max(0.5, b.max.x - b.min.x));
        const total = W.reduce((a, w) => a + w, 0) + gap * (ms.length - 1);
        let x = p0.x - total / 2;
        ms.forEach((m, i) => { m.root.position.x = x + (p0.x - B[i].min.x); x += W[i] + gap; });
        return ms;
      };
      const rowsBuilt = { w12: put(rows.w12, -3, 0.35), w34: put(rows.w34, -5.6, 0.35), items: put(rows.items, -8, 0.35), bosse: put(rows.bosse, -12, 1.2) };
      // Nahansichten: je Reihe Gruppen zu höchstens 5 Modellen (w12a, w12b, …)
      const groups = {};
      for (const [k, ms] of Object.entries(rowsBuilt)) {
        if (ms.length <= 5) { groups[k] = ms; continue; }
        const h = Math.ceil(ms.length / 2);
        groups[`${k}a`] = ms.slice(0, h); groups[`${k}b`] = ms.slice(h);
      }
      c.snapCamera();
      const cam = v.camera;
      const av = () => c.rig?.avatar?.root ?? null;
      window.__toyGal = {
        live, stage, groups,
        // Nahansicht: eigene Kamera auf eine Reihe (Heldin ausgeblendet) bzw. auf die Heldin, ohne Spielschleife
        setNah(k) {
          window.__game.loop.sleep();
          window.__game.canvas.style.visibility = 'hidden';
          const hero = av();
          hero?.updateMatrixWorld?.(true);
          let ctr, dist;
          const vf = THREE.MathUtils.degToRad(30);
          cam.fov = 30; cam.updateProjectionMatrix();
          const hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
          const hull = c.rig?.hull ?? null;
          if (k === 'heldin') {
            if (hull) hull.visible = true;
            for (const m of live) m.root.visible = false;
            const b = new THREE.Box3().setFromObject(hero ?? stage);
            ctr = b.getCenter(new THREE.Vector3());
            const size = b.getSize(new THREE.Vector3());
            dist = (size.y / 2) / Math.tan(vf / 2) * 1.5;
            const q = new THREE.Quaternion(); (hero ?? stage).getWorldQuaternion(q);
            const fw = new THREE.Vector3(1, 0, 0).applyQuaternion(q); fw.y = 0; fw.normalize();
            const side = new THREE.Vector3(0, 0, 1);
            const d = fw.lerp(side, 0.35).normalize();
            cam.position.copy(ctr).addScaledVector(d, dist).add(new THREE.Vector3(0, dist * 0.22, 0));
          } else {
            if (hull) hull.visible = false;
            for (const m of live) m.root.visible = groups[k].includes(m);
            const b = new THREE.Box3();
            for (const m of groups[k]) b.union(boxOf(m.root));
            ctr = b.getCenter(new THREE.Vector3());
            const size = b.getSize(new THREE.Vector3());
            dist = Math.max((size.x / 2) / Math.tan(hf / 2), (size.y / 2) / Math.tan(vf / 2)) * 1.08 + size.z / 2;
            cam.position.copy(ctr).add(new THREE.Vector3(0, dist * 0.3, dist));
          }
          cam.lookAt(ctr);
          this.nahOn = true;
          this.render();
        },
        render() {
          if (!this.nahOn) { c.renderFrame(); return; }
          v.render(0, null, null);   // ohne Figur: Kamera bleibt, Sonne/Schatten, Bündel, Pools, Randlicht wie im Spiel
        },
      };
      return { fails, n: live.length };
    }, [ROWS, pos]);
    if (info.fails.length) console.log('   Modelle ohne Bau:', info.fails.join('; '));
    await settle();
    let name = `galerie_${label}_kurs`;
    let m = await shoot(name, mode, 'gallery');
    console.log(`  ${name.padEnd(22)} toy=${mode}  ${String(m.calls).padStart(3)} Aufrufe  ${String(m.programs).padStart(3)} Progr.  ${String(m.ms).padStart(6)} ms  (${info.n} Modelle)`);
    for (const k of ['heldin', 'w12a', 'w12b', 'w34a', 'w34b', 'itemsa', 'itemsb', 'bosse']) {
      name = `galerie_${label}_${k}`;
      if (!want(name)) continue;
      await sc((kk) => window.__toyGal.setNah(kk), k);
      await page.waitForTimeout(80);
      m = await shoot(name, mode, 'gallery', k === 'w12a');   // Bildzeit nur in einer Nahansicht (Laufzeit)
      if (mode === '1') pairs.push(name);
    }
    if (mode === '1' && want(`galerie_${label}_kurs`)) pairs.push(`galerie_${label}_kurs`);
  }
}

// ------------------------------------------------------------------ Kurs-Weltkarte
async function mapShots() {
  for (const [world, label] of [[1, 'welt1'], [4, 'welt4']]) {
    const name = `karte_${label}`;
    if (!want(name)) continue;
    for (const mode of MODES) {
      loaded = null;
      allErrors.push(...relevant(errors.splice(0)));
      await page.goto(`${base}?map=1&scale=2&adapt=0${mode === '0' ? '&toy=0' : EXTRA}`, { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction(() => window.__courseSave, null, { timeout: 180000 });
      await sc((w) => {
        const s = window.__courseSave;
        const levels = {};
        const ids = ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg', '2-1', '2-2', '2-3', '2-Haus', '2-4', '2-A', '2-5', '2-Panzer',
          '3-1', '3-2', '3-3', '3-Kapitän', '3-4', '3-A', '3-5', '3-6', '3-B', '3-7', '3-Zug'];
        if (w === 4) for (const id of ids) levels[id] = { done: true, stars: [true, true, true], stamp: false, bestTime: null, bestPole: 0 };
        s.data = { ...s.data, levels, world: w, worlds: w === 4 ? [1, 2, 3, 4] : [1], mapPos: null };
        s.save();
        if (window.__courseMap) window.__courseMap.leaving = true;
      }, world);
      await page.goto(`${base}?map=1&scale=2&adapt=0${mode === '0' ? '&toy=0' : EXTRA}`, { waitUntil: 'load', timeout: 180000 });
      await page.waitForFunction((w) => window.__courseMap && window.__courseMap.player && window.__game.scene.isActive('CourseMap') && window.__courseMap.map.world === w, world, { timeout: 200000 });
      await sc(() => { const m = window.__courseMap; m.setManual(true); m.level.muted = true; m.setInput({}); m.step(30); m.snapCamera?.(); });
      await page.waitForTimeout(1500);
      await settle(10);
      const m = await shoot(name, mode, 'map');
      console.log(`  ${name.padEnd(22)} toy=${mode}  ${String(m.calls).padStart(3)} Aufrufe  ${String(m.programs).padStart(3)} Progr.  ${String(m.ms).padStart(6)} ms`);
    }
    pairs.push(name);
  }
}

// ------------------------------------------------------------------ Ablauf
for (const w of ['w1', 'w2', 'w3', 'w4', 'w4x']) if (PARTS.has(w)) { console.log(`\nLevel ${w}`); await levelShots(LEVELS[w]); }
if (PARTS.has('gallery')) for (const [id, label, pos] of GALLERIES) { if (!want(`galerie_${label}`) && !ONLY.startsWith(`galerie_${label}_`)) continue; console.log(`\nGalerie ${label} (${id})`); await gallery(id, label, pos); }
if (PARTS.has('map')) { console.log('\nKarte'); await mapShots(); }
allErrors.push(...relevant(errors.splice(0)));

// ------------------------------------------------------------------ Vorher/Nachher übereinander
if (pairs.length && MODES.length === 2 && !TAG) {
  await page.goto('about:blank');
  for (const name of pairs) {
    const a = readFileSync(`${OUT}toy_0_${name}.png`).toString('base64');
    const b = readFileSync(`${OUT}toy_1_${name}.png`).toString('base64');
    const out = await page.evaluate(async ([A, B, n]) => {
      const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = `data:image/png;base64,${s}`; });
      const [ia, ib] = await Promise.all([load(A), load(B)]);
      const cv = document.createElement('canvas');
      cv.width = ia.width; cv.height = ia.height + ib.height;
      const g = cv.getContext('2d');
      g.drawImage(ia, 0, 0); g.drawImage(ib, 0, ia.height);
      g.font = 'bold 15px sans-serif';
      for (const [t, y] of [[`${n} – vorher (?toy=0)`, 4], [`${n} – nachher (Spielzeug-Look)`, ia.height + 4]]) {
        const w = g.measureText(t).width + 12;
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(4, y, w, 22);
        g.fillStyle = '#fff'; g.fillText(t, 10, y + 16);
      }
      return cv.toDataURL('image/png');
    }, [a, b, name]);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${OUT}toy_cmp_${name}.png`, Buffer.from(out.split(',')[1], 'base64'));
  }
  console.log(`\n  ${pairs.length} Vergleichsbilder: tests/out/toy_cmp_*.png`);
}

// ------------------------------------------------------------------ Prüfungen
console.log('\n  Kennzahlen (vorher → nachher):');
let worstMs = 0, worstProg = 0, callsSame = true, worstPage = 0;
const ratios = [];
const names = [...new Set(metrics.map((m) => m.name))];
for (const n of names) {
  const a = metrics.find((m) => m.name === n && m.mode === '0'), b = metrics.find((m) => m.name === n && m.mode === '1');
  if (!a || !b) continue;
  const r = b.ms / Math.max(1, a.ms);           // getrennte Seitenläufe (anfällig für Last anderer Prozesse)
  const rp = b.msPlain ? b.ms / Math.max(1, b.msPlain) : r;   // dieselbe Seite, abwechselnd an/aus
  worstMs = Math.max(worstMs, rp);
  if (b.msPlain) ratios.push(rp);
  worstPage = Math.max(worstPage, r);
  worstProg = Math.max(worstProg, b.programs - a.programs);
  // gleiche Seite, gleicher Zustand: Look an/aus exakt gleich viele Aufrufe; getrennte Läufe nur zur Anzeige (Zufalls-
  // phasen der Modelle, Blinzeln, Partikel)
  if (b.callsOff !== null && b.callsOff !== b.callsOn) callsSame = false;
  console.log(`    ${n.padEnd(26)} Aufrufe ${a.calls}→${b.calls} (gleiche Seite aus/an ${b.callsOff}/${b.callsOn})  Progr. ${a.programs}→${b.programs}  Bild ${a.ms}→${b.ms} ms (×${r.toFixed(2)}; gleiche Seite aus/an ${b.msPlain}→${b.ms} ×${rp.toFixed(2)})  Spielzeug-Mat. ${b.toy.materials}`);
}
const m0 = metrics.filter((m) => m.mode === '0'), m1 = metrics.filter((m) => m.mode === '1');
if (metrics.length) {
  check('?toy=0: keine Spielzeug-Materialien, kein Tonemapping', m0.every((m) => m.toy.materials === 0 && m.tone === 0));
  check('Spielzeug-Look: Materialien gepatcht, Randlicht aktiv, Tonemapping aus (Schulter nur in den Figuren)', m1.every((m) => m.toy.materials > 10 && m.tone === 0 && m.toy.env.rimStrength > 0) || !!EXTRA);
  check('Zeichenaufrufe mit und ohne Spielzeug-Look gleich (gleiche Seite, an/aus)', callsSame);
  check(`Shader-Programme höchstens 14 mehr (max +${worstProg})`, worstProg <= 14);
  // Software-WebGL rechnet Pixel auf der CPU (Zusatz-Befehle zählen voll); Rechnerlast anderer Läufe streut einzelne
  // Messungen – geprüft wird der Median über alle gemessenen Ansichten, das schlechteste Bild steht dabei
  const medR = ratios.length ? ratios.slice().sort((x, y) => x - y)[ratios.length >> 1] : 1;
  check(`Bildzeit mit Look: Median ≤ +20 % (Software-WebGL, gleiche Seite an/aus, Median ×${medR.toFixed(2)}, schlechtestes ×${worstMs.toFixed(2)}; getrennte Läufe ×${worstPage.toFixed(2)})`, medR <= 1.2);
}
await browser.close();
await stopServer();
process.exit(summary(allErrors) ? 0 : 1);
