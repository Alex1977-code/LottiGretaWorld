// Galerie und Prüfung der Welt-5-Modelle (src/course/models/kinds/*_w5.js, Instanzen aus lib/instanced_w5.js).
//
// Wie tests/course_models_w4.mjs: lädt das 3D-Klassik-Level über einen Vite-Entwicklungsserver, hält die
// Spielschleife an, räumt die Szene frei und stellt die Modelle auf einem lila-sandfarbenen 1-m-Schachbrett auf.
// Bilder tests/out/cm5_*.png: Galerien je Gruppe, Zustände je Modell, Nahaufnahmen, Größenvergleich (1-m-Würfel,
// Heldin auf 1 m skaliert), Kurs-Kamera-Ansicht (13 m, 45° Neigung, FOV 45°) und ein Instanz-Feld.
// Prüfungen: alle Namen registriert (kein doppelter Name), jedes Modell baut, update() mit allen Zuständen,
// ≤ 12 Meshes, Dreiecke (Gegner 1,5–10 k, Boss ≤ 20 k, Kulisse ≤ 30 k), dispose() ohne Fehler (root hängt danach nicht
// mehr), kein Geometrie-Leck bei Bau/Abbau, Zustands-/Größen-Eigenschaften, Instanz-Helfer (neu und alt), keine
// Konsolenfehler.
//
// Aufruf: PORT_BASE=3300 node tests/course_models_w5.mjs   (kein Build nötig; CM_ONLY=a,b nur bestimmte Bilder,
//         CM_ONLY=none → keine Bilder; CM_PART=checks|gallery|states|views → nur dieser Teil, für kurze Läufe;
//         CM_GROUPS=enemies,strand … → nur diese Galerie-Gruppen)
import { createServer } from 'vite';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4460 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const ONLY = process.env.CM_ONLY ? process.env.CM_ONLY.split(',') : null;
const PART = process.env.CM_PART ?? 'all';
const part = (p) => PART === 'all' || PART.split(',').includes(p);
const GROUPS_ONLY = process.env.CM_GROUPS ? process.env.CM_GROUPS.split(',') : null;
const groupOn = (g) => !GROUPS_ONLY || GROUPS_ONLY.includes(g);

// ------------------------------------------------------------------ Modellliste mit Zuständen
// [name, opts, Galerie-Zustand, alle Zustände für den Durchlauf]
const ENEMIES = [
  ['sandtaucher', {}, 'peek', ['hide', { anim: 'hide', speed: 2 }, 'peek', { anim: 'jump', progress: 0.22 }, { anim: 'jump', progress: 0.5 }, { anim: 'jump', progress: 0.8 }, 'squashed']],
  ['zuendkopf', {}, 'walk', ['walk', 'idle', 'lit', 'blink', { anim: 'explode', progress: 0.08 }, { anim: 'explode', progress: 0.35 }, 'carried', 'thrown']],
  ['feuerring', { radius: 3 }, { anim: 'pulse', progress: 0.55 }, ['idle', { anim: 'pulse', progress: 0.25 }, { anim: 'pulse', progress: 0.7 }, 'off', { anim: 'idle', radius: 2, angle: 1 }]],
  ['hackbeil_pilz', {}, 'idle', ['idle', { anim: 'hop', progress: 0.5 }, 'raise', { anim: 'chop', progress: 0.6 }, { anim: 'chop', progress: 1 }, 'stuck', 'squashed']],
  ['funkenling', {}, 'move', ['move', 'idle', 'defeated']],
];
const GROUPS = [
  ['sandtaucher', { ground: 'wasser' }, 'hide', ['hide', 'peek']],
  ['funkenling', { color: 'blau' }, 'idle', ['idle', 'move']],
  ['funkenling', { color: 'pink' }, 'move', ['move']],
  ['feuerring', { radius: 2.5, color: 'blau' }, { anim: 'pulse', progress: 0.5 }, [{ anim: 'pulse', progress: 0.5 }]],
];
const BOSSES = [
  ['kippquader_koenig', {}, 'idle', ['idle', 'walk', { anim: 'tilt', progress: 0.45 }, { anim: 'tilt', progress: 1 }, 'land', 'hit', 'stunned', { anim: 'rise', progress: 0.5 }, { anim: 'idle', hp: 1 }, 'defeated']],
  ['kippquader_koenig', { marker: true }, { anim: 'tilt', progress: 0.3 }, [{ anim: 'tilt', progress: 0.3 }, { anim: 'idle', mark: 0.6 }]],
  ['kippquader', {}, 'idle', ['idle', 'warn', { anim: 'tip', k: 0.5 }, 'land']],
  ['kippquader', { hole: [1.4, 1.6], size: [2.4, 3.4, 1.4] }, 'warn', ['idle', 'warn']],
  ['kippquader', { front: '+x', style: 'stein', size: [2, 3, 1.6] }, 'idle', ['idle', 'warn']],
  ['landemarke', { size: [3.6, 3.4] }, { k: 1 }, [{ k: 0 }, { k: 0.5 }, { k: 1 }]],
];
const GIMMICKS = [
  ['schluesselmuenze', {}, 'idle', ['idle', 'collected']],
  ['trapez', { length: 3, width: 1.2 }, { angle: 0.4 }, [{ angle: 0 }, { angle: 0.6, rider: true }]],
  ['pendelplattform', { size: [3, 2.2], thick: 0.4, length: 4 }, { theta: 0.3 }, [{ theta: 0 }, { theta: -0.5 }]],
  ['drehbruecke', { length: 8, width: 2.4 }, 'idle', [{ warn: false }, { warn: true }, { turning: true }]],
  ['roehrenkanone', { height: 2.2, radius: 1 }, 'idle', ['idle', { anim: 'load', k: 0.7 }, { anim: 'fire', fire: 0.4 }]],
  ['flipper_feld', { color: 'rot', size: [2, 2], thick: 0.35 }, { flip: 0 }, [{ flip: 0 }, { flip: 0.5 }, { flip: 1 }]],
  ['flipper_feld', { color: 'blau', size: [2, 2], thick: 0.35, back: 'farbe' }, { flip: 0 }, [{ flip: 0 }, { flip: 1 }]],
  ['schiebekugel', { size: 1.6 }, { roll: 0.5 }, [{ roll: 0 }, { roll: 2, speed: 3 }]],
  ['suchscheinwerfer', { mount: true }, { aim: [0.3, -0.4] }, [{ aim: [0, -0.3] }, { aim: [0.5, -0.6], alarm: true }, { seen: true }]],
  ['donut_block', { color: 'rosa' }, 'idle', ['idle', 'shake', 'fall']],
  ['goldzug_waggon', { kind: 'lok' }, { anim: 'drive', speed: 4 }, ['idle', { anim: 'drive', speed: 6 }]],
  ['goldzug_waggon', { kind: 'wagen' }, 'idle', ['idle', { anim: 'drive', speed: 6 }]],
  ['push_switch_gold', {}, 'idle', ['idle', 'pressed']],
];
const STRAND = [
  ['sandskulptur_pilzling', { height: 2.6 }, 'idle', ['idle', { anim: 'crumble', progress: 0.5 }]],
  ['sandskulptur_pilzling', { height: 2.2, hole: false }, 'idle', ['idle']],
  ['strandkorb', { color: 'blau' }, 'idle', ['idle']],
  ['sonnenschirm', { color: 'lila' }, 'idle', ['idle', { sway: 1 }]],
  ['liegestuhl', { color: 'rot' }, 'idle', ['idle']],
  ['muschel', { kind: 'faecher' }, 'idle', ['idle']],
  ['muschel', { kind: 'schnecke' }, 'idle', ['idle']],
  ['muschel', { kind: 'stern' }, 'idle', ['idle']],
  ['palme', {}, 'idle', ['idle']],
];
const SAVANNE = [
  ['akazie', { height: 5 }, 'idle', ['idle']],
  ['termitenhuegel', { height: 2.5 }, 'idle', ['idle']],
  ['felsenberg', { radius: 5, height: 6 }, 'idle', ['idle']],
  ['steppengras', {}, 'idle', ['idle']],
  ['giraffe', {}, 'idle', ['idle', 'walk']],
  ['zebra', {}, 'idle', ['idle', 'walk']],
  ['elefantenkind', {}, 'idle', ['idle', 'walk']],
];
const MINE = [
  ['holzbalken', { width: 3, height: 3 }, 'idle', ['idle']],
  ['holzbalken', { kind: 'balken', length: 3 }, 'idle', ['idle']],
  ['lore', { load: 'erz' }, 'idle', ['idle', { anim: 'drive', speed: 3 }]],
  ['schiene_stueck', { length: 4 }, 'idle', ['idle']],
  ['grubenlaterne', {}, 'idle', ['idle']],
  ['grubenlaterne', { hang: true }, 'idle', ['idle', { sway: 1 }]],
  ['lila_ziegel', {}, 'idle', ['idle', 'shake', { anim: 'break', progress: 0.3 }]],
];
const TORTE = [
  ['torten_plateau', { radius: 3, height: 2 }, 'idle', ['idle']],
  ['torten_plateau', { shape: 'eckig', size: [4, 1.6, 3], color: 'schoko' }, 'idle', ['idle']],
  ['sahnetupfer', {}, 'idle', ['idle']],
  ['torten_kerze', { height: 1.2 }, 'idle', ['idle']],
  ['erdbeere', {}, 'idle', ['idle']],
  ['keks', { kind: 'schoko' }, 'idle', ['idle']],
  ['keks', { kind: 'doppel' }, 'idle', ['idle']],
  ['zuckerstange', { height: 1.6 }, 'idle', ['idle']],
  ['streusel', { radius: 1 }, 'idle', ['idle']],
];
const FESTUNG = [
  ['festungsmauer', { length: 5, height: 3.5 }, 'idle', ['idle']],
  ['zinnen', { length: 4 }, 'idle', ['idle']],
  ['alarmlampe', {}, 'idle', ['idle', { alarm: true }]],
  ['tempelsaeule', { height: 4 }, 'idle', ['idle']],
  ['tempelsaeule', { height: 2.6, broken: true }, 'idle', ['idle']],
  ['steinkopf', {}, 'idle', ['idle']],
  ['tempeltreppe', { steps: 5, width: 3 }, 'idle', ['idle']],
  ['brummbaer_relief', {}, 'idle', ['idle']],
];
const ALL = [...ENEMIES, ...GROUPS, ...BOSSES, ...GIMMICKS, ...STRAND, ...SAVANNE, ...MINE, ...TORTE, ...FESTUNG];
const ENEMY_NAMES = new Set(ENEMIES.map(([n]) => n));
const BOSS_NAMES = new Set(['kippquader_koenig']);
const INST_W5 = ['flipper_feld', 'lila_ziegel', 'donut_block', 'steppengras', 'sahnetupfer'];
const W5_NEW = [...new Set(ALL.map(([n]) => n))].filter((n) => !['palme', 'push_switch_gold'].includes(n)).concat(['donutblock']);

// ------------------------------------------------------------------ Server, Browser
const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-cm5`, logLevel: 'warn', clearScreen: false,
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
  scene.background = new THREE.Color(0xa8d4ff);
  scene.fog = null;
  // Boden: lila-sandfarbenes 1-m-Schachbrett (Strand-Insel), empfängt Schatten
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2dcb8'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e4cba8'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
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
  // hängende/schwebende Modelle (Ursprung oben, in der Mitte oder an der Oberseite) anheben
  const LIFT = {
    trapez: (o) => (o.length ?? 3) + 0.4, pendelplattform: () => 0.6, suchscheinwerfer: (o) => (o.mount ? 1.12 : 1.2), grubenlaterne: (o) => (o.hang ? 2.6 : 0),
    flipper_feld: (o) => (o.thick ?? 1) / 2 + 0.3, kippquader: (o) => (o.size?.[1] ?? 4) / 2, drehbruecke: () => 0.6, alarmlampe: () => 1.6,
    landemarke: () => 0.01,
  };
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
  };
  window.__cm = cm;
});

const shot = async (name) => {
  if (ONLY && !ONLY.includes(name)) return;
  await sc(() => window.__cm.render());
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${OUT}cm5_${name}.png` });
};
const want = (name) => !ONLY || ONLY.includes(name);
const label = (st) => (typeof st === 'string' ? st : Object.entries(st).map(([k, v]) => (k === 'anim' ? v : `${k}=${Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? +x.toFixed(2) : x)).join('/') : v}`)).join(' '));
const optLabel = (n, o) => (Object.keys(o ?? {}).length ? `${n} ${Object.entries(o).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join('×') : v}`).join(' ')}` : n);

// ------------------------------------------------------------------ Prüfungen
if (part('checks')) {
  const names = await sc(() => window.__cm.reg.listModels());
  console.log(`  ${names.length} Modelle registriert`);
  const missing = W5_NEW.filter((n) => !names.includes(n));
  check(`alle ${W5_NEW.length} Welt-5-Namen in listModels()${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}`, missing.length === 0);
  check('wiederverwendet: palme, push_switch_gold vorhanden', names.includes('palme') && names.includes('push_switch_gold'));
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
  const heavyE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && t > 10000);
  check(`Gegner ≤ 10 k Dreiecke${heavyE.length ? ` (zu viel: ${heavyE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, heavyE.length === 0);
  const lightE = Object.entries(cycle.tris).filter(([n, t]) => ENEMY_NAMES.has(base(n)) && t < 1500);
  check(`Gegner ≥ 1,5 k Dreiecke (nicht zu grob)${lightE.length ? ` (zu wenig: ${lightE.map(([n, c]) => `${n}=${c}`).join(', ')})` : ''}`, lightE.length === 0);
  const bossT = Object.entries(cycle.tris).filter(([n]) => BOSS_NAMES.has(base(n))).map(([, t]) => t);
  check(`Boss ≤ 20 k Dreiecke (${bossT.join(', ')})`, bossT.length > 0 && bossT.every((t) => t > 0 && t <= 20000));
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

  // Eigenschaften (Maße und Schnittstellen, nach denen Motor/Gegner/Level programmieren)
  const props = await sc(() => {
    const cm = window.__cm; const out = {}; const T = cm.THREE;
    const has = (n) => cm.reg.hasModel(n);
    const box = (name, opts, st, steps = 60) => { const m = cm.reg.getModel(name, opts); m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); cm.stage.add(m.root); for (let i = 0; i < steps; i++) m.update(1 / 30, st); const b = cm.bounds(m.root); const s = b.getSize(new T.Vector3()); const r = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), maxY: +b.max.y.toFixed(2), minY: +b.min.y.toFixed(2), minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2) }; m.dispose(); return r; };
    const with_ = (name, opts, fn) => { const m = cm.reg.getModel(name, opts); cm.stage.add(m.root); try { return fn(m); } finally { m.dispose(); } };
    if (has('sandtaucher')) { const h = box('sandtaucher', {}, 'hide'), p = box('sandtaucher', {}, 'peek'), j = box('sandtaucher', {}, { anim: 'jump', progress: 0.5 }); out.sand = [h.maxY, p.maxY, j.minY, j.maxY]; }
    if (has('zuendkopf')) { const w = box('zuendkopf', {}, 'walk'), e = box('zuendkopf', {}, { anim: 'explode', progress: 0.3 }), g = box('zuendkopf', {}, { anim: 'explode', progress: 1 }); out.bomb = [w.y, w.minY, e.x, g.x]; }
    if (has('feuerring')) { out.ring = with_('feuerring', { radius: 3 }, (m) => { m.update(0.1, { anim: 'pulse', progress: 0.5 }); const a = m.root.userData.ring; m.update(0.1, { anim: 'idle', radius: 2.2 }); return [+a.toFixed(2), +m.root.userData.ring.toFixed(2), +m.root.userData.flameH.toFixed(2)]; }); }
    if (has('hackbeil_pilz')) {
      const i = box('hackbeil_pilz', {}, 'idle'), c = box('hackbeil_pilz', {}, { anim: 'chop', progress: 1 });
      const bl = with_('hackbeil_pilz', {}, (m) => { for (let k = 0; k < 20; k++) m.update(1 / 30, { anim: 'chop', progress: 1 }); const v = m.root.userData.blade(); return [+v.x.toFixed(2), +v.y.toFixed(2)]; });
      out.chop = [i.maxY, c.maxX, bl[0], bl[1]];
    }
    if (has('funkenling')) { const f = box('funkenling', {}, 'idle'); out.spark = [f.x, f.maxY]; }
    if (has('kippquader_koenig')) {
      const s = box('kippquader_koenig', {}, 'idle'), l = box('kippquader_koenig', {}, 'land');
      const ud = with_('kippquader_koenig', {}, (m) => m.root.userData.lying ?? null);
      out.king = [s.x, s.y, s.z, l.maxY, l.maxX, ud];
    }
    if (has('kippquader')) { const k = box('kippquader', { size: [2, 4, 2] }, 'idle'); out.kq = [k.x, k.y, k.z, k.minY]; }
    if (has('landemarke')) { const k = box('landemarke', { size: [3, 2] }, { k: 1 }); out.mark = [k.x, k.z, k.maxY]; }
    if (has('trapez')) { const t = box('trapez', { length: 3, width: 1.2 }, { angle: 0 }); out.trapez = [t.minY, t.maxY, t.x]; }
    if (has('pendelplattform')) { const p = box('pendelplattform', { size: [3, 2.2], thick: 0.4, length: 4 }, { theta: 0 }); out.pendel = [p.x, p.maxY, p.minY]; }
    if (has('drehbruecke')) { const d = box('drehbruecke', { length: 8, width: 2.4, thick: 0.4 }, 'idle'); out.dreh = [d.x, d.z, d.maxY, d.minY]; }
    if (has('roehrenkanone')) { const r = box('roehrenkanone', { height: 2.2, radius: 1 }, 'idle'); out.kanone = [r.maxY, r.x]; }
    if (has('flipper_feld')) { const a = box('flipper_feld', { size: [2, 2], thick: 0.35 }, { flip: 0 }), u = box('flipper_feld', {}, { flip: 0 }); out.flip = [a.x, a.y, u.x, u.y]; }
    if (has('schiebekugel')) { const k = box('schiebekugel', { size: 1.6 }, { roll: 0 }); out.kugel = [k.x, k.maxY, k.minY]; }
    if (has('donut_block')) { const d = box('donut_block', {}, 'idle'); out.donut = [d.x, d.minY, d.maxY]; out.donutMesh = with_('donut_block', {}, (m) => { const me = m.root.getObjectByProperty('isMesh', true); return !!me && !me.isInstancedMesh; }); }
    if (has('schluesselmuenze')) { const k = box('schluesselmuenze', {}, 'idle'); out.key = [k.maxY, Math.max(k.x, k.z)]; }
    if (has('goldzug_waggon')) { const w = box('goldzug_waggon', { kind: 'wagen' }, 'idle'); out.zug = [w.x, w.z, with_('goldzug_waggon', { kind: 'wagen' }, (m) => m.root.userData.top)]; }
    if (has('lila_ziegel')) { const z = box('lila_ziegel', {}, 'idle'); out.ziegel = [z.x, z.y, z.minY]; }
    return out;
  });
  console.log('  Eigenschaften:', JSON.stringify(props));
  if (props.sand) check('Sandtaucher: versteckt nur Flosse (≤ 0,4 m), Spähen höher, Sprung hebt ihn über den Boden', props.sand[0] < 0.4 && props.sand[1] > props.sand[0] && props.sand[2] > 0.6 && props.sand[3] > 1.4);
  if (props.bomb) check('Zündkopf ≈0,8–1,0 m hoch, Füße am Boden; Explosion breit (> 2 m), danach weg', props.bomb[0] > 0.75 && props.bomb[0] < 1.12 && props.bomb[1] > -0.05 && props.bomb[2] > 2 && props.bomb[3] < 0.1);
  if (props.ring) check('Feuerring: pulse lässt den Ring wachsen, radius überschreibt, Flammen haben Höhe', props.ring[0] > 1.5 && Math.abs(props.ring[1] - 2.2) < 0.01 && props.ring[2] > 0.1);
  if (props.chop) check('Hackbeil-Pilz ≈1,1–1,3 m; chop: Schneide schlägt vorn am Boden auf (blade() x > 0,9 m, y < 0,4 m)', props.chop[0] > 1.05 && props.chop[0] < 1.35 && props.chop[2] > 0.9 && props.chop[3] < 0.4);
  if (props.spark) check('Funkenling Ø ≈0,5–0,8 m', props.spark[0] > 0.45 && props.spark[0] < 0.85);
  if (props.king) check('Kippquader-König 3,5–5 m hoch; land: liegt vorn (+X) flach; userData.lying', props.king[1] > 3.5 && props.king[1] < 5 && props.king[3] < 2.2 && props.king[4] > 3 && !!props.king[5]);
  if (props.kq) check('Kippquader: Maße = size (Mitte im Ursprung)', Math.abs(props.kq[0] - 2) < 0.25 && Math.abs(props.kq[1] - 4) < 0.25 && Math.abs(props.kq[2] - 2) < 0.3 && Math.abs(props.kq[3] + 2) < 0.15);
  if (props.mark) check('Landemarke: Maße = size, flach am Boden', Math.abs(props.mark[0] - 3) < 0.2 && Math.abs(props.mark[1] - 2) < 0.2 && props.mark[2] < 0.15);
  if (props.trapez) check('Trapez: hängt vom Ursprung bis −length (Stange), Breite ≈ width', props.trapez[1] < 0.3 && Math.abs(props.trapez[0] + 3.05) < 0.2 && props.trapez[2] > 1.1 && props.trapez[2] < 1.8);
  if (props.pendel) check('Pendelplattform: Oberseite bei y = 0, Seile bis zur Aufhängung (length)', Math.abs(props.pendel[0] - 3) < 0.4 && props.pendel[1] > 3.6 && Math.abs(props.pendel[2] + 0.4) < 0.15);
  if (props.dreh) check('Drehbrücke: Länge/Breite = opts, Oberseite ≈ y 0', Math.abs(props.dreh[0] - 8) < 0.4 && Math.abs(props.dreh[1] - 2.4) < 0.5 && props.dreh[2] < 0.35 && props.dreh[3] > -0.75);
  if (props.kanone) check('Röhrenkanone: Oberkante ≈ height, Ø ≈ 2·radius', Math.abs(props.kanone[0] - 2.2) < 0.25 && props.kanone[1] > 1.9 && props.kanone[1] < 2.6);
  if (props.flip) check('Flipper-Feld: Maße = size × thick (Zeichen/Knöpfe stehen ≤ 0,12 m vor); Standard Einheitswürfel', Math.abs(props.flip[0] - 2) < 0.1 && props.flip[1] > 0.34 && props.flip[1] < 0.48 && Math.abs(props.flip[2] - 1) < 0.06 && props.flip[3] > 0.99 && props.flip[3] < 1.13);
  if (props.kugel) check('Schiebekugel: Ø = size, liegt auf dem Ursprung', Math.abs(props.kugel[0] - 1.6) < 0.15 && Math.abs(props.kugel[1] - 1.6) < 0.15 && props.kugel[2] > -0.05);
  if (props.donut) check('Donut-Block 1 m, Ursprung = Mitte der Unterseite, erstes Mesh trägt den Look', Math.abs(props.donut[0] - 1) < 0.08 && Math.abs(props.donut[1]) < 0.03 && props.donut[2] < 1.15 && props.donutMesh);
  if (props.key) check('Schlüsselmünze: groß (Ø 0,8–1 m), schwebt über dem Fußpunkt', props.key[1] > 0.8 && props.key[1] < 1.05 && props.key[0] < 1.1);
  if (props.zug) check('Goldzug-Wagen 3 m breit, userData.top gesetzt', Math.abs(props.zug[1] - 3) < 0.4 && props.zug[2] > 1.5);
  if (props.ziegel) check('Lila Ziegel: 1-m-Block, Ursprung unten', Math.abs(props.ziegel[0] - 1) < 0.1 && Math.abs(props.ziegel[1] - 1) < 0.1 && Math.abs(props.ziegel[2]) < 0.03);

  // Instanz-Helfer (neue Arten + Rückwärtskompatibilität)
  const instInfo = await sc((kinds) => {
    const cm = window.__cm; const out = {};
    for (const kind of [...kinds, 'coin', 'question_block', 'piep_block', 'ameisensoldat']) {
      try {
        const I = cm.inst.createInstanced(kind, 200);
        cm.stage.add(I.root);
        const p = new cm.THREE.Vector3();
        const st = (i) => (kind === 'flipper_feld' ? { flip: (i % 3) / 2 } : kind === 'piep_block' ? { on: i % 2 } : kind === 'lila_ziegel' ? (i % 9 === 0 ? 'break' : i % 5 === 0 ? 'shake' : 'idle') : kind === 'donut_block' ? (i % 4 === 0 ? 'shake' : 'idle') : kind === 'ameisensoldat' ? 'walk' : 'idle');
        for (let i = 0; i < 200; i++) I.setAt(i, p.set((i % 20) * 1.2 - 12, 0, -Math.floor(i / 20) * 1.2), i * 0.1, 1, st(i));
        I.setAt(3, p.set(0, 0, 0), 0, 1, 'hidden');
        I.setState(5, 'idle');
        if (kind === 'flipper_feld') { I.setAt(6, p.set(0, 0, 0), 0, [2, 0.35, 2], { flip: 1 }); if (I.setAll) I.setAll({ flip: 0 }); }
        for (let k = 0; k < 10; k++) I.update(1 / 30);
        let tris = 0, meshes = 0;
        I.root.traverse((o) => { if (o.isInstancedMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * o.count; } });
        const api = ['setAt', 'setState', 'getState', 'hide', 'update', 'dispose'].every((f) => typeof I[f] === 'function') && I.count === 200 && I.getState(3) === 'hidden';
        I.dispose();
        out[kind] = { meshes, tris: Math.round(tris), api, detached: !I.root.parent };
      } catch (e) { out[kind] = { error: e.message }; }
    }
    return out;
  }, INST_W5);
  console.log('  Instanz-Helfer (200 Stück):', JSON.stringify(instInfo));
  check(`Instanz-Helfer für ${INST_W5.join(', ')} (≤ 3 Meshes, API wie gehabt)`, INST_W5.every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes >= 1 && instInfo[k].meshes <= 3 && instInfo[k].api && instInfo[k].detached));
  const heavyI = INST_W5.filter((k) => instInfo[k] && instInfo[k].tris / 200 > 1200);
  check(`Instanzen sparsam (≤ 1,2 k Dreiecke je Stück)${heavyI.length ? ` (zu viel: ${heavyI.map((k) => `${k}=${Math.round(instInfo[k].tris / 200)}`).join(', ')})` : ''}`, heavyI.length === 0);
  check('Instanz-Helfer: alte Arten unverändert (coin, question_block, piep_block, ameisensoldat)', ['coin', 'question_block'].every((k) => instInfo[k] && !instInfo[k].error && instInfo[k].meshes === 2) && ['piep_block', 'ameisensoldat'].every((k) => instInfo[k] && !instInfo[k].error));
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
  await gallery('enemies', ENEMIES, 0.2, 0.6, 5);
  await gallery('groups', GROUPS, 0.3, 0.6, 4);
  await gallery('bosses', BOSSES, 0.2, 0.8, 3);
  await gallery('gimmicks', GIMMICKS, 0.3, 0.6, 4);
  await gallery('strand', STRAND, 0.25, 0.6, 5);
  await gallery('savanne', SAVANNE, 0.25, 0.8, 4);
  await gallery('mine', MINE, 0.25, 0.6, 4);
  await gallery('torte', TORTE, 0.25, 0.5, 5);
  await gallery('festung', FESTUNG, 0.25, 0.8, 4);
}

// Zustände: je Modell ein Bild mit allen Zuständen nebeneinander (cm5_st_<name>.png)
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
    ['sandtaucher', {}, { anim: 'jump', progress: 0.45 }, 1.3, 2.6], ['zuendkopf', {}, 'idle', 0.45, 1.9], ['hackbeil_pilz', {}, 'idle', 0.6, 2.4],
    ['funkenling', {}, 'idle', 0.35, 1.6], ['feuerring', { radius: 2 }, { anim: 'pulse', progress: 0.3 }, 0.3, 3.6], ['kippquader_koenig', {}, 'idle', 2.2, 8.5],
    ['kippquader', { front: '+x' }, 'warn', 2.0, 7], ['giraffe', {}, 'idle', 2.2, 6.5], ['elefantenkind', {}, 'idle', 0.9, 3.8],
  ];
  for (let i = 0; i < PORTRAITS.length; i += 3) {
    const nm = `portrait_${i / 3 + 1}`;
    if (!want(nm) && !want('portrait')) continue;
    await sc((list) => {
      const cm = window.__cm; cm.clear();
      list.forEach(([n, o, s, y, d], k) => {
        if (!cm.reg.hasModel(n)) return;
        const m = cm.put(n, o, s, (k - 1) * 40, 0, -Math.PI / 2 + 0.45, 30, null);
        if (n === 'kippquader') m.root.position.y = 2;
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
    await page.screenshot({ path: `${OUT}cm5_${nm}.png` });
  }

  // Größenvergleich: 1-m-Würfel und Heldin (auf 1 m skaliert)
  const LINEUPS = [ENEMIES, [BOSSES[0], BOSSES[2], GIMMICKS[0], GIMMICKS[9]], [GIMMICKS[4], GIMMICKS[7], GIMMICKS[8], STRAND[0], STRAND[2], STRAND[3]], SAVANNE.slice(4).concat([SAVANNE[1], SAVANNE[0]])];
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

  // Kurs-Sicht: Kamera 13 m, Neigung 45°, FOV 45° – kleine Strand-/Torten-Szene mit Gegnern und Requisiten
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
    }, [ENEMIES.concat([GIMMICKS[0], GIMMICKS[9], GIMMICKS[4], GIMMICKS[7], BOSSES[2]]).map(([n, o, s]) => [n, o, s]),
      [['palme', {}, 'idle', -9.5, -6, 0], ['sandskulptur_pilzling', { height: 2.6 }, 'idle', 9, -8, -2.2], ['strandkorb', { color: 'blau' }, 'idle', 8.5, -1, -2.4],
        ['sonnenschirm', { color: 'lila' }, 'idle', -8, -1.5, 0.6], ['liegestuhl', { color: 'rot' }, 'idle', -6.5, 2.5, 0.3], ['muschel', { kind: 'faecher' }, 'idle', 6, 3, 0.5],
        ['torten_plateau', { radius: 2.2, height: 1.2 }, 'idle', -4, -10, 0], ['zuckerstange', { height: 1.6 }, 'idle', 4, -10, 0], ['akazie', { height: 5 }, 'idle', 12, -13, 0], ['muschel', { kind: 'stern' }, 'idle', -3, 3.5, 0.5]]]);
    if (ONLY && !ONLY.includes('course')) ONLY.push('course');
    await shot('course');
    await sc(() => { const cm = window.__cm; cm.cam([0, 0.4, -3.2], 45 * Math.PI / 180, 16, 45); for (const m of cm.live) m.label = null; });
    if (ONLY && !ONLY.includes('course_far')) ONLY.push('course_far');
    await shot('course_far');
  }

  // Instanz-Feld: Flipper (rot/blau, umgeklappt), lila Ziegelwand, Donut-Reihe, Steppengras, Sahnetupfer (Kurs-Kamera)
  if (want('instanced')) {
    await sc(() => {
      const cm = window.__cm; cm.clear();
      const T = cm.THREE, p = new T.Vector3();
      const sets = [];
      const mk = (k, n, o) => { try { const I = cm.inst.createInstanced(k, n, o); cm.stage.add(I.root); sets.push(I); return I; } catch { return null; } };
      const red = mk('flipper_feld', 12, { color: 'rot' }), blue = mk('flipper_feld', 12, { color: 'blau' });
      const wall = mk('lila_ziegel', 24), donut = mk('donut_block', 8, { color: 'rosa' }), grass = mk('steppengras', 30), cream = mk('sahnetupfer', 16);
      for (let i = 0; i < 24; i++) {
        const ix = i % 6, iz = Math.floor(i / 6), set = (ix + iz) % 2 ? blue : red;
        if (!set) continue;
        const j = set === red ? Math.floor(i / 2) : Math.floor(i / 2);
        set.setAt(j, p.set(-10 + ix * 2.05, 0.175, 1 - iz * 2.05), 0, [2, 0.35, 2], { flip: set === blue ? 1 : 0 });
      }
      if (wall) for (let i = 0; i < 24; i++) wall.setAt(i, p.set(2 + (i % 6), Math.floor(i / 6), -4), 0, 1, i === 7 ? 'break' : 'idle');
      if (donut) for (let i = 0; i < 8; i++) donut.setAt(i, p.set(2 + i * 1.05, 0, 1), 0, 1, i === 3 ? 'shake' : 'idle');
      if (grass) for (let i = 0; i < 30; i++) grass.setAt(i, p.set(-12 + (i % 10) * 1.3 + Math.sin(i) * 0.4, 0, -7 - Math.floor(i / 10) * 1.2), i, 0.8 + (i % 3) * 0.2, 'idle');
      if (cream) for (let i = 0; i < 16; i++) cream.setAt(i, p.set(-10 + (i % 8) * 0.6, 0.35, 2.4 + Math.floor(i / 8) * 0.5), 0, 1, 'idle');
      for (let k = 0; k < 6; k++) for (const s of sets) s.update(1 / 30);
      cm.live.push({ root: new T.Group(), dispose() { for (const s of sets) s.dispose(); } });
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
