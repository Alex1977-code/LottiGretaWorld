// Galerie und Prüfung der Halloween-Modelle „Kürbisinsel“ (src/course/models/kinds/*_hw.js, Instanzen aus lib/instanced_hw.js).
//
// Wie tests/course_models_w5.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die Spielschleife an,
// räumt die Szene frei und stellt die Modelle auf einem 1-m-Schachbrett auf.
// Bilder tests/out/cmhw_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel, Heldin
// auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°), Nacht-Beleuchtung (Mondlicht, Laternen) und
// ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen, ≤ 12 Meshes,
// Dreiecke (Gegner 3–10 k, Boss ≤ 25 k, Gimmicks ≤ 16 k, Kulisse ≤ 12 k), dispose() ohne Fehler (root hängt danach nicht
// mehr), kein Geometrie-Leck bei Bau/Abbau, Kulisse ohne Spielzeug-Look, Figuren mit, Zustands-/Größen-Eigenschaften,
// Instanz-Helfer, keine Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_hw.mjs   (kein Build nötig; CM_ONLY=a,b nur bestimmte Bilder,
//         CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil, für kurze Läufe;
//         CM_GROUPS=enemies,kulisse1 … → nur diese Galerie-Gruppen)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4310 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);
const GROUPS_ONLY = process.env.CM_GROUPS ? process.env.CM_GROUPS.split(',') : null;
const groupOn = (g) => !GROUPS_ONLY || GROUPS_ONLY.includes(g);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const ENEMIES = [
  ['kuerbling', {}, 'idle', ['idle', { anim: 'hop', progress: 0.15 }, { anim: 'hop', progress: 0.5 }, { anim: 'hop', progress: 0.9 }, 'squashed', { anim: 'burst', progress: 0.25 }]],
  ['klapperknochen', {}, 'walk', ['walk', { anim: 'collapse', progress: 0.5 }, 'pile', { anim: 'rebuild', progress: 0.5 }, { anim: 'rebuild', progress: 0.9 }, { anim: 'defeated', progress: 0.4 }]],
  ['flatterfledi', {}, 'fly', ['fly', { anim: 'fly', flap: 0.5 }, 'dive', 'hang']],
  ['hexenhut_huepfer', {}, 'idle', ['idle', { anim: 'hop', progress: 0.2 }, { anim: 'hop', progress: 0.5 }, 'squashed']],
  ['spuk_halloween', {}, 'idle', ['idle', 'chase', 'shy', 'fade', 'hit', 'defeated']],
  ['kreisgeist_halloween', {}, 'circle', ['circle', 'peek', 'defeated']],
];
const GROUPS = [
  ['spuk_halloween', { size: 2.5 }, 'chase', ['chase', 'shy']],
  ['spuk_halloween', { hat: 'hexe' }, 'idle', ['idle']],
  ['kreisgeist_kreis_halloween', { count: 8, radius: 2.4 }, 'circle', ['circle', 'peek', { anim: 'circle', alive: 0b10101111 }]],
];
const BOSSES = [
  ['graf_brummbaer', {}, 'idle', ['idle', 'walk', { anim: 'throw', progress: 0.3 }, { anim: 'throw', progress: 0.7 }, 'hit', 'stunned', { anim: 'bats', progress: 0.3 }, { anim: 'bats', progress: 1 }, { anim: 'idle', hp: 1 }, 'defeated']],
  ['kuerbis_bombe', {}, 'idle', ['idle', { anim: 'lit', fuse: 0.5 }, { anim: 'lit', fuse: 0.1 }, 'carried', 'thrown', { anim: 'explode', progress: 0.3 }]],
  ['fledermaus_schwarm', { count: 14, spread: 2 }, 'fly', ['fly', 'gather', 'scatter', { anim: 'fly', count: 6 }]],
];
const GIMMICKS = [
  ['laterne_hand', {}, { lit: true }, [{ lit: true }, { lit: false }, { lit: 0.5, sway: 0.4 }]],
  ['geisterplattform', { size: [2, 0.5, 2] }, { visible: 1 }, [{ visible: 1 }, { visible: 0.5 }, { visible: 0 }]],
  ['besen_plattform', {}, { tilt: 0.1 }, [{ tilt: 0 }, { tilt: 0.3 }, { tilt: -0.2, speed: 3 }]],
  ['hexenkessel', {}, { bubble: 1 }, [{ bubble: 1 }, { bounce: 0.6 }, { bounce: 1, bubble: 0 }]],
  ['kuerbis_kanone', {}, 'idle', ['idle', { anim: 'load', k: 0.7 }, { anim: 'fire', fire: 0.3 }]],
  ['suessigkeiten_tuer', {}, { open: 0 }, [{ open: 0 }, { open: 0.5, ring: true }, { open: 1 }]],
  ['riesenkuerbis_roll', { size: 2 }, { roll: 0.3 }, [{ roll: 0 }, { roll: 2, speed: 4 }]],
  ['spinnennetz_trampolin', {}, { bounce: 0 }, [{ bounce: 0 }, { bounce: 0.7 }, { bounce: 1 }]],
  ['grabstein_schalter', {}, { pressed: false }, [{ pressed: false }, { pressed: true }]],
  ['suessigkeit', { kind: 'bonbon' }, 'idle', ['idle', 'collected']],
  ['suessigkeit', { kind: 'lolli' }, 'idle', ['idle']],
  ['suessigkeit', { kind: 'riegel' }, 'idle', ['idle']],
  ['suessigkeit', { kind: 'mais' }, 'idle', ['idle']],
  ['bonbon_konfetti', {}, { anim: 'burst', progress: 0.3 }, [{ anim: 'burst', progress: 0.1 }, { anim: 'burst', progress: 0.5 }, 'idle']],
];
const KULISSE1 = [
  ['kuerbis', {}, 'idle', ['idle']],
  ['kuerbis', { face: 'lachen', lit: true, size: 1.2 }, 'idle', ['idle']],
  ['kuerbis', { shape: 'flach', color: 'weiss', size: 0.8 }, 'idle', ['idle']],
  ['kuerbis', { shape: 'hoch', face: 'grinsen', color: 'gelb', lit: true }, 'idle', ['idle']],
  ['kuerbis', { shape: 'dick', color: 'gruen', size: 0.7 }, 'idle', ['idle']],
  ['kuerbislaterne', { mount: 'pfahl' }, 'idle', ['idle', { lit: false }]],
  ['kuerbislaterne', { mount: 'haengend' }, 'idle', ['idle']],
  ['vogelscheuche', {}, 'idle', ['idle', { sway: 1 }]],
  ['strohballen', {}, 'idle', ['idle']],
  ['strohballen', { kind: 'rund' }, 'idle', ['idle']],
  ['maisstaude', {}, 'idle', ['idle', { sway: 1 }]],
  ['suessigkeiten_haufen', {}, 'idle', ['idle']],
];
const KULISSE2 = [
  ['halloween_baum', {}, 'idle', ['idle', { sway: 1 }]],
  ['grabstein', {}, 'idle', ['idle']],
  ['grabstein', { kind: 'kreuz' }, 'idle', ['idle']],
  ['grabstein', { kind: 'spitz', tilt: 0.12 }, 'idle', ['idle']],
  ['eisenzaun', { length: 4 }, 'idle', ['idle']],
  ['gruft', {}, 'idle', ['idle']],
  ['spinnennetz', { kind: 'ecke' }, 'idle', ['idle']],
  ['spinnennetz', { kind: 'rund' }, 'idle', ['idle', { sway: 1 }]],
  ['kerzenleuchter', {}, 'idle', ['idle', { lit: false }]],
  ['nebelschwaden', {}, 'idle', ['idle']],
  ['mond_gesicht', { size: 2 }, 'idle', ['idle']],
];
const KULISSE3 = [
  ['hexenturm', {}, 'idle', ['idle']],
  ['hexenturm', { part: 'dach' }, 'idle', ['idle']],
  ['hexenturm', { part: 'fenster' }, 'idle', ['idle', { lit: false }]],
  ['hexenturm', { part: 'turm', height: 3 }, 'idle', ['idle']],
  ['dorfhaus_nacht', {}, 'idle', ['idle', { lit: false }]],
  ['dorfhaus_nacht', { color: 'gruen', width: 3.5 }, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...GROUPS, ...BOSSES, ...GIMMICKS, ...KULISSE1, ...KULISSE2, ...KULISSE3];
const ENEMY_NAMES = new Set(['kuerbling', 'klapperknochen', 'flatterfledi', 'hexenhut_huepfer', 'spuk_halloween', 'kreisgeist_halloween']);
const BOSS_NAMES = new Set(['graf_brummbaer']);
const KULISSE_NAMES = new Set([...KULISSE1, ...KULISSE2, ...KULISSE3].map(([n]) => n));
const INST_HW = ['kuerbis', 'grabstein', 'geisterplattform', 'suessigkeit', 'maisstaude'];
const HW_NEW = [...new Set(ALL.map(([n]) => n))];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cmhw`, logLevel: 'warn', clearScreen: false,
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
  scene.background = new THREE.Color(0xb8d8f0);
  scene.fog = null;
  // Boden: herbstliches 1-m-Schachbrett (Wiese und Laub), empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c8d8a0'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#b4c88c'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 60); tex.magFilter = THREE.NearestFilter; tex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group(); scene.add(stage);
  const labels = document.createElement('div');
  labels.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:50;font:bold 11px sans-serif;color:#1d2340';
  document.body.appendChild(labels);

  // Tag/Nacht: Lichter der Welt merken und umschalten
  const L = v.world.lighting;
  const day = { hemi: [L.hemi.color.getHex(), L.hemi.groundColor.getHex(), L.hemi.intensity], sun: [L.sun.color.getHex(), L.sun.intensity], bg: scene.background.clone(), toy: toy.getToyLookEnv() };
  const nightLights = [];
  const live = [];
  // hängende/schwebende Modelle (Ursprung oben oder in der Mitte) anheben
  const LIFT = {
    laterne_hand: () => 1.2, flatterfledi: () => 0.9, fledermaus_schwarm: () => 2.4, besen_plattform: () => 0.8,
    kreisgeist_kreis_halloween: () => 0.1, spinnennetz: (o) => (o.kind === 'ecke' ? 2.2 : 1.3), kuerbislaterne: (o) => (o.mount === 'haengend' ? 2.2 : 0),
    mond_gesicht: (o) => (o.size ?? 6) * 1.05, geisterplattform: () => 0.6, bonbon_konfetti: () => 0.5, spuk_halloween: () => 0.3,
    hexenturm: (o) => (o.part === 'fenster' ? 1.2 : 0),
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
    /** Nacht-Stimmung: Mondlicht (kühl, von oben links), lila Himmel, warme Punktlichter an den Laternen. */
    night(on, lamps = []) {
      for (const l of nightLights.splice(0)) { l.removeFromParent(); l.dispose?.(); }
      if (on) {
        L.hemi.color.setHex(0x8a7ae8); L.hemi.groundColor.setHex(0x2a1a3a); L.hemi.intensity = 0.85;
        L.sun.color.setHex(0xa8c0ff); L.sun.intensity = 1.25;
        scene.background = new THREE.Color(0x1a1238);
        scene.fog = new THREE.Fog(0x241a44, 22, 60);
        toy.setToyLookEnv({ rimColor: 0xb8b0ff, rimStrength: 0.95, fill: 0.08 });
        ground.material.color.setHex(0x6a5a8a);
        for (const [x, y, z, c, i, d] of lamps) {
          const pl = new THREE.PointLight(c ?? 0xffa040, i ?? 14, d ?? 7, 1.6);
          pl.position.set(x, y, z); scene.add(pl); nightLights.push(pl);
        }
      } else {
        L.hemi.color.setHex(day.hemi[0]); L.hemi.groundColor.setHex(day.hemi[1]); L.hemi.intensity = day.hemi[2];
        L.sun.color.setHex(day.sun[0]); L.sun.intensity = day.sun[1];
        scene.background = day.bg.clone(); scene.fog = null;
        toy.setToyLookEnv({ rimColor: day.toy.rimColor, rimStrength: day.toy.rimStrength, fill: day.toy.fill });
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
  await page.screenshot({ path: `${OUT}cmhw_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? +x.toFixed(2) : x)).join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const missing = HW_NEW.filter((n) => !names.includes(n));
  check(`alle ${HW_NEW.length} Halloween-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
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
          m.root.traverse((o) => { if (o.isMesh && o.visible) { const g = o.geometry; tt += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); } });
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
  const heavyE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && (t > 10000 || t < 3000));
  check(`Gegner 3–10 k Dreiecke${heavyE.length ? ` (außerhalb: ${heavyE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyE.length === 0);
  const bossT = Object.entries(cycle.tris).filter(([n]) => BOSS_NAMES.has(base(n))).map(([, t]) => t);
  check(`Boss ≤ 25 k Dreiecke (${bossT.join(', ')})`, bossT.length > 0 && bossT.every((t) => t > 5000 && t <= 25000));
  const heavyK = Object.entries(cycle.tris).filter(([n, t]) => KULISSE_NAMES.has(base(n)) && t > 12000);
  check(`Kulisse ≤ 12 k Dreiecke (Kartenqualität)${heavyK.length ? ` (zu viel: ${heavyK.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyK.length === 0);
  // Gruppen (ganzer Kreisgeist-Kreis aus Welt 3, Schwarm) zählen je Figur; Gimmicks/Items einzeln ≤ 16 k
  const GROUP_LIMIT = { kreisgeist_kreis_halloween: 30000, fledermaus_schwarm: 16000 };
  const heavy = Object.entries(cycle.tris).filter(([n, t]) => !KULISSE_NAMES.has(base(n)) && !BOSS_NAMES.has(base(n)) && !ENEMY_NAMES.has(base(n)) && t > (GROUP_LIMIT[base(n)] ?? 16000));
  check(`Gimmicks/Items ≤ 16 k Dreiecke (Gruppen: Kreis ≤ 30 k)${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);
  const toyBad = Object.entries(cycle.toy).filter(([n, [t]]) => KULISSE_NAMES.has(base(n)) && t > 0);
  check(`Kulisse ohne Spielzeug-Look${toyBad.length ? ` (mit Look: ${toyBad.map(([n]) => n).join(', ')})` : ''}`, toyBad.length === 0);
  const toyMiss = Object.entries(cycle.toy).filter(([n, [t]]) => !KULISSE_NAMES.has(base(n)) && t === 0);
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

  // Eigenschaften (Maße und Schnittstellen, nach denen Motor/Gegner/Level programmieren)
  const props = await sc(() => {
    const cm = window.__cm; const out = {}; const T = cm.THREE;
    const has = (n) => cm.reg.hasModel(n);
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new T.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), empty: b.isEmpty() }; m.dispose(); return r; };
    const with_ = (name, opts, fn) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); try { return fn(m); } finally { m.dispose(); } };
    if (has('kuerbling')) { const i = box('kuerbling', {}, 'idle'), s = box('kuerbling', {}, 'squashed'), b = box('kuerbling', {}, { anim: 'burst', progress: 1 }); out.kuerbling = [i.y, i.minY, s.maxY, b.empty || b.y < 0.05]; }
    if (has('klapperknochen')) { const w = box('klapperknochen', {}, 'walk'), p = box('klapperknochen', {}, 'pile'), r = box('klapperknochen', {}, { anim: 'rebuild', progress: 1 }); out.knochen = [w.y, w.minY, p.maxY, r.y]; }
    if (has('flatterfledi')) { const f = box('flatterfledi', {}, 'fly'), h = box('flatterfledi', {}, 'hang'); out.fledi = [Math.max(f.x, f.z), f.minY, h.maxY, h.minY]; }
    if (has('hexenhut_huepfer')) { const i = box('hexenhut_huepfer', {}, 'idle'), s = box('hexenhut_huepfer', {}, 'squashed'); out.hut = [i.y, i.minY, s.maxY]; }
    if (has('graf_brummbaer')) {
      const i = box('graf_brummbaer', {}, 'idle'), b = box('graf_brummbaer', {}, { anim: 'bats', progress: 1 });
      const hand = with_('graf_brummbaer', {}, (m) => { for (let k = 0; k < 10; k++) m.update(1 / 30, { anim: 'throw', progress: 0.35 }); const v = m.hand(); return [+v.x.toFixed(2), +v.y.toFixed(2), typeof m.hand === 'function']; });
      out.graf = [i.y, i.minY, b.empty || b.y < 0.3, hand];
    }
    if (has('kuerbis_bombe')) { const i = box('kuerbis_bombe', {}, 'idle'), e = box('kuerbis_bombe', {}, { anim: 'explode', progress: 0.6 }), g = box('kuerbis_bombe', {}, { anim: 'explode', progress: 1 }); out.bombe = [i.y, i.minY, e.x, g.empty || g.x < 0.1]; }
    if (has('fledermaus_schwarm')) { const f = box('fledermaus_schwarm', { count: 12, spread: 2 }, 'fly'), g = box('fledermaus_schwarm', { count: 12, spread: 2 }, 'gather'); out.schwarm = [f.x, g.x]; }
    if (has('geisterplattform')) {
      // Maße des Plattform-Körpers (ohne Bodenschein): größtes Mesh
      const body = with_('geisterplattform', { size: [2, 0.5, 2] }, (m) => { for (let k = 0; k < 30; k++) m.update(1 / 30, { visible: 1 }); let big = null; m.root.traverse((o) => { if (o.isMesh && (!big || o.geometry.attributes.position.count > big.geometry.attributes.position.count)) big = o; }); m.root.updateMatrixWorld(true); big.geometry.computeBoundingBox(); const bb = big.geometry.boundingBox.clone().applyMatrix4(big.matrixWorld); const sz = bb.getSize(new T.Vector3()); return [+sz.x.toFixed(2), +sz.y.toFixed(2), +sz.z.toFixed(2), +bb.min.y.toFixed(2)]; });
      const z = box('geisterplattform', { size: [2, 0.5, 2] }, { visible: 0 });
      out.geist = [...body, z.empty];
    }
    if (has('besen_plattform')) { const b = box('besen_plattform', {}, { tilt: 0 }); out.besen = [b.x, b.z, b.maxY, with_('besen_plattform', {}, (m) => m.root.userData.size ?? null)]; }
    if (has('hexenkessel')) { const k = box('hexenkessel', {}, { bubble: 0 }); out.kessel = [k.x, k.maxY, with_('hexenkessel', {}, (m) => m.root.userData.top ?? null)]; }
    if (has('kuerbis_kanone')) { const k = box('kuerbis_kanone', {}, 'idle'); out.kanone = [k.y, with_('kuerbis_kanone', {}, (m) => { m.update(0.1, 'idle'); const p = m.muzzle(); return [+p.x.toFixed(2), +p.y.toFixed(2)]; })]; }
    if (has('suessigkeiten_tuer')) { const t = box('suessigkeiten_tuer', {}, { open: 0 }); out.tuer = [t.y, t.z, t.minY]; }
    if (has('riesenkuerbis_roll')) { const r = box('riesenkuerbis_roll', { size: 2 }, { roll: 0 }); out.roll = [r.x, r.y, r.minY]; }
    if (has('spinnennetz_trampolin')) { const s = box('spinnennetz_trampolin', {}, { bounce: 0 }); out.netz = [s.x, s.maxY, with_('spinnennetz_trampolin', {}, (m) => m.root.userData.top ?? null)]; }
    if (has('grabstein_schalter')) { const a = box('grabstein_schalter', {}, { pressed: false }), b = box('grabstein_schalter', {}, { pressed: true }); out.schalter = [a.maxY, b.maxY]; }
    if (has('suessigkeit')) { const s = box('suessigkeit', { kind: 'bonbon' }, 'idle'), c = box('suessigkeit', {}, 'collected', 40); out.candy = [s.maxY, Math.max(s.x, s.y), c.empty]; }
    if (has('mond_gesicht')) { const m = box('mond_gesicht', { size: 3 }, 'idle'); out.mond = [m.y]; }
    return out;
  });
  console.log('  Eigenschaften:', JSON.stringify(props));
  if (props.kuerbling) check('Kürbling ≈0,6–0,9 m, Füße am Boden; squashed flach (mit Sternen < 0,55 m); burst → weg', props.kuerbling[0] > 0.6 && props.kuerbling[0] < 0.95 && props.kuerbling[1] > -0.05 && props.kuerbling[2] < 0.55 && props.kuerbling[3]);
  if (props.knochen) check('Klapperknochen ≈1,0–1,25 m (großer Schädel); pile niedrig (Schädel obenauf, mit Sternen < 0,8 m); rebuild 1 = wieder ganz', props.knochen[0] > 1.0 && props.knochen[0] < 1.25 && props.knochen[1] > -0.05 && props.knochen[2] < 0.8 && Math.abs(props.knochen[3] - props.knochen[0]) < 0.12);
  if (props.fledi) check('Flatterfledi: Spannweite 0,8–1,3 m, fliegt über dem Ursprung, hängt darunter', props.fledi[0] > 0.8 && props.fledi[0] < 1.3 && props.fledi[1] > -0.1 && props.fledi[2] < 0.15 && props.fledi[3] < -0.4);
  if (props.hut) check('Hexenhut-Hüpfer ≈0,8–1,1 m; squashed niedrig', props.hut[0] > 0.8 && props.hut[0] < 1.15 && props.hut[1] > -0.05 && props.hut[2] < 0.55);
  if (props.graf) check('Graf Brummbär 2,8–3,6 m (mit Zylinder); bats 1 → verwandelt (weg); hand() liefert Wurf-Tatze', props.graf[0] > 2.8 && props.graf[0] < 3.6 && props.graf[1] > -0.05 && props.graf[2] && props.graf[3][2] && props.graf[3][1] > 1);
  if (props.bombe) check('Kürbis-Bombe ≈0,5–0,8 m; Explosion breit (> 1,5 m), danach weg', props.bombe[0] > 0.5 && props.bombe[0] < 0.85 && props.bombe[1] > -0.05 && props.bombe[2] > 1.5 && props.bombe[3]);
  if (props.schwarm) check('Fledermaus-Schwarm: fly ≈ 2·spread breit, gather enger', props.schwarm[0] > 2.5 && props.schwarm[0] < 6 && props.schwarm[1] < props.schwarm[0]);
  if (props.geist) check('Geisterplattform: Maße = size (Ursprung Mitte unten); visible 0 → unsichtbar', Math.abs(props.geist[0] - 2) < 0.25 && Math.abs(props.geist[1] - 0.5) < 0.25 && Math.abs(props.geist[2] - 2) < 0.25 && props.geist[3] > -0.35 && props.geist[4]);
  if (props.besen) check('Besen-Plattform: Lauffläche bei y ≈ 0, userData.size', props.besen[2] < 0.35 && props.besen[0] > 2 && !!props.besen[3]);
  if (props.kessel) check('Hexenkessel: Oberkante ≈ userData.top (0,8–1,3 m), Ø 1,2–2 m', props.kessel[2] > 0.75 && props.kessel[2] < 1.35 && props.kessel[0] > 1.2 && props.kessel[0] < 2.1 && Math.abs(props.kessel[1] - props.kessel[2]) < 0.45);
  if (props.kanone) check('Kürbis-Kanone ≈1,6–2,8 m, muzzle() oben', props.kanone[0] > 1.5 && props.kanone[0] < 2.9 && props.kanone[1][1] > 1.2);
  if (props.tuer) check('Süßigkeiten-Tür ≈2,2–3,2 m hoch, Ursprung unten', props.tuer[0] > 2.2 && props.tuer[0] < 3.3 && props.tuer[2] > -0.05);
  if (props.roll) check('Riesenkürbis: Ø ≈ size, liegt auf dem Ursprung', Math.abs(props.roll[0] - 2) < 0.35 && props.roll[1] > 1.4 && props.roll[1] < 2.4 && props.roll[2] > -0.05);
  if (props.netz) check('Spinnennetz-Trampolin: userData.top gesetzt, Ø 1,6–2,6 m', props.netz[2] > 0.3 && props.netz[0] > 1.6 && props.netz[0] < 2.8);
  if (props.schalter) check('Grabstein-Schalter: gedrückt niedriger', props.schalter[1] < props.schalter[0] - 0.1);
  if (props.candy) check('Süßigkeit: schwebt (≤ 0,8 m), ≈0,3–0,7 m groß; collected → weg', props.candy[0] < 0.85 && props.candy[1] > 0.25 && props.candy[1] < 0.72 && props.candy[2]);
  if (props.mond) check('Mond: Größe ≈ 2·size', props.mond[0] > 5 && props.mond[0] < 7.5);

  // Instanz-Helfer
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'flipper_feld']) {
      try {
        const I = cm.inst.createInstanced(kind, 200, kind === 'suessigkeit' ? { kind: 'lolli' } : {});
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'geisterplattform' ? { visible: (i % 5) / 4 } : kind === 'suessigkeit' ? (i % 7 === 0 ? 'collected' : 'idle') : 'idle');
        for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, st(i));
        I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
        I.setState(5, 'idle');
        for (let k = 0; k < 10; k++) I.update(1 / 30);
        let tris = 0, meshes = 0;
        I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
        const api = ['setAt', 'setState', 'getState', 'hide', 'update', 'dispose'].every((f) => typeof I[f] === 'function') && I.count === 200 && I.getState(3) === 'hidden';
        cm.v.renderer.render(cm.v.three, cm.v.camera);
        I.dispose();
        out[kind] = { meshes, tris: Math.round(tris), api, detached: !I.root.parent };
      } catch (e) { out[kind] = { error: e.message }; }
    }
    return out;
  }, INST_HW);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST_HW.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST_HW.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
  const heavyI = INST_HW.filter((k) => instInfo[k] && instInfo[k].tris / 200 > 1500);
  check(`Instanzen sparsam (≤ 1,5 k Dreiecke je Stück)${heavyI.length ? ` (zu viel: ${heavyI.map((k) => `${k}=${Math.round(instInfo[k].tris / 200)}`).join(', ')})` : ''}`, heavyI.length === 0);
  check('Instanz-Helfer: alte Arten unverändert (coin, flipper_feld)', instInfo.coin && !instInfo.coin.error && instInfo.coin.meshes === 2 && instInfo.flipper_feld && !instInfo.flipper_feld.error);
}

// ------------------------------------------------------------------ Bilder
const gallery = async (name, list, el = 0.22, gap = 0.45, per = 4) => {
  if (!groupOn(name)) return;
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
  await gallery('enemies', ENEMIES, 0.2, 0.6, 6);
  await gallery('groups', GROUPS, 0.3, 0.8, 3);
  await gallery('bosses', BOSSES, 0.2, 0.8, 3);
  await gallery('gimmicks', GIMMICKS, 0.3, 0.6, 5);
  await gallery('kulisse1', KULISSE1, 0.25, 0.6, 6);
  await gallery('kulisse2', KULISSE2, 0.25, 0.6, 6);
  await gallery('kulisse3', KULISSE3, 0.25, 0.8, 3);
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cmhw_st_<name>.png)
if (part('states')) {
  const seen = new Set();
  for (const [n, o, , states] of ALL) {
    if (states.length < 3 || KULISSE_NAMES.has(n)) continue;
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
    ['kuerbling', {}, 'idle', 0.4, 2.0], ['klapperknochen', {}, 'walk', 0.6, 2.6], ['flatterfledi', {}, 'fly', 1.15, 2.2],
    ['hexenhut_huepfer', {}, 'idle', 0.5, 2.3], ['graf_brummbaer', {}, 'idle', 2.2, 5.5], ['kuerbis_bombe', {}, { anim: 'lit', fuse: 0.6 }, 0.35, 1.9],
    ['spuk_halloween', {}, 'idle', 0.85, 2.4], ['kreisgeist_halloween', {}, 'peek', 0.5, 2.0], ['graf_brummbaer', {}, { anim: 'throw', progress: 0.3 }, 2.0, 6],
    ['spinnennetz_trampolin', {}, { bounce: 1 }, 0.4, 3.6], ['geisterplattform', { size: [2, 0.5, 2] }, { visible: 1, wake: true }, 0.4, 3.8], ['hexenhut_huepfer', {}, 'squashed', 0.3, 2.2],
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
    await page.screenshot({ path: `${OUT}cmhw_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const LINEUPS = [ENEMIES.slice(0, 5), [BOSSES[0], BOSSES[1], GIMMICKS[0], GIMMICKS[9], GIMMICKS[3]], [GIMMICKS[5], GIMMICKS[4], GIMMICKS[8], KULISSE1[7], KULISSE2[1]]];
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

  // Kurs-Sicht: Kamera 13 m, Neigung 45°, FOV 45° – kleine Kürbisfeld-Szene mit Gegnern und Requisiten (Abendlicht)
  const COURSE_FIG = [ENEMIES[0], ENEMIES[1], ENEMIES[2], ENEMIES[3], ENEMIES[4], GIMMICKS[9], GIMMICKS[3], GIMMICKS[8], GIMMICKS[0], BOSSES[1], GIMMICKS[1], GIMMICKS[7]];
  const COURSE_DECO = [['halloween_baum', {}, 'idle', -9.5, -7, 0], ['vogelscheuche', {}, 'idle', 9, -8, -2.2], ['strohballen', {}, 'idle', 8.5, -1, -2.4],
    ['kuerbis', { face: 'lachen', lit: true, size: 1.1 }, 'idle', -8, -1.5, 0.6], ['kuerbis', { size: 0.8 }, 'idle', -6.5, 2.5, 0.3], ['maisstaude', {}, 'idle', 6, 3, 0.5],
    ['grabstein', {}, 'idle', -4, -10, 0.3], ['grabstein', { kind: 'kreuz' }, 'idle', -2, -10.5, 0], ['eisenzaun', { length: 4 }, 'idle', 3, -11, 0], ['kuerbislaterne', { mount: 'pfahl' }, 'idle', 1, -8.5, 0.5],
    ['kuerbis', { shape: 'flach', color: 'weiss', size: 0.7 }, 'idle', -3, 3.5, 0.5], ['suessigkeiten_haufen', {}, 'idle', 4, 2.6, 0.2], ['hexenkessel', {}, 'idle', 11, -12, 0]];
  const LAMPS = [[-8, 1, -1.5, 0xffa040, 10, 6], [1, 2, -8.5, 0xffa040, 12, 7], [0, 2.5, 2, 0xffc080, 8, 9]];
  if (want('course') || want('night')) {
    await sc(([list, deco]) => {
      const cm = window.__cm; cm.clear();
      deco.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw]) => cm.put(n, o, s, x, z, yaw, 24, null));
      const ok = list.filter(([n]) => cm.reg.hasModel(n));
      ok.forEach(([n, o, s], i) => {
        const col = i % 6, row = Math.floor(i / 6);
        cm.put(n, o, s, (col - 2.5) * 2.6, 0.4 - row * 3.4, i % 2 ? -Math.PI / 2 : Math.atan2(-0.3, 1), 24, n.replace(/_.*/, ''));
      });
      cm.cam([0, 0.4, -3.2], 45 * Math.PI / 180, 13, 45);
    }, [COURSE_FIG.map(([n, o, s]) => [n, o, s]), COURSE_DECO]);
    if (want('course')) {
      if (ONLY && !ONLY.includes('course')) ONLY.push('course');
      await shot('course');
    }
    if (want('night')) {
      await sc((lamps) => { const cm = window.__cm; cm.night(true, lamps); for (const m of cm.live) m.label = null; }, LAMPS);
      if (ONLY && !ONLY.includes('night')) ONLY.push('night');
      await shot('night');
      await sc(() => window.__cm.night(false));
    }
  }

  // Nacht-Galerie: Kulisse und Figuren im Mondlicht (Leuchtendes muss tragen)
  if (want('night_deco')) {
    await sc(() => {
      const cm = window.__cm; cm.clear();
      const list = [['mond_gesicht', { size: 2.2 }, 'idle', -1, -9, 0], ['hexenturm', {}, 'idle', -7, -6, 0.4], ['dorfhaus_nacht', {}, 'idle', 5.5, -6, -0.4], ['halloween_baum', {}, 'idle', -3.5, -3, 0],
        ['gruft', {}, 'idle', 1, -5, 0], ['kerzenleuchter', {}, 'idle', 3, -1.5, 0], ['kuerbislaterne', { mount: 'pfahl' }, 'idle', -1.5, -1, 0.3], ['grabstein', {}, 'idle', 0.5, -1.8, 0.2],
        ['spuk_halloween', {}, 'idle', -4.5, 0.5, 0.6], ['geisterplattform', { size: [2, 0.4, 2] }, { visible: 0.8 }, 2, 1.6, 0], ['kuerbling', {}, 'idle', -0.5, 1.5, 0.4], ['laterne_hand', {}, { lit: true }, 0.8, 1.8, 0],
        ['nebelschwaden', { size: [10, 4] }, 'idle', 0, -2, 0]];
      list.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw]) => cm.put(n, o, s, x, z, yaw, 24, null));
      cm.night(true, [[-1.5, 2, -1, 0xffa040, 12, 7], [3, 2, -1.5, 0xffd080, 8, 6], [0.8, 1.6, 1.8, 0xffb060, 8, 6], [5.5, 2, -4.5, 0xffc070, 10, 7]]);
      cm.cam([0, 1.4, -2], 0.32, 15, 45);
    });
    if (ONLY && !ONLY.includes('night_deco')) ONLY.push('night_deco');
    await shot('night_deco');
    await sc(() => window.__cm.night(false));
  }

  // Instanz-Feld: Kürbisse, Grabsteine, Geisterplattformen (verschieden sichtbar), Süßigkeiten, Maisstauden (Kurs-Kamera)
  if (want('instanced')) {
    await sc(() => {
      const cm = window.__cm; cm.clear();
      const T = cm.THREE, p = new T.Vector3();
      const sets = [];
      const mk = (k, n, o) => { try { const I = cm.inst.createInstanced(k, n, o); cm.stage.add(I.root); sets.push(I); return I; } catch (e) { console.log(e.message); return null; } };
      const pk = mk('kuerbis', 16, {}), pkf = mk('kuerbis', 8, { face: 'lachen', lit: true }), gr = mk('grabstein', 10, {}), gp = mk('geisterplattform', 6, { size: [2, 0.4, 2] });
      const sw = mk('suessigkeit', 12, { kind: 'bonbon' }), ms = mk('maisstaude', 14, {});
      if (pk) for (let i = 0; i < 16; i++) pk.setAt(i, p.set(-11 + (i % 8) * 1.2 + Math.sin(i) * 0.3, 0, 1 + Math.floor(i / 8) * 1.3), i * 0.7, 0.6 + (i % 3) * 0.25, 'idle');
      if (pkf) for (let i = 0; i < 8; i++) pkf.setAt(i, p.set(-1 + i * 1.3, 0, 2.5), -Math.PI / 2 + 0.3, 0.9, 'idle');
      if (gr) for (let i = 0; i < 10; i++) gr.setAt(i, p.set(-9 + i * 1.5, 0, -3 - (i % 2) * 0.8), -Math.PI / 2 - 0.2 + (i % 3) * 0.15, 1, 'idle');
      if (gp) for (let i = 0; i < 6; i++) gp.setAt(i, p.set(-6 + i * 2.4, 1 + i * 0.3, -6.5), 0, 1, { visible: i / 5 });
      if (sw) for (let i = 0; i < 12; i++) sw.setAt(i, p.set(-5 + i * 0.8, 0, 0), 0, 1, 'idle');
      if (ms) for (let i = 0; i < 14; i++) ms.setAt(i, p.set(5 + (i % 7) * 0.9, 0, -1 - Math.floor(i / 7) * 1.1), i, 1, 'idle');
      for (let k = 0; k < 6; k++) for (const s of sets) s.update(1 / 30);
      cm.live.push({ root: new T.Group(), dispose() { for (const s of sets) s.dispose(); } });
      cm.cam([-1, 0.8, -2], 45 * Math.PI / 180, 13, 45);
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
