// Galerie und Prüfung der Welt-3-Modelle (src/course/models/kinds/*_w3.js, Instanzen aus lib/instanced_w3.js).
//
// Wie tests/course_models.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die
// Spielschleife an, räumt die Szene frei und stellt die Modelle auf einem hellblauen 1-m-Schachbrett
// (Schnee-Kontrast) auf. Bilder tests/out/cm3_*.png: Galerien je Gruppe, Zustände je Modell, Größenvergleich
// (1-m-Würfel, Heldin auf 1 m skaliert), Kurs-Kamera-Ansicht (14/16 m, 50° Neigung) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen,
// ≤ 12 Meshes, dispose() ohne Fehler (root hängt danach nicht mehr), kein Geometrie-Leck bei Bau/Abbau,
// einige Zustands-/Größen-Eigenschaften, Instanz-Helfer (neu und alt), keine Konsolenfehler.
//
// Aufruf: PORT_BASE=3400 node tests/course_models_w3.mjs   (kein Build nötig; CM_ONLY=a,b nur bestimmte Bilder,
//         CM_ONLY=none → keine Bilder)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4340 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const ENEMIES = [
  ['schneesaeule', { segments: 4 }, { anim: 'walk', speed: 1.2 }, ['walk', 'idle', 'hit', { anim: 'walk', segments: 2 }, 'defeated']],
  ['pilzling_eis', {}, { anim: 'skate', speed: 2.5 }, ['skate', 'idle', 'alert', 'spin', 'squashed', 'stunned']],
  ['pilzling_reifen', {}, 'float', ['float', 'paddle', 'squashed', 'stunned']],
  ['spuk', {}, 'chase', ['chase', 'shy', 'fade', 'idle', 'hit', 'defeated']],
  ['kreisgeist', {}, 'circle', ['circle', 'peek', 'defeated']],
  ['funkenlaeufer', {}, 'run', ['run', 'idle']],
  ['funkenkaefer', {}, 'fly', ['fly', 'charge', 'squashed']],
  ['huepfqualle', {}, { anim: 'hop', progress: 0.5 }, ['idle', { anim: 'hop', progress: 0.1 }, { anim: 'hop', progress: 0.5 }, 'squashed']],
  ['flossling', {}, 'swim', ['swim', 'jump', 'flop', 'defeated']],
  ['stachelfisch', {}, 'swim', ['swim', 'chase', 'puff', 'defeated']],
  ['rammfisch', {}, 'swim', ['swim', 'charge', 'turn', 'stunned']],
];
const GROUPS = [
  ['kreisgeist_kreis', { count: 8, radius: 2.2 }, 'circle', ['circle', 'peek', { anim: 'circle', alive: [true, false, true, true, false, true, true, true] }]],
  ['spuk', { size: 2.5 }, 'idle', ['idle', 'shy']],
  ['stachelfisch', { size: 0.45 }, 'swim', ['swim', 'puff']],
  ['flossling', { color: 'koralle' }, 'swim', ['swim']],
  ['flossling', { color: 'gold' }, 'jump', ['jump']],
];
const BOSSES = [
  ['schattenlaeuferin', {}, 'idle', ['idle', 'run', { anim: 'throw', progress: 0.3 }, { anim: 'throw', progress: 0.7 }, 'clone', 'teleport', 'hit', 'defeated']],
  ['schattenlaeuferin', { clone: true }, 'idle', ['idle', 'run']],
  ['schatten_bumerang', {}, 'spin', ['spin', 'idle']],
  ['schlangenkoenig', { segments: 10 }, 'idle', ['idle', { anim: 'rise', progress: 0.5 }, { anim: 'strike', progress: 0.45 }, 'summon', 'hit', 'defeated']],
  ['dienerschlange', {}, 'idle', ['idle', { anim: 'rise', progress: 0.5 }, 'sink', 'hit']],
  ['dienerschlange', { cracked: true }, 'idle', ['idle']],
  ['felsbrocken', {}, 'idle', ['idle', 'fall', 'break']],
];
const ITEMS = [
  ['schlittschuhe', {}, 'idle', ['idle']],
  ['schneeball', { size: 1 }, { anim: 'roll', roll: 0.8 }, ['idle', { anim: 'roll', roll: 2 }, { anim: 'roll', size: 1.6 }, 'break']],
  ['powerup_gleitblatt', {}, 'idle', ['idle']],
];
const SNOW = [
  ['schneeblock', {}, 'idle', ['idle']],
  ['eisblock', {}, 'idle', ['idle']],
  ['eisflaeche', { size: [4, 3] }, 'idle', ['idle']],
  ['eiskante', { length: 4 }, 'idle', ['idle']],
  ['tanne_schnee', { size: 3.5 }, 'idle', ['idle', 'shake']],
  ['schneemann', {}, 'idle', ['idle', 'hit']],
  ['iglu', {}, 'idle', ['idle']],
  ['eiszapfen', { length: 1.2 }, 'idle', ['idle', 'shake', 'fall']],
  ['kettenzaun', { width: 3, height: 3 }, 'idle', ['idle', 'shake']],
  ['kettenplattform', { width: 4, depth: 3 }, 'move', ['idle', 'move']],
  ['kurbelrad', {}, { angle: 0.6 }, [{ angle: 0 }, { angle: 2 }]],
  ['broeckelblock', {}, 'idle', ['idle', 'shake', 'crumble']],
  ['wolkenlift', {}, 'idle', ['idle', 'hidden', 'reveal']],
];
const SPUKHAUS = [
  ['spuk_treppe', { steps: 5, width: 2 }, 'idle', ['idle', 'move']],
  ['kronleuchter', {}, 'swing', ['idle', 'swing']],
  ['bilderrahmen', { motif: 'spuk' }, 'watch', ['idle', 'watch']],
  ['bilderrahmen', { motif: 'landschaft' }, 'idle', ['idle']],
  ['bilderrahmen', { motif: 'portraet' }, 'idle', ['idle']],
  ['kerze', { count: 3 }, 'on', ['on', 'off']],
  ['kerze', { count: 1 }, 'on', ['on']],
  ['spinnweben', { size: 1.4 }, 'idle', ['idle']],
  ['buecherregal', {}, 'idle', ['idle', 'shake']],
  ['spuk_sofa', {}, 'float', ['idle', 'float']],
  ['spuk_tuer', {}, { open: 0.4 }, [{ open: 0 }, { open: 1 }]],
  ['zielmast_spuk', {}, 'idle', ['idle', 'reveal']],
];
const WASSER = [
  ['rohrnetz', { kind: 'gerade', length: 3 }, 'idle', ['idle']],
  ['rohrnetz', { kind: 'bogen' }, 'idle', ['idle']],
  ['rohrnetz', { kind: 't' }, 'idle', ['idle']],
  ['rohrnetz', { kind: 'kreuz' }, 'idle', ['idle']],
  ['rohrnetz', { kind: 'ende' }, 'idle', ['idle']],
  ['koralle', { kind: 'ast' }, 'idle', ['idle']],
  ['koralle', { kind: 'faecher' }, 'idle', ['idle']],
  ['koralle', { kind: 'hirn' }, 'idle', ['idle']],
  ['seetang', { height: 2.5 }, 'idle', ['idle']],
  ['blasen', { height: 3 }, 'idle', ['idle']],
  ['steg', { length: 4 }, 'idle', ['idle']],
  ['holzsteg', { length: 5, hub: 2 }, { lift: 0.5 }, [{ lift: 0 }, { lift: 1 }]],
  ['wasserschalter', {}, 'idle', ['idle', 'pressed']],
  ['schiffswrack', {}, 'idle', ['idle']],
];
const STRECKE = [
  ['boost_rampe', {}, 'idle', ['idle']],
  ['boost_tor', {}, 'idle', ['idle']],
  ['sprungfeld', {}, 'idle', ['idle', 'launch']],
  ['pilztrampolin', {}, 'idle', ['idle', 'bounce']],
  ['bande', { length: 4 }, 'idle', ['idle']],
  ['start_bogen', { width: 8 }, 'go', ['idle', 'go']],
  ['schalttafel', {}, 'active', ['idle', 'active', { anim: 'active', dir: -1 }, 'off']],
  ['schiene', { length: 4 }, 'idle', ['idle']],
  ['schiene', { kind: 'bogen', radius: 3 }, 'idle', ['idle']],
  ['schaltblock', {}, 'idle', ['idle', 'bump', { anim: 'idle', dir: -1 }]],
];
const SZENE = [
  ['zug_waggon', { kind: 'lok' }, { anim: 'drive', speed: 6 }, ['idle', { anim: 'drive', speed: 8 }]],
  ['zug_waggon', { kind: 'wagen' }, { anim: 'drive', speed: 6 }, ['idle', 'drive']],
  ['zug_waggon', { kind: 'flach' }, { anim: 'drive', speed: 6 }, ['idle', 'drive']],
  ['zirkuszelt', { radius: 6, height: 6 }, 'idle', ['idle']],
  ['manege', { radius: 4 }, 'idle', ['idle']],
  ['zirkuspodest', {}, 'idle', ['idle']],
  ['seilbahn_gondel', {}, 'idle', ['idle', 'move']],
  ['rosa_gras', { size: [2, 1, 2] }, 'idle', ['idle']],
  ['bunter_stein', { size: [2, 1, 2] }, 'idle', ['idle']],
  ['pastell_blume', {}, 'idle', ['idle']],
  ['hecken_hase', {}, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...GROUPS, ...BOSSES, ...ITEMS, ...SNOW, ...SPUKHAUS, ...WASSER, ...STRECKE, ...SZENE];
const INST_W3 = ['schneeblock', 'eisblock', 'tanne_schnee', 'eiszapfen'];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm3`, logLevel: 'warn', clearScreen: false,
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
  scene.background = new THREE.Color(0xa9d4ff);
  scene.fog = null;
  // Boden: hellblaues 1-m-Schachbrett (Schnee-Kontrast), empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c3d8ee'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#b1cbe6'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 60); tex.magFilter = THREE.NearestFilter; tex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group(); scene.add(stage);
  const labels = document.createElement('div');
  labels.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:50;font:bold 11px sans-serif;color:#1d2340';
  document.body.appendChild(labels);

  const live = [];
  // hängende Modelle (Ursprung oben) und Schienen (Ursprung = Schienen-Oberkante) anheben
  const LIFT = { eiszapfen: 1.4, kronleuchter: 3.2, spinnweben: 1.5, seilbahn_gondel: 2.6, schiene: 0.3, schalttafel: 0.3 };
  const cm = {
    reg, kit, inst, THREE, v, stage, hero, live, labels, ground,
    clear() {
      for (const m of live.splice(0)) m.dispose();
      stage.clear();
      labels.innerHTML = '';
      if (hero) hero.root.visible = false;
    },
    put(name, opts, state, x, z, yaw = -Math.PI / 2 + 0.55, steps = 24, label = name) {
      const m = reg.getModel(name, opts ?? {});
      m.root.position.set(x, LIFT[name] ?? 0, z); m.root.rotation.y = yaw;
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
      const ms = list.map(([name, opts, state, , label]) => cm.put(name, opts, state, 0, z, yaw, 24, label ?? name));
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
  await page.screenshot({ path: `${OUT}cm3_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${Array.isArray(v) ? v.map((x) => (x === true ? 1 : x === false ? 0 : x)).join('') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
const names = await sc(() => window.__cm.reg.listModels());
console.log(`  ${names.length} Modelle registriert`);
const unique = [...new Set(ALL.map(([n]) => n))];
const missing = unique.filter((n) => !names.includes(n));
check(`alle ${unique.length} Welt-3-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
check('kein doppelter Modellname (Warnung der Registry)', !errors.some((e) => e.includes('doppelter Name')));

const cycle = await sc((all) => {
  const cm = window.__cm; const out = { counts: {}, tris: {}, fails: [] };
  for (const [name, opts, , states] of all) {
    if (!cm.reg.hasModel(name)) continue;
    const key = Object.keys(opts ?? {}).length ? `${name}(${JSON.stringify(opts)})` : name;
    try {
      const m = cm.reg.getModel(name, opts);
      if (!m.root || typeof m.update !== 'function' || typeof m.dispose !== 'function') throw new Error('Vertrag verletzt');
      if (m.placeholder) throw new Error('Platzhalter');
      cm.stage.add(m.root);
      for (const st of states) for (let i = 0; i < 40; i++) m.update(1 / 30, st);
      m.update(0.016, undefined); m.update(0.016, 'idle'); m.update(0.5, {}); m.update(0.016, 'gibtsnicht');
      out.counts[key] = cm.meshes(m.root);
      let tris = 0;
      m.root.traverse((o) => { if (o.isMesh) { const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
      out.tris[key] = Math.round(tris);
      let nan = false;
      m.root.updateMatrixWorld(true);
      m.root.traverse((o) => { if (o.matrixWorld.elements.some((x) => !Number.isFinite(x))) nan = true; });
      if (nan) throw new Error('NaN in einer Matrix');
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
const heavy = Object.entries(cycle.tris).filter(([n, t]) => t > 30000 && !/zirkuszelt|schiffswrack|zug_waggon/.test(n));
check(`Dreiecke je Figur/Requisite ≤ 30 k${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);

// Leck-Prüfung: zweiter Bau/Abbau-Durchlauf mit Rendern darf keine Geometrien/Texturen anhäufen
const leak = await sc((all) => {
  const cm = window.__cm; const info = cm.v.renderer.info.memory;
  const run = () => { for (const [name, opts, st] of all) { if (!cm.reg.hasModel(name)) continue; const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); m.update(1 / 30, st); cm.v.renderer.render(cm.v.three, cm.v.camera); m.dispose(); } };
  run();
  const a = { g: info.geometries, t: info.textures };
  run(); run();
  return { before: a, after: { g: info.geometries, t: info.textures } };
}, ALL.map(([n, o, s]) => [n, o, s]));
console.log('  Speicher vor/nach 2 weiteren Bau-Abbau-Läufen:', JSON.stringify(leak));
check('kein Geometrie-/Textur-Leck bei Bau und dispose()', leak.after.g <= leak.before.g + 2 && leak.after.t <= leak.before.t);

// Eigenschaften
const props = await sc(() => {
  const cm = window.__cm; const out = {};
  const box = (name, opts, st) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); for (let i = 0; i < 60; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new cm.THREE.Vector3()); m.dispose(); return s; };
  if (cm.reg.hasModel('schneesaeule')) {
    const m = cm.reg.getModel('schneesaeule', { segments: 5 });
    out.saeule = [m.root.userData.height?.(5), m.root.userData.height?.(3), m.root.userData.height?.(1)];
    const h5 = box('schneesaeule', { segments: 5 }, 'idle').y, h2 = box('schneesaeule', { segments: 5 }, { anim: 'idle', segments: 2 }).y;
    out.saeuleBox = [h5, h2];
    m.dispose();
  }
  if (cm.reg.hasModel('spuk')) out.spuk = [box('spuk', {}, 'idle').y, box('spuk', { size: 2.5 }, 'idle').y];
  if (cm.reg.hasModel('schneeball')) out.ball = [box('schneeball', { size: 1 }, 'idle').y, box('schneeball', { size: 1 }, { anim: 'roll', size: 2 }).y];
  if (cm.reg.hasModel('schlangenkoenig')) out.snake = [box('schlangenkoenig', { segments: 8 }, 'idle').y, box('schlangenkoenig', { segments: 14 }, 'idle').y, box('schlangenkoenig', {}, 'defeated').y];
  if (cm.reg.hasModel('kettenzaun')) { const s = box('kettenzaun', { width: 4, height: 2 }, 'idle'); out.zaun = [s.z, s.y]; }
  if (cm.reg.hasModel('pilzling_eis')) { const s = box('pilzling_eis', {}, 'idle'); out.eis = [s.y]; }
  if (cm.reg.hasModel('zug_waggon')) out.zug = ['lok', 'wagen', 'flach'].map((k) => { const s = box('zug_waggon', { kind: k }, 'idle'); return [+s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)]; });
  return out;
});
console.log('  Eigenschaften:', JSON.stringify(props));
if (props.saeule) check('Schneesäule: Höhe wächst mit Segmenten, state.segments verkürzt', props.saeule[0] > props.saeule[1] && props.saeule[1] > props.saeule[2] && props.saeuleBox[1] < props.saeuleBox[0] - 1);
if (props.spuk) check('Spuk: opts.size 2,5 ≈ 2,5-fache Höhe', Math.abs(props.spuk[1] / props.spuk[0] - 2.5) < 0.25);
if (props.ball) check('Schneeball: state.size lässt ihn wachsen', props.ball[1] > props.ball[0] * 1.8);
if (props.snake) check('Schlangenkönig: mehr Segmente → höher; besiegt flacher', props.snake[1] > props.snake[0] && props.snake[2] < props.snake[0]);
if (props.zaun) check('Kettenzaun: opts.width/height', Math.abs(props.zaun[0] - 4) < 0.35 && Math.abs(props.zaun[1] - 2) < 0.35);
if (props.eis) check('Eisläufer-Pilzling ≈ 0,8–1,0 m', props.eis[0] > 0.75 && props.eis[0] < 1.05);

// Instanz-Helfer (neue Arten + Rückwärtskompatibilität)
const instInfo = await sc((kinds) => {
  const cm = window.__cm; const out = {};
  for (const kind of [...kinds, 'coin', 'question_block']) {
    try {
      const I = cm.inst.createInstanced(kind, 200);
      cm.stage.add(I.root);
      const p = new cm.THREE.Vector3();
      for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, i % 7 === 0 ? (kind === 'tanne_schnee' ? 'shake' : 'bump') : 'idle');
      I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
      I.setState(5, 'idle');
      for (let k = 0; k < 10; k++) I.update(1 / 30);
      let tris = 0, meshes = 0;
      I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
      const api = ['setAt', 'setState', 'getState', 'hide', 'update', 'dispose'].every((f) => typeof I[f] === 'function') && I.count === 200 && I.getState(3) === 'hidden';
      I.dispose();
      out[kind] = { meshes, tris: Math.round(tris), api, detached: !I.root.parent };
    } catch (e) { out[kind] = { error: e.message }; }
  }
  return out;
}, INST_W3);
console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
check(`Instanz-Helfer für ${INST_W3.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST_W3.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
check('Instanz-Helfer: alte Arten unverändert (coin, question_block)', ['coin', 'question_block'].every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes === 2));

// ------------------------------------------------------------------ Bilder
const gallery = async (name, list, el = 0.22, gap = 0.45, per = 4) => {
  for (let i = 0; i * per < list.length; i++) {
    const nm = `${name}_${i + 1}`;
    if (!want(nm) && !want(name)) continue;
    const part = list.slice(i * per, (i + 1) * per).map(([n, o, s]) => [n, o, s, null, optLabel(n, o)]);
    await sc(([list, el, gap]) => { const cm = window.__cm; cm.clear(); cm.row(list.filter(([n]) => cm.reg.hasModel(n)), 0, gap); cm.frame(el); }, [part, el, gap]);
    if (ONLY && !ONLY.includes(nm) && ONLY.includes(name)) ONLY.push(nm);
    await shot(nm);
  }
};
await gallery('enemies', ENEMIES, 0.2, 0.5);
await gallery('groups', GROUPS, 0.35, 0.6, 3);
await gallery('bosses', BOSSES, 0.2, 0.8, 3);
await gallery('items', ITEMS, 0.18, 0.5, 5);
await gallery('snow', SNOW, 0.3, 0.6, 5);
await gallery('spukhaus', SPUKHAUS, 0.25, 0.6, 4);
await gallery('wasser', WASSER, 0.3, 0.6, 5);
await gallery('strecke', STRECKE, 0.35, 0.7, 4);
await gallery('szene', SZENE, 0.3, 0.8, 3);

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cm3_st_<name>.png)
const seen = new Set();
for (const [n, o, , states] of ALL) {
  if (states.length < 2) continue;
  const nm = seen.has(n) ? `st_${n}_2` : `st_${n}`;
  seen.add(n);
  if (!want(nm) && !want('states')) continue;
  await sc(([rows]) => {
    const cm = window.__cm; cm.clear();
    if (!cm.reg.hasModel(rows[0][0])) return;
    cm.row(rows, 0, 0.6);
    cm.frame(0.3, 30, 1.05);
  }, [states.map((st) => [n, o, st, null, label(st)])]);
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
}

// Nahaufnahmen (Porträts) der Hauptfiguren: [name, opts, state, Zielhöhe, Abstand]
const PORTRAITS = [
  ['schattenlaeuferin', {}, 'idle', 1.1, 2.2], ['schlangenkoenig', {}, 'idle', 4.7, 5.5], ['spuk', {}, 'chase', 0.55, 2.2],
  ['pilzling_eis', {}, 'idle', 0.5, 1.8], ['schneesaeule', {}, 'idle', 1.4, 3.2], ['stachelfisch', {}, 'swim', 0.7, 3.2],
];
for (let i = 0; i < PORTRAITS.length; i += 3) {
  const nm = `portrait_${i / 3 + 1}`;
  if (!want(nm) && !want('portrait')) continue;
  await sc((list) => {
    const cm = window.__cm; cm.clear();
    list.forEach(([n, o, s, y, d], k) => {
      const m = cm.put(n, o, s, (k - 1) * 40, 0, -Math.PI / 2 + 0.45, 30, null);
      m.portrait = { y, d };
    });
    const vp = [];
    // drei Teilbilder nebeneinander: Kamera je Figur, Ausschnitt per Viewport
    cm.portraits = cm.live.map((m) => ({ m, y: m.portrait.y, d: m.portrait.d }));
  }, PORTRAITS.slice(i, i + 3));
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  if (ONLY && !ONLY.includes(nm)) continue;
  await sc(() => {
    const cm = window.__cm, v = cm.v, r = v.renderer, T = cm.THREE;
    const size = r.getSize(new T.Vector2());
    r.setScissorTest(true);
    const cam = v.camera, aspect0 = cam.aspect, n = cm.portraits.length, w = Math.floor(size.x / n);
    cm.portraits.forEach((p, k) => {
      const c = p.m.root.position;
      cam.aspect = w / size.y; cam.fov = 30; cam.updateProjectionMatrix();
      cam.position.set(c.x + p.d * 0.35, p.y + p.d * 0.18, c.z + p.d);
      cam.lookAt(c.x, p.y, c.z);
      v.world.lighting.update(new T.Vector3(c.x, p.y, 0));
      r.setViewport(k * w, 0, w, size.y); r.setScissor(k * w, 0, w, size.y);
      r.render(v.three, cam);
    });
    r.setScissorTest(false); r.setViewport(0, 0, size.x, size.y);
    cam.aspect = aspect0; cam.updateProjectionMatrix();
    cm.labels.innerHTML = '';
  });
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}cm3_${nm}.png` });
}

// Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
const LINEUPS = [ENEMIES.slice(0, 6), ENEMIES.slice(6).concat([GROUPS[1]]), BOSSES.filter(([n]) => n !== 'schatten_bumerang').slice(0, 5), ITEMS.concat(SNOW.slice(4, 8))];
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
    ms.forEach((m) => { m.label = m.label.replace(/ .*/, ''); });
    cm.live.push({ root: cube, label: '1 m', dispose() { cube.geometry.dispose(); cube.material.dispose(); cube.removeFromParent(); } });
  }, LINEUPS[li].map(([n, o, s]) => [n, o, s]));
  if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
  await shot(nm);
}

// Kurs-Sicht: Kamera 14 bzw. 16 m, Neigung 50°, FOV 45° – eine kleine Schnee-Szene mit Gegnern und Requisiten
if (want('course')) {
  await sc(([list, deco]) => {
    const cm = window.__cm; cm.clear();
    deco.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw]) => cm.put(n, o, s, x, z, yaw, 24, null));
    const ok = list.filter(([n]) => cm.reg.hasModel(n));
    ok.forEach(([n, o, s], i) => {
      const col = i % 6, row = Math.floor(i / 6);
      cm.put(n, o, s, (col - 2.5) * 2.7, 1.8 - row * 3.2, i % 2 ? -Math.PI / 2 : Math.atan2(-0.3, 1), 24, n.replace(/_.*/, ''));
    });
    cm.cam([0, 0.4, -3.4], 50 * Math.PI / 180, 14, 45);
  }, [ENEMIES.concat(BOSSES.slice(0, 1), ITEMS.slice(0, 3)).map(([n, o, s]) => [n, o, s]),
    [['tanne_schnee', { size: 4 }, 'idle', -9.5, -7, 0], ['tanne_schnee', { size: 3 }, 'idle', 9, -6, 1], ['schneemann', {}, 'idle', 8.5, -1, -2.2],
      ['iglu', {}, 'idle', -9, -1.5, 0.6], ['eisflaeche', { size: [5, 3] }, 'idle', 0, -9.5, 0], ['schneeblock', {}, 'idle', -6, 2.8, 0], ['eisblock', {}, 'idle', 6.5, 2.8, 0]]]);
  if (ONLY && !ONLY.includes('course')) ONLY.push('course');
  await shot('course');
  await sc(() => { const cm = window.__cm; cm.cam([0, 0.4, -3.4], 50 * Math.PI / 180, 16, 45); for (const m of cm.live) m.label = null; });
  if (ONLY && !ONLY.includes('course_far')) ONLY.push('course_far');
  await shot('course_far');
}

// Instanz-Feld: Schneeblöcke, Eisblöcke, Tannen, Eiszapfen (Kurs-Kamera)
if (want('instanced')) {
  await sc(() => {
    const cm = window.__cm; cm.clear();
    const T = cm.THREE, p = new T.Vector3();
    const sets = [];
    const mk = (k, n) => { const I = cm.inst.createInstanced(k, n); cm.stage.add(I.root); sets.push(I); return I; };
    const blocks = mk('schneeblock', 40), ice = mk('eisblock', 20), trees = mk('tanne_schnee', 30), cic = mk('eiszapfen', 12);
    for (let i = 0; i < 40; i++) blocks.setAt(i, p.set(-8 + (i % 10), Math.floor(i / 10) % 2, -2 - Math.floor(i / 20) * 1), 0, 1, 'idle');
    for (let i = 0; i < 20; i++) ice.setAt(i, p.set(3 + (i % 5), Math.floor(i / 5) % 2, -1 - Math.floor(i / 10)), 0, 1, 'idle');
    for (let i = 0; i < 30; i++) trees.setAt(i, p.set(-11 + (i % 10) * 2.4 + (i % 3) * 0.5, 0, -8 - Math.floor(i / 10) * 2.6), i, 0.8 + (i % 4) * 0.15, i % 5 ? 'idle' : 'shake');
    for (let i = 0; i < 12; i++) cic.setAt(i, p.set(3 + i * 0.45, 3, -1.5), i, 0.6 + (i % 3) * 0.2, 'idle');
    for (let k = 0; k < 6; k++) for (const s of sets) s.update(1 / 30);
    cm.live.push({ root: new T.Group(), dispose() { for (const s of sets) s.dispose(); } });
    cm.cam([0, 0.8, -4], 50 * Math.PI / 180, 14, 45);
  });
  if (ONLY && !ONLY.includes('instanced')) ONLY.push('instanced');
  await shot('instanced');
}

await sc(() => window.__cm.clear());
check('keine Konsolenfehler', errors.length === 0);
await browser.close();
await stop();
process.exit(summary(errors) ? 0 : 1);
