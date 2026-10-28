// Galerie und Prüfung der Welt-6-Modelle „Wolkeninseln“ (src/course/models/kinds/*_w6.js, Instanzen aus lib/instanced_w6.js).
//
// Wie tests/course_models_hw.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die Spielschleife an,
// räumt die Szene frei und stellt die Modelle auf einem wolkenweißen 1-m-Schachbrett auf.
// Bilder tests/out/cm6_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel, Heldin
// auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°), Themen-Szenen (Himmel, Geisterschiff, Fernost,
// Dschungel, Maschinenhalle, Mine) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen, ≤ 12 Meshes,
// Dreiecke (Gegner 3–10 k, Boss ≤ 25 k, Gimmicks ≤ 16 k, Kulisse ≤ 12 k), dispose() ohne Fehler (root hängt danach nicht
// mehr), kein Geometrie-/Textur-Leck bei Bau/Abbau, Kulisse ohne Spielzeug-Look, Figuren mit, Zustands-/Größen-Eigenschaften,
// Instanz-Helfer, keine Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_w6.mjs   (kein Build nötig; Port 4395 + PORT_BASE; CM_ONLY=a,b nur bestimmte
//         Bilder, CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil, für kurze Läufe;
//         CM_GROUPS=enemies,kulisse1 … → nur diese Galerie-Gruppen)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4395 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);
const GROUPS_ONLY = process.env.CM_GROUPS ? process.env.CM_GROUPS.split(',') : null;
const groupOn = (g) => !GROUPS_ONLY || GROUPS_ONLY.includes(g);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const ENEMIES = [
  ['schubser', {}, 'idle', ['idle', 'walk', 'charge', 'skid', { anim: 'pushed', progress: 0.3 }, 'fall', { anim: 'defeated', progress: 0.3 }]],
  ['pustewolke', {}, { anim: 'blow', power: 0.7 }, ['idle', { anim: 'inhale', progress: 0.8 }, { anim: 'blow', power: 1 }, { anim: 'blow', power: 0.4 }, { anim: 'hit', progress: 0.2 }, { anim: 'defeated', progress: 0.3 }]],
  ['glotzfisch', {}, 'swim', ['swim', { anim: 'jump', progress: 0.25 }, { anim: 'jump', progress: 0.7 }, 'defeated']],
  ['stachelwerfer', {}, 'idle', ['idle', { anim: 'throw', progress: 0.3 }, { anim: 'throw', progress: 0.55 }, { anim: 'throw', progress: 0.8 }, { anim: 'hit', progress: 0.3 }, 'defeated']],
  ['hammer_werfer', {}, 'idle', ['idle', 'walk', 'jump', { anim: 'throw', progress: 0.3 }, 'defeated']],
  ['bumerang_werfer', {}, 'idle', ['idle', 'walk', 'jump', { anim: 'throw', progress: 0.3 }, 'defeated']],
];
const GROUPS = [
  ['wuschel_horde', { count: 24 }, 'chase', ['chase', 'idle', { anim: 'chase', count: 10 }]],
  ['wirbelbrocken_attrappe', {}, 'idle', ['idle', 'spin', { anim: 'poof', progress: 0.3 }, { anim: 'poof', progress: 1 }]],
  ['glotzfisch', { color: 'gelb' }, 'swim', ['swim', 'defeated']],
  ['glotzfisch', { color: 'rosa' }, { anim: 'jump', progress: 0.35 }, ['swim']],
  ['schubser', { size: 1.4 }, 'charge', ['charge']],
];
const BOSSES = [
  ['schubser_prinz', {}, 'idle', ['idle', 'charge', 'skid', 'stuck', { anim: 'squeezed', progress: 0.3 }, { anim: 'hit', progress: 0.2 }, { anim: 'fireball', progress: 0.5 }, { anim: 'idle', hp: 1 }, { anim: 'defeated', progress: 0.5 }]],
  ['wuerfelblase', {}, 'idle', ['idle', { anim: 'hop', progress: 0.25 }, { anim: 'hop', progress: 0.55 }, { anim: 'split', progress: 0.4 }, 'flee', { anim: 'hit', progress: 0.2 }, { anim: 'idle', hp: 1 }, { anim: 'defeated', progress: 0.6 }]],
  ['wuerfelblase', { color: 'silber', size: 1.8 }, 'idle', ['idle', 'flee']],
  ['gelee_brocken', { color: 'blau' }, 'idle', ['idle', { anim: 'hop', progress: 0.5 }, 'fly', { anim: 'merge', progress: 0.5 }, { anim: 'defeated', progress: 0.4 }]],
  ['gelee_riese', {}, { form: 1 }, [{ form: 0 }, { form: 0.5 }, { form: 1 }, { anim: 'hop', form: 1, progress: 0.4 }, { anim: 'split', progress: 0.3 }]],
  ['gelee_riese', { size: 2.2, color: 'gold' }, { form: 0.6 }, [{ form: 0.6 }]],
];
const GIMMICKS = [
  ['glasroehre_teil', { kind: 'gerade', length: 4 }, 'idle', ['idle']],
  ['glasroehre_teil', { kind: 'bogen' }, 'idle', ['idle']],
  ['glasroehre_teil', { kind: 't' }, 'idle', ['idle']],
  ['glasroehre_kreuzung', {}, 'idle', ['idle']],
  ['glasroehre_teil', { kind: 'ende' }, 'idle', ['idle']],
  ['stachelkugel', { size: 1.2 }, { anim: 'roll', roll: 0.6 }, [{ anim: 'roll', roll: 0 }, { anim: 'roll', speed: 3 }, 'idle', { anim: 'break', progress: 0.4 }]],
  ['geisterschiff', { part: 'ganz', length: 10, width: 4.4 }, 'idle', ['idle', { lit: false }]],
  ['geisterschiff', { part: 'rumpf', length: 8, width: 4 }, 'idle', ['idle']],
  ['geisterschiff', { part: 'deck', length: 6, width: 3 }, 'idle', ['idle']],
  ['geisterschiff', { part: 'mast', height: 6 }, 'idle', ['idle']],
  ['geisterschiff', { part: 'segel' }, 'idle', ['idle', { wind: 1 }]],
  ['geisterschiff', { part: 'laterne' }, 'idle', ['idle', { lit: false }]],
  ['kippsteg', { length: 8 }, { tilt: 0.2 }, [{ tilt: 0 }, { tilt: -0.3 }, { tilt: 0.3, warn: true }]],
  ['schiebetuer', {}, { open: 0.35, hint: true }, [{ open: 0 }, { open: 0.5, hint: true }, { open: 1 }, { open: 0, tap: 1 }]],
  ['gong', {}, { ring: 0.6 }, ['idle', { anim: 'ring', progress: 0.2 }, { ring: 1 }]],
  ['pilz_maske', {}, 'idle', ['idle', { anim: 'collected', progress: 0.5 }]],
  ['pilz_maske', { mode: 'kopf' }, 'idle', ['idle']],
  ['klettergitter', { size: [2, 2] }, 'idle', ['idle', { shake: 1 }]],
  ['windboe_fahne', {}, { wind: 1 }, [{ wind: 0 }, { wind: 0.5 }, { wind: 1, dir: 0.6 }, { wind: 1, gust: true }]],
  ['foerderband', { length: 4, width: 2 }, { offset: 0.5 }, [{ offset: 0 }, { speed: 3 }, { offset: 1.3 }]],
  ['quetschblock', {}, 'idle', ['idle', { warn: 0.6 }, { slam: 1 }, { warn: 1, slam: 0.5 }]],
  ['wurfball', {}, 'idle', ['idle', 'carried', { anim: 'thrown', roll: 1 }, { anim: 'hit', progress: 0.3 }]],
  ['riesen_frageblock', {}, { grow: 0 }, [{ grow: 0 }, { grow: 0.5 }, { grow: 1 }, { anim: 'bump', grow: 0 }]],
  ['wippe', { length: 6 }, { tilt: 0.2 }, [{ tilt: 0 }, { tilt: -0.3 }]],
  ['wolkenplattform', { size: [3, 0.6, 3] }, 'idle', ['idle', 'step', { anim: 'reveal', progress: 0.5 }, 'hidden']],
];
const KULISSE1 = [
  ['wolkenberg', { size: 10, height: 6 }, 'idle', ['idle']],
  ['bergkiefer', { height: 5 }, 'idle', ['idle', { sway: 1 }]],
  ['wolkenfels', { size: 4 }, 'idle', ['idle']],
  ['geisterschiff_wrack', {}, 'idle', ['idle']],
  ['geisterschiff_wrack', { kind: 'mast' }, 'idle', ['idle']],
];
const KULISSE2 = [
  ['papierlaterne', { color: 'rot' }, 'idle', ['idle', { lit: false }]],
  ['papierlaterne', { mount: 'haengend', color: 'weiss' }, 'idle', ['idle', { sway: 1 }]],
  ['holzbruecke', { length: 8 }, 'idle', ['idle']],
  ['kirschbaum', { height: 4.5 }, 'idle', ['idle', { sway: 1 }]],
  ['fernost_dach', { width: 6, depth: 4 }, 'idle', ['idle']],
];
const KULISSE3 = [
  ['riesenblatt', { size: 2.5 }, 'idle', ['idle', { sway: 1 }]],
  ['dschungel_liane', { length: 4 }, 'idle', ['idle', { sway: 1 }]],
  ['giftbluete', { size: 1.2 }, 'idle', ['idle']],
  ['zahnrad', { radius: 1.5 }, { angle: 0.2 }, [{ angle: 0 }, { speed: 1 }]],
  ['rohrleitung', { kind: 'gerade', length: 4 }, 'idle', ['idle']],
  ['rohrleitung', { kind: 'bogen' }, 'idle', ['idle']],
  ['rohrleitung', { kind: 'ventil' }, 'idle', ['idle', { steam: true }]],
  ['kessel', {}, 'idle', ['idle', { steam: true }]],
  ['schacht_geruest', { height: 6 }, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...GROUPS, ...BOSSES, ...GIMMICKS, ...KULISSE1, ...KULISSE2, ...KULISSE3];
const ENEMY_NAMES = new Set(['schubser', 'pustewolke', 'glotzfisch', 'stachelwerfer', 'hammer_werfer', 'bumerang_werfer']);
const BOSS_NAMES = new Set(['schubser_prinz', 'wuerfelblase', 'gelee_riese']);
const KULISSE_NAMES = new Set([...KULISSE1, ...KULISSE2, ...KULISSE3].map(([n]) => n));
const INST_W6 = ['gelee_brocken', 'klettergitter', 'foerderband', 'stachelkugel', 'bergkiefer'];
const W6_NEW = [...new Set(ALL.map(([n]) => n))];

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm6`, logLevel: 'warn', clearScreen: false,
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
  // Boden: wolkenweißes 1-m-Schachbrett mit einem Hauch Himmelblau, empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#eef2fb'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#dbe3f4'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
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
  const day = { hemi: [L.hemi.color.getHex(), L.hemi.groundColor.getHex(), L.hemi.intensity], sun: [L.sun.color.getHex(), L.sun.intensity], bg: scene.background.clone(), toy: toy.getToyLookEnv() };
  const live = [];
  // hängende/schwebende Modelle (Ursprung oben oder in der Mitte) anheben
  const LIFT = {
    pustewolke: () => 0.6, glasroehre_teil: (o) => (o.radius ?? 1) + 0.1, glasroehre_kreuzung: (o) => (o.radius ?? 1) + 0.1,
    geisterschiff: (o) => (o.part === 'ganz' || o.part === 'rumpf' ? 2.6 : o.part === 'deck' ? 0.4 : o.part === 'laterne' ? 2 : o.part === 'segel' ? 3.7 : 0),
    kippsteg: () => 0.6, wippe: () => 1.1, quetschblock: (o) => (o.size?.[1] ?? 2) / 2 + 0.05, pilz_maske: (o) => (o.mode === 'kopf' ? 1 : 0),
    papierlaterne: (o) => (o.mount === 'haengend' ? 2.4 : 0), dschungel_liane: (o) => (o.length ?? 4) + 0.3, zahnrad: (o) => (o.radius ?? 1.5) + 0.1,
    rohrleitung: (o) => (o.radius ?? 0.35) + 0.05, gelee_brocken: () => 0, wolkenplattform: () => 0.5, fernost_dach: () => 0.2,
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
        if (!o.isMesh || !o.visible || o.userData.fx) return;   // Effekt-Puffs (Dampf, Rauch) zählen nicht zum Körper
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
    /** Stimmung: 'tag' | 'daemmer' (Geisterschiff: grünlich-trüb) | 'halle' (Maschinenhalle/Mine: warm, dunkler). */
    mood(kind = 'tag') {
      if (kind === 'daemmer') {
        L.hemi.color.setHex(0x8aa8b0); L.hemi.groundColor.setHex(0x2a3a3a); L.hemi.intensity = 0.95;
        L.sun.color.setHex(0xc8e8e0); L.sun.intensity = 1.3;
        scene.background = new THREE.Color(0x4a6a78);
        ground.material.color.setHex(0x7a8a98);
      } else if (kind === 'halle') {
        L.hemi.color.setHex(0xffd8a8); L.hemi.groundColor.setHex(0x4a3020); L.hemi.intensity = 0.95;
        L.sun.color.setHex(0xffe0b8); L.sun.intensity = 1.4;
        scene.background = new THREE.Color(0x5a4a5a);
        ground.material.color.setHex(0xa89080);
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
  await page.screenshot({ path: `${OUT}cm6_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? +x.toFixed(2) : x)).join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const missing = W6_NEW.filter((n) => !names.includes(n));
  check(`alle ${W6_NEW.length} Welt-6-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
  check('wiederverwendet: wuschel, wirbelbrocken, feuer_werfer, glass_pipe_segment, tanne_schnee, eiszapfen, holzbalken, lore vorhanden',
    ['wuschel', 'wirbelbrocken', 'feuer_werfer', 'glass_pipe_segment', 'tanne_schnee', 'eiszapfen', 'holzbalken', 'lore'].every((n) => names.includes(n)));
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
  const bossT = Object.entries(cycle.tris).filter(([n]) => BOSS_NAMES.has(base(n))).map(([n, t]) => [n, t]);
  check(`Boss ≤ 25 k Dreiecke (${bossT.map(([n, t]) => `${base(n)}=${t}`).join(', ')})`, bossT.length > 0 && bossT.every(([, t]) => t > 3000 && t <= 25000));
  const heavyK = Object.entries(cycle.tris).filter(([n, t]) => KULISSE_NAMES.has(base(n)) && t > 12000);
  check(`Kulisse ≤ 12 k Dreiecke (Kartenqualität)${heavyK.length ? ` (zu viel: ${heavyK.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyK.length === 0);
  // Gruppen (Horde) zählen je Figur; Gimmicks/Items einzeln ≤ 16 k
  const GROUP_LIMIT = { wuschel_horde: 18000, wirbelbrocken_attrappe: 25000 };
  const heavy = Object.entries(cycle.tris).filter(([n, t]) => !KULISSE_NAMES.has(base(n)) && !BOSS_NAMES.has(base(n)) && !ENEMY_NAMES.has(base(n)) && t > (GROUP_LIMIT[base(n)] ?? 16000));
  check(`Gimmicks/Items ≤ 16 k Dreiecke (Horde ≤ 18 k)${heavy.length ? ` (zu viel: ${heavy.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavy.length === 0);
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
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new T.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2), empty: b.isEmpty() }; m.dispose(); return r; };
    const with_ = (name, opts, fn) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); try { return fn(m); } finally { m.dispose(); } };
    const v3 = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
    if (has('schubser')) { const i = box('schubser', {}, 'idle'), d = box('schubser', {}, { anim: 'defeated', progress: 1 }), b = box('schubser', { size: 1.5 }, 'idle'); out.schubser = [i.y, i.x, i.minY, d.empty || d.y < 0.1, b.y, with_('schubser', {}, (m) => m.root.userData.radius)]; }
    if (has('pustewolke')) { const i = box('pustewolke', {}, 'idle'), w = with_('pustewolke', {}, (m) => { for (let k = 0; k < 40; k++) m.update(1 / 30, { anim: 'blow', power: 1 }); return [m.root.userData.wind, m.root.userData.reach]; }); out.puste = [i.x, i.y, i.minY, w]; }
    if (has('glotzfisch')) { const s = box('glotzfisch', {}, 'swim'); out.fisch = [s.x, s.y, s.minY]; }
    if (has('stachelwerfer')) {
      const i = box('stachelwerfer', {}, 'idle');
      const h = with_('stachelwerfer', {}, (m) => { for (let k = 0; k < 20; k++) m.update(1 / 30, 'idle'); const a = m.hand().y; const held = m.root.userData.holding; for (let k = 0; k < 20; k++) m.update(1 / 30, { anim: 'throw', progress: 0.58 }); const up = m.hand().y; for (let k = 0; k < 20; k++) m.update(1 / 30, { anim: 'throw', progress: 0.8 }); return [+a.toFixed(2), held, m.root.userData.holding, +up.toFixed(2)]; });
      out.igel = [i.maxY, i.minY, h];
    }
    if (has('hammer_werfer')) { const w = box('hammer_werfer', {}, 'idle'); out.werfer = [w.y, with_('hammer_werfer', {}, (m) => typeof m.hand === 'function' && m.root.userData.modelName)]; }
    if (has('wuschel_horde')) { const h = box('wuschel_horde', { count: 20, width: 6, depth: 2.5 }, 'chase'); out.horde = [h.z, h.x]; }
    if (has('schubser_prinz')) {
      const i = box('schubser_prinz', {}, 'idle'), d = box('schubser_prinz', {}, { anim: 'defeated', progress: 1 });
      const mo = with_('schubser_prinz', {}, (m) => { for (let k = 0; k < 10; k++) m.update(1 / 30, { anim: 'fireball', progress: 0.5 }); return [typeof m.mouth === 'function' ? v3(m.mouth()) : null, m.root.userData.radius]; });
      out.prinz = [i.y, i.x, i.minY, d.maxY, mo];
    }
    if (has('wuerfelblase')) {
      const i = box('wuerfelblase', {}, 'idle'), s = box('wuerfelblase', { size: 2 }, 'idle'), sp = box('wuerfelblase', {}, { anim: 'split', progress: 1 });
      const hat = with_('wuerfelblase', {}, (m) => { m.update(0.1, 'idle'); return typeof m.hat === 'function' ? v3(m.hat()) : null; });
      out.blase = [i.y, i.x, i.minY, s.x, sp.empty || sp.y < 0.3, hat];
    }
    if (has('gelee_brocken')) { const b = box('gelee_brocken', {}, 'idle'); out.brocken = [b.x, b.y, b.minY]; }
    if (has('gelee_riese')) { const f = box('gelee_riese', { size: 3 }, { form: 1 }), z = box('gelee_riese', { size: 3 }, { form: 0 }); out.riese = [f.x, f.y, f.minY, z.maxY]; }
    if (has('glasroehre_teil')) { const g = box('glasroehre_teil', { kind: 'gerade', length: 4, radius: 1 }, 'idle'), k = box('glasroehre_teil', { kind: 'kreuz', radius: 1 }, 'idle'); out.roehre = [g.x, g.y, g.minX, k.z, k.x]; }
    if (has('stachelkugel')) { const k = box('stachelkugel', { size: 1.2 }, 'idle'); out.kugel = [k.x, k.y, k.minY]; }
    if (has('geisterschiff')) { const r = box('geisterschiff', { part: 'rumpf', length: 10, width: 4, height: 3 }, 'idle'), m = box('geisterschiff', { part: 'mast', height: 6 }, 'idle'); out.schiff = [r.x, r.z, r.maxY, r.minY, m.maxY]; }
    if (has('kippsteg')) { const k = box('kippsteg', { length: 8, width: 1 }, { tilt: 0 }); out.steg = [k.x, k.z, k.maxY]; }
    if (has('schiebetuer')) { const a = box('schiebetuer', { width: 2, height: 2.4 }, { open: 0 }); out.tuer = [a.y, a.z, a.minY, a.x]; }
    if (has('gong')) { const g = box('gong', {}, 'idle'); out.gong = [g.y, g.minY]; }
    if (has('pilz_maske')) { const i = box('pilz_maske', {}, 'idle'), c = box('pilz_maske', {}, { anim: 'collected', progress: 1 }), k = box('pilz_maske', { mode: 'kopf', size: 0.5 }, 'idle'); out.maske = [i.minY, i.maxY, c.empty || c.y < 0.05, k.z]; }
    if (has('klettergitter')) { const k = box('klettergitter', { size: [2, 3] }, 'idle'); out.gitter = [k.z, k.y, k.x, k.minY]; }
    if (has('foerderband')) { const f = box('foerderband', { length: 4, width: 2, thick: 0.5 }, { offset: 0 }); out.band = [f.x, f.z, f.maxY, f.minY]; }
    if (has('quetschblock')) { const q = box('quetschblock', { size: [2, 2, 2], rod: 0 }, 'idle'); out.quetsch = [q.x, q.y, q.z, q.minY]; }
    if (has('wurfball')) { const w = box('wurfball', {}, 'idle'); out.ball = [w.y, w.minY]; }
    if (has('riesen_frageblock')) { const a = box('riesen_frageblock', { size: 2, height: 6 }, { grow: 0 }), b = box('riesen_frageblock', { size: 2, height: 6 }, { grow: 1 }); out.frage = [a.x, a.maxY, b.maxY, with_('riesen_frageblock', { size: 2, height: 6 }, (m) => { for (let k = 0; k < 40; k++) m.update(1 / 30, { grow: 0.5 }); return m.root.userData.top; })]; }
    if (has('wippe')) { const w = box('wippe', { length: 6, width: 2 }, { tilt: 0 }); out.wippe = [w.x, w.maxY, w.minY]; }
    if (has('wolkenplattform')) { const w = box('wolkenplattform', { size: [3, 0.6, 3] }, 'idle'); out.wolke = [w.x, w.z, w.maxY, w.minY, with_('wolkenplattform', { size: [3, 0.6, 3] }, (m) => m.root.userData.top)]; }
    return out;
  });
  console.log('  Eigenschaften:', JSON.stringify(props));
  const P = props;
  if (P.schubser) check('Schubser ≈0,9–1,1 m hoch, Ø ≈0,8–1,1 m, Hufe am Boden; size skaliert; defeated → weg; userData.radius', P.schubser[0] > 0.88 && P.schubser[0] < 1.12 && P.schubser[1] > 0.75 && P.schubser[1] < 1.25 && P.schubser[2] > -0.05 && P.schubser[3] && P.schubser[4] > 1.3 && Math.abs(P.schubser[5] - 0.43) < 0.05);
  if (P.puste) check('Pustewolke ≈1,1–1,6 m breit, schwebt über dem Ursprung; blow → wind ≈1, reach ≈4 m', P.puste[0] > 1.0 && P.puste[0] < 1.7 && P.puste[2] > -0.15 && P.puste[3][0] > 0.9 && P.puste[3][1] > 3.5);
  if (P.fisch) check('Glotzfisch ≈0,9–1,2 m lang (mit Schwanzflosse), Bauch am Ursprung', P.fisch[0] > 0.85 && P.fisch[0] < 1.2 && P.fisch[2] > -0.08);
  if (P.igel) check('Stachelwerfer ≈1,0–1,2 m (Kugel vor dem Bauch); hand() vorn, über dem Kopf beim Ausholen; nach dem Wurf leere Hände', P.igel[0] > 0.95 && P.igel[0] < 1.25 && P.igel[1] > -0.05 && P.igel[2][0] > 0.2 && P.igel[2][0] < 0.6 && P.igel[2][3] > 1.0 && P.igel[2][1] && !P.igel[2][2]);
  if (P.werfer) check('Hammer-Werfer aus der Werfer-Familie (≈1,2–1,4 m, hand(), eigener Name)', P.werfer[0] > 1.1 && P.werfer[0] < 1.5 && P.werfer[1] === 'hammer_werfer');
  if (P.horde) check('Wuschel-Horde füllt width × depth', P.horde[0] > 5 && P.horde[0] < 8 && P.horde[1] > 2 && P.horde[1] < 4.5);
  if (P.prinz) check('Schubser-Prinz 2,0–2,8 m (Krone), Hufe am Boden; defeated liegt (< 2,4 m); mouth() vorn; userData.radius', P.prinz[0] > 2.0 && P.prinz[0] < 2.8 && P.prinz[2] > -0.05 && P.prinz[3] < 2.4 && P.prinz[4][0] && P.prinz[4][0][0] > 0.6 && P.prinz[4][1] > 0.8);
  if (P.blase) check('Würfelblase ≈1,2 m Würfel (+ Hut), size skaliert, split → weg; hat() oben', P.blase[0] > 1.3 && P.blase[0] < 2.0 && P.blase[1] > 1.1 && P.blase[1] < 1.6 && P.blase[2] > -0.05 && P.blase[3] > 1.9 && P.blase[4] && P.blase[5] && P.blase[5][1] > 1.1);
  if (P.brocken) check('Gelee-Brocken ≈0,5 m, Ursprung unten', P.brocken[0] > 0.4 && P.brocken[0] < 0.65 && P.brocken[2] > -0.05);
  if (P.riese) check('Gelee-Riese: form 1 = Würfel ≈ size (+ Hut), form 0 = Brocken am Boden verstreut', Math.abs(P.riese[0] - 3) < 0.6 && P.riese[1] > 3 && P.riese[2] > -0.1 && P.riese[3] < 2.2);
  if (P.roehre) check('Glasröhre: gerade = length entlang +X ab Ursprung, Ø ≈ 2·radius; Kreuzung nach ±Z', Math.abs(P.roehre[0] - 4) < 0.35 && P.roehre[1] > 1.9 && P.roehre[1] < 2.5 && P.roehre[2] > -0.2 && Math.abs(P.roehre[3] - 4) < 0.35 && Math.abs(P.roehre[4] - 4) < 0.35);
  if (P.kugel) check('Stachelkugel: Ø ≈ size (mit Stacheln), liegt auf dem Ursprung', Math.abs(P.kugel[0] - 1.2) < 0.2 && P.kugel[2] > -0.05);
  if (P.schiff) check('Geisterschiff-Rumpf: Länge/Breite = opts, Deck bei y ≈ 0, Kiel ≈ −height; Mast ≈ height', Math.abs(P.schiff[0] - 10) < 0.8 && Math.abs(P.schiff[1] - 4) < 0.6 && P.schiff[2] < 1.4 && P.schiff[3] < -2.4 && P.schiff[4] > 5.5 && P.schiff[4] < 7.2);
  if (P.steg) check('Kippsteg: Länge = opts, ≈1 m breit, Oberseite bei y ≈ 0', Math.abs(P.steg[0] - 8) < 0.4 && P.steg[1] > 0.9 && P.steg[1] < 1.6 && P.steg[2] < 0.35);
  if (P.tuer) check('Schiebetür: ≈ height hoch, ≈ width breit (entlang Z), Ursprung unten, flach', P.tuer[0] > 2.3 && P.tuer[0] < 3.0 && P.tuer[1] > 1.9 && P.tuer[1] < 3.2 && P.tuer[2] > -0.05 && P.tuer[3] < 0.6);
  if (P.gong) check('Gong ≈2–3 m hoch, steht auf dem Boden', P.gong[0] > 1.9 && P.gong[0] < 3.2 && P.gong[1] > -0.05);
  if (P.maske) check('Pilz-Maske: Item schwebt (0,2–1,2 m), collected → weg; Kopf-Variante ≈ size breit', P.maske[0] > 0.1 && P.maske[1] < 1.3 && P.maske[2] && P.maske[3] > 0.45 && P.maske[3] < 0.8);
  if (P.gitter) check('Klettergitter: size entlang Z × Y, flach, Ursprung unten', Math.abs(P.gitter[0] - 2) < 0.3 && Math.abs(P.gitter[1] - 3) < 0.3 && P.gitter[2] < 0.35 && P.gitter[3] > -0.08);
  if (P.band) check('Förderband: length × width, Oberseite = thick, Ursprung unten', Math.abs(P.band[0] - 4) < 0.35 && Math.abs(P.band[1] - 2) < 0.35 && Math.abs(P.band[2] - 0.5) < 0.1 && P.band[3] > -0.05);
  if (P.quetsch) check('Quetschblock (rod 0): Maße ≈ size (Mitte im Ursprung)', Math.abs(P.quetsch[0] - 2) < 0.45 && Math.abs(P.quetsch[1] - 2) < 0.3 && Math.abs(P.quetsch[2] - 2) < 0.3 && Math.abs(P.quetsch[3] + 1) < 0.2);
  if (P.ball) check('Wurfball Ø 0,4–0,6 m, liegt auf dem Ursprung', P.ball[0] > 0.38 && P.ball[0] < 0.62 && P.ball[1] > -0.03);
  if (P.frage) check('Riesen-?-Block: 2 m, grow 1 = Turm (Oberkante ≈ height + size), userData.top', Math.abs(P.frage[0] - 2) < 0.25 && Math.abs(P.frage[1] - 2) < 0.25 && P.frage[2] > 7.5 && P.frage[2] < 8.6 && P.frage[3] > 4);
  if (P.wippe) check('Wippe: Länge = opts, Brett-Oberseite bei y ≈ 0, Bock bis zum Boden', Math.abs(P.wippe[0] - 6) < 0.4 && P.wippe[1] < 0.3 && P.wippe[2] < -0.9);
  if (P.wolke) check('Wolkenplattform: size (Ursprung Mitte unten), userData.top = Oberseite', Math.abs(P.wolke[0] - 3) < 0.6 && Math.abs(P.wolke[1] - 3) < 0.6 && P.wolke[3] > -0.25 && Math.abs(P.wolke[4] - 0.6) < 0.15);

  // Instanz-Helfer
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'wuschel', 'flipper_feld', 'kuerbis']) {
      try {
        const I = cm.inst.createInstanced(kind, 200);
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'gelee_brocken' ? (i % 7 === 0 ? 'hop' : 'idle') : kind === 'stachelkugel' ? { roll: i * 0.1 } : kind === 'foerderband' ? 'idle' : 'idle');
        for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, st(i));
        I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
        I.setState(5, 'idle');
        if (I.setOffset) I.setOffset(0.5);
        for (let k = 0; k < 10; k++) I.update(1 / 30);
        let tris = 0, meshes = 0;
        I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
        const api = ['setAt', 'setState', 'getState', 'hide', 'update', 'dispose'].every((f) => typeof I[f] === 'function') && I.count === 200 && I.getState(3) === 'hidden';
        I.dispose();
        out[kind] = { meshes, tris: Math.round(tris), api, detached: !I.root.parent };
      } catch (e) { out[kind] = { error: e.message }; }
    }
    return out;
  }, INST_W6);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST_W6.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST_W6.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
  const heavyI = INST_W6.filter((k) => instInfo[k] && instInfo[k].tris / 200 > 1500);
  check(`Instanzen sparsam (≤ 1,5 k Dreiecke je Stück)${heavyI.length ? ` (zu viel: ${heavyI.map((k) => `${k}=${Math.round(instInfo[k].tris / 200)}`).join(', ')})` : ''}`, heavyI.length === 0);
  check('Instanz-Helfer: alte Arten unverändert (coin, wuschel, flipper_feld, kuerbis)', ['coin', 'wuschel', 'flipper_feld', 'kuerbis'].every((k) => instInfo[k] && !instInfo[k].error));
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
  await gallery('enemies', ENEMIES, 0.2, 0.6, 6);
  await gallery('groups', GROUPS, 0.3, 0.6, 5);
  await gallery('bosses', BOSSES, 0.2, 0.8, 3);
  await gallery('gimmicks', GIMMICKS, 0.3, 0.6, 5);
  await gallery('kulisse1', KULISSE1, 0.2, 0.8, 5);
  await gallery('kulisse2', KULISSE2, 0.2, 0.8, 5);
  await gallery('kulisse3', KULISSE3, 0.2, 0.6, 5);
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cm6_st_<name>.png)
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
    ['schubser', {}, 'idle', 0.55, 2.4], ['pustewolke', {}, { anim: 'blow', power: 0.8 }, 1.2, 3.4], ['glotzfisch', {}, 'swim', 0.35, 1.9],
    ['stachelwerfer', {}, 'idle', 0.8, 2.8], ['schubser_prinz', {}, 'idle', 1.2, 5.5], ['wuerfelblase', {}, 'idle', 0.9, 3.4],
    ['gelee_riese', {}, { form: 1 }, 2.0, 9], ['gong', {}, 'idle', 1.4, 4.5], ['quetschblock', {}, { warn: 0.6 }, 1.0, 5],
    ['pilz_maske', {}, 'idle', 0.6, 1.8], ['wurfball', {}, 'idle', 0.25, 1.3], ['stachelkugel', { size: 1 }, 'idle', 0.5, 2.6],
    ['papierlaterne', { color: 'rot' }, 'idle', 1.5, 3.2], ['giftbluete', {}, 'idle', 0.7, 2.4], ['windboe_fahne', {}, { wind: 1, dir: 0.5 }, 2.1, 4.2],
    ['gelee_brocken', { color: 'gruen' }, 'idle', 0.25, 1.6], ['glasroehre_kreuzung', {}, 'idle', 1, 7], ['wolkenplattform', {}, 'step', 0.4, 4.5],
    ['schubser_prinz', {}, 'charge', 1.2, 6.5, Math.PI / 2 + 0.6], ['wippe', { length: 4 }, { tilt: 0.25 }, 0.2, 5.5], ['foerderband', { length: 3, width: 2 }, { offset: 0.3 }, 0.4, 4.5],
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
        cam.position.set(c.x + p.d * 0.35, c.y + p.y + p.d * 0.22, c.z + p.d);
        cam.lookAt(c.x, c.y + p.y, c.z);
        v.world.lighting.update(new T.Vector3(c.x, p.y, 0));
        r.setViewport(k * w, 0, w, size.y); r.setScissor(k * w, 0, w, size.y);
        r.render(v.three, cam);
      });
      r.setScissorTest(false); r.setViewport(0, 0, size.x, size.y);
      cam.aspect = aspect0; cam.updateProjectionMatrix();
      cm.labels.innerHTML = '';
    });
    await page.waitForTimeout(60);
    await page.screenshot({ path: `${OUT}cm6_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const LINEUPS = [ENEMIES, [BOSSES[0], BOSSES[1], BOSSES[3], GIMMICKS[21], GIMMICKS[15]], [GIMMICKS[5], GIMMICKS[13], GIMMICKS[14], GIMMICKS[18], GIMMICKS[20]],
    [KULISSE1[1], KULISSE2[0], KULISSE2[3], KULISSE3[0], KULISSE3[2], KULISSE3[7]]];
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

  // Kurs-Sicht: Kamera 13 m, Neigung 45°, FOV 45° – Wolkeninsel mit Gegnern, Gimmicks und Kulisse
  const COURSE_FIG = [ENEMIES[0], ENEMIES[1], ENEMIES[2], ENEMIES[3], ENEMIES[4], ENEMIES[5], GIMMICKS[5], GIMMICKS[15], GIMMICKS[21], BOSSES[3], GIMMICKS[24], GROUPS[0]];
  const COURSE_DECO = [['bergkiefer', { height: 5 }, 'idle', -9.5, -7, 0], ['wolkenfels', { size: 3 }, 'idle', 9, -8, -2.2], ['kirschbaum', { height: 4 }, 'idle', 8.5, -1, -2.4],
    ['papierlaterne', { color: 'rot' }, 'idle', -8, -1.5, 0.6], ['giftbluete', {}, 'idle', -6.5, 2.5, 0.3], ['riesenblatt', { size: 2 }, 'idle', 6, 3, 0.5],
    ['glasroehre_teil', { kind: 'gerade', length: 6 }, 'idle', -4, -10, 0], ['glasroehre_teil', { kind: 't' }, 'idle', 2, -10, 0], ['wolkenberg', { size: 10, height: 5 }, 'idle', 0, -19, 0],
    ['riesen_frageblock', {}, { grow: 0.4 }, 11, -12, 0], ['zahnrad', { radius: 1.2 }, 'idle', -11.5, -12, 0]];
  if (want('course')) {
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
    if (ONLY && !ONLY.includes('course')) ONLY.push('course');
    await shot('course');
  }

  // Themen-Szenen (Kurs-Kamera 45°/13 m): Geisterschiff, Fernost-Halle, Dschungel, Maschinenhalle + Mine
  const SCENES = {
    scene_schiff: ['daemmer', [['geisterschiff', { part: 'ganz', length: 12, width: 5 }, 'idle', -3, -6, -Math.PI / 2 + 0.2, 2.2], ['geisterschiff_wrack', {}, 'idle', 8, -9, -0.6, 0],
      ['kippsteg', { length: 6 }, { tilt: 0.15 }, 4, -1, 0, 1.2], ['schubser', {}, 'charge', 2, 1.5, 0.4, 0], ['schubser', {}, 'idle', -3, 2.5, -0.6, 0], ['geisterschiff', { part: 'laterne' }, 'idle', 6, 2, 0, 1.8],
      ['geisterschiff_wrack', { kind: 'mast' }, 'idle', -10, -2, 0.4, 0]]],
    scene_fernost: ['tag', [['fernost_dach', { width: 7, depth: 4 }, 'idle', -2, -8, 0, 3], ['schiebetuer', { width: 2.4 }, { open: 0.4, hint: true }, -4, -2, 0, 0], ['schiebetuer', { width: 2.4 }, { open: 0 }, -4, 0.6, 0, 0],
      ['gong', {}, { ring: 0.5 }, 3, -4, -Math.PI / 2, 0], ['papierlaterne', { color: 'rot' }, 'idle', 6, -1, 0, 0], ['papierlaterne', { mount: 'haengend', color: 'weiss' }, 'idle', 0, 0, 0, 2.8],
      ['kirschbaum', { height: 4.5 }, 'idle', 8, -7, 0, 0], ['holzbruecke', { length: 7 }, 'idle', -2, 4, 0, 0], ['pilz_maske', {}, 'idle', 2, 1.5, 0, 0.3], ['stachelwerfer', {}, 'idle', 5, 2.5, -2.6, 0]]],
    scene_dschungel: ['tag', [['riesenblatt', { size: 3 }, 'idle', -7, -4, 0, 0], ['riesenblatt', { size: 2.2 }, 'idle', 7, -2, 2, 0], ['dschungel_liane', { length: 5 }, 'idle', -2, -5, 0, 5.4],
      ['dschungel_liane', { length: 3.5 }, 'idle', 3, -6, 1, 4], ['giftbluete', { size: 1.4 }, 'idle', 5, 2, 0, 0], ['klettergitter', { size: [4, 3] }, 'idle', 0, -7, -Math.PI / 2, 0], ['giftbluete', {}, 'idle', -5, 3, 0, 0]]],
    scene_halle: ['halle', [['zahnrad', { radius: 2 }, { speed: 0.4 }, -6, -8, -Math.PI / 2, 2.2], ['zahnrad', { radius: 1.2, color: 'stahl' }, { speed: -0.6 }, -3.3, -8.2, -Math.PI / 2, 2.7], ['kessel', {}, { steam: true }, 6, -7, -2.4, 0],
      ['rohrleitung', { kind: 'gerade', length: 6 }, 'idle', -2, -4, 0, 0.4], ['rohrleitung', { kind: 'ventil' }, 'idle', 4, -4, 0, 0.4], ['foerderband', { length: 6, width: 2 }, { offset: 0.3 }, 0, 1, 0, 0],
      ['quetschblock', {}, { warn: 0.5 }, -6, 2, 0, 1.05], ['wippe', { length: 6 }, { tilt: 0.2 }, 6, 2.5, 0, 1.1], ['schacht_geruest', { height: 5 }, 'idle', 10, -10, 0, 0], ['wuschel_horde', { count: 14, width: 4, depth: 1.5 }, 'chase', -1, 5, 0, 0]]],
  };
  for (const [nm, [mood, list]] of Object.entries(SCENES)) {
    if (!want(nm) && !want('scenes')) continue;
    await sc(([list, mood]) => {
      const cm = window.__cm; cm.clear(); cm.mood(mood);
      list.filter(([n]) => cm.reg.hasModel(n)).forEach(([n, o, s, x, z, yaw, y]) => { const m = cm.put(n, o, s, x, z, yaw, 24, null); if (y !== undefined) m.root.position.y = y; });
      cm.cam([0, 0.6, -2.5], 45 * Math.PI / 180, 13, 45);
    }, [list, mood]);
    if (ONLY && !ONLY.includes(nm)) ONLY.push(nm);
    await shot(nm);
    await sc(() => window.__cm.mood('tag'));
  }

  // Instanz-Feld: Gelee-Brocken, Klettergitter, Förderbänder, Stachelkugeln, Bergkiefern (Kurs-Kamera)
  if (want('instanced')) {
    await sc(() => {
      const cm = window.__cm; cm.clear();
      const T = cm.THREE, p = new T.Vector3();
      const sets = [];
      const mk = (k, n, o) => { try { const I = cm.inst.createInstanced(k, n, o); cm.stage.add(I.root); sets.push(I); return I; } catch (e) { console.log(e.message); return null; } };
      const gb = mk('gelee_brocken', 12, { color: 'rot' }), gb2 = mk('gelee_brocken', 8, { color: 'gruen' }), kg = mk('klettergitter', 8, {}), fb = mk('foerderband', 6, {}), sk = mk('stachelkugel', 6, {}), bk = mk('bergkiefer', 8, {});
      if (gb) for (let i = 0; i < 12; i++) gb.setAt(i, p.set(-11 + (i % 6) * 0.9, 0, 1 + Math.floor(i / 6) * 0.9), i * 0.4, 1, i % 3 ? 'idle' : 'hop');
      if (gb2) for (let i = 0; i < 8; i++) gb2.setAt(i, p.set(-5 + i * 0.8, 0, 2.5), i, 0.8, 'idle');
      if (kg) for (let i = 0; i < 8; i++) kg.setAt(i, p.set(-4 + (i % 4) * 1, Math.floor(i / 4) * 1, -6), -Math.PI / 2, 1, 'idle');
      if (fb) { for (let i = 0; i < 6; i++) fb.setAt(i, p.set(2 + i * 1, 0, -1), 0, 1, 'idle'); if (fb.setOffset) fb.setOffset(0.4); }
      if (sk) for (let i = 0; i < 6; i++) sk.setAt(i, p.set(3 + i * 1.3, 0, 2.5), 0, 1, { roll: i });
      if (bk) for (let i = 0; i < 8; i++) bk.setAt(i, p.set(-12 + i * 3.2, 0, -11 - (i % 2) * 2), i, 0.8 + (i % 3) * 0.2, 'idle');
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
