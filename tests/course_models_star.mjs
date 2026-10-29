// Galerie und Prüfung der Bonuswelt-Modelle (vor allem Welt Stern „Sternenzelt“; src/course/models/kinds/*_star.js, krone_bonus.js,
// Instanzen aus lib/instanced_star.js) und der additiven Planet-Variante (planet { kind }).
//
// Wie tests/course_models_w8.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die Spielschleife an,
// räumt die Szene frei und stellt die Modelle auf einem hellen 1-m-Schachbrett auf.
// Bilder tests/out/cms_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel, Heldin
// auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°), Themen-Szenen (Regenbogenweg S-1, Platten-Galaxie S-2,
// Walzen S-3, fliegender Zielmast S-4, Retro-Blockland S-5, Waben-Draufsicht S-6, Riesen-Dschungel S-7, Nebelfriedhof S-8,
// Kanonen-Sternwerk S-9, Kapitäns-Diorama, Kronen-Gipfel) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen, ≤ 12 Meshes,
// Dreiecke (Gimmicks ≤ 10 k, Kulisse/Krone ≤ 12 k), dispose() ohne Fehler (root hängt danach nicht mehr), kein Geometrie-/
// Textur-Leck bei Bau/Abbau, Kulisse ohne Spielzeug-Look, Gimmicks mit, Maße und Schnittstellen, Standard des erweiterten
// Modells planet unverändert, Instanz-Helfer, keine Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_star.mjs   (kein Build nötig; Port 4407 + PORT_BASE; CM_ONLY=a,b nur bestimmte
//         Bilder, CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil; CM_GROUPS=gimmicks,… → nur
//         diese Galerie-Gruppen)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4407 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);
const GROUPS_ONLY = process.env.CM_GROUPS ? process.env.CM_GROUPS.split(',') : null;
const groupOn = (g) => !GROUPS_ONLY || GROUPS_ONLY.includes(g);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const GIMMICKS = [
  ['drehplatte', {}, { tilt: 0.35 }, [{ tilt: 0 }, { tilt: 0.6 }, { tilt: Math.PI / 2 }, { tilt: Math.PI }, { tilt: 0, shake: 1 }]],
  ['drehplatte', { axis: 'x', color: 'gelb', back: 'rot', size: [3, 2] }, { tilt: 0.3 }, [{ tilt: 0.3 }, { tilt: Math.PI }]],
  ['farbplatte', {}, { color: 0 }, [{ color: 0 }, { color: 0.5 }, { color: 1 }, { color: 1, flash: 1 }]],
  ['farbplatte', { colors: ['gelb', 'gruen'], size: 3 }, { color: 1 }, [{ color: 0 }, { color: 1, flash: 0.5 }]],
  ['plattenwand', {}, { out: 1 }, [{ out: 0 }, { out: 0.5 }, { out: 1 }, { out: 1, warn: true }]],
  ['plattenwand', { color: 'rot', size: [2, 1], depth: 2.4 }, { out: 0.7 }, [{ out: 0.7 }]],
  ['zielmast_fluegel', {}, { fly: 1, flap: 0.8 }, ['idle', { fly: 0.5 }, { fly: 1 }, { fly: 1, flap: 0 }, { fly: 1, flap: 1 }, { fly: 1, flagY: 0.4 }]],
  ['riesen_frageblock_turm', {}, 'idle', ['idle', { out: 0.5 }, { out: 0 }, { anim: 'bump', n: 1 }]],
  ['riesen_frageblock_turm', { part: 'kopf' }, 'idle', ['idle', { anim: 'bump', n: 2 }]],
  ['wabe', {}, 'idle', ['idle', { press: 1 }, { flash: 1 }]],
  ['wabe', { kind: 'lava' }, 'idle', ['idle', { flash: 1 }]],
  ['wabe', { kind: 'eis' }, 'idle', ['idle', { press: 0.5 }]],
  ['nebelplattform', {}, { fade: 1 }, [{ fade: 1 }, { fade: 0.5 }, { fade: 0 }]],
  ['kanonenkugel_tritt', {}, 'idle', ['idle', 'fly', { anim: 'step', progress: 0.4 }]],
  ['diorama_drehscheibe', {}, { angle: 0.3 }, [{ angle: 0 }, { speed: 1 }]],
  ['laufbombe', {}, 'walk', ['idle', 'walk', { anim: 'fuse', progress: 0.3 }, { anim: 'fuse', progress: 0.9 }, { anim: 'boom', progress: 0.4 }, 'carried']],
  ['felsblock_riss', {}, { break: 0 }, [{ break: 0 }, { break: 0.1 }, { break: 0.4 }, { break: 0.8 }, { break: 1 }]],
  ['schienenwalze', {}, { angle: 0.3 }, [{ angle: 0 }, { speed: 1 }]],
  ['schienenbrett', {}, { speed: 0 }, [{ speed: 0 }, { speed: 5 }, { anim: 'fall', progress: 0.5 }]],
  ['weiche', {}, { dir: -1 }, [{ dir: -1 }, { dir: 1 }, { dir: 'rechts', hit: 1 }]],
];
const KULISSE_ALL = [
  ['walzen_schiene', {}, 'idle', ['idle']],
  ['brett_schiene', {}, 'idle', ['idle']],
  ['brett_schiene', { kind: 'bogen', posts: 2 }, 'idle', ['idle']],
  ['planet', { kind: 'ring' }, 'idle', ['idle']],
  ['planet', { kind: 'pilz' }, 'idle', ['idle']],
  ['planet', { kind: 'blume' }, 'idle', ['idle']],
  ['planet', { kind: 'eis' }, 'idle', ['idle']],
  ['sternschnuppe', {}, 'idle', ['idle']],
  ['spielzeugrakete', {}, 'idle', ['idle', { flame: 1 }]],
  ['spielzeugrakete', { color: 'blau' }, { flame: 1 }, [{ flame: 1 }]],
  ['regenbogenweg', {}, 'idle', ['idle']],
  ['regenbogenweg', { bend: 1, rise: 1.5, length: 10 }, 'idle', ['idle']],
  ['wabensaeule', {}, 'idle', ['idle']],
  ['wabensaeule', { kind: 'lava', height: 6 }, 'idle', ['idle']],
  ['wabensaeule', { kind: 'eis', height: 5 }, 'idle', ['idle']],
  ['weltraum_antenne', {}, 'idle', ['idle', { blink: false }]],
  ['weltraum_kuppel', {}, 'idle', ['idle']],
  ['sternen_torbogen', {}, 'idle', ['idle']],
  ['retro_block', {}, 'idle', ['idle']],
  ['retro_block', { kind: 'erde' }, 'idle', ['idle']],
  ['retro_block', { kind: 'ziegel' }, 'idle', ['idle']],
  ['retro_block', { kind: 'frage' }, 'idle', ['idle']],
  ['retro_block', { kind: 'hart' }, 'idle', ['idle']],
  ['retro_wolke', {}, 'idle', ['idle']],
  ['retro_wolke', { seed: 1, size: 5 }, 'idle', ['idle']],
  ['retro_busch', {}, 'idle', ['idle']],
  ['retro_busch', { seed: 2 }, 'idle', ['idle']],
  ['riesenpflanze', {}, 'idle', ['idle']],
  ['riesenpflanze', { kind: 'pilz' }, 'idle', ['idle']],
  ['riesenpflanze', { kind: 'blatt' }, 'idle', ['idle']],
  ['schneegrab', {}, 'idle', ['idle']],
  ['schneegrab', { kind: 'kreuz' }, 'idle', ['idle']],
  ['schneegrab', { kind: 'spitz', tilt: 0.15 }, 'idle', ['idle']],
  ['krone_podest', {}, 'idle', ['idle', { sparkle: false }]],
  ['pokal_gross', {}, 'idle', ['idle']],
];
const KULISSE1 = KULISSE_ALL.slice(0, 3);
const PLANETS = KULISSE_ALL.slice(3, 7);
const KULISSE2 = KULISSE_ALL.slice(7, 18);
const RETRO = KULISSE_ALL.slice(18, 27);
const PFLANZEN = KULISSE_ALL.slice(27, 33);
const KRONE = KULISSE_ALL.slice(33);
const ALL = [...GIMMICKS, ...KULISSE_ALL];
const KULISSE_NAMES = new Set(KULISSE_ALL.map(([n]) => n));
const INST = ['wabe', 'farbplatte', 'drehplatte', 'retro_block'];
const NEW = [...new Set(ALL.map(([n]) => n))].filter((n) => n !== 'planet');
const REUSED = ['goal_pole', 'zuendkopf', 'riesen_frageblock', 'question_block', 'planet', 'nebelschwaden', 'grabstein', 'glotzfisch', 'helm_kanone', 'kanonenkugel', 'glass_pipe_segment',
  'grossrollpilz', 'pilzlingsturm', 'kreisgeist', 'spuk', 'huepfmaus', 'powerup_riese', 'donut_block', 'boost_arrow', 'funkenflaemmchen', 'riesenblatt', 'trapez', 'wolkenplattform', 'mega_block', 'brick_block'];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cms`, logLevel: 'warn', clearScreen: false,
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
  const toy = await import('/src/three/lib/toyLook.js');
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
  scene.background = new THREE.Color(0x9ccaff);
  scene.fog = null;
  // Boden: helles, warmgraues 1-m-Schachbrett, empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#efe9e6'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#dcd3cf'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 60); tex.magFilter = THREE.NearestFilter; tex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group(); scene.add(stage);
  const labels = document.createElement('div');
  labels.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:50;font:bold 11px sans-serif;color:#1d2340';
  document.body.appendChild(labels);

  const L = v.world.lighting;
  const day = { hemi: [L.hemi.color.getHex(), L.hemi.groundColor.getHex(), L.hemi.intensity], sun: [L.sun.color.getHex(), L.sun.intensity], bg: scene.background.clone() };
  const live = [];
  // schwebende Modelle (Ursprung in der Mitte) anheben
  const LIFT = { kanonenkugel_tritt: (o) => (o.size ?? 2) / 2, sternschnuppe: () => 1.2, regenbogenweg: () => 0.4, retro_wolke: () => 0.05 };
  const cm = {
    reg, kit, inst, toy, THREE, v, stage, hero, live, labels, ground,
    clear() {
      for (const m of live.splice(0)) m.dispose();
      stage.clear();
      labels.innerHTML = '';
      if (hero) hero.root.visible = false;
      ground.visible = true;
    },
    put(name, opts, state, x, z, yaw = -Math.PI / 2 + 0.55, steps = 24, label = name) {
      const m = reg.getModel(name, opts ?? {});
      m.root.position.set(x, LIFT[name] ? LIFT[name](opts ?? {}) : 0, z); m.root.rotation.y = yaw;
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
      if (el > 1.55) cam.up.set(0, 0, -1); else cam.up.set(0, 1, 0);
      cam.lookAt(t);
      v.target.copy(t);
      v.world.lighting.update(new THREE.Vector3(t.x, t.y, 0));
    },
    bounds(obj) {
      const b = new THREE.Box3(), tmp = new THREE.Box3();
      obj.updateMatrixWorld(true);
      obj.traverse((o) => {
        if (!o.isMesh || !o.visible || o.userData.fx) return;
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
    /** Einfacher Quader (Wand, Sockel) als Szenen-Hilfe. */
    box(x, y, z, w, h, d, color = 0x8a8ab0) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
      stage.add(m);
      live.push({ root: m, dispose() { m.geometry.dispose(); m.material.dispose(); m.removeFromParent(); } });
      return m;
    },
    /** Fläche (Wasser, Gift, Schnee) als Szenen-Hilfe: x, z Mitte, w × d. */
    pool(x, z, w, d, color, y = 0.02, opacity = 1) {
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: opacity < 1, opacity }));
      pm.rotation.x = -Math.PI / 2; pm.position.set(x, y, z); pm.receiveShadow = true;
      stage.add(pm);
      live.push({ root: pm, dispose() { pm.geometry.dispose(); pm.material.dispose(); pm.removeFromParent(); } });
      return pm;
    },
    /** Stimmung: 'tag' | 'weltraum' | 'himmel' | 'schnee' | 'dschungel' | 'nacht' | 'abend' | 'gold'. */
    mood(kind = 'tag') {
      const set = (hemi, gr, hi, sun, si, bg, groundC, showGround = true) => { L.hemi.color.setHex(hemi); L.hemi.groundColor.setHex(gr); L.hemi.intensity = hi; L.sun.color.setHex(sun); L.sun.intensity = si; scene.background = new THREE.Color(bg); ground.material.color.setHex(groundC); ground.visible = showGround; };
      if (kind === 'weltraum') set(0xc8c0ff, 0x2a1a5a, 1.0, 0xfff0e0, 1.45, 0x1a1446, 0x6a62a0, false);
      else if (kind === 'himmel') set(0xe8f4ff, 0x8aa8d8, 1.05, 0xfff4e0, 1.5, 0x8ac8ff, 0xffffff, false);
      else if (kind === 'schnee') set(0xd8e0ff, 0x4a4a7a, 0.9, 0xe0e4ff, 1.0, 0x3a3a6a, 0xe8eeff);
      else if (kind === 'dschungel') set(0xe0ffd8, 0x2a4a2a, 1.0, 0xfff4d0, 1.4, 0x7ad0a0, 0x8ac870);
      else if (kind === 'nacht') set(0x8aa0ff, 0x1a1a3a, 0.75, 0xc8d0ff, 0.9, 0x141a3a, 0x4a4a62);
      else if (kind === 'abend') set(0xffd8b8, 0x4a3a5a, 1.0, 0xffc890, 1.4, 0xff9a7a, 0xa8d070);
      else if (kind === 'gold') set(0xfff0d8, 0x6a4a5a, 1.05, 0xfff0d0, 1.5, 0x5a3a8a, 0xd8c8e8);
      else {
        L.hemi.color.setHex(day.hemi[0]); L.hemi.groundColor.setHex(day.hemi[1]); L.hemi.intensity = day.hemi[2];
        L.sun.color.setHex(day.sun[0]); L.sun.intensity = day.sun[1];
        scene.background = day.bg.clone();
        ground.material.color.setHex(0xffffff);
        ground.visible = true;
      }
    },
  };
  window.__cm = cm;
});

const shot = async (name) => {
  if (ONLY && !ONLY.includes(name)) return;
  await sc(() => window.__cm.render());
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}cms_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${typeof v === 'number' ? +v.toFixed(2) : Array.isArray(v) ? v.join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const missing = NEW.filter((n) => !names.includes(n));
  check(`alle ${NEW.length} neuen Bonuswelt-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
  const reusedMissing = REUSED.filter((n) => !names.includes(n));
  check(`wiederverwendet vorhanden (${REUSED.length})${reusedMissing.length ? ` (fehlt: ${reusedMissing.join(', ')})` : ''}`, reusedMissing.length === 0);
  check('kein doppelter Modellname (Warnung der Registry)', !errors.some((e) => e.includes('doppelter Name')));

  const cycle = await sc((all) => {
    const cm = window.__cm; const out = { counts: {}, tris: {}, fails: [], toy: {} };
    for (const [name, opts, , states] of all) {
      if (!cm.reg.hasModel(name)) continue;
      const key = Object.keys(opts ?? {}).length ? `${name}(${JSON.stringify(opts)})` : name;
      try {
        const m = cm.reg.getModel(name, opts);
        if (!m.root || typeof m.update !== 'function' || typeof m.dispose !== 'function') throw new Error('Vertrag verletzt');
        if (m.placeholder) throw new Error('Platzhalter');
        cm.stage.add(m.root);
        let tris = 0, meshes = 0;
        for (const st of states) {
          for (let i = 0; i < 40; i++) m.update(1 / 30, st);
          let tt = 0;
          m.root.traverse((o) => { if (o.isMesh && o.visible) { let vis = true; for (let p = o.parent; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return; const g = o.geometry; tt += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
          tris = Math.max(tris, tt);
          meshes = Math.max(meshes, cm.meshes(m.root));
        }
        m.update(0.016, undefined); m.update(0.016, 'idle'); m.update(0.5, {}); m.update(0.016, 'gibtsnicht');
        out.counts[key] = meshes;
        out.tris[key] = Math.round(tris);
        let toyN = 0, plainN = 0;
        m.root.traverse((o) => { const mm = o.material; if (!mm || Array.isArray(mm) || !mm.isMeshStandardMaterial) return; if (cm.toy.hasToyLook(mm)) toyN++; else plainN++; });
        out.toy[key] = [toyN, plainN];
        let nan = false;
        m.root.updateMatrixWorld(true);
        m.root.traverse((o) => { if (o.matrixWorld.elements.some((x) => !Number.isFinite(x))) nan = true; if (o.isInstancedMesh) { for (const x of o.instanceMatrix.array) if (!Number.isFinite(x)) nan = true; } });
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
  const heavyK = Object.entries(cycle.tris).filter(([n, t]) => KULISSE_NAMES.has(base(n)) && t > 12000);
  check(`Kulisse ≤ 12 k Dreiecke (Kartenqualität)${heavyK.length ? ` (zu viel: ${heavyK.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyK.length === 0);
  const heavy = Object.entries(cycle.tris).filter(([n, t]) => !KULISSE_NAMES.has(base(n)) && t > 10000);
  check(`Gimmicks ≤ 10 k Dreiecke${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);
  const toyBad = Object.entries(cycle.toy).filter(([n, [t]]) => KULISSE_NAMES.has(base(n)) && t > 0);
  check(`Kulisse ohne Spielzeug-Look${toyBad.length ? ` (mit Look: ${toyBad.map(([n]) => n).join(', ')})` : ''}`, toyBad.length === 0);
  const toyMiss = Object.entries(cycle.toy).filter(([n, [t]]) => !KULISSE_NAMES.has(base(n)) && t === 0);
  check(`Gimmicks mit Spielzeug-Look${toyMiss.length ? ` (ohne: ${toyMiss.map(([n]) => n).join(', ')})` : ''}`, toyMiss.length === 0);

  // Leck-Prüfung: weitere Bau/Abbau-Durchläufe mit Rendern dürfen keine Geometrien/Texturen anhäufen
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

  // Standard des erweiterten Modells planet unverändert (ohne opts.kind)
  const std0 = await sc(() => {
    const cm = window.__cm; const out = {};
    const info = (name, opts, st) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); for (let i = 0; i < 30; i++) m.update(1 / 30, st); let tris = 0; m.root.traverse((o) => { if (o.isMesh && o.visible) { const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } }); const b = cm.bounds(m.root); const s = b.getSize(new cm.THREE.Vector3()); const r = { meshes: cm.meshes(m.root), tris: Math.round(tris), h: +s.y.toFixed(2), w: +s.x.toFixed(2) }; m.dispose(); return r; };
    out.planet = info('planet', {}, 'idle');
    out.planetBlue = info('planet', { color: 'blue', radius: 2, ring: false }, 'idle');
    return out;
  });
  console.log('  Standard planet:', JSON.stringify(std0));
  // Referenz gemessen auf master vor der Erweiterung: 2 Meshes, 2176 Dreiecke, Höhe 6,56 (Kugel 6 + schräger Ring); ohne Ring 1 Mesh, Höhe 4
  check('Standard des erweiterten Modells planet unverändert (Meshes, Dreiecke, Maße)', std0.planet.meshes === 2 && Math.abs(std0.planet.tris - 2176) <= 2176 * 0.03 && Math.abs(std0.planet.h - 6.56) < 0.3 && std0.planetBlue.meshes === 1 && Math.abs(std0.planetBlue.h - 4) < 0.1);

  // Eigenschaften (Maße und Schnittstellen, nach denen Motor/Level programmieren)
  const props = await sc(() => {
    const cm = window.__cm; const out = {}; const T = cm.THREE;
    const has = (n) => cm.reg.hasModel(n);
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new T.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2), empty: b.isEmpty() }; m.dispose(); return r; };
    const with_ = (name, opts, fn) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); try { return fn(m); } finally { m.dispose(); } };
    const run = (m, st, n = 40) => { for (let k = 0; k < n; k++) m.update(1 / 30, st); };
    if (has('drehplatte')) { const a = box('drehplatte', { size: [2, 2], thick: 0.3 }, { tilt: 0 }), b = box('drehplatte', { size: [2, 2], thick: 0.3 }, { tilt: 0.5 }); out.dreh = [a.x, a.z, a.minY, a.maxY, b.maxX, b.y, with_('drehplatte', {}, (m) => m.root.userData.top)]; }
    if (has('farbplatte')) { const a = box('farbplatte', { size: [2, 2], thick: 0.25 }, { color: 0 }); out.farb = [a.x, a.z, a.minY, a.maxY]; }
    if (has('plattenwand')) { const a = box('plattenwand', { size: [2, 0.6], depth: 1.6 }, { out: 0 }), b = box('plattenwand', { size: [2, 0.6], depth: 1.6 }, { out: 1 }); out.wand = [a.maxX, b.maxX, b.minY, b.maxY, b.z]; }
    if (has('zielmast_fluegel')) { const a = box('zielmast_fluegel', {}, 'idle'), b = box('zielmast_fluegel', {}, { fly: 1, flap: 1 }); out.mast = [a.y, a.minY, a.z, b.z, b.maxY, with_('zielmast_fluegel', {}, (m) => typeof m.root.userData.flagHeight === 'function')]; }
    if (has('riesen_frageblock_turm')) { const a = box('riesen_frageblock_turm', { size: 2 }, 'idle'), b = box('riesen_frageblock_turm', { size: 2 }, { out: 0.5 }); out.turm = [a.x, a.y, a.minY, b.maxY, with_('riesen_frageblock_turm', { size: 2 }, (m) => { run(m, { out: 0.5 }, 90); return +m.root.userData.top.toFixed(2); })]; }
    if (has('wabe')) { const a = box('wabe', { size: 1, thick: 0.5 }, 'idle'); out.wabe = [a.x, a.z, a.minY, a.maxY]; }
    if (has('nebelplattform')) { const a = box('nebelplattform', { size: [3, 3], thick: 0.5 }, { fade: 1 }), b = box('nebelplattform', { size: [3, 3] }, { fade: 0 }); out.nebel = [a.x, a.z, a.minY, a.maxY, b.empty]; }
    if (has('kanonenkugel_tritt')) { const a = box('kanonenkugel_tritt', { size: 2 }, 'idle'); out.kugel = [a.y, a.minY, a.maxY, with_('kanonenkugel_tritt', { size: 2 }, (m) => m.root.userData.top)]; }
    if (has('diorama_drehscheibe')) { const a = box('diorama_drehscheibe', { radius: 5, height: 1.2 }, { angle: 0 }); out.dreh2 = [a.z, a.maxY, a.minY, with_('diorama_drehscheibe', { radius: 5, height: 1.2 }, (m) => m.root.userData.top)]; }
    if (has('laufbombe')) { const a = box('laufbombe', {}, 'walk'), b = box('laufbombe', {}, { anim: 'boom', progress: 1 }); out.bombe = [a.y, a.minY, b.empty || b.y < 0.3]; }
    if (has('felsblock_riss')) { const a = box('felsblock_riss', { size: 2 }, { break: 0 }), b = box('felsblock_riss', { size: 2 }, { break: 1 }); out.fels = [a.x, a.y, a.minY, b.maxY]; }
    if (has('schienenwalze')) { const a = box('schienenwalze', { radius: 1.5, length: 6 }, { angle: 0 }); out.walze = [a.x, a.y, a.minY, with_('schienenwalze', { radius: 1.5, length: 6 }, (m) => [m.root.userData.axleY, m.root.userData.top, m.root.userData.gauge])]; }
    if (has('walzen_schiene')) { const a = box('walzen_schiene', { length: 12, gauge: 6, height: 3 }, 'idle'); out.wschiene = [a.x, a.z, a.maxY, a.minY]; }
    if (has('schienenbrett')) { const a = box('schienenbrett', { size: [3, 2] }, { speed: 0 }); out.brett = [a.x, a.z, a.maxY, a.minY, with_('schienenbrett', {}, (m) => m.root.userData.top)]; }
    if (has('weiche')) { const a = box('weiche', {}, { dir: -1 }); out.weiche = [a.minX, a.maxX, a.maxY, with_('weiche', {}, (m) => m.root.userData.target.toArray())]; }
    if (has('planet')) { const a = box('planet', { kind: 'eis', size: 6 }, 'idle'), b = box('planet', { kind: 'pilz', size: 6 }, 'idle'); out.planet = [a.minY, b.minY, b.y, a.x, with_('planet', { kind: 'ring', size: 6 }, (m) => m.root.userData.radius)]; }
    if (has('regenbogenweg')) { const a = box('regenbogenweg', { length: 8, width: 3 }, 'idle'); out.rb = [a.minX, a.maxX, a.z, a.maxY, with_('regenbogenweg', { length: 8, bend: 1 }, (m) => [+m.root.userData.end.x.toFixed(2), +m.root.userData.end.z.toFixed(2)])]; }
    if (has('spielzeugrakete')) { const a = box('spielzeugrakete', {}, 'idle'); out.rakete = [a.y, a.minY]; }
    if (has('wabensaeule')) { const a = box('wabensaeule', { height: 8 }, 'idle'); out.saeule = [a.y, a.minY]; }
    if (has('weltraum_antenne')) { const a = box('weltraum_antenne', {}, 'idle'); out.antenne = [a.y, a.minY]; }
    if (has('weltraum_kuppel')) { const a = box('weltraum_kuppel', {}, 'idle'); out.kuppel = [a.x, a.y]; }
    if (has('sternen_torbogen')) { const a = box('sternen_torbogen', { width: 6, height: 5 }, 'idle'); out.bogen = [a.z, a.maxY, a.minY]; }
    if (has('retro_block')) { const a = box('retro_block', { size: 2 }, 'idle'); out.retro = [a.x, a.y, a.minY]; }
    if (has('retro_wolke')) { const a = box('retro_wolke', { size: 4 }, 'idle'); out.wolke = [a.x, a.minY]; }
    if (has('riesenpflanze')) { const a = box('riesenpflanze', {}, 'idle'), b = box('riesenpflanze', { kind: 'pilz' }, 'idle'), c = box('riesenpflanze', { kind: 'blatt' }, 'idle'); out.pflanze = [a.y, b.y, b.x, c.x, a.minY]; }
    if (has('schneegrab')) { const a = box('schneegrab', { size: 1.2 }, 'idle'); out.grab = [a.y, a.minY]; }
    if (has('krone_podest')) { const a = box('krone_podest', {}, 'idle'); out.podest = [a.x, a.y, a.z, a.minY]; }
    if (has('pokal_gross')) { const a = box('pokal_gross', { size: 3 }, 'idle'); out.pokal = [a.y, a.minY]; }
    return out;
  });
  console.log('  Eigenschaften:', JSON.stringify(props));
  const P = props;
  if (P.dreh) check('Drehplatte: size × size, Ursprung unten, Oberseite ≈ thick (+ Stern), gekippt hebt +X; userData.top', Math.abs(P.dreh[0] - 2) < 0.15 && Math.abs(P.dreh[1] - 2.3) < 0.3 && P.dreh[2] > -0.08 && P.dreh[3] < 0.45 && P.dreh[5] > 0.9 && P.dreh[6] === 0.3);
  if (P.farb) check('Farbplatte: size, Ursprung unten, Oberseite ≈ thick', Math.abs(P.farb[0] - 2) < 0.15 && Math.abs(P.farb[1] - 2) < 0.15 && P.farb[2] > -0.02 && P.farb[3] < 0.36);
  if (P.wand) check('Plattenwand: eingefahren bündig (x ≈ 0), ausgefahren bis depth, Ursprung unten, Höhe size[1]', P.wand[0] < 0.2 && Math.abs(P.wand[1] - 1.6) < 0.25 && P.wand[2] > -0.25 && P.wand[3] < 0.9 && P.wand[4] > 2);
  if (P.mast) check('Zielmast mit Flügeln: ≈ height + Stern, auf dem Boden, Flügel breiten sich im Flug aus, flagHeight', P.mast[0] > 8 && P.mast[0] < 9.4 && P.mast[1] > -0.05 && P.mast[3] > 3 && P.mast[5]);
  if (P.turm) check('Riesen-?-Turm-Segment: Kante size, Ursprung unten, out 0,5 → halbe Höhe (userData.top)', Math.abs(P.turm[0] - 2) < 0.2 && Math.abs(P.turm[1] - 2) < 0.15 && P.turm[2] > -0.02 && Math.abs(P.turm[3] - 1) < 0.15 && Math.abs(P.turm[4] - 1) < 0.1);
  if (P.wabe) check('Wabe: Ecke nach +X (Breite 2·size), Tiefe √3·size, Ursprung unten, Oberseite ≈ thick', Math.abs(P.wabe[0] - 2) < 0.12 && Math.abs(P.wabe[1] - 1.73) < 0.15 && P.wabe[2] > -0.02 && P.wabe[3] < 0.6);
  if (P.nebel) check('Nebelplattform: size, Oberseite thick, fade 0 → Platte unsichtbar', Math.abs(P.nebel[0] - 3) < 0.4 && Math.abs(P.nebel[1] - 3) < 0.4 && P.nebel[2] > -0.05 && Math.abs(P.nebel[3] - 0.5) < 0.1 && P.nebel[4]);
  if (P.kugel) check('Kanonenkugel zum Draufstehen: Ø size, Ursprung Kugelmitte, userData.top = radius', Math.abs(P.kugel[0] - 2) < 0.2 && Math.abs(P.kugel[1] + 1) < 0.15 && P.kugel[3] === 1);
  if (P.dreh2) check('Diorama-Drehscheibe: Ø ≈ 2·radius, Oberseite = height (userData.top; Kurbel ragt bis ≈1,8 m)', P.dreh2[0] > 9.8 && P.dreh2[0] < 11 && P.dreh2[1] < 2 && P.dreh2[2] > -0.05 && P.dreh2[3] === 1.2);
  if (P.bombe) check('Laufbombe (Zündkopf-Zwilling): ≈0,9 m, steht; boom → weg', P.bombe[0] > 0.7 && P.bombe[0] < 1.3 && P.bombe[1] > -0.05 && P.bombe[2]);
  if (P.fels) check('Felsblock: size (+ Kiesel am Fuß), Ursprung unten; break 1 → nur Geröll', P.fels[0] > 1.9 && P.fels[0] < 2.8 && Math.abs(P.fels[1] - 2) < 0.3 && P.fels[2] > -0.1 && P.fels[3] < 0.8);
  if (P.walze) check('Schienenwalze: Räder bei ±length/2, Ursprung Laufkante (Spurkranz 0,12 darunter), Achse radius + 0,2, userData', P.walze[0] > 6 && P.walze[0] < 7.2 && Math.abs(P.walze[1] - 3.6) < 0.4 && P.walze[2] > -0.15 && Math.abs(P.walze[3][0] - 1.7) < 0.01 && Math.abs(P.walze[3][1] - 3.2) < 0.01 && P.walze[3][2] === 6);
  if (P.wschiene) check('Walzen-Schiene: Spurweite gauge, Länge length, Oberkante y ≈ 0 (Prellböcke darüber), Stützen bis −height', P.wschiene[0] > 6 && P.wschiene[0] < 6.8 && Math.abs(P.wschiene[1] - 12) < 0.3 && P.wschiene[2] < 0.6 && P.wschiene[3] < -3);
  if (P.brett) check('Schienenbrett: size, Deck y = 0,62, Ursprung Schienen-Oberkante (Räder reichen bis ≈ 0)', Math.abs(P.brett[0] - 3) < 0.3 && Math.abs(P.brett[1] - 2) < 0.3 && P.brett[2] < 0.75 && P.brett[3] > -0.15 && P.brett[4] === 0.62);
  if (P.weiche) check('Weiche: Zulauf ab −2,2, Äste bis ≈4,6, Signal mit Zielscheibe ≈2,3 m (userData.target)', P.weiche[0] < -2 && P.weiche[1] > 4.4 && P.weiche[2] > 2.6 && Math.abs(P.weiche[3][1] - 2.35) < 0.01);
  if (P.planet) check('Planet { kind }: Mitte bei size/2 (Kugel ab y ≈ 0, Pilze/Kristalle/Ringe ragen darüber hinaus), Ø ≈ size, userData.radius', P.planet[0] > -1.6 && P.planet[1] > -1.5 && P.planet[2] > 5.5 && P.planet[2] < 9.5 && P.planet[3] > 6 && P.planet[4] === 3);
  if (P.rb) check('Regenbogenweg: von x = 0 bis length, Breite width (+ Wülste), Oberseite y ≈ 0, Ende (userData.end) im Bogen', P.rb[0] > -0.2 && Math.abs(P.rb[1] - 8) < 0.3 && P.rb[2] > 3 && P.rb[2] < 3.6 && P.rb[3] < 0.3 && P.rb[4][1] < -1);
  if (P.rakete) check('Spielzeugrakete ≈4,6 m, steht auf den Flossen', P.rakete[0] > 4.2 && P.rakete[0] < 5.2 && P.rakete[1] > -0.05);
  if (P.saeule) check('Waben-Säule ≈ height, Fußpunkt', Math.abs(P.saeule[0] - 8) < 0.4 && P.saeule[1] > -0.05);
  if (P.antenne) check('Antenne ≈7,5 m', P.antenne[0] > 6.5 && P.antenne[0] < 8.5 && P.antenne[1] > -0.05);
  if (P.kuppel) check('Kuppel Ø ≈6 m', P.kuppel[0] > 5.8 && P.kuppel[0] < 7 && P.kuppel[1] > 3);
  if (P.bogen) check('Sternen-Torbogen: Füße bei ±width/2, Scheitel ≈ height', P.bogen[0] > 6 && P.bogen[0] < 8 && P.bogen[1] > 4.8 && P.bogen[1] < 6.5 && P.bogen[2] > -0.05);
  if (P.retro) check('Retro-Block: Kante size, Ursprung unten', Math.abs(P.retro[0] - 2) < 0.05 && Math.abs(P.retro[1] - 2) < 0.05 && P.retro[2] > -0.02);
  if (P.wolke) check('Retro-Wolke: Breite size (+ Fase), Unterkante y ≈ 0', P.wolke[0] > 3.8 && P.wolke[0] < 4.8 && P.wolke[1] > -0.4);
  if (P.pflanze) check('Riesenpflanzen: Blume ≈8 m, Pilz ≈7 m mit Kappe Ø ≈7 m, Blatt ≈6 m lang', P.pflanze[0] > 7 && P.pflanze[0] < 10 && P.pflanze[1] > 6.2 && P.pflanze[1] < 7.8 && P.pflanze[2] > 6 && P.pflanze[3] > 5 && P.pflanze[4] > -0.1);
  if (P.grab) check('Schneegrab ≈ size hoch, auf dem Boden', P.grab[0] > 1.1 && P.grab[0] < 1.6 && P.grab[1] > -0.1);
  if (P.podest) check('Kronen-Podest ≈6,4 m breit (z), ≈5,6 m tief mit Teppich (x), mit Krone ≈4–6 m hoch, Fußpunkt', P.podest[2] > 6 && P.podest[2] < 7 && P.podest[0] < 6 && P.podest[1] > 3.8 && P.podest[1] < 6.5 && P.podest[3] > -0.05);
  if (P.pokal) check('Großer Pokal ≈ size hoch, Fußpunkt', Math.abs(P.pokal[0] - 3) < 0.4 && P.pokal[1] > -0.05);

  // Instanz-Helfer
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'leuchtsteg', 'gitterboden']) {
      try {
        const opts = kind === 'wabe' ? { kind: 'lava' } : kind === 'retro_block' ? { kind: 'frage' } : {};
        const I = cm.inst.createInstanced(kind, 200, opts);
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'farbplatte' ? { color: (i % 10) / 10, flash: i % 7 === 0 ? 1 : 0 } : kind === 'drehplatte' ? { tilt: (i % 8) * 0.4 } : kind === 'wabe' ? { press: (i % 3) / 2 } : kind === 'retro_block' ? (i % 5 ? 'idle' : { anim: 'bump', progress: 0.5 }) : 'idle');
        for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 2.2 - 22, 0, -Math.floor(i / 20) * 2.2), 0, 1, st(i));
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
  }, INST);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
  const heavyI = INST.filter((k) => instInfo[k] && instInfo[k].tris / 200 > 1500);
  check(`Instanzen sparsam (≤ 1,5 k Dreiecke je Stück)${heavyI.length ? ` (zu viel: ${heavyI.map((k) => `${k}=${Math.round(instInfo[k].tris / 200)}`).join(', ')})` : ''}`, heavyI.length === 0);
  check('Instanz-Helfer: alte Arten unverändert (coin, leuchtsteg, gitterboden)', ['coin', 'leuchtsteg', 'gitterboden'].every((k) => instInfo[k] && !instInfo[k].error));
}

// ------------------------------------------------------------------ Bilder
const gallery = async (name, list, el = 0.22, gap = 0.45, per = 4, mood = 'tag') => {
  if (!groupOn(name)) return;
  for (let i = 0; i * per < list.length; i++) {
    const nm = `${name}_${i + 1}`;
    if (!want(nm) && !want(name)) continue;
    const pt = list.slice(i * per, (i + 1) * per).map(([n, o, s]) => [n, o, s, null, optLabel(n, o)]);
    await sc(([list, el, gap, mood]) => { const cm = window.__cm; cm.clear(); cm.mood(mood); cm.row(list.filter(([n]) => cm.reg.hasModel(n)), 0, gap); cm.frame(el); }, [pt, el, gap, mood]);
    if (ONLY && !ONLY.includes(nm) && ONLY.includes(name)) ONLY.push(nm);
    await shot(nm);
  }
  await sc(() => window.__cm.mood('tag'));
};
if (part('gallery')) {
  await gallery('gimmicks', GIMMICKS, 0.3, 0.7, 5);
  await gallery('kulisse1', KULISSE1, 0.3, 1.0, 3);
  await gallery('planeten', PLANETS, 0.15, 1.0, 4, 'weltraum');
  await gallery('kulisse2', KULISSE2, 0.2, 0.9, 6, 'weltraum');
  await gallery('retro', RETRO, 0.2, 0.7, 9);
  await gallery('pflanzen', PFLANZEN, 0.2, 0.9, 6);
  await gallery('krone', KRONE, 0.2, 0.9, 2, 'gold');
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cms_st_<name>.png)
if (part('states')) {
  const seen = new Set();
  for (const [n, o, , states] of GIMMICKS) {
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
  // Nahaufnahmen (Porträts): [name, opts, state, Zielhöhe, Abstand, yaw?]
  const PORTRAITS = [
    ['kanonenkugel_tritt', {}, 'idle', 1, 5.5, -0.5], ['kanonenkugel_tritt', {}, 'fly', 1, 6, -0.9], ['laufbombe', {}, 'walk', 0.45, 2.6],
    ['zielmast_fluegel', {}, { fly: 1, flap: 0.8 }, 6.5, 9, Math.PI / 2], ['zielmast_fluegel', {}, 'idle', 5, 10], ['drehplatte', {}, { tilt: 0.4 }, 0.3, 4.5],
    ['farbplatte', {}, { color: 0.5, flash: 0.6 }, 0.2, 4], ['plattenwand', {}, { out: 1 }, 0.4, 4.5, -0.3], ['riesen_frageblock_turm', {}, 'idle', 1, 6],
    ['wabe', {}, 'idle', 0.4, 3.5], ['wabe', { kind: 'lava' }, 'idle', 0.4, 3.5], ['wabe', { kind: 'eis' }, 'idle', 0.4, 3.5],
    ['schienenwalze', {}, { angle: 0.4 }, 1.8, 10, -0.3], ['schienenbrett', {}, { speed: 0 }, 0.4, 5, -0.6], ['weiche', {}, { dir: 1 }, 1, 9, -0.7],
    ['felsblock_riss', {}, { break: 0.1 }, 1, 6.5], ['diorama_drehscheibe', {}, { angle: 0.3 }, 0.8, 14, -0.4], ['nebelplattform', {}, { fade: 0.7 }, 0.4, 6],
  ];
  for (let i = 0; i < PORTRAITS.length; i += 3) {
    const nm = `portrait_${i / 3 + 1}`;
    if (!want(nm) && !want('portrait')) continue;
    await sc((list) => {
      const cm = window.__cm; cm.clear();
      list.forEach(([n, o, s, y, d, yaw], k) => {
        if (!cm.reg.hasModel(n)) return;
        const m = cm.put(n, o, s, (k - 1) * 40, 0, yaw ?? -Math.PI / 2 + 0.45, 30, null);
        m.portrait = { y, d };
      });
      cm.portraits = cm.live.map((m) => ({ m, y: m.portrait.y, d: m.portrait.d }));
    }, PORTRAITS.slice(i, i + 3));
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await sc(() => {
      const cm = window.__cm, v = cm.v, r = v.renderer, T = cm.THREE;
      const size = r.getSize(new T.Vector2());
      r.setScissorTest(true);
      const cam = v.camera, aspect0 = cam.aspect, w = Math.floor(size.x / 3);
      cm.portraits.forEach((p, k) => {
        const c = p.m.root.position;
        cam.aspect = w / size.y; cam.fov = 30; cam.updateProjectionMatrix();
        cam.up.set(0, 1, 0);
        cam.position.set(c.x + p.d * 0.35, p.y + p.d * 0.22 + c.y, c.z + p.d);
        cam.lookAt(c.x, p.y + c.y, c.z);
        v.world.lighting.update(new T.Vector3(c.x, p.y, 0));
        r.setViewport(k * w, 0, w, size.y); r.setScissor(k * w, 0, w, size.y);
        r.render(v.three, cam);
      });
      r.setScissorTest(false); r.setViewport(0, 0, size.x, size.y);
      cam.aspect = aspect0; cam.updateProjectionMatrix();
      cm.labels.innerHTML = '';
    });
    await page.waitForTimeout(60);
    await page.screenshot({ path: `${OUT}cms_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const pick = (n, o) => ALL.find(([a, b]) => a === n && JSON.stringify(b) === JSON.stringify(o ?? {}));
  const LINEUPS = [
    [pick('drehplatte'), pick('farbplatte'), pick('plattenwand'), pick('wabe'), pick('kanonenkugel_tritt'), pick('laufbombe'), pick('felsblock_riss'), pick('riesen_frageblock_turm')],
    [pick('zielmast_fluegel'), pick('schienenwalze'), pick('schienenbrett'), pick('nebelplattform'), pick('weiche')],
    [pick('retro_block', { kind: 'frage' }), pick('retro_busch'), pick('schneegrab'), pick('spielzeugrakete'), pick('weltraum_antenne'), pick('pokal_gross')],
    [pick('riesenpflanze'), pick('riesenpflanze', { kind: 'pilz' }), pick('riesenpflanze', { kind: 'blatt' }), pick('krone_podest')],
  ];
  for (let li = 0; li < LINEUPS.length; li++) {
    const nm = `lineup_${li + 1}`;
    if (!want(nm) && !want('lineup')) continue;
    await sc((list) => {
      const cm = window.__cm; const THREE = cm.THREE; cm.clear();
      const ms = cm.row(list.filter((x) => x && cm.reg.hasModel(x[0])), 0, 0.35, -Math.PI / 2 + 0.35);
      const b = cm.bounds(cm.stage);
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
      cube.position.set(b.min.x - 0.9, 0.5, 0); cube.castShadow = true;
      cm.stage.add(cube);
      if (cm.hero) {
        cm.hero.root.visible = true;
        cm.hero.root.position.set(b.min.x - 2.1, 0, 0);
        cm.hero.root.scale.setScalar(1 / 1.5);
        cm.hero.root.rotation.y = 0;
      }
      const b2 = cm.bounds(cm.stage);
      if (cm.hero) b2.union(new THREE.Box3().setFromObject(cm.hero.root));
      const c = b2.getCenter(new THREE.Vector3()), sz = b2.getSize(new THREE.Vector3());
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * cm.v.camera.aspect);
      const dh = (sz.y / 2) / Math.tan(THREE.MathUtils.degToRad(15));
      cm.cam([c.x, sz.y / 2, 0], 0.1, Math.max((sz.x / 2) / Math.tan(hf / 2), dh) * 1.06 + sz.z / 2);
      ms.forEach((m) => { m.label = m.label.replace(/ .*/, ''); });
      cm.live.push({ root: cube, label: '1 m', dispose() { cube.geometry.dispose(); cube.material.dispose(); cube.removeFromParent(); } });
    }, LINEUPS[li].filter(Boolean).map(([n, o, s]) => [n, o, s]));
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await shot(nm);
  }

  // Themen-Szenen (Kurs-Kamera 45°/13 m, FOV 45°): [Stimmung, Hilfsflächen/Quader, Modelle [name, opts, state, x, z, yaw, y?], Blickpunkt,
  //   Heldin [x, z, y?]?, Instanzen [[art, opts, [[x, y, z, yaw, state], …]], …]?, Neigung (Grad, 45)?]
  const SCENES = {
    scene_regenbogen: ['weltraum', [], [['regenbogenweg', { length: 8 }, 'idle', -9, 1, 0, 0.6], ['regenbogenweg', { length: 8, bend: 0.8, rise: 1 }, 'idle', -1, 1, 0, 0.6], ['regenbogenweg', { length: 6, bend: -0.6 }, 'idle', 5.5, -2.5, 0.6, 1.6],
      ['sternschnuppe', { length: 7 }, 'idle', 3, -8, 0.4, 5], ['planet', { kind: 'blume', size: 7 }, 'idle', -9, -14, 0, -2], ['planet', { kind: 'ring', size: 9 }, 'idle', 10, -16, 0, -1], ['huepfmaus', {}, 'idle', -3, 0.8, 0, 0.6],
      ['spielzeugrakete', { color: 'lila' }, { flame: 1 }, 9, -6, 0, 1], ['trapez', {}, 'idle', 6, 2, 0, 3]], [0, 0.5, -3], [-6, 1, 0.6]],
    scene_galaxie: ['weltraum', [['box', 5, -0.5, -6, 1, 6, 8, 0x5a5ab8]], [['plattenwand', { size: [2, 0.6], depth: 1.6 }, { out: 1 }, 5.5, -4, 0, 0.6], ['plattenwand', { size: [2, 0.6], depth: 1.6 }, { out: 0.5 }, 5.5, -6.5, 0, 1.6],
      ['plattenwand', { size: [2, 0.6], depth: 1.6 }, { out: 0 }, 5.5, -9, 0, 2.6], ['sternen_torbogen', {}, 'idle', -1, -8, 0], ['planet', { kind: 'pilz', size: 6 }, 'idle', -10, -12, 0, 1], ['planet', { kind: 'eis', size: 5 }, 'idle', 12, -14, 0, 4],
      ['sternschnuppe', {}, 'idle', -6, -10, 0.3, 7], ['drehplatte', {}, { tilt: 0.5, shake: 0 }, -5, 1, 0, 0]], [0, 0.5, -3], [-1.5, 2.5],
    [['farbplatte', {}, Array.from({ length: 16 }, (_, i) => [-3 + (i % 4) * 2.05, 0, -1 + Math.floor(i / 4) * -2.05 + 4, 0, { color: (i + Math.floor(i / 4)) % 2 }])],
      ['drehplatte', {}, Array.from({ length: 6 }, (_, i) => [-9 + (i % 2) * 2.1, 0, 2 - Math.floor(i / 2) * 2.1, 0, { tilt: [0, 0.4, 1.2, 0, 2.6, 0.2][i] }])]]],
    scene_walzen: ['himmel', [], [['walzen_schiene', { length: 18, gauge: 6, height: 4 }, 'idle', 0, -4, 0, 0], ['schienenwalze', { radius: 1.5, length: 6 }, { angle: 0.4 }, 0, -2, 0, 0], ['schienenwalze', { radius: 1, length: 6 }, { angle: 1.2 }, 0, -9, 0, 0],
      ['walzen_schiene', { length: 8, gauge: 4, height: 4 }, 'idle', -8, 0, Math.PI / 2, 1.5], ['schienenwalze', { radius: 0.8, length: 4 }, { angle: 0 }, -8, 0, Math.PI / 2, 1.5]], [0, 1.5, -3], [0.5, -2, 3.25], [], 45, true],
    scene_zielmast: ['himmel', [], [['zielmast_fluegel', {}, { fly: 1, flap: 0.7 }, 1, -7, Math.PI / 2, 2], ['wolkenplattform', { size: [5, 0.8, 4] }, 'idle', -1, 1, 0, 0], ['wolkenplattform', { size: [4, 0.8, 3] }, 'idle', 4, -3, 0, 0.5],
      ['boost_arrow', { length: 3, width: 1.8 }, 'idle', -1, 0.5, Math.PI / 2, 0.82], ['donut_block', {}, 'idle', 5, -3, 0, 1.3], ['donut_block', {}, 'idle', 6, -3, 0, 1.3], ['glotzfisch', {}, 'idle', -5, -4, 0.4, 2.5], ['retro_wolke', { size: 5 }, 'idle', -8, -12, 0, 1]], [0, 1.5, -3], [-1, 1.5, 0.8], [], 45, true],
    scene_blockland: ['tag', [], [['riesen_frageblock_turm', { size: 2 }, 'idle', 4, -6, 0, 0], ['riesen_frageblock_turm', { size: 2 }, 'idle', 4, -6, 0, 2], ['riesen_frageblock_turm', { size: 2, part: 'kopf' }, 'idle', 4, -6, 0, 4],
      ['laufbombe', {}, 'walk', -1, 1, 0.3, 2], ['laufbombe', {}, { anim: 'fuse', progress: 0.85 }, 1.5, 0, 2, 2], ['felsblock_riss', { size: [2, 3, 3] }, { break: 0 }, -6, -6, 0, 0], ['retro_wolke', { size: 5 }, 'idle', -4, -14, 0, 6],
      ['retro_wolke', { size: 4, seed: 2 }, 'idle', 8, -12, 0, 7], ['retro_busch', { size: 3 }, 'idle', 8, -2, 0.3, 0], ['retro_busch', { size: 2.5, seed: 1 }, 'idle', -8, 2, 0, 0]], [0, 1, -3], [-2.5, 2.5, 2],
    [['retro_block', { kind: 'gras' }, Array.from({ length: 12 }, (_, i) => [-4 + (i % 4) * 2, 0, 3 - Math.floor(i / 4) * 2, 0, 'idle'])], ['retro_block', { kind: 'ziegel' }, [[-6, 0, 2, 0, 'idle'], [-6, 2, 2, 0, 'idle'], [6, 0, 4, 0, 'idle']]],
      ['retro_block', { kind: 'frage' }, [[0, 4, -1, 0, 'idle']]], ['retro_block', { kind: 'hart' }, [[2, 2, -1, 0, 'idle'], [-2, 2, -1, 0, 'idle']]]]],
    scene_waben: ['weltraum', [], [['wabensaeule', { height: 10 }, 'idle', -7, -6, 0, -10], ['wabensaeule', { height: 10, kind: 'lava' }, 'idle', 7, 4, 0, -10], ['brummer', {}, 'idle', 1.5, -1, 0, 1.2]], [0, 0, 0], [-1, 0.5, 0.5],
    [['wabe', { kind: 'normal' }, hexField(0)], ['wabe', { kind: 'lava' }, hexField(1)], ['wabe', { kind: 'eis' }, hexField(2)]], 89.9],
    scene_dschungel: ['dschungel', [], [['riesenpflanze', { kind: 'pilz', size: 9 }, 'idle', -6, -10, 0.3], ['riesenpflanze', { kind: 'blume', size: 10 }, 'idle', 7, -11, -0.4], ['riesenpflanze', { kind: 'blatt', size: 7 }, 'idle', -9, -1, 0.2],
      ['riesenpflanze', { kind: 'blatt', size: 6 }, 'idle', 7, 1, Math.PI], ['grossrollpilz', {}, 'walk', 1, -3, 0.4], ['pilzlingsturm', {}, 'idle', -3, -5, 0.6], ['powerup_riese', {}, 'idle', 2, 2, 0, 0.3]], [0, 1, -3], [-1.5, 3]],
    scene_nebel: ['schnee', [['pool', 4, -2, 9, 8, 0x6ad04a, 0.03]], [['schneegrab', {}, 'idle', -5, -2, 0.2], ['schneegrab', { kind: 'kreuz' }, 'idle', -3, -5, -0.2], ['schneegrab', { kind: 'spitz', tilt: 0.15 }, 'idle', -7, -6, 0.4], ['schneegrab', { size: 1.5 }, 'idle', -1, -9, 0],
      ['nebelplattform', { size: [3, 3] }, { fade: 1 }, 4, 0, 0, 0.6], ['nebelplattform', { size: [3, 3] }, { fade: 0.45 }, 5, -4, 0, 1.6], ['nebelplattform', { size: [3, 3] }, { fade: 0 }, 6, -8, 0, 2.6], ['nebelschwaden', { size: [14, 8], color: 0xe8eaff, opacity: 0.45 }, 'idle', 0, -4, 0],
      ['kreisgeist', {}, 'idle', -4, -1, 0.5, 1.2], ['leaf_raft', {}, 'idle', 2, 2, 0, 0.05]], [0, 0.8, -3], [-1.5, 2.5]],
    scene_sternwerk: ['weltraum', [], [['brett_schiene', { length: 14, posts: 3 }, 'idle', -9, 1, 0, 3], ['weiche', {}, { dir: 1 }, 5, 1, 0, 3], ['schienenbrett', {}, { speed: 4 }, 0, 1, 0, 3], ['kanonenkugel_tritt', { size: 2 }, 'fly', -3, -5, 0, 5],
      ['kanonenkugel_tritt', { size: 2 }, 'idle', 2, -7, 0, 6.5], ['weltraum_antenne', {}, 'idle', -8, -10, 0.3], ['weltraum_kuppel', {}, 'idle', 7, -11, -0.5], ['spielzeugrakete', {}, { flame: 1 }, 12, -4, 0, 2], ['planet', { kind: 'eis', size: 6 }, 'idle', -14, -16, 0, 2]], [0, 3.5, -3], [0, 1, 3.62]],
    scene_diorama: ['abend', [], [['diorama_drehscheibe', { radius: 5, height: 1.2 }, { angle: 0.5 }, 0, -3, 0], ['funkenflaemmchen', {}, 'idle', -2, -2, 0, 1.2], ['funkenflaemmchen', {}, 'idle', 2, -5, 0, 1.2], ['star', {}, 'idle', 1, -1, 0, 1.4], ['kruemel', {}, 'idle', -1, -4, 0.5, 1.2]], [0, 1, -3]],
    scene_krone: ['gold', [], [['krone_podest', {}, 'idle', 0, -4, 0], ['pokal_gross', {}, 'idle', -6, -2, 0.4], ['pokal_gross', { size: 2 }, 'idle', 6, -2, -0.4], ['sternen_torbogen', { width: 7, height: 6 }, 'idle', 0, 3, 0]], [0, 1.5, -2], [-2.5, 2]],
  };
  function hexField(k) {
    const out = [];
    const r = 1, dz = Math.sqrt(3) * r;
    for (let q = -5; q <= 5; q++) for (let s = -3; s <= 3; s++) {
      const x = q * 1.5 * r, z = s * dz + (q % 2 ? dz / 2 : 0);
      const kind = Math.abs(q) + Math.abs(s) < 3 ? 0 : (q + s * 2 + 30) % 5 === 0 ? 1 : (q * 3 + s + 30) % 7 === 0 ? 2 : 0;
      if (kind === k) out.push([x, 0, z, 0, 'idle']);
    }
    return out;
  }
  for (const [nm, [mood, helpers, list, tgt, heroAt, insts, tiltDeg, noGround]] of Object.entries(SCENES)) {
    if (!want(nm) && !want('scenes')) continue;
    await sc(([list, mood, helpers, tgt, heroAt, insts, tiltDeg, noGround]) => {
      const cm = window.__cm; cm.clear(); cm.mood(mood);
      if (noGround) cm.ground.visible = false;
      for (const [k, ...a] of helpers) if (k === 'box') cm.box(...a); else if (k === 'pool') cm.pool(...a);
      list.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw, y]) => { const m = cm.put(n, o, s, x, z, yaw, 24, null); if (y !== undefined) m.root.position.y = y; });
      for (const [kind, opts, items] of insts ?? []) {
        try {
          const I = cm.inst.createInstanced(kind, items.length, opts);
          cm.stage.add(I.root);
          items.forEach(([x, y, z, yaw, st], i) => I.setAt(i, [x, y, z], yaw, 1, st));
          for (let k = 0; k < 6; k++) I.update(1 / 30);
          cm.live.push({ root: I.root, dispose() { I.dispose(); } });
        } catch (e) { console.log(e.message); }
      }
      if (heroAt && cm.hero) { cm.hero.root.visible = true; cm.hero.root.scale.setScalar(1 / 1.5); cm.hero.root.position.set(heroAt[0], heroAt[2] ?? 0, heroAt[1]); cm.hero.root.rotation.y = Math.PI / 2; }
      cm.cam(tgt, (tiltDeg ?? 45) * Math.PI / 180, 13, 45);
    }, [list, mood, helpers, tgt, heroAt ?? null, insts ?? [], tiltDeg ?? 45, !!noGround]);
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await shot(nm);
    await sc(() => window.__cm.mood('tag'));
  }
  // Fernsicht der Weltraum-Kulisse (Planeten, Rakete, Antenne, Torbogen) – flache Kamera
  if (want('fern')) {
    await sc(() => {
      const cm = window.__cm; cm.clear(); cm.mood('weltraum');
      for (const [n, o, s, x, z, yaw, y] of [['planet', { kind: 'ring', size: 12 }, 'idle', -16, -30, 0, 4], ['planet', { kind: 'pilz', size: 8 }, 'idle', 14, -26, 0, 8], ['planet', { kind: 'blume', size: 6 }, 'idle', 0, -40, 0, 14],
        ['planet', { kind: 'eis', size: 7 }, 'idle', 24, -40, 0, 2], ['spielzeugrakete', {}, { flame: 1 }, -4, -16, 0, 6], ['sternschnuppe', { length: 9 }, 'idle', 6, -20, 0.3, 14], ['sternen_torbogen', { width: 8, height: 7 }, 'idle', 0, -6, 0, 0],
        ['regenbogenweg', { length: 14, width: 4 }, 'idle', -7, -6, 0, 0], ['weltraum_kuppel', {}, 'idle', 10, -10, -0.4, 0], ['weltraum_antenne', {}, 'idle', -12, -10, 0.4, 0], ['wabensaeule', { height: 12 }, 'idle', 20, -14, 0, -6]]) {
        if (!cm.reg.hasModel(n)) continue;
        const m = cm.put(n, o, s, x, z, yaw, 24, null); if (y !== undefined) m.root.position.y = y;
      }
      cm.cam([0, 6, -18], 0.12, 46, 45);
    });
    if (ONLY && !ONLY.includes('fern')) ONLY.push('fern');
    await shot('fern');
    await sc(() => window.__cm.mood('tag'));
  }
}

await sc(() => window.__cm.clear());
check('keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   Konsole:', e);
await browser.close();
await stop();
process.exit(summary(errors) ? 0 : 1);
