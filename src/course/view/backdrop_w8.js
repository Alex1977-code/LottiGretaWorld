// Kulissen-Bausteine der Welt-8-Themen „Brummbär-Rummelplatz“ (theme_rainfort/dunes/cookie/nightfort/dungeon/darkghost/
// inferno/baronpark.js): über die Haken theme.buildBackdrop(sky, bounds, rnd, yBase) und theme.updateBackdrop(sky, dt, camera)
// aus Sky.fit/Sky.update gerufen (sky.group = fest in der Welt, sky.domeGroup = folgt der Kamera). Je Kulisse wenige
// verschmolzene Meshes (Welt-Material bzw. unbeleuchtet), Bewegtes (Regen, Blitzschimmer, Zahnräder, Riesenrad, Blasen,
// Funken) als wenige Objekte. Jede Funktion liefert ein Objekt für ihre animate…-Funktion.
//
//   rain(sky, rnd, o) / animateRain(f, dt, camera)          Regenstriche um die Kamera (eine LineSegments)
//   softStorm(sky, rnd, o) / animateSoftStorm(f, dt)         sanfter Wetterleuchten-Schimmer hinter den Wolken (kein Blitz)
//   rainFort(sky, bounds, rnd, yBase, o)                     Regenfestung: Mauern/Türme im Dunst, nasser Burggraben mit
//                                                            Spiegelungen der Fensterlichter, tiefe Wolkenbänke
//   duneSea(sky, bounds, rnd, yBase, o)                      Dünenmeer im Abendlicht, Baron-Sandstatuen am Horizont
//   cookieFactory(sky, bounds, rnd, yBase, o)                Keksfabrik: Hallenwände in Zuckerguss-Farben, drehende Keks-
//                                                            Zahnräder, Förderbänder, Schornsteine mit Zuckerdampf
//   nightFort(sky, bounds, rnd, yBase, o)                    Nacht-Festung: schwarze Silhouetten, ganz wenige Fensterlichter,
//                                                            blasse Sterne
//   dungeonDeep(sky, bounds, rnd, yBase, o)                  Unterwasser-Festung: Bogenmauern, vergitterte Leuchtfenster,
//                                                            Ketten, Lichtschächte von oben, Seetang
//   ghostDark(sky, bounds, rnd, yBase, o)                    stockdunkles Spukhaus: nur schemenhafte Wände, blinzelnde
//                                                            Geisteraugen im Dunkeln (freundlich)
//   crystalInferno(sky, bounds, rnd, yBase, o)               Lava-Inferno: Lavasee, leuchtende Kristallgruppen, Vulkane
//   baronPark(sky, bounds, rnd, yBase, o)                    Rummelplatz um den großen Turm: Baron-Turm, Riesenrad (dreht),
//                                                            Achterbahn-Bögen, Zelte, Lichterketten, Ballons
//   animateW8(f, dt, camera)                                 gemeinsamer Animations-Haken aller Kulissen

import * as THREE from 'three';
import { colorize, merge, lin, mixc, smooth } from '../../three/world/geometry.js';
import { flowLava, animateLava, embers, animateEmbers } from './backdrop_w7.js';
import { starField } from './backdrop_w2.js';

const TAU = Math.PI * 2;
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const C = (h) => lin(h);
const fill = (g, col) => { const c = Array.isArray(col) ? col : C(col); return colorize(ni(g), (p, n, o) => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }); };
const shade = (g, lo, hi, a = -0.6, b = 0.8) => { const L = Array.isArray(lo) ? lo : C(lo), H = Array.isArray(hi) ? hi : C(hi); return colorize(ni(g), (p, n, o) => mixc(L, H, smooth(a, b, n.y * 0.6 + n.z * 0.3 - n.x * 0.2), o)); };
const sides = (b) => ({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
const basic = (sky, extra = {}) => sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, ...extra }));
const world = (sky, extra = {}) => sky.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, ...extra }));

function addMesh(sky, g, mat, parent = sky.group, order = 0) {
  if (!g) return null;
  const mesh = new THREE.Mesh(sky.track(g), mat);
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = order;
  parent.add(mesh);
  return mesh;
}

/** Punkte rund um den Level (links, rechts, hinten) im Abstand near … far. */
function* ring(bounds, rnd, n, near, far) {
  const { x0, x1, z0, z1 } = sides(bounds);
  for (let i = 0; i < n; i++) {
    const k = i % 5;
    if (k === 4) yield { x: rnd.real(x0 - far, x1 + far), z: z0 - rnd.real(near, far) };
    else { const s = k % 2 ? 1 : -1; yield { x: s < 0 ? x0 - rnd.real(near, far) : x1 + rnd.real(near, far), z: rnd.real(z0 - far * 0.6, z1 + near) }; }
  }
}

function canvasTex(sky, size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = sky.track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softDot = (sky) => canvasTex(sky, 64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

/** Leuchtpunkte (eine Points-Wolke, additiv). */
function glowDots(sky, list, o = {}) {
  if (!list.length) return null;
  const pos = new Float32Array(list.length * 3), col = new Float32Array(list.length * 3);
  list.forEach((p, i) => {
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    const c = new THREE.Color(p.c ?? o.color ?? 0xffffff);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = sky.track(new THREE.PointsMaterial({ size: o.size ?? 2.5, map: softDot(sky), vertexColors: true, transparent: true, opacity: o.opacity ?? 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: o.fog ?? true }));
  const pts = new THREE.Points(sky.track(g), mat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  (o.parent ?? sky.group).add(pts);
  return { pts, base: mat.opacity, t: 0, blink: o.blink ?? 0 };
}

// ------------------------------------------------------------------ Regen, Wetterleuchten

export function rain(sky, rnd, o = {}) {
  const n = o.n ?? 520;
  const [bw, bh, bd] = o.box ?? [40, 22, 40];
  const len = o.len ?? 0.7;
  const pos = new Float32Array(n * 6);
  const seeds = [];
  for (let i = 0; i < n; i++) seeds.push({ x: rnd.real(0, bw), y: rnd.real(0, bh), z: rnd.real(0, bd), v: rnd.real(0.85, 1.2) });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = sky.track(new THREE.LineBasicMaterial({ color: o.color ?? 0xb8c8e8, transparent: true, opacity: o.opacity ?? 0.42, depthWrite: false, fog: true }));
  const lines = new THREE.LineSegments(sky.track(g), mat);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  sky.group.add(lines);
  return { lines, seeds, box: [bw, bh, bd], fall: o.fall ?? 16, slant: o.slant ?? [1.6, 0.6], len, ahead: o.ahead ?? 12, t: 0, center: new THREE.Vector3() };
}

const _d = new THREE.Vector3();
export function animateRain(f, dt, camera) {
  if (!f) return;
  f.t += Math.min(0.1, dt);
  camera.getWorldDirection(_d);
  f.center.copy(camera.position).addScaledVector(_d, f.ahead);
  const [bw, bh, bd] = f.box;
  const x0 = f.center.x - bw / 2, y0 = f.center.y - bh / 2, z0 = f.center.z - bd / 2;
  const arr = f.lines.geometry.attributes.position.array;
  const [sx, sz] = f.slant, k = f.len / f.fall;
  for (let i = 0; i < f.seeds.length; i++) {
    const s = f.seeds[i], dist = f.t * f.fall * s.v;
    const x = x0 + ((((s.x + dist * sx / f.fall) - x0) % bw) + bw) % bw;
    const y = y0 + ((((s.y - dist) - y0) % bh) + bh) % bh;
    const z = z0 + ((((s.z + dist * sz / f.fall) - z0) % bd) + bd) % bd;
    const j = i * 6;
    arr[j] = x; arr[j + 1] = y; arr[j + 2] = z;
    arr[j + 3] = x - sx * k * f.fall * 0.06; arr[j + 4] = y + f.len; arr[j + 5] = z - sz * k * f.fall * 0.06;
  }
  f.lines.geometry.attributes.position.needsUpdate = true;
}

/** Sanftes Wetterleuchten: ein weicher, warmweißer Schein hinter den Wolken, langsam an und aus (keine Blitze). */
export function softStorm(sky, rnd, o = {}) {
  const tex = canvasTex(sky, 128, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(235,230,255,0.85)'); g.addColorStop(1, 'rgba(180,170,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const flash = new THREE.Sprite(sky.track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  flash.scale.set(150, 90, 1);
  flash.renderOrder = -7;
  sky.domeGroup.add(flash);
  return { flash, t: 0, next: o.first ?? 3 + rnd.real(0, 3), k: 0, rnd, every: o.every ?? [7, 12], strength: o.strength ?? 0.45 };
}

export function animateSoftStorm(s, dt) {
  if (!s) return;
  const d = Math.min(0.1, dt);
  s.t += d; s.next -= d;
  if (s.next <= 0) { s.k = 1; s.next = s.rnd.real(s.every[0], s.every[1]); const a = s.rnd.real(-1.1, 1.1); s.flash.position.set(Math.sin(a) * 260, 70 + s.rnd.real(0, 50), -Math.cos(a) * 260); }
  s.k = Math.max(0, s.k - d / 1.6);
  const u = 1 - s.k;
  s.flash.material.opacity = s.k > 0 ? s.strength * Math.sin(Math.min(1, u * 3) * Math.PI * 0.5) * s.k : 0;
}

// ------------------------------------------------------------------ Bausteine: Burgturm, Mauer (Silhouetten)

function tower(parts, x, y, z, h, r, wall, wallHi, roof, glowList, light, rnd) {
  const t = new THREE.CylinderGeometry(r, r * 1.08, h, 12, 3);
  t.translate(x, y + h / 2, z);
  parts.push(shade(t, wall, wallHi));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    parts.push(shade(new THREE.BoxGeometry(r * 0.38, r * 0.4, r * 0.38).translate(x + Math.cos(a) * r, y + h + r * 0.2, z + Math.sin(a) * r), wall, wallHi));
  }
  if (roof) parts.push(shade(new THREE.ConeGeometry(r * 1.15, r * 2.4, 12).translate(x, y + h + r * 1.4, z), roof[0], roof[1]));
  if (glowList && light) for (let k = 0; k < 3; k++) if (rnd.frac() < 0.75) glowList.push({ x: x + rnd.real(-r * 0.6, r * 0.6), y: y + h * rnd.real(0.35, 0.9), z: z + r * 0.95, c: light });
}

function wallRun(parts, x0, x1, y, z, h, wall, wallHi) {
  const L = x1 - x0;
  parts.push(shade(new THREE.BoxGeometry(L, h, 2.4).translate((x0 + x1) / 2, y + h / 2, z), wall, wallHi));
  for (let x = x0 + 1; x < x1; x += 2.4) parts.push(shade(new THREE.BoxGeometry(1.2, 1.2, 2.4).translate(x, y + h + 0.6, z), wall, wallHi));
}

// ------------------------------------------------------------------ Regenfestung

export function rainFort(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -14) + yBase;
  const parts = [], glowList = [];
  const wall = 0x3a4252, wallHi = 0x7a8498, roof = [0x2a2a4a, 0x5a4a8a];
  // Burggraben tief unten: dunkles, nasses Wasser (glänzend)
  const moat = new THREE.PlaneGeometry((x1 - x0) + 600, (z1 - z0) + 600, 1, 1);
  moat.rotateX(-Math.PI / 2); moat.translate((x0 + x1) / 2, gy, (z0 + z1) / 2);
  addMesh(sky, colorize(moat, (p, n, out) => { const c = C(0x1a2436); out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }), sky.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.4 })), sky.group, -1);
  // Türme und Mauern ringsum
  for (const s of ring(bounds, rnd, o.towers ?? 16, 24, 90)) {
    const h = rnd.real(18, 38), r = rnd.real(3, 5.5);
    tower(parts, s.x, gy, s.z, h, r, wall, wallHi, rnd.frac() < 0.6 ? roof : null, glowList, 0xffc870, rnd);
  }
  for (let i = 0; i < 5; i++) { const z = z0 - 30 - i * 26; wallRun(parts, x0 - 80 + rnd.real(-20, 20), x1 + 80 + rnd.real(-20, 20), gy, z, rnd.real(9, 16), wall, wallHi); }
  addMesh(sky, merge(parts), world(sky, { roughness: 0.35, metalness: 0.15 }));
  const lights = glowDots(sky, glowList, { size: 3, opacity: 0.9 });
  // Spiegelungen der Fensterlichter im Graben: senkrechte, schimmernde Streifen
  const refl = [];
  for (const g of glowList) {
    const p = new THREE.PlaneGeometry(1.2, 7);
    p.rotateX(-Math.PI / 2);
    p.translate(g.x, gy + 0.05, g.z + 5);
    refl.push(fill(p, 0x8a6a3a));
  }
  const reflMat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  const reflMesh = addMesh(sky, merge(refl), reflMat, sky.group, 1);
  // tiefe Wolkenbänke unter dem Level
  const clouds = [];
  for (let i = 0; i < 30; i++) {
    const g = new THREE.SphereGeometry(rnd.real(8, 16), 9, 6);
    g.scale(1, 0.4, 1); g.translate(rnd.real(x0 - 90, x1 + 90), bounds.min.y - rnd.real(6, 12), rnd.real(z0 - 120, z1 + 40));
    clouds.push(shade(g, 0x4a5268, 0x9aa4bc));
  }
  addMesh(sky, merge(clouds), basic(sky));
  return { kind: 'rainfort', lights, reflMat, t: 0 };
}

// ------------------------------------------------------------------ Dünen

export function duneSea(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -6) + yBase;
  const parts = [];
  const sandLo = C(0xc87a3a), sandHi = C(0xffd08a), shadowC = C(0x8a4a3a);
  const dune = (x, z, rx, ry, rz) => {
    const g = new THREE.SphereGeometry(1, 18, 9, 0, TAU, 0, Math.PI / 2);
    g.scale(rx, ry, rz);
    g.translate(x, gy, z);
    parts.push(colorize(ni(g), (p, n, out) => { mixc(shadowC, sandLo, smooth(-0.6, 0.3, n.x * -0.7 + n.y * 0.4), out); mixc(out, sandHi, smooth(0.55, 1, n.y) * 0.6, out); }));
  };
  // weiter Dünenboden
  const floor = new THREE.PlaneGeometry((x1 - x0) + 700, (z1 - z0) + 700, 1, 1);
  floor.rotateX(-Math.PI / 2); floor.translate((x0 + x1) / 2, gy - 0.5, (z0 + z1) / 2);
  parts.push(fill(floor, 0xd0884a));
  for (const s of ring(bounds, rnd, o.n ?? 30, 12, 140)) dune(s.x, s.z, rnd.real(14, 34), rnd.real(5, 14), rnd.real(10, 22));
  for (let x = x0 - 200; x < x1 + 200; x += rnd.real(30, 50)) dune(x, z0 - rnd.real(160, 220), rnd.real(30, 50), rnd.real(14, 26), rnd.real(20, 30));
  // Baron-Sandstatuen am Horizont: Bärenkopf mit Zylinder und Monokel auf einem Sockel
  const stat = [];
  const stone = C(0xd8a060), stoneD = C(0x8a5a30);
  for (let i = 0; i < (o.statues ?? 5); i++) {
    const x = x0 - 60 + (i / Math.max(1, (o.statues ?? 5) - 1)) * ((x1 - x0) + 120) + rnd.real(-10, 10), z = z0 - rnd.real(110, 150), s = rnd.real(9, 14);
    const add = (g) => stat.push(colorize(ni(g.translate(x, gy, z)), (p, n, out) => mixc(stoneD, stone, smooth(-0.5, 0.8, n.y * 0.4 + n.z * 0.5 - n.x * 0.3), out)));
    add(new THREE.BoxGeometry(s * 1.6, s * 0.8, s * 1.4).translate(0, s * 0.4, 0));
    add(new THREE.SphereGeometry(s * 0.7, 14, 10).scale(1, 0.92, 0.9).translate(0, s * 1.5, 0));
    for (const e of [-1, 1]) add(new THREE.SphereGeometry(s * 0.24, 8, 6).translate(e * s * 0.55, s * 2.05, 0));
    add(new THREE.SphereGeometry(s * 0.3, 10, 8).scale(1, 0.75, 0.8).translate(0, s * 1.35, s * 0.55));
    add(new THREE.CylinderGeometry(s * 0.42, s * 0.42, s * 0.75, 12).translate(0, s * 2.45, -s * 0.05));
    add(new THREE.CylinderGeometry(s * 0.65, s * 0.65, s * 0.08, 14).translate(0, s * 2.1, -s * 0.05));
    add(new THREE.TorusGeometry(s * 0.12, s * 0.025, 5, 12).translate(s * 0.25, s * 1.62, s * 0.62));
  }
  addMesh(sky, merge(parts), world(sky, { roughness: 1 }));
  addMesh(sky, merge(stat), world(sky, { roughness: 0.95 }));
  const dust = embers(sky, rnd, { n: 90, flow: [1.6, 0.15, 0.4], sway: 1.2, size: 0.12, colors: [0xffe0a0, 0xffc880], opacity: 0.55, additive: false });
  return { kind: 'dunes', dust };
}

// ------------------------------------------------------------------ Keksfabrik

function gearGeoW8(R, teeth = 12, depth = 0.8) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU, r = i % 2 ? R * 0.84 : R;
    if (i === 0) s.moveTo(Math.cos(a0) * r, Math.sin(a0) * r); else s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    s.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, R * 0.22, 0, TAU, true); s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
}

export function cookieFactory(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -12) + yBase;
  const parts = [], glowList = [];
  const W = (x1 - x0) + 120, cx = (x0 + x1) / 2;
  // Hallenwände (Zuckerguss-Streifen) links, rechts, hinten; Fußboden mit Fliesen
  const wallCol = [C(0xf6d0e0), C(0xffe8c8), C(0xd8f0e0)];
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? x0 - 40 : x1 + 40;
    const g = new THREE.BoxGeometry(4, 70, (z1 - z0) + 200, 1, 14, 1); g.translate(x, gy + 35, (z0 + z1) / 2 - 40);
    parts.push(colorize(ni(g), (p, n, out) => { const k = Math.floor((p.y - gy) / 5) % 3; const c = wallCol[(k + 3) % 3]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }));
  }
  const back = new THREE.BoxGeometry(W + 80, 70, 4, 1, 14, 1); back.translate(cx, gy + 35, z0 - 120);
  parts.push(colorize(ni(back), (p, n, out) => { const k = Math.floor((p.y - gy) / 5) % 3; const c = wallCol[(k + 3) % 3]; out[0] = c[0] * 0.92; out[1] = c[1] * 0.92; out[2] = c[2] * 0.92; }));
  const floor = new THREE.PlaneGeometry(W + 80, (z1 - z0) + 240, 1, 1); floor.rotateX(-Math.PI / 2); floor.translate(cx, gy, (z0 + z1) / 2 - 40);
  parts.push(fill(floor, 0xb88a5a));
  // Schornsteine mit Zuckerdampf (Glühpunkte weiß-rosa) und Förderbänder in der Ferne
  for (let i = 0; i < 6; i++) {
    const x = cx + rnd.real(-W / 2, W / 2), z = z0 - rnd.real(70, 110), h = rnd.real(30, 55);
    parts.push(shade(new THREE.CylinderGeometry(2, 2.6, h, 10).translate(x, gy + h / 2, z), 0xa85a3a, 0xe88a6a));
    for (let k = 0; k < 4; k++) glowList.push({ x: x + rnd.real(-2, 2), y: gy + h + 3 + k * 3, z, c: k % 2 ? 0xffe0f0 : 0xfff6ff });
  }
  for (let i = 0; i < 4; i++) {
    const z = z0 - 40 - i * 18, y = gy + 10 + i * 6;
    parts.push(shade(new THREE.BoxGeometry(W * 0.8, 1.2, 4).translate(cx, y, z), 0x4a4a5a, 0x9a9aaa));
    for (let x = cx - W * 0.38; x < cx + W * 0.38; x += rnd.real(5, 9)) {
      const c = new THREE.CylinderGeometry(1.6, 1.6, 0.6, 14); c.translate(x, y + 0.9, z);
      parts.push(shade(c, 0xb87a3a, 0xf0c27a));
    }
  }
  addMesh(sky, merge(parts), world(sky, { roughness: 0.9 }));
  // große Keks-Zahnräder an den Wänden (drehen sich, abwechselnd)
  const gears = [];
  const gmat = world(sky, { roughness: 0.8 });
  for (let i = 0; i < (o.gears ?? 8); i++) {
    const sx = i % 2 ? 1 : -1, R = rnd.real(5, 10);
    const g = gearGeoW8(R, Math.round(R * 2), 1.2);
    const gc = colorize(ni(g), (p, n, out) => { const d = Math.hypot(p.x, p.y) / R; mixc(C(0x9a5a2a), C(0xf0c27a), smooth(0.2, 0.9, d) * 0.6 + (n.z > 0.5 ? 0.3 : 0), out); if (d > 0.45 && d < 0.55) mixc(out, C(0xff9ac8), 0.85, out); });
    const m = new THREE.Mesh(sky.track(gc), gmat);
    const x = sx < 0 ? x0 - 37.5 : x1 + 37.5, z = rnd.real(z0 - 40, z1), y = gy + rnd.real(14, 40);
    m.position.set(x, y, z);
    m.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    sky.group.add(m);
    gears.push({ m, v: (i % 2 ? 1 : -1) * rnd.real(0.08, 0.2) });
  }
  const steam = glowDots(sky, glowList, { size: 6, opacity: 0.5 });
  const sugar = embers(sky, rnd, { n: 70, flow: [0.2, -0.5, 0.1], sway: 0.6, size: 0.1, colors: [0xffffff, 0xffe0f0], opacity: 0.6, additive: false });
  return { kind: 'cookie', gears, steam, sugar };
}

// ------------------------------------------------------------------ Nacht-Festung

export function nightFort(sky, bounds, rnd, yBase, o = {}) {
  const gy = (o.y ?? -16) + yBase;
  const parts = [], glowList = [];
  const wall = 0x0c0e18, wallHi = 0x1e2234;
  for (const s of ring(bounds, rnd, o.towers ?? 14, 30, 100)) tower(parts, s.x, gy, s.z, rnd.real(20, 42), rnd.real(3, 6), wall, wallHi, [0x0a0a14, 0x1a1a30], glowList, rnd.frac() < 0.5 ? 0xffd890 : 0x9ad8ff, rnd);
  addMesh(sky, merge(parts), basic(sky));
  // nur jedes dritte Fenster leuchtet (sehr sparsam)
  const few = glowList.filter((_, i) => i % 3 === 0);
  const lights = glowDots(sky, few, { size: 2.2, opacity: 0.7, blink: 1 });
  starField(sky, rnd, o.stars ?? 260, { size: 1.6, tints: [0x8a9ac8, 0xc8d0f0, 0x6a7aa8] });
  return { kind: 'nightfort', lights };
}

// ------------------------------------------------------------------ Unterwasser-Festung

export function dungeonDeep(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -10) + yBase;
  const parts = [], glowList = [], shafts = [];
  const stone = 0x2a4a5a, stoneHi = 0x6a9aa8;
  // Bogenmauern links und rechts, Rückwand
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? x0 - 26 : x1 + 26;
    for (let z = z1 + 20; z > z0 - 120; z -= 14) {
      parts.push(shade(new THREE.BoxGeometry(4, 40, 3).translate(x, gy + 20, z), stone, stoneHi));
      const arch = new THREE.TorusGeometry(5.5, 1.2, 6, 14, Math.PI); arch.rotateY(Math.PI / 2); arch.translate(x, gy + 22, z - 7);
      parts.push(shade(arch, stone, stoneHi));
      if (rnd.frac() < 0.6) glowList.push({ x: x - sx * 1.5, y: gy + rnd.real(8, 16), z: z - 7, c: 0x6ae8ff });
    }
    // Seetang an der Mauer
    for (let k = 0; k < 10; k++) {
      const z = rnd.real(z0 - 100, z1 + 10), h = rnd.real(4, 10);
      for (let j = 0; j < 4; j++) parts.push(fill(new THREE.CylinderGeometry(0.18, 0.3, h / 4, 5).translate(x - sx * 3 + Math.sin(j) * 0.4, gy + j * h / 4 + h / 8, z), 0x2a8a5a));
    }
  }
  const back = new THREE.BoxGeometry((x1 - x0) + 120, 50, 4); back.translate((x0 + x1) / 2, gy + 25, z0 - 130);
  parts.push(shade(back, stone, stoneHi));
  const floor = new THREE.PlaneGeometry((x1 - x0) + 300, (z1 - z0) + 300, 1, 1); floor.rotateX(-Math.PI / 2); floor.translate((x0 + x1) / 2, gy, (z0 + z1) / 2);
  parts.push(fill(floor, 0x1a3a44));
  // Ketten von oben
  for (let i = 0; i < 8; i++) {
    const x = rnd.real(x0 - 20, x1 + 20), z = rnd.real(z0 - 60, z0 - 10);
    for (let k = 0; k < 12; k++) parts.push(fill(new THREE.TorusGeometry(0.35, 0.09, 4, 8).rotateY(k % 2 ? Math.PI / 2 : 0).translate(x, gy + 44 - k * 0.6, z), 0x4a5a64));
  }
  addMesh(sky, merge(parts), world(sky, { roughness: 0.9 }));
  const windows = glowDots(sky, glowList, { size: 4, opacity: 0.7 });
  // Lichtschächte von oben (additiv, schräg)
  for (let i = 0; i < 6; i++) {
    const g = new THREE.CylinderGeometry(1.2, 3.5, 40, 8, 1, true);
    g.rotateZ(0.25); g.translate(rnd.real(x0 - 10, x1 + 10), gy + 22, rnd.real(z0 - 40, z1));
    shafts.push(fill(g, 0x5ab8c8));
  }
  const shaftMat = sky.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  addMesh(sky, merge(shafts), shaftMat, sky.group, 2);
  const bubbles = embers(sky, rnd, { n: 80, flow: [0, 1.1, 0], sway: 0.4, size: 0.18, colors: [0xc8f8ff, 0x9ae8ff], opacity: 0.6 });
  return { kind: 'dungeon', windows, bubbles, shaftMat, t: 0 };
}

// ------------------------------------------------------------------ Stockdunkles Spukhaus

export function ghostDark(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -6) + yBase;
  const parts = [];
  // schemenhafte Wände mit Vorhang-Falten (kaum sichtbar)
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? x0 - 18 : x1 + 18;
    const g = new THREE.BoxGeometry(2, 40, (z1 - z0) + 120, 1, 1, 40); g.translate(x, gy + 20, (z0 + z1) / 2 - 20);
    parts.push(colorize(ni(g), (p, n, out) => { const k = 0.6 + 0.4 * Math.abs(Math.sin(p.z * 0.9)); const c = C(0x1a1226); out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; }));
  }
  addMesh(sky, merge(parts), basic(sky));
  // freundliche Geisteraugen im Dunkeln (Paare, blinzeln)
  const eyes = [];
  for (const s of ring(bounds, rnd, o.eyes ?? 14, 10, 40)) {
    const y = gy + rnd.real(4, 16), c = rnd.frac() < 0.5 ? 0xc8a0ff : 0x9af0ff;
    eyes.push({ x: s.x - 0.35, y, z: s.z, c }, { x: s.x + 0.35, y, z: s.z, c });
  }
  const glow = glowDots(sky, eyes, { size: 1.1, opacity: 0.9, blink: 2 });
  const dust = embers(sky, rnd, { n: 40, flow: [0.05, 0.08, 0], sway: 0.6, size: 0.08, colors: [0xb8a8e8], opacity: 0.35 });
  return { kind: 'darkghost', glow, dust, rnd, t: 0 };
}

// ------------------------------------------------------------------ Lava-Inferno

export function crystalInferno(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const lava = flowLava(sky, bounds, (o.lavaY ?? -9) + yBase, { flow: [0.1, 0.6], E: 380 });
  const gy = (o.y ?? -10) + yBase;
  const parts = [], crys = [];
  const rock = 0x2a1a22, rockHi = 0x5a3a44;
  for (const s of ring(bounds, rnd, o.n ?? 26, 16, 110)) {
    const h = rnd.real(6, 22), r = rnd.real(4, 10);
    const g = new THREE.ConeGeometry(r, h, 7, 2); g.translate(s.x, gy + h / 2, s.z);
    parts.push(shade(g, rock, rockHi));
    // Kristallgruppe auf dem Felsen
    const n = 2 + Math.floor(rnd.frac() * 4);
    for (let k = 0; k < n; k++) {
      const ch = rnd.real(2, 6), cr = rnd.real(0.5, 1.2);
      const c = new THREE.ConeGeometry(cr, ch, 5); c.translate(0, ch / 2, 0); c.rotateZ(rnd.real(-0.5, 0.5)); c.rotateX(rnd.real(-0.4, 0.4));
      c.translate(s.x + rnd.real(-r * 0.4, r * 0.4), gy + h * rnd.real(0.4, 0.8), s.z + rnd.real(-r * 0.4, r * 0.4));
      const col = rnd.frac() < 0.5 ? [0xb85aff, 0xf0c8ff] : [0x5ad8ff, 0xd8f8ff];
      crys.push(colorize(ni(c), (p, nn, out) => mixc(C(col[0]), C(col[1]), smooth(-0.3, 0.9, nn.y * 0.5 + nn.z * 0.4), out)));
    }
  }
  // Vulkane am Horizont mit glühendem Gipfel
  for (let i = 0; i < 4; i++) {
    const x = x0 - 80 + i * ((x1 - x0) + 160) / 3, z = z0 - rnd.real(150, 200), h = rnd.real(50, 80);
    parts.push(shade(new THREE.ConeGeometry(h * 0.9, h, 10, 1, true).translate(x, gy + h / 2, z), rock, rockHi));
    crys.push(fill(new THREE.CylinderGeometry(h * 0.12, h * 0.16, 2, 10).translate(x, gy + h - 1, z), 0xff8a2a));
  }
  addMesh(sky, merge(parts), world(sky, { roughness: 0.9 }));
  addMesh(sky, merge(crys), basic(sky));
  const sparks = embers(sky, rnd, { n: 110, flow: [0.1, 1.4, 0], sway: 0.6, size: 0.16, colors: [0xffa030, 0xff6010, 0xd08aff], opacity: 0.85 });
  return { kind: 'inferno', lava, sparks };
}

// ------------------------------------------------------------------ Baron-Rummelplatz

export function baronPark(sky, bounds, rnd, yBase, o = {}) {
  const { x0, x1, z0, z1 } = sides(bounds);
  const gy = (o.y ?? -14) + yBase;
  const cx = (x0 + x1) / 2;
  const parts = [], glowList = [];
  // Boden (Kopfsteinpflaster-Ebene) tief unten
  const floor = new THREE.PlaneGeometry((x1 - x0) + 600, (z1 - z0) + 600, 1, 1); floor.rotateX(-Math.PI / 2); floor.translate(cx, gy, (z0 + z1) / 2);
  parts.push(fill(floor, 0x3a3048));
  // der große Turm des Barons hinten in der Mitte
  const tz = z0 - (o.towerDist ?? 90), th = o.towerH ?? 120;
  parts.push(shade(new THREE.CylinderGeometry(12, 16, th, 16, 6).translate(cx, gy + th / 2, tz), 0x4a1a3a, 0x9a3a6a));
  for (let k = 1; k <= 4; k++) parts.push(shade(new THREE.CylinderGeometry(13.5, 13.5, 2, 16).translate(cx, gy + (th * k) / 5, tz), 0x2a1020, 0xc85a8a));
  parts.push(shade(new THREE.ConeGeometry(16, 34, 16).translate(cx, gy + th + 17, tz), 0x2a1830, 0x8a3a8a));
  for (let k = 0; k < 18; k++) glowList.push({ x: cx + rnd.real(-9, 9), y: gy + rnd.real(10, th - 8), z: tz + 13, c: 0xffd060 });
  glowList.push({ x: cx, y: gy + th + 36, z: tz, c: 0xff6a8a });
  // Zelte, Achterbahn-Bögen, Lichtermasten ringsum
  for (const s of ring(bounds, rnd, o.tents ?? 14, 20, 90)) {
    const r = rnd.real(4, 8), h = rnd.real(5, 9);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const g = new THREE.ConeGeometry(r, h, n, 1, true, (i / n) * TAU, TAU / n); g.translate(s.x, gy + h * 0.5 + 4, s.z);
      parts.push(fill(g, i % 2 ? 0xfff0f6 : [0xe8423a, 0x3a7ae8, 0x9a5ae8, 0xffc83a][Math.floor(rnd.frac() * 4)]));
    }
    parts.push(fill(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 4, 12, 1, true).translate(s.x, gy + 2, s.z), 0xd8c0e0));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; glowList.push({ x: s.x + Math.cos(a) * r, y: gy + 4.2, z: s.z + Math.sin(a) * r, c: i % 2 ? 0xfff0a0 : 0xff8ac8 }); }
  }
  for (let k = 0; k < 2; k++) {
    const side = k ? 1 : -1, ax = side < 0 ? x0 - 50 : x1 + 50, n = 28;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const u = i / n, z = z1 + 20 - u * ((z1 - z0) + 120), y = gy + 14 + Math.sin(u * TAU * 2) * 8 + Math.sin(u * TAU * 5) * 2;
      const p = new THREE.Vector3(ax + Math.sin(u * 9) * 6, y, z);
      if (prev) {
        const d = p.clone().sub(prev); const L = d.length();
        const g = new THREE.CylinderGeometry(0.35, 0.35, L, 5); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate((p.x + prev.x) / 2, (p.y + prev.y) / 2, (p.z + prev.z) / 2);
        parts.push(fill(g, 0xe8423a));
        if (i % 2 === 0) parts.push(fill(new THREE.CylinderGeometry(0.3, 0.4, p.y - gy, 5).translate(p.x, (p.y + gy) / 2, p.z), 0xf0e8f8));
      }
      prev = p;
    }
  }
  addMesh(sky, merge(parts), world(sky, { roughness: 0.75 }));
  const lights = glowDots(sky, glowList, { size: 2.6, opacity: 0.95, blink: 0.5 });
  // Riesenrad (dreht sich) links hinten
  const wheel = new THREE.Group();
  const R = o.wheelR ?? 26;
  const wp = [], wg = [];
  wp.push(fill(new THREE.TorusGeometry(R, 0.6, 6, 48), 0xc83a6a));
  wp.push(fill(new THREE.TorusGeometry(R * 0.5, 0.35, 5, 32), 0x3a4ab8));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const g = new THREE.CylinderGeometry(0.2, 0.2, R, 4); g.translate(0, R / 2, 0); g.rotateZ(a);
    wp.push(fill(g, 0xf0e8f8));
    const gd = new THREE.BoxGeometry(2.2, 1.6, 1.6); gd.translate(Math.cos(a) * R, Math.sin(a) * R - 1.2, 0);
    wp.push(fill(gd, [0xff5a6a, 0xffc23a, 0x5ad0ff, 0x8ae05a][i % 4]));
  }
  for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; wg.push(fill(new THREE.SphereGeometry(0.45, 5, 4).translate(Math.cos(a) * (R + 0.8), Math.sin(a) * (R + 0.8), 0.5), i % 2 ? 0xfff0a0 : 0xff8ac8)); }
  const spin = new THREE.Group();
  spin.add(new THREE.Mesh(sky.track(merge(wp)), world(sky, { roughness: 0.6 })));
  spin.add(new THREE.Mesh(sky.track(merge(wg)), basic(sky)));
  wheel.add(spin);
  const stand = [];
  for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.8, 1.1, R * 1.25, 6); g.translate(0, -R * 0.6, 0); g.rotateZ(sx * 0.35); stand.push(fill(g, 0x5a3a7a)); }
  wheel.add(new THREE.Mesh(sky.track(merge(stand)), world(sky)));
  wheel.position.set(x0 - 40, gy + R * 1.2, z0 - 50);
  sky.group.add(wheel);
  starField(sky, rnd, o.stars ?? 160, { size: 1.6 });
  return { kind: 'baronpark', lights, spin, t: 0 };
}

// ------------------------------------------------------------------ Animation

export function animateW8(f, dt, camera) {
  if (!f) return;
  const d = Math.min(0.1, dt);
  f.t = (f.t ?? 0) + d;
  const blinkDots = (L) => {
    if (!L) return;
    L.t += d;
    L.pts.material.opacity = L.base * (L.blink ? 0.75 + 0.25 * Math.sin(L.t * (2 + L.blink * 1.7)) : 1);
  };
  switch (f.kind) {
    case 'rainfort':
      blinkDots(f.lights);
      if (f.reflMat) f.reflMat.opacity = 0.35 + 0.12 * Math.sin(f.t * 3.1) + 0.06 * Math.sin(f.t * 7.3);
      break;
    case 'dunes': animateEmbers(f.dust, dt, camera); break;
    case 'cookie':
      for (const g of f.gears) g.m.rotation.z += g.v * d;
      animateEmbers(f.sugar, dt, camera);
      break;
    case 'nightfort': blinkDots(f.lights); break;
    case 'dungeon':
      blinkDots(f.windows); animateEmbers(f.bubbles, dt, camera);
      if (f.shaftMat) f.shaftMat.opacity = 0.11 + 0.04 * Math.sin(f.t * 0.8);
      break;
    case 'darkghost': {
      // Augen: meist offen, ab und zu blinzeln alle gleichzeitig kurz
      const L = f.glow;
      if (L) { L.t += d; const blink = (L.t % 4.3) < 0.18; L.pts.material.opacity = blink ? 0.05 : L.base * (0.8 + 0.2 * Math.sin(L.t * 1.3)); }
      animateEmbers(f.dust, dt, camera);
      break;
    }
    case 'inferno': animateLava(f.lava, dt); animateEmbers(f.sparks, dt, camera); break;
    case 'baronpark':
      blinkDots(f.lights);
      if (f.spin) f.spin.rotation.z += 0.05 * d;
      break;
    default: break;
  }
}
