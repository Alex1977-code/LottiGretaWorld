// Hilfen für die Remix-Level der Welt Pilz P-5 „Werfertrubel im Sonnensaal“ (Basis 6-3), P-6 „Wrackriesen im Sturmwind“
// (Basis 6-2), P-7 „Sinkschollen über dem Blauglutsee“ (Basis 7-4) und das Kampf-Haus P-Haus „Haus Zehnkampf“ (kein Level:
// exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Gemeinsame Dateien und die Basislevel werden nicht
// verändert; alles Level-Lokale hängt sich über die Remix-Haken (`build`/`setup`, Präzisierung „Motor und Bausteine
// Bonuswelten“: eigene Haken laufen nach denen der Basis) bzw. `LEVEL.build`/`LEVEL.setup` sowie `level.onStep` /
// `view.onFrame` an.
//
//   P-7  sinkschollen   zerbrochene Steinschollen über der blauen Lava: steht eine Figur darauf, sinken sie (zuerst
//                       zittern, dann gleichmäßig) bis unter die Lava; ohne Last steigen sie wieder auf. Kollision mit
//                       mover (die Figur fährt mit), Darstellung als zwei Instanz-Gruppen (Stein + Glutrisse).
//        geheimPlatte   unsichtbare Plattform (fest, aber nicht gezeichnet), die beim ersten Betreten sichtbar wird
//                       (Glimmern, Glaskante) – nur im Gleitflug erreichbar.
//
// Alles Statische ist verschmolzen (Bld → Abschnitts-Meshes); Bewegtes zeichnet je Gruppe in wenigen Aufrufen.

import * as THREE from 'three';
import { addObject } from '../../blocks/kit.js';
import { playerOn, visDt } from '../../entities/gimmick.js';
import { Bld, litTop, isl, line, ring, arc } from '../w5/_helpers_b.js';

export { Bld, litTop, isl, line, ring, arc };

const TAU = Math.PI * 2;

// =====================================================================================================================
// P-7: sinkende Schollen über der blauen Lava
// =====================================================================================================================

/** Geometrie einer zerbrochenen Scholle (Ursprung = Mitte der Oberseite, w × h × d): zwei bis drei Bruchstücke. */
function schollenGeo(w, h, d, seed) {
  const b = new Bld();
  const r = (k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const cut = (r(1) - 0.5) * 0.5 * w;                     // Bruchkante quer (x)
  const gap = 0.09;
  const stone = litTop(0x5a5e8a, 0.5), top = litTop(0x8a8eb8, 0.75);
  const parts = [[-w / 2, cut - gap], [cut + gap, w / 2]];
  parts.forEach(([x0, x1], i) => {
    const pw = x1 - x0, cx = (x0 + x1) / 2, dz = (r(3 + i) - 0.5) * 0.12;
    b.box(pw, h, d - Math.abs(dz) * 2, cx, -h, dz, stone, { r: 0.08 });
    b.box(pw - 0.08, 0.06, d - 0.12 - Math.abs(dz) * 2, cx, -0.05, dz, top, { r: 0.03 });
    // Kanten-Brocken
    b.box(0.32, 0.22, 0.4, cx + (r(5 + i) - 0.5) * pw * 0.6, -0.2, dz + d / 2 - 0.1, stone, { r: 0.06, yaw: r(7 + i) });
  });
  return b.geometry();
}

/** Glutrisse (unbeleuchtet) einer Scholle: Bruchfuge und feine Risse, knapp über der Oberseite. */
function schollenGlut(w, d, seed) {
  const b = new Bld();
  const r = (k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const cut = (r(1) - 0.5) * 0.5 * w;
  b.box(0.1, 0.03, d * 0.96, cut, -0.03, 0, 0x5ad0ff, { r: 0 });
  for (let k = 0; k < 4; k++) {
    const x = (r(10 + k) - 0.5) * w * 0.8, z = (r(20 + k) - 0.5) * d * 0.7;
    b.box(0.6 + r(30 + k) * 0.6, 0.02, 0.05, x, -0.01, z, 0x7ae0ff, { r: 0, yaw: r(40 + k) * TAU });
  }
  return b.geometry();
}

/**
 * Sinkschollen (P-7 „sinkende Plattformen über blauer Lava“). list: [{ id?, pos: [x, top, z] (Mitte der Oberseite),
 * size?: [w, h, d] (3 × 0,6 × 3) }]. o: { sink: 0.42 (m/s unter Last), delay: 0.25 (s Zittern vor dem Sinken), rise: 0.7
 * (m/s ohne Last zurück), low: −0.45 (tiefste Oberseite – unter der Lava), lava: 0 (Lavaspiegel, für Blasen) }.
 * level.named.get(id) = { top, top0, load, sinks, state ('ruht'|'zittert'|'sinkt'|'steigt'), info() }.
 * Gegner mit Gewicht sinken nicht mit (nur Figuren).
 */
export function sinkschollen(level, list, o = {}) {
  const sink = o.sink ?? 0.42, rise = o.rise ?? 0.7, low = o.low ?? -0.45, delay = o.delay ?? 0.25;
  const S = list.map((sp, i) => {
    const [x, top, z] = sp.pos;
    const w = sp.size?.[0] ?? 3, h = sp.size?.[1] ?? 0.6, d = sp.size?.[2] ?? 3;
    const st = { id: sp.id ?? null, x, z, top0: top, top, w, h, d, load: false, sinks: 0, t: 0, state: 'ruht', seed: i * 1.7 + x * 0.13 - z * 0.07 };
    st.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: x, cz: z };
    st.shape = { type: 'box', min: [x - w / 2, top - h, z - d / 2], max: [x + w / 2, top, z + d / 2], mover: st.mover, owner: st, tag: 'sinkscholle' };
    st.sid = level.world.add(st.shape);
    st.info = () => ({ top: +st.top.toFixed(3), top0: st.top0, load: st.load, sinks: st.sinks, state: st.state });
    if (st.id) level.named.set(st.id, st);
    return st;
  });
  level.onStep((dt) => {
    for (const st of S) {
      st.mover.dy = 0; st.mover.vy = 0;
      const on = playerOn(level, st);
      if (on && !st.load) { st.t = 0; st.sinks++; }
      st.load = on;
      st.t += dt;
      let v = 0;
      if (on) { st.state = st.t < delay ? 'zittert' : 'sinkt'; v = st.t < delay ? 0 : -sink; }
      else if (st.top < st.top0 - 1e-4) { st.state = 'steigt'; v = rise; }
      else st.state = 'ruht';
      if (!v) continue;
      const ny = Math.max(low, Math.min(st.top0, st.top + v * dt));
      const dy = ny - st.top;
      if (Math.abs(dy) < 1e-7) continue;
      st.top = ny;
      st.mover.dy = dy; st.mover.vy = dy / dt;
      st.shape.min[1] = ny - st.h; st.shape.max[1] = ny;
      level.world.update(st.sid);
    }
  });
  if (level.view && S.length) {
    // je Größe eine Geometrie (alle Schollen gleicher Größe teilen sich die Instanz-Gruppe)
    const groups = new Map();
    for (const st of S) {
      const key = `${st.w}|${st.h}|${st.d}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(st);
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
    const h = {};
    for (const [, sts] of groups) {
      const { w, h: hh, d } = sts[0];
      const stone = new THREE.InstancedMesh(schollenGeo(w, hh, d, 3), level.view.mats.world, sts.length);
      const glow = new THREE.InstancedMesh(schollenGlut(w, d, 3), level.view.mats.glow, sts.length);
      stone.name = 'sinkschollen'; glow.name = 'sinkschollen-glut';
      stone.castShadow = true; stone.receiveShadow = true; glow.castShadow = false;
      stone.frustumCulled = false; glow.frustumCulled = false;
      let t = 0;
      addObject(level, stone, (dt) => {
        t += visDt(level, h, dt);
        sts.forEach((st, k) => {
          const shake = st.state === 'zittert' || st.state === 'sinkt' ? 0.025 : 0;
          const tilt = st.state === 'sinkt' ? 0.035 : 0;
          P.set(st.x + Math.sin(t * 57 + k) * shake, st.top + Math.sin(t * 1.3 + k * 2.1) * 0.025, st.z + Math.cos(t * 49 + k) * shake);
          E.set(Math.sin(t * 2.1 + k) * tilt + 0.012 * Math.sin(k * 3.3), (k * 1.37) % TAU, Math.cos(t * 1.7 + k) * tilt + 0.012 * Math.cos(k * 2.1));
          Q.setFromEuler(E);
          M.compose(P, Q, SC);
          stone.setMatrixAt(k, M);
          glow.setMatrixAt(k, M);
        });
        stone.instanceMatrix.needsUpdate = true;
        glow.instanceMatrix.needsUpdate = true;
      });
      addObject(level, glow);
    }
  }
  return S;
}

/**
 * Unsichtbare Plattform (P-7 Stern 2 „unsichtbare Plattform hinter der Zielröhre, nur gleitend“): fester Quader x0..x1,
 * zA..zB mit Oberseite top, ohne Darstellung, bis eine Figur darauf landet – dann blendet eine gläsern-blaue Platte ein
 * (Funkeln). o: { id, h: 0.5, color }. level.named.get(id) = { shown, landed, info() }.
 */
export function geheimPlatte(level, o) {
  const x0 = Math.min(o.x0, o.x1), x1 = Math.max(o.x0, o.x1), z0 = Math.min(o.zA, o.zB), z1 = Math.max(o.zA, o.zB);
  const h = o.h ?? 0.5, top = o.top;
  const st = { shown: false, landed: 0, k: 0 };
  st.shape = { type: 'box', min: [x0, top - h, z0], max: [x1, top, z1], owner: st, tag: 'geheimplatte' };
  level.world.add(st.shape);
  st.info = () => ({ shown: st.shown, landed: st.landed });
  if (o.id) level.named.set(o.id, st);
  level.onStep(() => {
    if (!playerOn(level, st)) return;
    if (!st.shown) {
      st.shown = true;
      level.sfx('powerup_appear');
      level.effects?.sparks({ x: (x0 + x1) / 2, y: top + 0.3, z: (z0 + z1) / 2 }, 18);
    }
    st.landed++;
  });
  if (level.view) {
    const b = new Bld();
    b.box(x1 - x0, h, z1 - z0, 0, -h, 0, litTop(o.color ?? 0x6ab8ff, 0.6), { r: 0.08 });
    const g = b.geometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0, roughness: 0.25, metalness: 0.1, emissive: 0x1a4a8a, emissiveIntensity: 0.6 });
    const m = new THREE.Mesh(g, mat);
    m.position.set((x0 + x1) / 2, top, (z0 + z1) / 2);
    m.visible = false;
    m.name = 'geheimplatte';
    const hh = {};
    addObject(level, m, (dt) => {
      dt = visDt(level, hh, dt);
      if (st.shown) st.k = Math.min(1, st.k + dt * 1.6);
      m.visible = st.k > 0.01;
      mat.opacity = 0.75 * st.k;
    });
  }
  return st;
}
