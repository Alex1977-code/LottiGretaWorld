// Gemeinsame Hilfen der Welt-3-Level 3-2 „Gitterbahn über den Wolken“ und 3-6 „Gipfelflitzer-Rennen“ (kein Level:
// exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Alles level-lokal über den Level-Haken
// (`LEVEL.setup = levelSetup(fn)`, Präzisierung „Level-Haken“) – keine gemeinsame Datei wird geändert.
//
// 3-2 (Autoscroller mit wechselnder Fahrtrichtung):
//   scrollDirector(level, scene, cfg)  Kamera und Bildfenster je Pfadlänge s statt je z-Abschnitt: Der Autoscroller
//                                      wertet die Kameraschiene an der Fenstermitte (x, z) aus – bei der senkrechten
//                                      Fahrt (Kletteraufstieg) und der seitlichen Fahrt (Wolkenstrecke, nach +X) bleibt
//                                      z gleich, die Schiene könnte die Abschnitte nicht trennen. Der Haken legt deshalb
//                                      rig.railAt (nur solange die Fahrt läuft) auf eine Tabelle über s, setzt die
//                                      Fenstergrenzen (back/front/ahead) je s und schaltet bei senkrechter Fahrt
//                                      backMode 'kill' (unten aus dem Bild = Absturz, statt von einer unsichtbaren
//                                      Grenze getragen zu werden). Nach dem Halt gilt wieder LEVEL.camera.
//   towerBack, digits7, balloon, zeppelin, birds, windmill, pipeLid, pennantLine, slotStrip   Kulisse (3-2)
// 3-6 (Bergrennen):
//   road, curbs, grandstand (Tribüne mit Tierchen, La-Ola), marmots (Murmeltiere schauen aus dem Bau),
//   almHut, cows, tireStack, hayBale, flagLine, finishBanner, checkerBoard   Kulisse (3-6)

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { levelSetup, cyl, sphere, cone, block, flatIslands } from '../w2/_helpers_c.js';
import { SECTION } from '../../view/StaticBatcher.js';

export { levelSetup, cyl, sphere, cone, block, flatIslands };

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// =============================================================================================
// Daten-Helfer
// =============================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder. */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], ...o };
}
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h (zeigt einen Sprung an). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Senkrechte Münzsäule. */
export function column(x, z, y0, y1, n) {
  return { kind: 'coins', from: [x, y0, z], to: [x, y1, z], n };
}

// =============================================================================================
// 3-2: Kamera und Bildfenster je Pfadlänge
// =============================================================================================

/** Lineare Überblendung einer Tabelle [{ s, …Werte }] (sortiert) an s; weich (smoothstep) zwischen Einträgen. */
function sampleTable(table, s, keys, out) {
  let a = table[0], b = table[table.length - 1];
  if (s <= a.s) b = a;
  else if (s >= b.s) a = b;
  else for (let i = 0; i < table.length - 1; i++) if (s >= table[i].s && s <= table[i + 1].s) { a = table[i]; b = table[i + 1]; break; }
  const t = a === b ? 0 : sstep((s - a.s) / (b.s - a.s));
  for (const k of keys) out[k] = (a[k] ?? b[k]) + ((b[k] ?? a[k]) - (a[k] ?? b[k])) * t;
  return out;
}

/**
 * Kamera/Bildfenster des Autoscrollers je Pfadlänge s (siehe Kopfkommentar).
 * cfg.cam:   [{ s, pitch, dist, fov, height }]        Kamera (überblendet; yaw bleibt 0 – frame.turn: false im Level)
 * cfg.frame: [{ s, back, front, ahead, followX }]       Fenstergrenzen (überblendet)
 * cfg.killUp: 0.6                                       backMode 'kill', solange die Fahrtrichtung so steil nach oben zeigt
 * cfg.gates: [{ id, open: s }]                          Glasröhre `id` nimmt die Figur erst ab Pfadlänge s auf
 * cfg.reveal: [{ id, at: s | 'done' }]                  benannte Objekte (Warp-Box) erscheinen ab s bzw. beim Halt
 * cfg.fall: { minS, y, x: [x0, x1] }                    unter y (in diesem X-Bereich, ab Pfadlänge minS) = Absturz
 * Liefert { info() } für Tests.
 */
export function scrollDirector(level, scene, cfg) {
  const w = level.scroll, arch = level.archetype, rig = scene?.view?.rig;
  if (!w || !arch?.frame) return null;
  const camKeys = ['pitch', 'dist', 'fov', 'height'];
  const frameKeys = ['back', 'front', 'ahead', 'followX'];
  const cam = { pitch: 42, dist: 14, fov: 40, height: 1 };
  const st = { s: w.s, mode: arch.frame.backMode, revealed: [], gated: 0, falls: 0 };
  if (rig) {
    const orig = rig.railAt.bind(rig);
    rig.railAt = (x, z, out = {}) => {
      if (w.state === 'done') return orig(x, z, out);
      sampleTable(cfg.cam, w.s, camKeys, cam);
      out.pitch = cam.pitch; out.dist = cam.dist; out.fov = cam.fov; out.height = cam.height;
      out.yaw = 0; out.lead = 1; out.ahead = 2; out.lockX = null; out.lockW = 0;
      return out;
    };
  }
  const gates = (cfg.gates ?? []).map((g) => ({ ...g, net: level.named.get(g.id) }));
  const reveals = (cfg.reveal ?? []).map((r) => ({ ...r, done: false }));
  const fr = arch.frame;
  const apply = () => {
    sampleTable(cfg.frame, w.s, frameKeys, fr);
    fr.backMode = w.state !== 'done' && w.dir.y > (cfg.killUp ?? 0.6) ? 'kill' : 'push';
    st.mode = fr.backMode;
  };
  apply();
  level.onStep(() => {
    st.s = w.s;
    apply();
    // Am Kettenzaun trägt der Zaun selbst (fenceCarry). Das vom Autoscroller „geerbte“ Fahrzeugtempo (Absprung von einer
    // fahrenden Plattform) würde die Figur sonst zusätzlich am Zaun entlangschieben und beim Absprung doppelt zählen.
    if (arch.fstate) {
      for (const p of level.players ?? [level.player]) {
        if (!p?.fence || p.mode !== 'wall') continue;
        const fs = arch.fstate(p);
        if (fs?.inh) { fs.inh.x = 0; fs.inh.z = 0; }
      }
    }
    for (const g of gates) {
      if (!g.net) continue;
      if (w.state !== 'done' && w.s < g.open) { g.net.cool = Math.max(g.net.cool ?? 0, 0.05); st.gated++; }
    }
    for (const r of reveals) {
      if (r.done) continue;
      if ((r.at === 'done' && w.state === 'done') || (typeof r.at === 'number' && w.s >= r.at)) {
        r.done = true;
        const e = level.named.get(r.id);
        e?.reveal?.();
        st.revealed.push(r.id);
        if (r.sfx !== false) level.sfx('powerup_appear');
      }
    }
    // Decke über dem Kletterturm: höher als `up` über der Fenstermitte geht es nicht (sonst schöbe die Vordergrenze
    // die Figur in der Kurve schräg vom Zaun weg) – senkrecht begrenzt, die Figur bleibt am Zaun.
    const cap = cfg.cap;
    if (cap && w.state !== 'done' && w.s >= cap.s0 && w.s <= cap.s1) {
      for (const p of level.players ?? [level.player]) {
        if (!p || p.dead || p.removedFigure || p.mode === 'script') continue;
        if (p.pos.x < cap.x[0] || p.pos.x > cap.x[1] || p.pos.z < cap.z[0] || p.pos.z > cap.z[1]) continue;
        const top = w.center.y + cap.up;
        if (p.pos.y > top) { p.pos.y = top; if (p.vel.y > 0) p.vel.y = 0; st.capped = (st.capped ?? 0) + 1; }
      }
    }
    const f = cfg.fall;
    if (f && w.s >= f.minS) {
      for (const p of level.players ?? [level.player]) {
        if (!p || p.dead || p.removedFigure || p.mode === 'script') continue;
        if (p.pos.y < f.y && p.pos.x > f.x[0] && p.pos.x < f.x[1]) { st.falls++; p.die('fall'); }
      }
    }
  });
  return { st, info: () => ({ s: +w.s.toFixed(2), mode: st.mode, back: fr.back, front: fr.front, revealed: st.revealed.slice(), falls: st.falls }) };
}

/**
 * Fahrende Zäune/Plattformen im Takt der Fahrt-Uhr: Im Autoscroller beginnt nach einem Neustart die Fahrt von vorn bzw.
 * an der Fensterlage des Checkpoints (level.scroll.clock wird zurückgesetzt) – Zäune mit eigenem Pfad liefen dagegen
 * mit der Level-Zeit weiter und kämen aus dem Takt (eine Plattform wäre nicht mehr erreichbar, solange das Fenster
 * vorbeizieht). Hier wird ihr PathMover (pingpong mit wait an beiden Enden) zur reinen Funktion der Fahrt-Uhr:
 * u = (clock + t0) mod T, T = 2·(L/speed + wait); u ∈ [0, wait) am Anfang, dann hin, wait am Ende, zurück.
 * sync = { id: t0 } (Sekunden). Vor der Abfahrt (clock 0) stehen sie an ihrer Anfangslage.
 */
export function clockSync(level, sync) {
  const w = level.scroll;
  if (!w) return;
  for (const [id, t0] of Object.entries(sync ?? {})) {
    const f = level.named.get(id), pm = f?.pm;
    if (!pm || pm.mode === 'loop') continue;
    const L = pm.length, v = pm.speed, wait = pm.wait, tr = L / v, T = 2 * (tr + wait);
    const sAt = (u) => (u < wait ? 0 : u < wait + tr ? (u - wait) * v : u < 2 * wait + tr ? L : L - (u - 2 * wait - tr) * v);
    pm.step = function step() {
      const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
      const u = (((w.clock + t0) % T) + T) % T;
      this.s = clamp(sAt(u), 0, L);
      this.dir = u >= wait && u < wait + tr ? 1 : -1;
      this.at(this.s, this.pos);
      this.delta.dx = this.pos.x - ox; this.delta.dy = this.pos.y - oy; this.delta.dz = this.pos.z - oz;
      return this.delta;
    };
    pm.syncT = T;
    pm.step(0);
    f.pos.set(pm.pos.x, pm.pos.y, pm.pos.z);
    f.placeShapes?.();
  }
}

// =============================================================================================
// Käfer-Schwarm: alle Krabbel-/Flatterkäfer als Instanzen (Zeichenaufrufe sparen)
// =============================================================================================

/**
 * Das Registry-Modell eines Käfers besteht aus sieben Meshes (Panzer, Augen, Glanzpunkte, Fühler, Beine, zwei Flügel) –
 * je Käfer sieben Zeichenaufrufe plus zwei im Schattenpass. Bei 7 (3-2) bzw. 28 (3-6) Käfern sprengt das das Budget.
 * Hier wird das Modell je Art/Farbe einmal in Ruhehaltung zu einem Körper-Mesh verschmolzen und als InstancedMesh
 * gezeichnet (Flügel als zweite InstancedMesh mit Flügelschlag); die Entitäten behalten Verhalten, Kollision und
 * Blob-Schatten, ihre eigenen Modelle werden geleert. Käfer weiter als `dist` m von der Figur fallen weg.
 * Nur Darstellung (Wippen, Flügelschlag, platt gedrückt), kein Sonnenschatten.
 * Detailstufen: Das Registry-Modell hat ≈ 4500 Dreiecke; nur Käfer bis `near` m um die Figur nutzen es, weiter
 * entfernte eine sparsame Nachbildung (bugLowGeo, ≈ 650 Dreiecke: Panzer mit Punkten, Kopf, Augen, Fühler, Beine).
 */
function bugLowGeo(kind, color) {
  const COLS = { blue: 0x2f9bff, red: 0xff3a3a, green: 0x3ccf4a, yellow: 0xffcf22, pink: 0xff6fc0 };
  const shell = COLS[color] ?? COLS.blue, dark = 0x1f2a4a;
  const p = [];
  const cx = -0.03, cy = 0.17, rx = 0.3, ry = 0.3, rz = 0.27;
  const sh = new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI * 0.56).toNonIndexed();
  sh.scale(rx, ry, rz); sh.translate(cx, cy, 0);
  p.push(colorize(sh, fillc(L(shell))));
  p.push(sphere(1, 0, 0.16, 0, dark, { sx: 0.28, sy: 0.12, sz: 0.25, ws: 8, hs: 4 }));
  // Punkte auf dem Panzer
  for (const [az, el, r] of [[2.3, 0.75, 0.075], [-2.3, 0.75, 0.075], [1.55, 0.35, 0.065], [-1.55, 0.35, 0.065], [Math.PI, 0.25, 0.06], [0.9, 0.55, 0.055], [-0.9, 0.55, 0.055]]) {
    const dx = Math.cos(el) * Math.cos(az), dy = Math.sin(el), dz = Math.cos(el) * Math.sin(az);
    p.push(sphere(r * 0.9, cx + dx * rx * 0.99, cy + dy * ry * 0.99, dz * rz * 0.99, 0xffffff, { ws: 6, hs: 3, sy: 0.3 }));
  }
  p.push(sphere(0.16, 0.25, 0.22, 0, dark, { ws: 8, hs: 6 }));
  for (const s of [1, -1]) {
    p.push(sphere(0.075, 0.355, 0.255, s * 0.075, 0xffffff, { ws: 6, hs: 4, sy: 1.2 }), sphere(0.042, 0.415, 0.265, s * 0.088, 0x2a1a4a, { ws: 5, hs: 3 }));
    const ant = cyl(0.014, 0.014, 0.24, 0, 0, 0, dark, 4, { center: true });
    ant.rotateZ(-0.45); ant.rotateX(s * 0.35); ant.translate(0.35, 0.43, s * 0.085);
    p.push(ant, sphere(0.04, 0.4, 0.54, s * 0.13, shell, { ws: 5, hs: 3 }));
    for (let i = 0; i < 3; i++) {
      const leg = plate(0.05, 0.14, 0.05, 0, -0.07, 0, dark, { r: 0 });
      leg.rotateX(s * (kind === 'flatterkaefer' ? 0.6 : 0.35));
      leg.translate(0.13 - i * 0.13, 0.1, s * 0.19);
      p.push(leg);
    }
  }
  return merge(p);
}

export function bugSwarm(level, o = {}) {
  if (!level.view) return null;
  const kinds = o.kinds ?? ['flatterkaefer', 'krabbelkaefer'];
  const dist = o.dist ?? 40, near = o.near ?? 9;
  const sets = new Map();
  const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _w = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  /** Modell in Ruhehaltung → Geometrie im Modellraum (ohne transparente Flügel). */
  const bake = (kind, color) => {
    const m = getModel(kind, { color });
    m.update?.(0, { anim: kind === 'flatterkaefer' ? 'fly' : 'idle' });
    const root = m.root;
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);
    const parts = [];
    let wingGeo = null, wingMat = null;
    root.traverse((ob) => {
      if (!ob.isMesh) return;
      const mat = Array.isArray(ob.material) ? ob.material[0] : ob.material;
      if (mat?.transparent) { if (!wingGeo) { wingGeo = ob.geometry; wingMat = mat; } return; }
      const list = ob.isInstancedMesh ? Array.from({ length: ob.count }, (_, i) => { ob.getMatrixAt(i, _r); return _m.clone().multiplyMatrices(ob.matrixWorld, _r); }) : [ob.matrixWorld.clone()];
      for (const mw of list) {
        let g = ob.geometry.index ? ob.geometry.toNonIndexed() : ob.geometry.clone();
        g.applyMatrix4(mw);
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.color) {
          const c = mat?.color ?? new THREE.Color(1, 1, 1);
          const arr = new Float32Array(g.attributes.position.count * 3);
          for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
          g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        }
        parts.push(g);
      }
    });
    m.dispose?.();
    return { body: merge(parts), wingGeo, wingMat };
  };
  const bugs = [];
  for (const e of level.entities) {
    if (!kinds.includes(e.kind) || !e.model) continue;
    const color = e.spec.color ?? (e.kind === 'flatterkaefer' ? 'pink' : 'blue');
    const key = `${e.kind}:${color}`;
    let set = sets.get(key);
    if (!set) { set = { kind: e.kind, color, list: [] }; sets.set(key, set); }
    set.list.push(e);
    // eigenes Modell leeren (Wurzel bleibt als Lageträger)
    for (const ch of [...e.model.root.children]) e.model.root.remove(ch);
    e.model.update = () => {};
    bugs.push(e);
  }
  let wingIM = null, wingN = 0;
  const flyers = bugs.filter((e) => e.kind === 'flatterkaefer');
  for (const set of sets.values()) {
    const b = bake(set.kind, set.color);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
    set.im = new THREE.InstancedMesh(b.body, mat, set.list.length);
    set.lo = new THREE.InstancedMesh(bugLowGeo(set.kind, set.color), mat, set.list.length);
    for (const im of [set.im, set.lo]) { im.castShadow = false; im.frustumCulled = false; addObject(level, im); }
    if (!wingIM && b.wingGeo && flyers.length) {
      wingIM = new THREE.InstancedMesh(b.wingGeo, b.wingMat, flyers.length * 2);
      wingIM.castShadow = false; wingIM.frustumCulled = false;
      addObject(level, wingIM);
    }
  }
  const holder = {};
  let t = 0;
  const st = { drawn: 0, total: bugs.length };
  level.view.onFrame((dt) => {
    t += visDt(level, holder, dt);
    const pl = level.player;
    st.drawn = 0; wingN = 0;
    for (const set of sets.values()) {
      let n = 0, nl = 0;
      for (const e of set.list) {
        if (e.removed || !e.alive) continue;
        const d = pl ? Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) : 0;
        if (d > dist) continue;
        const fly = e.kind === 'flatterkaefer';
        const sq = e.state === 'squashed';
        const bob = fly && !sq ? 0.12 + Math.sin(t * 4 + e.pos.x) * 0.05 : 0;
        _p.set(e.pos.x, e.pos.y + bob, e.pos.z);
        _e.set(0, e.yaw ?? 0, 0); _q.setFromEuler(_e);
        if (sq) _s.set(1.3, 0.25, 1.3); else _s.set(1, 1, 1);
        _m.compose(_p, _q, _s);
        if (d <= near) set.im.setMatrixAt(n++, _m); else set.lo.setMatrixAt(nl++, _m);
        st.drawn++;
        if (fly && wingIM && !sq) {
          for (const sgn of [1, -1]) {
            const flap = Math.sin(t * 38 + e.pos.z) * 0.7 + 0.5;
            _r.makeRotationFromEuler(_e.set(sgn * (0.35 + flap), 0, 0.5));
            _r.setPosition(-0.06, 0.4 + 0.12, sgn * 0.1);
            wingIM.setMatrixAt(wingN++, _w.multiplyMatrices(_m, _r));
          }
        }
      }
      set.im.count = n; set.im.visible = n > 0;
      set.lo.count = nl; set.lo.visible = nl > 0;
      set.im.instanceMatrix.needsUpdate = true;
      set.lo.instanceMatrix.needsUpdate = true;
    }
    if (wingIM) { wingIM.count = wingN; wingIM.instanceMatrix.needsUpdate = true; }
  });
  level._bugSwarm = st;
  return st;
}

/**
 * Sonnenschatten nur in der Nähe: Modelle (Entitäten und Baustein-Modelle `modell:*`) weiter als `dist` m von der Figur
 * entfernt werfen keinen Schatten – der Schattenpass zeichnete sonst alle Modelle des Levels (lange Strecken: viele
 * Trampoline, Warp-Boxen, Schnappblumen). Instanzen (Münzen, Blöcke) bleiben unberührt. Prüft jedes 6. Bild.
 */
export function shadowRange(level, o = {}) {
  if (!level.view?.three) return null;
  const dist = o.dist ?? 30;
  const items = [];
  const seen = new Set();
  const addRoot = (root, posOf) => {
    if (!root || seen.has(root)) return;
    seen.add(root);
    const meshes = [];
    root.traverse((ob) => { if (ob.isMesh && !ob.isInstancedMesh && ob.castShadow) meshes.push(ob); });
    if (meshes.length) items.push({ root, meshes, posOf, near: true });
  };
  for (const e of level.entities) if (e.model?.root) addRoot(e.model.root, () => e.pos);
  const _v = new THREE.Vector3();
  const scan = (node) => {
    for (const ob of node.children) {
      if ((ob.name ?? '').startsWith('modell:')) addRoot(ob, () => { ob.updateMatrixWorld(); return _v.setFromMatrixPosition(ob.matrixWorld); });
      else if (!ob.isMesh) scan(ob);
    }
  };
  scan(level.view.three);
  let k = 0;
  const st = { items: items.length, near: items.length };
  level.view.onFrame(() => {
    if (k++ % 6) return;
    const pl = level.player;
    if (!pl) return;
    let n = 0;
    for (const it of items) {
      const p = it.posOf();
      const near = Math.hypot(p.x - pl.pos.x, p.y - pl.pos.y, p.z - pl.pos.z) < dist;
      if (near) n++;
      if (near !== it.near) { it.near = near; for (const m of it.meshes) m.castShadow = near; }
    }
    st.near = n;
  });
  level._shadowRange = st;
  return st;
}

/** Modelle einer Art werfen nur mit ihren `keep` größten Teilen Sonnenschatten (spart Aufrufe im Schattenpass). */
export function trimShadows(level, kind, keep = 1) {
  for (const e of level.entities) {
    if (e.kind !== kind || !e.model?.root) continue;
    const list = [];
    e.model.root.traverse((ob) => { if (ob.isMesh && ob.castShadow) list.push(ob); });
    const tri = (ob) => (ob.geometry.index ? ob.geometry.index.count : ob.geometry.attributes.position.count);
    list.sort((a, b) => tri(b) - tri(a));
    list.slice(keep).forEach((ob) => { ob.castShadow = false; });
  }
}

/** Netz-Teile der Kettenzäune werfen keinen Sonnenschatten (der Schatten wäre eine volle Platte; spart Aufrufe). */
export function fenceShadows(level) {
  for (const e of level.entities) {
    if (e.kind !== 'kettenzaun' && e.kind !== 'kettenplattform') continue;
    e.model?.root?.traverse((ob) => {
      if (!ob.isMesh) return;
      const mat = Array.isArray(ob.material) ? ob.material[0] : ob.material;
      if (mat?.map || mat?.alphaTest || ob.isInstancedMesh) ob.castShadow = false;
    });
  }
}

// =============================================================================================
// Kleine Geometrie-Bausteine (Weltkoordinaten, Vertexfarben)
// =============================================================================================

const L = (c) => lin(hex(c));
/** colorize-Rückruf: einfarbig (lineare Farbe). */
const fillc = (c) => (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; };
/** Flache Platte (Mitte x,y,z), ohne Rundung (sparsam). */
export function plate(w, h, d, x, y, z, color, o = {}) {
  const r = o.r ?? 0.02;
  if (r > 0.045) return box(w, h, d, x, y + h / 2, z, color, { r, seg: o.seg ?? 1, topColor: o.top });
  // kleine Teile: einfacher Quader (12 Dreiecke), oben etwas heller (bzw. top)
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const base = L(color), top = o.top !== undefined ? L(o.top) : [base[0] * 1.1, base[1] * 1.1, base[2] * 1.1], low = [base[0] * 0.8, base[1] * 0.8, base[2] * 0.8];
  colorize(g, (p, n, out) => { const c = n.y > 0.5 ? top : n.y < -0.5 ? low : base; const k = 1 - Math.abs(n.x) * 0.06; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; });
  g.translate(x, y + h / 2, z);
  return g;
}

/** 7-Segment-Ziffern als Quader (Höhenmarken am Kletterturm): Text aus Ziffern, Mitte unten (x, y, z), Höhe h, Ebene XY. */
export function digits7(text, x, y, z, h, color, parts) {
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const w = h * 0.55, t = h * 0.13, gap = w * 0.45;
  const total = text.length * w + (text.length - 1) * gap;
  let cx = x - total / 2 + w / 2;
  for (const ch of text) {
    const segs = SEG[ch];
    if (segs) {
      const hw = w / 2, hh = h / 2;
      const put = (sx, sy, horiz) => parts.push(plate(horiz ? w - t * 0.6 : t, horiz ? t : hh - t * 0.4, 0.06, cx + sx, y + sy - (horiz ? t / 2 : (hh - t * 0.4) / 2), z, color, { r: 0.01 }));
      for (const sg of segs) {
        if (sg === 'a') put(0, h, true);
        if (sg === 'g') put(0, hh + t / 2, true);
        if (sg === 'd') put(0, t, true);
        if (sg === 'f') put(-hw + t / 2, h - hh / 2 + t * 0.2, false);
        if (sg === 'b') put(hw - t / 2, h - hh / 2 + t * 0.2, false);
        if (sg === 'e') put(-hw + t / 2, hh / 2 + t * 0.2, false);
        if (sg === 'c') put(hw - t / 2, hh / 2 + t * 0.2, false);
      }
    }
    cx += w + gap;
  }
}

/** Streifen (Warnband gelb/schwarz) entlang X in der Ebene z (Vorderseite +Z), Mitte unten. */
export function hazardBand(x0, x1, y, z, h, parts, a = 0xffc21a, b = 0x2a2a34) {
  const n = Math.max(2, Math.round((x1 - x0) / 0.8));
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) parts.push(plate(w, h, 0.05, x0 + (i + 0.5) * w, y, z, i % 2 ? a : b, { r: 0 }));
}

// =============================================================================================
// 3-2: Kulisse
// =============================================================================================

/**
 * Kletterturm hinter den Zäunen: stahlblaue Rückwand mit Feldern, Nieten, Querträgern, Warnbändern und großen
 * 7-Segment-Höhenmarken (10 m … 40 m), oben eine Spitze mit Funkmast und Wimpel. Kollision: Rückwand fest.
 * o = { x0, x1, z (Vorderseite der Wand), depth, y0, y1, marks: [10, 20, 30, 40] }
 */
export function towerBack(level, o) {
  const { x0, x1, z, y0, y1 } = o;
  const d = o.depth ?? 1.4, cx = (x0 + x1) / 2, w = x1 - x0;
  level.world.add({ type: 'box', min: [x0, y0, z - d], max: [x1, y1, z], camIgnore: true, tag: 'turm' });
  if (!level.view) return;
  const parts = [];
  const steel = 0x6f8fc8, steelDark = 0x4a6498, panel = 0x8aa6dc;
  parts.push(plate(w, y1 - y0, d, cx, y0, z - d / 2, steelDark, { r: 0.06 }));
  // Felder (helle Platten) im 2-m-Raster mit Nieten
  for (let y = y0 + 0.4; y < y1 - 1.6; y += 2.2) {
    for (let x = x0 + 0.5; x < x1 - 1.4; x += 2.4) {
      parts.push(plate(2.1, 1.9, 0.08, x + 1.05, y, z + 0.02, ((Math.floor(x) + Math.floor(y)) & 1) ? panel : steel, { r: 0 }));
      parts.push(plate(0.12, 0.12, 0.05, x + 0.18, y + 1.62, z + 0.09, 0xd8e2f6, { r: 0 }), plate(0.12, 0.12, 0.05, x + 1.92, y + 0.16, z + 0.09, 0xd8e2f6, { r: 0 }));
    }
  }
  // Querträger und senkrechte Kanten
  for (let y = y0 + 4.5; y < y1; y += 4.5) parts.push(plate(w + 0.3, 0.32, 0.4, cx, y, z + 0.12, 0x34466e, { r: 0.06 }));
  for (const x of [x0 + 0.15, x1 - 0.15]) parts.push(plate(0.5, y1 - y0, d + 0.3, x, y0, z - d / 2, 0x34466e, { r: 0.08 }));
  // Höhenmarken (Warnband + Ziffern) – rechts neben der Kletterbahn
  for (const m of o.marks ?? []) {
    const my = y0 + m;
    if (my > y1 - 1) continue;
    hazardBand(x1 - 4.2, x1 - 0.5, my - 0.12, z + 0.16, 0.24, parts);
    digits7(String(m), x1 - 2.35, my + 0.35, z + 0.2, 1.3, 0xfff4c8, parts);
    parts.push(plate(0.8, 0.12, 0.06, x1 - 3.8, my + 1.0, z + 0.2, 0xfff4c8, { r: 0 }));   // „m“ als Strich
  }
  // Spitze: Dachkante, Funkmast mit roter Lampe
  parts.push(plate(w + 0.8, 0.5, d + 0.6, cx, y1, z - d / 2, 0xe8283a, { r: 0.12, top: 0xff6a5a }));
  parts.push(...[cyl(0.12, 0.16, 6, x1 - 1.4, y1 + 0.5, z - d / 2, 0xd8dce8, 8)]);
  parts.push(sphere(0.28, x1 - 1.4, y1 + 6.7, z - d / 2, 0xff3a2a));
  addStatic(level, merge(parts), { castShadow: false });
}

/** Schmaler dunkler Schlitz im Boden (Hubzaun), Mitte (x, y, z), Breite w entlang X. */
export function slotStrip(parts, x, y, z, w) {
  parts.push(plate(w + 0.3, 0.03, 0.46, x, y, z, 0x2a2e3a, { r: 0 }));
  parts.push(plate(w + 0.5, 0.05, 0.1, x, y, z + 0.28, 0xffc21a, { r: 0.02 }));
  parts.push(plate(w + 0.5, 0.05, 0.1, x, y, z - 0.28, 0xffc21a, { r: 0.02 }));
}

/** Wimpelkette zwischen zwei Punkten (statisch, Dreiecke abwechselnd bunt). */
export function pennantLine(parts, a, b, n = 10, sag = 0.5) {
  const cols = [0xff4a3d, 0xffd23d, 0x3d8bff, 0x4fd04a, 0xff7ac0];
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const yaw = Math.atan2(-dz, dx);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + dx * t, z = a[2] + dz * t, y = a[1] + dy * t - 4 * sag * t * (1 - t);
    if (i < n) {
      const g = new THREE.ConeGeometry(0.16, 0.42, 3, 1).toNonIndexed();
      g.rotateX(Math.PI);
      g.scale(1, 1, 0.25);
      g.rotateY(yaw);
      g.translate(x + dx / n / 2, y - 0.26, z + dz / n / 2);
      parts.push(colorize(g, fillc(L(cols[i % cols.length]))));
    }
  }
  // Schnur
  const len = Math.hypot(dx, dy, dz);
  const s = new THREE.BoxGeometry(len, 0.03, 0.03).toNonIndexed();
  s.rotateZ(Math.atan2(dy, Math.hypot(dx, dz)));
  s.rotateY(yaw);
  s.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag * 0.7, (a[2] + b[2]) / 2);
  parts.push(colorize(s, fillc(L(0xf6f4ef))));
}

/** Heißluftballon (ein Mesh, schattenlos), schwebt auf und ab und dreht sich langsam. */
export function balloon(level, o) {
  if (!level.view) return null;
  const parts = [];
  const cols = o.colors ?? [0xff4a3d, 0xffd23d];
  const R = o.r ?? 3;
  const g = new THREE.SphereGeometry(R, 16, 12).toNonIndexed();
  g.scale(1, 1.15, 1);
  colorize(g, (p, n, out) => {
    const a = Math.atan2(p.z, p.x);
    const k = Math.floor(((a + Math.PI) / TAU) * 12) % 2;
    const c = L(cols[k]);
    const shadeK = 0.78 + 0.22 * smooth(-1, 1, n.y);
    out[0] = c[0] * shadeK; out[1] = c[1] * shadeK; out[2] = c[2] * shadeK;
  });
  g.translate(0, R * 1.15 + 1.6, 0);
  parts.push(g);
  parts.push(cyl(R * 0.32, R * 0.18, 0.9, 0, 1.6 - 0.2, 0, cols[1], 10));
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) parts.push(plate(0.05, 1.3, 0.05, sx * 0.42, 0.6, sz * 0.42, 0x6a4a2a, { r: 0 }));
  parts.push(plate(1.1, 0.7, 1.1, 0, 0, 0, 0xb8834a, { r: 0.12, top: 0xd8a462 }));
  if (o.flag) parts.push(plate(0.05, 0.4, 0.8, 0.6, 0.55, 0, o.flag, { r: 0 }));
  const geo = merge(parts);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  mesh.castShadow = false;
  const p0 = o.pos;
  mesh.position.set(p0[0], p0[1], p0[2]);
  mesh.scale.setScalar(o.scale ?? 1);
  const holder = {};
  let t = o.phase ?? 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    mesh.position.y = p0[1] + Math.sin(t * 0.5) * 0.8;
    if (o.drift) { mesh.position.x = p0[0] + Math.sin(t * 0.07) * o.drift; }
    mesh.rotation.y = t * 0.08;
  });
  return mesh;
}

/**
 * Baron Brummbärs Zeppelin (eigenes Design): rote Hülle mit goldenem Band, Bärengesicht mit Monokel am Bug, kleine
 * Gondel, Leitwerk; fährt langsam hin und her (ferne Kulisse, schattenlos). o = { from, to, speed }
 */
export function zeppelin(level, o) {
  if (!level.view) return null;
  const parts = [];
  const hull = new THREE.SphereGeometry(1, 20, 12).toNonIndexed();
  hull.scale(7, 2.4, 2.4);
  colorize(hull, (p, n, out) => {
    const band = Math.abs(p.x) < 0.9 && Math.abs(p.x) > 0.5;
    const c = band ? L(0xffc21a) : L(0xc81e2e);
    const k = 0.7 + 0.3 * smooth(-1, 1, n.y);
    out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k;
  });
  parts.push(hull);
  // Bärengesicht am Bug (+X): Ohren, Schnauze, Augen, Monokel, Zylinder obenauf
  parts.push(sphere(0.55, 6.6, 1.7, 1.2, 0x8a4a22), sphere(0.55, 6.6, 1.7, -1.2, 0x8a4a22));
  parts.push(sphere(0.75, 7.0, -0.2, 0, 0xd8a070, { sx: 0.6, sy: 0.75 }), sphere(0.22, 7.45, 0.05, 0, 0x2a1a12));
  parts.push(sphere(0.2, 6.75, 0.75, 0.6, 0xffffff), sphere(0.2, 6.75, 0.75, -0.6, 0xffffff));
  parts.push(sphere(0.1, 6.92, 0.75, 0.6, 0x1a1a22), sphere(0.1, 6.92, 0.75, -0.6, 0x1a1a22));
  const mono = new THREE.TorusGeometry(0.27, 0.05, 6, 16).toNonIndexed();
  mono.rotateY(Math.PI / 2);
  mono.translate(6.85, 0.75, -0.6);
  parts.push(colorize(mono, fillc(L(0xffd23d))));
  parts.push(cyl(0.7, 0.7, 1.4, 2.5, 2.2, 0, 0x22202a, 12), cyl(1.1, 1.1, 0.12, 2.5, 2.2, 0, 0x22202a, 12), cyl(0.72, 0.72, 0.22, 2.5, 2.5, 0, 0xc81e2e, 12));
  // Gondel und Leitwerk
  parts.push(plate(3, 0.9, 1.2, 0.5, -3.1, 0, 0x3a2a2a, { r: 0.2, top: 0x5a4040 }));
  for (const sx of [-1.4, 0, 1.4]) parts.push(plate(0.5, 0.35, 0.05, 0.5 + sx, -2.8, 0.61, 0xfff0a0, { r: 0 }));
  parts.push(plate(2, 2.4, 0.15, -6.4, -0.2, 0, 0xc81e2e, { r: 0.1 }), plate(2, 0.15, 3.6, -6.4, 0, 0, 0xc81e2e, { r: 0.1 }));
  const geo = merge(parts);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  mesh.castShadow = false;
  const a = o.from, b = o.to;
  const holder = {};
  let t = 0;
  const L0 = Math.hypot(b[0] - a[0], b[2] - a[2]);
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    const u = (Math.sin((t * (o.speed ?? 1.2)) / L0 * Math.PI) + 1) / 2;
    const dir = Math.cos((t * (o.speed ?? 1.2)) / L0 * Math.PI) >= 0 ? 1 : -1;
    mesh.position.set(a[0] + (b[0] - a[0]) * u, a[1] + Math.sin(t * 0.4) * 0.6, a[2] + (b[2] - a[2]) * u);
    const yaw = Math.atan2(-(b[2] - a[2]) * dir, (b[0] - a[0]) * dir);
    mesh.rotation.y += (yaw - mesh.rotation.y) * Math.min(1, dt * 0.8);
  });
  return mesh;
}

/** Vogelschwarm (Möwen): eine InstancedMesh, kreist mit Flügelschlag (Maßstab y). o = { center, r, n, y } */
export function birds(level, o) {
  if (!level.view) return null;
  const n = o.n ?? 8;
  const parts = [plate(0.7, 0.06, 0.18, 0, 0, 0, 0xffffff, { r: 0.02 }), plate(0.16, 0.12, 0.42, 0, -0.03, 0, 0xf0f0f6, { r: 0.04 }), plate(0.1, 0.06, 0.12, 0, -0.03, 0.26, 0xffb21a, { r: 0.01 })];
  const geo = merge(parts);
  // Flügel als V: zwei gekippte Hälften
  const wing = (s) => { const g = plate(0.42, 0.04, 0.16, s * 0.21, 0, 0, 0xffffff, { r: 0.01 }); g.rotateZ(s * 0.35); return g; };
  const geo2 = merge([geo, wing(1), wing(-1)]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const im = new THREE.InstancedMesh(geo2, mat, n);
  im.castShadow = false;
  im.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const holder = {};
  let t = 0;
  const c = o.center;
  const upd = (dt) => {
    t += visDt(level, holder, dt);
    for (let i = 0; i < n; i++) {
      const a = t * (o.speed ?? 0.35) + (i / n) * TAU * 0.35 + (i % 3) * 0.2;
      const r = (o.r ?? 10) + (i % 3) * 1.4;
      p.set(c[0] + Math.cos(a) * r, c[1] + Math.sin(t * 0.8 + i) * 0.5 + (i % 2) * 0.8, c[2] + Math.sin(a) * r * 0.6);
      e.set(0, -a - Math.PI, Math.sin(t * 2 + i) * 0.15);
      q.setFromEuler(e);
      const flap = 0.6 + 0.4 * Math.abs(Math.sin(t * 7 + i * 1.3));
      s.set(1, flap, 1);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  upd(0);
  addObject(level, im, upd);
  return im;
}

/**
 * Blumen und Grasbüschel im Randstreifen eines Rechtecks (x0..x1, z0..z1, Boden y) – sparsam (Blume 20, Büschel 24
 * Dreiecke). o: n (Anzahl), band (Streifenbreite), margin (Abstand zur Kante), skip [[x0, x1, z0, z1], …], colors, seed.
 */
export function meadow(parts, x0, x1, z0, z1, y, o = {}) {
  const rnd = new Rnd((o.seed ?? Math.floor(Math.abs(x0 * 13 + z0 * 7 + y * 3))) + 1);
  const n = o.n ?? 16, band = o.band ?? 1.4, m = o.margin ?? 0.35;
  const xa = Math.min(x0, x1) + m, xb = Math.max(x0, x1) - m, za = Math.min(z0, z1) + m, zb = Math.max(z0, z1) - m;
  const cols = o.colors ?? [0xff5a7a, 0xffd23d, 0xffffff, 0xb06aff, 0x5ab0ff];
  const inSkip = (x, z) => (o.skip ?? []).some(([a, b, c, d]) => x > Math.min(a, b) && x < Math.max(a, b) && z > Math.min(c, d) && z < Math.max(c, d));
  for (let i = 0; i < n; i++) {
    const side = rnd.int(0, 3);
    let x, z;
    if (side < 2) { x = rnd.real(xa, xb); z = side ? za + rnd.real(0, band) : zb - rnd.real(0, band); }
    else { z = rnd.real(za, zb); x = side === 2 ? xa + rnd.real(0, band) : xb - rnd.real(0, band); }
    if (o.all) { x = rnd.real(xa, xb); z = rnd.real(za, zb); }
    if (inSkip(x, z)) continue;
    if (rnd.chance(0.55)) {
      const h = rnd.real(0.18, 0.32);
      parts.push(plate(0.035, h, 0.035, x, y, z, 0x3f9a32, { r: 0 }));
      const head = new THREE.OctahedronGeometry(0.12, 0);   // schon nicht indiziert
      head.scale(1, 0.55, 1);
      head.translate(x, y + h + 0.02, z);
      parts.push(colorize(head, fillc(L(rnd.pick(cols)))));
    } else {
      for (let k = 0; k < 3; k++) {
        const h = rnd.real(0.22, 0.38);
        const g = new THREE.ConeGeometry(0.05, h, 4).toNonIndexed();
        g.rotateZ((k - 1) * 0.35);
        g.translate(x + (k - 1) * 0.06, y + h / 2 - 0.02, z + rnd.real(-0.05, 0.05));
        parts.push(colorize(g, fillc(L(k === 1 ? 0x62c848 : 0x4aa838))));
      }
    }
  }
}

/** Regenbogen (Halbbogen in der XY-Ebene, Mitte unten x, y, z, Außenradius r). */
export function rainbow(parts, x, y, z, r = 3) {
  [0xff4a4a, 0xffa23a, 0xffe14a, 0x5ad05a, 0x4a9aff, 0x9a6aff].forEach((c, i) => {
    const g = new THREE.TorusGeometry(r - i * 0.3, 0.16, 4, 22, Math.PI).toNonIndexed();
    g.translate(x, y, z);
    parts.push(colorize(g, fillc(L(c))));
  });
}

/** Wolkenkranz (flache weiße Kugeln) um eine Ellipse (Mitte x, y, z; Halbachsen rx, rz). */
export function cloudRim(parts, x, y, z, rx, rz, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, s = 0.9 + ((i * 7) % 5) * 0.12;
    parts.push(sphere(s, x + Math.cos(a) * rx, y, z + Math.sin(a) * rz, 0xffffff, { ws: 8, hs: 5, sy: 0.55 }));
  }
}

/** Bäumchen (Stamm, zwei Kronenkugeln) – Fußpunkt (x, y, z), Größe s. */
export function tree(parts, x, y, z, s = 1, color = 0x4fb83a) {
  parts.push(cyl(0.12 * s, 0.17 * s, 1.3 * s, x, y, z, 0x8a5a32, 6));
  parts.push(sphere(0.85 * s, x, y + 1.75 * s, z, color, { ws: 7, hs: 5 }));
  parts.push(sphere(0.6 * s, x + 0.35 * s, y + 2.35 * s, z - 0.2 * s, color, { ws: 7, hs: 5 }));
}

/** Busch (flache Kugel, ein paar Beeren). */
export function bush(parts, x, y, z, s = 1, berries = 0xff4a5a) {
  parts.push(sphere(0.55 * s, x, y + 0.3 * s, z, 0x48a83a, { ws: 7, hs: 5, sy: 0.7 }));
  if (berries) for (let k = 0; k < 3; k++) { const a = k * 2.1; parts.push(sphere(0.07 * s, x + Math.cos(a) * 0.42 * s, y + 0.42 * s, z + Math.sin(a) * 0.42 * s, berries, { ws: 4, hs: 3 })); }
}

/** Trittsteinweg von a nach b (flache graue Steine, abwechselnd versetzt). */
export function stonePath(parts, a, b, step = 1.15) {
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), n = Math.max(1, Math.floor(len / step));
  const nx = -dz / len, nz = dx / len;
  for (let i = 0; i <= n; i++) {
    const u = i / n, off = (i % 2 ? 0.22 : -0.22);
    const g = plate(0.8, 0.05, 0.6, 0, 0, 0, i % 3 ? 0xc8c4bc : 0xb4b0a8, { r: 0, top: i % 3 ? 0xdcd8d0 : 0xc8c4bc });
    g.rotateY(Math.atan2(-dz, dx) + (i % 2 ? 0.25 : -0.2));
    g.translate(a[0] + dx * u + nx * off, a[1] + 0.005, a[2] + dz * u + nz * off);
    parts.push(g);
  }
}

/** Zaun aus Pfosten und Seil entlang a → b (Inselrand). */
export function ropeFence(parts, a, b, step = 2) {
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) parts.push(cyl(0.06, 0.07, 0.75, a[0] + dx * i / n, a[1], a[2] + dz * i / n, 0x9a6a3a, 5), sphere(0.08, a[0] + dx * i / n, a[1] + 0.78, a[2] + dz * i / n, 0xffc21a, { ws: 5, hs: 3 }));
  for (const h of [0.45, 0.68]) {
    const g = plate(len, 0.04, 0.04, len / 2, 0, 0, 0xf6f4ef, { r: 0 });
    g.rotateY(Math.atan2(-dz, dx));
    g.translate(a[0], a[1] + h, a[2]);
    parts.push(g);
  }
}

/** Kleines Windrad (Mast statisch in parts, Rotor als drehendes Mesh). */
export function windmill(level, parts, x, y, z, o = {}) {
  const h = o.h ?? 3.2, col = o.color ?? 0xf6f4ef;
  parts.push(cyl(0.08, 0.12, h, x, y, z, 0xd8dce8, 8), plate(0.36, 0.3, 0.5, x, y + h - 0.1, z, 0xe8283a, { r: 0.06 }));
  if (!level.view) return;
  const blades = [];
  for (let i = 0; i < 3; i++) {
    const g = plate(0.14, 1.3, 0.04, 0, 0, 0, i ? col : 0xff4a3d, { r: 0.03 });
    g.translate(0, 0.1, 0);
    g.rotateZ((i / 3) * TAU);
    blades.push(g);
  }
  blades.push(sphere(0.12, 0, 0, 0, 0xffc21a));
  const geo = merge(blades);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  mesh.castShadow = false;
  mesh.position.set(x, y + h + 0.05, z + 0.3);
  const holder = {};
  addObject(level, mesh, (dt) => { mesh.rotation.z -= visDt(level, holder, dt) * (o.speed ?? 3); });
}

/**
 * Deckel einer Glasröhren-Öffnung: rot-weiß gestreifte Klappe mit Lämpchen, klappt auf, sobald open() wahr ist.
 * o = { pos (Mitte der Öffnung), axis 'x' (Öffnung zeigt nach −X), r, open: () => bool }
 */
export function pipeLid(level, o) {
  if (!level.view) return null;
  const r = o.r ?? 1.05;
  const parts = [];
  const g = new THREE.CylinderGeometry(r, r, 0.12, 20).toNonIndexed();
  colorize(g, (p, n, out) => { const k = Math.floor((p.x + r) / (r / 2.5)) % 2; const c = L(k ? 0xffffff : 0xe8283a); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; });
  g.rotateZ(Math.PI / 2);
  parts.push(g);
  parts.push(sphere(0.16, -0.12, 0, 0, 0xffd23a));
  const geo = merge(parts);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x220800 }));
  const pivot = new THREE.Group();
  pivot.position.set(o.pos[0], o.pos[1] + r, o.pos[2]);
  mesh.position.set(0, -r, 0);
  pivot.add(mesh);
  const holder = {};
  let k = 0;
  addObject(level, pivot, (dt) => {
    const d = visDt(level, holder, dt);
    k = clamp(k + (o.open() ? d * 2.2 : -d * 2.2), 0, 1);
    pivot.rotation.z = -sstep(k) * 1.9;
    mesh.material.emissive.setHex(k > 0.5 ? 0x1a3a10 : 0x3a0800);
  });
  return pivot;
}

// =============================================================================================
// 3-6: Rennstrecke
// =============================================================================================

/**
 * Asphaltband auf einer Insel (nur Optik, liegt 0,01 m über der Oberseite): dunkelgrauer Belag mit leichter Körnung,
 * rot-weiße Randsteine (Curbs) und weiße Mittelstriche. Gerade Stücke entlang Z: { x, w, z0, z1, y, curbs, dashes }.
 * Rampen (schräge Stücke): { …, y1 } (Höhe am Ende z1).
 */
export function road(level, pieces) {
  if (!level.view) return;
  const parts = [];
  const asph = L(0x4a4c56), asph2 = L(0x54565f);
  for (const r of pieces) {
    const z0 = Math.max(r.z0, r.z1), z1 = Math.min(r.z0, r.z1);
    const y0 = r.z0 >= r.z1 ? r.y : (r.y1 ?? r.y), y1 = r.z0 >= r.z1 ? (r.y1 ?? r.y) : r.y;
    const len = z0 - z1, slope = (y1 - y0) / Math.max(0.01, len);
    const n = Math.max(1, Math.round(len / 1));
    const at = (z) => y0 + (z0 - z) * slope + 0.012;
    // Belag in 1-m-Streifen (schräg geneigt)
    for (let i = 0; i < n; i++) {
      const za = z0 - (i * len) / n, zb = z0 - ((i + 1) * len) / n;
      const ya = at(za), yb = at(zb);
      const g = quad(r.x - r.w / 2, ya, za, r.x + r.w / 2, yb, zb);
      const c = (i % 2) ? asph : asph2;
      parts.push(colorize(g, fillc(c)));
      if (r.dashes !== false && i % 3 === 0) parts.push(colorize(quad(r.x - 0.09, ya + 0.004, za - 0.1, r.x + 0.09, (ya + yb) / 2 + 0.004, za - len / n * 0.55), fillc(L(0xf6f4ef))));
      if (r.curbs !== false) {
        for (const side of [-1, 1]) {
          const cx = r.x + side * (r.w / 2 - 0.25);
          const c2 = L((i % 2) ? 0xe8283a : 0xf6f4ef);
          parts.push(colorize(quad(cx - 0.25, ya + 0.006, za, cx + 0.25, yb + 0.006, zb), fillc(c2)));
        }
      }
    }
    if (r.grid) {
      // Startaufstellung: weiße Winkel je Startplatz
      for (const [gx, gz] of r.grid) {
        const yy = at(gz) + 0.008;
        parts.push(colorize(quad(gx - 0.8, yy, gz + 0.05, gx + 0.8, yy, gz - 0.12), fillc(L(0xffffff))));
        parts.push(colorize(quad(gx - 0.8, yy, gz + 0.05, gx - 0.65, yy, gz - 1.0), fillc(L(0xffffff))));
      }
    }
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/** Viereck (zwei Dreiecke) von (x0, ya, za) nach (x1, yb, zb), Normale nach oben. */
function quad(x0, ya, za, x1, yb, zb) {
  const g = new THREE.BufferGeometry();
  const P = [x0, ya, za, x1, ya, za, x1, yb, zb, x0, ya, za, x1, yb, zb, x0, yb, zb];
  // Dreiecke gegen den Uhrzeigersinn von oben gesehen (za > zb)
  const pos = za >= zb ? P : [x0, ya, za, x1, yb, zb, x1, ya, za, x0, ya, za, x0, yb, zb, x1, yb, zb];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Statische Teile je 32-m-Abschnitt (wie der StaticBatcher) zusammenfassen und einzeln abgeben: so landen sie im
 * Abschnitts-Mesh ihres Orts (Frustum-Culling, kein zusätzlicher Zeichenaufruf) statt in einem levelweiten Mesh, das
 * immer – auch im Schattenpass – gezeichnet würde.
 */
export function addStaticParts(level, parts, opts) {
  if (!level.view) { for (const g of parts) g.dispose?.(); return; }
  const groups = new Map();
  for (const g of parts) {
    g.computeBoundingBox();
    const sec = Math.floor(-(g.boundingBox.min.z + g.boundingBox.max.z) / 2 / SECTION);
    if (!groups.has(sec)) groups.set(sec, []);
    groups.get(sec).push(g);
  }
  for (const list of groups.values()) addStatic(level, merge(list), opts);
}

/**
 * Kart-Bande (sparsam): grauer Sockel, rot-weiße Polster je Meter, gelb-schwarze Rolle oben, 0,8 m hoch – Optik wie
 * der Baustein `bande`, aber ≈ 40 statt ≈ 320 Dreiecke je Meter (Budget: in 3-6 stehen rund 300 m Bande).
 * paths: Liste von Linienzügen [[x, y, z], …]; Kollision je Stück (achsenparallel ein Quader, sonst ≤ 1-m-Stücke).
 */
export function kartBande(level, paths) {
  const parts = [];
  const pad = [L(0xe8283a), L(0xffffff)], roll = [L(0xffd21f), L(0x2a2a3a)];
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay, az] = path[i], [bx, , bz] = path[i + 1];
      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len < 0.2) continue;
      if (Math.abs(dx) < 1e-3 || Math.abs(dz) < 1e-3) {
        level.world.add({ type: 'box', min: [Math.min(ax, bx) - 0.22, ay, Math.min(az, bz) - 0.22], max: [Math.max(ax, bx) + 0.22, ay + 0.8, Math.max(az, bz) + 0.22], tag: 'bande' });
      } else {
        const n = Math.ceil(len);
        for (let k = 0; k < n; k++) {
          const x0 = ax + dx * k / n, x1 = ax + dx * (k + 1) / n, z0 = az + dz * k / n, z1 = az + dz * (k + 1) / n;
          level.world.add({ type: 'box', min: [Math.min(x0, x1) - 0.22, ay, Math.min(z0, z1) - 0.22], max: [Math.max(x0, x1) + 0.22, ay + 0.8, Math.max(z0, z1) + 0.22], tag: 'bande' });
        }
      }
      if (!level.view) continue;
      // Stücke höchstens 12 m lang (Abschnitts-Culling), lokal entlang +X gebaut
      const pieces = Math.ceil(len / 12);
      for (let q = 0; q < pieces; q++) {
        const u0 = (q / pieces) * len, u1 = ((q + 1) / pieces) * len, pl = u1 - u0;
        const loc = [plate(pl, 0.16, 0.6, u0 + pl / 2, 0, 0, 0x7a8090, { r: 0 })];
        const np = Math.max(1, Math.round(pl));
        for (let k = 0; k < np; k++) {
          const g = new THREE.BoxGeometry(pl / np - 0.05, 0.5, 0.42).toNonIndexed();
          const c = pad[(Math.round(u0) + k) % 2];
          colorize(g, (p, nn, o) => { const s = nn.y > 0.5 ? 1.08 : nn.y < -0.5 ? 0.6 : 0.88; o[0] = c[0] * s; o[1] = c[1] * s; o[2] = c[2] * s; });
          g.translate(u0 + (k + 0.5) * pl / np, 0.42, 0);
          loc.push(g);
        }
        const nr = Math.max(1, Math.round(pl * 2));
        for (let k = 0; k < nr; k++) {
          const g = new THREE.CylinderGeometry(0.1, 0.1, pl / nr, 6, 1, true).toNonIndexed();
          g.rotateZ(Math.PI / 2);
          g.translate(u0 + (k + 0.5) * pl / nr, 0.72, 0);
          loc.push(colorize(g, fillc(roll[k % 2])));
        }
        const g = merge(loc);
        g.rotateY(Math.atan2(-dz, dx));
        g.translate(ax, ay, az);
        parts.push(g);
      }
    }
  }
  addStaticParts(level, parts, { castShadow: true });
}

/** Waagrechtes Viereck aus vier Ecken [x, z] auf Höhe y, Normale nach oben. */
function quadP(a, b, c, d, y) {
  const uz = b[1] - a[1], ux = b[0] - a[0], vz = c[1] - a[1], vx = c[0] - a[0];
  const order = uz * vx - ux * vz > 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(order.flatMap(([x, z]) => [x, y, z]), 3));
  g.computeVertexNormals();
  return g;
}

/** Viereck aus vier Punkten [x, y, z] (z. B. Aufmalung auf einem Hang), Vorderseite nach oben. */
export function poly4(parts, a, b, c, d, color) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ny = u[2] * v[0] - u[0] * v[2];
  const order = ny > 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(order.flat(), 3));
  g.computeVertexNormals();
  parts.push(colorize(g, fillc(L(color))));
}

/** Ringförmige Rennbahn (Bonus-Oval): Asphalt rIn..rOut, rot-weiße Randsteine innen und außen, Mittelstriche. */
export function ovalTrack(parts, cx, cz, y, rIn, rOut, n = 48) {
  const P = (r, a) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  const asph = [L(0x4a4c56), L(0x54565f)], curb = [L(0xe8283a), L(0xf6f4ef)], white = L(0xf6f4ef);
  const rm = (rIn + rOut) / 2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2;
    parts.push(colorize(quadP(P(rIn, a0), P(rOut, a0), P(rOut, a1), P(rIn, a1), y + 0.012), fillc(asph[i % 2])));
    parts.push(colorize(quadP(P(rIn - 0.45, a0), P(rIn, a0), P(rIn, a1), P(rIn - 0.45, a1), y + 0.016), fillc(curb[i % 2])));
    parts.push(colorize(quadP(P(rOut, a0), P(rOut + 0.45, a0), P(rOut + 0.45, a1), P(rOut, a1), y + 0.016), fillc(curb[i % 2])));
    if (i % 2 === 0) parts.push(colorize(quadP(P(rm - 0.08, a0), P(rm + 0.08, a0), P(rm + 0.08, am), P(rm - 0.08, am), y + 0.018), fillc(white)));
  }
}

/** Schachbrettfläche (Start-/Ziellinie) quer über die Fahrbahn bei z. */
export function checkerLine(parts, x, w, z, y, d = 1.2, cell = 0.6) {
  const nx = Math.round(w / cell), nz = Math.round(d / cell);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const c = L(((i + j) & 1) ? 0x1a1a22 : 0xffffff);
    parts.push(colorize(quad(x - w / 2 + i * cell, y + 0.016, z + d / 2 - j * cell, x - w / 2 + (i + 1) * cell, y + 0.016, z + d / 2 - (j + 1) * cell), fillc(c)));
  }
}

/** Reifenstapel (bunte Reifen, 3 hoch). */
export function tireStack(parts, x, y, z, n = 3, color = 0xe8283a) {
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(0.42, 0.2, 6, 12).toNonIndexed();
    g.rotateX(Math.PI / 2);
    g.translate(x, y + 0.2 + i * 0.36, z);
    parts.push(colorize(g, (p, nn, o) => { const c = L(i % 2 ? 0x2a2a30 : color); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
}

/** Strohballen (rund, liegend). */
export function hayBale(parts, x, y, z, yaw = 0) {
  const g = new THREE.CylinderGeometry(0.6, 0.6, 1.1, 12).toNonIndexed();
  g.rotateZ(Math.PI / 2);
  g.rotateY(yaw);
  g.translate(x, y + 0.6, z);
  parts.push(colorize(g, (p, n, o) => { const c = Math.abs(n.x * Math.cos(yaw) - n.z * Math.sin(yaw)) > 0.8 ? L(0xd8b860) : L(0xe8cc70); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
}

/** Fahnenmast mit Fahne (statisch); color oder 'karo'. */
export function flagPole(parts, x, y, z, h = 4, color = 0xe8283a, yaw = 0) {
  parts.push(cyl(0.06, 0.08, h, x, y, z, 0xd8dce8, 6), sphere(0.1, x, y + h + 0.05, z, 0xffd23a));
  const fw = 1.1, fh = 0.7;
  if (color === 'karo') {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const g = plate(fw / 4, fh / 3, 0.03, 0, 0, 0, ((i + j) & 1) ? 0x1a1a22 : 0xffffff, { r: 0 });
      g.translate(0.08 + (i + 0.5) * fw / 4, j * fh / 3, 0);
      g.rotateY(yaw);
      g.translate(x, y + h - fh, z);
      parts.push(g);
    }
  } else {
    const g = plate(fw, fh, 0.03, 0, 0, 0, color, { r: 0 });
    g.translate(0.08 + fw / 2, 0, 0);
    g.rotateY(yaw);
    g.translate(x, y + h - fh, z);
    parts.push(g);
  }
}

/** Almhütte (Holzhaus mit Satteldach, Fensterläden, Blumenkasten). Fußpunkt (x, y, z), Blick +Z. */
export function almHut(parts, x, y, z, s = 1, yaw = 0) {
  const loc = [];
  const W = 4 * s, D = 3.2 * s, H = 2.4 * s;
  loc.push(plate(W, 0.4 * s, D, 0, 0, 0, 0x8a8a90, { r: 0.05 }));
  loc.push(plate(W - 0.2, H, D - 0.2, 0, 0.4 * s, 0, 0xa8683a, { r: 0.05 }));
  for (let i = 0; i < 5; i++) loc.push(plate(W - 0.1, 0.05, 0.03, 0, 0.6 * s + i * 0.45 * s, D / 2 - 0.08, 0x7a4a26, { r: 0 }));
  // Dach
  const roofL = W / 2 / Math.cos(0.6) + 0.4;
  for (const sd of [1, -1]) {
    const g = plate(roofL, 0.18 * s, D + 0.8, 0, 0, 0, 0x6a3a22, { r: 0.04, top: 0x8a4a2a });
    g.translate(-roofL / 2 * sd, 0, 0);
    g.rotateZ(sd * 0.6);
    g.translate(0, H + 0.4 * s + Math.tan(0.6) * W / 2 + 0.05, 0);
    loc.push(g);
  }
  // Fenster mit Läden, Blumenkasten, Tür
  for (const fx of [-0.95, 0.95]) {
    loc.push(plate(0.7 * s, 0.7 * s, 0.05, fx * s, 1.3 * s, D / 2 - 0.05, 0xbfe4ff, { r: 0 }));
    loc.push(plate(0.3 * s, 0.75 * s, 0.06, fx * s - 0.5 * s, 1.27 * s, D / 2 - 0.04, 0x3a8a3a, { r: 0 }), plate(0.3 * s, 0.75 * s, 0.06, fx * s + 0.5 * s, 1.27 * s, D / 2 - 0.04, 0x3a8a3a, { r: 0 }));
    loc.push(plate(0.9 * s, 0.22 * s, 0.25, fx * s, 1.06 * s, D / 2 + 0.05, 0x7a4a26, { r: 0.02 }));
    for (let k = 0; k < 4; k++) loc.push(sphere(0.09 * s, fx * s - 0.33 * s + k * 0.22 * s, 1.34 * s, D / 2 + 0.1, k % 2 ? 0xff4a6a : 0xffd23a));
  }
  loc.push(plate(0.8 * s, 1.5 * s, 0.06, 0, 0.4 * s, D / 2 - 0.03, 0x5a3418, { r: 0.02 }));
  loc.push(plate(0.4 * s, 0.6 * s, 0.4 * s, W / 2 - 0.5 * s, H + 1.4 * s, -0.3, 0x8a8a90, { r: 0.03 }));   // Kamin
  const g = merge(loc);
  g.rotateY(yaw);
  g.translate(x, y, z);
  parts.push(g);
}

/** Kuh (gefleckt, mit Glocke) – Kulisse; Blick +X, gedreht um yaw. */
export function cow(parts, x, y, z, yaw = 0, s = 1) {
  const loc = [];
  loc.push(plate(1.6, 0.8, 0.8, 0, 0.7, 0, 0xf6f4ef, { r: 0.25 }));
  loc.push(plate(0.5, 0.4, 0.5, -0.3, 0.95, 0.38, 0x2a2a30, { r: 0.12 }), plate(0.4, 0.35, 0.45, 0.4, 1.1, -0.37, 0x2a2a30, { r: 0.12 }));
  for (const [lx, lz] of [[0.55, 0.28], [0.55, -0.28], [-0.55, 0.28], [-0.55, -0.28]]) loc.push(plate(0.18, 0.7, 0.18, lx, 0, lz, 0xf6f4ef, { r: 0.05 }), plate(0.2, 0.12, 0.2, lx, 0, lz, 0x3a2a2a, { r: 0.03 }));
  loc.push(plate(0.55, 0.5, 0.5, 1.0, 1.05, 0, 0xf6f4ef, { r: 0.18 }), plate(0.3, 0.26, 0.42, 1.3, 1.02, 0, 0xffb0b8, { r: 0.1 }));
  loc.push(plate(0.08, 0.2, 0.08, 0.95, 1.55, 0.18, 0xe8dcc0, { r: 0.02 }), plate(0.08, 0.2, 0.08, 0.95, 1.55, -0.18, 0xe8dcc0, { r: 0.02 }));
  loc.push(sphere(0.06, 1.2, 1.38, 0.17, 0x1a1a22), sphere(0.06, 1.2, 1.38, -0.17, 0x1a1a22));
  loc.push(sphere(0.12, 0.85, 0.82, 0, 0xffc21a));   // Glocke
  loc.push(plate(0.06, 0.5, 0.06, -0.82, 0.7, 0, 0xf6f4ef, { r: 0.02 }));
  const g = merge(loc);
  g.scale(s, s, s);
  g.rotateY(yaw);
  g.translate(x, y, z);
  parts.push(g);
}

/** Zielbanner über der Fahrbahn: zwei Masten, Querbalken mit Schachbrettband. */
export function finishBanner(parts, x, y, z, w = 9, h = 5) {
  for (const sx of [-1, 1]) parts.push(cyl(0.18, 0.22, h, x + sx * w / 2, y, z, 0xf6f4ef, 10), plate(0.6, 0.3, 0.6, x + sx * w / 2, y, z, 0xe8283a, { r: 0.08 }));
  parts.push(plate(w + 0.6, 0.9, 0.3, x, y + h - 0.9, z, 0xe8283a, { r: 0.08 }));
  for (let i = 0; i < 18; i++) for (let j = 0; j < 2; j++) parts.push(plate((w - 0.4) / 18, 0.3, 0.04, x - (w - 0.4) / 2 + (i + 0.5) * (w - 0.4) / 18, y + h - 0.75 + j * 0.32, z + 0.16, ((i + j) & 1) ? 0x1a1a22 : 0xffffff, { r: 0 }));
}

// ------------------------------------------------------------------ Tribüne mit Tierchen (La-Ola)

/** Tierchen-Vorlage (Hase, Bär, Pinguin, Vogel): weiß/hell für Instanzfarben, Augen/Nase dunkel. */
function critterGeo(kind) {
  const p = [];
  if (kind === 'hase') {
    p.push(sphere(0.3, 0, 0.32, 0, 0xffffff, { sy: 1.1, ws: 7, hs: 5 }), sphere(0.24, 0, 0.78, 0, 0xffffff, { ws: 6, hs: 4 }));
    p.push(plate(0.09, 0.42, 0.06, -0.09, 0.9, 0, 0xffffff, { r: 0.04 }), plate(0.09, 0.42, 0.06, 0.09, 0.9, 0, 0xffffff, { r: 0.04 }));
  } else if (kind === 'baer') {
    p.push(sphere(0.34, 0, 0.34, 0, 0xffffff, { sy: 1.05, ws: 7, hs: 5 }), sphere(0.27, 0, 0.82, 0, 0xffffff, { ws: 6, hs: 4 }));
    p.push(sphere(0.1, -0.2, 1.04, 0, 0xffffff, { ws: 6, hs: 4 }), sphere(0.1, 0.2, 1.04, 0, 0xffffff, { ws: 6, hs: 4 }), sphere(0.11, 0, 0.76, 0.22, 0xf0e0c8, { ws: 6, hs: 4 }));
  } else if (kind === 'pinguin') {
    p.push(sphere(0.3, 0, 0.36, 0, 0x2a2a34, { sy: 1.25, ws: 7, hs: 5 }), sphere(0.22, 0, 0.36, 0.12, 0xffffff, { sy: 1.2, ws: 6, hs: 4 }), sphere(0.22, 0, 0.82, 0, 0x2a2a34, { ws: 6, hs: 4 }));
    p.push(cone(0.06, 0.16, 0, 0.74, 0.22, 0xffa21a));
  } else {
    p.push(sphere(0.28, 0, 0.36, 0, 0xffffff, { sy: 1.05, ws: 7, hs: 5 }), sphere(0.2, 0, 0.74, 0, 0xffffff, { ws: 6, hs: 4 }), cone(0.06, 0.14, 0, 0.7, 0.2, 0xffa21a));
  }
  p.push(sphere(0.045, -0.09, kind === 'pinguin' ? 0.86 : 0.82, 0.21, 0x101018, { ws: 6, hs: 4 }), sphere(0.045, 0.09, kind === 'pinguin' ? 0.86 : 0.82, 0.21, 0x101018, { ws: 6, hs: 4 }));
  // Winke-Arme (ein Ärmchen hoch)
  p.push(plate(0.08, 0.36, 0.08, 0.32, 0.5, 0.04, kind === 'pinguin' ? 0x2a2a34 : 0xffffff, { r: 0.03 }));
  return merge(p);
}

/**
 * Zuschauer-Tribüne (statisch: Stufen, Dach mit Streifen, Werbebanden ohne Schrift, Geländer) und Tierchen als
 * Instanzen (4 Arten × je eine InstancedMesh, Instanzfarben), die eine La-Ola-Welle machen und Fähnchen schwenken.
 * o = { x (Mitte), z0, z1 (Länge entlang Z), y (Fuß), side: -1 links (Blick nach +X) | 1, rows 3 }
 */
export function grandstand(level, o) {
  const parts = [];
  const rows = o.rows ?? 3, sd = o.side ?? -1;
  const z0 = Math.max(o.z0, o.z1), z1 = Math.min(o.z0, o.z1), len = z0 - z1, zc = (z0 + z1) / 2;
  const stepD = 1.0, stepH = 0.55;
  // Stufen (zur Strecke hin abfallend): Reihe 0 vorn unten
  for (let r = 0; r < rows; r++) {
    const x = o.x + sd * (r * stepD);
    parts.push(plate(stepD + 0.05, stepH * (r + 1), len, x, o.y, zc, r % 2 ? 0xd8dce8 : 0xc8ccd8, { r: 0.04 }));
    parts.push(plate(0.1, 0.12, len, x + sd * (stepD / 2 - 0.05), o.y + stepH * (r + 1), zc, 0x3d8bff, { r: 0.02 }));
  }
  const back = o.x + sd * (rows * stepD - 0.3);
  // Rückwand und Dach (rot-weiß gestreift)
  parts.push(plate(0.3, stepH * rows + 2.6, len + 0.4, back - sd * 0.2, o.y, zc, 0x8a96b8, { r: 0.04 }));
  const roofW = rows * stepD + 1.2, roofY = o.y + stepH * rows + 2.6;
  const nStr = Math.round(len / 1.2);
  for (let i = 0; i < nStr; i++) {
    const g = plate(roofW, 0.16, len / nStr, o.x + sd * (rows * stepD / 2 - 0.3), roofY, z0 - (i + 0.5) * len / nStr, i % 2 ? 0xffffff : 0xe8283a, { r: 0.02 });
    parts.push(g);
  }
  for (const zz of [z0 - 0.3, zc, z1 + 0.3]) parts.push(cyl(0.09, 0.09, stepH * rows + 2.6, o.x - sd * 0.45, o.y, zz, 0xd8dce8, 8));
  // Bande vorn mit bunten Feldern
  const nB = Math.round(len / 2);
  for (let i = 0; i < nB; i++) parts.push(plate(0.12, 0.7, len / nB - 0.05, o.x - sd * 0.62, o.y, z0 - (i + 0.5) * len / nB, [0xffd23d, 0x3d8bff, 0x4fd04a, 0xff7ac0][i % 4], { r: 0.03 }));
  addStatic(level, merge(parts));
  level.world.add({ type: 'box', min: [Math.min(o.x - sd * 0.7, back + sd * 0.4), o.y, z1], max: [Math.max(o.x - sd * 0.7, back + sd * 0.4), o.y + stepH * rows, z0], tag: 'tribuene' });
  // Rückwand und Dach fest (das Dach ist begehbar – oben liegt in 3-6 ein Geheimnis)
  level.world.add({ type: 'box', min: [Math.min(back, back + sd * 0.4), o.y, z1], max: [Math.max(back, back + sd * 0.4), roofY, z0], tag: 'tribuene:wand' });
  const rcx = o.x + sd * (rows * stepD / 2 - 0.3);
  level.world.add({ type: 'box', min: [rcx - roofW / 2, roofY, z1], max: [rcx + roofW / 2, roofY + 0.16, z0], tag: 'tribuene:dach' });
  if (!level.view) return null;
  // Tierchen
  const kinds = ['hase', 'baer', 'pinguin', 'vogel'];
  const tints = { hase: [0xffffff, 0xd8b090, 0xc8c8d0, 0xffd8e8], baer: [0xb07040, 0x8a5a30, 0xe8d8c0], pinguin: [0xffffff], vogel: [0xffd23d, 0x6ac8ff, 0xff8a5a, 0x9ae070] };
  const seats = [];
  const per = Math.max(2, Math.floor(len / 1.1));
  const rnd = new Rnd(Math.floor(Math.abs(o.x * 13 + o.z0 * 7)) >>> 0);
  for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
    if (rnd.frac() < 0.12) continue;
    seats.push({ x: o.x + sd * (r * stepD), y: o.y + stepH * (r + 1), z: z0 - (i + 0.5) * len / per + rnd.real(-0.15, 0.15), kind: kinds[Math.floor(rnd.frac() * kinds.length)], ph: (z0 - (i + 0.5) * len / per) * 0.35, r });
  }
  const meshes = {};
  for (const k of kinds) {
    const list = seats.filter((s) => s.kind === k);
    if (!list.length) continue;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    const im = new THREE.InstancedMesh(critterGeo(k), mat, list.length);
    im.castShadow = false;
    im.frustumCulled = false;
    const c = new THREE.Color();
    list.forEach((s, i) => { c.setHex(tints[k][i % tints[k].length]); im.setColorAt(i, c); });
    meshes[k] = { im, list };
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pp = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const holder = {};
  let t = 0;
  const yawFace = sd < 0 ? Math.PI / 2 : -Math.PI / 2;   // Blick zur Strecke
  const st = { wave: 0 };
  const upd = (dt) => {
    t += visDt(level, holder, dt);
    st.wave = t;
    for (const k in meshes) {
      const { im, list } = meshes[k];
      list.forEach((s, i) => {
        const w = Math.max(0, Math.sin(t * 2.2 - s.ph * 2.2 + s.r * 0.4));
        const hop = Math.pow(w, 6) * 0.45 + Math.abs(Math.sin(t * 6 + i)) * 0.03;
        pp.set(s.x, s.y + hop, s.z);
        e.set(0, yawFace + Math.sin(t * 1.3 + i) * 0.25, Math.sin(t * 5 + i) * 0.06 * w);
        q.setFromEuler(e);
        m.compose(pp, q, sc);
        im.setMatrixAt(i, m);
      });
      im.instanceMatrix.needsUpdate = true;
    }
  };
  upd(0);
  const group = new THREE.Group();
  for (const k in meshes) {
    // Instanzen liegen nur auf der Tribüne: Hüllkugel aus den Instanzen (+ Hüpfen) → Frustum-Culling möglich
    const im = meshes[k].im;
    im.computeBoundingSphere();
    if (im.boundingSphere) im.boundingSphere.radius += 1;
    im.frustumCulled = true;
    group.add(im);
  }
  addObject(level, group, upd);
  return { seats: seats.length, st };
}

// ------------------------------------------------------------------ Murmeltiere

/**
 * Murmeltiere am Streckenrand: kleiner Erdhügel mit Loch (statisch), das Tierchen taucht im Takt auf, schaut sich um
 * und pfeift (eine InstancedMesh für alle). list = [[x, y, z, phase], …]
 */
export function marmots(level, list) {
  const parts = [];
  for (const [x, y, z] of list) {
    parts.push(sphere(0.55, x, y - 0.18, z, 0x8a5a32, { sx: 1.2, sy: 0.45, sz: 1.2 }));
    parts.push(plate(0.5, 0.02, 0.5, x, y + 0.06, z, 0x2a1a10, { r: 0.2 }));
  }
  addStatic(level, merge(parts), { castShadow: false });
  if (!level.view) return null;
  const g = merge([
    sphere(0.22, 0, 0.26, 0, 0xc8945a, { sy: 1.25 }), sphere(0.16, 0, 0.58, 0.02, 0xc8945a),
    sphere(0.08, 0, 0.55, 0.14, 0xf0d8b0), sphere(0.03, -0.06, 0.64, 0.14, 0x101018), sphere(0.03, 0.06, 0.64, 0.14, 0x101018),
    sphere(0.05, -0.11, 0.72, 0, 0xa8784a), sphere(0.05, 0.11, 0.72, 0, 0xa8784a),
    plate(0.06, 0.14, 0.05, -0.1, 0.32, 0.17, 0xa8784a, { r: 0.02 }), plate(0.06, 0.14, 0.05, 0.1, 0.32, 0.17, 0xa8784a, { r: 0.02 }),
  ]);
  const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), list.length);
  im.castShadow = false;
  im.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pp = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const holder = {};
  let t = 0;
  const upd = (dt) => {
    t += visDt(level, holder, dt);
    list.forEach(([x, y, z, ph = 0], i) => {
      const c = ((t * 0.25 + ph) % 1 + 1) % 1;
      const up = c < 0.1 ? sstep(c / 0.1) : c < 0.55 ? 1 : c < 0.65 ? 1 - sstep((c - 0.55) / 0.1) : 0;
      pp.set(x, y - 0.75 + up * 0.75, z);
      e.set(0, Math.sin(t * 1.7 + i) * 0.9, 0);
      q.setFromEuler(e);
      sc.set(1, up > 0.02 ? 1 : 0.001, 1);
      m.compose(pp, q, sc);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  upd(0);
  addObject(level, im, upd);
  return im;
}
