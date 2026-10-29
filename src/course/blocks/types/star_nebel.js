// Bausteine Nebel der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“; Bauplan S-8 „verschneiter Spukfriedhof
// im Nebel, Boden erscheint/verschwindet, auf- und absteigende Nebelplattformen (100 m), Floßfahrt über Giftsumpf“).
//
// nebelplattform – Steinplatte(n), die im Takt aus dem Nebel aufsteigen und wieder hineinsinken (mode 'heben', trägt mit;
//   wer beim Absinken oben bleibt, sinkt mit in den Nebel) oder am Ort erscheinen und verschwinden (mode 'blinken': vorher
//   flackern sie, unsichtbar = nicht fest). Unter der Nebeldecke (fog) werden sie blass und verschwinden im Dunst.
//   { type: 'nebelplattform', id, pos: [x, y, z] (Mitte der Oberseite in der oberen Lage), size: [2.6, 0.5, 2.6],
//     parts: [{ pos, size, phase }] | from, to, n (Reihe), mode: 'heben' | 'blinken', depth: 3 (m Weg nach unten),
//     up: 2.6 (s oben bzw. sichtbar), down: 2 (s unten bzw. weg), move: 1.1 (s Fahrt; blinken: Ein-/Ausblenden 0,3 s),
//     warn: 0.7 (s Vorwarnung: zittert/flackert), phase, stagger: 1.1 (s je Teil), fog: pos.y − 0.8 (Höhe der Nebeldecke),
//     color: 'lila' | 'mint' | 'stein', idle: false (true: wartet auf start()) }
//   level.named.get(id) = { parts: [{ state ('oben'|'warn'|'sinkt'|'unten'|'steigt' bzw. 'da'|'flackert'|'weg'|'kommt'), k
//     (0 unten/weg … 1 oben/da), solid, mb }], start(), stop(), info() }; MovingBox-Tag 'nebelplattform'; star(level).fogs.
//   Beispiel: { type: 'nebelplattform', id: 'nebel1', from: [0, 0, -40], to: [0, 0, -52], n: 4, depth: 3 }
//
// nebelboden – dichter Bodennebel als Fläche (Nebelschichten wie `nebel` der Halloween-Welt, darunter ein undurchsichtiger
//   Dunst-Boden, der alles Tiefere verbirgt) mit Absturz darunter (kill 'fall' bzw. 'gift'); optional Bodenstücke, die im
//   Nebel erscheinen und verschwinden (Teile wie nebelplattform 'blinken').
//   { type: 'nebelboden', id, pos: [x, y, z] (Mitte, y = Nebeloberfläche), size: [w, d], depth: 1.5 (Absturzebene so weit
//     darunter), kill: 'fall' | 'gift' | false, density: 0.8, color: 0xdfe6f8, layers: 3, height: 1.2,
//     parts: [{ pos, size, up, down, phase }] (erscheinende Bodenstücke, Oberseite = pos.y), warn: 0.7 }
//   level.named.get(id) = { surface, parts (Griff der Bodenstücke), info() }; Form-Tag 'nebelboden' (kill); star(level).fogs.

import * as THREE from 'three';
import { v3, addObject, box, lin, mixc, smooth, colorize, merge } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { buildNebel } from './hw_glibber.js';
import { star, MovingBox, figureInside, cycle, ease, figures } from '../starkit.js';

const STONE = {
  lila: [0xb8a8e8, 0xe8e0ff, 0x6a5aa8, 0xd0c0ff],
  mint: [0xa8e8d8, 0xe0fff6, 0x4a9a88, 0xb0ffe8],
  stein: [0xc8ccd8, 0xf0f2f8, 0x7a7e8e, 0xe0e8ff],
};

/** Grabplatten-Optik (Ursprung Mitte der Oberseite): Steinplatte mit leuchtender Rune oben. */
function slabGeo(w, h, d, cols) {
  const [a, hi, lo, glow] = cols.map(lin);
  const g = box(w, h, d, 0, -h / 2, 0, cols[0], { r: Math.min(0.12, h * 0.3) });
  const body = colorize(g, (p, n, o) => mixc(lo, a, smooth(-h, 0, p.y) * 0.7 + (n.y > 0.5 ? 0.3 : 0), o));
  const rune = new THREE.RingGeometry(Math.min(w, d) * 0.18, Math.min(w, d) * 0.26, 16, 1);
  rune.rotateX(-Math.PI / 2); rune.translate(0, 0.012, 0);
  const r2 = colorize(rune.toNonIndexed(), (p, n, o) => { o[0] = glow[0]; o[1] = glow[1]; o[2] = glow[2]; });
  r2.deleteAttribute('uv');
  void hi;
  return merge([body, r2]);
}

/** Teile (Platten) aus parts | from/to/n | pos. */
function partsOf(spec, size) {
  if (Array.isArray(spec.parts)) return spec.parts.map((q) => ({ pos: v3(q.pos), size: q.size ?? size, phase: q.phase, up: q.up, down: q.down }));
  if (Array.isArray(spec.from) && Array.isArray(spec.to)) {
    const a = v3(spec.from), b = v3(spec.to), n = Math.max(1, spec.n ?? 3);
    return Array.from({ length: n }, (_, i) => { const u = n === 1 ? 0 : i / (n - 1); return { pos: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }, size }; });
  }
  return [{ pos: v3(spec.pos), size }];
}

// ===================================================================== Nebelplattform

export function buildNebelplattform(level, spec) {
  const size = spec.size ?? [2.6, 0.5, 2.6];
  const mode = spec.mode === 'blinken' ? 'blinken' : 'heben';
  const depth = spec.depth ?? 3, up = spec.up ?? 2.6, down = spec.down ?? 2, warn = spec.warn ?? 0.7;
  const move = spec.move ?? (mode === 'blinken' ? 0.3 : 1.1);
  const stagger = spec.stagger ?? 1.1;
  const st = { running: !spec.idle };
  const parts = partsOf(spec, size).map((q, i) => {
    const s = q.size;
    const top = q.pos.y;
    const mb = new MovingBox(level, q.pos.x, top - s[1], q.pos.z, s[0], s[1], s[2], { tag: 'nebelplattform' });
    const ph = (q.phase ?? (spec.phase ?? 0) + i * stagger);
    const cyc = mode === 'heben'
      ? cycle([{ name: 'oben', t: Math.max(0.1, (q.up ?? up) - warn) }, { name: 'warn', t: warn }, { name: 'sinkt', t: move }, { name: 'unten', t: q.down ?? down }, { name: 'steigt', t: move }], ph)
      : cycle([{ name: 'da', t: Math.max(0.1, (q.up ?? up) - warn) }, { name: 'flackert', t: warn }, { name: 'geht', t: move }, { name: 'weg', t: q.down ?? down }, { name: 'kommt', t: move }], ph);
    return { i, mb, top, s, cyc, state: mode === 'heben' ? 'oben' : 'da', k: 1, solid: true, x: q.pos.x, z: q.pos.z };
  });
  const fogY = spec.fog ?? Math.min(...parts.map((q) => q.top)) - 0.8;
  const handle = {
    parts, kind: 'nebelplattform', mode,
    start() { st.running = true; }, stop() { st.running = false; },
    info: () => ({ states: parts.map((q) => q.state).join(','), k: parts.map((q) => +q.k.toFixed(2)), solid: parts.filter((q) => q.solid).length }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  star(level).fogs.push(handle);
  level.onStep((dt) => {
    for (const q of parts) {
      if (!st.running) { q.mb.still(); continue; }
      const a = q.cyc.at(level.time);
      q.state = a.name;
      if (mode === 'heben') {
        q.k = a.name === 'oben' || a.name === 'warn' ? 1 : a.name === 'sinkt' ? 1 - ease(a.u) : a.name === 'unten' ? 0 : ease(a.u);
        const y = q.top - q.s[1] - (1 - q.k) * depth;
        q.mb.moveTo(q.x, y, q.z, dt);
        if (a.name === 'warn') q.mb.still();
      } else {
        q.k = a.name === 'da' || a.name === 'flackert' ? 1 : a.name === 'geht' ? 1 - a.u : a.name === 'weg' ? 0 : a.u;
        const want = q.k > 0.5;
        if (want && !q.mb.on) {
          const b = { x0: q.x - q.s[0] / 2, x1: q.x + q.s[0] / 2, y0: q.top - q.s[1], y1: q.top, z0: q.z - q.s[2] / 2, z1: q.z + q.s[2] / 2 };
          if (!figureInside(level, b)) q.mb.setSolid(true);
        } else if (!want && q.mb.on) q.mb.setSolid(false);
        q.mb.still();
      }
      q.solid = q.mb.on;
    }
  });
  if (!level.view) return handle;
  const C = STONE[spec.color] ?? STONE.lila;
  const geo = slabGeo(size[0], size[1], size[2], C);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: new THREE.Color(C[3]).multiplyScalar(0.08) });
  const mesh = new THREE.InstancedMesh(geo, mat, parts.length);
  mesh.name = 'nebelplattformen';
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const fogC = new THREE.Color(spec.fogColor ?? 0xdfe6f8), base = new THREE.Color(1, 1, 1), tmp = new THREE.Color();
  for (let i = 0; i < parts.length; i++) mesh.setColorAt(i, base);
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  const holder = {};
  let t = 0;
  addObject(level, mesh, (dt) => {
    t += visDt(level, holder, dt);
    for (const q of parts) {
      const top = mode === 'heben' ? q.mb.pos.y + q.s[1] : q.top;
      const shake = q.state === 'warn' || q.state === 'flackert' ? Math.sin(t * 45 + q.i) * 0.04 : 0;
      v.set(q.x + shake, top, q.z);
      e.set(0, 0, shake * 0.6); q4.setFromEuler(e);
      let k = 1;
      if (mode === 'blinken') k = q.state === 'flackert' ? (Math.sin(t * 30) > 0 ? 1 : 0.35) : q.k;
      const s = mode === 'blinken' ? Math.max(0.0001, 0.6 + 0.4 * k) * (k < 0.05 ? 0 : 1) : 1;
      sc.set(s, s, s);
      m4.compose(v, q4, sc);
      mesh.setMatrixAt(q.i, m4);
      // unter der Nebeldecke blass (verschwindet im Dunst)
      const under = smooth(0, 1.2, fogY - top + 0.2);
      tmp.copy(base).lerp(fogC, Math.min(1, under * 0.9 + (1 - k) * 0.6));
      mesh.setColorAt(q.i, tmp);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return handle;
}

// ===================================================================== Nebelboden

export function buildNebelboden(level, spec) {
  const p = v3(spec.pos);
  const [w, d] = spec.size ?? [24, 24];
  const depth = spec.depth ?? 1.5;
  const handle = { kind: 'nebelboden', surface: p.y, parts: null };
  if (spec.kill !== false) {
    level.world.add({ type: 'box', min: [p.x - w / 2, p.y - depth - 2, p.z - d / 2], max: [p.x + w / 2, p.y - depth, p.z + d / 2], kill: spec.kill === 'gift' ? 'gift' : 'fall', tag: 'nebelboden' });
  }
  if (Array.isArray(spec.parts) && spec.parts.length) {
    handle.parts = buildNebelplattform(level, { parts: spec.parts, mode: 'blinken', size: [3, 0.4, 3], warn: spec.warn ?? 0.7, color: spec.color === 'mint' ? 'mint' : 'stein', fog: p.y + 0.05, fogColor: spec.color ?? 0xdfe6f8, up: spec.up, down: spec.down });
  }
  handle.info = () => ({ surface: p.y, parts: handle.parts?.info?.() ?? null, kill: spec.kill ?? 'fall' });
  if (spec.id) level.named.set(spec.id, handle);
  star(level).fogs.push(handle);
  if (!level.view) return handle;
  // undurchsichtiger Dunst-Boden knapp unter der Oberfläche (verbirgt alles Tiefere), darüber treibende Schichten
  const col = new THREE.Color(spec.color ?? 0xdfe6f8);
  const g = new THREE.PlaneGeometry(w, d, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(p.x, p.y - 0.25, p.z);
  const mat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.92), transparent: true, opacity: 0.9, depthWrite: false, fog: true });
  const sheet = new THREE.Mesh(g, mat);
  sheet.name = 'nebelboden';
  sheet.renderOrder = 3;
  addObject(level, sheet);
  buildNebel(level, { pos: [p.x, p.y - 0.3, p.z], size: [w, d], height: spec.height ?? 1.2, layers: spec.layers ?? 3, density: spec.density ?? 0.8, color: spec.color ?? 0xdfe6f8, edge: spec.edge ?? 3, drift: spec.drift ?? [0.3, 0.1] });
  void figures;
  return handle;
}

export const TYPES = { nebelplattform: buildNebelplattform, nebelboden: buildNebelboden };
