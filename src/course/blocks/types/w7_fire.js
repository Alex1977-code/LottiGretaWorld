// Welt-7-Bausteine Feuer: Feuerstab und Lava-Fontäne (Präzisierung Motor und Bausteine Welt 7).
//
// feuerstab – drehender Stab aus Feuerkugeln um einen Block (Bauplan 7-1 „Feuerstab-Plattformen“, Stempel „Stampfen auf
//   den ?-Block in der Mitte des zweiten Feuerstabs hebt ihn an“). Jede Feuerkugel verletzt bei Berührung (Funkelstern/
//   Riesentrank: unverwundbar); der Stab ist unzerstörbar. Der Mittelblock ist fest (oben begehbar). Mit block 'frage' gibt
//   ein Kopfstoß oder Stampfen den Inhalt; mit lift > 0 hebt Stampfen den Block auf einer wachsenden Säule um lift m an
//   (trägt die Figur über den Stab hinweg) – der Stab dreht unten weiter.
//   { type: 'feuerstab', id, pos: [x, y, z] (Mitte der Unterseite des Mittelblocks), block: 'stein' | 'frage' | false
//     (ohne Block: Drehpunkt bei pos + 0,5 m), size: 1 (Block), length: 6 (Kugeln je Arm, die erste sitzt im Block),
//     arms: 1 (1–4, gleichmäßig verteilt), spacing: 0.5 (m), radius: 0.24 (Kugel), speed: 1.6 (rad/s; + = gegen den
//     Uhrzeiger von oben bzw. vorn), angle: 0 (rad Start; 0 = +X), plane: 'waagerecht' (dreht um +Y) | 'x' (Rad in der
//     XY-Ebene) | 'z' (Rad in der ZY-Ebene), content: Inhalt des ?-Blocks ('coin' Standard | 'coins:5' | Power-up |
//     'star:I' | Aktion), lift: 0 (m), liftSpeed: 2.5 (m/s), onLift: Aktion (oben angekommen), idle: false, hidden }
//   level.named.get(id) = { angle, hits, lifted, liftH, used, start(), stop(), reveal(), hide(), points() → [{x,y,z}],
//                           info() }; w7(level).bars
//   Modell aus der Registry 'feuerstab' (models/kinds/gimmicks_w7.js; { length: (length − 1)·spacing, count: length − 1,
//   arms, plane: 'h' | 'v', color (Lava dort), block: nur beim Stein-Block }, Ursprung Mitte der Unterseite des 1-m-Blocks;
//   state { angle }) bei size 1 – den ?-Block zeichnet der Baustein selbst (Instanz-Pool wie die Blöcke); look: 'eigen' bzw.
//   ohne Modell: eigene Feuerkugeln (eine Instanz-Gruppe je Stab).
//
// lava_fontaene – Lava-Fontäne aus der Lava (Bauplan 7-7 „Fontänenfeld“). Im Takt: Ruhe → Vorwarnung (die Lava brodelt,
//   Glutring, kleine Spritzer) → Ausbruch (Säule schießt auf height m) → Halten → Zusammenfallen. mode 'heiss': die Säule
//   verletzt (Rückstoß nach oben/außen); mode 'tragen': eine Krustenplatte reitet oben auf der Fontäne und trägt die Figur
//   hinauf und wieder hinab (in Ruhe schwimmt sie auf der Lava).
//   { type: 'lava_fontaene', id, pos: [x, y, z] (Austritt; y Standard: Lava-Oberfläche dort, folgt steigender Lava),
//     height: 5, radius: 0.7, mode: 'heiss' | 'tragen', plate: 2.4 (Plattengröße bei 'tragen'), wait: 2.5, warn: 1.0,
//     rise: 0.45, hold: 1.6, fall: 0.9, phase: 0 (s Versatz), trigger: 'takt' | 'signal' (start()/fire() = ein Ausbruch) |
//     'nah' (Figur näher als near m), near: 3, color: 'rot' | 'blau' (Standard Lava dort), idle: false }
//   level.named.get(id) = { state ('ruhe'|'warn'|'steigt'|'oben'|'sinkt'), height (aktuell, m), top (Säulenspitze y),
//                           eruptions, hits, start(), stop(), fire(), info() }; w7(level).fountains
//   Modell aus der Registry 'lava_fontaene' ({ radius, color }, Ursprung Kratermitte = Austritt; state { height (m), warn
//   (bool) }) – look: 'eigen' bzw. ohne Modell: eigene Säule (Lava-Shader) mit Krone, Glüh-Hülle und Glutring.

import * as THREE from 'three';
import { v3, addObject } from '../kit.js';
import { MovingBox } from '../w2kit.js';
import { runAction, contentAction, visDt } from '../../entities/gimmick.js';
import { blockTemplate } from '../../entities/visuals.js';
import { hasModel, getModel } from '../../models/index.js';
import {
  w7, figures, sphereTouches, hurtFigures, fireMaterial, fireBallGeo, lavaTopAt, lavaColorAt, lavaMaterial, LAVA_PAL,
  glowTexture, clamp, ease, cycle, TAU,
} from '../w7kit.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// =====================================================================================================================
// Feuerstab
// =====================================================================================================================

export function buildFeuerstab(level, spec) {
  const p = v3(spec.pos);
  const blockKind = spec.block === false ? null : spec.block ?? 'stein';
  const S = spec.size ?? 1;
  const n = Math.max(1, Math.round(spec.length ?? 6));
  const arms = clamp(Math.round(spec.arms ?? 1), 1, 4);
  const sp = spec.spacing ?? 0.5, R = spec.radius ?? 0.24;
  const plane = spec.plane === 'x' || spec.plane === 'z' ? spec.plane : 'waagerecht';
  const pivotY = p.y + (blockKind ? S / 2 : 0.5);
  const st = {
    angle: spec.angle ?? 0, speed: spec.speed ?? 1.6, running: !spec.idle, hits: 0, hidden: !!spec.hidden,
    lifted: false, liftH: 0, used: false, bumpT: 0,
  };
  const lift = Math.max(0, spec.lift ?? 0), liftSpeed = spec.liftSpeed ?? 2.5;
  const content = blockKind === 'frage' ? contentAction(spec.content, { coins: 1 }) : null;
  const pts = [];
  for (let a = 0; a < arms; a++) for (let i = 0; i < n; i++) pts.push({ x: 0, y: 0, z: 0, d: i * sp, a });

  // Mittelblock (fest; bewegt sich beim Anheben) und Säule darunter
  let blk = null, pillar = null, pillarId = null;
  const handle = {
    get angle() { return st.angle; }, get hits() { return st.hits; }, get lifted() { return st.lifted; }, get liftH() { return st.liftH; },
    get used() { return st.used; }, get hidden() { return st.hidden; },
    start() { st.running = true; }, stop() { st.running = false; },
    reveal() { if (!st.hidden) return; st.hidden = false; blk?.setSolid(true); level.sfx('powerup_appear'); },
    hide() { if (st.hidden) return; st.hidden = true; blk?.setSolid(false); },
    points: () => pts.map((q) => ({ x: +q.x.toFixed(3), y: +q.y.toFixed(3), z: +q.z.toFixed(3) })),
    info: () => ({ angle: +st.angle.toFixed(3), hits: st.hits, lifted: st.lifted, liftH: +st.liftH.toFixed(2), used: st.used, block: blockKind }),
    onBump() {
      if (!content || st.used) return;
      st.bumpT = 0.25;
      give('bump');
    },
    onPound() {
      if (blockKind !== 'frage') return;
      if (!st.used) give('pound');
      if (lift > 0 && !st.lifted) { st.lifted = true; level.sfx('rumble'); level.shake(0.2); }
    },
  };
  function give(via) {
    st.used = true;
    level.sfx('blockhit');
    runAction(level, content, { pos: [p.x, p.y + S + st.liftH + 0.2, p.z], source: handle, via });
  }
  if (blockKind) {
    blk = new MovingBox(level, p.x, p.y, p.z, S, S, S, { tag: 'feuerstab', solid: !st.hidden });
    blk.shape.owner = handle;
  }
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).bars.push(handle);

  const place = () => {
    for (const q of pts) {
      const a = st.angle + (q.a * TAU) / arms, c = Math.cos(a), s = Math.sin(a);
      if (plane === 'waagerecht') { q.x = p.x + c * q.d; q.y = pivotY; q.z = p.z - s * q.d; }
      else if (plane === 'x') { q.x = p.x + c * q.d; q.y = pivotY + s * q.d; q.z = p.z; }
      else { q.x = p.x; q.y = pivotY + s * q.d; q.z = p.z - c * q.d; }
    }
  };
  place();
  level.onStep((dt) => {
    if (st.running) st.angle += st.speed * dt;
    place();
    // Anheben: Block steigt auf einer Säule (trägt die Figur mit)
    if (blk && st.lifted && st.liftH < lift) {
      st.liftH = Math.min(lift, st.liftH + liftSpeed * dt);
      blk.moveTo(p.x, p.y + st.liftH, p.z, dt);
      if (pillar) {
        pillar.max = [p.x + S * 0.42, p.y + st.liftH, p.z + S * 0.42];
        if (pillarId) level.world.update(pillarId); else pillarId = level.world.add(pillar);
      }
      if (st.liftH >= lift) runAction(level, spec.onLift, { pos: [p.x, p.y + S + lift, p.z], source: handle });
    } else blk?.still();
    if (st.hidden) return;
    // Treffer: Kugeln außerhalb des Blocks
    const r = R * 0.85;
    hurtFigures(level, (f) => {
      for (const q of pts) {
        if (blockKind && q.d < S * 0.5 + R * 0.3) continue;
        if (sphereTouches(f, q.x, q.y, q.z, r)) { st.hits++; return true; }
      }
      return false;
    }, { pos: { x: p.x, y: pivotY, z: p.z } });
  });
  if (blk && lift > 0) pillar = { type: 'box', min: [p.x - S * 0.42, p.y, p.z - S * 0.42], max: [p.x + S * 0.42, p.y + 0.01, p.z + S * 0.42], tag: 'feuerstab-saeule' };

  if (!level.view) return handle;
  // ---------------- Darstellung
  const root = new THREE.Group();
  root.name = 'feuerstab';
  let model = null;
  if (hasModel('feuerstab') && n > 1 && Math.abs(S - 1) < 1e-3 && spec.look !== 'eigen') {
    // Modell: Kugeln bei r = length·(k+1)/count (k = 0 … count−1) – entspricht unseren Kugeln 1 … n−1 (die erste sitzt im
    // Block); Block nur beim Stein-Block (den ?-Block zeichnet der Baustein selbst); 'v' = Rad in der X-Y-Ebene
    model = getModel('feuerstab', { length: (n - 1) * sp, count: n - 1, arms, plane: plane === 'waagerecht' ? 'h' : 'v', color: lavaColorAt(level, p.x, p.z), block: blockKind === 'stein' });
    model.root.position.set(p.x, pivotY - 0.5, p.z);
    if (plane === 'z') model.root.rotation.y = Math.PI / 2;
    root.add(model.root);
  }
  let balls = null, glow = null;
  if (!model) {
    balls = new THREE.InstancedMesh(fireBallGeo(), fireMaterial(level), pts.length);
    balls.frustumCulled = false;
    balls.castShadow = false;
    root.add(balls);
    // Glühen um die Kugeln (additiv, eine Instanz-Gruppe Ebenen zur Kamera)
    const gm = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff7a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), gm, pts.length);
    glow.frustumCulled = false;
    glow.renderOrder = 2;
    root.add(glow);
  }
  // Mittelblock: ?-Block bzw. Stein (Instanz-Pools wie die Blöcke) und Säule
  let pool = null, idx = -1, poolUsed = null, idxUsed = -1, pillarMesh = null;
  if (blockKind === 'frage') {
    pool = level.view.pool('block:question', () => blockTemplate('question'), { castShadow: true, capacity: 32 });
    idx = pool.alloc();
    poolUsed = level.view.pool('block:used', () => blockTemplate('used'), { castShadow: true, capacity: 32 });
    idxUsed = poolUsed.alloc();
  } else if (blockKind && !(model && blockKind === 'stein')) {
    poolUsed = level.view.pool('block:used', () => blockTemplate('used'), { castShadow: true, capacity: 32 });
    idxUsed = poolUsed.alloc();
  }
  if (lift > 0) {
    pillarMesh = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.4, S * 0.46, 1, 12), new THREE.MeshStandardMaterial({ color: 0x8a7a8a, roughness: 0.7 }));
    pillarMesh.visible = false;
    pillarMesh.castShadow = true;
    root.add(pillarMesh);
  }
  const holder = {};
  let t = 0;
  const cam = level.view.camera;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    root.visible = !st.hidden;
    if (st.bumpT > 0) st.bumpT = Math.max(0, st.bumpT - d);
    const by = p.y + st.liftH + Math.sin((st.bumpT / 0.25) * Math.PI) * 0.25;
    if (pool) {
      if (st.hidden) { pool.hide(idx); poolUsed.hide(idxUsed); } else if (st.used) { pool.hide(idx); poolUsed.set(idxUsed, p.x, by, p.z, 0, S); } else { poolUsed.hide(idxUsed); pool.set(idx, p.x, by, p.z, 0, S); }
    } else if (poolUsed) {
      if (st.hidden) poolUsed.hide(idxUsed); else poolUsed.set(idxUsed, p.x, by, p.z, 0, S);
    }
    if (pillarMesh) {
      pillarMesh.visible = st.liftH > 0.02;
      pillarMesh.scale.y = Math.max(0.01, st.liftH);
      pillarMesh.position.set(p.x, p.y + st.liftH / 2, p.z);
    }
    if (model) { model.update?.(d, { angle: st.angle }); return; }
    _q.copy(cam.quaternion);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i];
      const inBlock = blockKind && q.d < S * 0.45;
      const k = inBlock ? 0 : R * (1 + Math.sin(t * 17 + i * 1.9) * 0.08);
      _p.set(q.x, q.y, q.z); _s.set(k, k, k);
      _m.compose(_p, _q, _s);
      balls.setMatrixAt(i, _m);
      _s.set(k * 4.2, k * 4.2, 1);
      _m.compose(_p, _q, _s);
      glow.setMatrixAt(i, _m);
    }
    balls.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
  });
  return handle;
}

// =====================================================================================================================
// Lava-Fontäne
// =====================================================================================================================

export function buildLavaFontaene(level, spec) {
  const p0 = v3(spec.pos);
  const H = spec.height ?? 5, R = spec.radius ?? 0.7;
  const mode = spec.mode === 'tragen' ? 'tragen' : 'heiss';
  const trigger = spec.trigger ?? 'takt';
  const T = { wait: spec.wait ?? 2.5, warn: Math.max(0, spec.warn ?? 1.0), rise: spec.rise ?? 0.45, hold: spec.hold ?? 1.6, fall: spec.fall ?? 0.9 };
  const plan = cycle([{ name: 'ruhe', t: T.wait - T.warn }, { name: 'warn', t: T.warn }, { name: 'steigt', t: T.rise }, { name: 'oben', t: T.hold }, { name: 'sinkt', t: T.fall }], spec.phase ?? 0);
  const fixedY = Array.isArray(spec.pos) && spec.pos.length > 2 && spec.follow === false;
  const st = { state: 'ruhe', h: 0, base: p0.y, running: !spec.idle && trigger === 'takt', fireT: -1, eruptions: 0, hits: 0, warnK: 0 };
  const baseNow = () => {
    if (fixedY) return p0.y;
    const y = lavaTopAt(level, p0.x, p0.z, p0.y + 3);
    return y ?? p0.y;
  };
  st.base = baseNow();
  const color = spec.color ?? lavaColorAt(level, p0.x, p0.z);
  const plate = mode === 'tragen' ? (spec.plate ?? 2.4) : 0;
  const PT = 0.45;   // Plattendicke
  let mb = null;
  if (plate) mb = new MovingBox(level, p0.x, st.base - 0.05, p0.z, plate, PT, plate, { tag: 'fontaene-platte' });
  const handle = {
    get state() { return st.state; }, get height() { return st.h; }, get top() { return st.base + st.h; },
    get eruptions() { return st.eruptions; }, get hits() { return st.hits; }, mode,
    start() { if (trigger === 'takt') st.running = true; else handle.fire(); },
    stop() { st.running = false; },
    fire() { if (st.fireT < 0) st.fireT = 0; },
    info: () => ({ state: st.state, h: +st.h.toFixed(2), base: +st.base.toFixed(2), eruptions: st.eruptions, hits: st.hits, mode }),
  };
  if (mb) mb.shape.owner = handle;
  if (spec.id) level.named.set(spec.id, handle);
  w7(level).fountains.push(handle);

  const near = () => figures(level).some((f) => Math.hypot(f.pos.x - p0.x, f.pos.z - p0.z) < (spec.near ?? 3));
  const heightOf = (name, u) => (name === 'steigt' ? H * (1 - (1 - u) * (1 - u)) : name === 'oben' ? H * (1 + Math.sin(u * TAU * 2) * 0.03) : name === 'sinkt' ? H * (1 - ease(u)) : 0);
  level.onStep((dt, time) => {
    st.base = baseNow();
    let ph;
    if (trigger === 'takt') ph = st.running ? plan.at(time) : { name: 'ruhe', u: 0 };
    else {
      if (trigger === 'nah' && st.fireT < 0 && near()) st.fireT = 0;
      if (st.fireT >= 0) {
        st.fireT += dt;
        ph = plan.at(T.wait - T.warn + st.fireT - (spec.phase ?? 0));
        if (st.fireT >= T.warn + T.rise + T.hold + T.fall) { st.fireT = -1; ph = { name: 'ruhe', u: 0 }; }
      } else ph = { name: 'ruhe', u: 0 };
    }
    if (ph.name !== st.state) {
      if (ph.name === 'warn') level.sfx('blase');
      if (ph.name === 'steigt') { st.eruptions++; level.sfx('splash_big'); level.effects?.sparks({ x: p0.x, y: st.base + 0.3, z: p0.z }, 10); }
    }
    st.state = ph.name;
    st.warnK = ph.name === 'warn' ? ph.u : 0;
    st.h = heightOf(ph.name, ph.u);
    if (mb) {
      const y = st.base - 0.05 + Math.max(0, st.h - PT * 0.5);
      mb.moveTo(p0.x, y, p0.z, dt);
      return;
    }
    if (st.h < 0.3) return;
    // heiße Säule: Zylinder von der Lava bis zur Spitze (+ Krone)
    const top = st.base + st.h;
    hurtFigures(level, (f) => {
      const dx = f.pos.x - p0.x, dz = f.pos.z - p0.z;
      const rr = R + Math.max(f.half.x, f.half.z) * 0.8;
      if (dx * dx + dz * dz > rr * rr) return false;
      if (f.pos.y > top + 0.35 || f.pos.y + f.half.y * 2 < st.base) return false;
      st.hits++;
      return true;
    }, { pos: { x: p0.x, y: st.base, z: p0.z } });
  });

  if (!level.view) return handle;
  // ---------------- Darstellung
  const root = new THREE.Group();
  root.name = 'lava_fontaene';
  const pal = LAVA_PAL[color === 'blau' ? 'blau' : 'rot'];
  let model = null;
  if (hasModel('lava_fontaene') && spec.look !== 'eigen') {
    model = getModel('lava_fontaene', { radius: R, color });
    root.add(model.root);
  }
  // Säule (eigene Darstellung): offener Zylinder mit Lava-Muster nach oben, oben eine Krone aus Klecksen
  let col = null, crown = null, halo = null;
  if (!model) {
    const cg = new THREE.CylinderGeometry(R * 0.82, R, 1, 14, 1, true);
    cg.translate(0, 0.5, 0);
    col = new THREE.Mesh(cg, lavaMaterial(level, color, { vertical: true, speed: 6, bright: 1.35 }));
    col.castShadow = false;
    root.add(col);
    // Glüh-Hülle um die Säule (additiv): hebt die Fontäne vom Lavasee ab
    const hg = new THREE.CylinderGeometry(R * 1.6, R * 1.9, 1, 14, 1, true);
    hg.translate(0, 0.5, 0);
    halo = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: pal.hi, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    halo.renderOrder = 2;
    col.add(halo);
    crown = new THREE.InstancedMesh(fireBallGeo(), fireMaterial(level), 7);
    crown.frustumCulled = false;
    root.add(crown);
  }
  // Glutring auf der Lava (Vorwarnung) – additiv
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: pal.hi, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 2;
  root.add(ring);
  // Krustenplatte (mode 'tragen')
  let plateMesh = null;
  if (plate) {
    const g = new THREE.CylinderGeometry(plate * 0.56, plate * 0.5, PT, 9, 1);
    g.translate(0, PT / 2, 0);
    plateMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a3a3a, roughness: 0.9, emissive: pal.glow, emissiveIntensity: 0.12, flatShading: true }));
    plateMesh.castShadow = true; plateMesh.receiveShadow = true;
    level.view.add(plateMesh);
  }
  const holder = {};
  let t = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    root.position.set(p0.x, st.base, p0.z);
    const wk = st.state === 'warn' ? 0.35 + 0.65 * st.warnK : st.h > 0.3 ? 0.5 : 0;
    ring.material.opacity = wk * (0.65 + 0.35 * Math.sin(t * 22));
    const rs = R * (3.2 + wk * 1.4);
    ring.scale.set(rs, rs, 1);
    ring.position.y = 0.06;
    if (plateMesh) plateMesh.position.set(mb.pos.x, mb.pos.y, mb.pos.z);
    if (model) { model.update?.(d, { height: st.h, warn: st.state === 'warn' }); return; }
    const h = st.h;
    col.visible = h > 0.05;
    col.scale.set(1, Math.max(0.01, h), 1);
    // Krone: Kleckse um die Spitze (bei der Warnung kleine Spritzer knapp über der Lava)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 2.2;
      let k, y;
      if (h > 0.05) { k = R * (0.55 + 0.25 * Math.sin(t * 9 + i)); y = h + Math.sin(t * 7 + i * 2) * 0.12; }
      else if (st.state === 'warn') { const u = (t * 2.6 + i / 7) % 1; k = R * 0.22 * (1 - u); y = u * 1.1 * st.warnK; }
      else { k = 0; y = 0; }
      _p.set(Math.cos(a) * R * 0.55, y, Math.sin(a) * R * 0.55); _s.set(k, k, k);
      _m.compose(_p, _q.identity(), _s);
      crown.setMatrixAt(i, _m);
    }
    crown.instanceMatrix.needsUpdate = true;
  });
  return handle;
}

export const TYPES = { feuerstab: buildFeuerstab, lava_fontaene: buildLavaFontaene };
