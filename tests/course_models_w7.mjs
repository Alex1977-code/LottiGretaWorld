// Galerie und Prüfung der Welt-7-Modelle „Lava-Festung“ (src/course/models/kinds/*_w7.js, Instanzen aus lib/instanced_w7.js)
// und der additiven Varianten (heller Lavafelsen-König, blauer Schubser-Prinz, Bumerang-Werfer mit Wurfsichel, blauer Lavafall).
//
// Wie tests/course_models_w6.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die Spielschleife an,
// räumt die Szene frei und stellt die Modelle auf einem hellen 1-m-Schachbrett auf.
// Bilder tests/out/cm7_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel, Heldin
// auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°), Themen-Szenen (Festung in blauer Lava, Vulkan,
// Riff, Lava-Burg, Boss-Straße) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen, ≤ 12 Meshes,
// Dreiecke (Gegner 3–10 k, Boss ≤ 25 k, Gimmicks/Items ≤ 16 k, Kulisse ≤ 12 k), dispose() ohne Fehler (root hängt danach
// nicht mehr), kein Geometrie-/Textur-Leck bei Bau/Abbau, Kulisse ohne Spielzeug-Look, Figuren mit, Maße und Schnittstellen,
// Standard der erweiterten Modelle unverändert, Instanz-Helfer, keine Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_w7.mjs   (kein Build nötig; Port 4396 + PORT_BASE; CM_ONLY=a,b nur bestimmte
//         Bilder, CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil, für kurze Läufe;
//         CM_GROUPS=enemies,kulisse1 … → nur diese Galerie-Gruppen)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4396 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);
const GROUPS_ONLY = process.env.CM_GROUPS ? process.env.CM_GROUPS.split(',') : null;
const groupOn = (g) => !GROUPS_ONLY || GROUPS_ONLY.includes(g);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const ENEMIES = [
  ['knochenflieger', {}, 'fly', ['fly', { anim: 'fly', flap: 1 }, { anim: 'fly', flap: 0 }, 'dive', { anim: 'defeated', progress: 0.3 }, { anim: 'defeated', progress: 0.7 }]],
  ['platschfisch', {}, 'swim', ['swim', { anim: 'jump', progress: 0.25 }, { anim: 'jump', progress: 0.7 }, { anim: 'spit', progress: 0.3 }, { anim: 'spit', progress: 0.55 }, 'defeated']],
  ['lavadrache', {}, 'idle', ['hidden', { anim: 'rise', progress: 0.45 }, 'idle', { anim: 'spit', progress: 0.3 }, { anim: 'spit', progress: 0.55 }, { anim: 'sink', progress: 0.5 }, { anim: 'defeated', progress: 0.3 }]],
  ['wutkaulquappe', {}, 'swim', ['swim', 'charge', { anim: 'puff', progress: 0.5 }, { anim: 'puff', progress: 1 }, { anim: 'defeated', progress: 0.3 }]],
  ['funkenflaemmchen', {}, { anim: 'hop', progress: 0.5 }, [{ anim: 'hop', progress: 0.08 }, { anim: 'hop', progress: 0.5 }, 'idle', { anim: 'defeated', progress: 0.3 }]],
];
const VARIANTS = [
  ['lavafelsen_koenig', { variant: 'hell' }, 'idle', ['idle', 'roll', 'summon', { anim: 'hit', progress: 0.3 }, 'spin', { anim: 'idle', hp: 1 }, 'defeated']],
  ['schubser_prinz', { color: 'blau' }, 'idle', ['idle', 'charge', 'skid', { anim: 'fireball', progress: 0.55 }, { anim: 'hit', progress: 0.2 }, { anim: 'idle', hp: 1 }, { anim: 'defeated', progress: 0.5 }]],
  ['feuerkugel_blau', {}, 'idle', ['idle']],
  ['bumerang_werfer', { sichel: true }, 'idle', ['idle', 'walk', { anim: 'throw', progress: 0.3 }, { anim: 'throw', progress: 0.7 }, { anim: 'idle', dropped: true }, 'defeated']],
  ['platschfisch', { color: 'blau' }, { anim: 'jump', progress: 0.35 }, ['swim', { anim: 'spit', progress: 0.55 }]],
  ['funkenflaemmchen', { color: 'blau' }, 'idle', ['idle', 'hop']],
  ['lavadrache', { color: 'blau', segments: 10 }, { anim: 'spit', progress: 0.55 }, ['idle', { anim: 'spit', progress: 0.55 }]],
];
const BOSSES = [
  ['baron_kampfwagen', {}, 'drive', ['idle', 'drive', { anim: 'throw', progress: 0.3 }, { anim: 'throw', progress: 0.6 }, { anim: 'fire', progress: 0.3 }, { anim: 'fire', progress: 0.55 }, { anim: 'hit', progress: 0.2 }, 'stunned', { anim: 'drive', hp: 5 }, { anim: 'drive', hp: 2 }, { anim: 'defeated', hp: 0 }]],
];
const ITEMS = [
  ['wurfsichel_item', {}, 'idle', ['idle', { anim: 'collected', progress: 0.5 }]],
  ['wurfsichel_geschoss', {}, 'spin', ['spin', { spin: 0.5 }, 'idle']],
  ['wurfsichel_kostuem', {}, 'idle', ['idle']],
  ['wurfsichel_kostuem', { part: 'umhang' }, 'idle', ['idle', { wind: 1 }]],
];
const GIMMICKS = [
  ['feuerstab', { length: 3 }, { angle: 0.6 }, [{ angle: 0 }, { angle: 1.2 }, { speed: 2 }]],
  ['feuerstab', { length: 2.5, color: 'blau', arms: 2, plane: 'v' }, { angle: 0.3 }, [{ angle: 0.3 }]],
  ['lavablase', {}, 'idle', ['idle', { anim: 'swell', grow: 0.6 }, { anim: 'pop', progress: 0.3 }, { anim: 'jump', progress: 0.3 }, 'fall', 'hidden']],
  ['lavablase', { color: 'blau' }, { anim: 'swell', grow: 0.8 }, ['idle', { anim: 'jump', progress: 0.5 }]],
  ['pfeilplattform', {}, { rise: 1 }, [{ rise: 0 }, { rise: 0.5 }, { rise: 1 }, { rise: 1, warn: true }]],
  ['pfeilplattform', { from: 'wand', color: 'blau' }, { rise: 0.7 }, [{ rise: 0.2 }, { rise: 1 }]],
  ['zylinder_walze', { length: 5, radius: 1.4 }, { angle: 0.3 }, [{ angle: 0 }, { speed: 1 }]],
  ['stachelwalze_rot', { length: 4 }, { angle: 0.4 }, [{ angle: 0 }, { speed: 2 }]],
  ['pendelstachel', { length: 3 }, { angle: 0.5 }, [{ angle: -0.8 }, { angle: 0.8 }, { speed: 1 }]],
  ['klappstampfer', {}, { fold: 0.35 }, [{ fold: 0 }, { fold: 0.5, warn: true }, { fold: 1 }, { fold: 0, warn: true }]],
  ['lava_fontaene', {}, { height: 3 }, [{ height: 0 }, { height: 0, warn: true }, { height: 1.5 }, { height: 4 }]],
  ['lava_fontaene', { color: 'blau' }, { height: 2.5 }, [{ height: 2.5 }]],
  ['gitterboden', { size: [2, 2] }, 'idle', ['idle']],
  ['zerbrechliche_kiste', {}, 'idle', ['idle', { break: 0.3 }, { break: 0.7 }, { break: 1 }, { anim: 'hit', progress: 0.3 }]],
  ['zugbruecke', { length: 6 }, { lower: 0.6 }, [{ lower: 0 }, { lower: 0.5 }, { lower: 1 }]],
  ['giftnebel_wand', { width: 8, height: 4 }, 'idle', ['idle', { density: 0.5 }]],
  ['giftnebel_wand', { width: 6, height: 3, facing: 'vorn' }, 'idle', ['idle']],
  ['kampfwagen_strasse', { kind: 'stachelfalle' }, { up: 1 }, [{ up: 0 }, { up: 0, warn: true }, { up: 0.5 }, { up: 1 }]],
  ['kampfwagen_strasse', { kind: 'luecke', width: 3 }, 'idle', ['idle']],
  ['kampfwagen_strasse', { kind: 'kante' }, 'idle', ['idle']],
  ['kampfwagen_strasse', { kind: 'fahrbahn', length: 6 }, 'idle', ['idle']],
];
const KULISSE1 = [
  ['basaltsaeule', { height: 3 }, 'idle', ['idle']],
  ['basaltsaeule', { height: 5, count: 7, glow: 'blau', seed: 3 }, 'idle', ['idle']],
  ['vulkanfels', { kind: 'brocken', size: 2 }, 'idle', ['idle']],
  ['vulkanfels', { kind: 'spitze', size: 3 }, 'idle', ['idle']],
  ['vulkanfels', { kind: 'vulkan', size: 6 }, 'idle', ['idle', { smoke: false }]],
];
const KULISSE2 = [
  ['brummbaer_fahne', {}, { wind: 0.6 }, [{ wind: 0 }, { wind: 1 }]],
  ['fackel', {}, 'idle', ['idle', { lit: false }, { flare: 1 }]],
  ['fackel', { mount: 'wand', color: 'blau' }, 'idle', ['idle', { lit: false }]],
  ['festungsturm', { height: 8 }, 'idle', ['idle']],
  ['lava_maschine', {}, { speed: 1 }, [{ angle: 0.3 }, { speed: 1 }]],
  ['lavafall', { color: 'blau', width: 2, height: 4 }, 'idle', ['idle']],
];
const KULISSE3 = [
  ['riffkoralle', { kind: 'roehre' }, 'idle', ['idle', { sway: 1 }]],
  ['riffkoralle', { kind: 'geweih' }, 'idle', ['idle']],
  ['riffkoralle', { kind: 'anemone' }, 'idle', ['idle', { sway: 1 }]],
  ['lavagestein', { size: 2 }, 'idle', ['idle']],
  ['lavagestein', { size: 1.5, vent: true, seed: 2 }, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...VARIANTS, ...BOSSES, ...ITEMS, ...GIMMICKS, ...KULISSE1, ...KULISSE2, ...KULISSE3];
const ENEMY_NAMES = new Set(['knochenflieger', 'platschfisch', 'lavadrache', 'wutkaulquappe', 'funkenflaemmchen']);
const BOSS_NAMES = new Set(['baron_kampfwagen', 'lavafelsen_koenig', 'schubser_prinz']);
const KULISSE_NAMES = new Set([...KULISSE1, ...KULISSE2, ...KULISSE3].map(([n]) => n));
const INST_W7 = ['gitterboden', 'basaltsaeule', 'lavablase', 'zerbrechliche_kiste'];
const W7_NEW = [...new Set([...ENEMIES, ...BOSSES, ...ITEMS, ...GIMMICKS, ...KULISSE1, ...KULISSE2, ...KULISSE3, ['feuerkugel_blau']].map(([n]) => n))];
const REUSED = ['stachelpanzer', 'bumerang_werfer', 'feuer_werfer', 'stampfstein', 'marschblock', 'rammfisch', 'zauberkroete', 'lavabrocken', 'lavafelsen_koenig',
  'schubser_prinz', 'kickbombe', 'baron_brummbaer', 'lavafall', 'burg_kette', 'brummbaer_banner', 'zahnrad', 'koralle', 'funkenling', 'glutball', 'pilzlingsturm', 'projektilkopf'];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm7`, logLevel: 'warn', clearScreen: false,
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
  // hängende/schwebende Modelle (Ursprung oben oder in der Mitte) anheben
  const LIFT = {
    knochenflieger: () => 1.1, wutkaulquappe: (o) => 0.6 * (o.size ?? 1.25), wurfsichel_geschoss: () => 0.5, wurfsichel_kostuem: (o) => (o.part === 'umhang' ? 1.3 : 0.35),
    pendelstachel: (o) => (o.length ?? 3) + (o.size ?? 1) + 0.25, zylinder_walze: (o) => (o.radius ?? 1.5) + 0.05, stachelwalze_rot: (o) => (o.stand === false ? (o.radius ?? 0.6) + 0.45 : 0),
    pfeilplattform: (o) => (o.from === 'wand' ? 1.2 : (o.thick ?? 0.5) + 0.05), fackel: (o) => (o.mount === 'wand' ? 1.7 : 0), zugbruecke: (o) => (o.thick ?? 0.3) + 0.02,
    lava_maschine: () => 0, kampfwagen_strasse: (o) => (o.kind === 'stachelfalle' ? 0.13 : o.kind === 'kante' ? 0.62 : o.kind === 'luecke' ? 1.3 : (o.thick ?? 0.5) + 0.01),
  };
  const cm = {
    reg, kit, inst, toy, THREE, v, stage, hero, live, labels, ground,
    clear() {
      for (const m of live.splice(0)) m.dispose();
      stage.clear();
      labels.innerHTML = '';
      if (hero) hero.root.visible = false;
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
    /** Lava-Fläche (unbeleuchtet, Glut) als Szenen-Hilfe: x, z Mitte, w × d, Farbe 'rot' | 'blau'. */
    lavaPool(x, z, w, d, color = 'rot', y = 0.02) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const gx = cv.getContext('2d');
      const blue = color === 'blau';
      gx.fillStyle = blue ? '#1a3ad8' : '#e0400e'; gx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 26; i++) {
        const cx = Math.random() * 128, cy = Math.random() * 128;
        const gr = gx.createRadialGradient(cx, cy, 0, cx, cy, 8 + Math.random() * 14);
        gr.addColorStop(0, blue ? 'rgba(170,236,255,0.55)' : 'rgba(255,190,50,0.55)'); gr.addColorStop(1, blue ? 'rgba(26,58,216,0)' : 'rgba(224,64,14,0)');
        gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
      }
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(w / 4, d / 4);
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tx }));
      pm.rotation.x = -Math.PI / 2; pm.position.set(x, y, z);
      stage.add(pm);
      live.push({ root: pm, dispose() { pm.geometry.dispose(); pm.material.dispose(); tx.dispose(); pm.removeFromParent(); } });
      return pm;
    },
    /** Stimmung: 'tag' | 'lava' (dunkel-warm, Festung/Vulkan) | 'riff' (Unterwasser, blaugrün). */
    mood(kind = 'tag') {
      if (kind === 'lava') {
        L.hemi.color.setHex(0xffb8a0); L.hemi.groundColor.setHex(0x3a1a1a); L.hemi.intensity = 0.95;
        L.sun.color.setHex(0xffd8b8); L.sun.intensity = 1.35;
        scene.background = new THREE.Color(0x3a1a2a);
        ground.material.color.setHex(0x6a5a62);
      } else if (kind === 'riff') {
        L.hemi.color.setHex(0xa8e8ff); L.hemi.groundColor.setHex(0x1a3a4a); L.hemi.intensity = 1.0;
        L.sun.color.setHex(0xd8f8ff); L.sun.intensity = 1.3;
        scene.background = new THREE.Color(0x1a6a8a);
        ground.material.color.setHex(0xd8c8a0);
      } else {
        L.hemi.color.setHex(day.hemi[0]); L.hemi.groundColor.setHex(day.hemi[1]); L.hemi.intensity = day.hemi[2];
        L.sun.color.setHex(day.sun[0]); L.sun.intensity = day.sun[1];
        scene.background = day.bg.clone();
        ground.material.color.setHex(0xffffff);
      }
    },
  };
  window.__cm = cm;
});

const shot = async (name) => {
  if (ONLY && !ONLY.includes(name)) return;
  await sc(() => window.__cm.render());
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}cm7_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? +x.toFixed(2) : x)).join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const missing = W7_NEW.filter((n) => !names.includes(n));
  check(`alle ${W7_NEW.length} Welt-7-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
  const reusedMissing = REUSED.filter((n) => !names.includes(n));
  check(`wiederverwendet vorhanden: ${REUSED.join(', ')}${reusedMissing.length ? ` (fehlt: ${reusedMissing.join(', ')})` : ''}`, reusedMissing.length === 0);
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
        let tris = 0;
        for (const st of states) {
          for (let i = 0; i < 40; i++) m.update(1 / 30, st);
          let tt = 0;
          m.root.traverse((o) => { if (o.isMesh && o.visible) { let vis = true; for (let p = o.parent; p; p = p.parent) if (!p.visible) vis = false; if (!vis) return; const g = o.geometry; tt += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
          tris = Math.max(tris, tt);
        }
        m.update(0.016, undefined); m.update(0.016, 'idle'); m.update(0.5, {}); m.update(0.016, 'gibtsnicht');
        out.counts[key] = cm.meshes(m.root);
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
  const heavyE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && (t > 10000 || t < 3000));
  check(`Gegner 3–10 k Dreiecke${heavyE.length ? ` (außerhalb: ${heavyE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyE.length === 0);
  const bossT = Object.entries(cycle.tris).filter(([n]) => BOSS_NAMES.has(base(n))).map(([n, t]) => [n, t]);
  check(`Boss/Boss-Varianten ≤ 25 k Dreiecke (${bossT.map(([n, t]) => `${base(n)}=${t}`).join(', ')})`, bossT.length > 0 && bossT.every(([, t]) => t > 3000 && t <= 25000));
  const heavyK = Object.entries(cycle.tris).filter(([n, t]) => KULISSE_NAMES.has(base(n)) && t > 12000);
  check(`Kulisse ≤ 12 k Dreiecke (Kartenqualität)${heavyK.length ? ` (zu viel: ${heavyK.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyK.length === 0);
  const heavy = Object.entries(cycle.tris).filter(([n, t]) => !KULISSE_NAMES.has(base(n)) && !BOSS_NAMES.has(base(n)) && !ENEMY_NAMES.has(base(n)) && t > 16000);
  check(`Gimmicks/Items/Varianten ≤ 16 k Dreiecke${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);
  const toyBad = Object.entries(cycle.toy).filter(([n, [t]]) => KULISSE_NAMES.has(base(n)) && base(n) !== 'lavafall' && t > 0);
  check(`Kulisse ohne Spielzeug-Look${toyBad.length ? ` (mit Look: ${toyBad.map(([n]) => n).join(', ')})` : ''}`, toyBad.length === 0);
  const toyMiss = Object.entries(cycle.toy).filter(([n, [t]]) => !KULISSE_NAMES.has(base(n)) && t === 0 && !['feuerkugel_blau'].includes(base(n)));
  check(`Figuren/Gimmicks mit Spielzeug-Look${toyMiss.length ? ` (ohne: ${toyMiss.map(([n]) => n).join(', ')})` : ''}`, toyMiss.length === 0);

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

  // Standard der erweiterten Modelle unverändert (Meshzahl, Dreiecke, Maße ohne neue Optionen)
  const std0 = await sc(() => {
    const cm = window.__cm; const out = {};
    const info = (name, opts, st) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); for (let i = 0; i < 30; i++) m.update(1 / 30, st); let tris = 0; m.root.traverse((o) => { if (o.isMesh && o.visible) { const g = o.geometry; tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } }); const b = cm.bounds(m.root); const s = b.getSize(new cm.THREE.Vector3()); const r = { meshes: cm.meshes(m.root), tris: Math.round(tris), h: +s.y.toFixed(2), w: +s.x.toFixed(2) }; m.dispose(); return r; };
    for (const [n, o, s] of [['lavafelsen_koenig', {}, 'idle'], ['lavafelsen_koenig', { variant: 'hell' }, 'idle'], ['schubser_prinz', {}, 'idle'], ['schubser_prinz', { color: 'blau' }, 'idle'],
      ['bumerang_werfer', {}, 'idle'], ['bumerang_werfer', { sichel: true }, 'idle'], ['lavafall', {}, 'idle'], ['lavafall', { color: 'blau' }, 'idle']]) out[`${n}${Object.keys(o).length ? JSON.stringify(o) : ''}`] = info(n, o, s);
    return out;
  });
  console.log('  Standard vs. Variante:', JSON.stringify(std0));
  const same = (a, b) => a && b && a.meshes === b.meshes && Math.abs(a.h - b.h) < 0.25;
  check('Varianten: gleicher Aufbau wie der Standard (Meshes, Höhe)', same(std0.lavafelsen_koenig, std0['lavafelsen_koenig{"variant":"hell"}']) && same(std0.schubser_prinz, std0['schubser_prinz{"color":"blau"}'])
    && same(std0.lavafall, std0['lavafall{"color":"blau"}']) && std0['bumerang_werfer{"sichel":true}'] && std0['bumerang_werfer{"sichel":true}'].meshes <= 12);
  // Standard unverändert: Referenzwerte vor den Erweiterungen (gemessen auf master)
  const REF = { lavafelsen_koenig: { meshes: 11, tris: 16776 }, schubser_prinz: { meshes: 12, tris: 11828 }, bumerang_werfer: { meshes: 7, tris: 8398 }, lavafall: { meshes: 4, tris: 960 } };
  const changed = Object.entries(REF).filter(([n, r]) => std0[n] && (std0[n].meshes !== r.meshes || Math.abs(std0[n].tris - r.tris) > r.tris * 0.03));
  check(`Standard der erweiterten Modelle unverändert${changed.length ? ` (geändert: ${changed.map(([n]) => `${n}=${JSON.stringify(std0[n])}`).join(', ')})` : ''}`, changed.length === 0);

  // Eigenschaften (Maße und Schnittstellen, nach denen Motor/Gegner/Level programmieren)
  const props = await sc(() => {
    const cm = window.__cm; const out = {}; const T = cm.THREE;
    const has = (n) => cm.reg.hasModel(n);
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new T.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2), empty: b.isEmpty() }; m.dispose(); return r; };
    const with_ = (name, opts, fn) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); try { return fn(m); } finally { m.dispose(); } };
    const v3 = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
    const run = (m, st, n = 40) => { for (let k = 0; k < n; k++) m.update(1 / 30, st); };
    if (has('knochenflieger')) { const f = box('knochenflieger', {}, { anim: 'fly', flap: 0.5 }), d = box('knochenflieger', {}, { anim: 'defeated', progress: 1 }); out.flieger = [f.z, f.x, f.minY, f.maxY, d.empty, with_('knochenflieger', {}, (m) => m.root.userData.radius)]; }
    if (has('platschfisch')) { const s = box('platschfisch', {}, 'swim'); out.fisch = [s.x, s.y, s.minY, with_('platschfisch', {}, (m) => { run(m, { anim: 'spit', progress: 0.5 }); return v3(m.mouth()); })]; }
    if (has('lavadrache')) {
      const h = box('lavadrache', {}, 'hidden'), i = box('lavadrache', {}, 'idle'), i9 = box('lavadrache', { segments: 10 }, 'idle');
      const mo = with_('lavadrache', {}, (m) => { run(m, 'idle'); return [v3(m.mouth()), m.root.userData.rise, v3(m.root.userData.head())]; });
      out.drache = [h.maxY, i.maxY, i.minY, i.maxX, i9.maxY, mo];
    }
    if (has('wutkaulquappe')) { const s = box('wutkaulquappe', {}, 'swim'), p = box('wutkaulquappe', {}, { anim: 'puff', progress: 1 }); out.quappe = [s.x, s.y, p.y, with_('wutkaulquappe', {}, (m) => { run(m, { anim: 'puff', progress: 1 }); return m.root.userData.radius; })]; }
    if (has('funkenflaemmchen')) { const i = box('funkenflaemmchen', {}, 'idle'), h = box('funkenflaemmchen', {}, { anim: 'hop', progress: 0.52 }), d = box('funkenflaemmchen', {}, { anim: 'defeated', progress: 1 }); out.flamme = [i.y, i.minY, h.minY, d.empty]; }
    if (has('feuerkugel_blau')) { const f = box('feuerkugel_blau', {}, 'idle'); out.kugel = [f.y, f.minY]; }
    if (has('baron_kampfwagen')) {
      const i = box('baron_kampfwagen', {}, 'idle');
      const api = with_('baron_kampfwagen', {}, (m) => { run(m, { anim: 'throw', progress: 0.3 }); const h = v3(m.hand()); run(m, { anim: 'fire', progress: 0.5 }); return [h, v3(m.muzzle()), m.root.userData.radius]; });
      out.wagen = [i.x, i.y, i.z, i.minY, api];
    }
    if (has('wurfsichel_item')) { const i = box('wurfsichel_item', {}, 'idle'), c = box('wurfsichel_item', {}, { anim: 'collected', progress: 1 }); out.sichel = [i.minY, i.maxY, i.x, c.empty || c.y < 0.05]; }
    if (has('wurfsichel_geschoss')) { const g = box('wurfsichel_geschoss', {}, { spin: 0 }); out.geschoss = [g.x, g.y]; }
    if (has('wurfsichel_kostuem')) { const k = box('wurfsichel_kostuem', { size: 0.5 }, 'idle'); out.kostuem = [k.z, k.minY, k.maxY]; }
    if (has('feuerstab')) { const f = with_('feuerstab', { length: 3 }, (m) => { run(m, { angle: 0 }); const a = v3(m.ballPos(m.balls - 1)); run(m, { angle: Math.PI / 2 }); return [m.balls, a, v3(m.ballPos(m.balls - 1)), m.root.userData.ballRadius]; }); const b = box('feuerstab', { length: 3 }, { angle: 0 }); out.stab = [f, b.maxX, b.minY]; }
    if (has('pfeilplattform')) { const a = box('pfeilplattform', { size: [2, 2], thick: 0.5 }, { rise: 1 }), b = box('pfeilplattform', { size: [2, 2], thick: 0.5 }, { rise: 0 }); out.pfeil = [a.x, a.z, a.maxY, b.maxY]; }
    if (has('zylinder_walze')) { const z = box('zylinder_walze', { length: 5, radius: 1.4 }, { angle: 0 }); out.zylinder = [z.x, z.y, z.z]; }
    if (has('stachelwalze_rot')) { const s = box('stachelwalze_rot', { length: 4, radius: 0.6 }, { angle: 0 }); out.walze = [s.x, s.minY, s.maxY, with_('stachelwalze_rot', { length: 4, radius: 0.6 }, (m) => m.root.userData.reach)]; }
    if (has('pendelstachel')) { const p = box('pendelstachel', { length: 3, size: 1 }, { angle: 0 }); out.pendel = [p.maxY, p.minY, with_('pendelstachel', { length: 3, size: 1 }, (m) => { run(m, { angle: 0.5 }); return v3(m.ball()); })]; }
    if (has('klappstampfer')) { const a = box('klappstampfer', { size: [3, 3], thick: 0.6 }, { fold: 0 }), b = box('klappstampfer', { size: [3, 3], thick: 0.6 }, { fold: 1 }); out.klapp = [a.minX, a.maxX, a.maxY, b.minX, b.maxX, b.maxY]; }
    if (has('lava_fontaene')) { const a = box('lava_fontaene', {}, { height: 0 }), b = box('lava_fontaene', {}, { height: 3 }); out.fontaene = [a.maxY, b.maxY, b.minY]; }
    if (has('gitterboden')) { const g = box('gitterboden', { size: [2, 3], thick: 0.15 }, 'idle'); out.gitter = [g.x, g.z, g.maxY, g.minY]; }
    if (has('zerbrechliche_kiste')) { const k = box('zerbrechliche_kiste', { size: 1 }, 'idle'), b = box('zerbrechliche_kiste', { size: 1 }, { break: 1 }); out.kiste = [k.x, k.y, k.minY, b.empty]; }
    if (has('zugbruecke')) { const d = box('zugbruecke', { length: 6, width: 3 }, { lower: 1 }), u = box('zugbruecke', { length: 6, width: 3 }, { lower: 0 }); out.bruecke = [d.maxX, d.z, d.maxY, u.maxY, u.maxX]; }
    if (has('giftnebel_wand')) { const g = box('giftnebel_wand', { width: 8, height: 4, depth: 2 }, 'idle'); out.nebel = [g.z, g.minY, g.maxY]; }
    if (has('kampfwagen_strasse')) { const f = box('kampfwagen_strasse', { kind: 'fahrbahn', length: 6, width: 6 }, 'idle'), s = box('kampfwagen_strasse', { kind: 'stachelfalle', size: [2, 4] }, { up: 1 }), s0 = box('kampfwagen_strasse', { kind: 'stachelfalle', size: [2, 4] }, { up: 0 }); out.strasse = [f.x, f.z, f.maxY, s.maxY, s0.maxY, s.z]; }
    if (has('basaltsaeule')) { const b = box('basaltsaeule', { height: 3 }, 'idle'); out.basalt = [b.maxY, b.minY]; }
    if (has('festungsturm')) { const t = box('festungsturm', { height: 8, radius: 2.2 }, 'idle'); out.turm = [t.maxY, t.x]; }
    return out;
  });
  console.log('  Eigenschaften:', JSON.stringify(props));
  const P = props;
  if (P.flieger) check('Knochenflieger ≈1,2–1,9 m Spannweite, Ursprung Körpermitte, defeated → weg, userData.radius', P.flieger[0] > 1.2 && P.flieger[0] < 1.92 && P.flieger[2] < -0.15 && P.flieger[3] > 0.2 && P.flieger[4] && P.flieger[5] > 0.3);
  if (P.fisch) check('Platschfisch ≈0,8–1,2 m lang (mit Schwanz), Bauch am Ursprung, mouth() vorn', P.fisch[0] > 0.8 && P.fisch[0] < 1.22 && P.fisch[2] > -0.08 && P.fisch[3][0] > 0.35);
  if (P.drache) check('Lavadrache: hidden unter der Lava (nur Glut), idle ≈3–4 m hoch, mehr Glieder → höher, mouth() vorn oben', P.drache[0] < 0.8 && P.drache[1] > 2.8 && P.drache[1] < 4.2 && P.drache[4] >= P.drache[1] - 0.05 && P.drache[5][0][1] > 2 && P.drache[5][0][0] > 0.8 && P.drache[5][1] > 0.95);
  if (P.quappe) check('Wutkaulquappe ≈0,8–1,2 m lang (size 1,25), puff → Kugel ≥ 0,9 m, Radius wächst', P.quappe[0] > 0.8 && P.quappe[0] < 1.25 && P.quappe[2] > 0.9 && P.quappe[3] > 0.45);
  if (P.flamme) check('Funkenflämmchen ≈0,45–0,7 m (+ Funken), steht auf dem Boden, hop hebt ab, defeated → weg', P.flamme[0] > 0.45 && P.flamme[0] < 0.95 && P.flamme[1] > -0.05 && P.flamme[2] > 0.25 && P.flamme[3]);
  if (P.kugel) check('Blaue Feuerkugel Ø ≈0,36 m (Flammenkranz bis ≈0,6 m), Mitte über dem Ursprung', P.kugel[0] > 0.3 && P.kugel[0] < 0.7 && P.kugel[1] > -0.16);
  if (P.wagen) check('Kampfwagen ≈4,5–6 m lang, Hut ≈3–4 m, auf dem Boden; hand() und muzzle() vorn, userData.radius', P.wagen[0] > 4.5 && P.wagen[0] < 6.2 && P.wagen[1] > 3 && P.wagen[1] < 4.3 && P.wagen[3] > -0.05 && P.wagen[4][1][0] > 2 && P.wagen[4][0][1] > 1.5 && P.wagen[4][2] > 2);
  if (P.sichel) check('Wurfsichel-Item schwebt (Unterkante ≥ 0,08 m, Oberkante ≤ 1,4 m), collected → weg', P.sichel[0] > 0.08 && P.sichel[1] < 1.45 && P.sichel[3]);
  if (P.geschoss) check('Wurfsichel-Geschoss ≈0,45–0,8 m (Hüllquader des gedrehten Wirbels bis ≈1,1 m), flach', P.geschoss[0] > 0.45 && P.geschoss[0] < 1.1 && P.geschoss[1] < 0.35);
  if (P.kostuem) check('Wurfsichel-Mütze ≈ size breit, sitzt um die Kopfmitte', P.kostuem[0] > 0.45 && P.kostuem[0] < 0.75 && P.kostuem[1] > -0.2);
  if (P.stab) check('Feuerstab: 6 Kugeln bei length 3, äußerste bei r ≈ 3 (dreht mit angle), Block steht auf dem Boden', P.stab[0][0] === 6 && Math.abs(Math.hypot(P.stab[0][1][0], P.stab[0][1][2]) - 3) < 0.2 && Math.abs(P.stab[0][2][0]) < 0.2 && P.stab[2] > -0.05);
  if (P.pfeil) check('Pfeilplattform: size × size, Oberseite bei rise 1 auf y ≈ 0, bei rise 0 abgesenkt', Math.abs(P.pfeil[0] - 2) < 0.3 && Math.abs(P.pfeil[1] - 2) < 0.3 && Math.abs(P.pfeil[2]) < 0.2 && P.pfeil[3] < -0.4);
  if (P.zylinder) check('Zylinder: length entlang X, Ø ≈ 2·radius', Math.abs(P.zylinder[0] - 5) < 0.6 && Math.abs(P.zylinder[1] - 2.8) < 0.4);
  if (P.walze) check('Rote Stachelwalze: length entlang X (+ Böcke), Stützen bis zum Boden, userData.reach', Math.abs(P.walze[0] - 4) < 1.1 && P.walze[1] > -0.05 && P.walze[3] > 0.8);
  if (P.pendel) check('Pendelstachel: hängt vom Ursprung nach unten (length + Kugel), ball() folgt dem Winkel', P.pendel[0] < 0.6 && P.pendel[1] < -3.3 && P.pendel[2][1] < -2.5 && Math.abs(P.pendel[2][0]) > 0.8);
  if (P.klapp) check('Klappstampfer: fold 0 liegt bei +X, fold 1 bei −X (Scharnier im Ursprung)', P.klapp[0] > -0.3 && P.klapp[1] > 2.7 && P.klapp[3] < -2.7 && P.klapp[4] < 0.3 && P.klapp[5] < 1.2);
  if (P.fontaene) check('Lava-Fontäne: aus = flach, height 3 → Säule ≈3 m', P.fontaene[0] < 0.8 && P.fontaene[1] > 2.8 && P.fontaene[1] < 3.8 && P.fontaene[2] > -0.1);
  if (P.gitter) check('Gitterboden: size, Oberseite = thick, Ursprung unten', Math.abs(P.gitter[0] - 2) < 0.1 && Math.abs(P.gitter[1] - 3) < 0.1 && Math.abs(P.gitter[2] - 0.15) < 0.05 && P.gitter[3] > -0.02);
  if (P.kiste) check('Zerbrechliche Kiste ≈ size, Ursprung unten, break 1 → weg', Math.abs(P.kiste[0] - 1) < 0.2 && Math.abs(P.kiste[1] - 1) < 0.15 && P.kiste[2] > -0.02 && P.kiste[3]);
  if (P.bruecke) check('Zugbrücke: lower 1 liegt nach +X (length), Breite ≈ width (+ Sockel); lower 0 steht hoch', Math.abs(P.bruecke[0] - 6) < 0.5 && P.bruecke[1] > 2.8 && P.bruecke[1] < 4.8 && P.bruecke[3] > 5.5 && P.bruecke[4] < 1.2);
  if (P.nebel) check('Giftnebel-Wand: ≈ width entlang Z, Front unten bei y ≈ 0, reicht ≈ height hoch (Hüllquader weicher Nebelkarten)', P.nebel[0] > 7 && P.nebel[0] < 9.6 && P.nebel[1] > -1.5 && P.nebel[2] > 3.4 && P.nebel[2] < 5.5);
  if (P.strasse) check('Kampfwagen-Straße: Fahrbahn length × width, Oberseite y ≈ 0; Stachelfalle: up 1 Stacheln oben, up 0 versenkt', Math.abs(P.strasse[0] - 6) < 0.6 && Math.abs(P.strasse[1] - 6) < 0.8 && Math.abs(P.strasse[2]) < 0.25 && P.strasse[3] > 0.4 && P.strasse[4] < 0.2);
  if (P.basalt) check('Basaltsäule ≈ height hoch, steht auf dem Boden', P.basalt[0] > 2.6 && P.basalt[0] < 3.8 && P.basalt[1] > -0.1);
  if (P.turm) check('Festungsturm ≈ height (+ Dach mit Mast), Ø ≈ 2·radius', P.turm[0] > 8 && P.turm[0] < 15 && P.turm[1] > 4 && P.turm[1] < 6.5);

  // Instanz-Helfer
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'gelee_brocken', 'bergkiefer', 'kuerbis']) {
      try {
        const I = cm.inst.createInstanced(kind, 200);
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'lavablase' ? (i % 3 ? 'idle' : { anim: 'jump', progress: (i % 10) / 10 }) : kind === 'zerbrechliche_kiste' ? (i % 5 ? 'idle' : { break: 0.4 }) : 'idle');
        for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, st(i));
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
  }, INST_W7);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST_W7.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST_W7.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
  const heavyI = INST_W7.filter((k) => instInfo[k] && instInfo[k].tris / 200 > 1500);
  check(`Instanzen sparsam (≤ 1,5 k Dreiecke je Stück)${heavyI.length ? ` (zu viel: ${heavyI.map((k) => `${k}=${Math.round(instInfo[k].tris / 200)}`).join(', ')})` : ''}`, heavyI.length === 0);
  check('Instanz-Helfer: alte Arten unverändert (coin, gelee_brocken, bergkiefer, kuerbis)', ['coin', 'gelee_brocken', 'bergkiefer', 'kuerbis'].every((k) => instInfo[k] && !instInfo[k].error));
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
  await gallery('enemies', ENEMIES, 0.2, 0.6, 5);
  await gallery('variants', VARIANTS, 0.2, 0.7, 4);
  await gallery('bosses', BOSSES, 0.2, 0.8, 3);
  await gallery('items', ITEMS, 0.25, 0.5, 4);
  await gallery('gimmicks', GIMMICKS, 0.3, 0.7, 5);
  await gallery('kulisse1', KULISSE1, 0.2, 0.8, 5);
  await gallery('kulisse2', KULISSE2, 0.2, 0.8, 6);
  await gallery('kulisse3', KULISSE3, 0.2, 0.6, 5);
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cm7_st_<name>.png)
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
  // Nahaufnahmen (Porträts) der Hauptfiguren: [name, opts, state, Zielhöhe, Abstand, yaw?, y?]
  const PORTRAITS = [
    ['knochenflieger', {}, { anim: 'fly', flap: 0.7 }, 1.15, 2.6], ['platschfisch', {}, 'swim', 0.35, 2.0], ['lavadrache', {}, 'idle', 2.5, 4.6],
    ['wutkaulquappe', {}, 'charge', 0.55, 1.5], ['wutkaulquappe', {}, { anim: 'puff', progress: 1 }, 0.55, 1.8], ['funkenflaemmchen', {}, 'idle', 0.3, 1.4],
    ['baron_kampfwagen', {}, 'idle', 2.4, 6.5], ['baron_kampfwagen', {}, { anim: 'fire', progress: 0.55 }, 1.6, 8, Math.PI / 2 + 0.5], ['wurfsichel_item', {}, 'idle', 0.6, 1.7],
    ['lavafelsen_koenig', { variant: 'hell' }, 'idle', 1.6, 6.2], ['schubser_prinz', { color: 'blau' }, 'idle', 1.2, 5.5], ['bumerang_werfer', { sichel: true }, 'idle', 0.75, 2.6],
    ['feuerstab', { length: 2.5 }, { angle: 0.8 }, 0.6, 6], ['klappstampfer', {}, { fold: 0.25, warn: true }, 0.9, 9, Math.PI], ['wurfsichel_kostuem', { size: 0.5 }, 'idle', 0.45, 2.2],
    ['zugbruecke', { length: 6 }, { lower: 0.55 }, 2.4, 14, Math.PI * 0.75], ['pfeilplattform', {}, { rise: 1 }, 0.3, 6], ['lava_fontaene', {}, { height: 3 }, 1.6, 8],
    ['baron_kampfwagen', {}, { anim: 'drive', hp: 2 }, 1.8, 10, Math.PI / 2 + 1.0], ['baron_kampfwagen', {}, { anim: 'defeated', hp: 0 }, 1.8, 10, -0.6], ['baron_kampfwagen', {}, { anim: 'hit', progress: 0.3 }, 2.4, 9],
    ['knochenflieger', {}, { anim: 'fly', flap: 0.3 }, 1.15, 3.2, -0.5], ['platschfisch', {}, { anim: 'spit', progress: 0.55 }, 0.35, 2.6, -0.4], ['lavadrache', {}, { anim: 'spit', progress: 0.5 }, 2.6, 6, -0.3],
    ['wutkaulquappe', {}, 'swim', 0.6, 2.2, -0.5], ['funkenflaemmchen', { color: 'blau' }, 'idle', 0.3, 1.5, -0.8], ['wurfsichel_geschoss', {}, 'spin', 0.5, 1.6, -0.3],
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
        cam.position.set(c.x + p.d * 0.35, p.y + p.d * 0.22, c.z + p.d);
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
    await page.screenshot({ path: `${OUT}cm7_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const LINEUPS = [ENEMIES, [BOSSES[0], VARIANTS[0], VARIANTS[1], VARIANTS[3]], [ITEMS[0], ITEMS[2], GIMMICKS[0], GIMMICKS[4], GIMMICKS[9], GIMMICKS[13]],
    [KULISSE1[0], KULISSE1[3], KULISSE2[0], KULISSE2[1], KULISSE2[4], KULISSE3[0], KULISSE3[2]]];
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

  // Kurs-Sicht: Kamera 13 m, Neigung 45°, FOV 45° – Gegner, Gimmicks und Kulisse nebeneinander
  const COURSE_FIG = [ENEMIES[0], ENEMIES[1], ENEMIES[3], ENEMIES[4], VARIANTS[3], ITEMS[0], GIMMICKS[0], GIMMICKS[2], GIMMICKS[13], GIMMICKS[10], ['stachelpanzer', {}, 'walk'], ['feuer_werfer', {}, 'idle']];
  const COURSE_DECO = [['basaltsaeule', { height: 4 }, 'idle', -9.5, -7, 0], ['vulkanfels', { kind: 'spitze', size: 3 }, 'idle', 9, -8, -2.2], ['fackel', {}, 'idle', 8.5, -1, -2.4],
    ['brummbaer_fahne', {}, { wind: 0.6 }, -8, -1.5, 0.6], ['festungsturm', { height: 7 }, 'idle', 0, -14, 0], ['lavadrache', {}, 'idle', 6, -9, -0.6], ['pendelstachel', { length: 2.5 }, { angle: 0.4 }, -4, -9, 0]];
  if (want('course')) {
    await sc(([list, deco]) => {
      const cm = window.__cm; cm.clear(); cm.mood('lava');
      deco.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw]) => cm.put(n, o, s, x, z, yaw, 24, null));
      const ok = list.filter(([n]) => cm.reg.hasModel(n));
      ok.forEach(([n, o, s], i) => {
        const col = i % 6, row = Math.floor(i / 6);
        cm.put(n, o, s, (col - 2.5) * 2.6, 0.4 - row * 3.4, i % 2 ? -Math.PI / 2 : Math.atan2(-0.3, 1), 24, n.replace(/_.*/, ''));
      });
      cm.lavaPool(6, -9, 6, 4, 'rot', 0.01);
      cm.cam([0, 0.4, -3.2], 45 * Math.PI / 180, 13, 45);
    }, [COURSE_FIG.map(([n, o, s]) => [n, o, s]), COURSE_DECO]);
    if (ONLY && !ONLY.includes('course')) ONLY.push('course');
    await shot('course');
    await sc(() => window.__cm.mood('tag'));
  }

  // Themen-Szenen (Kurs-Kamera 45°/13 m): [Stimmung, Lava-Flächen, Modelle [name, opts, state, x, z, yaw, y?]]
  const SCENES = {
    scene_festung: ['lava', [[0, -4, 30, 14, 'blau']], [['festungsturm', { height: 9 }, 'idle', -7, -10, 0, 0], ['basaltsaeule', { height: 4, glow: 'blau' }, 'idle', 8, -9, 0, 0], ['pfeilplattform', { color: 'blau' }, { rise: 1 }, -2, -3, 0, 0.5],
      ['pfeilplattform', { color: 'blau' }, { rise: 0.45 }, 2, -6, Math.PI / 2, 0.5], ['feuerstab', { length: 3, color: 'blau' }, { angle: 0.7 }, 3, 0, 0, 0], ['knochenflieger', {}, 'fly', -3, -1, -0.4, 2.4], ['gitterboden', { size: [4, 2] }, 'idle', -5, 3, 0, 0],
      ['zylinder_walze', { length: 6, radius: 1.3 }, { angle: 0.4 }, 6, 3.5, Math.PI / 2, 1.4], ['brummbaer_fahne', {}, { wind: 0.8 }, -9, -2, 0, 0], ['fackel', { color: 'blau' }, 'idle', 9, 1, 0, 0]]],
    scene_vulkan: ['lava', [[0, -3, 30, 16, 'rot']], [['vulkanfels', { kind: 'vulkan', size: 8 }, 'idle', 0, -14, 0, 0], ['lava_fontaene', {}, { height: 3.5 }, -4, -4, 0, 0], ['lava_fontaene', {}, { height: 0, warn: true }, 0, -5, 0, 0],
      ['platschfisch', {}, { anim: 'jump', progress: 0.4 }, 4, -2, Math.PI, 1.6], ['lavadrache', {}, 'idle', 7, -7, -2.6, 0], ['lavablase', {}, { anim: 'swell', grow: 0.7 }, -2, 1, 0, 0], ['gitterboden', { size: [4, 4] }, 'idle', -8, 2, 0, 0.4],
      ['vulkanfels', { kind: 'brocken', size: 2.5 }, 'idle', -10, -6, 0, 0], ['vulkanfels', { kind: 'spitze', size: 3 }, 'idle', 10, -2, 0, 0], ['lavablase', {}, { anim: 'jump', progress: 0.45 }, 1.5, 3, 0, 1.2]]],
    scene_riff: ['riff', [], [['riffkoralle', { kind: 'roehre' }, 'idle', -6, -6, 0, 0], ['riffkoralle', { kind: 'geweih' }, 'idle', 6, -7, 0, 0], ['riffkoralle', { kind: 'anemone' }, 'idle', -2, -3, 0, 0], ['lavagestein', { size: 2.5, vent: true }, 'idle', 3, -5, 0, 0],
      ['lavagestein', { size: 1.6, seed: 3 }, 'idle', -8, 1, 0, 0], ['wutkaulquappe', {}, 'charge', 1, 0, Math.PI / 2, 1], ['wutkaulquappe', {}, { anim: 'puff', progress: 1 }, -3, 2, 0, 1.2], ['zerbrechliche_kiste', {}, 'idle', 5, 1, 0.3, 0],
      ['zerbrechliche_kiste', {}, { break: 0.35 }, 7, 2, 0, 0], ['rammfisch', {}, 'swim', -6, -1, 0.3, 1.5], ['koralle', { kind: 'faecher' }, 'idle', 9, -3, 0, 0]]],
    scene_burg: ['lava', [[0, 6, 30, 6, 'rot']], [['festungsturm', { height: 10 }, 'idle', -9, -11, 0, 0], ['festungsturm', { height: 8 }, 'idle', 9, -11, 0, 0], ['zugbruecke', { length: 6 }, { lower: 0.6 }, -2, -5, 0, 0.3], ['klappstampfer', {}, { fold: 0.3 }, 3, -2, 0, 0],
      ['bumerang_werfer', { sichel: true }, 'idle', -5, 0, 0.3, 0], ['wurfsichel_item', {}, 'idle', -3, 2, 0, 0], ['lava_maschine', {}, { speed: 1 }, 7, 4, -Math.PI / 2, 0], ['lavablase', {}, 'idle', 0, 6, 0, 0], ['brummbaer_fahne', {}, { wind: 0.7 }, 5, -7, 0, 0],
      ['fackel', {}, 'idle', -7, -3, 0, 0], ['giftnebel_wand', { width: 10, height: 3, depth: 2, facing: 'vorn' }, 'idle', -10, -1, 0, 0]]],
    scene_boss: ['lava', [[0, -4, 30, 4, 'rot']], [['kampfwagen_strasse', { kind: 'fahrbahn', length: 12, width: 9, thick: 1.3 }, 'idle', 0, -12, Math.PI / 2, 1.3],
      ['kampfwagen_strasse', { kind: 'luecke', width: 3, length: 9 }, 'idle', 0, -4.5, Math.PI / 2, 1.3], ['kampfwagen_strasse', { kind: 'fahrbahn', length: 8, width: 9, thick: 1.3 }, 'idle', 0, 2.5, Math.PI / 2, 1.3],
      ['baron_kampfwagen', {}, { anim: 'throw', progress: 0.35 }, 0, -11, -Math.PI / 2, 1.3], ['kampfwagen_strasse', { kind: 'stachelfalle', size: [2, 3] }, { up: 1 }, -2.5, 2, Math.PI / 2, 1.31],
      ['kampfwagen_strasse', { kind: 'stachelfalle', size: [2, 3] }, { up: 0, warn: true }, 2.5, 2, Math.PI / 2, 1.31], ['kickbombe', {}, 'lit', 1, -0.5, Math.PI / 2, 1.3], ['basaltsaeule', { height: 4 }, 'idle', -8, -8, 0, 0],
      ['vulkanfels', { kind: 'spitze', size: 4 }, 'idle', 8, -9, 0, 0]]],
  };
  for (const [nm, [mood, pools, list]] of Object.entries(SCENES)) {
    if (!want(nm) && !want('scenes')) continue;
    await sc(([list, mood, pools]) => {
      const cm = window.__cm; cm.clear(); cm.mood(mood);
      for (const [x, z, w, d, c] of pools) cm.lavaPool(x, z, w, d, c, 0.01);
      list.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw, y]) => { const m = cm.put(n, o, s, x, z, yaw, 24, null); if (y !== undefined) m.root.position.y = y; });
      cm.cam([0, 0.6, -2.5], 45 * Math.PI / 180, 13, 45);
    }, [list, mood, pools]);
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await shot(nm);
    await sc(() => window.__cm.mood('tag'));
  }

  // Instanz-Feld: Gitterboden, Basaltsäulen, Lavablasen, Kisten (Kurs-Kamera)
  if (want('instanced')) {
    await sc(() => {
      const cm = window.__cm; cm.clear(); cm.mood('lava');
      const T = cm.THREE, p = new T.Vector3();
      const sets = [];
      const mk = (k, n, o) => { try { const I = cm.inst.createInstanced(k, n, o); cm.stage.add(I.root); sets.push(I); return I; } catch (e) { console.log(e.message); return null; } };
      cm.lavaPool(0, 0, 30, 20, 'rot', 0.005);
      const gb = mk('gitterboden', 24, {}), bs = mk('basaltsaeule', 10, {}), lb = mk('lavablase', 10, { color: 'rot' }), lb2 = mk('lavablase', 6, { color: 'blau' }), kk = mk('zerbrechliche_kiste', 6, {});
      if (gb) for (let i = 0; i < 24; i++) gb.setAt(i, p.set(-6 + (i % 6), 0.1, -1 + Math.floor(i / 6)), 0, 1, 'idle');
      if (bs) for (let i = 0; i < 10; i++) bs.setAt(i, p.set(-12 + i * 2.6, 0, -9 - (i % 2) * 1.5), i, [1, 0.7 + (i % 3) * 0.3, 1], 'idle');
      if (lb) for (let i = 0; i < 10; i++) lb.setAt(i, p.set(2 + (i % 5) * 1.6, 0, 1 + Math.floor(i / 5) * 2), 0, 1, i % 2 ? 'idle' : { anim: 'jump', progress: 0.2 + i * 0.06 });
      if (lb2) for (let i = 0; i < 6; i++) lb2.setAt(i, p.set(-10 + i * 1.4, 0, 3), 0, 0.8, { anim: 'swell', grow: i / 5 });
      if (kk) for (let i = 0; i < 6; i++) kk.setAt(i, p.set(4 + (i % 3) * 1.1, 0.1 + Math.floor(i / 3) * 1, -4), 0.2, 1, i === 5 ? { break: 0.4 } : 'idle');
      for (let k = 0; k < 6; k++) for (const s of sets) s.update(1 / 30);
      cm.live.push({ root: new T.Group(), dispose() { for (const s of sets) s.dispose(); } });
      cm.cam([-1, 0.8, -2], 45 * Math.PI / 180, 13, 45);
    });
    if (ONLY && !ONLY.includes('instanced')) ONLY.push('instanced');
    await shot('instanced');
    await sc(() => window.__cm.mood('tag'));
  }
}

await sc(() => window.__cm.clear());
check('keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const e of errors.slice(0, 10)) console.log('   Konsole:', e);
await browser.close();
await stop();
process.exit(summary(errors) ? 0 : 1);
