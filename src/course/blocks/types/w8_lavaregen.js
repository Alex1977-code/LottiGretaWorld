// Welt-8-Baustein Lavabrocken-Regen (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-Burg „Dächer: Abgründe,
// Bodenstacheln, Lavabrocken-Regen aus dem Vulkan“).
//
// lavabrocken_regen – glühende Brocken fliegen in hohem Bogen aus dem Vulkan-Schlund `from` (auch weit außerhalb des Levels) auf
//   Ziele im Bereich. `warn` s vor dem Einschlag zeigt eine rote Landemarke (pulsierend, zieht sich zusammen) die Stelle.
//   Einschlag: Figuren im Radius `radius` werden getroffen (Rückstoß), Funken, Rumpeln, die Leuchtstege leuchten auf (flash);
//   mit `puddle` > 0 bleibt so lange eine kleine Glutpfütze, die bei Berührung verletzt. Ziele werden deterministisch (seed)
//   gewählt – gleichmäßig im Bereich `area` bzw. der Reihe nach aus `targets`; mit `aim` > 0 zielt jeder aim-te Brocken auf
//   die Figur (Lage beim Abwurf). Der Boden unter dem Ziel wird per Strahl gesucht (oder y).
//   { type: 'lavabrocken_regen', id, area: [x0, z0, x1, z1] | targets: [[x, y, z], …], y (Bodenhöhe statt Strahl),
//     from: [x, y, z] (Standard: 45 m hinter und 30 m über der Bereichsmitte), period: 1.6, count: 1 (Brocken je Welle),
//     flight: 1.8, warn: 1.2 (≤ flight), radius: 1.1, size: 0.6, puddle: 0, aim: 0, phase: 0, seed: 1,
//     start: 'auto' | 'signal' | { box: [x0, y0, z0, x1, y1, z1] } (startet, sobald eine Figur den Kasten betritt) }
//   level.named.get(id) = { state ('aus'|'an'), rocks: [{ state, x, y, z, tx, ty, tz, t }], impacts, hits, start(), stop(),
//     info() → { state, flying, warn (Brocken mit Landemarke), impacts, hits, waves, puddles } }; w8(level).rains.
//   Modelle (je Brocken aus einem Vorrat, erst bei Bedarf gebaut): 'lavabrocken_regen' ({ size }, Ursprung Brocken-Mitte; im
//   Flug anim 'fall', Schweif entgegen der Flugrichtung gedreht; beim Einschlag anim 'land' mit progress über 0,8 s),
//   Warnfeld 'landemarke' ({ size: [2,6·radius, 2,6·radius], shape: 'kreis' }, state { k: 0..1 zum Einschlag hin }), Pfütze
//   'lavapfuetze' ({ size: 1,6·radius }, anim 'grow' → 'idle' → 'cool' am Ende) – sonst bzw. mit look: 'eigen' Feuerkugeln
//   mit Krustenflecken, rote Ringe als Landemarke und Glutscheiben (je eine InstancedMesh).
//   Beispiel: { type: 'lavabrocken_regen', id: 'regen', area: [-8, -120, 8, -100], period: 1.4, warn: 1.1 }

import * as THREE from 'three';
import { v3, addObject } from '../kit.js';
import { Rnd } from '../../../three/world/geometry.js';
import { getModel, hasModel } from '../../models/index.js';
import { visDt } from '../../entities/gimmick.js';
import { w8, figures, hurtFigures, sphereTouches, flash, fireBallGeo, glowTexture, regModel, clamp, TAU } from '../w8kit.js';

const MAXR = 12;

export function buildLavabrockenRegen(level, spec) {
  const area = spec.area ?? null;
  const targets = Array.isArray(spec.targets) ? spec.targets.map(v3) : null;
  const cx = area ? (area[0] + area[2]) / 2 : targets?.[0]?.x ?? 0, cz = area ? (area[1] + area[3]) / 2 : targets?.[0]?.z ?? 0;
  const from = spec.from ? v3(spec.from) : { x: cx + 6, y: (targets?.[0]?.y ?? spec.y ?? 0) + 30, z: cz - 45 };
  const T = { period: spec.period ?? 1.6, count: Math.max(1, spec.count ?? 1), flight: spec.flight ?? 1.8, warn: Math.min(spec.flight ?? 1.8, spec.warn ?? 1.2), radius: spec.radius ?? 1.1, size: spec.size ?? 0.6, puddle: spec.puddle ?? 0, aim: spec.aim ?? 0 };
  const rnd = new Rnd((spec.seed ?? 1) * 7919 + 13);
  const startMode = spec.start ?? 'auto';
  const st = { on: startMode === 'auto', t: -(spec.phase ?? 0), wave: 0, impacts: 0, hits: 0, next: 0 };
  const rocks = [];
  const puddles = [];
  const groundAt = (x, z, y0) => {
    if (spec.y !== undefined) return spec.y;
    const hit = level.world.raycastDown(x, (y0 ?? from.y) + 2, z, 120, { ignore: (s) => !!s.mover });
    return hit ? hit.y : (y0 ?? 0);
  };
  const pick = () => {
    if (T.aim > 0 && st.wave % T.aim === T.aim - 1) {
      const f = figures(level)[0];
      if (f) return { x: f.pos.x, z: f.pos.z, y: null };
    }
    if (targets?.length) { const q = targets[st.next++ % targets.length]; return { x: q.x, z: q.z, y: q.y }; }
    if (area) return { x: rnd.real(area[0], area[2]), z: rnd.real(area[1], area[3]), y: null };
    return { x: cx, z: cz, y: null };
  };
  const launch = () => {
    for (let k = 0; k < T.count; k++) {
      const q = pick();
      const ty = q.y ?? groundAt(q.x, q.z);
      let r = rocks.find((o) => o.state === 'weg');
      if (!r) { if (rocks.length >= MAXR) return; r = { i: rocks.length }; rocks.push(r); }
      Object.assign(r, { state: 'flug', t: -k * 0.18, x: from.x, y: from.y, z: from.z, tx: q.x, ty, tz: q.z, spin: rnd.real(0, TAU) });
    }
    st.wave++;
  };
  const handle = {
    get state() { return st.on ? 'an' : 'aus'; }, rocks, puddles, get impacts() { return st.impacts; }, get hits() { return st.hits; },
    start() { st.on = true; }, stop() { st.on = false; },
    info: () => ({ state: st.on ? 'an' : 'aus', flying: rocks.filter((r) => r.state === 'flug').length, warn: rocks.filter((r) => r.state === 'flug' && r.t >= 0 && T.flight - r.t <= T.warn).length,
      impacts: st.impacts, hits: st.hits, waves: st.wave, puddles: puddles.filter((q) => q.t > 0).length }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).rains.push(handle);
  const box = startMode && typeof startMode === 'object' && Array.isArray(startMode.box) ? startMode.box : null;
  level.onStep((dt) => {
    if (!st.on && box) {
      for (const f of figures(level)) if (f.pos.x > box[0] && f.pos.x < box[3] && f.pos.y > box[1] && f.pos.y < box[4] && f.pos.z > box[2] && f.pos.z < box[5]) st.on = true;
    }
    if (st.on) {
      st.t += dt;
      if (st.t >= T.period) { st.t -= T.period; launch(); }
    }
    for (const r of rocks) {
      if (r.state !== 'flug') { r.landT = (r.landT ?? 9) + dt; continue; }
      r.t += dt;
      if (r.t < 0) continue;
      const u = clamp(r.t / T.flight, 0, 1);
      // Bogen: waagerecht gleichmäßig, senkrecht Parabel mit Scheitel über dem Ziel-Weg
      const peak = Math.max(from.y, r.ty) + 10;
      r.x = from.x + (r.tx - from.x) * u;
      r.z = from.z + (r.tz - from.z) * u;
      r.y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * peak + u * u * r.ty;
      // Treffer schon im Flug (kurz vor dem Boden)
      if (u > 0.85) hurtFigures(level, (f) => sphereTouches(f, r.x, r.y + T.size * 0.5, r.z, T.size * 0.8), { pos: { x: r.x, y: r.y, z: r.z } });
      if (u >= 1) {
        r.state = 'weg';
        r.landT = 0;
        st.impacts++;
        st.hits += hurtFigures(level, (f) => Math.hypot(f.pos.x - r.tx, f.pos.z - r.tz) < T.radius + f.half.x && Math.abs(f.pos.y - r.ty) < 1.6, { pos: { x: r.tx, y: r.ty, z: r.tz } });
        level.sfx('slam');
        level.shake(0.22);
        level.effects?.sparks({ x: r.tx, y: r.ty + 0.3, z: r.tz }, 16);
        level.effects?.ring?.({ x: r.tx, y: r.ty, z: r.tz }, T.radius * 1.4);
        flash(level, r.tx, r.ty, r.tz, 6, { by: 'lavabrocken' });
        if (T.puddle > 0) {
          let q = puddles.find((o) => o.t <= 0);
          if (!q) { q = {}; puddles.push(q); }
          Object.assign(q, { x: r.tx, y: r.ty, z: r.tz, t: T.puddle, i: puddles.indexOf(q) });
        }
      }
    }
    for (const q of puddles) {
      if (q.t <= 0) continue;
      q.t -= dt;
      hurtFigures(level, (f) => f.mode === 'ground' && Math.hypot(f.pos.x - q.x, f.pos.z - q.z) < T.radius * 0.8 && Math.abs(f.pos.y - q.y) < 0.3, { pos: { x: q.x, y: q.y - 1, z: q.z } });
    }
  });

  if (!level.view) return handle;
  // ---------------- Darstellung: Brocken (Instanzen), Glühen, Landemarken, Pfützen
  const root = new THREE.Group();
  root.name = 'lavabrocken_regen';
  const useModel = regModel(spec, 'lavabrocken_regen');
  // Modell-Vorräte (Platz i = Brocken bzw. Pfütze i), erst bei Bedarf gebaut
  const pool = (name, opts) => {
    const list = [];
    return (i) => {
      if (!list[i]) { const m = getModel(name, opts); m.root.visible = false; root.add(m.root); list[i] = m; }
      return list[i];
    };
  };
  const rockModel = useModel ? pool('lavabrocken_regen', { size: T.size }) : null;
  const markModel = useModel && hasModel('landemarke') ? pool('landemarke', { size: [T.radius * 2.6, T.radius * 2.6], shape: 'kreis' }) : null;
  const pudModel = useModel && T.puddle > 0 && hasModel('lavapfuetze') ? pool('lavapfuetze', { size: T.radius * 1.6 }) : null;
  const made = { rocks: 0, marks: 0, puds: 0 };
  let rockMesh = null, glow = null;
  if (!rockModel) {
    rockMesh = new THREE.InstancedMesh(fireBallGeo('rot'), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), MAXR);
    rockMesh.frustumCulled = false;
    root.add(rockMesh);
    glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff7a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), MAXR);
    glow.frustumCulled = false;
    root.add(glow);
  }
  // Landemarken: roter Ring + Fläche (liegend); Pfützen: Glutscheiben
  const ringG = new THREE.RingGeometry(0.82, 1, 28); ringG.rotateX(-Math.PI / 2);
  const discG = new THREE.CircleGeometry(1, 28); discG.rotateX(-Math.PI / 2);
  const ring = markModel ? null : new THREE.InstancedMesh(ringG, new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, depthWrite: false }), MAXR);
  const disc = markModel ? null : new THREE.InstancedMesh(discG, new THREE.MeshBasicMaterial({ color: 0xff5a3a, transparent: true, opacity: 0.3, depthWrite: false }), MAXR);
  const pud = pudModel ? null : new THREE.InstancedMesh(discG, new THREE.MeshBasicMaterial({ color: 0xff8a2a, toneMapped: false }), MAXR);
  for (const m of [ring, disc, pud]) if (m) { m.frustumCulled = false; m.renderOrder = 3; root.add(m); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  const UP = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3();
  let t = 0;
  const cam = level.view.camera;
  const hold = {};
  addObject(level, root, (dt0) => {
    const dt = visDt(level, hold, dt0);
    t += dt;
    let nr = 0, nm = 0, np = 0;
    for (const r of rocks) {
      const fly = r.state === 'flug' && r.t >= 0;
      const s = T.size;
      if (rockModel) {
        const landing = !fly && r.state === 'weg' && (r.landT ?? 9) < 0.8;
        if (fly || landing || made.rocks > r.i) {
          const m = rockModel(r.i); made.rocks = Math.max(made.rocks, r.i + 1);
          m.root.visible = fly || landing;
          if (fly) {
            // Schweif entgegen der Flugrichtung (Modell: Schweif nach +Y)
            V.set(r.x - (r.px ?? r.x), r.y - (r.py ?? r.y + 1), r.z - (r.pz ?? r.z));
            if (V.lengthSq() > 1e-6) m.root.quaternion.setFromUnitVectors(UP, V.normalize().negate());
            m.root.position.set(r.x, r.y + s * 0.5, r.z);
            m.update?.(dt, { anim: 'fall' });
          } else if (landing) {
            m.root.quaternion.identity();
            m.root.position.set(r.tx, r.ty + s * 0.5, r.tz);
            m.update?.(dt, { anim: 'land', progress: clamp(r.landT / 0.8, 0, 1) });
          }
        }
        r.px = r.x; r.py = r.y; r.pz = r.z;
      }
      if (fly && rockMesh) {
        E.set(r.spin + t * 3, t * 2, 0); Q.setFromEuler(E); P.set(r.x, r.y + s * 0.5, r.z); S.setScalar(s * 0.6); M.compose(P, Q, S); rockMesh.setMatrixAt(nr, M);
        P.set(r.x, r.y + s * 0.5, r.z); Q.copy(cam.quaternion); S.setScalar(s * 3.2); M.compose(P, Q, S); glow.setMatrixAt(nr, M);
        nr++;
      }
      const left = T.flight - r.t;
      const warnOn = r.state === 'flug' && left <= T.warn;
      const k = warnOn ? 1 - left / Math.max(0.01, T.warn) : 0;
      if (markModel) {
        if (warnOn || made.marks > r.i) {
          const m = markModel(r.i); made.marks = Math.max(made.marks, r.i + 1);
          m.root.visible = warnOn;
          if (warnOn) { m.root.position.set(r.tx, r.ty + 0.03, r.tz); m.update?.(dt, { k: 0.6 + 0.4 * k }); }
        }
      } else if (warnOn) {
        const rr = T.radius * (1.5 - 0.5 * k) * (1 + 0.06 * Math.sin(t * (10 + 20 * k)));
        P.set(r.tx, r.ty + 0.05, r.tz); Q.identity(); S.set(rr, 1, rr); M.compose(P, Q, S);
        ring.setMatrixAt(nm, M); disc.setMatrixAt(nm, M); nm++;
      }
    }
    puddles.forEach((q, i) => {
      if (pudModel) {
        if (q.t <= 0 && made.puds <= i) return;
        const m = pudModel(i); made.puds = Math.max(made.puds, i + 1);
        m.root.visible = q.t > 0;
        if (q.t <= 0) return;
        const age = T.puddle - q.t, coolDur = Math.min(3, T.puddle * 0.6), growDur = Math.min(0.5, T.puddle * 0.3);
        m.root.position.set(q.x, q.y + 0.04, q.z);
        const st = age < growDur ? { anim: 'grow', progress: age / growDur } : q.t < coolDur ? { anim: 'cool', progress: 1 - q.t / coolDur } : { anim: 'idle' };
        m.update?.(dt, st);
        return;
      }
      if (q.t <= 0) return;
      const rr = T.radius * 0.8 * Math.min(1, q.t * 2);
      P.set(q.x, q.y + 0.03, q.z); Q.identity(); S.set(rr, 1, rr); M.compose(P, Q, S);
      pud.setMatrixAt(np++, M);
    });
    if (rockMesh) { rockMesh.count = nr; rockMesh.instanceMatrix.needsUpdate = true; glow.count = nr; glow.instanceMatrix.needsUpdate = true; }
    if (ring) { ring.count = nm; disc.count = nm; ring.instanceMatrix.needsUpdate = true; disc.instanceMatrix.needsUpdate = true; }
    if (pud) { pud.count = np; pud.instanceMatrix.needsUpdate = true; }
  });
  return handle;
}

export const TYPES = { lavabrocken_regen: buildLavabrockenRegen };
