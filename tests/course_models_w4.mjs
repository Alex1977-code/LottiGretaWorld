// Galerie und Prüfung der Welt-4-Modelle (src/course/models/kinds/*_w4.js, Instanzen aus lib/instanced_w4.js).
//
// Wie tests/course_models_w3.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die
// Spielschleife an, räumt die Szene frei und stellt die Modelle auf einem sandfarbenen 1-m-Schachbrett (Canyon) auf.
// Bilder tests/out/cm4_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel,
// Heldin auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen,
// ≤ 12 Meshes, Dreiecke (Gegner ≤ 9 k, Boss ≤ 20 k, Kulisse ≤ 30 k), dispose() ohne Fehler (root hängt danach nicht
// mehr), kein Geometrie-Leck bei Bau/Abbau, Zustands-/Größen-Eigenschaften, Instanz-Helfer (neu und alt), keine
// Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_w4.mjs   (kein Build nötig; CM_ONLY=a,b nur bestimmte Bilder,
//         CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil, für kurze Läufe)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4440 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const PATH = [[0, 0, 0], [0, 1.1, 0], [1.2, 1.9, 0.6], [2.6, 1.5, 1.3], [3.6, 0.9, 1.0]];
const ENEMIES = [
  ['ameisensoldat', {}, { anim: 'walk', speed: 1.5 }, ['walk', 'idle', 'carry', 'squashed']],
  ['ameisensoldat_horn', {}, { anim: 'walk', speed: 1.5 }, ['walk', 'idle', 'carry', 'squashed']],
  ['riesenameise', {}, { anim: 'walk', speed: 2 }, ['walk', 'idle', 'carry']],
  ['rankenschnapper', { segments: 10 }, { anim: 'snap', progress: 0.3 }, ['idle', { anim: 'idle', grow: 0.35 }, { anim: 'snap', progress: 0.3 }, 'hit', { anim: 'idle', path: PATH }, 'defeated']],
  ['lavabrocken', {}, 'walk', ['walk', 'charge', 'stunned', 'carried', 'thrown', 'defeated']],
  ['walzenwerfer', {}, { anim: 'spit', progress: 1 }, ['idle', { anim: 'spit', progress: 0.45 }, { anim: 'spit', progress: 1 }, { anim: 'throw', progress: 0.3 }, { anim: 'throw', progress: 0.8 }, 'squashed']],
  ['stachelwalze', {}, { anim: 'roll', roll: 0.6 }, ['roll', 'idle', 'break']],
  ['stachelpanzer', {}, 'walk', ['walk', 'idle', 'flipped', 'defeated']],
  ['springklotz', {}, 'idle', ['idle', { anim: 'hop', progress: 0.18 }, { anim: 'hop', progress: 0.6 }, 'squash']],
  ['lavafunke', {}, 'rise', ['rise', 'fall', 'idle']],
];
const GROUPS = [
  ['walzenwerfer', { pillar: 2.2 }, { anim: 'spit', progress: 1 }, ['idle', { anim: 'spit', progress: 1 }]],
  ['rankenschnapper', { segments: 16 }, { anim: 'idle', path: PATH }, [{ anim: 'snap', path: PATH }]],
  ['stachelwalze', { size: 1.6 }, { anim: 'roll', roll: 1.2 }, ['roll']],
];
const BOSSES = [
  ['lavafelsen_koenig', {}, 'idle', ['idle', 'roll', 'summon', 'hit', 'spin', { anim: 'idle', hp: 2 }, { anim: 'idle', hp: 1 }, 'defeated']],
];
const GIMMICKS = [
  ['piep_block', { color: 'rot' }, { on: 1 }, [{ on: 1 }, { on: 1, warn: 0.5 }, { on: 0.5 }, { on: 0 }, { on: 0, warn: 1 }]],
  ['piep_block', { color: 'blau' }, { on: 0 }, [{ on: 0 }, { on: 1 }]],
  ['riesentrampolin', { radius: 3 }, { squash: 0 }, [{ squash: 0 }, { squash: 0.7 }, 'bounce']],
  ['trampolin_orange', {}, { squash: 0 }, [{ squash: 0 }, { squash: 1 }, 'bounce']],
  ['stachelstange', { length: 6 }, { angle: 0.5 }, [{ angle: 0 }, { angle: 1.5 }]],
  ['schwankplattform', { size: [3, 3] }, { tilt: [0.12, -0.08] }, [{ tilt: [0, 0] }, { tilt: [0.2, 0.1] }]],
  ['roulette_block_w4', {}, { item: 'pilz' }, [{ item: 'pilz' }, { item: 'blume' }, { item: 'krallen' }, { item: 'stern' }, { item: 'muenze' }, { anim: 'bump', item: 'stern' }, { anim: 'used' }]],
  ['sternring', {}, 'idle', ['idle', { anim: 'active', progress: 0.5 }, 'done']],
  ['sternmuenze', {}, 'idle', ['idle', 'collected', 'ghost']],
  ['giftwasser', { size: [6, 4] }, 'idle', ['idle']],
];
const CANYON = [
  ['tafelberg', { radius: 4, height: 6 }, 'idle', ['idle']],
  ['canyon_bogen', { width: 6, height: 5 }, 'idle', ['idle']],
  ['felsnadel', { height: 5 }, 'idle', ['idle']],
  ['ameisenhuegel', { size: 2.5 }, 'idle', ['idle']],
  ['ameisenhoehle', { width: 3 }, 'idle', ['idle']],
];
const GIFTWALD = [
  ['giftpilz', { height: 2.2 }, 'idle', ['idle', 'shake']],
  ['giftbaum', { height: 5 }, 'idle', ['idle']],
  ['liane', { length: 3 }, 'idle', ['idle', { sway: 1 }]],
  ['giftwasserfall', { width: 3, height: 5 }, 'idle', ['idle']],
];
const TECHNIK = [
  ['lautsprecher', {}, { beat: 0.2 }, [{ beat: 0 }, { beat: 0.9 }]],
  ['neon_ring', { radius: 1.5, color: 'cyan' }, { pulse: 0.5 }, [{ pulse: 0 }, { pulse: 1 }]],
  ['equalizer_saeule', {}, { level: 0.6 }, [{ level: 0.1 }, { level: 1 }]],
  ['wolkeninsel', { size: 4 }, 'idle', ['idle']],
  ['windrad', { height: 6 }, { speed: 1 }, [{ speed: 0 }, { speed: 2 }]],
];
const RUINEN = [
  ['ruinen_saeule', { height: 3.5 }, 'idle', ['idle']],
  ['ruinen_saeule', { height: 2.6, broken: true }, 'idle', ['idle']],
  ['statue_bruch', {}, 'idle', ['idle']],
  ['ruinen_torbogen', { width: 4, height: 4.5 }, 'idle', ['idle']],
  ['ruinen_treppe', { steps: 5, width: 3 }, 'idle', ['idle']],
  ['ranken', { length: 3 }, 'idle', ['idle']],
];
const BURG = [
  ['burgmauer', { length: 5, height: 3.5 }, 'idle', ['idle']],
  ['lavafall', { width: 3, height: 5 }, 'idle', ['idle']],
  ['burg_kette', { length: 3 }, 'idle', ['idle', { sway: 1 }]],
  ['fallgitter', { width: 3, height: 3.5 }, { open: 0.3 }, [{ open: 0 }, { open: 1 }]],
  ['brummbaer_banner', { height: 3 }, 'idle', ['idle', { sway: 1 }]],
  ['festungsgitter', { width: 4, height: 3 }, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...GROUPS, ...BOSSES, ...GIMMICKS, ...CANYON, ...GIFTWALD, ...TECHNIK, ...RUINEN, ...BURG];
const ENEMY_NAMES = new Set(ENEMIES.map(([n]) => n));
const INST_W4 = ['piep_block', 'ameisensoldat', 'ameisensoldat_horn', 'ruinen_saeule', 'felsnadel'];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm4`, logLevel: 'warn', clearScreen: false,
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
  scene.background = new THREE.Color(0x9fd2ff);
  scene.fog = null;
  // Boden: sandfarbenes 1-m-Schachbrett (Canyon), empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ecd6ac'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e0c690'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
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
  // hängende/schwebende Modelle (Ursprung oben bzw. Sprungfläche) anheben
  const LIFT = { liane: 3.2, burg_kette: 3.2, riesentrampolin: 2.2, giftwasser: 0.03, lavafall: 0, giftwasserfall: 0 };
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
        const p = m.root.position.clone(); p.y = Math.min(p.y, 0.3) - 0.05;
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
  await page.screenshot({ path: `${OUT}cm4_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : k === 'path' ? 'path' : `${k}=${Array.isArray(v) ? v.join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const unique = [...new Set(ALL.map(([n]) => n))];
  const missing = unique.filter((n) => !names.includes(n));
  check(`alle ${unique.length} Welt-4-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
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
        let tris = 0;
        for (const st of states) {
          for (let i = 0; i < 40; i++) m.update(1 / 30, st);
          let tt = 0;
          m.root.traverse((o) => { if (o.isMesh && o.visible) { const g = o.geometry; tt += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
          tris = Math.max(tris, tt);
        }
        m.update(0.016, undefined); m.update(0.016, 'idle'); m.update(0.5, {}); m.update(0.016, 'gibtsnicht');
        out.counts[key] = cm.meshes(m.root);
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
  const base = (k) => k.replace(/\(.*/, '');
  const heavyE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && !/\{/.test(n) && t > 9000);
  check(`Gegner ≤ 9 k Dreiecke${heavyE.length ? ` (zu viel: ${heavyE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyE.length === 0);
  const lightE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && !/\{/.test(n) && t < 1500);
  check(`Gegner ≥ 1,5 k Dreiecke (nicht zu grob)${lightE.length ? ` (zu wenig: ${lightE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, lightE.length === 0);
  const bossT = cycle.tris.lavafelsen_koenig ?? 0;
  check(`Boss ≤ 20 k Dreiecke (${bossT})`, bossT > 0 && bossT <= 20000);
  const heavy = Object.entries(cycle.tris).filter(([n, t]) => t > 30000);
  check(`Dreiecke je Requisite ≤ 30 k${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);

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
  const props = await sc((PATH) => {
    const cm = window.__cm; const out = {};
    const has = (n) => cm.reg.hasModel(n);
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new cm.THREE.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), m }; m.dispose(); return r; };
    if (has('ameisensoldat')) { const a = box('ameisensoldat', {}, 'walk'), s = box('ameisensoldat', {}, 'squashed'), h = box('ameisensoldat_horn', {}, 'idle'); out.ant = [a.x, a.y, s.y, h.y, a.minY]; }
    if (has('riesenameise')) {
      const m = cm.reg.getModel('riesenameise'); cm.stage.add(m.root); for (let i = 0; i < 30; i++) m.update(1 / 30, 'walk');
      // höchster Punkt über dem Deck (ohne Kopf/Fühler): Strahl von oben auf die Deckmitte
      const ray = new cm.THREE.Raycaster(new cm.THREE.Vector3(-0.2, 5, 0.2), new cm.THREE.Vector3(0, -1, 0));
      m.root.updateMatrixWorld(true);
      const hit = ray.intersectObject(m.root, true)[0];
      const b = cm.bounds(m.root).getSize(new cm.THREE.Vector3());
      out.giant = [m.root.userData.deck?.y, hit ? +hit.point.y.toFixed(3) : null, +b.x.toFixed(2)];
      m.dispose();
    }
    if (has('rankenschnapper')) {
      const g0 = box('rankenschnapper', { segments: 12 }, { anim: 'idle', grow: 0.05 }), g1 = box('rankenschnapper', { segments: 12 }, { anim: 'idle', grow: 1 });
      const p = box('rankenschnapper', { segments: 12 }, { anim: 'idle', path: PATH });
      const m = cm.reg.getModel('rankenschnapper', { segments: 12 }); cm.stage.add(m.root); m.update(1 / 30, { anim: 'idle', path: PATH }); const hp = m.head(); out.creeperHead = [+hp.x.toFixed(2), +hp.y.toFixed(2), +hp.z.toFixed(2)]; m.dispose();
      out.creeper = [g0.x, g1.x, p.z];
    }
    if (has('springklotz')) {
      const m = cm.reg.getModel('springklotz'); cm.stage.add(m.root);
      for (let i = 0; i < 60; i++) m.update(1 / 30, 'idle'); const t0 = m.root.userData.top();
      for (let i = 0; i < 30; i++) m.update(1 / 30, 'squash'); const t1 = m.root.userData.top();
      out.spring = [+t0.toFixed(2), +t1.toFixed(2)]; m.dispose();
    }
    if (has('piep_block')) { const on = box('piep_block', { color: 'rot' }, { on: 1 }), off = box('piep_block', { color: 'rot' }, { on: 0 }); out.piep = [on.x, on.y, off.x, off.y]; }
    if (has('lavafelsen_koenig')) { const s = box('lavafelsen_koenig', {}, 'idle'); out.king = [s.x, s.y, s.z]; }
    if (has('stachelwalze')) { const s = box('stachelwalze', {}, 'idle'), s2 = box('stachelwalze', { size: 2 }, 'idle'); out.walze = [s.y, s2.y, s.minY]; }
    if (has('walzenwerfer')) {
      const m = cm.reg.getModel('walzenwerfer', { pillar: 2 }); cm.stage.add(m.root);
      for (let i = 0; i < 40; i++) m.update(1 / 30, { anim: 'spit', progress: 1 });
      const h = m.hand(), mo = m.mouth();
      out.werfer = [+h.y.toFixed(2), +mo.y.toFixed(2), +mo.x.toFixed(2)]; m.dispose();
    }
    if (has('schwankplattform')) { const a = box('schwankplattform', { size: [3, 3] }, { tilt: [0, 0] }), b = box('schwankplattform', { size: [3, 3] }, { tilt: [0.3, 0] }); out.schwank = [a.maxY, b.maxY, a.x]; }
    if (has('riesentrampolin')) { const a = box('riesentrampolin', { radius: 3 }, { squash: 0 }); out.tramp = [a.x, a.maxY]; }
    return out;
  }, PATH);
  for (const k of Object.keys(props)) for (const x of Object.values(props[k])) if (x && typeof x === 'object' && x.m) delete x.m;
  console.log('  Eigenschaften:', JSON.stringify(props));
  if (props.ant) check('Ameisensoldat ≈1,1–1,4 m lang (mit Beinen/Zangen), 0,7–0,95 m hoch (Fühler), Füße am Boden; platt viel flacher; Horn höher', props.ant[0] > 1.0 && props.ant[0] < 1.45 && props.ant[1] > 0.7 && props.ant[1] < 0.95 && props.ant[2] < props.ant[1] * 0.6 && props.ant[3] > props.ant[1] + 0.1 && props.ant[4] > -0.06);
  if (props.giant) check('Riesenameise: Deck-Oberkante ≈ userData.deck.y (Strahl von oben), 3–4 m lang (mit Fühlern)', props.giant[1] !== null && Math.abs(props.giant[1] - props.giant[0]) < 0.04 && props.giant[2] > 3 && props.giant[2] < 4);
  if (props.creeper) check('Rankenschnapper: grow wächst die Ranke, path biegt sie (z-Ausdehnung), head() am Pfadende', props.creeper[1] > props.creeper[0] + 2 && props.creeper[2] > 1 && props.creeperHead && Math.abs(props.creeperHead[2] - 1.0) < 0.8);
  if (props.spring) check('Springklotz: Oberkante ≈1,3 m, squash drückt deutlich', Math.abs(props.spring[0] - 1.3) < 0.12 && props.spring[1] < props.spring[0] - 0.2);
  if (props.piep) check('Piep-Block: an ≈ 1 m-Würfel, aus ≈ gleicher Umriss', Math.abs(props.piep[0] - 1) < 0.12 && Math.abs(props.piep[1] - 1) < 0.12 && Math.abs(props.piep[2] - 1) < 0.15);
  if (props.king) check('Lavafelsen-König 2,4–3,6 m hoch', props.king[1] > 2.4 && props.king[1] < 3.6);
  if (props.walze) check('Stachelwalze Ø ≈1 m, opts.size skaliert, liegt auf dem Boden', Math.abs(props.walze[0] - 1) < 0.15 && props.walze[1] > props.walze[0] * 1.8 && Math.abs(props.walze[2]) < 0.05);
  if (props.werfer) check('Walzenwerfer auf Säule: Walze über dem Kopf (hand), Maul vorn (mouth)', props.werfer[0] > 3.2 && props.werfer[1] > 2.4 && props.werfer[2] > 0.2);
  if (props.schwank) check('Schwankplattform: Neigung hebt eine Kante, Breite ≈ size', props.schwank[1] > props.schwank[0] + 0.2 && Math.abs(props.schwank[2] - 3) < 0.5);
  if (props.tramp) check('Riesentrampolin Ø ≈ 2·radius + Ballons (≈ 7,8 m bei radius 3)', Math.abs(props.tramp[0] - 7.8) < 0.6);

  // Instanz-Helfer (neue Arten + Rückwärtskompatibilität)
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'question_block', 'schneeblock']) {
      try {
        const I = cm.inst.createInstanced(kind, 200);
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'piep_block' ? { on: i % 2, warn: i % 5 === 0 ? 0.5 : 0 } : kind.startsWith('ameisen') ? (i % 3 ? 'walk' : 'carry') : i % 7 === 0 ? 'bump' : 'idle');
        for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, st(i));
        I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
        I.setState(5, kind === 'piep_block' ? { on: 1 } : 'idle');
        if (kind.startsWith('ameisen')) I.setAt(7, p.set(0, 2, 0), new cm.THREE.Quaternion().setFromAxisAngle(new cm.THREE.Vector3(1, 0, 0), Math.PI / 2), 1, 'walk');
        for (let k = 0; k < 10; k++) I.update(1 / 30);
        let tris = 0, meshes = 0;
        I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
        const api = ['setAt', 'setState', 'getState', 'hide', 'update', 'dispose'].every((f) => typeof I[f] === 'function') && I.count === 200 && I.getState(3) === 'hidden';
        I.dispose();
        out[kind] = { meshes, tris: Math.round(tris), api, detached: !I.root.parent };
      } catch (e) { out[kind] = { error: e.message }; }
    }
    return out;
  }, INST_W4);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST_W4.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST_W4.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
  check('Instanz-Helfer: alte Arten unverändert (coin, question_block, schneeblock)', ['coin', 'question_block'].every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes === 2) && instInfo.schneeblock && !instInfo.schneeblock.error);
}

// ------------------------------------------------------------------ Bilder
const gallery = async (name, list, el = 0.22, gap = 0.45, per = 4) => {
  for (let i = 0; i * per < list.length; i++) {
    const nm = `${name}_${i + 1}`;
    if (!want(nm) && !want(name)) continue;
    const pt = list.slice(i * per, (i + 1) * per).map(([n, o, s]) => [n, o, s, null, optLabel(n, o)]);
    await sc(([list, el, gap]) => { const cm = window.__cm; cm.clear(); cm.row(list.filter(([n]) => cm.reg.hasModel(n)), 0, gap); cm.frame(el); }, [pt, el, gap]);
    if (ONLY && !ONLY.includes(nm) && ONLY.includes(name)) ONLY.push(nm);
    await shot(nm);
  }
};
if (part('gallery')) {
  await gallery('enemies', ENEMIES, 0.2, 0.5);
  await gallery('groups', GROUPS, 0.3, 0.6, 3);
  await gallery('bosses', BOSSES, 0.2, 0.8, 3);
  await gallery('gimmicks', GIMMICKS, 0.3, 0.6, 4);
  await gallery('canyon', CANYON, 0.25, 0.8, 5);
  await gallery('giftwald', GIFTWALD, 0.25, 0.8, 4);
  await gallery('technik', TECHNIK, 0.25, 0.8, 5);
  await gallery('ruinen', RUINEN, 0.25, 0.8, 6);
  await gallery('burg', BURG, 0.25, 0.8, 6);
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cm4_st_<name>.png)
if (part('states')) {
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
}

if (part('views')) {
  // Nahaufnahmen (Porträts) der Hauptfiguren: [name, opts, state, Zielhöhe, Abstand]
  const PORTRAITS = [
    ['ameisensoldat', {}, 'idle', 0.45, 1.9], ['ameisensoldat_horn', {}, 'idle', 0.5, 2.0], ['lavabrocken', {}, 'walk', 0.5, 2.2],
    ['walzenwerfer', {}, { anim: 'spit', progress: 1 }, 0.9, 3.0], ['lavafelsen_koenig', {}, 'idle', 1.5, 6.5], ['rankenschnapper', { segments: 8 }, { anim: 'snap', progress: 0.35 }, 1.5, 3.8],
    ['riesenameise', {}, 'idle', 0.9, 5.5], ['springklotz', {}, 'idle', 0.8, 2.6], ['stachelpanzer', {}, 'idle', 0.3, 1.6],
  ];
  for (let i = 0; i < PORTRAITS.length; i += 3) {
    const nm = `portrait_${i / 3 + 1}`;
    if (!want(nm) && !want('portrait')) continue;
    await sc((list) => {
      const cm = window.__cm; cm.clear();
      list.forEach(([n, o, s, y, d], k) => {
        if (!cm.reg.hasModel(n)) return;
        const m = cm.put(n, o, s, (k - 1) * 40, 0, -Math.PI / 2 + 0.45, 30, null);
        m.portrait = { y, d };
      });
      cm.portraits = cm.live.map((m) => ({ m, y: m.portrait.y, d: m.portrait.d }));
    }, PORTRAITS.slice(i, i + 3));
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await sc(() => {
      const cm = window.__cm, v = cm.v, r = v.renderer, T = cm.THREE;
      const size = r.getSize(new T.Vector2());
      r.setScissorTest(true);
      const cam = v.camera, aspect0 = cam.aspect, n = Math.max(1, cm.portraits.length), w = Math.floor(size.x / 3);
      cm.portraits.forEach((p, k) => {
        const c = p.m.root.position;
        cam.aspect = w / size.y; cam.fov = 30; cam.updateProjectionMatrix();
        cam.position.set(c.x + p.d * 0.35, p.y + p.d * 0.22, c.z + p.d);
        cam.lookAt(c.x, p.y, c.z);
        v.world.lighting.update(new T.Vector3(c.x, p.y, 0));
        r.setViewport(k * w, 0, w, size.y); r.setScissor(k * w, 0, w, size.y);
        r.render(v.three, cam);
      });
      r.setScissorTest(false); r.setViewport(0, 0, size.x, size.y);
      cam.aspect = aspect0; cam.updateProjectionMatrix();
      cm.labels.innerHTML = '';
      void n;
    });
    await page.waitForTimeout(60);
    await page.screenshot({ path: `${OUT}cm4_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const LINEUPS = [ENEMIES.slice(0, 5), ENEMIES.slice(5), BOSSES.concat([GIMMICKS[0], GIMMICKS[3], GIMMICKS[6]]), [GIMMICKS[2], GIMMICKS[4], GIMMICKS[5], GIMMICKS[7], GIMMICKS[8]]];
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

  // Kurs-Sicht: Kamera 13 m, Neigung 45°, FOV 45° – kleine Canyon-Szene mit Gegnern und Requisiten
  if (want('course')) {
    await sc(([list, deco]) => {
      const cm = window.__cm; cm.clear();
      deco.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw]) => cm.put(n, o, s, x, z, yaw, 24, null));
      const ok = list.filter(([n]) => cm.reg.hasModel(n));
      ok.forEach(([n, o, s], i) => {
        const col = i % 6, row = Math.floor(i / 6);
        cm.put(n, o, s, (col - 2.5) * 2.6, 1.6 - row * 3.2, i % 2 ? -Math.PI / 2 : Math.atan2(-0.3, 1), 24, n.replace(/_.*/, ''));
      });
      cm.cam([0, 0.4, -3.2], 45 * Math.PI / 180, 13, 45);
    }, [ENEMIES.concat(GIMMICKS.slice(0, 1), GIMMICKS.slice(6, 9)).map(([n, o, s]) => [n, o, s]),
      [['felsnadel', { height: 5 }, 'idle', -9.5, -8, 0], ['tafelberg', { radius: 3, height: 4 }, 'idle', 10, -10, 1], ['ameisenhuegel', { size: 2 }, 'idle', 8.5, -1, -2.2],
        ['ruinen_saeule', { height: 3 }, 'idle', -9, -1.5, 0.6], ['giftwasser', { size: [5, 3] }, 'idle', 0, -9.5, 0], ['giftpilz', { height: 1.6 }, 'idle', -6.5, 3, 0], ['ruinen_saeule', { height: 2.2, broken: true }, 'idle', 7, 3, 0]]]);
    if (ONLY && !ONLY.includes('course')) ONLY.push('course');
    await shot('course');
    await sc(() => { const cm = window.__cm; cm.cam([0, 0.4, -3.2], 45 * Math.PI / 180, 16, 45); for (const m of cm.live) m.label = null; });
    if (ONLY && !ONLY.includes('course_far')) ONLY.push('course_far');
    await shot('course_far');
  }

  // Instanz-Feld: Piep-Blöcke (rot an / blau aus), Ameisen (auch an einer Wand), Säulen, Felsnadeln (Kurs-Kamera)
  if (want('instanced')) {
    await sc(() => {
      const cm = window.__cm; cm.clear();
      const T = cm.THREE, p = new T.Vector3();
      const sets = [];
      const mk = (k, n, o) => { const I = cm.inst.createInstanced(k, n, o); cm.stage.add(I.root); sets.push(I); return I; };
      const red = mk('piep_block', 24, { color: 'rot' }), blue = mk('piep_block', 24, { color: 'blau' });
      const ants = mk('ameisensoldat', 12), horns = mk('ameisensoldat_horn', 6), cols = mk('ruinen_saeule', 6), needles = mk('felsnadel', 6);
      for (let i = 0; i < 24; i++) red.setAt(i, p.set(-9 + (i % 8), Math.floor(i / 8), -1), 0, 1, { on: 1, warn: i > 15 ? 0.6 : 0 });
      for (let i = 0; i < 24; i++) blue.setAt(i, p.set(-9 + (i % 8), Math.floor(i / 8), 0.6), 0, 1, { on: 0 });
      for (let i = 0; i < 8; i++) ants.setAt(i, p.set(1 + (i % 4) * 1.2, 0, 1 - Math.floor(i / 4) * 1.4), 0.3, 1, i % 2 ? 'walk' : 'carry');
      // vier Ameisen laufen an einer gedachten Wand bei z = −4 hinauf (Bauch zur Wand, Kopf nach oben)
      const q = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, Math.PI / 2, 'YXZ'));
      for (let i = 8; i < 12; i++) ants.setAt(i, p.set(1 + (i - 8) * 1.2, 0.6 + (i % 2) * 0.8, -4), q, 1, 'walk');
      for (let i = 0; i < 6; i++) horns.setAt(i, p.set(1 + i * 1.1, 0, -2.2), Math.PI / 2, 1, 'walk');
      for (let i = 0; i < 6; i++) cols.setAt(i, p.set(-11 + i * 2.2, 0, -6.5), i, 0.9, 'idle');
      for (let i = 0; i < 6; i++) needles.setAt(i, p.set(-12 + i * 5, 0, -12), i, 0.8 + (i % 3) * 0.25, 'idle');
      for (let k = 0; k < 6; k++) for (const s of sets) s.update(1 / 30);
      // Wand als Orientierung
      const wall = new T.Mesh(new T.BoxGeometry(6, 3, 0.4), new T.MeshStandardMaterial({ color: 0xd8693a, roughness: 0.9 }));
      wall.position.set(3, 1.5, -4.2); wall.receiveShadow = true; cm.stage.add(wall);
      cm.live.push({ root: new T.Group(), dispose() { for (const s of sets) s.dispose(); wall.geometry.dispose(); wall.material.dispose(); } });
      cm.cam([-1, 0.8, -3], 45 * Math.PI / 180, 13, 45);
    });
    if (ONLY && !ONLY.includes('instanced')) ONLY.push('instanced');
    await shot('instanced');
  }
}

await sc(() => window.__cm.clear());
check('keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   Konsole:', e);
await browser.close();
await stop();
process.exit(summary(errors) ? 0 : 1);
