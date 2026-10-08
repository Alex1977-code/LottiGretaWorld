// Galerie und Prüfung der Kurs-Modelle (src/course/models/kinds/*.js).
//
// Lädt das 3D-Klassik-Level (?level=level1&scale=2&r3d=1&adapt=0) über einen Vite-Entwicklungsserver
// (die Modell-Registry nutzt import.meta.glob und wird vom Spiel noch nicht eingebunden), hält die
// Spielschleife an, räumt die Szene frei (Welt-Meshes und Avatare unsichtbar, Licht bleibt), legt einen
// Boden mit 1-m-Raster aus und stellt die Modelle in Reihen auf. Je Gruppe eine Nahaufnahme
// (tests/out/cm_*.png), ein Zustandsbild, ein Gruppenbild mit Größenvergleich (1-m-Würfel, Heldin auf
// 1 m skaliert) und eine Ansicht aus Kurs-Kameraentfernung (14 m, 50° Neigung).
// Prüfungen: alle Namen in listModels(), jedes Modell baut, update() mit allen Zuständen ohne Fehler,
// ≤ 12 Meshes je Modell, dispose() ohne Fehler, Instanz-Helfer, keine Konsolenfehler.
//
// Aufruf: PORT_BASE=1200 node tests/course_models.mjs   (kein Build nötig)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4320 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null; // nur bestimmte Bilder

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const ENEMIES = [
  ['pilzling', {}, { anim: 'walk', speed: 1.5 }, ['walk', 'idle', 'alert', 'squashed', 'stunned']],
  ['krallen_pilzling', {}, { anim: 'walk', speed: 2 }, ['walk', 'idle', 'alert', 'squashed', 'stunned', 'pounce']],
  ['pilzlingsturm', { count: 4 }, { anim: 'walk', speed: 1.2 }, ['walk', 'idle', 'alert', 'stunned', { anim: 'walk', count: 2 }]],
  ['panzerkroete', {}, { anim: 'walk', speed: 1.5 }, ['walk', 'idle', 'stunned', 'hide']],
  ['panzer', {}, 'idle', ['idle', 'spin']],
  ['schnappblume', {}, 'idle', ['idle', 'snap', 'retreat']],
  ['rammbock_bulle', {}, 'idle', ['idle', 'charge', 'stunned', 'hit', { anim: 'idle', hp: 1 }, 'defeated']],
  ['krabbelkaefer', {}, { anim: 'walk', speed: 1.5 }, ['walk', 'idle', 'squashed']],
  ['flatterkaefer', {}, 'fly', ['fly', 'walk', 'squashed']],
  ['zauberkroete', {}, 'idle', ['idle', 'appear', 'cast', 'vanish']],
  ['brummer', {}, 'fly', ['fly', 'warn', 'dive', 'squashed']],
  ['stampfstein', {}, 'wait', ['wait', 'fall', 'angry', 'rise']],
  ['wuehler', {}, 'pop', ['hide', 'pop', 'idle']],
];
const BIG = [
  ['riesenschnappblume', {}, 'idle', ['idle', 'snap', 'retreat', 'hit']],
  ['baron_brummbaer', { withCar: true }, { anim: 'drive', speed: 8 }, ['drive', { anim: 'throw', progress: 0.3 }, { anim: 'hit', progress: 0.4 }, 'stunned', 'defeated']],
  ['baron_brummbaer', { withCar: false }, 'idle', ['idle', { anim: 'throw', progress: 0.35 }, 'stunned']],
  ['kickbombe', {}, { anim: 'walk', speed: 1.2 }, ['walk', 'lit', 'kicked', 'idle']],
];
const POWERUPS = [
  ['powerup_wachstumsbeere', {}, 'idle', ['idle']],
  ['powerup_krallen', {}, 'idle', ['idle']],
  ['powerup_funken', {}, 'idle', ['idle']],
  ['powerup_riese', {}, 'idle', ['idle']],
  ['powerup_stern', {}, 'idle', ['idle']],
  ['oneup', {}, 'idle', ['idle']],
];
const COLLECT = [
  ['coin', {}, 'idle', ['idle', 'collected']],
  ['coin_blue', {}, 'idle', ['idle', 'collected']],
  ['star', {}, 'idle', ['idle', 'collected']],
  ['stamp', {}, 'idle', ['idle', 'collected']],
  ['time_ring', {}, 'idle', ['idle', 'active', 'done']],
  ['checkpoint_flag', {}, 'on', ['off', 'on']],
  ['goal_pole', { height: 8 }, { flagY: 0.75 }, [{ flagY: 0 }, { flagY: 1 }, { flagY: 0.5 }]],
];
const BLOCKS = [
  ['question_block', {}, 'idle', ['idle', 'bump', 'used']],
  ['brick_block', {}, 'idle', ['idle', 'bump', 'break']],
  ['used_block', {}, 'idle', ['idle', 'bump']],
  ['hidden_block', { debug: true }, 'hidden', ['hidden', 'revealed']],
  ['crystal_block', {}, 'idle', ['idle', 'bump', 'break']],
  ['pow_block', {}, 'idle', ['idle', 'hit', { anim: 'idle', uses: 1 }]],
];
const PROPS = [
  ['pipe', { height: 2 }, 'idle', ['idle']],
  ['glass_pipe_segment', { length: 3 }, 'idle', ['idle']],
  ['beanstalk', { height: 5 }, 'idle', ['idle', { anim: 'grow', grow: 0.5 }]],
  ['trampoline', {}, 'idle', ['idle', 'bounce']],
  ['boost_arrow', {}, 'idle', ['idle']],
  ['switch_tile', {}, 'off', ['off', 'on']],
  ['lantern', {}, 'on', ['off', 'on']],
  ['bunny_small', {}, 'idle', ['idle', 'hop', 'caught']],
  ['fairy_spotter', {}, 'look', ['idle', 'look', 'cheer']],
];
const EXTRA = [
  ['zauberkugel', {}, 'idle', ['idle']],
  ['funkenball', {}, 'idle', ['idle']],
  ['guardrail', { length: 4 }, 'idle', ['idle']],
  ['traffic_light', {}, 'green', ['red', 'yellow', 'green']],
  ['river_rock', {}, 'idle', ['idle']],
  ['speed_wave', {}, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...BIG, ...POWERUPS, ...COLLECT, ...BLOCKS, ...PROPS, ...EXTRA];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm`, logLevel: 'warn', clearScreen: false,
  server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false },
});
await server.listen();
const stop = async () => { try { await server.close(); } catch { /* schon zu */ } };
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);

await page.goto(`http://127.0.0.1:${PORT}/?level=level1&scale=2&r3d=1&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Play') && window.__view3d, null, { timeout: 90000 });
} catch {
  console.log('Spiel startet nicht. Konsole:'); for (const x of errors) console.log('  ', x);
  await browser.close(); await stop(); process.exit(1);
}
await page.waitForTimeout(500);

// Registry laden, Spielschleife anhalten, Bühne aufbauen
await sc(async () => {
  const reg = await import('/src/course/models/index.js');
  const kit = await import('/src/course/models/lib/kit.js');
  const inst = await import('/src/course/models/lib/instanced.js').catch(() => null);
  const THREE = kit.THREE;
  const v = window.__view3d;
  window.__game.loop.sleep();
  window.__game.canvas.style.visibility = 'hidden';
  const scene = v.three;
  const keep = new Set();
  const hero = [...v.avatars.values()].find((a) => a.textureKey === 'lotti' || a.textureKey === 'greta');
  for (const ch of scene.children) {
    if (ch === v.world.group || (hero && ch === hero.root)) continue;
    ch.visible = false;
  }
  v.world.group.traverse((o) => { if (o.isMesh || o.isSprite || o.isPoints || o.isLine) o.visible = false; });
  scene.background = new THREE.Color(0xbfe3ff);
  scene.fog = null;
  // Boden: 1-m-Schachbrett (zwei Grüntöne), empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#8fd16a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#7fc35c'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60, 40); tex.magFilter = THREE.NearestFilter; tex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group(); scene.add(stage);
  const labels = document.createElement('div');
  labels.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:50;font:bold 11px sans-serif;color:#1d2340';
  document.body.appendChild(labels);

  const live = [];
  const cm = {
    reg, kit, inst, THREE, v, stage, hero, live, labels,
    /** Bühne leeren (dispose aller Modelle). */
    clear() {
      for (const m of live.splice(0)) m.dispose();
      stage.clear();
      labels.innerHTML = '';
      if (hero) hero.root.visible = false;
    },
    /** Modell aufstellen und mehrere Schritte animieren. */
    put(name, opts, state, x, z, yaw = -Math.PI / 2 + 0.55, steps = 24, label = name) {
      const m = reg.getModel(name, opts ?? {});
      m.root.position.set(x, 0, z); m.root.rotation.y = yaw;
      stage.add(m.root);
      for (let i = 0; i < steps; i++) m.update(1 / 30, state);
      live.push(m);
      m.label = label;
      return m;
    },
    /** Breite (x) eines Modells nach dem ersten Bild. */
    width(m) {
      const b = cm.bounds(m.root);
      if (b.isEmpty()) b.setFromCenterAndSize(m.root.position.clone().setY(0.5), new THREE.Vector3(0.6, 1, 0.6)); // unsichtbar (z. B. vanish)
      return { w: b.max.x - b.min.x, h: b.max.y - b.min.y, minX: b.min.x - m.root.position.x, maxX: b.max.x - m.root.position.x, box: b };
    },
    /** Eine Reihe von Modellen nebeneinander (automatischer Abstand), mittig um x = 0. */
    row(list, z = 0, gap = 0.45, yaw) {
      const ms = list.map(([name, opts, state, , label]) => cm.put(name, opts, state, 0, z, yaw, 24, label ?? name));
      const ws = ms.map((m) => cm.width(m));
      const total = ws.reduce((a, w) => a + (w.maxX - w.minX), 0) + gap * (ms.length - 1);
      let x = -total / 2;
      ms.forEach((m, i) => { m.root.position.x = x - ws[i].minX; x += ws[i].maxX - ws[i].minX + gap; });
      return ms;
    },
    /** Kamera: Ziel, Richtung (Azimut um Y von +Z aus, Elevation), Abstand oder automatisch. */
    cam(target, el, dist, fov = 30, az = 0) {
      const cam = v.camera;
      cam.fov = fov; cam.updateProjectionMatrix();
      const t = new THREE.Vector3(...target);
      const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      cam.position.copy(t).addScaledVector(d, dist);
      cam.lookAt(t);
      v.target.copy(t);
      v.world.lighting.update(new THREE.Vector3(t.x, t.y, 0));
    },
    /** Enge Hülle aus echten Mesh-Geometrien (ohne Instanz-Volumen, Sprites). */
    bounds(obj) {
      const b = new THREE.Box3(), tmp = new THREE.Box3();
      obj.updateMatrixWorld(true);
      obj.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        let vis = true; for (let p = o.parent; p; p = p.parent) if (!p.visible) vis = false;
        if (!vis) return;
        if (o.isInstancedMesh) {
          const m = new THREE.Matrix4(), w = new THREE.Matrix4();
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); w.multiplyMatrices(o.matrixWorld, m); tmp.copy(o.geometry.boundingBox).applyMatrix4(w); if (!tmp.isEmpty() && w.determinant() !== 0) b.union(tmp); }
          return;
        }
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        b.union(tmp);
      });
      return b;
    },
    /** Kamera so setzen, dass alle Modelle auf der Bühne ins Bild passen. */
    frame(el = 0.25, fov = 30, margin = 1.08, az = 0) {
      const b = cm.bounds(stage);
      const ctr = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
      const vf = THREE.MathUtils.degToRad(fov), hf = 2 * Math.atan(Math.tan(vf / 2) * v.camera.aspect);
      const dw = (size.x / 2) / Math.tan(hf / 2) + size.z / 2;
      const dh = ((size.y * Math.cos(el) + size.z * Math.sin(el)) / 2) / Math.tan(vf / 2) + size.z / 2;
      cm.cam([ctr.x, ctr.y, ctr.z], el, Math.max(dw, dh) * margin, fov, az);
    },
    render() {
      v.renderer.render(v.three, v.camera);
      // Beschriftungen unter den Modellen
      labels.innerHTML = '';
      const r = v.canvas.getBoundingClientRect();
      for (const m of live) {
        if (!m.label) continue;
        const p = m.root.position.clone(); p.y -= 0.05;
        p.project(v.camera);
        if (p.z > 1) continue;
        const d = document.createElement('div');
        d.textContent = m.label;
        d.style.cssText = `position:absolute;transform:translate(-50%,0);white-space:nowrap;background:rgba(255,255,255,.7);padding:0 3px;border-radius:3px;left:${r.left + (p.x + 1) / 2 * r.width}px;top:${r.top + (1 - p.y) / 2 * r.height}px`;
        labels.appendChild(d);
      }
    },
    meshes(obj) { let n = 0; obj.traverse((o) => { if (o.isMesh || o.isSprite) n++; }); return n; },
  };
  window.__cm = cm;
});

const shot = async (name) => {
  if (ONLY && !ONLY.includes(name)) return;
  await sc(() => window.__cm.render());
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}cm_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);

// ------------------------------------------------------------------ Prüfungen
const names = await sc(() => window.__cm.reg.listModels());
console.log(`  ${names.length} Modelle registriert`);
const unique = [...new Set(ALL.map(([n]) => n))];
const missing = unique.filter((n) => !names.includes(n));
check(`alle ${unique.length} Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
check('Platzhalter für unbekannten Namen', await sc(() => window.__cm.reg.getModel('gibtsnicht').placeholder === true));

const cycle = await sc((all) => {
  const cm = window.__cm; const out = { counts: {}, tris: {}, fails: [] };
  for (const [name, opts, , states] of all) {
    if (!cm.reg.hasModel(name)) continue;
    try {
      const m = cm.reg.getModel(name, opts);
      if (!m.root || typeof m.update !== 'function' || typeof m.dispose !== 'function') throw new Error('Vertrag verletzt');
      cm.stage.add(m.root);
      for (const st of states) for (let i = 0; i < 40; i++) m.update(1 / 30, st);
      m.update(0.016, undefined); m.update(0.016, 'idle'); m.update(0.5, {});
      out.counts[name] = cm.meshes(m.root);
      let tris = 0;
      m.root.traverse((o) => { if (o.isMesh) { const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
      out.tris[name] = Math.round(tris);
      m.dispose();
      if (m.root.parent) throw new Error('root hängt nach dispose() noch in der Szene');
    } catch (e) { out.fails.push(`${name}: ${e.message}`); }
  }
  return out;
}, ALL);
console.log('  Meshes je Modell:', JSON.stringify(cycle.counts));
console.log('  Dreiecke je Modell:', JSON.stringify(cycle.tris));
for (const f of cycle.fails) console.log('   Fehler:', f);
check('alle Modelle bauen, alle Zustände, dispose() ohne Fehler', cycle.fails.length === 0);
const over = Object.entries(cycle.counts).filter(([, n]) => n > 12);
check(`≤ 12 Meshes je Modell${over.length ? ` (zu viel: ${over.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, over.length === 0);

// Instanz-Helfer
const instInfo = await sc(() => {
  const cm = window.__cm; const out = {};
  if (!cm.inst) return null;
  for (const kind of ['coin', 'question_block', 'brick_block', 'used_block']) {
    const I = cm.inst.createInstanced(kind, 200);
    cm.stage.add(I.root);
    const p = new cm.THREE.Vector3();
    for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, i % 7 === 0 ? 'bump' : 'idle');
    I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
    for (let k = 0; k < 10; k++) I.update(1 / 30);
    let tris = 0, meshes = 0;
    I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
    out[kind] = { meshes, tris: Math.round(tris) };
    I.dispose();
  }
  return out;
});
console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
check('Instanz-Helfer für coin, question_block, brick_block, used_block', !!instInfo && Object.keys(instInfo).length === 4 && Object.values(instInfo).every((x) => x.meshes >= 1 && x.meshes <= 3));

// ------------------------------------------------------------------ Bilder
const gallery = async (name, list, el = 0.22, gap = 0.45, per = 4) => {
  for (let i = 0; i * per < list.length; i++) {
    const nm = `${name}_${i + 1}`;
    if (!want(nm) && !want(name)) continue;
    const part = list.slice(i * per, (i + 1) * per);
    await sc(([list, el, gap]) => { const cm = window.__cm; cm.clear(); cm.row(list.filter(([n]) => cm.reg.hasModel(n)), 0, gap); cm.frame(el); }, [part, el, gap]);
    if (ONLY && !ONLY.includes(nm) && ONLY.includes(name)) ONLY.push(nm);
    await shot(nm);
  }
};

await gallery('enemies', ENEMIES, 0.2, 0.5);
await gallery('big', BIG, 0.2, 0.8);
await gallery('powerups', POWERUPS, 0.18, 0.5);
await gallery('collect', COLLECT, 0.18, 0.6);
await gallery('blocks', BLOCKS, 0.3, 0.6);
await gallery('props', PROPS, 0.3, 0.6);
await gallery('extra', EXTRA, 0.3, 0.6);

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (tests/out/cm_st_<name>.png)
const seen = new Set();
for (const [n, o, , states] of [...ENEMIES, ...BIG, ...COLLECT, ...BLOCKS, ...PROPS, ...EXTRA]) {
  if (states.length < 2) continue;
  const nm = seen.has(n) ? `st_${n}_2` : `st_${n}`;
  seen.add(n);
  if (!want(nm) && !want('states')) continue;
  const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${v}`)).join(' '));
  await sc(([rows]) => {
    const cm = window.__cm; cm.clear();
    if (!cm.reg.hasModel(rows[0][0])) return;
    cm.row(rows, 0, 0.6);
    cm.frame(0.3, 30, 1.05);
  }, [states.map((st) => [n, o, st, null, label(st)])]);
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
}

// Gruppenbild mit Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert), zwei Bilder
const LINEUPS = [ENEMIES.slice(0, 9), ENEMIES.slice(9).concat(BIG)];
for (let li = 0; li < LINEUPS.length; li++) {
  const nm = `lineup_${li + 1}`;
  if (!want(nm) && !want('lineup')) continue;
  await sc((list) => {
    const cm = window.__cm; const THREE = cm.THREE; cm.clear();
    const ms = cm.row(list.filter(([n]) => cm.reg.hasModel(n)), 0, 0.35, -Math.PI / 2 + 0.35);
    const b = cm.bounds(cm.stage);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    cube.position.set(b.min.x - 0.9, 0.5, 0); cube.castShadow = true;
    cm.stage.add(cube);
    if (cm.hero) {
      cm.hero.root.visible = true;
      cm.hero.root.position.set(b.min.x - 2.1, 0, 0);
      cm.hero.root.scale.setScalar(1 / 1.5);
    }
    const b2 = cm.bounds(cm.stage);
    if (cm.hero) b2.union(new THREE.Box3().setFromObject(cm.hero.root));
    const c = b2.getCenter(new THREE.Vector3()), sz = b2.getSize(new THREE.Vector3());
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * cm.v.camera.aspect);
    const dh = (sz.y / 2) / Math.tan(THREE.MathUtils.degToRad(15));
    cm.cam([c.x, sz.y / 2, 0], 0.1, Math.max((sz.x / 2) / Math.tan(hf / 2), dh) * 1.06 + sz.z / 2);
    ms.forEach((m) => { m.label = m.label.replace(/_.*/, ''); });
    cm.live.push({ root: cube, label: '1 m', dispose() { cube.geometry.dispose(); cube.material.dispose(); cube.removeFromParent(); } });
  }, LINEUPS[li].map(([n, o, s]) => [n, o, s]));
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
}

// Kurs-Sicht: Kamera 14 bzw. 16 m, Neigung 50°, FOV 45°, Modelle verstreut wie im Level
// (jedes zweite blickt zur Kamera, die anderen laufen quer nach +X)
if (want('course')) {
  await sc((list) => {
    const cm = window.__cm; cm.clear();
    const ok = list.filter(([n]) => cm.reg.hasModel(n));
    ok.forEach(([n, o, s], i) => {
      const col = i % 7, row = Math.floor(i / 7);
      cm.put(n, o, s, (col - 3) * 2.5, 1.5 - row * 3.1, i % 2 ? -Math.PI / 2 : Math.atan2(-0.3, 1), 24, n.replace(/_.*/, ''));
    });
    cm.cam([0, 0.4, -3.4], 50 * Math.PI / 180, 14, 45);
  }, ENEMIES.concat(BIG, POWERUPS.slice(0, 3), BLOCKS.slice(0, 2), COLLECT.slice(0, 3)).map(([n, o, s]) => [n, o, s]));
  if (ONLY && !ONLY.includes('course')) ONLY.push('course');
  await shot('course');
  await sc(() => { const cm = window.__cm; cm.cam([0, 0.4, -3.4], 50 * Math.PI / 180, 16, 45); for (const m of cm.live) m.label = null; });
  if (ONLY && !ONLY.includes('course_far')) ONLY.push('course_far');
  await shot('course_far');
}

await sc(() => window.__cm.clear());
check('keine Konsolenfehler', errors.length === 0);
await browser.close();
await stop();
process.exit(summary(errors) ? 0 : 1);
