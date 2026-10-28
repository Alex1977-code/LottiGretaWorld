// Galerie und Prüfung der Welt-8-Modelle „Brummbär-Rummelplatz“ (src/course/models/kinds/*_w8.js, Instanzen aus
// lib/instanced_w8.js) und der additiven Varianten (rosa Schlangenkönig; goldene Würfelblase und Schattenläuferin geprüft).
//
// Wie tests/course_models_w7.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die Spielschleife an,
// räumt die Szene frei und stellt die Modelle auf einem hellen 1-m-Schachbrett auf.
// Bilder tests/out/cm8_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel, Heldin
// auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°), Themen-Szenen (Rummelplatz, Finale auf der Turmspitze,
// Regenfestung, Dünen, Keks-Fabrik, Unterwasser-Festung, Nacht-Festung, Lava-Inferno, Spukhaus, Abspann) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen, ≤ 12 Meshes,
// Dreiecke (Gegner 3–10 k, Boss ≤ 25 k, Gimmicks/Items ≤ 16 k, Kulisse ≤ 12 k), dispose() ohne Fehler (root hängt danach
// nicht mehr), kein Geometrie-/Textur-Leck bei Bau/Abbau, Kulisse ohne Spielzeug-Look, Figuren mit, Maße und Schnittstellen,
// Standard der erweiterten Modelle unverändert, Instanz-Helfer, keine Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_w8.mjs   (kein Build nötig; Port 4397 + PORT_BASE; CM_ONLY=a,b nur bestimmte
//         Bilder, CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil, für kurze Läufe;
//         CM_GROUPS=enemies,kulisse1 … → nur diese Galerie-Gruppen)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4397 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);
const GROUPS_ONLY = process.env.CM_GROUPS ? process.env.CM_GROUPS.split(',') : null;
const groupOn = (g) => !GROUPS_ONLY || GROUPS_ONLY.includes(g);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const BOSSES = [
  ['baron_krallen', {}, 'idle', ['idle', 'walk', { anim: 'walk', speed: 3 }, 'climb', { anim: 'climb', speed: 0 }, 'slide', { anim: 'swipe', progress: 0.2 }, { anim: 'swipe', progress: 0.45 },
    { anim: 'swipe', progress: 0.65 }, { anim: 'fire', progress: 0.3 }, { anim: 'fire', progress: 0.55 }, { anim: 'hit', progress: 0.3 }, 'stunned', 'fall', 'clone', { anim: 'idle', hp: 2 }, { anim: 'idle', hp: 1 }, 'defeated']],
  ['baron_krallen', { clone: true }, 'idle', ['idle', 'walk', 'climb', { anim: 'swipe', progress: 0.45 }, 'clone', 'fall']],
  ['super_pow_block', {}, 'idle', ['idle', { hits: 1 }, { hits: 2 }, { hits: 3 }, { hits: 4 }, { squash: 1 }, { anim: 'hit', progress: 0.25 }, { anim: 'hit', progress: 0.6, hits: 2 }]],
  ['freunde_glas', {}, 'idle', ['idle', { shake: 1 }, 'cheer', { break: 0.15 }, { break: 0.5 }, { break: 1, cheer: true }, { anim: 'idle', break: 1 }]],
];
const VARIANTS = [
  ['wuerfelblase', { color: 'gold' }, 'idle', ['idle', { anim: 'hop', progress: 0.3 }, { anim: 'hop', progress: 0.7 }, { anim: 'hit', progress: 0.3 }, 'flee', { anim: 'defeated', progress: 0.5 }]],
  ['schlangenkoenig', { color: 'rosa' }, 'idle', ['idle', { anim: 'rise', progress: 0.5 }, { anim: 'strike', progress: 0.55 }, 'summon', { anim: 'hit', progress: 0.2 }, 'defeated']],
  ['schattenlaeuferin', {}, 'idle', ['idle', 'run', { anim: 'throw', progress: 0.5 }, 'clone']],
];
const ENEMIES = [
  ['sandflosser', {}, { anim: 'jump', progress: 0.45 }, ['swim', { anim: 'jump', progress: 0.1 }, { anim: 'jump', progress: 0.45 }, { anim: 'jump', progress: 0.85 }, { anim: 'defeated', progress: 0.4 }, { anim: 'defeated', progress: 1 }]],
  ['knochenflieger_gruppe', { count: 5 }, 'fly', ['fly', 'dive', { anim: 'scatter', progress: 0.5 }, { anim: 'assemble', progress: 0.3 }, { anim: 'assemble', progress: 0.8 }, { anim: 'fly', alive: [1, 0, 1, 1, 0] }]],
  ['kristall_felsklotz', {}, 'idle', ['idle', 'roll', { anim: 'roll', roll: 1.2 }, 'fast', { anim: 'idle', roll: 0.6 }]],
  ['kristall_felsklotz', { shape: 'wuerfel' }, 'idle', ['idle', { anim: 'roll', roll: 0.5 }, 'fast']],
  ['baron_sandstatue', {}, 'idle', ['idle', { break: 0.3 }, { break: 0.7 }, { break: 1 }]],
];
const GIMMICKS = [
  ['leuchtsteg', {}, { glow: 1 }, [{ glow: 0 }, { glow: 0.4 }, { glow: 1 }, { glow: 1, flash: 1 }]],
  ['leuchtsteg', { size: [4, 2] }, { glow: 0.7 }, [{ glow: 0.7 }]],
  ['keksrad', {}, { angle: 0.4 }, [{ angle: 0 }, { angle: 1 }]],
  ['keksrad', { size: 3, axis: 'z', color: 'schoko' }, { angle: 0.3 }, [{ angle: 0.3 }]],
  ['keks_zahnrad', {}, { angle: 0.2 }, [{ angle: 0 }, { angle: 0.8 }]],
  ['keks_zahnrad', { radius: 2.5, axis: 'x' }, { angle: 0.2 }, [{ angle: 0.2 }]],
  ['riesenrad', { radius: 6, count: 6 }, { angle: 0.3 }, [{ angle: 0 }, { angle: 1.1 }]],
  ['wasserkoerper', {}, 'idle', ['idle', { wobble: 1 }]],
  ['steigbecken', {}, { level: 0.6 }, [{ level: 0 }, { level: 0.5 }, { level: 1 }]],
  ['stachelblock_blau', {}, { out: 1 }, [{ out: 0 }, { out: 0, warn: true }, { out: 1 }]],
  ['stachelblock_rot', { size: [1, 3, 1] }, { out: 1 }, [{ out: 0.5 }, { out: 1 }]],
  ['schubfeld', {}, 'idle', ['idle', { on: false }]],
  ['lavabrocken_regen', {}, 'fall', ['fall', { anim: 'land', progress: 0.3 }, { anim: 'land', progress: 0.9 }, 'glow']],
  ['lavapfuetze', {}, 'idle', ['idle', { anim: 'grow', progress: 0.4 }, { anim: 'cool', progress: 0.6 }]],
  ['schockwelle', {}, { progress: 0.4 }, [{ progress: 0.1 }, { progress: 0.5 }, { progress: 0.95 }]],
];
const KULISSE1 = [
  ['baron_turm', {}, 'idle', ['idle']],
  ['baron_turm', { part: 'spitze' }, 'idle', ['idle']],
  ['karussell', {}, { angle: 0.4 }, [{ angle: 0 }, { speed: 1 }]],
  ['riesenrad_kulisse', {}, { angle: 0.3 }, [{ angle: 0 }, { speed: 0.2 }]],
  ['achterbahn', {}, 'idle', ['idle']],
  ['achterbahn', { kind: 'looping' }, 'idle', ['idle']],
  ['achterbahn', { kind: 'wagen' }, 'idle', ['idle']],
];
const KULISSE2 = [
  ['rummel_bude', {}, 'idle', ['idle']],
  ['rummel_bude', { color: 'gruen', seed: 2 }, 'idle', ['idle']],
  ['wimpelkette', { length: 6 }, { wind: 0.5 }, [{ wind: 0 }, { wind: 1 }]],
  ['gluehbirnenkette', { length: 6 }, 'idle', ['idle', { on: false }]],
  ['brummbaer_ballon', {}, 'idle', ['idle', { wind: 1 }]],
  ['brummbaer_ballon', { color: 'gelb', count: 3 }, 'idle', ['idle']],
];
const KULISSE3 = [
  ['regenfestung', {}, 'idle', ['idle']],
  ['regenfestung', { kind: 'turm' }, 'idle', ['idle']],
  ['regenfestung', { kind: 'pfuetze' }, 'idle', ['idle', { rain: 1 }]],
  ['regenfestung', { kind: 'fahne' }, { wind: 0.7 }, [{ wind: 0.7 }]],
  ['keksfabrik', {}, { speed: 1 }, [{ speed: 0 }, { speed: 1 }]],
  ['keksfabrik', { kind: 'keksturm' }, 'idle', ['idle']],
  ['keksfabrik', { kind: 'zuckerguss' }, 'idle', ['idle']],
];
const KULISSE4 = [
  ['wasserfestung', {}, 'idle', ['idle', { sway: 1 }]],
  ['wasserfestung', { kind: 'gitter' }, 'idle', ['idle']],
  ['wasserfestung', { kind: 'saeule' }, 'idle', ['idle']],
  ['spukspiegel', {}, 'idle', ['idle', { star: true }]],
  ['duene', {}, 'idle', ['idle']],
  ['autowrack', {}, 'idle', ['idle', { smoke: false }]],
];
const SZENE = [
  ['abspann_buehne', {}, 'idle', ['idle', { wave: 1 }, { wave: 0.5 }]],
];
const ALL = [...BOSSES, ...VARIANTS, ...ENEMIES, ...GIMMICKS, ...KULISSE1, ...KULISSE2, ...KULISSE3, ...KULISSE4, ...SZENE];
const ENEMY_NAMES = new Set(['sandflosser', 'knochenflieger_gruppe', 'kristall_felsklotz', 'baron_sandstatue']);
const BOSS_NAMES = new Set(['baron_krallen', 'schlangenkoenig', 'wuerfelblase', 'schattenlaeuferin']);
const KULISSE_NAMES = new Set([...KULISSE1, ...KULISSE2, ...KULISSE3, ...KULISSE4].map(([n]) => n));
const INST_W8 = ['leuchtsteg', 'knochenflieger', 'brummbaer_ballon'];
const W8_NEW = [...new Set([...BOSSES, ...ENEMIES, ...GIMMICKS, ...KULISSE1, ...KULISSE2, ...KULISSE3, ...KULISSE4, ...SZENE].map(([n]) => n))];
const REUSED = ['wuerfelblase', 'schlangenkoenig', 'schattenlaeuferin', 'schatten_bumerang', 'knochenflieger', 'riesenschnappblume', 'ameisensoldat_horn', 'hackvogel',
  'spuk', 'kreisgeist', 'stampfstein', 'projektilkopf', 'suchkopf', 'stachelwalze', 'lavabrocken', 'landemarke', 'sandskulptur_pilzling', 'wutkaulquappe', 'pilzling_mini',
  'schubser', 'krallen_pilzling', 'feuer_werfer', 'hammer_werfer', 'bunny_small', 'kruemel', 'fairy_spotter', 'brummbaer_fahne', 'kickbombe', 'baron_brummbaer', 'seilbahn_gondel',
  'glass_pipe_segment', 'helm_licht', 'powerup_spiegel', 'powerup_krallen', 'zahnrad', 'goal_pole'];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm8`, logLevel: 'warn', clearScreen: false,
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
    knochenflieger_gruppe: () => 2.2, lavabrocken_regen: () => 0.8, keksrad: (o) => ((o.axis ?? 'y') === 'y' ? (o.thick ?? 0.5) / 2 + 0.05 : (o.size ?? 4) / 2 + 0.05),
    keks_zahnrad: (o) => ((o.axis ?? 'y') === 'y' ? (o.thick ?? 0.6) / 2 + 0.05 : (o.radius ?? 2) + 0.45), riesenrad: (o) => (o.radius ?? 8) + 2.6,
    wimpelkette: () => 2.6, gluehbirnenkette: () => 2.6,
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
        if (!o.isMesh || !o.visible || o.userData.fx) return;   // Effekt-Puffs (Rauch, Funken) zählen nicht zum Körper
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
    /** Stimmung: 'tag' | 'lava' | 'riff'/'wasser' (Unterwasser) | 'rummel' (Abend, violett) | 'nacht' | 'regen' | 'wueste' | 'keks' | 'abend'. */
    mood(kind = 'tag') {
      const set = (hemi, ground, hi, sun, si, bg, gr) => { L.hemi.color.setHex(hemi); L.hemi.groundColor.setHex(ground); L.hemi.intensity = hi; L.sun.color.setHex(sun); L.sun.intensity = si; scene.background = new THREE.Color(bg); ground_.material.color.setHex(gr); };
      const ground_ = ground;
      if (kind === 'lava') set(0xffb8a0, 0x3a1a1a, 0.95, 0xffd8b8, 1.35, 0x3a1a2a, 0x6a5a62);
      else if (kind === 'riff' || kind === 'wasser') set(0xa8e8ff, 0x1a3a4a, 1.0, 0xd8f8ff, 1.3, 0x1a6a8a, 0xb8c8c8);
      else if (kind === 'rummel') set(0xffc8e8, 0x3a2a4a, 1.0, 0xffe0c0, 1.4, 0x5a3a8a, 0xb8a8c0);
      else if (kind === 'nacht') set(0x8aa0ff, 0x1a1a3a, 0.75, 0xc8d0ff, 0.9, 0x141a3a, 0x4a4a62);
      else if (kind === 'regen') set(0xb8c8e0, 0x2a3040, 0.95, 0xd8e0f0, 1.0, 0x5a6a82, 0x8a8a9a);
      else if (kind === 'wueste') set(0xfff0d0, 0x8a6a3a, 1.05, 0xfff2d8, 1.5, 0xffc890, 0xf0d8a0);
      else if (kind === 'keks') set(0xffe8f0, 0x6a4a3a, 1.05, 0xfff0e0, 1.45, 0xffc8d8, 0xf8e0c8);
      else if (kind === 'abend') set(0xffd8b8, 0x4a3a5a, 1.0, 0xffc890, 1.4, 0xff9a7a, 0xa8d070);
      else {
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
  await page.screenshot({ path: `${OUT}cm8_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? +x.toFixed(2) : x)).join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);


// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const missing = W8_NEW.filter((n) => !names.includes(n));
  check(`alle ${W8_NEW.length} Welt-8-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
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
  const heavyE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && (t > 10000 || t < 3000));
  check(`Gegner 3–10 k Dreiecke${heavyE.length ? ` (außerhalb: ${heavyE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyE.length === 0);
  const bossT = Object.entries(cycle.tris).filter(([n]) => BOSS_NAMES.has(base(n))).map(([n, t]) => [n, t]);
  check(`Boss/Boss-Varianten ≤ 25 k Dreiecke (${bossT.map(([n, t]) => `${n.replace(/"/g, '')}=${t}`).join(', ')})`, bossT.length > 0 && bossT.every(([, t]) => t > 3000 && t <= 25000));
  const heavyK = Object.entries(cycle.tris).filter(([n, t]) => KULISSE_NAMES.has(base(n)) && t > 12000);
  check(`Kulisse ≤ 12 k Dreiecke (Kartenqualität)${heavyK.length ? ` (zu viel: ${heavyK.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyK.length === 0);
  const heavy = Object.entries(cycle.tris).filter(([n, t]) => !KULISSE_NAMES.has(base(n)) && !BOSS_NAMES.has(base(n)) && !ENEMY_NAMES.has(base(n)) && t > 16000);
  check(`Gimmicks/Szene ≤ 16 k Dreiecke${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);
  const toyBad = Object.entries(cycle.toy).filter(([n, [t]]) => KULISSE_NAMES.has(base(n)) && t > 0);
  check(`Kulisse ohne Spielzeug-Look${toyBad.length ? ` (mit Look: ${toyBad.map(([n]) => n).join(', ')})` : ''}`, toyBad.length === 0);
  const toyMiss = Object.entries(cycle.toy).filter(([n, [t]]) => !KULISSE_NAMES.has(base(n)) && t === 0 && !['schockwelle', 'leuchtsteg', 'lavapfuetze'].includes(base(n)));
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
    for (const [n, o, s] of [['schlangenkoenig', {}, { anim: 'idle', turn: 0 }], ['schlangenkoenig', { color: 'rosa' }, { anim: 'idle', turn: 0 }], ['wuerfelblase', {}, 'idle'], ['wuerfelblase', { color: 'gold' }, 'idle']]) out[`${n}${Object.keys(o).length ? JSON.stringify(o) : ''}`] = info(n, o, s);
    return out;
  });
  console.log('  Standard vs. Variante:', JSON.stringify(std0));
  const same = (a, b) => a && b && a.meshes === b.meshes && Math.abs(a.h - b.h) < 0.6;
  check('Varianten: gleicher Aufbau wie der Standard (Meshes, Höhe)', same(std0.schlangenkoenig, std0['schlangenkoenig{"color":"rosa"}']) && same(std0.wuerfelblase, std0['wuerfelblase{"color":"gold"}']));
  // Standard unverändert: Referenzwerte vor den Erweiterungen (gemessen auf master)
  const REF = { schlangenkoenig: { meshes: 9, tris: 0 } };
  const ref = std0.schlangenkoenig;
  console.log('  Referenz Schlangenkönig (Standard):', JSON.stringify(ref), '(master: siehe REF_SK)');
  const REF_SK = { meshes: Number(process.env.REF_SK_MESHES ?? 0), tris: Number(process.env.REF_SK_TRIS ?? 0) };
  if (REF_SK.meshes) check(`Standard des Schlangenkönigs unverändert (${JSON.stringify(REF_SK)})`, ref.meshes === REF_SK.meshes && Math.abs(ref.tris - REF_SK.tris) < 2);
  void REF;

  // Eigenschaften (Maße und Schnittstellen, nach denen Motor/Gegner/Level programmieren)
  const props = await sc(() => {
    const cm = window.__cm; const out = {}; const T = cm.THREE;
    const has = (n) => cm.reg.hasModel(n);
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new T.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2), empty: b.isEmpty() }; m.dispose(); return r; };
    const with_ = (name, opts, fn) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); try { return fn(m); } finally { m.dispose(); } };
    const v3 = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
    const run = (m, st, n = 40) => { for (let k = 0; k < n; k++) m.update(1 / 30, st); };
    if (has('baron_krallen')) {
      const i = box('baron_krallen', {}, 'idle'), c = box('baron_krallen', {}, 'climb'), d = box('baron_krallen', {}, 'defeated');
      const api = with_('baron_krallen', {}, (m) => { run(m, { anim: 'swipe', progress: 0.42 }); const h = v3(m.hand()); run(m, { anim: 'fire', progress: 0.5 }); return [h, v3(m.mouth()), m.root.userData.radius, m.root.userData.top, m.root.userData.wallX]; });
      const cl = with_('baron_krallen', { clone: true }, (m) => { run(m, 'idle'); let tr = 0; m.root.traverse((o) => { if (o.isMesh && o.material && o.material.transparent && !o.material.blending) tr++; if (o.isMesh && o.material?.transparent && o.material.opacity < 0.9) tr++; }); return tr; });
      out.baron = [i.y, i.minY, i.x, i.z, c.maxX, d.maxY, api, cl];
    }
    if (has('super_pow_block')) {
      const a = box('super_pow_block', {}, { hits: 0 }), b = box('super_pow_block', {}, { hits: 4 });
      const top = with_('super_pow_block', {}, (m) => { run(m, { hits: 2 }, 90); return [m.root.userData.top, m.topAt(0), m.topAt(4)]; });
      out.pow = [a.x, a.y, a.minY, b.y, top];
    }
    if (has('freunde_glas')) {
      const g = box('freunde_glas', {}, 'idle'), br = box('freunde_glas', {}, { break: 1 });
      const fr = with_('freunde_glas', {}, (m) => { run(m, 'idle'); return [m.root.userData.friends.length, v3(m.friend(0))]; });
      out.glas = [g.y, g.x, g.minY, br.maxY, fr];
    }
    if (has('sandflosser')) { const j = box('sandflosser', {}, { anim: 'jump', progress: 0.5 }), s = box('sandflosser', {}, 'swim'), d = box('sandflosser', {}, { anim: 'defeated', progress: 1 }); out.flosser = [j.x, j.minY, s.maxY, d.empty || d.maxY < 0.1]; }
    if (has('knochenflieger_gruppe')) { const f = box('knochenflieger_gruppe', { count: 5, radius: 1.6 }, 'fly'), s = box('knochenflieger_gruppe', { count: 5, radius: 1.6 }, { anim: 'scatter', progress: 1 }); out.gruppe = [f.x, f.z, f.y, s.empty || s.y < 0.5]; }
    if (has('kristall_felsklotz')) { const k = box('kristall_felsklotz', { size: 3 }, 'idle'), w = box('kristall_felsklotz', { size: 3, shape: 'wuerfel' }, { anim: 'idle', roll: 0 }); out.klotz = [k.y, k.minY, k.x, w.y, w.minY, with_('kristall_felsklotz', { size: 3 }, (m) => m.root.userData.top)]; }
    if (has('baron_sandstatue')) { const s = box('baron_sandstatue', {}, 'idle'), b = box('baron_sandstatue', {}, { break: 1 }); out.statue = [s.y, s.minY, b.maxY]; }
    if (has('leuchtsteg')) { const l = box('leuchtsteg', { size: [2, 2], thick: 0.3 }, { glow: 1 }), z = box('leuchtsteg', { size: [2, 2] }, { glow: 0 }); out.steg = [l.x, l.z, l.maxY, l.minY, z.empty]; }
    if (has('keksrad')) { const k = box('keksrad', { size: 4, thick: 0.5 }, { angle: 0 }); out.keks = [k.x, k.z, k.maxY]; }
    if (has('keks_zahnrad')) { const k = box('keks_zahnrad', { radius: 2, thick: 0.6 }, { angle: 0 }); out.zahn = [k.x, k.z, k.maxY]; }
    if (has('riesenrad')) {
      const r = box('riesenrad', { radius: 8, count: 8 }, { angle: 0 });
      const pl = with_('riesenrad', { radius: 8, count: 8 }, (m) => { run(m, { angle: 0 }); return [v3(m.platform(0)), v3(m.platform(2))]; });
      out.rad = [r.y, r.minY, r.maxY, pl];
    }
    if (has('wasserkoerper')) { const w = box('wasserkoerper', { size: [3, 2, 3] }, 'idle'); out.wasser = [w.x, w.y, w.minY]; }
    if (has('steigbecken')) { const s = box('steigbecken', { size: [6, 6], height: 3 }, { level: 1 }); out.becken = [s.x, s.maxY, s.minY, with_('steigbecken', { size: [6, 6], height: 3 }, (m) => { run(m, { level: 0.5 }); return m.root.userData.water; })]; }
    if (has('stachelblock_blau')) { const a = box('stachelblock_blau', { size: 1 }, { out: 0 }), b = box('stachelblock_blau', { size: 1 }, { out: 1 }); out.stachel = [a.x, a.y, a.minY, b.x, b.maxY]; }
    if (has('schubfeld')) { const s = box('schubfeld', { size: [3, 2] }, 'idle'); out.schub = [s.x, s.z, s.maxY]; }
    if (has('lavabrocken_regen')) { const f = box('lavabrocken_regen', {}, 'fall'); out.regen = [f.x, f.maxY, f.minY]; }
    if (has('baron_turm')) { const t = box('baron_turm', {}, 'idle'); out.turm = [t.y, t.x]; }
    if (has('riesenrad_kulisse')) { const r = box('riesenrad_kulisse', {}, 'idle'); out.radK = [r.y, r.minY]; }
    if (has('abspann_buehne')) { const a = box('abspann_buehne', {}, 'idle'); out.abspann = [a.x, a.z, a.minY, with_('abspann_buehne', {}, (m) => m.root.userData.friends?.length ?? 0)]; }
    return out;
  });
  console.log('  Eigenschaften:', JSON.stringify(props));
  const P = props;
  if (P.baron) check('Baron im Krallen-Anzug ≈2,9–3,5 m (mit Hut), steht auf dem Boden, ≈1,2–2 m breit; Klettern: Tatzen vorn (≈ wallX); defeated sitzt (niedriger); hand()/mouth() vorn; Doppelgänger durchsichtig',
    P.baron[0] > 2.9 && P.baron[0] < 3.6 && P.baron[1] > -0.06 && P.baron[1] < 0.06 && P.baron[2] > 1.0 && P.baron[2] < 2.2 && P.baron[4] > 0.6 && P.baron[5] < P.baron[0] - 0.3
    && P.baron[6][1][0] > 0.6 && P.baron[6][1][1] > 1.6 && P.baron[6][0][0] > 0.2 && P.baron[6][2] > 0.5 && P.baron[6][3] > 2.9 && P.baron[6][4] > 0.6 && P.baron[7] > 0);
  if (P.pow) check('Super-Wumm-Block: size × size, Ursprung unten, 4 Treffer → niedriger; userData.top/topAt', Math.abs(P.pow[0] - 5) < 0.6 && Math.abs(P.pow[1] - 5) < 0.6 && P.pow[2] > -0.05 && P.pow[3] < 2.6 && Math.abs(P.pow[4][0] - P.pow[4][1] * 0.68) < 0.2 && P.pow[4][1] === 5 && P.pow[4][2] < 2);
  if (P.glas) check('Freunde-Glas ≈2,4 m hoch, Ø ≈2 m, Ursprung unten, 4 Freunde; zerbrochen bleibt nur Kleines (≤ 1 m)', P.glas[0] > 2.2 && P.glas[0] < 2.7 && P.glas[1] > 1.8 && P.glas[1] < 2.4 && P.glas[2] > -0.05 && P.glas[3] < 1.2 && P.glas[4][0] === 4);
  if (P.flosser) check('Sandflosser ≈1,4–2,2 m lang; Sprung über dem Sand; schwimmend nur Flosse über dem Sand; besiegt → weg', P.flosser[0] > 1.3 && P.flosser[0] < 2.3 && P.flosser[2] < 0.7 && P.flosser[3]);
  if (P.gruppe) check('Knochenflieger-Gruppe: Formation ≈ 2·radius + Spannweite; zerstreut → weg', P.gruppe[0] > 3 && P.gruppe[0] < 7 && P.gruppe[3]);
  if (P.klotz) check('Kristall-Felsklotz ≈ size hoch (+ Kristalle), auf dem Boden; Würfel ebenso; userData.top', P.klotz[0] > 2.7 && P.klotz[0] < 4.2 && P.klotz[1] > -0.1 && P.klotz[3] > 2.7 && P.klotz[4] > -0.1 && P.klotz[5] > 2.5);
  if (P.statue) check('Baron-Sandstatue ≈3–5 m, steht; break 1 → nur der Sockel bleibt', P.statue[0] > 3 && P.statue[0] < 5.5 && P.statue[1] > -0.05 && P.statue[2] < 1.5);
  if (P.steg) check('Leuchtsteg: size, Oberseite = thick, Ursprung unten, glow 0 → unsichtbar', Math.abs(P.steg[0] - 2) < 0.15 && Math.abs(P.steg[1] - 2) < 0.15 && Math.abs(P.steg[2] - 0.3) < 0.08 && P.steg[3] > -0.05 && P.steg[4]);
  if (P.keks) check('Keksrad: Ø size, Oberseite thick/2 (Ursprung Mitte)', Math.abs(P.keks[0] - 4) < 0.5 && Math.abs(P.keks[1] - 4) < 0.5 && Math.abs(P.keks[2] - 0.25) < 0.2);
  if (P.zahn) check('Keks-Zahnrad: Ø ≈ 2·radius (+ Zähne), Oberseite thick/2', P.zahn[0] > 3.8 && P.zahn[0] < 5.2 && Math.abs(P.zahn[2] - 0.3) < 0.2);
  if (P.rad) check('Riesenrad: Ursprung Nabe, Gestell bis zum Boden (≈ −radius − 2,5), platform(i) auf dem Kreis (Oberseite)', P.rad[1] < -9.5 && P.rad[1] > -12 && P.rad[2] > 8 && Math.abs(P.rad[3][0][0] - 8) < 0.3 && Math.abs(P.rad[3][1][1] - 8) < 1.5);
  if (P.wasser) check('Wasserkörper ≈ size, Ursprung unten', Math.abs(P.wasser[0] - 3) < 0.4 && Math.abs(P.wasser[1] - 2) < 0.4 && P.wasser[2] > -0.1);
  if (P.becken) check('Steigbecken: Rand ≈ size × height, Wasserstand userData.water', Math.abs(P.becken[0] - 6) < 1.2 && P.becken[1] > 2.8 && P.becken[1] < 3.6 && P.becken[2] > -0.6 && Math.abs(P.becken[3] - 1.5) < 0.3);
  if (P.stachel) check('Stachelblock: Kante size, Ursprung unten, Stacheln fahren aus', Math.abs(P.stachel[0] - 1) < 0.2 && Math.abs(P.stachel[1] - 1) < 0.2 && P.stachel[2] > -0.05 && P.stachel[3] > 1.5);
  if (P.schub) check('Schubfeld: size, flach (≤ 0,15 m)', Math.abs(P.schub[0] - 3) < 0.3 && Math.abs(P.schub[1] - 2) < 0.3 && P.schub[2] < 0.2);
  if (P.regen) check('Lavabrocken-Regen: Brocken ≈0,6–1,2 m, Flammenschweif nach oben', P.regen[0] > 0.5 && P.regen[0] < 1.6 && P.regen[1] > 0.8);
  if (P.turm) check('Baron-Turm: hoch (≥ 20 m)', P.turm[0] >= 20);
  if (P.radK) check('Riesenrad-Kulisse steht auf dem Boden, ≥ 12 m', P.radK[0] >= 12 && P.radK[1] > -0.1);
  if (P.abspann) check('Abspann-Bühne: Wiese ≥ 8 m, Freunde ≥ 4', P.abspann[0] >= 8 && P.abspann[3] >= 4);

  // Instanz-Helfer
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'gitterboden', 'bergkiefer', 'kuerbis']) {
      try {
        const I = cm.inst.createInstanced(kind, 200);
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'leuchtsteg' ? { glow: (i % 10) / 10 } : kind === 'knochenflieger' ? (i % 4 ? 'fly' : { anim: 'bones', progress: (i % 10) / 10 }) : 'idle');
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
  }, INST_W8);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST_W8.join(', ')} (≤ 5 Meshes, API wie gehabt)`, INST_W8.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 5 && instInfo[k].api && instInfo[k].detached));
  const heavyI = INST_W8.filter((k) => instInfo[k] && instInfo[k].tris / 200 > 1500);
  check(`Instanzen sparsam (≤ 1,5 k Dreiecke je Stück)${heavyI.length ? ` (zu viel: ${heavyI.map((k) => `${k}=${Math.round(instInfo[k].tris / 200)}`).join(', ')})` : ''}`, heavyI.length === 0);
  check('Instanz-Helfer: alte Arten unverändert (coin, gitterboden, bergkiefer, kuerbis)', ['coin', 'gitterboden', 'bergkiefer', 'kuerbis'].every((k) => instInfo[k] && !instInfo[k].error));
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
  await gallery('bosses', BOSSES, 0.2, 0.8, 4);
  await gallery('variants', VARIANTS, 0.2, 0.8, 3);
  await gallery('enemies', ENEMIES, 0.2, 0.7, 5);
  await gallery('gimmicks', GIMMICKS, 0.3, 0.7, 5);
  await gallery('kulisse1', KULISSE1, 0.15, 1.0, 4);
  await gallery('kulisse2', KULISSE2, 0.2, 0.8, 6);
  await gallery('kulisse3', KULISSE3, 0.2, 0.8, 4);
  await gallery('kulisse4', KULISSE4, 0.2, 0.8, 6);
  await gallery('szene', SZENE, 0.35, 0.8, 1);
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cm8_st_<name>.png)
if (part('states')) {
  const seen = new Set();
  for (const [n, o, , states] of ALL) {
    if (states.length < 2) continue;
    const nm = seen.has(n) ? `st_${n}_2` : `st_${n}`;
    seen.add(n);
    if (!want(nm) && !want('states')) continue;
    const chunks = [];
    for (let i = 0; i < states.length; i += 9) chunks.push(states.slice(i, i + 9));
    for (let c = 0; c < chunks.length; c++) {
      const nmc = c ? `${nm}_${c + 1}` : nm;
      await sc(([rows]) => {
        const cm = window.__cm; cm.clear();
        if (!cm.reg.hasModel(rows[0][0])) return;
        cm.row(rows, 0, 0.6);
        cm.frame(0.3, 30, 1.05);
      }, [chunks[c].map((st) => [n, o, st, null, label(st)])]);
      if (ONLY && !ONLY.includes(nmc)) ONLY.push(nmc);
      await shot(nmc);
    }
  }
}

if (part('views')) {
  // Nahaufnahmen (Porträts): [name, opts, state, Zielhöhe, Abstand, yaw?]
  const PORTRAITS = [
    ['baron_krallen', {}, 'idle', 2.1, 6.2], ['baron_krallen', {}, { anim: 'swipe', progress: 0.45 }, 1.9, 7, -0.2], ['baron_krallen', {}, { anim: 'fire', progress: 0.55 }, 2.0, 7, Math.PI / 2 + 0.6],
    ['baron_krallen', {}, 'climb', 1.8, 7, Math.PI * 0.85], ['baron_krallen', { clone: true }, 'clone', 1.9, 6.5], ['baron_krallen', {}, 'defeated', 1.3, 6],
    ['super_pow_block', {}, 'idle', 2.5, 15], ['freunde_glas', {}, 'idle', 1.2, 5.2], ['freunde_glas', {}, { break: 1, cheer: true }, 0.6, 5],
    ['sandflosser', {}, { anim: 'jump', progress: 0.45 }, 0.9, 3.4], ['kristall_felsklotz', {}, 'idle', 1.5, 8], ['baron_sandstatue', {}, 'idle', 2.2, 8],
    ['knochenflieger_gruppe', { count: 5 }, 'fly', 1.2, 8], ['schlangenkoenig', { color: 'rosa' }, 'idle', 4.5, 12], ['wuerfelblase', { color: 'gold' }, 'idle', 1, 4.5],
    ['baron_krallen', {}, 'fall', 2, 7], ['baron_krallen', {}, 'slide', 1.8, 7, Math.PI * 0.8], ['baron_krallen', {}, { anim: 'idle', hp: 1 }, 2.1, 5.5, -0.5],
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
    await page.screenshot({ path: `${OUT}cm8_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const LINEUPS = [[BOSSES[0], BOSSES[2], BOSSES[3]], ENEMIES, [GIMMICKS[0], GIMMICKS[2], GIMMICKS[4], GIMMICKS[7], GIMMICKS[9], GIMMICKS[11], GIMMICKS[12]],
    [KULISSE2[0], KULISSE2[4], KULISSE3[1], KULISSE4[3], KULISSE4[5], KULISSE1[2]], [SZENE[0]]];
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

  // Themen-Szenen (Kurs-Kamera 45°/13 m, FOV 45°): [Stimmung, Flächen [x, z, w, d, Farbe], Modelle [name, opts, state, x, z, yaw, y?],
  //   Blickpunkt, Heldin [x, z]?]
  const SCENES = {
    course: ['rummel', [], [['baron_krallen', {}, 'idle', 0, -4, Math.PI / 2], ['sandflosser', {}, { anim: 'jump', progress: 0.45 }, -5, -1, 0, 0.6], ['kristall_felsklotz', { size: 2 }, 'idle', 5, -1, -2.2],
      ['knochenflieger_gruppe', { count: 4, radius: 1.3 }, 'fly', -4, -6, 0.3, 3.2], ['baron_sandstatue', { size: 0.7 }, 'idle', 7, -7, -2], ['stachelblock_rot', {}, { out: 1 }, 2.5, 1.5, 0],
      ['leuchtsteg', { size: [2, 2] }, { glow: 1 }, -2.5, 2, 0], ['keksrad', { size: 2.5 }, { angle: 0.3 }, 5, 3, 0, 0.3], ['schubfeld', {}, 'idle', -6, 3.5, 0], ['lavabrocken_regen', {}, 'fall', 0.5, 2.5, 0, 2.2],
      ['rummel_bude', {}, 'idle', -9, -9, 0.4], ['brummbaer_ballon', {}, 'idle', 9, -10, -0.5], ['karussell', {}, { angle: 0.4 }, 0, -14, 0]], [0, 0.4, -3], [-1.5, 3.5]],
    scene_rummel: ['rummel', [], [['baron_turm', {}, 'idle', 0, -26, 0], ['riesenrad_kulisse', {}, { angle: 0.3 }, -12, -16, 0.3], ['karussell', {}, { angle: 0.2 }, 8, -10, -0.4], ['rummel_bude', {}, 'idle', -5, -5, 0.3],
      ['rummel_bude', { color: 'gruen', seed: 2 }, 'idle', 5, -3, -0.6], ['gluehbirnenkette', { length: 8 }, 'idle', -4, 0, 0, 2.6], ['wimpelkette', { length: 8 }, { wind: 0.4 }, 4, 1, 0, 2.8],
      ['brummbaer_ballon', { count: 3 }, 'idle', -8, 2, 0.3], ['achterbahn', {}, 'idle', 10, -2, Math.PI / 2], ['autowrack', {}, 'idle', 1, 3, 0.4]], [0, 2, -8]],
    scene_finale: ['nacht', [], [['super_pow_block', {}, 'idle', 0, -4, 0], ['baron_krallen', {}, 'idle', -1.2, -4.5, Math.PI / 2, 5], ['freunde_glas', {}, { shake: 0.5 }, 1.3, -4.5, Math.PI / 2, 5],
      ['baron_turm', { part: 'spitze' }, 'idle', 0, -4, 0, -0.01]], [0, 3, -3], [-1.5, 3]],
    scene_regen: ['regen', [], [['regenfestung', {}, 'idle', -6, -8, 0], ['regenfestung', { kind: 'turm' }, 'idle', 7, -10, 0], ['regenfestung', { kind: 'pfuetze' }, { rain: 1 }, 1, 0, 0], ['regenfestung', { kind: 'fahne' }, { wind: 0.7 }, -8, 0, 0],
      ['knochenflieger_gruppe', { count: 5, radius: 1.6 }, 'fly', 0, -4, 0, 3.5], ['stachelblock_rot', { size: [3, 0.6, 1.5] }, { out: 1 }, 4, 1, 0]], [0, 1, -3], [-2, 3]],
    scene_duenen: ['wueste', [], [['duene', {}, 'idle', -6, -10, 0], ['duene', { size: 1.4, seed: 2 }, 'idle', 8, -12, 0.5], ['baron_sandstatue', {}, 'idle', 6, -6, -2.4], ['baron_sandstatue', {}, { break: 0.45 }, -5, -4, -0.6],
      ['sandflosser', {}, { anim: 'jump', progress: 0.4 }, 1, -2, Math.PI, 0.3], ['sandflosser', {}, 'swim', -2, 2, 0.3], ['schubfeld', { size: [4, 2.5] }, 'idle', 3, 2.5, -Math.PI / 2], ['sandskulptur_pilzling', {}, 'idle', -8, 1, 0.5]], [0, 0.5, -3], [-0.5, 4]],
    scene_keks: ['keks', [], [['keksfabrik', {}, { speed: 1 }, -5, -6, 0], ['keksfabrik', { kind: 'keksturm' }, 'idle', 7, -9, 0], ['keksfabrik', { kind: 'zuckerguss' }, 'idle', -8, 1, 0], ['keksrad', { size: 4 }, { angle: 0.4 }, 0, -1, 0, 1.5],
      ['keksrad', { size: 3, color: 'schoko' }, { angle: 1 }, 4.5, -4, 0, 2], ['keks_zahnrad', { radius: 2.2, axis: 'z' }, { angle: 0.3 }, -1, -9, 0, 2.6], ['keks_zahnrad', { radius: 1.6 }, { angle: 0.6 }, 5, 2.5, 0, 0.8]], [0, 1, -3], [0, 3.5]],
    scene_wasser: ['wasser', [], [['steigbecken', { size: [8, 6], height: 2.5 }, { level: 0.55 }, -3, -2, 0], ['wasserkoerper', { size: [3, 3, 3] }, 'idle', 5, -4, 0.3, 1.2], ['wasserkoerper', { size: [2, 2, 2] }, 'idle', 3, 2, 0, 2],
      ['stachelblock_blau', {}, { out: 1 }, -2, 3, 0, 0], ['stachelblock_blau', {}, { out: 0, warn: true }, -0.5, 3, 0, 0], ['wasserfestung', { kind: 'gitter' }, 'idle', 0, -10, 0], ['wasserfestung', {}, 'idle', 8, -2, 0], ['wasserfestung', { kind: 'saeule' }, 'idle', -9, -6, 0]], [0, 1, -3]],
    scene_nacht: ['nacht', [], [['leuchtsteg', { size: [2, 6] }, { glow: 0.2 }, -1, -2, 0, 1], ['leuchtsteg', { size: [2, 2] }, { glow: 1 }, -1, 2, 0, 1], ['leuchtsteg', { size: [2, 2] }, { glow: 0.6 }, 1, 2, 0, 1], ['leuchtsteg', { size: [2, 2] }, { glow: 0 }, 3, 2, 0, 1],
      ['leuchtsteg', { size: [2, 2] }, { glow: 1, flash: 1 }, 3, -4, 0, 1], ['regenfestung', { kind: 'turm' }, 'idle', -8, -10, 0], ['stampfstein', {}, 'idle', 3, -4, 0, 1.3]], [0, 1, -1], [-1, 2.5]],
    scene_inferno: ['lava', [[0, -2, 30, 16, 'rot']], [['kristall_felsklotz', { size: 3 }, 'roll', -2, -1, 0, 0], ['kristall_felsklotz', { size: 2.5, shape: 'wuerfel' }, 'idle', 5, -6, -0.4, 0], ['lavabrocken_regen', {}, 'fall', 2, 1, 0, 3],
      ['lavapfuetze', { size: 2.5 }, 'idle', -6, 3, 0, 0.02], ['schockwelle', { radius: 4 }, { progress: 0.45 }, 6, 3, 0, 0.05], ['lavabrocken_regen', {}, { anim: 'land', progress: 0.3 }, 6, -1, 0, 0.4]], [0, 0.5, -2], [-2.2, -1.2, 3.2]],
    scene_spuk: ['nacht', [], [['spukspiegel', {}, { star: true }, 0, -6, 0], ['spuk', {}, 'idle', -3, -2, 0.4, 1.2], ['kreisgeist', {}, 'idle', 3, -1, -0.4, 1.4]], [0, 1.5, -3], [-0.8, 0]],
    scene_abspann: ['abend', [], [['abspann_buehne', {}, { wave: 1 }, 0, -2, 0]], [0, 0.5, -2]],
  };
  for (const [nm, [mood, pools, list, tgt, heroAt]] of Object.entries(SCENES)) {
    if (!want(nm) && !want('scenes')) continue;
    await sc(([list, mood, pools, tgt, heroAt]) => {
      const cm = window.__cm; cm.clear(); cm.mood(mood);
      for (const [x, z, w, d, c] of pools) cm.lavaPool(x, z, w, d, c, 0.01);
      list.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw, y]) => { const m = cm.put(n, o, s, x, z, yaw, 24, null); if (y !== undefined) m.root.position.y = y; });
      if (heroAt && cm.hero) { cm.hero.root.visible = true; cm.hero.root.scale.setScalar(1 / 1.5); cm.hero.root.position.set(heroAt[0], heroAt[2] ?? 0, heroAt[1]); cm.hero.root.rotation.y = Math.PI / 2; }
      cm.cam(tgt, 45 * Math.PI / 180, 13, 45);
    }, [list, mood, pools, tgt, heroAt ?? null]);
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await shot(nm);
    await sc(() => window.__cm.mood('tag'));
  }
  // Fernsicht der hohen Kulisse (Turm, Riesenrad, Achterbahn) – flache Kamera
  if (want('fern')) {
    await sc(() => {
      const cm = window.__cm; cm.clear(); cm.mood('rummel');
      for (const [n, o, s, x, z, yaw] of [['baron_turm', {}, 'idle', 0, -30, 0], ['riesenrad_kulisse', {}, { angle: 0.4 }, -22, -20, 0.2], ['achterbahn', { kind: 'looping' }, 'idle', 20, -18, -0.5],
        ['achterbahn', {}, 'idle', 12, -14, 0.3], ['karussell', {}, { angle: 0.4 }, -8, -6, 0], ['brummbaer_ballon', { count: 3 }, 'idle', 6, -4, 0], ['rummel_bude', {}, 'idle', 0, -2, 0]]) if (cm.reg.hasModel(n)) cm.put(n, o, s, x, z, yaw, 24, null);
      cm.cam([0, 14, -22], 0.12, 62, 45);
    });
    if (ONLY && !ONLY.includes('fern')) ONLY.push('fern');
    await shot('fern');
    await sc(() => window.__cm.mood('tag'));
  }

  // Instanz-Feld: Leuchtstege, Knochenflieger, Ballons (Kurs-Kamera)
  if (want('instanced')) {
    await sc(() => {
      const cm = window.__cm; cm.clear(); cm.mood('nacht');
      const T = cm.THREE, p = new T.Vector3();
      const sets = [];
      const mk = (k, n, o) => { try { const I = cm.inst.createInstanced(k, n, o); cm.stage.add(I.root); sets.push(I); return I; } catch (e) { console.log(e.message); return null; } };
      const st = mk('leuchtsteg', 40, {}), kf = mk('knochenflieger', 8, {}), bb = mk('brummbaer_ballon', 8, {});
      if (st) for (let i = 0; i < 40; i++) { const x = -6 + (i % 8), z = -3 + Math.floor(i / 8); st.setAt(i, p.set(x, 0.2, z), 0, 1, { glow: Math.max(0, 1 - Math.hypot(x + 2, z) / 3.5) }); }
      if (kf) for (let i = 0; i < 8; i++) kf.setAt(i, p.set(2 + (i % 4) * 1.6, 2.8 + (i % 2) * 0.5, -2 + Math.floor(i / 4) * 2), -Math.PI / 2 + i * 0.3, 1, i === 7 ? { anim: 'bones', progress: 0.5 } : { anim: 'fly', flap: (i % 4) / 4 });
      if (bb) for (let i = 0; i < 8; i++) bb.setAt(i, p.set(-9 + i * 2.6, 3 + (i % 3) * 0.8, -8), 0, 1, 'idle');
      for (let k = 0; k < 6; k++) for (const s of sets) s.update(1 / 30);
      cm.live.push({ root: new T.Group(), dispose() { for (const s of sets) s.dispose(); } });
      cm.cam([0, 0.8, -2], 45 * Math.PI / 180, 13, 45);
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
