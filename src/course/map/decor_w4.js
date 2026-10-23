// Kulissen der Welt-4-Eingänge (Kurs-Karte „Canyon-Inselkette“), aufgerufen aus EntranceView.decorate():
//   anthill       4-1    großer Ameisenhügel mit Tunnellöchern; Ameisensoldaten marschieren im Gänsemarsch spiralig
//                        hinauf und hinab (eine Instanz-Fläche)
//   poisonwood    4-2    Giftwald im Sumpf: violetter Giftwasserfall (def.waterfall) vom Tafelberg, dahinter lugt eine
//                        Röhre hervor (der Welt-Warp im Level), ein riesiger Rankenschnapper wiegt sich über dem Sumpf,
//                        Giftblasen steigen auf
//   lavaisle      4-A    Lava-Felsinsel: Basaltspitzen (def.spikes), Feuerschalen (def.braziers), Glutfunken aus dem
//                        Lavasee; die Lavabrocken-Gruppe läuft als Gegnergruppe (Weltdaten roamers)
//   beeptower     4-3    Lautsprecherturm: Gittermast mit großer Lautsprecherbox, Antenne mit Blinklicht, Schallringe;
//                        zwei Sätze Piep-Blöcke (rosa/blau) schweben um den Turm und wechseln im Takt der Kartenmusik
//                        (music.beat(): alle 4 Zählzeiten, die letzte Zählzeit davor blinken die festen Blöcke) –
//                        ev.beep.info() für Tests
//   mysteryclock  4-Haus geheimnisvolles Haus mit großer Stoppuhr (10 Räume à 10 s), Fragezeichen auf dem Dach
//   bouncemeadow  4-4    Riesentrampolin (orange) auf der Bergwiese, darüber ein Rad aus Flatterkäfern; kleine
//                        Pilztrampoline (def.trampolines) federn die Heldin hoch (Kollision bounce wie im Level)
//   ruincity      4-5    Tempelruine: Stufen, Säulen (zwei zerbrochen), Giebelrest, Stachelwalze aus Stein
//   bluefortress  4-B    blau vergitterte Werfer-Festung: Mauer mit Türmen und Fackeln, blaue Gitter (def.cage)
//   lavacastle    4-Burg Lava-Burg: Basalt-Bergfried mit Türmen, glühenden Fenstern, Lavafällen in den Graben,
//                        Baron-Brummbär-Banner (weht) und Wandbehänge
// Außerdem: buildCableway (Seilbahn als Kulisse, map.cableways) und STAND_INS (Stellvertreter-Modelle für
// Gegnergruppen, solange die Welt-4-Modelle fehlen).
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie, bewegte sind eigene Objekte (ev.updaters).

import * as THREE from 'three';
import { mix, TAU, cached, vcol, basic, starShape, glowTexture } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { music } from '../../audio/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { bakeModel } from './bake.js';
import { baronFlagTexture, cageGeo } from './props.js';
import { LowBuild as Build, place, columnGeo } from './desert.js';
import { flame, wavingFlag } from './decor_w2.js';
import { needleGeo } from './canyon.js';
import { instanceRoamers } from './entities.js';
import { createInstanced } from '../models/lib/instanced.js';

/** Kulisse für eine Welt-4-Art bauen; false = unbekannte Art. */
export function decorateW4(ev, kind, x, y, z) {
  switch (kind) {
    case 'anthill': anthill(ev, x, y, z); return true;
    case 'poisonwood': poisonWood(ev, x, y, z); return true;
    case 'lavaisle': lavaIsle(ev, x, y, z); return true;
    case 'beeptower': beepTower(ev, x, y, z); return true;
    case 'mysteryclock': mysteryClock(ev, x, y, z); return true;
    case 'bouncemeadow': bounceMeadow(ev, x, y, z); return true;
    case 'ruincity': ruinCity(ev, x, y, z); return true;
    case 'bluefortress': blueFortress(ev, x, y, z); return true;
    case 'lavacastle': lavaCastle(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color) => { const m = new THREE.MeshBasicMaterial({ color, fog: true }); ev.own.push(m); return m; };
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// Welt-4-Modelle blicken nach +X, die Kulissen nach +Z (Kamera): yaw −π/2 dreht +X nach +Z
const FRONT = -Math.PI / 2;

/** Registry-Modell als statische Kulisse einbacken (false, solange es das Modell nicht gibt). */
function bakeW4(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true) {
  if (!hasModel(name)) return false;
  const add = cast ? (g, o) => ev.addStatic(g, o) : (g, o) => ev.addStatic(g, { ...o, castShadow: false });
  return !!bakeModel(add, name, opts, pos, yaw, scale, state);
}
/** Registry-Modell als bewegtes Objekt (eigene Zeichenaufrufe); state = Objekt/String oder Funktion (dt, t) → state. */
function liveW4(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true) {
  if (!hasModel(name)) return null;
  const m = getModel(name, opts ?? {});
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
  ev.view.add(m.root);
  ev.own.push(m);
  ev.updaters.push((dt, t) => m.update(dt, typeof state === 'function' ? state(dt, t) : state));
  return m;
}
/**
 * Höhenprofil eines rotationsähnlichen Modells (Hügel): höchster Punkt je Radius-Ring → { R, H, at(r), slope(r) }.
 */
function radialProfile(root, bins = 24) {
  root.updateMatrixWorld(true);
  const pts = [];
  let R = 0;
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const P = o.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const r = Math.hypot(v.x, v.z); pts.push([r, v.y]); R = Math.max(R, r); }
  });
  const top = new Array(bins + 1).fill(0);
  for (const [r, yy] of pts) { const k = Math.min(bins, Math.floor((r / R) * bins)); top[k] = Math.max(top[k], yy); }
  for (let k = bins - 1; k >= 0; k--) if (top[k] < top[k + 1]) top[k] = Math.max(top[k], top[k + 1] * 0.98);
  const at = (r) => { const f = Math.min(bins, Math.max(0, (r / R) * bins)); const k = Math.min(bins - 1, Math.floor(f)); return top[k] + (top[k + 1] - top[k]) * (f - k); };
  return { R, H: top[0], at, slope: (r) => (at(r + 0.1) - at(r - 0.1)) / 0.2 };
}
/**
 * Mehrere bewegte Modelle gleicher Art instanziert zeichnen (geteilte Teile als InstancedMesh, wie die Gegnergruppen):
 * items = [{ model, pos: THREE.Vector3 }] – Lage/Zustand setzt der Aufrufer je Bild.
 */
function cullByView(ev, obj, cx, cy, cz, r, far = 85) {
  const F = new THREE.Frustum(), M = new THREE.Matrix4(), S = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
  ev.updaters.push(() => {
    const cam = ev.view.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    obj.visible = cam.position.distanceTo(S.center) - r < far && F.intersectsSphere(S);
  });
}
/**
 * Instanz-Gruppen der Registry (createInstanced) zeichnen ohne Frustum-Culling – sie werden hier je Bild als Ganzes
 * ausgeblendet, wenn ihre Hüllkugel nicht im Bild bzw. weiter als far m entfernt ist.
 */
function instanceModelGroup(ev, items) {
  const ents = items.map((it) => ({ model: it.model, pos: it.pos, alive: true, removed: false }));
  const inst = instanceRoamers(ev.view, ents, { radius: 3 });
  if (inst) ev.own.push(inst);
  return inst;
}

/** Instanz-Fläche (eigenes Material nach Vertexfarben), ohne Frustum-Culling (die Instanzen wandern). */
function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.45, opts.extra ?? {}, opts.key ?? ''), n);
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = `w4:${opts.name ?? opts.key ?? 'instanzen'}`;
  ev.view.add(m);
  ev.own.push(m);
  return m;
}
function setInst(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}

/** Animierte Fallfläche (Wasserfall/Lavafall) mit eigener Textur; Gischt am Fuß. */
function fallPlane(ev, wf, key, draw, foamColor, opts = {}) {
  const w = wf.x1 - wf.x0, h = wf.top - (wf.bottom ?? 0);
  const tex = canvasTexture(key, 64, 256, draw, { repeat: true });
  const t2 = tex.clone();
  t2.needsUpdate = true;
  t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
  t2.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(1, h / 4));
  ev.own.push(t2);
  const mat = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: opts.opacity ?? 0.92, fog: true });
  ev.own.push(mat);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  ev.own.push(plane.geometry);
  plane.position.set((wf.x0 + wf.x1) / 2, (wf.bottom ?? 0) + h / 2, wf.z + 0.05);
  if (opts.yaw) plane.rotation.y = opts.yaw;
  plane.name = 'w4:fall';
  ev.view.add(plane);
  const foam = new THREE.Mesh(cached(`w4m:foam:${foamColor}`, () => {
    const b = new Build();
    for (let i = 0; i < 7; i++) b.sphere(0.5 + (i % 3) * 0.15, foamColor, { p: [(i - 3) * 0.7, 0.1, (i % 2) * 0.4], s: [1, 0.5, 1] }, 7, 4);
    return b.geometry();
  }), vcol(0.9, { transparent: true, opacity: 0.85 }, `w4foam:${foamColor}`));
  foam.position.set((wf.x0 + wf.x1) / 2, wf.bottom ?? 0, wf.z + 0.6);
  foam.scale.set(w / 5, 1, 1);
  foam.name = 'w4:gischt';
  ev.view.add(foam);
  ev.updaters.push((dt, t) => {
    t2.offset.y = (t * (opts.speed ?? 0.9)) % 1;
    foam.scale.y = 1 + Math.sin(t * 6) * 0.15;
  });
  return plane;
}

// ------------------------------------------------------------------ 4-1 Ameisenhügel

/** Ameisensoldat in Kartenqualität (Blick +X): drei Körperglieder, Helm, Beine, Fühler (≈ 220 Dreiecke). */
function antGeo() {
  return cached('w4m:ant', () => {
    const b = new Build();
    b.sphere(0.2, 0x7a2a1e, { p: [-0.26, 0.32, 0], s: [1.3, 1, 1] }, 7, 5);
    b.sphere(0.13, 0x9a3a26, { p: [0, 0.34, 0] }, 6, 4);
    b.sphere(0.17, 0xb84a2e, { p: [0.22, 0.42, 0] }, 7, 5);
    b.dome(0.17, 0x3a6ad8, { p: [0.22, 0.46, 0] }, Math.PI / 2, 8, 3);
    for (const s of [-1, 1]) {
      b.sphere(0.04, 0xffffff, { p: [0.36, 0.44, s * 0.07] }, 5, 3);
      b.cyl(0.012, 0.012, 0.28, 0x2a120c, { p: [0.3, 0.6, s * 0.06], r: [s * 0.4, 0, -0.5] }, 3);
      for (const lx of [-0.1, 0.02, 0.14]) b.cyl(0.018, 0.018, 0.34, 0x2a120c, { p: [lx, 0.17, s * 0.13], r: [s * 0.6, 0, 0] }, 3);
    }
    return b.geometry();
  });
}

function anthill(ev, x, y, z) {
  // Hügel: Registry-Modell 'ameisenhuegel' (Höhenprofil für die Ameisenwege), sonst eigene Geometrie
  const S = ev.def.size ?? 8.8;
  let prof = null;
  if (hasModel('ameisenhuegel')) {
    const md = getModel('ameisenhuegel', { size: S });
    prof = radialProfile(md.root);
    md.dispose?.();
    bakeW4(ev, 'ameisenhuegel', { size: S }, [x, y, z], 0.5);
  }
  if (!prof) {
    const R0 = 4.4, H0 = 6.2;
    prof = { R: R0, H: H0, at: (r) => H0 * Math.max(0, 1 - r / R0), slope: () => -H0 / R0 };
    ev.addStatic(place(cached('w4m:anthill', () => {
      const b = new Build();
      const R = R0, H = H0;
      // Hügel: geschichtete Erde, oben eine Kuppe, Krümel und Tunnellöcher mit Rahmen
      b.lathe([[0, H], [0.9, H - 0.2], [1.4, H - 0.9], [2.3, H * 0.62], [3.3, H * 0.33], [4.0, H * 0.12], [R, 0]], { v: (px, py) => mix(0x8a4a2a, 0xd08a52, py / H * 0.7 + (Math.floor(py / 0.9) % 2) * 0.12) }, null, 18, 0);
      for (const [a, hh, sz] of [[0.2, 1.1, 1.0], [1.3, 2.6, 0.8], [-0.8, 3.6, 0.7], [0.6, 4.6, 0.6], [2.3, 1.6, 0.8]]) {
        const rr = R * (1 - hh / H) * 0.98 + 0.12;
        const px = Math.sin(a) * rr, pz = Math.cos(a) * rr;
        b.sphere(0.48 * sz, 0x2a160e, { p: [px, hh, pz], s: [1, 0.85, 0.35], r: [0, a, 0] }, 9, 6);
        b.torus(0.5 * sz, 0.1 * sz, 0xc07a48, { p: [px, hh, pz], r: [0, a, 0] }, 5, 12);
      }
      b.cyl(0.05, 0.06, 1.6, 0x6a4424, { p: [0, H + 0.6, 0] }, 5);
      const pen = new THREE.Shape(); pen.moveTo(0, 0); pen.lineTo(0.9, -0.22); pen.lineTo(0, -0.46); pen.lineTo(0, 0);
      b.extrude(pen, 0.03, 0x3a6ad8, { p: [0.04, H + 1.35, 0] }, 0, 1);
      return b.geometry();
    }).clone(), x, y, z), { castShadow: true });
  }
  const { R, H } = prof;
  solidCyl(ev, x, z, R * 0.82, y, y + H * 0.9, 'ameisenhuegel');
  // Ameisensoldaten marschieren im Gänsemarsch spiralig um den Hügel (hinauf und wieder hinab), an den Hang gelegt
  const N = 6, AS = 0.6;
  const useModel = hasModel('ameisensoldat');
  let ants = null, antsInst = null;
  if (useModel) {
    antsInst = createInstanced('ameisensoldat', N);
    for (const m of antsInst.meshes) m.castShadow = false;
    antsInst.root.name = 'w4:ameisen';
    ev.view.add(antsInst.root);
    ev.own.push(antsInst);
    cullByView(ev, antsInst.root, x, y + H / 2, z, R + 1);
  } else ants = instanced(ev, antGeo(), N, { key: 'w4ant' });
  // Weg 0..1: spiralig hinauf (0..0.5) und wieder hinab (0.5..1)
  const at = (u, out) => {
    const up = u < 0.5 ? u * 2 : 2 - u * 2;
    const rr = R * (0.97 - up * 0.72);
    const a = u * TAU * 2.2 + 0.4;
    out[0] = x + Math.sin(a) * rr; out[1] = y + prof.at(rr) + 0.02; out[2] = z + Math.cos(a) * rr; out[3] = rr; out[4] = a;
    return out;
  };
  const A = [0, 0, 0, 0, 0], B = [0, 0, 0, 0, 0];
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3();
  const place12 = (t, dt) => {
    for (let i = 0; i < N; i++) {
      const u = ((t * 0.03 + i / N) % 1 + 1) % 1;
      at(u, A); at((u + 0.004) % 1, B);
      if (antsInst) {
        // lokales +Y = Hangnormale, +X = Laufrichtung
        const sl = prof.slope(A[3]);
        Y.set(Math.sin(A[4]) * -sl, 1, Math.cos(A[4]) * -sl).normalize();
        X.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
        X.addScaledVector(Y, -X.dot(Y)).normalize();
        Z.crossVectors(X, Y);
        Q.setFromRotationMatrix(M.makeBasis(X, Y, Z));
        antsInst.setAt(i, P.set(A[0], A[1], A[2]), Q, AS, 'walk');
      } else {
        const yaw = Math.atan2(-(B[2] - A[2]), B[0] - A[0]);
        setInst(ants, i, A[0], A[1] + Math.abs(Math.sin(t * 9 + i)) * 0.03, A[2], yaw, 1, 0, u < 0.5 ? 0.35 : -0.35);
      }
    }
    if (antsInst) antsInst.update(dt); else ants.instanceMatrix.needsUpdate = true;
  };
  place12(0, 0);
  ev.updaters.push((dt, t) => place12(t, dt));
}

// ------------------------------------------------------------------ 4-2 Giftwald mit Sumpf

function poisonWood(ev, x, y, z) {
  const wf = ev.def.waterfall;
  if (wf) {
    // Röhre hinter dem Giftwasserfall (im Level der Welt-Warp) – lugt zwischen den Schlieren hervor
    ev.addStatic(place(cached('w4m:hiddenpipe', () => {
      const b = new Build();
      b.cyl(0.8, 0.8, 1.4, { v: (px, py, pz, nx) => mix(0x6a2a9a, 0xb46ae8, nx * 0.4 + 0.5) }, { p: [0, 0.7, 0] }, 12, true);
      b.torus(0.86, 0.16, 0xd08aff, { p: [0, 1.4, 0], r: [Math.PI / 2, 0, 0] }, 5, 14);
      b.cyl(0.72, 0.72, 0.04, 0x1a0a2a, { p: [0, 1.32, 0] }, 12);
      return b.geometry();
    }).clone(), wf.x0 + 0.9, wf.bottom - 0.2, wf.z + 0.45), { castShadow: false });
    // Giftwasserfall: Registry-Modell (fließender Vorhang mit Gischt), sonst eigene Fläche
    if (liveW4(ev, 'giftwasserfall', { width: wf.x1 - wf.x0, height: wf.top - wf.bottom }, [(wf.x0 + wf.x1) / 2, wf.bottom, wf.z + 0.5], FRONT, 1, 'idle', false)) { /* Modell */ }
    else fallPlane(ev, wf, 'map:poisonfall', (ctx, cw, ch) => {
      ctx.fillStyle = '#9a4ad0'; ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 26; i++) {
        const xx = (i * 37) % cw, yy = (i * 71) % ch, len = 30 + (i * 13) % 60;
        ctx.fillStyle = i % 3 ? 'rgba(220,170,255,0.75)' : 'rgba(150,255,120,0.7)';
        ctx.fillRect(xx, yy, 3 + (i % 3), len);
        ctx.fillRect(xx, yy - ch, 3 + (i % 3), len);
      }
    }, 0xd8a8ff, { opacity: 0.86 });
  }
  // Riesiger Rankenschnapper: dicke Ranke aus dem Sumpf, oben ein Schnappkopf (wiegt sich, schnappt)
  const stem = cached('w4m:creeperstem', () => {
    const b = new Build();
    const pts = [[0, -0.3, 0], [0.4, 1.6, 0.2], [-0.2, 3.2, -0.1], [0.6, 4.6, 0.3], [1.6, 5.4, 0.6]];
    b.tube(pts, 0.3, { v: (px, py) => mix(0x2a7a2a, 0x6ac83a, py / 5.4) }, null, 20, 7);
    for (const [px, py, pz, r] of [[0.5, 1.2, 0.3, 0.9], [-0.3, 2.6, -0.2, -0.6], [0.4, 3.9, 0.4, 0.8]]) {
      b.sphere(0.5, { v: (qx, qy, qz, nx, ny) => mix(0x3a9a32, 0x8ae05a, ny * 0.5 + 0.5) }, { p: [px + Math.sign(r) * 0.4, py, pz], s: [1.4, 0.25, 0.8], r: [0, r, 0.3] }, 8, 4);
    }
    return b.geometry();
  });
  ev.addStatic(place(stem.clone(), x, y, z, 0.3), { castShadow: true });
  const head = new THREE.Group();
  const top = new THREE.Mesh(cached('w4m:creeperhead', () => {
    const b = new Build();
    b.sphere(0.95, { v: (px, py, pz, nx, ny) => mix(0x6a2a9a, 0xb45ae0, ny * 0.5 + 0.5) }, { p: [0, 0.2, 0], s: [1.1, 0.7, 1] }, 12, 7);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; b.sphere(0.14, 0xffffff, { p: [Math.cos(a) * 0.62, 0.62, Math.sin(a) * 0.55] }, 6, 4); }
    for (let i = 0; i < 6; i++) b.cone(0.09, 0.28, 0xffffff, { p: [0.92, 0.02, -0.5 + i * 0.2], r: [0, 0, Math.PI] }, 4);
    return b.geometry();
  }), vcol(0.4, {}, 'w4creeper'));
  const jaw = new THREE.Mesh(cached('w4m:creeperjaw', () => {
    const b = new Build();
    b.sphere(0.9, { v: (px, py, pz, nx, ny) => (ny > 0.3 ? 0xe85a8a : mix(0x5a2088, 0x9a4ad0, ny * 0.5 + 0.5)) }, { p: [0, -0.1, 0], s: [1.05, 0.5, 0.95] }, 12, 6);
    for (let i = 0; i < 6; i++) b.cone(0.08, 0.24, 0xffffff, { p: [0.86, 0.14, -0.5 + i * 0.2] }, 4);
    return b.geometry();
  }), vcol(0.4, {}, 'w4creeper'));
  top.castShadow = jaw.castShadow = true;
  head.add(top, jaw);
  const hx = x + 1.6 * Math.cos(0.3) + 0.6 * Math.sin(0.3), hz = z - 1.6 * Math.sin(0.3) + 0.6 * Math.cos(0.3);
  head.position.set(hx, y + 5.6, hz);
  head.rotation.y = -0.6;
  head.name = 'w4:rankenkopf';
  ev.view.add(head);
  ev.updaters.push((dt, t) => {
    const snap = Math.max(0, Math.sin(t * 1.7)) ** 6;
    top.rotation.z = 0.35 * (1 - snap);
    jaw.rotation.z = -0.25 * (1 - snap);
    head.position.y = y + 5.6 + Math.sin(t * 1.1) * 0.25;
    head.rotation.y = -0.6 + Math.sin(t * 0.7) * 0.35;
  });
  // kleine Ranken mit Köpfen am Sumpfrand, Seerosen aus Gift, Steg-Pfähle
  ev.addStatic(place(cached('w4m:swampbits', () => {
    const b = new Build();
    for (const [px, pz, s] of [[-6, 3, 1.1], [5.4, -3.6, 0.9], [-9, -3.4, 0.8], [7.6, 4.6, 1.0]]) {
      b.cyl(0.6 * s, 0.7 * s, 0.08, 0x3a8a3a, { p: [px, 0.02, pz] }, 9);
      b.sphere(0.22 * s, 0xd85aff, { p: [px + 0.2, 0.14, pz], s: [1, 0.5, 1] }, 6, 3);
    }
    for (const [px, pz, h] of [[3.6, 5.2, 1.6], [4.6, 5.0, 1.3], [-4.2, 5.4, 1.5]]) b.cyl(0.12, 0.14, h, 0x4a3426, { p: [px, h / 2 - 0.3, pz] }, 5);
    return b.geometry();
  }).clone(), x, y, z), { castShadow: false });
  // Giftwald ringsum: Giftbäume, Giftpilze, Lianen am Tafelberg (Registry-Modelle, eingebacken)
  for (const [px, pz, h, yaw] of ev.def.trees ?? []) bakeW4(ev, 'giftbaum', { height: h }, [px, y, pz], yaw);
  for (const [px, pz, h, yaw] of ev.def.shrooms ?? []) bakeW4(ev, 'giftpilz', { height: h }, [px, y, pz], yaw);
  if (wf) bakeW4(ev, 'liane', { length: 4.2 }, [wf.x0 - 1.4, wf.top, wf.z + 0.15], FRONT, 1, { sway: 0.3 }, false);
  // Giftsumpf: lila Giftwasser mit Schlieren und Blasen (Registry-Modell über dem Sumpfbecken def.swamp)
  const sw = ev.def.swamp;
  if (sw && liveW4(ev, 'giftwasser', { size: [sw[2] - sw[0] - 0.3, sw[3] - sw[1] - 0.3] }, [(sw[0] + sw[2]) / 2, y - 0.08, (sw[1] + sw[3]) / 2], 0, 1, 'idle', false)) return;
  // sonst: Giftblasen steigen aus dem Sumpf (Instanz-Kugeln, platzen oben)
  const N = 9;
  const bubbles = instanced(ev, cached('w4m:bubble', () => new THREE.SphereGeometry(0.22, 8, 6)),
    N, { name: 'giftblasen', material: new THREE.MeshStandardMaterial({ color: 0xd890ff, emissive: 0x4a1a6a, transparent: true, opacity: 0.8, roughness: 0.2 }) });
  ev.own.push(bubbles.material);
  const spots = [];
  for (let i = 0; i < N; i++) spots.push([x - 9 + ((i * 7.3) % 18), z - 5 + ((i * 3.7) % 10), i * 0.37]);
  ev.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const [bx, bz, ph] = spots[i];
      const u = ((t * 0.45 + ph) % 1);
      setInst(bubbles, i, bx, y - 0.05 + u * 0.5, bz, 0, u < 0.85 ? 0.4 + u * 0.8 : (1 - u) * 6);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  });
}

// ------------------------------------------------------------------ 4-A Lava-Felsinsel

function lavaIsle(ev, x, y, z) {
  const W = ev.level.world;
  const spikes = ev.def.spikes ?? [];
  if (spikes.length) {
    const b = new Build();
    spikes.forEach(([sx, sz, h], i) => {
      b.add(new THREE.ConeGeometry(0.75, h, 6), { v: (px, py) => mix(0x2a2026, 0x5a4650, (py + h / 2) / h) }, { p: [sx - x, h / 2, sz - z], r: [0.08 * (i % 3 - 1), i, 0.06 * (i % 2 ? 1 : -1)] });
      b.add(new THREE.ConeGeometry(0.4, h * 0.55, 5), 0x3a2e34, { p: [sx - x + 0.7, h * 0.27, sz - z + 0.3], r: [0, i, 0.2] });
    });
    ev.addStatic(place(b.geometry(), x, y, z), { castShadow: true });
    for (const [sx, sz, h] of spikes) W.add({ type: 'cyl', x: sx, z: sz, r: 0.6, y0: y, y1: y + h, tag: 'felsspitze' });
  }
  for (const [bx, bz] of ev.def.braziers ?? []) {
    ev.addStatic(place(cached('w4m:brazier', () => {
      const g = new Build();
      g.cyl(0.18, 0.26, 1.1, 0x3a3036, { p: [0, 0.55, 0] }, 7);
      g.cyl(0.5, 0.3, 0.36, 0x5a4a50, { p: [0, 1.25, 0] }, 10);
      g.torus(0.5, 0.06, 0xff7a2a, { p: [0, 1.43, 0], r: [Math.PI / 2, 0, 0] }, 4, 14);
      return g.geometry();
    }).clone(), bx, y, bz), { castShadow: true });
    W.add({ type: 'cyl', x: bx, z: bz, r: 0.5, y0: y, y1: y + 1.5, tag: 'feuerschale' });
    flame(ev, bx, y + 1.75, bz, 1.0);
  }
  // glühender Lavabrocken-Haufen als Hinweis (Kulisse am Rand)
  ev.addStatic(place(cached('w4m:lavapile', () => {
    const b = new Build();
    for (const [px, py, pz, r] of [[0, 0.4, 0, 0.55], [0.8, 0.35, 0.2, 0.45], [0.4, 0.95, 0.1, 0.4]]) {
      b.add(new THREE.DodecahedronGeometry(r, 0), (qx, qy, qz, nx, ny) => (Math.abs(nx) > 0.6 ? 0xff7a2a : mix(0x3a2a2e, 0x6a4a4a, ny * 0.5 + 0.5)), { p: [px, py, pz], r: [px, py * 3, pz] });
    }
    return b.geometry();
  }).clone(), x - 6.6, y, z - 6.4), { castShadow: true });
  // Glutfunken steigen aus dem Lavasee (nur Optik)
  let next = 0;
  ev.updaters.push((dt, t) => {
    if (t < next) return;
    next = t + 0.35;
    const fx = ev.level.effects;
    if (!fx) return;
    const a = Math.random() * TAU, r = 10 + Math.random() * 4;
    fx.sparks({ x: x + Math.cos(a) * r, y: 0.8, z: z + Math.sin(a) * r }, 3);
  });
}

// ------------------------------------------------------------------ 4-3 Lautsprecherturm mit Piep-Blöcken

export const BEEP_SWITCH = 4;          // Zählzeiten je Phase (ein Takt der Kartenmusik)
const MAP_BPM = 122;                   // course_world4_map (Ersatz, falls keine Musikuhr läuft)

/** Piep-Block (0,9 m) in Kartenqualität: runde Kanten, helle Frontfläche, Note. Farbe col. */
function beepBlockGeo(col, light) {
  return cached(`w4m:beep:${col}`, () => {
    const b = new Build();
    b.box(0.9, 0.9, 0.9, { v: (px, py, pz, nx, ny) => mix(col, light, Math.max(0, ny) * 0.5 + 0.15) }, {}, 0.1, 1);
    for (const s of [-1, 1]) {
      b.box(0.62, 0.62, 0.04, light, { p: [0, 0, s * 0.46] }, 0);
      const note = new THREE.Shape();
      note.moveTo(-0.05, -0.18); note.lineTo(-0.05, 0.2); note.lineTo(0.16, 0.12); note.lineTo(0.16, 0.06); note.lineTo(0.03, 0.11); note.lineTo(0.03, -0.18); note.lineTo(-0.05, -0.18);
      b.extrude(note, 0.03, col, { p: [0.02, 0, s * 0.48], r: [0, s < 0 ? Math.PI : 0, 0] }, 0, 1);
      b.sphere(0.09, col, { p: [-0.1 * s, -0.18, s * 0.49], s: [1.2, 0.9, 0.4] }, 6, 4);
    }
    return b.geometry();
  });
}
function beepGhostGeo() {
  return cached('w4m:beepghost', () => {
    const b = new Build();
    // Umriss aus Kanten (gestrichelt wirkend): 12 dünne Stäbe
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      b.box(0.86, 0.06, 0.06, 0xffffff, { p: [0, dy * 0.42, dx * 0.42] }, 0);
      b.box(0.06, 0.86, 0.06, 0xffffff, { p: [dx * 0.42, 0, dy * 0.42] }, 0);
      b.box(0.06, 0.06, 0.86, 0xffffff, { p: [dx * 0.42, dy * 0.42, 0] }, 0);
    }
    return b.geometry();
  });
}

function beepTower(ev, x, y, z) {
  const H = 10.5;
  ev.addStatic(place(cached('w4m:beeptower', () => {
    const b = new Build();
    // Sockel aus Metall, Gittermast (vier Pfosten, Streben), Plattform oben, Antenne, Schüssel
    b.box(4.6, 0.6, 4.6, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0x9aa2b0 : 0x5a6272) }, { p: [0, 0.3, 0] }, 0.06, 1);
    for (const [px, pz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) b.cyl(0.11, 0.14, H, 0x8a94a6, { p: [px, 0.6 + H / 2, pz] }, 6);
    for (let k = 0; k < 5; k++) {
      const yy = 0.6 + 1 + k * 2;
      for (const s2 of [-1, 1]) {
        b.box(2.8, 0.08, 0.08, 0xd8283a, { p: [0, yy, s2 * 1.4], r: [0, 0, (k % 2 ? 0.55 : -0.55)] }, 0);
        b.box(0.08, 0.08, 2.8, 0xd8283a, { p: [s2 * 1.4, yy, 0], r: [(k % 2 ? 0.55 : -0.55), 0, 0] }, 0);
      }
      b.box(3.0, 0.1, 3.0, 0x6a7484, { p: [0, yy + 1, 0] }, 0);
    }
    b.box(3.6, 0.2, 3.0, 0x5a6272, { p: [0, H + 0.6, 0] }, 0);
    b.cyl(0.05, 0.06, 3.2, 0xd9dce6, { p: [1.6, H + 4.9, -0.4] }, 5);
    b.dome(0.9, 0xe6eaf0, { p: [-1.4, H + 3.6, -0.3], r: [-0.7, 0.4, 0] }, Math.PI / 2.6, 12, 4);
    b.cyl(0.05, 0.05, 0.9, 0x9aa2b0, { p: [-1.4, H + 3.7, 0.1], r: [-0.7, 0.4, 0] }, 4);
    // kleine Bildschirme am Sockel
    for (const s2 of [-1, 1]) b.box(0.9, 0.6, 0.08, 0x2a2e3a, { p: [s2 * 1.5, 1.1, 2.3] }, 0.03, 1);
    return b.geometry();
  }).clone(), x, y, z), { castShadow: true });
  solidBox(ev, x - 2.3, y, z - 2.3, x + 2.3, y + H + 3.4, z + 2.3, 'turm');
  let pulse = 0, act = 0;
  // Lautsprecher oben: Registry-Modell (Membranen springen im Takt), sonst eigene Box mit Membranen und Schallringen
  const speaker = liveW4(ev, 'lautsprecher', { height: 3.0 }, [x, y + H + 0.7, z + 0.2], FRONT, 1, () => ({ beat: pulse }));
  let cones = null, rings = null, ringMat = null;
  if (!speaker) {
    ev.addStatic(place(cached('w4m:speakerbox', () => {
      const b = new Build();
      b.box(4.4, 3.2, 2.4, { v: (px, py, pz, nx, ny) => (Math.abs(nz(nx, ny)) ? 0x2a2e3a : 0x3a3e4c) }, { p: [0, H + 1.8, 0] }, 0.18, 1);
      for (const s2 of [-1, 1]) {
        b.torus(0.9, 0.12, 0x8a94a6, { p: [s2 * 1.1, H + 1.8, 1.22] }, 5, 18);
        b.cyl(0.84, 0.84, 0.06, 0x16181e, { p: [s2 * 1.1, H + 1.8, 1.18], r: [Math.PI / 2, 0, 0] }, 16);
      }
      return b.geometry();
    }).clone(), x, y, z), { castShadow: true });
    cones = new THREE.Mesh(cached('w4m:speakercones', () => {
      const b = new Build();
      for (const s2 of [-1, 1]) {
        b.cone(0.72, 0.36, { v: (px, py, pz, nx, ny) => mix(0x3a3e4c, 0x8a94a6, py + 0.5) }, { p: [s2 * 1.1, 0, 0.06], r: [Math.PI / 2, 0, 0] }, 14);
        b.sphere(0.22, 0xffc21a, { p: [s2 * 1.1, 0, 0.3], s: [1, 1, 0.6] }, 8, 5);
      }
      return b.geometry();
    }), vcol(0.35, {}, 'w4cones'));
    cones.position.set(x, y + H + 1.8, z + 1.22);
    cones.name = 'w4:lautsprecher';
    ev.view.add(cones);
    ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.5, depthWrite: false, fog: true, side: THREE.DoubleSide });
    ev.own.push(ringMat);
    rings = new THREE.Mesh(cached('w4m:soundrings', () => {
      const b = new Build();
      for (const s2 of [-1, 1]) b.torus(0.9, 0.05, 0xffffff, { p: [s2 * 1.1, 0, 0] }, 3, 20);
      return b.geometry();
    }), ringMat);
    rings.position.set(x, y + H + 1.8, z + 1.5);
    rings.name = 'w4:schallringe';
    ev.view.add(rings);
  }
  // Equalizer-Säulen links und rechts am Sockel (tanzen im Takt)
  for (const s2 of [-1, 1]) liveW4(ev, 'equalizer_saeule', { segments: 8, height: 3.0 }, [x + s2 * 3.1, y, z + 1.2], FRONT, 1, () => ({ level: Math.min(1, 0.25 + pulse * 0.7 + (s2 > 0 ? act : 1 - act) * 0.15) }), false);
  const lampMat = glowMat(ev, 0xff3a3a);
  const lamp = new THREE.Mesh(cached('w4m:antlamp', () => new THREE.SphereGeometry(0.16, 8, 6)), lampMat);
  lamp.position.set(x + 1.6, y + H + 6.6, z - 0.4);
  lamp.name = 'w4:blinklicht';
  ev.view.add(lamp);
  const scrMat = glowMat(ev, 0x5ae0ff);
  const screens = new THREE.Mesh(cached('w4m:screens', () => {
    const b = new Build();
    for (const s2 of [-1, 1]) b.box(0.72, 0.44, 0.02, 0xffffff, { p: [s2 * 1.5, 1.1, 2.36] }, 0);
    return b.geometry();
  }), scrMat);
  screens.position.set(x, y, z);
  screens.name = 'w4:bildschirme';
  ev.view.add(screens);

  // Piep-Blöcke: Satz A (rot) und Satz B (blau) auf Ringen um den Turm und als Treppchen am Weg. Der aktive Satz ist
  // fest, der andere nur ein leuchtender Umriss. Registry: createInstanced('piep_block') je Farbe (setAll { on, warn });
  // sonst eigene Instanz-Flächen (fest = Vertexfarben, aus = durchscheinender Umriss).
  const spots = [[], []];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3, set = i % 2;
    const r = 3.4 + (i % 3) * 0.5;
    spots[set].push([x + Math.cos(a) * r, y + 1.4 + ((i * 5) % 7) * 0.9, z + Math.sin(a) * r, a]);
  }
  for (let k = 0; k < 4; k++) spots[k % 2].push([x + 3.6 + k * 0.95, y + 0.45 + k * 0.5, z + 3.6, 0]);
  const beep = {
    /** Zustand aus der Taktuhr der Musik (Ersatz: Bildzeit bei 122 BPM): aktiver Satz, Warnblinken, Zählzeit. */
    info(t = ev.view.time) {
      const mb = music.beat();
      const useMusic = mb.bpm > 0 && mb.playing;
      const beat = useMusic ? mb.beat : (t * MAP_BPM) / 60;
      const phase = Math.floor(beat / BEAT_PHASE()) % 2;
      const inPhase = beat - Math.floor(beat / BEAT_PHASE()) * BEAT_PHASE();
      return { active: phase === 0 ? 'a' : 'b', beat: +beat.toFixed(3), warn: inPhase >= BEAT_PHASE() - 1, source: useMusic ? mb.source : 'zeit', theme: mb.theme };
    },
    shown: null,
  };
  ev.beep = beep;
  if (hasModel('piep_block')) {
    const sets = ['rot', 'blau'].map((color, s2) => {
      const api = createInstanced('piep_block', spots[s2].length, { color });
      spots[s2].forEach(([px, py, pz, a], i) => api.setAt(i, [px, py - 0.45, pz], -a, 0.9, { on: 1 }));
      api.root.name = `w4:piep:${color}`;
      ev.view.add(api.root);
      ev.own.push(api);
      cullByView(ev, api.root, x, y + 4, z, 7);
      return api;
    });
    let key = '';
    ev.updaters.push((dt, t) => {
      const st = beep.info(t);
      act = st.active === 'a' ? 0 : 1;
      const frac = st.beat - Math.floor(st.beat);
      pulse = Math.max(0, 1 - frac * 4);
      const k = `${act}|${st.warn}`;
      if (k !== key) {
        key = k;
        sets.forEach((api, s2) => {
          const on = s2 === act;
          api.setAll({ on: on ? 1 : 0, warn: st.warn ? 1 : 0 });
          api.meshes[0].visible = on;                         // fest
          api.meshes[1].visible = api.meshes[2].visible = !on; // Umriss, Füllung
        });
      }
      for (const api of sets) api.update(dt);
      lampMat.color.setHex(Math.floor(st.beat) % 2 ? 0xff3a3a : 0x6a1010);
      scrMat.color.setHex(act ? 0x5ab4ff : 0xff7ad0);
      beep.shown = { active: st.active, blink: st.warn && frac > 0.5 };
    });
    return;
  }
  const solidMats = [vcol(0.35, { emissive: 0x3a0a2a }, 'w4beepA'), vcol(0.35, { emissive: 0x0a1a4a }, 'w4beepB')];
  const ghostMats = [0xff6ac8, 0x4a9aff].map((c) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false, fog: true }); ev.own.push(m); return m; });
  const sets = [
    instanced(ev, beepBlockGeo(0xff4ab0, 0xffd0ee), spots[0].length, { name: 'piep:a', material: solidMats[0], shadow: true }),
    instanced(ev, beepBlockGeo(0x2a7aff, 0xc8e0ff), spots[1].length, { name: 'piep:b', material: solidMats[1], shadow: true }),
  ];
  const ghostGeo = beepGhostGeo();
  const solidGeos = [sets[0].geometry, sets[1].geometry];
  const placeSets = (pl) => {
    for (let s2 = 0; s2 < 2; s2++) {
      spots[s2].forEach(([px, py, pz, a], i) => setInst(sets[s2], i, px, py + Math.sin(a * 3) * 0.05, pz, -a, 1 + pl * 0.06));
      sets[s2].instanceMatrix.needsUpdate = true;
    }
  };
  placeSets(0);
  ev.updaters.push((dt, t) => {
    const st = beep.info(t);
    act = st.active === 'a' ? 0 : 1;
    const frac = st.beat - Math.floor(st.beat);
    const blink = st.warn && frac > 0.5;
    for (let s2 = 0; s2 < 2; s2++) {
      const solid = s2 === act && !blink;
      sets[s2].geometry = solid ? solidGeos[s2] : ghostGeo;
      sets[s2].material = solid ? solidMats[s2] : ghostMats[s2];
      sets[s2].castShadow = solid;
    }
    pulse = Math.max(0, 1 - frac * 4);
    placeSets(pulse);
    if (cones) cones.scale.set(1 + pulse * 0.06, 1 + pulse * 0.06, 1 + pulse * 0.5);
    if (rings) { rings.scale.setScalar(1 + frac * 1.6); ringMat.opacity = 0.55 * (1 - frac); }
    lampMat.color.setHex(Math.floor(st.beat) % 2 ? 0xff3a3a : 0x6a1010);
    scrMat.color.setHex(act ? 0x5ab4ff : 0xff7ad0);
    beep.shown = { active: st.active, blink };
  });
}
const BEAT_PHASE = () => BEEP_SWITCH;
const nz = (nx, ny) => (Math.abs(nx) < 0.5 && Math.abs(ny) < 0.5 ? 1 : 0);

// ------------------------------------------------------------------ 4-Haus geheimnisvolles Haus mit Stoppuhr

function mysteryClock(ev, x, y, z) {
  ev.addStatic(place(cached('w4m:clockhouse', () => {
    const b = new Build();
    // schmales, hohes Lehmhaus (violett getüncht), schiefer Turm mit Uhr
    const wall = { v: (px, py, pz, nx) => mix(0x6a4a9a, 0x9a7ac8, py / 7 * 0.6 + 0.25 + Math.abs(nx) * -0.08) };
    b.box(5.4, 4.2, 4.4, wall, { p: [0, 2.1, 0] }, 0.14, 1);
    b.box(3.4, 3.6, 3.4, wall, { p: [0.2, 5.9, -0.2], r: [0, 0, 0.03] }, 0.12, 1);
    // Dächer
    b.cone(3.0, 1.4, { v: (px, py) => mix(0x2a1a4a, 0x4a2e7a, py + 0.5) }, { p: [0, 4.85, 0], r: [0, Math.PI / 4, 0], s: [1.25, 1, 1.05] }, 4);
    b.cone(2.6, 2.6, { v: (px, py) => mix(0x2a1a4a, 0x5a3a8a, py / 2.6 + 0.5) }, { p: [0.3, 9.0, -0.2], r: [0, Math.PI / 4, 0.06] }, 4);
    // Uhr (Zifferblatt) vorn am Turm
    b.cyl(1.25, 1.25, 0.18, 0xfff8e8, { p: [0.2, 6.1, 1.55], r: [Math.PI / 2, 0, 0] }, 24);
    b.torus(1.3, 0.12, 0xffc21a, { p: [0.2, 6.1, 1.62] }, 5, 24);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      b.box(0.08, 0.26, 0.04, i === 0 ? 0xe8283a : 0x2a1a4a, { p: [0.2 + Math.sin(a) * 1.0, 6.1 + Math.cos(a) * 1.0, 1.66], r: [0, 0, -a] }, 0);
    }
    // Stoppuhr-Knopf oben auf dem Turmdach
    b.cyl(0.22, 0.22, 0.4, 0xffc21a, { p: [0.3, 10.5, -0.2] }, 8);
    b.box(0.7, 0.18, 0.3, 0xffc21a, { p: [0.3, 10.75, -0.2] }, 0.04, 1);
    // Tür und Stufen
    const door = new THREE.Shape();
    door.moveTo(-0.7, 0); door.lineTo(-0.7, 1.6); door.absarc(0, 1.6, 0.7, Math.PI, 0, true); door.lineTo(0.7, 0); door.lineTo(-0.7, 0);
    b.extrude(door, 0.12, 0x2a1630, { p: [0, 0, 2.22] }, 0.03, 10);
    b.box(2.2, 0.22, 0.8, 0x8a7a8a, { p: [0, 0.11, 2.6] }, 0.04, 1);
    for (const sx of [-1.8, 1.8]) b.torus(0.42, 0.07, 0x4a2e1e, { p: [sx, 2.6, 2.22] }, 5, 16);
    return b.geometry();
  }).clone(), x, y, z), { castShadow: true });
  solidBox(ev, x - 2.8, y, z - 2.3, x + 2.8, y + 8, z + 2.3, 'haus');
  // Zeiger der Stoppuhr (läuft in 10 s einmal herum), leuchtende Fenster, schwebendes Fragezeichen
  const hand = new THREE.Mesh(cached('w4m:clockhand', () => {
    const b = new Build();
    b.box(0.12, 0.95, 0.05, 0xe8283a, { p: [0, 0.42, 0] }, 0);
    b.cyl(0.13, 0.13, 0.08, 0x2a1a4a, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0] }, 10);
    return b.geometry();
  }), vcol(0.4, {}, 'w4hand'));
  hand.position.set(x + 0.2, y + 6.1, z + 1.72);
  hand.name = 'w4:zeiger';
  ev.view.add(hand);
  const winMat = glowMat(ev, 0xffe07a);
  const win = new THREE.Mesh(cached('w4m:clockwin', () => {
    const b = new Build();
    for (const sx of [-1.8, 1.8]) b.cyl(0.36, 0.36, 0.02, 0xffffff, { p: [sx, 2.6, 2.21], r: [Math.PI / 2, 0, 0] }, 14);
    return b.geometry();
  }), winMat);
  win.position.set(x, y, z);
  win.name = 'w4:fenster';
  ev.view.add(win);
  const q = new THREE.Mesh(cached('w2:qmark', () => {
    const b = new Build();
    b.torus(0.42, 0.15, 0xffd23a, { p: [0, 0.75, 0], r: [0, 0, -0.5] }, 8, 20, Math.PI * 1.4);
    b.cyl(0.15, 0.15, 0.42, 0xffd23a, { p: [0.02, 0.28, 0] }, 10);
    b.sphere(0.17, 0xffd23a, { p: [0.02, -0.2, 0] }, 10, 8);
    return b.geometry();
  }), vcol(0.35, { emissive: 0x6a4a00 }, 'qmark'));
  q.position.set(x - 2.6, y + 6.6, z + 1.2);
  q.castShadow = true;
  q.name = 'w4:fragezeichen';
  ev.view.add(q);
  ev.updaters.push((dt, t) => {
    hand.rotation.z = -((t % 10) / 10) * TAU;
    winMat.color.setHex(Math.sin(t * 5.3) + Math.sin(t * 2.1) > 1.4 ? 0xfff2b0 : 0xffd060);
    q.rotation.y = Math.sin(t * 1.4) * 0.5;
    q.position.y = y + 6.6 + Math.sin(t * 2.2) * 0.15;
  });
}

// ------------------------------------------------------------------ 4-4 Bergwiese mit Trampolinen

/** Oranger Pilz-Trampolin (Kartenqualität): Stiel und gepunkteter Hut, Höhe ≈ 0,9 × s. */
function shroomTrampGeo() {
  return cached('w4m:shroomtramp', () => {
    const b = new Build();
    b.lathe([[0.42, 0], [0.36, 0.2], [0.3, 0.5], [0.34, 0.62], [0, 0.62]], { v: (px, py) => mix(0xe8d2a8, 0xfff4dc, py / 0.6) }, null, 12);
    b.lathe([[0, 0.55], [0.9, 0.5], [1.12, 0.6], [1.16, 0.72], [1.0, 0.86], [0.6, 0.95], [0, 0.98]], (px, py, pz, nx, ny) => (ny < -0.5 ? 0xffe8c8 : 0xff8a1a), null, 16);
    for (const [r, yy, n] of [[0.45, 0.96, 4], [0.9, 0.84, 7]]) {
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU + r; b.sphere(0.13, 0xfff4dc, { p: [Math.cos(a) * r, yy, Math.sin(a) * r], s: [1, 0.35, 1] }, 7, 3); }
    }
    return b.geometry();
  });
}

/** Flatterkäfer in Kartenqualität (Blick +X): runder Panzer, Flügel. */
function beetleGeo() {
  return cached('w4m:beetle', () => {
    const b = new Build();
    b.sphere(0.32, { v: (px, py, pz, nx, ny) => mix(0xb81e2a, 0xff5a4a, ny * 0.5 + 0.5) }, { p: [0, 0, 0], s: [1.1, 0.8, 1] }, 9, 6);
    b.sphere(0.16, 0x2a2a34, { p: [0.3, -0.02, 0] }, 7, 5);
    for (const s of [-1, 1]) {
      b.sphere(0.05, 0xffffff, { p: [0.42, 0.04, s * 0.08] }, 5, 3);
      b.sphere(0.24, 0xf4f8ff, { p: [-0.05, 0.22, s * 0.28], s: [1.3, 0.25, 0.9], r: [s * 0.4, 0, 0] }, 7, 3);
    }
    return b.geometry();
  });
}

function bounceMeadow(ev, x, y, z) {
  const W = ev.level.world;
  // Riesentrampolin: Registry-Modell (schwebend, Propeller, Ballons; federt nach), sonst dicker oranger Pilz
  const GY = 1.5;
  const giantOwner = { squash: 0, n: 0, onBounce() { this.squash = 1; this.n++; } };
  const giantModel = liveW4(ev, 'riesentrampolin', { radius: 3 }, [x, y + GY, z], FRONT, 1, () => ({ squash: Math.sin(giantOwner.squash * Math.PI) * giantOwner.squash, anim: giantOwner.squash > 0 ? 'bounce' : 'idle', n: giantOwner.n, spin: 3 }));
  let giant = null;
  if (giantModel) W.add({ type: 'cyl', x, z, r: 2.75, y0: y, y1: y + GY, bounce: 19, owner: giantOwner, tag: 'trampoline' });
  else {
    giant = new THREE.Mesh(shroomTrampGeo(), vcol(0.4, {}, 'w4tramp'));
    giant.position.set(x, y, z);
    giant.scale.set(2.3, 2.0, 2.3);
    giant.castShadow = true;
    giant.name = 'w4:riesentrampolin';
    ev.view.add(giant);
    W.add({ type: 'cyl', x, z, r: 2.5, y0: y, y1: y + 1.9, bounce: 19, owner: giantOwner, tag: 'trampoline' });
  }
  // Rad aus Flatterkäfern über dem Riesentrampolin (dreht sich)
  const N = 8;
  const wheel = instanced(ev, beetleGeo(), N, { key: 'w4beetle', shadow: false });
  const cx = x + 0.5, cy = y + 7.2, cz = z - 1.2, R = 2.6;
  const placeWheel = (t) => {
    for (let i = 0; i < N; i++) {
      const a = t * 0.8 + (i / N) * TAU;
      const flap = Math.sin(t * 18 + i) * 0.25;
      setInst(wheel, i, cx + Math.cos(a) * R, cy + Math.sin(a) * R, cz, 0, 1, 0, a + Math.PI / 2 + flap * 0.2);
    }
    wheel.instanceMatrix.needsUpdate = true;
  };
  placeWheel(0);
  // kleine Pilz-Trampoline (federn die Heldin hoch, wie der Baustein trampoline): Registry-Modell 'trampolin_orange'
  // (gemeinsame Teile instanziert), sonst eigene Instanz-Fläche
  const tramps = ev.def.trampolines ?? [];
  const owners = tramps.map(() => ({ squash: 0, n: 0, onBounce() { this.squash = 1; this.n++; } }));
  const useModel = hasModel('trampolin_orange');
  const tModels = useModel ? tramps.map(([tx, tz, s2]) => {
    const m = getModel('trampolin_orange', {});
    m.root.position.set(tx, y, tz);
    m.root.scale.setScalar(s2);
    ev.view.add(m.root);
    ev.own.push(m);
    return m;
  }) : [];
  if (useModel) instanceModelGroup(ev, tModels.map((m, i) => ({ model: m, pos: new THREE.Vector3(tramps[i][0], y, tramps[i][1]) })));
  const tm = !useModel && tramps.length ? instanced(ev, shroomTrampGeo(), tramps.length, { key: 'w4tramp', shadow: true }) : null;
  tramps.forEach(([tx, tz, s2], i) => {
    W.add({ type: 'cyl', x: tx, z: tz, r: (useModel ? 0.95 : 1.1) * s2, y0: y, y1: y + (useModel ? 1.0 : 0.95) * s2, bounce: 15, owner: owners[i], tag: 'trampoline' });
    if (tm) setInst(tm, i, tx, y, tz, 0, s2);
  });
  if (tm) tm.instanceMatrix.needsUpdate = true;
  // Windrad am Wiesenrand, Wolkeninsel über dem Tafelberg (Registry-Modelle)
  const wr = ev.def.windmill;
  if (wr && liveW4(ev, 'windrad', { height: wr[3] ?? 6 }, [wr[0], wr[1], wr[2]], FRONT + 0.5, 1, { speed: 0.35 })) solidCyl(ev, wr[0], wr[2], 0.5, wr[1], wr[1] + (wr[3] ?? 6));
  for (const [px, py, pz, sz] of ev.def.clouds ?? []) bakeW4(ev, 'wolkeninsel', { size: sz }, [px, py, pz], 0, 1, null, false);
  ev.updaters.push((dt, t) => {
    placeWheel(t);
    giantOwner.squash = Math.max(0, giantOwner.squash - dt * 2.5);
    if (giant) {
      const gq = Math.sin(giantOwner.squash * Math.PI) * giantOwner.squash;
      const k = (1 + Math.sin(t * 2.4) * 0.04) * (1 - gq * 0.3);
      giant.scale.set(2.3 / Math.sqrt(k), 2.0 * k, 2.3 / Math.sqrt(k));
    }
    tramps.forEach(([tx, tz, s2], i) => {
      const o = owners[i];
      o.squash = Math.max(0, o.squash - dt * 3);
      const q = Math.sin(o.squash * Math.PI) * o.squash;
      if (tModels[i]) tModels[i].update(dt, { squash: q, anim: o.squash > 0 ? 'bounce' : 'idle', n: o.n });
      else if (tm) setInst(tm, i, tx, y, tz, 0, [s2 * (1 + q * 0.15), s2 * (1 - q * 0.3), s2 * (1 + q * 0.15)]);
    });
    if (tm) tm.instanceMatrix.needsUpdate = true;
  });
  // Blumen rund um das Riesentrampolin
  ev.addStatic(place(cached('w4m:meadowbits', () => {
    const b = new Build();
    const cols = [0xff5a4a, 0xffd43a, 0xffffff, 0xff8ccc, 0x8a6aff];
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39, r = 3.2 + (i % 4) * 0.6;
      b.cyl(0.02, 0.02, 0.3, 0x3a8a2a, { p: [Math.cos(a) * r, 0.15, Math.sin(a) * r + 1] }, 3);
      b.sphere(0.12, cols[i % cols.length], { p: [Math.cos(a) * r, 0.32, Math.sin(a) * r + 1], s: [1, 0.6, 1] }, 6, 3);
    }
    return b.geometry();
  }).clone(), x, y, z), { castShadow: false });
}

// ------------------------------------------------------------------ 4-5 Ruinenstadt

function ruinCity(ev, x, y, z) {
  ev.addStatic(place(cached('w4m:ruintemple', () => {
    const b = new Build();
    const stone = (px, py, pz, nx, ny) => (ny > 0.6 ? 0xf2e2c2 : ((Math.floor(py * 1.6) + Math.floor((px + pz) * 0.8)) & 1) ? 0xdcc49a : 0xe8d4ae);
    // Stufenpodest
    for (let k = 0; k < 3; k++) b.box(11 - k * 1.2, 0.4, 6 - k * 0.9, stone, { p: [0, 0.2 + k * 0.4, -k * 0.3] }, 0.04, 1);
    // Rückwand mit Türöffnung, Giebelrest
    b.box(9.2, 5.4, 1.0, stone, { p: [0, 1.2 + 2.7, -2.2] }, 0.06, 1);
    const ped = new THREE.Shape();
    ped.moveTo(-5, 0); ped.lineTo(-1.2, 1.9); ped.lineTo(0.4, 1.4); ped.lineTo(1.0, 0.6); ped.lineTo(2.8, 0.4); ped.lineTo(3.4, 0); ped.lineTo(-5, 0);
    b.extrude(ped, 1.2, stone, { p: [0, 6.6, -2.2] }, 0, 1);
    b.box(10.2, 0.4, 1.4, 0xf2e2c2, { p: [-0.4, 6.5, -2.2] }, 0.04, 1);
    // dunkle Tempeltür
    const door = new THREE.Shape();
    door.moveTo(-1.2, 0); door.lineTo(-1.2, 2.4); door.absarc(0, 2.4, 1.2, Math.PI, 0, true); door.lineTo(1.2, 0); door.lineTo(-1.2, 0);
    b.extrude(door, 0.1, 0x2a1a12, { p: [0, 1.2, -1.66] }, 0, 8);
    // Ranken an der Wand
    for (const [px, h] of [[-3.6, 4.2], [3.2, 3.4]]) b.tube([[px, 1.2, -1.66], [px + 0.4, 1.2 + h * 0.5, -1.6], [px - 0.2, 1.2 + h, -1.6]], 0.08, 0x4a9a3a, null, 8, 4);
    return b.geometry();
  }).clone(), x, y, z), { castShadow: true });
  solidBox(ev, x - 4.8, y, z - 2.9, x + 4.8, y + 7.4, z - 1.5, 'tempel');
  solidBox(ev, x - 5.5, y, z - 3.2, x + 5.5, y + 0.4, z + 3.0, 'stufen');
  // vier Säulen vor der Wand (zwei zerbrochen) – Registry-Modell, sonst eigene Geometrie
  const add = (g, o) => ev.addStatic(g, o);
  for (const [dx, h, broken] of [[-4.0, 5.6, false], [-1.6, 3.2, true], [1.6, 5.6, false], [4.0, 2.4, true]]) {
    if (!bakeW4(ev, 'ruinen_saeule', { height: h, broken }, [x + dx, y + 1.2, z + 0.2], FRONT + dx * 0.3)
      && !bakeModel(add, 'ruine_saeule', { height: h, broken }, [x + dx, y + 1.2, z + 0.2], 0)) ev.addStatic(place(columnGeo(h, broken, Math.round(dx * 10)), x + dx, y + 1.2, z + 0.2), { castShadow: true });
    solidCyl(ev, x + dx, z + 0.2, 0.55, y, y + 1.2 + h, 'saeule');
  }
  // Welt-4-Ruinen (Registry): zerbrochene Hasen-Statue neben dem Tempel, Ranken über der Wand, Torbogen am Weg
  if (bakeW4(ev, 'statue_bruch', { size: 3.2 }, [x - 6.8, y, z + 1.4], FRONT + 0.5)) solidCyl(ev, x - 6.8, z + 1.4, 1.1, y, y + 3.2, 'statue');
  bakeW4(ev, 'ranken', { length: 4, kind: 'haengend' }, [x - 2.2, y + 6.6, z - 1.62], 0, 1, { sway: 0.2 }, false);
  for (const [gx, gz, yaw, w] of ev.def.gates ?? []) {
    if (!bakeW4(ev, 'ruinen_torbogen', { width: w, height: 5 }, [gx, y, gz], yaw)) continue;
    // Pfeiler: quer zur Durchgangsrichtung
    const c = Math.abs(Math.cos(yaw)) > 0.7;
    for (const sg of [-1, 1]) solidCyl(ev, gx + (c ? 0 : sg * (w / 2 + 0.45)), gz + (c ? sg * (w / 2 + 0.45) : 0), 0.55, y, y + 5, 'torbogen');
  }
  // Stachelwalze aus Stein (Walzenwerfer!) lehnt vor den Stufen
  ev.addStatic(place(cached('w4m:stoneroller', () => {
    const b = new Build();
    b.cyl(0.9, 0.9, 2.2, { v: (px, py, pz, nx, ny) => mix(0xa89a8a, 0xd8ccb8, ny * 0.5 + 0.5) }, { r: [0, 0, Math.PI / 2] }, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      for (const sx of [-0.6, 0.2, 0.9]) b.cone(0.18, 0.5, 0xe8e0d0, { p: [sx + (i % 2) * 0.2 - 0.1, Math.sin(a) * 1.05, Math.cos(a) * 1.05], r: [a, 0, 0] }, 5);
    }
    return b.geometry();
  }).clone(), x + 6.6, y + 0.95, z + 3.4, 0.3), { castShadow: true });
  solidCyl(ev, x + 6.6, z + 3.4, 1.3, y, y + 1.9, 'walze');
}

// ------------------------------------------------------------------ 4-B blau vergitterte Werfer-Festung

function blueFortress(ev, x, y, z) {
  const g = cached('w4m:bluefort', () => {
    const b = new Build();
    const brick = (px, py, pz, nx, ny) => (ny > 0.6 ? 0xc8d0e0 : ((Math.floor(py * 2.2) + Math.floor((px + pz) * 1.1)) & 1) ? 0x3a5aa8 : 0x4a6ac0);
    b.box(14, 4.6, 2.4, brick, { p: [0, 2.3, 0] }, 0.08, 1);
    for (let i = 0; i < 13; i++) b.box(0.7, 0.7, 2.5, 0x2a4a98, { p: [-6.5 + i * 1.08, 4.95, 0] }, 0, 1);
    for (const s of [-1, 1]) {
      b.cyl(1.7, 1.85, 7, brick, { p: [s * 7.2, 3.5, 0.2] }, 12);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.5, 0.6, 0.5, 0x2a4a98, { p: [s * 7.2 + Math.cos(a) * 1.55, 7.3, 0.2 + Math.sin(a) * 1.55] }, 0, 1); }
      b.cone(2.1, 2.8, { v: (px, py) => mix(0x1a2a6a, 0x3a5ab8, py / 2.8 + 0.5) }, { p: [s * 7.2, 9.0, 0.2] }, 12);
      b.cyl(0.4, 0.3, 0.3, 0x2a2a34, { p: [s * 7.2, 7.75, 1.9] }, 8);   // Feuerschale vorn am Turm
    }
    const door = new THREE.Shape();
    door.moveTo(-1.4, 0); door.lineTo(-1.4, 2.0); door.absarc(0, 2.0, 1.4, Math.PI, 0, true); door.lineTo(1.4, 0); door.lineTo(-1.4, 0);
    b.extrude(door, 0.16, 0x0e1630, { p: [0, 0, 1.22] }, 0, 10);
    for (let i = -2; i <= 2; i++) b.box(0.1, 3.2, 0.1, 0x8aa0d0, { p: [i * 0.5, 1.6, 1.32] }, 0, 1);
    for (const yy of [0.8, 2.2]) b.box(2.6, 0.1, 0.1, 0x8aa0d0, { p: [0, yy, 1.32] }, 0, 1);
    // Feuer-Wappen (Flamme) über dem Tor
    const fl = new THREE.Shape();
    fl.moveTo(0, -0.5); fl.quadraticCurveTo(0.5, -0.2, 0.3, 0.3); fl.quadraticCurveTo(0.15, 0.1, 0.1, 0.5); fl.quadraticCurveTo(-0.2, 0.2, -0.35, 0.25); fl.quadraticCurveTo(-0.5, -0.2, 0, -0.5);
    b.cyl(0.75, 0.75, 0.12, 0xffc21a, { p: [0, 3.9, 1.22], r: [Math.PI / 2, 0, 0] }, 16);
    b.extrude(fl, 0.08, 0xff5a1a, { p: [0, 3.9, 1.32] }, 0, 4);
    return b.geometry();
  });
  ev.addStatic(place(g.clone(), x, y, z), { castShadow: true });
  solidBox(ev, x - 9, y, z - 1.4, x + 9, y + 7.4, z + 1.6);
  for (const s of [-1, 1]) flame(ev, x + s * 7.2, y + 8.2, z + 1.9, 0.9);
  // blaue Gitter um den Hof (Linien wie 1-A/3-A)
  for (const [x0, z0, x1, z1] of ev.def.cage ?? []) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cg = cageGeo(len, 1.9);
    const col = cg.attributes.color;
    for (let i = 0; i < col.count; i++) {
      const r = col.getX(i), gg = col.getY(i);
      col.setXYZ(i, r * 0.15, gg * 0.42, Math.min(1, r * 1.0));
    }
    ev.addStatic(place(cg, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0)), { castShadow: true });
  }
}

// ------------------------------------------------------------------ 4-Burg Lava-Burg

function lavaCastle(ev, x, y, z) {
  ev.addStatic(place(cached('w4m:lavacastle', () => {
    const b = new Build();
    const stone = (px, py, pz, nx, ny) => (ny > 0.6 ? 0x5a4a52 : ((Math.floor(py * 1.4) + Math.floor((px + pz) * 0.7)) & 1) ? 0x3a2e34 : 0x4a3c44);
    // Vorburg-Mauer mit Tor, Bergfried, zwei Ecktürme
    b.box(16, 5, 3, stone, { p: [0, 2.5, 4.5] }, 0.08, 1);
    for (let i = 0; i < 15; i++) b.box(0.75, 0.8, 3.1, 0x2e2428, { p: [-7.4 + i * 1.06, 5.4, 4.5] }, 0, 1);
    b.box(9, 10, 6, stone, { p: [0, 5, -1.5] }, 0.1, 1);
    for (let i = 0; i < 9; i++) b.box(0.8, 0.9, 6.1, 0x2e2428, { p: [-4 + i, 10.45, -1.5] }, 0, 1);
    for (const s of [-1, 1]) {
      b.cyl(2.2, 2.4, 11, stone, { p: [s * 7.6, 5.5, 3.2] }, 12);
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.box(0.7, 0.8, 0.7, 0x2e2428, { p: [s * 7.6 + Math.cos(a) * 2.05, 11.4, 3.2 + Math.sin(a) * 2.05] }, 0, 1); }
      b.cone(2.6, 3.4, { v: (px, py) => mix(0x5a1010, 0xa82a1a, py / 3.4 + 0.5) }, { p: [s * 7.6, 13.5, 3.2] }, 12);
    }
    // Mittelturm mit Spitze
    b.cyl(2, 2.2, 5, stone, { p: [0, 12.5, -1.8] }, 12);
    b.cone(2.6, 4.2, { v: (px, py) => mix(0x5a1010, 0xc8341a, py / 4.2 + 0.5) }, { p: [0, 17.1, -1.8] }, 12);
    b.cyl(0.08, 0.1, 3, 0xd9dce6, { p: [0, 20.6, -1.8] }, 6);
    // dunkle Toröffnung
    const door = new THREE.Shape();
    door.moveTo(-1.8, 0); door.lineTo(-1.8, 2.4); door.absarc(0, 2.4, 1.8, Math.PI, 0, true); door.lineTo(1.8, 0); door.lineTo(-1.8, 0);
    b.extrude(door, 0.16, 0x120a0c, { p: [0, 0, 6.06] }, 0, 10);
    return b.geometry();
  }).clone(), x, y, z), { castShadow: true });
  // Fallgitter, Ketten und Banner des Barons: Registry-Modelle, sonst eigene Gitterstäbe und Wandbehänge
  const gate = bakeW4(ev, 'fallgitter', { width: 3.4, height: 4.0 }, [x, y, z + 6.05], FRONT, 1, { open: 0 });
  let banners = 0;
  for (const sx of [-4.6, 4.6]) if (liveW4(ev, 'brummbaer_banner', { height: 3.0, width: 1.5 }, [x + sx, y + 4.8, z + 6.35], FRONT, 1, { sway: 0.35 })) banners++;
  if (!gate || !banners) {
    ev.addStatic(place(cached(`w4m:castlegate:${!!gate}:${!!banners}`, () => {
      const b = new Build();
      if (!gate) {
        for (let i = -3; i <= 3; i++) b.box(0.12, 3.8, 0.12, 0x6a6a74, { p: [i * 0.5, 1.9, 6.18] }, 0, 1);
        for (const yy of [1.0, 2.4, 3.6]) b.box(3.4, 0.12, 0.12, 0x6a6a74, { p: [0, yy, 6.18] }, 0, 1);
      }
      if (!banners) {
        for (const sx of [-4.6, 4.6]) {
          b.box(1.4, 2.6, 0.08, 0xc4304e, { p: [sx, 3.2, 6.05] }, 0, 1);
          b.box(1.4, 0.16, 0.12, 0xffc21a, { p: [sx, 4.5, 6.06] }, 0, 1);
          b.cone(0.7, 0.6, 0xc4304e, { p: [sx, 1.65, 6.05], r: [Math.PI, 0, 0], s: [1, 1, 0.1] }, 3);
          b.sphere(0.32, 0xffc21a, { p: [sx, 3.5, 6.12], s: [1, 1, 0.3] }, 8, 5);
        }
      }
      return b.geometry();
    }).clone(), x, y, z), { castShadow: true });
  }
  solidBox(ev, x - 8, y, z - 4.6, x + 8, y + 12, z + 6.1, 'burg');
  for (const s of [-1, 1]) solidCyl(ev, x + s * 7.6, z + 3.2, 2.5, y, y + 14, 'burg');
  // glühende Fenster (eine Fläche, flackert)
  const winMat = glowMat(ev, 0xff8a2a);
  const win = new THREE.Mesh(cached('w4m:castlewin', () => {
    const b = new Build();
    for (const [px, py, pz] of [[-2.6, 7.4, 1.52], [0, 7.4, 1.52], [2.6, 7.4, 1.52], [-7.6, 8.6, 5.42], [7.6, 8.6, 5.42], [0, 13.2, 0.22]]) {
      const w = new THREE.Shape();
      w.moveTo(-0.35, -0.5); w.lineTo(-0.35, 0.2); w.absarc(0, 0.2, 0.35, Math.PI, 0, true); w.lineTo(0.35, -0.5); w.lineTo(-0.35, -0.5);
      b.extrude(w, 0.02, 0xffffff, { p: [px, py, pz] }, 0, 6);
    }
    return b.geometry();
  }), winMat);
  win.position.set(x, y, z);
  win.name = 'w4:fenster';
  ev.view.add(win);
  // Lavafälle von der Basaltwand hinter dem Graben (def.lavafalls: [[x0, x1, z, top], …]), Baron-Brummbär-Banner
  for (const [fx0, fx1, fz, top] of ev.def.lavafalls ?? []) {
    if (liveW4(ev, 'lavafall', { width: fx1 - fx0, height: top - 0.5 }, [(fx0 + fx1) / 2, 0.55, fz + 0.4], FRONT, 1, 'idle', false)) continue;
    fallPlane(ev, { x0: fx0, x1: fx1, z: fz, top, bottom: 0.5 }, 'map:lavafall', (ctx, cw, ch) => {
      ctx.fillStyle = '#ff6a1a'; ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 24; i++) {
        const xx = (i * 37) % cw, yy = (i * 71) % ch, len = 30 + (i * 13) % 60;
        ctx.fillStyle = i % 3 ? 'rgba(255,220,90,0.85)' : 'rgba(190,40,10,0.8)';
        ctx.fillRect(xx, yy, 4 + (i % 3), len);
        ctx.fillRect(xx, yy - ch, 4 + (i % 3), len);
      }
    }, 0xffb43a, { opacity: 1, speed: 0.6 });
  }
  wavingFlag(ev, x + 0.08, y + 21.4, z - 1.8, 2.4, 1.5, baronFlagTexture());
  // Glutfunken über dem Graben
  let next = 0;
  ev.updaters.push((dt, t) => {
    winMat.color.setHex(Math.sin(t * 4.1) + Math.sin(t * 1.7) > 1.3 ? 0xffc04a : 0xff7a1a);
    if (t < next) return;
    next = t + 0.5;
    const lf = ev.def.lavafalls?.[Math.floor(t * 3) % Math.max(1, ev.def.lavafalls?.length ?? 1)];
    if (lf) ev.level.effects?.sparks?.({ x: (lf[0] + lf[1]) / 2, y: 1.0, z: lf[2] + 1.2 }, 4);
  });
}

// ------------------------------------------------------------------ Seilbahn (Kulisse, map.cableways)

/**
 * Seilbahn zwischen zwei Inseln: zwei Masten, Tragseil mit Durchhang, Gondel (Registry-Modell 'seilbahn_gondel')
 * pendelt hin und her. cw = { from: [x, y, z], to, hFrom, hTo, sag }. Liefert { update(dt, t), dispose() }.
 */
export function buildCableway(level, cw) {
  const view = level.view;
  const [ax, ay, az] = cw.from, [bx, by, bz] = cw.to;
  const hA = cw.hFrom ?? 6.5, hB = cw.hTo ?? 6.5;
  level.world.add({ type: 'cyl', x: ax, z: az, r: 0.6, y0: ay, y1: ay + hA, tag: 'mast' });
  level.world.add({ type: 'cyl', x: bx, z: bz, r: 0.6, y0: by, y1: by + hB, tag: 'mast' });
  if (!view) return null;
  const b = new Build();
  for (const [px, py, pz, h] of [[ax, ay, az, hA], [bx, by, bz, hB]]) {
    b.box(1.4, 0.4, 1.4, 0x6a4a3a, { p: [px, py + 0.2, pz] }, 0, 1);
    for (const s of [-1, 1]) b.cyl(0.1, 0.16, h, 0x8a5a36, { p: [px + s * 0.35, py + h / 2, pz], r: [0, 0, s * -0.04] }, 6);
    b.box(1.8, 0.3, 0.4, 0xffc21a, { p: [px, py + h, pz] }, 0, 1);
    b.cyl(0.25, 0.25, 0.2, 0x3a3a44, { p: [px, py + h + 0.2, pz], r: [Math.PI / 2, 0, 0] }, 10);
  }
  const p0 = new THREE.Vector3(ax, ay + hA, az), p1 = new THREE.Vector3(bx, by + hB, bz);
  const sag = cw.sag ?? 1.2;
  const pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; const p = p0.clone().lerp(p1, u); p.y -= Math.sin(u * Math.PI) * sag; pts.push([p.x, p.y, p.z]); }
  b.tube(pts, 0.05, 0x2a2a34, null, 32, 4);
  view.addStatic(b.geometry(), { castShadow: true });
  if (!hasModel('seilbahn_gondel')) return null;
  const m = getModel('seilbahn_gondel', {});
  m.root.rotation.y = Math.atan2(-(bz - az), bx - ax);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  view.add(m.root);
  const P = cw.period ?? 16;
  const pos = new THREE.Vector3();
  const update = (dt, t) => {
    const ph = (t % P) / P;
    const u0 = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const u = Math.min(1, Math.max(0, (u0 - 0.08) / 0.84));
    const e = u * u * (3 - 2 * u);
    pos.copy(p0).lerp(p1, e);
    pos.y -= Math.sin(e * Math.PI) * sag;
    m.root.position.copy(pos);
    m.update(dt, { anim: 'move' });
  };
  update(0, 0);
  return { update, dispose: () => m.dispose?.(), root: m.root };
}

// ------------------------------------------------------------------ Stellvertreter-Modelle (Gegnergruppen)

/**
 * Lavabrocken (Stellvertreter, bis das Registry-Modell 'lavabrocken' da ist): Felsklumpen mit glühenden Rissen,
 * großen Augen und Stummelfüßen; Blick +X, Fußpunkt im Ursprung. update(dt, { anim: 'walk'|'idle', speed }).
 */
function lavabrockenStandIn() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(cached('w4m:brolder', () => {
    const b = new Build();
    b.add(new THREE.IcosahedronGeometry(0.75, 1), (px, py, pz, nx, ny, nzz) => {
      const crack = Math.abs(Math.sin(px * 7.3 + pz * 5.1) * Math.cos(py * 6.2 - px * 2)) < 0.12;
      return crack ? 0xff8a1a : mix(0x3a2a2e, 0x6a4a48, ny * 0.5 + 0.5);
    }, { p: [0, 0.85, 0], s: [1.1, 0.95, 1.05] });
    for (const s of [-1, 1]) {
      b.sphere(0.2, 0xffffff, { p: [0.62, 1.05, s * 0.24], s: [0.6, 1, 0.9] }, 8, 6);
      b.sphere(0.1, 0x1a1012, { p: [0.72, 1.03, s * 0.24], s: [0.5, 1, 0.8] }, 6, 4);
      b.box(0.34, 0.08, 0.12, 0x2a1a1c, { p: [0.62, 1.32, s * 0.24], r: [s * 0.35, 0, 0] }, 0);
    }
    b.add(new THREE.DodecahedronGeometry(0.3, 0), 0x4a3436, { p: [-0.1, 1.55, 0.1], r: [0.3, 0.2, 0] });
    return b.geometry();
  }), vcol(0.6, { emissive: 0x2a0800 }, 'w4brolder'));
  body.castShadow = true;
  const feet = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(cached('w4m:brolderfoot', () => new Build().sphere(0.24, 0x2a2024, { s: [1.3, 0.6, 1] }, 8, 5).geometry()), vcol(0.6, {}, 'w4brolderfoot'));
    f.position.set(0.1, 0.12, s * 0.38);
    f.castShadow = true;
    root.add(f);
    feet.push(f);
  }
  root.add(body);
  let t = 0;
  return {
    root,
    update(dt, st) {
      t += dt;
      const walk = (st?.anim ?? 'idle') === 'walk';
      const k = walk ? Math.sin(t * 10) : 0;
      feet[0].position.x = 0.1 + k * 0.22; feet[1].position.x = 0.1 - k * 0.22;
      body.position.y = walk ? Math.abs(k) * 0.08 : Math.sin(t * 2) * 0.03;
      body.rotation.z = walk ? -0.12 : 0;
    },
    dispose() { root.removeFromParent(); },
  };
}

/** Stellvertreter je Name (Weltdaten roamers[].standIn) – gilt nur, solange die Registry das Modell nicht kennt. */
export const STAND_INS = {
  lavabrocken: lavabrockenStandIn,
  feuer_werfer: () => getModel('pilzling'),
};
void needleGeo; void glowTexture; void starShape; void basic;
