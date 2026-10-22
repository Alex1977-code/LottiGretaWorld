// Galerie und Prüfung der Welt-2-Modelle (src/course/models/kinds/*_w2*.js, Instanz-Helfer lib/instanced.js).
//
// Wie tests/course_models.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die
// Spielschleife an, räumt die Szene frei, legt einen Boden mit 1-m-Raster aus und stellt die Modelle auf.
// Bilder (tests/out/cm2_*.png): Galerie je Gruppe, ein Zustandsbild je Modell, Gruppenbilder mit
// Größenvergleich (1-m-Würfel, Heldin auf 1 m skaliert) und Ansichten aus der Kurs-Kamera (45°, 13 m, FOV 38°)
// auf Sand – Gegner, Requisiten, Instanz-Kolonnen.
// Prüfungen: alle Namen in listModels(), jedes Modell baut, update() mit allen Zuständen ohne Fehler,
// ≤ 12 Meshes je Modell, dispose() ohne Fehler (auch mit allen opts-Varianten), Zusatz-Methoden (beakTip,
// hand, muzzle, mouth), Instanz-Helfer (marschblock, sandblock, kaktus, wuschel + Welt-1-Arten), keine
// Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_w2.mjs   (kein Build nötig; CM2_ONLY=name,… für einzelne Bilder)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4330 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM2_ONLY ? process.env.CM2_ONLY.split(',') : null;

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf, Beschriftung?, Anheben in m (schwebende Teile)?]
const ENEMIES = [
  ['hackvogel', {}, 'idle', ['idle', { anim: 'walk', speed: 1.4 }, 'wind', 'peck', 'stuck', 'squashed']],
  ['rollpilz', {}, { anim: 'walk', speed: 1.4 }, ['walk', 'idle', 'flipped', 'carried', 'thrown', 'squashed']],
  ['wuschel', {}, 'move', ['idle', 'move']],
  ['huepfmaus', {}, 'idle', ['idle', 'walk', { anim: 'hop', progress: 0.3 }, 'land', 'stunned', 'squashed']],
  ['huepfmaus_stachel', {}, 'idle', ['idle', 'walk', { anim: 'hop', progress: 0.3 }, 'land', 'stunned', 'squashed']],
  ['marschblock', { color: 'red' }, 'march', ['march', 'idle', 'panic', 'squashed']],
  ['pilzling_mini', {}, { anim: 'walk', speed: 1.2 }, ['walk', 'idle', 'alert', 'squashed', 'stunned']],
  ['muenzmarder', {}, 'idle', [{ anim: 'run', speed: 7 }, 'idle', 'hit', 'defeated']],
  ['lauerblock', {}, { anim: 'peek' }, ['wait', 'peek', 'push', 'back', { anim: 'push', out: 0.6 }]],
];
const WERFER = [
  ['feuer_werfer', { kind: 'feuer' }, 'idle', ['idle', 'walk', 'jump', { anim: 'throw', progress: 0.3 }, 'throw', 'stunned', 'squashed'], 'feuer'],
  ['feuer_werfer', { kind: 'hammer' }, 'idle', ['idle', { anim: 'throw', progress: 0.3 }], 'hammer'],
  ['feuer_werfer', { kind: 'bumerang' }, 'idle', ['idle', { anim: 'throw', progress: 0.3 }], 'bumerang'],
  ['feuer_schnappblume', {}, 'idle', ['idle', { anim: 'aim', aim: -0.4 }, { anim: 'spit', progress: 0.3 }, { anim: 'spit', progress: 0.52 }, 'retreat', 'hit']],
  ['projektilkopf', {}, 'fly', ['fly', 'launch', 'fall']],
  ['suchkopf', {}, 'seek', ['fly', 'seek', 'launch', 'fall']],
  ['kanone_turm', { sides: 2 }, 'idle', ['idle', { anim: 'charge', progress: 0.7 }, { anim: 'fire', progress: 0.12 }, { anim: 'idle', aim: 0.8 }]],
  ['feuerkugel', {}, 'idle', ['idle']],
  ['wurf_hammer', {}, 'spin', ['spin', 'idle']],
  ['wurf_bumerang', {}, 'spin', ['spin', 'idle']],
];
const BIG = [
  ['grossrollpilz', {}, { anim: 'walk', speed: 1.2 }, ['walk', 'idle', 'flipped', 'carried', 'thrown', 'squashed']],
  ['wirbelbrocken', {}, 'idle', ['idle', 'run', 'spin', 'hide', { anim: 'hide', speed: 6 }, 'hit', 'stunned', { anim: 'idle', hp: 2 }, { anim: 'idle', hp: 1 }, 'defeated']],
];
const ITEMS = [
  ['powerup_spiegel', {}, 'idle', ['idle']],
  ['helm_kanone', {}, 'idle', ['idle', { anim: 'fire', progress: 0.1 }]],
  ['helm_propeller', {}, 'spin', ['idle', 'spin', 'fly']],
  ['helm_licht', {}, { on: true }, [{ on: false }, { on: true }, { anim: 'flash', on: true }]],
  ['kanonenkugel', {}, 'idle', ['idle', { anim: 'roll', speed: 5 }]],
  ['topfpflanze', {}, 'idle', ['idle', 'snap', 'carried']],
  ['kruemel', {}, 'scared', ['idle', 'scared', 'cheer', 'hop']],
];
const DESERT = [
  ['sandblock', {}, 'idle', ['idle', 'shake', { crumble: 0.5 }, 'crumble', 'gone']],
  ['treibsand', { size: [3, 3] }, 'idle', ['idle', { speed: 2 }]],
  ['kaktus', { variant: 'saeule' }, 'idle', ['idle'], 'saeule'],
  ['kaktus', { variant: 'kugel' }, 'idle', ['idle'], 'kugel'],
  ['kaktus', { variant: 'feige' }, 'idle', ['idle'], 'feige'],
  ['kaktus', { variant: 'gruppe' }, 'idle', ['idle'], 'gruppe'],
  ['palme', {}, 'idle', ['idle', { sway: 1 }]],
  ['fliese', {}, 'idle', ['idle', 'shake', { glow: 1 }]],
  ['ruine_saeule', {}, 'idle', ['idle']],
  ['sandsteinbogen', { width: 4, height: 3.5 }, 'idle', ['idle']],
  ['pyramide', { size: 6 }, 'idle', ['idle']],
  ['bluetenbaum', {}, 'idle', ['idle', { sway: 1 }]],
  ['planet', {}, 'idle', ['idle']],
];
const GIMMICKS = [
  ['taststein', {}, 'off', ['off', { anim: 'on', rise: 0.5 }, 'on']],
  ['propellerplattform', {}, 'idle', ['idle', { spin: 30 }], 'propellerplattform', 0.9],
  ['zahnradplattform', { radius: 2 }, { angle: 0.3 }, [{ angle: 0 }, { angle: 1 }], 'zahnrad y', 0.3],
  ['zahnradplattform', { radius: 1.6, axis: 'x' }, { angle: 0.3 }, [{ angle: 1 }], 'zahnrad x', 1.65],
  ['rollwalze', { radius: 1.5, length: 4 }, { speed: 2 }, [{ speed: 2 }, { angle: 1 }]],
  ['rollwalze', { radius: 0.8, length: 3, style: 'holz' }, { speed: 2 }, [{ speed: -2 }], 'walze holz'],
  ['drehrad', { radius: 2.2 }, { angle: 0.4 }, [{ angle: 0 }, { angle: 2 }], 'drehrad', 2.75],
  ['wachs_block', { height: 3 }, { grow: 0.6 }, [{ grow: 0 }, { grow: 0.5 }, { grow: 1 }, { anim: 'bump', grow: 1 }]],
  ['pfeld', { need: 2 }, { count: 1 }, [{ count: 0 }, { count: 1 }, { count: 2, on: true }]],
  ['multilift', { need: 4 }, { count: 2 }, [{ count: 0 }, { count: 3 }, { count: 4, anim: 'go' }]],
  ['figurenschalter', { hero: 'lotti' }, 'idle', ['idle', 'pressed'], 'schalter lotti'],
  ['figurenschalter', { hero: 'greta' }, 'idle', ['idle', 'pressed'], 'schalter greta'],
  ['push_switch_gold', {}, 'idle', ['idle', 'pressed']],
  ['scheinwerfer', {}, { on: true }, [{ on: false }, { on: true }]],
  ['tuer', {}, { open: 0.3 }, [{ open: 0 }, { open: 1 }]],
];
const LARGE = [
  ['holzwand_boss', {}, 'idle', ['idle', 'hit', { damage: 0.6 }, 'break']],
  ['holz_silhouette', {}, 'idle', ['idle', 'wobble', { fall: 0.5 }, { fall: 1 }]],
  ['metalltor', {}, { open: 0 }, [{ open: 0 }, { open: 0.5 }, { open: 1 }]],
  ['panzer_fahrzeug', { length: 8 }, { speed: 3 }, [{ speed: 3 }, { speed: 0 }, { speed: -2 }]],
];
const ALL = [...ENEMIES, ...WERFER, ...BIG, ...ITEMS, ...DESERT, ...GIMMICKS, ...LARGE];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm2`, logLevel: 'warn', clearScreen: false,
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

await sc(async () => {
  const reg = await import('/src/course/models/index.js');
  const kit = await import('/src/course/models/lib/kit.js');
  const inst = await import('/src/course/models/lib/instanced.js');
  const THREE = kit.THREE;
  const v = window.__view3d;
  window.__game.loop.sleep();
  window.__game.canvas.style.visibility = 'hidden';
  const scene = v.three;
  const hero = [...v.avatars.values()].find((a) => a.textureKey === 'lotti' || a.textureKey === 'greta');
  for (const ch of scene.children) {
    if (ch === v.world.group || (hero && ch === hero.root)) continue;
    ch.visible = false;
  }
  v.world.group.traverse((o) => { if (o.isMesh || o.isSprite || o.isPoints || o.isLine) o.visible = false; });
  scene.background = new THREE.Color(0xbfe3ff);
  scene.fog = null;
  const mkTex = (a, b) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 40); tex.magFilter = THREE.NearestFilter; tex.anisotropy = 8;
    return tex;
  };
  const grass = mkTex('#8fd16a', '#7fc35c'), sand = mkTex('#f0d08a', '#e6c47a');
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group(); scene.add(stage);
  const labels = document.createElement('div');
  labels.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:50;font:bold 11px sans-serif;color:#1d2340';
  document.body.appendChild(labels);
  const live = [];
  const cm = {
    reg, kit, inst, THREE, v, stage, hero, live, labels,
    setGround(kind) { ground.material.map = kind === 'sand' ? sand : grass; ground.material.needsUpdate = true; },
    clear() {
      for (const m of live.splice(0)) m.dispose();
      stage.clear();
      labels.innerHTML = '';
      if (hero) hero.root.visible = false;
    },
    put(name, opts, state, x, z, yaw = -Math.PI / 2 + 0.55, steps = 24, label = name, lift = 0) {
      const m = reg.getModel(name, opts ?? {});
      m.root.position.set(x, lift ?? 0, z); m.root.rotation.y = yaw;
      stage.add(m.root);
      for (let i = 0; i < steps; i++) m.update(1 / 30, state);
      live.push(m);
      m.label = label;
      return m;
    },
    width(m) {
      const b = cm.bounds(m.root);
      if (b.isEmpty()) b.setFromCenterAndSize(m.root.position.clone().setY(0.5), new THREE.Vector3(0.6, 1, 0.6));
      return { w: b.max.x - b.min.x, h: b.max.y - b.min.y, minX: b.min.x - m.root.position.x, maxX: b.max.x - m.root.position.x, box: b };
    },
    row(list, z = 0, gap = 0.45, yaw) {
      const ms = list.map(([name, opts, state, , label, lift]) => cm.put(name, opts, state, 0, z, yaw, 24, label ?? name, lift));
      const ws = ms.map((m) => cm.width(m));
      const total = ws.reduce((a, w) => a + (w.maxX - w.minX), 0) + gap * (ms.length - 1);
      let x = -total / 2;
      ms.forEach((m, i) => { m.root.position.x = x - ws[i].minX; x += ws[i].maxX - ws[i].minX + gap; });
      return ms;
    },
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
  await page.screenshot({ path: `${OUT}cm2_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);

// ------------------------------------------------------------------ Prüfungen
const names = await sc(() => window.__cm.reg.listModels());
console.log(`  ${names.length} Modelle registriert`);
const unique = [...new Set(ALL.map(([n]) => n))];
const missing = unique.filter((n) => !names.includes(n));
check(`alle ${unique.length} Welt-2-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);

const cycle = await sc((all) => {
  const cm = window.__cm; const out = { counts: {}, tris: {}, fails: [] };
  for (const [name, opts, , states, label] of all) {
    if (!cm.reg.hasModel(name)) continue;
    const key = label && label !== name ? `${name}(${label})` : name;
    try {
      const m = cm.reg.getModel(name, opts);
      if (!m.root || typeof m.update !== 'function' || typeof m.dispose !== 'function') throw new Error('Vertrag verletzt');
      if (m.placeholder) throw new Error('Platzhalter');
      cm.stage.add(m.root);
      for (const st of states) for (let i = 0; i < 40; i++) m.update(1 / 30, st);
      m.update(0.016, undefined); m.update(0.016, 'idle'); m.update(0.5, {});
      out.counts[key] = cm.meshes(m.root);
      let tris = 0;
      m.root.traverse((o) => { if (o.isMesh) { const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
      out.tris[key] = Math.round(tris);
      m.dispose();
      if (m.root.parent) throw new Error('root hängt nach dispose() noch in der Szene');
    } catch (e) { out.fails.push(`${key}: ${e.message}`); }
  }
  return out;
}, ALL);
console.log('  Meshes je Modell:', JSON.stringify(cycle.counts));
console.log('  Dreiecke je Modell:', JSON.stringify(cycle.tris));
for (const f of cycle.fails) console.log('   Fehler:', f);
check('alle Modelle bauen, alle Zustände, dispose() ohne Fehler', cycle.fails.length === 0);
const over = Object.entries(cycle.counts).filter(([, n]) => n > 12);
check(`≤ 12 Meshes je Modell${over.length ? ` (zu viel: ${over.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, over.length === 0);

// Zusatz-Methoden (Weltpositionen für den Motor)
const extra = await sc(() => {
  const cm = window.__cm; const r = {};
  const V = new cm.THREE.Vector3();
  const try1 = (name, opts, st, fn) => {
    if (!cm.reg.hasModel(name)) return;
    const m = cm.reg.getModel(name, opts); cm.stage.add(m.root);
    m.root.position.set(3, 0, -2);
    for (let i = 0; i < 30; i++) m.update(1 / 30, st);
    try { r[name] = fn(m); } catch (e) { r[name] = `Fehler: ${e.message}`; }
    m.dispose();
  };
  try1('hackvogel', {}, 'peck', (m) => { const p = m.beakTip(V); return [p.x - 3, p.y, p.z + 2].map((x) => +x.toFixed(2)); });
  try1('feuer_werfer', { kind: 'hammer' }, { anim: 'throw', progress: 0.4 }, (m) => m.hand(V).toArray().map((x) => +x.toFixed(2)));
  try1('kanone_turm', { sides: 2 }, 'idle', (m) => [m.muzzle(V).toArray().map((x) => +x.toFixed(2)), m.muzzle(new cm.THREE.Vector3(), 1).toArray().map((x) => +x.toFixed(2))]);
  try1('feuer_schnappblume', {}, 'idle', (m) => m.mouth(V).toArray().map((x) => +x.toFixed(2)));
  try1('helm_kanone', {}, 'idle', (m) => m.muzzle(V).toArray().map((x) => +x.toFixed(2)));
  try1('lauerblock', { reach: 1.5 }, 'push', (m) => +m.root.userData.out.toFixed(2));
  try1('panzer_fahrzeug', { length: 10, deck: 2 }, { speed: 2 }, (m) => +cm.bounds(m.root).max.y.toFixed(2));
  return r;
});
console.log('  Zusatz-Methoden:', JSON.stringify(extra));
check('hackvogel.beakTip trifft beim Hacken den Boden vor dem Vogel', Array.isArray(extra.hackvogel) && Math.abs(extra.hackvogel[1]) < 0.05 && extra.hackvogel[0] > 0.8);
check('feuer_werfer.hand, kanone_turm.muzzle, feuer_schnappblume.mouth, helm_kanone.muzzle liefern Positionen',
  ['feuer_werfer', 'feuer_schnappblume', 'helm_kanone'].every((k) => Array.isArray(extra[k])) && Array.isArray(extra.kanone_turm) && extra.kanone_turm[0][0] > 3.5 && extra.kanone_turm[1][0] < 2.5);
check('lauerblock: userData.out = Ausfahrweg (push, reach 1,5)', Math.abs(extra.lauerblock - 1.5) < 0.05);

// Instanz-Helfer
const instInfo = await sc(() => {
  const cm = window.__cm; const out = {};
  const p = new cm.THREE.Vector3();
  for (const [kind, opts, states] of [
    ['marschblock', { colors: ['red', 'blue', 'yellow', 'green'] }, ['march', 'idle', 'squashed', 'panic']],
    ['sandblock', {}, ['idle', 'shake', 'crumble', { anim: 'crumble', crumble: 0.5 }, 'gone']],
    ['kaktus', { variant: 'saeule' }, ['idle']],
    ['kaktus', { variant: 'kugel' }, ['idle']],
    ['wuschel', {}, ['idle', 'move']],
    ['coin', {}, ['idle', 'collected']],
    ['question_block', {}, ['idle', 'bump', 'used']],
  ]) {
    try {
      const I = cm.inst.createInstanced(kind, 120, opts);
      cm.stage.add(I.root);
      for (let i = 0; i < 120; i++) I.setAt(i, p.set((i % 12) * 1.3 - 8, 0, -Math.floor(i / 12) * 1.3), i * 0.1, 1, states[i % states.length]);
      I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
      for (let k = 0; k < 20; k++) I.update(1 / 30);
      if (I.setColor) I.setColor(0, 'purple');
      let tris = 0, meshes = 0;
      I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
      out[`${kind}${opts.variant ? `:${opts.variant}` : ''}`] = { meshes, tris: Math.round(tris) };
      I.dispose();
      if (I.root.parent) throw new Error('root hängt nach dispose()');
    } catch (e) { out[kind] = { error: e.message }; }
  }
  return out;
});
console.log('  Instanz-Helfer (120 Stück):', JSON.stringify(instInfo));
check('Instanz-Helfer marschblock, sandblock, kaktus, wuschel (≤ 6 Zeichenaufrufe je Art) + Welt-1-Arten unverändert',
  Object.values(instInfo).every((x) => !x.error && x.meshes >= 1 && x.meshes <= 6) && Object.keys(instInfo).length === 7);

// ------------------------------------------------------------------ Bilder
const gallery = async (name, list, el = 0.22, gap = 0.45, per = 4, ground = 'grass') => {
  for (let i = 0; i * per < list.length; i++) {
    const nm = `${name}_${i + 1}`;
    if (!want(nm) && !want(name)) continue;
    const part = list.slice(i * per, (i + 1) * per);
    await sc(([list, el, gap, ground]) => { const cm = window.__cm; cm.clear(); cm.setGround(ground); cm.row(list.filter(([n]) => cm.reg.hasModel(n)), 0, gap); cm.frame(el); }, [part, el, gap, ground]);
    if (ONLY && !ONLY.includes(nm) && ONLY.includes(name)) ONLY.push(nm);
    await shot(nm);
  }
};

await gallery('enemies', ENEMIES, 0.2, 0.5, 3, 'sand');
await gallery('werfer', WERFER, 0.2, 0.5, 4, 'sand');
await gallery('big', BIG, 0.2, 0.8, 2, 'sand');
await gallery('items', ITEMS, 0.2, 0.5, 4);
await gallery('desert', DESERT, 0.25, 0.6, 4, 'sand');
await gallery('gimmicks', GIMMICKS, 0.3, 0.6, 3);
await gallery('large', LARGE, 0.3, 1, 2, 'sand');

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (tests/out/cm2_st_<name>.png)
const seen = new Set();
for (const [n, o, , states, lab, lift] of ALL) {
  if (states.length < 2) continue;
  const nm = seen.has(n) ? `st_${n}_${lab ?? 2}` : `st_${n}`;
  seen.add(n);
  if (!want(nm) && !want('states')) continue;
  const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${v}`)).join(' '));
  await sc(([rows]) => {
    const cm = window.__cm; cm.clear(); cm.setGround('grass');
    if (!cm.reg.hasModel(rows[0][0])) return;
    cm.row(rows, 0, 0.6);
    cm.frame(0.3, 30, 1.05);
  }, [states.map((st) => [n, o, st, null, label(st), lift])]);
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
}

// Gruppenbilder mit Größenvergleich
const LINEUPS = [ENEMIES.slice(0, 6), ENEMIES.slice(6).concat(WERFER.slice(0, 1), WERFER.slice(3, 7)), BIG.concat(ITEMS.slice(0, 2), ITEMS.slice(5, 7))];
for (let li = 0; li < LINEUPS.length; li++) {
  const nm = `lineup_${li + 1}`;
  if (!want(nm) && !want('lineup')) continue;
  await sc((list) => {
    const cm = window.__cm; const THREE = cm.THREE; cm.clear(); cm.setGround('sand');
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
  }, LINEUPS[li].map(([n, o, s, , l]) => [n, o, s, null, l ?? n]));
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
}

// Kurs-Sicht: Kamera 13 m, Neigung 45°, FOV 38° (Kurs-Standard), Modelle verstreut wie im Level
const courseView = async (nm, list, cols = 6, dx = 2.6, dz = 3.0, ground = 'sand', dist = 13) => {
  if (!want(nm) && !want('course')) return;
  await sc(([list, cols, dx, dz, ground, dist]) => {
    const cm = window.__cm; cm.clear(); cm.setGround(ground);
    const ok = list.filter(([n]) => cm.reg.hasModel(n));
    const rows = Math.ceil(ok.length / cols);
    ok.forEach(([n, o, s, , l, lift], i) => {
      const c = i % cols, r = Math.floor(i / cols);
      cm.put(n, o, s, (c - (cols - 1) / 2) * dx, (rows - 1) / 2 * dz - r * dz, i % 2 ? -Math.PI / 2 : Math.atan2(-0.3, 1), 24, (l ?? n).replace(/_.*/, ''), lift);
    });
    if (cm.hero) { cm.hero.root.visible = true; cm.hero.root.position.set(-(cols - 2) / 2 * dx, 0, (rows - 1) / 2 * dz + dz * 0.45); cm.hero.root.scale.setScalar(1 / 1.5); cm.hero.root.rotation.y = 0; }
    cm.cam([0, 0.6, -0.4], 45 * Math.PI / 180, dist, 38);
  }, [list.map(([n, o, s, , l, lift]) => [n, o, s, null, l, lift]), cols, dx, dz, ground, dist]);
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
};
await courseView('course_enemies', ENEMIES.concat(WERFER.slice(0, 7), BIG.slice(0, 1)), 6, 2.6, 2.8);
await courseView('course_items', ITEMS.concat(DESERT.slice(0, 8)), 6, 2.6, 3.0);
await courseView('course_gimmicks', GIMMICKS.slice(0, 12), 4, 4.2, 4.6, 'grass', 16);

// Instanz-Kolonne aus der Kurs-Kamera: 3 Reihen Marschblöcke, Sandblock-Feld, Kakteen, Wuschel
if (want('course_instanced') || want('course')) {
  await sc(() => {
    const cm = window.__cm; cm.clear(); cm.setGround('sand');
    const P = new cm.THREE.Vector3();
    const mk = (kind, n, opts) => { const I = cm.inst.createInstanced(kind, n, opts); cm.stage.add(I.root); cm.live.push({ root: I.root, dispose: () => I.dispose(), I }); return I; };
    const mb = mk('marschblock', 18, { colors: ['red', 'blue', 'yellow', 'green', 'orange', 'purple'] });
    for (let i = 0; i < 18; i++) mb.setAt(i, P.set(-4 + (i % 6) * 1.05, 0, -1 - Math.floor(i / 6) * 1.1), Math.PI / 2 + 0.0, 1, i === 5 ? 'squashed' : 'march');
    const sb = mk('sandblock', 12, {});
    for (let i = 0; i < 12; i++) sb.setAt(i, P.set(2.5 + (i % 4), 0, -1 - Math.floor(i / 4)), 0, 1, i === 2 ? { anim: 'crumble', crumble: 0.5 } : i === 6 ? 'shake' : 'idle');
    const kk = mk('kaktus', 6, { variant: 'saeule' });
    for (let i = 0; i < 6; i++) kk.setAt(i, P.set(-6 + i * 2.4, 0, -6.5 - (i % 2)), i * 1.3, 0.8 + (i % 3) * 0.15);
    const kg = mk('kaktus', 6, { variant: 'kugel' });
    for (let i = 0; i < 6; i++) kg.setAt(i, P.set(-5 + i * 2.2, 0, -4.6 + (i % 2) * 0.4), i, 1);
    const wu = mk('wuschel', 5, {});
    for (let i = 0; i < 5; i++) wu.setAt(i, P.set(-5 + i * 2.5, 1.2, 1.6), 0, 1, 'move');
    for (let k = 0; k < 12; k++) for (const x of cm.live) x.I?.update(1 / 30);
    if (cm.hero) { cm.hero.root.visible = true; cm.hero.root.position.set(0, 0, 2.6); cm.hero.root.scale.setScalar(1 / 1.5); }
    cm.cam([0, 0.6, -1.5], 45 * Math.PI / 180, 13, 38);
  });
  if (ONLY && !ONLY.includes('course_instanced')) ONLY.push('course_instanced');
  await shot('course_instanced');
}

await sc(() => window.__cm.clear());
check('keine Konsolenfehler', errors.length === 0);
await browser.close();
await stop();
process.exit(summary(errors) ? 0 : 1);
