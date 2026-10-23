// Welt-3-Bausteine Lagune und See (Bauplan 3-5 „Lagune mit Röhren-Netz, Schwimmen, Wasserspiegel steigt“, 3-Kapitän
// „unten Wasser, Mitte Steg … per Schalter Wasserstand und Steg anheben, Glasröhren mit Abzweigungen“). Wasserschalter
// und Wandriss sind Entitäten (entities/kinds/w3_gimmicks.js).
//
// lagune – Wasserbecken mit Namen, dessen Stand sich ändern lässt (Aktion { water: { id, y, speed } } bzw.
//   handle.setLevel(y, speed) bzw. Motor level.setWaterLevel(id, y, speed)): Wasser zum Schwimmen (Form mit Flag water
//   und waterId = id), türkiser Körper mit Oberfläche (folgt shape.top), Lichtflecken auf dem Sandboden. Den Stand
//   fährt der Motor (level.setWaterLevel: Auftrieb, floats, onWaterLevel); ohne Motor-Haken hebt sich die Lagune selbst.
//   { type: 'lagune', id, pos: [x, y, z] (Mitte des Beckenbodens), size: [w, h, d] (h = Tiefe, Oberfläche y + h),
//     bed: 1 (Sandboden-Dicke unter pos.y, 0 = keiner), color, deep, caustics: 0.4 (Lichtflecken auf dem Boden,
//     false = keine), current: [x, y, z] (Strömung m/s wie beim Motor-Baustein water), rise: { to, speed: 1.5,
//     auto: false } (Signal start fährt auf rise.to) }
//   level.named.get(id) = { top, level0, target, moving, shape, setLevel(y, speed), start(), stop(), info() }
//   Ein Becken ohne Sandboden/Lichtflecken liefert auch der Motor-Baustein `water` (mit id, current, rise).
//
// holzsteg – Holzsteg mit Hub (Modell 'holzsteg'): das Deck schwimmt auf (folgt dem Wasserstand unter dem Steg, float m
//   über der Oberfläche) zwischen Grundlage und hub m darüber; ohne Wasser per Signal { start|open: id } (hebt) bzw.
//   { stop|close } (senkt). Verlauf entlang lokal +X (yaw im 90°-Raster).
//   { type: 'holzsteg', pos (Anfang, Fußpunkt der Pfähle), yaw: 0, length: 5, width: 2, hub: 2, float: 0.1,
//     water: true (Wasser folgen) | false, speed: 2, id }   level.named.get(id) = { lift (0..1), deckY, open(), close() }
// steg – fester Holzsteg auf Pfählen (Deck auf y + height).
//   { type: 'steg', pos (Anfang), yaw: 0, length: 4, width: 2, height: 1.2 }
//
// rohrnetz – Röhren-Netz zum Durchschwimmen: Glasröhre (glasspipe, mit Gabelungen/Kanone/Münzen) mit Wasserfüllung und
//   Luftblasen. Felder wie glasspipe (path, branches, radius, speed, cannon, coins, oneWay, enter, id …) + water: true.
//   { type: 'rohrnetz', path: [[x, y, z], …], branches: [{ at, path }], radius: 1, water: true }
// rohrteile – grüne Röhrenstücke (Modell 'rohrnetz'): items [{ kind: 'gerade'|'bogen'|'t'|'kreuz'|'ende', pos
//   (Unterkante am Anschluss), yaw, length, radius, color }], solid: true (Kollision als Quader).
//
// koralle – { type: 'koralle', pos, kind: 'ast'|'faecher'|'hirn', scale: 1, yaw, sway: true (eigenes Objekt; false =
//   verschmolzen), solid: false }
// seetang – Seetang-Büschel, wiegt sich (Strömung current −1..1): { type: 'seetang', pos, height: 2.5, count: 3, current: 0 }
// blasen – aufsteigende Luftblasen über einem Schlot: { type: 'blasen', pos, height: 3, count: 10 }
// schiffswrack – Kulisse (verschmolzen): { type: 'schiffswrack', pos, yaw, size: 1, shadow: true }

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, sz3, themeOf, addObject, addStatic, box, hex } from '../kit.js';
import { MovingBox, modelObject, bakeModel, rotXZ, snapYaw, waterTopAt, noShadow } from '../w3kit.js';
import { buildGlassPipe } from './glasspipe.js';
import { visDt } from '../../entities/gimmick.js';

// ------------------------------------------------------------------ Lagune

export function buildLagune(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [12, 3, 12]);
  const th = themeOf(level);
  const cur = Array.isArray(spec.current) ? { x: spec.current[0] ?? 0, y: spec.current[1] ?? 0, z: spec.current[2] ?? 0 } : null;
  const shape = { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], water: true, solid: false, camIgnore: true, tag: 'water', waterId: spec.id ?? null, current: cur };
  const id = level.world.add(shape);
  const bed = spec.bed ?? 1;
  if (bed > 0) {
    level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y - bed, p.z - s.z / 2], max: [p.x + s.x / 2, p.y, p.z + s.z / 2], tag: 'lagune:boden' });
    if (level.view) {
      const g = box(s.x, bed, s.z, p.x, p.y - bed / 2, p.z, th.sandBed ?? 0xf0d8a0, { r: 0.1, topColor: th.sandBedTop ?? 0xf6e2b0 });
      addStatic(level, g);
    }
  }
  // Motor-Haken: level.setWaterLevel fährt alle Formen mit waterId (vor den Figuren, mit Auftrieb/floats)
  const motor = spec.id != null && typeof level.setWaterLevel === 'function';
  const rise = spec.rise ?? null;
  let own = p.y + s.y;
  const h = {
    id: spec.id ?? null, shape, level0: p.y + s.y, target: p.y + s.y, speed: 1.5,
    get top() { return motor ? shape.top : own; },
    get moving() { return Math.abs(h.target - h.top) > 1e-6; },
    setLevel(y, speed = 1.5) {
      h.target = Math.max(p.y + 0.05, y); h.speed = speed;
      if (motor) level.setWaterLevel(spec.id, h.target, speed);
    },
    start() { if (rise) h.setLevel(rise.to, rise.speed ?? 1.5); },
    stop() { h.setLevel(h.top, 0); },
    info() { return { top: +h.top.toFixed(3), target: +h.target.toFixed(3), moving: h.moving, motor }; },
  };
  if (spec.id) level.named.set(spec.id, h);
  if (!motor) {
    level.onStep((dt) => {
      const d = h.target - own;
      if (Math.abs(d) <= 1e-6) return;
      const st = h.speed > 0 ? h.speed * dt : Infinity;
      own = Math.abs(d) <= st ? h.target : own + Math.sign(d) * st;
      shape.max = [shape.x1, own, shape.z1];
      level.world.update(id);
    });
  }
  if (rise?.auto) h.start();
  if (!level.view) return h;
  const group = new THREE.Group();
  const deep = new THREE.MeshStandardMaterial({ color: hex(spec.deep, th.waterDeep), transparent: true, opacity: 0.42, roughness: 0.2, depthWrite: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(s.x - 0.02, 1, s.z - 0.02), deep);
  body.renderOrder = 1;
  const nx = Math.max(2, Math.min(40, Math.round(s.x))), nz = Math.max(2, Math.min(40, Math.round(s.z)));
  const surfGeo = new THREE.PlaneGeometry(s.x - 0.02, s.z - 0.02, nx, nz);
  surfGeo.rotateX(-Math.PI / 2);
  const surf = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ color: hex(spec.color, th.water), transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.1, depthWrite: false }));
  surf.receiveShadow = true;
  surf.renderOrder = 1;
  group.add(body, surf);
  group.position.set(p.x, p.y, p.z);
  // Lichtflecken (Kaustik) auf dem Beckenboden: additiv, Weltkoordinaten (sieht von oben und unter Wasser gleich aus)
  let caust = null;
  if (spec.caustics !== false) {
    const cg = new THREE.PlaneGeometry(s.x - 0.1, s.z - 0.1);
    cg.rotateX(-Math.PI / 2);
    caust = new THREE.Mesh(cg, new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, k: { value: spec.caustics ?? 0.4 }, col: { value: new THREE.Color(th.caustics ?? 0xc8ffff) } },
      vertexShader: 'varying vec2 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float t; uniform float k; uniform vec3 col; varying vec2 vW;
        void main() {
          vec2 q = vW * 0.55;
          float c = 0.0;
          for (int i = 0; i < 2; i++) {
            float fi = float(i);
            q += vec2(sin(q.y * 1.7 + t * 0.9 + fi), cos(q.x * 1.5 - t * 0.7 + fi * 1.3)) * 0.5;
            c += abs(sin(q.x * 2.1) + sin(q.y * 2.3));
          }
          float v = max(0.0, 1.0 - c * 0.45);
          gl_FragColor = vec4(col * v * v * v * k, 1.0);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    caust.position.y = 0.03;
    caust.renderOrder = 1;
    group.add(caust);
  }
  const pos = surfGeo.attributes.position;
  const base = Float32Array.from(pos.array);
  const holder = {};
  let t = 0;
  addObject(level, group, (dt) => {
    t += visDt(level, holder, dt);
    if (caust) caust.material.uniforms.t.value = t;
    const depth = Math.max(0.05, h.top - p.y);
    body.scale.y = depth - 0.06; body.position.y = (depth - 0.06) / 2;
    surf.position.y = depth - 0.04;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 1.7 + t * 2.2) * 0.04 + Math.cos(z * 1.3 + t * 1.7) * 0.04;
    }
    pos.needsUpdate = true;
  });
  return h;
}

// ------------------------------------------------------------------ Holzsteg (hebt sich mit dem Wasser)

export function buildHolzsteg(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? 0);
  const L = spec.length ?? 5, W = spec.width ?? 2, hub = spec.hub ?? 2;
  const c = rotXZ(L / 2, 0, yaw);
  const alongX = Math.abs(Math.cos(yaw)) > 0.5;
  const cx = p.x + c.x, cz = p.z + c.z;
  const bx = new MovingBox(level, cx, p.y + 0.3, cz, alongX ? L : W, 0.2, alongX ? W : L, { tag: 'holzsteg' });
  const st = { lift: 0, deckY: p.y + 0.5, want: 0, open() { st.want = 1; }, close() { st.want = 0; }, start() { st.want = 1; }, stop() { st.want = 0; }, toggle() { st.want = st.want ? 0 : 1; } };
  if (spec.id) level.named.set(spec.id, st);
  const speed = spec.speed ?? 2;
  const follow = spec.water !== false;
  level.onStep((dt) => {
    let target = st.want;
    if (follow) {
      const wt = waterTopAt(level, cx, cz, p.y + 0.5 + hub + 6, hub + 12);
      if (wt !== null) target = Math.max(target, (wt + (spec.float ?? 0.1) - (p.y + 0.5)) / Math.max(0.01, hub));
    }
    target = Math.max(0, Math.min(1, target));
    const l0 = st.lift;
    const step = (speed / Math.max(0.01, hub)) * dt;
    st.lift = Math.abs(target - st.lift) <= step ? target : st.lift + Math.sign(target - st.lift) * step;
    st.deckY = p.y + 0.5 + st.lift * hub;
    if (st.lift !== l0) bx.moveTo(cx, st.deckY - 0.2, cz, dt); else bx.still();
  });
  if (level.view) modelObject(level, 'holzsteg', { length: L, width: W, hub }, p.x, p.y, p.z, yaw, () => ({ lift: st.lift }));
  return st;
}

export function buildSteg(level, spec) {
  const p = v3(spec.pos);
  const yaw = snapYaw(spec.yaw ?? 0);
  const L = spec.length ?? 4, W = spec.width ?? 2, H = spec.height ?? 1.2;
  const c = rotXZ(L / 2, 0, yaw);
  const alongX = Math.abs(Math.cos(yaw)) > 0.5;
  const sx = alongX ? L : W, sz = alongX ? W : L;
  level.world.add({ type: 'box', min: [p.x + c.x - sx / 2, p.y + H - 0.22, p.z + c.z - sz / 2], max: [p.x + c.x + sx / 2, p.y + H, p.z + c.z + sz / 2], tag: 'steg' });
  bakeModel(level, 'steg', { length: L, width: W, height: H }, p.x, p.y, p.z, yaw, 1);
}

// ------------------------------------------------------------------ Röhren-Netz (Glasröhre mit Wasser)

export function buildRohrnetz(level, spec) {
  const net = buildGlassPipe(level, { ...spec, type: 'glasspipe' });
  if (!net || !level.view || spec.water === false) return net;
  const R = net.R;
  const tracks = [...new Set(net.edges.map((e) => e.tr))];
  const th = themeOf(level);
  const mat = new THREE.MeshStandardMaterial({ color: hex(spec.waterColor, th.water), transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false, emissive: 0x062a3a });
  const tubes = tracks.map((tr) => new THREE.TubeGeometry(tr.curve, Math.max(8, Math.ceil(tr.L / 0.6)), R * 0.9, 14, false));
  const wm = new THREE.Mesh(tubes.length > 1 ? mergeGeometries(tubes, false) : tubes[0], mat);
  wm.renderOrder = 2;
  addObject(level, wm);
  // Luftblasen im Rohr: eine Punktwolke, wandert die Mittellinien entlang
  const n = Math.min(80, Math.round(tracks.reduce((a, t) => a + t.L, 0) * 1.2));
  const g = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8fbff, size: 0.14, transparent: true, opacity: 0.8, depthWrite: false }));
  pts.frustumCulled = false;
  const seeds = Array.from({ length: n }, (_, i) => ({ tr: tracks[i % tracks.length], u: (i * 0.618) % 1, o: [Math.sin(i * 2.3) * R * 0.5, Math.cos(i * 1.7) * R * 0.5] }));
  const v = new THREE.Vector3();
  const holder = {};
  addObject(level, pts, (dt) => {
    const d = visDt(level, holder, dt);
    seeds.forEach((s, i) => {
      s.u = (s.u + d * 0.6 / Math.max(1, s.tr.L)) % 1;
      s.tr.curve.getPointAt(s.u, v);
      arr[i * 3] = v.x + s.o[0]; arr[i * 3 + 1] = v.y + s.o[1] * 0.6; arr[i * 3 + 2] = v.z + s.o[1] * 0.4;
    });
    g.attributes.position.needsUpdate = true;
  });
  return net;
}

export function buildRohrteile(level, spec) {
  for (const it of spec.items ?? [spec]) {
    const p = v3(it.pos);
    const yaw = it.yaw ?? 0, R = it.radius ?? 0.9, L = it.length ?? 3;
    const kind = it.kind ?? 'gerade';
    bakeModel(level, 'rohrnetz', { kind, length: L, radius: R, color: it.color !== undefined ? hex(it.color) : undefined }, p.x, p.y, p.z, yaw, 1);
    if ((it.solid ?? spec.solid) === false) continue;
    const add = (lx0, lx1, lz0, lz1) => {
      const xs = [], zs = [];
      for (const a of [lx0, lx1]) for (const b of [lz0, lz1]) { const w = rotXZ(a, b, yaw); xs.push(p.x + w.x); zs.push(p.z + w.z); }
      level.world.add({ type: 'box', min: [Math.min(...xs), p.y, Math.min(...zs)], max: [Math.max(...xs), p.y + 2 * R, Math.max(...zs)], tag: 'rohrteil' });
    };
    if (kind === 'gerade') add(0, L, -R, R);
    else if (kind === 'ende') add(0, 1.2, -R, R);
    else if (kind === 't') { add(0, 4 * R, -R, R); add(R, 3 * R, R, 2 * R); }
    else if (kind === 'kreuz') { add(0, 4 * R, -R, R); add(R, 3 * R, R, 2 * R); add(R, 3 * R, -2 * R, -R); }
    else if (kind === 'bogen') { add(0, R, -R, R); add(R, 2 * R, -R * 0.4, R * 1.4); add(R, 3 * R, R, 2 * R); }
  }
}

// ------------------------------------------------------------------ Kulisse unter Wasser

export function buildKoralle(level, spec) {
  const p = v3(spec.pos), sc = spec.scale ?? 1, yaw = spec.yaw ?? (p.x * 1.3 + p.z) % 6.28;
  const kind = spec.kind ?? 'ast';
  if (spec.sway === false || kind === 'hirn') bakeModel(level, 'koralle', { kind }, p.x, p.y, p.z, yaw, sc);
  else if (level.view) { const m = noShadow(modelObject(level, 'koralle', { kind }, p.x, p.y, p.z, yaw, {})); m?.root.scale.setScalar(sc); }
  if (spec.solid) level.world.add({ type: 'cyl', x: p.x, z: p.z, r: 0.5 * sc, y0: p.y, y1: p.y + 1.2 * sc, tag: 'koralle' });
}

export function buildSeetang(level, spec) {
  const p = v3(spec.pos);
  if (!level.view) return;
  noShadow(modelObject(level, 'seetang', { height: spec.height ?? 2.5, count: spec.count ?? 3 }, p.x, p.y, p.z, spec.yaw ?? 0, { current: spec.current ?? 0 }));
}

export function buildBlasen(level, spec) {
  const p = v3(spec.pos);
  if (!level.view) return;
  noShadow(modelObject(level, 'blasen', { height: spec.height ?? 3, count: spec.count ?? 10 }, p.x, p.y, p.z, 0, {}));
}

export function buildSchiffswrack(level, spec) {
  const p = v3(spec.pos);
  bakeModel(level, 'schiffswrack', { size: spec.size ?? 1 }, p.x, p.y, p.z, spec.yaw ?? 0, 1, {}, { castShadow: spec.shadow !== false });
}

export const TYPES = {
  lagune: buildLagune, holzsteg: buildHolzsteg, steg: buildSteg, rohrnetz: buildRohrnetz, rohrteile: buildRohrteile,
  koralle: buildKoralle, seetang: buildSeetang, blasen: buildBlasen, schiffswrack: buildSchiffswrack,
};
