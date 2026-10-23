// Tödliche Flüssigkeiten Welt 4: Giftwasser (4-2 Giftsumpf), Gift- und Lavafälle, Glasrohr durch die Lava (4-Burg).
//
// giftwasser – lila Giftwasser: Berührung = Tod wie Lava (Figur springt hoch und fällt hinein; Form-Flags kill: 'gift',
//   lava: true, poison: true – nicht fest, Kamera sieht hindurch). Gegner, die hineingeraten, versinken blubbernd (zählen als
//   besiegt). Oberfläche mit wogenden Schlieren (Shader), optional fließend, aufsteigende Giftblasen.
//   { type: 'giftwasser', id, pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] (Oberfläche bei y + h; Standard
//     [8, 1, 8]), flow: [vx, vz] (m/s, Schlieren und Blasen treiben mit), bubbles: true, color: 'lila' | 'gruen',
//     body: true (dunkler Körper unter der Oberfläche) }
//   Laufzeit: level.named.get(id) = { top, sunk, setLevel(y, speed), start() (rise.to), info() } – rise: { to, speed }.
// giftfall / lavafall – senkrechter Gift- bzw. Lavafall (Vorhang mit nach unten laufenden Schlieren, Gischt/Glut unten).
//   { type: 'giftfall' | 'lavafall', pos: [x, y, z] (Mitte der Unterkante), width: 3, height: 8, yaw: 0 (Vorderseite
//     zeigt nach +Z; Drehung um Y), depth: 0.6, speed: 4 (m/s Fließen), kill: true (Berührung tödlich; false = nur
//     Vorhang, z. B. Geheimgang dahinter), glow: true }
// lavarohr – Glasröhre durch die Lava (glasspipe mit allen Feldern) mit glühendem Saum, wo das Rohr die Lava schneidet,
//   und Hitzeflimmern: { type: 'lavarohr', path, lava: y (Lava-Oberfläche; Standard: tiefster Pfadpunkt + 0,2),
//   …glasspipe-Felder (radius 1, speed 12, coins, cannon, branches, id …) }. Die Lava selbst baut der Level (lava).

import * as THREE from 'three';
import { v3, sz3, lin, addObject, Rnd } from '../kit.js';
import { buildGlassPipe } from './glasspipe.js';
import { glowSprite } from '../w4kit.js';
import { visDt } from '../../entities/gimmick.js';
import { hasModel, getModel } from '../../models/index.js';

const PALETTE = {
  lila: { deep: 0x3a0a5e, mid: 0x8a2ad0, hi: 0xd27aff, foam: 0xf0c8ff, body: 0x2a0844, bubble: 0xc060ff },
  gruen: { deep: 0x1a3a10, mid: 0x5ac02a, hi: 0xc8ff6a, foam: 0xeaffc0, body: 0x10280a, bubble: 0x9aff4a },
  lava: { deep: 0x8a1a06, mid: 0xff5a10, hi: 0xffd040, foam: 0xfff0a0, body: 0x5a1004, bubble: 0xffa030 },
};
const C3 = (h) => new THREE.Color(h);

/** Flüssigkeits-Material (Schlieren im Shader; Standard-Material mit Nebel/Licht). */
function liquidMaterial(pal, opts = {}) {
  const uniforms = {
    uTime: { value: 0 }, uFlow: { value: new THREE.Vector2(opts.flow?.[0] ?? 0, opts.flow?.[1] ?? 0) },
    uDeep: { value: C3(pal.deep) }, uMid: { value: C3(pal.mid) }, uHi: { value: C3(pal.hi) }, uWave: { value: opts.wave ?? 1 },
    uGlow: { value: opts.glow ?? 0.18 },
    uRect: { value: new THREE.Vector4(opts.rect?.[0] ?? 0, opts.rect?.[1] ?? 0, opts.rect?.[2] ?? 1e4, opts.rect?.[3] ?? 1e4) },   // Mitte x, z, halbe Breite, halbe Tiefe
    uFoam: { value: C3(pal.foam) },
  };
  const mat = opts.basic
    ? new THREE.MeshBasicMaterial({ color: 0xffffff })
    : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.05 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'uniform float uTime;\nuniform float uWave;\nvarying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 w4p = modelMatrix * vec4(transformed, 1.0);
      transformed.y += (sin(w4p.x * 1.3 + uTime * 1.7) + cos(w4p.z * 1.1 - uTime * 1.3)) * 0.045 * uWave;
      vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    const pre = 'uniform float uTime;\nuniform vec2 uFlow;\nuniform vec3 uDeep;\nuniform vec3 uMid;\nuniform vec3 uHi;\nuniform float uGlow;\nuniform vec4 uRect;\nuniform vec3 uFoam;\nvarying vec3 vWp;\n';
    let fs = pre + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 w4q = vWp.xz * 0.32 - uFlow * uTime * 0.32;
      float w4n = sin(w4q.x * 2.1 + sin(w4q.y * 1.7 + uTime * 0.55) * 1.7) * 0.5 + sin(w4q.y * 2.4 + sin(w4q.x * 1.4 - uTime * 0.45) * 1.5) * 0.5;
      float w4s = smoothstep(0.42, 0.95, w4n);
      float w4c = smoothstep(0.7, 0.98, sin(w4q.x * 5.3 + w4q.y * 4.1 + uTime * 1.2) * 0.5 + 0.5) * 0.35;
      vec3 w4col = mix(uDeep, uMid, smoothstep(-0.7, 0.45, w4n));
      w4col = mix(w4col, uHi, clamp(w4s * 0.85 + w4c, 0.0, 1.0));
      float w4e = min(uRect.z - abs(vWp.x - uRect.x), uRect.w - abs(vWp.z - uRect.y));
      float w4f = (1.0 - smoothstep(0.05, 0.55 + 0.2 * sin(vWp.x * 3.1 + vWp.z * 2.3 + uTime * 1.4), w4e)) * 0.75;
      w4col = mix(w4col, uFoam, w4f);
      diffuseColor.rgb = w4col;`);
    if (!opts.basic) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += w4col * uGlow + uHi * w4s * 0.25;`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => (opts.basic ? 'w4liquid:basic' : 'w4liquid:std');
  mat.userData.uniforms = uniforms;
  return mat;
}

/** Senkrechter Vorhang-Shader: Schlieren laufen nach unten (uv.y), Gischt unten heller. */
function fallMaterial(pal, speed, lava) {
  const uniforms = { uTime: { value: 0 }, uSpeed: { value: speed }, uDeep: { value: C3(pal.deep) }, uMid: { value: C3(pal.mid) }, uHi: { value: C3(pal.hi) }, uFoam: { value: C3(pal.foam) } };
  const mat = lava ? new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'varying vec2 vW4uv;\nvarying float vW4h;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vW4uv = vec2(position.x, position.y);
      vW4h = uv.y;`);
    let fs = 'uniform float uTime;\nuniform float uSpeed;\nuniform vec3 uDeep;\nuniform vec3 uMid;\nuniform vec3 uHi;\nuniform vec3 uFoam;\nvarying vec2 vW4uv;\nvarying float vW4h;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float w4y = vW4uv.y + uTime * uSpeed;
      float w4a = sin(vW4uv.x * 7.0 + sin(w4y * 0.6) * 0.8) * 0.5 + 0.5;
      float w4b = sin(vW4uv.x * 13.0 - 1.3 + w4y * 0.25) * 0.5 + 0.5;
      float w4st = smoothstep(0.55, 1.0, w4a * 0.7 + w4b * 0.3 + sin(w4y * 2.2 + vW4uv.x * 3.0) * 0.12);
      vec3 w4col = mix(uDeep, uMid, 0.45 + 0.4 * w4a);
      w4col = mix(w4col, uHi, w4st * 0.9);
      w4col = mix(w4col, uFoam, smoothstep(0.16, 0.0, vW4h) * 0.75 + smoothstep(0.92, 1.0, vW4h) * 0.45);
      diffuseColor.rgb = w4col;`);
    if (!lava) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += w4col * 0.28;`);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => (lava ? 'w4fall:lava' : 'w4fall:gift');
  mat.userData.uniforms = uniforms;
  return mat;
}

// ------------------------------------------------------------------ Giftwasser

export function buildGiftwasser(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [8, 1, 8]);
  const pal = PALETTE[spec.color === 'gruen' ? 'gruen' : 'lila'];
  const flow = spec.flow ?? [0, 0];
  let top = p.y + s.y;
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const shape = { type: 'box', min: [x0, p.y - 2, z0], max: [x1, top - 0.12, z1], kill: 'gift', lava: true, poison: true, solid: false, camIgnore: true, tag: 'giftwasser' };
  const sid = level.world.add(shape);
  const sinking = new Map();
  const st = { target: top, speed: 0, sunk: 0 };
  const handle = {
    get top() { return top; }, get sunk() { return st.sunk; }, shape,
    setLevel(y, speed = 1.5) { st.target = Math.max(p.y + 0.1, y); st.speed = speed; if (speed <= 0) setTop(st.target); },
    start() { if (spec.rise) handle.setLevel(spec.rise.to, spec.rise.speed ?? 1.5); },
    info: () => ({ top: +top.toFixed(3), sunk: st.sunk, sinking: sinking.size }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  function setTop(y) {
    top = y;
    shape.max = [x1, top - 0.12, z1];
    level.world.update(sid);
  }
  let burst = null;
  level.onStep((dt) => {
    if (Math.abs(st.target - top) > 1e-6 && st.speed > 0) {
      const d = Math.sign(st.target - top) * Math.min(Math.abs(st.target - top), st.speed * dt);
      setTop(top + d);
    }
    // Gegner versinken (zählen als besiegt)
    for (const e of level.entities) {
      if (!e.enemy || !e.alive || e.removed || e.flying || e.carrier || sinking.has(e)) continue;
      if (e.pos.x < x0 || e.pos.x > x1 || e.pos.z < z0 || e.pos.z > z1) continue;
      if (e.pos.y > top - 0.08 || e.pos.y < p.y - 2) continue;
      sinking.set(e, 0);
      e.touch = false;
      burst?.(e.pos.x, e.pos.z, 5);
      level.sfx('splash');
    }
    for (const [e, t] of sinking) {
      if (e.removed) { sinking.delete(e); continue; }
      const nt = t + dt;
      sinking.set(e, nt);
      e.vel.set(0, 0, 0);
      e.pos.y = Math.min(e.pos.y, top - 0.05) - 1.2 * dt;
      if (nt > 0.7) {
        e.markDefeated?.();
        e.fellOut = true;
        e.kill();
        sinking.delete(e);
        st.sunk++;
      }
    }
  });
  if (!level.view) return handle;
  // Modell der Registry (Textur-Schlieren, Glanz, Blasen; Oberfläche y = 0) – sonst eigener Shader mit Schaumrand
  if (hasModel('giftwasser') && spec.look !== 'shader') {
    const m = getModel('giftwasser', { size: [s.x, s.z], bubbles: spec.bubbles === false ? 0 : undefined });
    const group = new THREE.Group();
    m.root.position.set(p.x, top - 0.03, p.z);
    group.add(m.root);
    if (spec.body !== false && s.y > 0.4) {
      const bh = s.y - 0.2;
      const body = new THREE.Mesh(new THREE.BoxGeometry(s.x - 0.02, bh, s.z - 0.02), new THREE.MeshStandardMaterial({ color: pal.body, roughness: 0.6, emissive: pal.body, emissiveIntensity: 0.35 }));
      body.position.set(p.x, p.y + bh / 2, p.z);
      body.userData.owned = true;
      group.add(body);
    }
    burst = null;
    const holder = {};
    const st2 = { flow: [flow[0] || 0.05, flow[1] || 0.03] };
    level.view.add(group, (dt) => { m.root.position.y = top - 0.03; m.update?.(visDt(level, holder, dt), st2); });
    return handle;
  }
  const group = new THREE.Group();
  const nx = Math.min(64, Math.max(2, Math.round(s.x / 1.4))), nz = Math.min(64, Math.max(2, Math.round(s.z / 1.4)));
  const g = new THREE.PlaneGeometry(s.x, s.z, nx, nz);
  g.rotateX(-Math.PI / 2);
  const mat = liquidMaterial(pal, { flow, rect: [p.x, p.z, s.x / 2, s.z / 2] });
  const surf = new THREE.Mesh(g, mat);
  surf.receiveShadow = true;
  surf.position.set(p.x, top - 0.04, p.z);
  group.add(surf);
  if (spec.body !== false && s.y > 0.4) {
    const bh = s.y - 0.28;   // unter den Wellentälern der Oberfläche
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.x - 0.02, bh, s.z - 0.02), new THREE.MeshStandardMaterial({ color: pal.body, roughness: 0.6, emissive: pal.body, emissiveIntensity: 0.35 }));
    body.position.set(p.x, p.y + bh / 2, p.z);
    group.add(body);
  }
  // Giftblasen: wachsen an der Oberfläche und platzen (eine Instanz-Gruppe je Becken)
  const n = spec.bubbles === false ? 0 : Math.max(4, Math.min(28, Math.round((s.x * s.z) / 7)));
  let bub = null;
  const B = [];
  const rnd = new Rnd((Math.floor(p.x * 31 + p.z * 17) >>> 0) + 7);   // eigene Folge: Darstellung verbraucht nicht level.rnd
  if (n) {
    bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: pal.bubble, roughness: 0.15, metalness: 0.1, emissive: pal.mid, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 }), n);
    bub.frustumCulled = false;
    bub.castShadow = false;
    for (let i = 0; i < n; i++) B.push({ x: x0 + rnd.frac() * s.x, z: z0 + rnd.frac() * s.z, t: rnd.frac() * 2.5, life: 1.4 + rnd.frac() * 1.6, r: 0.12 + rnd.frac() * 0.22 });
    group.add(bub);
    burst = (x, z, k) => { for (let i = 0; i < k; i++) { const b = B[(((i * 7 + Math.floor(x * 3 + z)) % B.length) + B.length) % B.length]; b.x = x + (i - k / 2) * 0.25; b.z = z + ((i * 3) % 5 - 2) * 0.18; b.t = i * 0.08; b.life = 0.8; b.r = 0.2 + i * 0.03; } };
  }
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
  const holder = {};
  let t = 0;
  addObject(level, group, (dt) => {
    const d = visDt(level, holder, dt);
    t += d;
    mat.userData.uniforms.uTime.value = t;
    surf.position.y = top - 0.04;
    if (!bub) return;
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      b.t += d;
      if (b.t > b.life) {
        b.t = 0; b.life = 1.4 + rnd.frac() * 1.6; b.r = 0.12 + rnd.frac() * 0.22;
        b.x = x0 + 0.3 + rnd.frac() * (s.x - 0.6); b.z = z0 + 0.3 + rnd.frac() * (s.z - 0.6);
      }
      b.x += flow[0] * d; b.z += flow[1] * d;
      if (b.x > x1) b.x -= s.x; if (b.x < x0) b.x += s.x; if (b.z > z1) b.z -= s.z; if (b.z < z0) b.z += s.z;
      const k = b.t / b.life;
      const r = b.r * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.5) * (k > 0.92 ? 0 : 1);
      _p.set(b.x, top - 0.05, b.z); _s.set(r, r * 0.8, r);
      _m.compose(_p, _q, _s);
      bub.setMatrixAt(i, _m);
    }
    bub.instanceMatrix.needsUpdate = true;
  });
  return handle;
}

// ------------------------------------------------------------------ Gift-/Lavafall

function buildFall(level, spec, kind) {
  const p = v3(spec.pos);
  const W = spec.width ?? 3, H = spec.height ?? 8, D = spec.depth ?? 0.6, yaw = spec.yaw ?? 0;
  const lava = kind === 'lava';
  const pal = PALETTE[lava ? 'lava' : (spec.color === 'gruen' ? 'gruen' : 'lila')];
  if (spec.kill !== false) {
    // Hüllquader des (gedrehten) Vorhangs
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    const hx = (W / 2) * c + (D / 2) * s, hz = (W / 2) * s + (D / 2) * c;
    level.world.add({ type: 'box', min: [p.x - hx, p.y - 0.5, p.z - hz], max: [p.x + hx, p.y + H, p.z + hz], kill: lava ? 'lava' : 'gift', lava: true, poison: !lava, solid: false, camIgnore: true, tag: `${kind}fall` });
  }
  if (!level.view) return;
  // Modell der Registry ('giftwasserfall' | 'lavafall': Vorhang über einer Felskante, Gischt; Ursprung = Aufprallpunkt,
  // Vorderseite +X) – sonst eigener Shader-Vorhang
  const regName = lava ? 'lavafall' : 'giftwasserfall';
  if (hasModel(regName) && spec.look !== 'shader') {
    const m = getModel(regName, { width: W, height: H });
    m.root.position.set(p.x, p.y, p.z);
    m.root.rotation.y = yaw - Math.PI / 2;
    const holder = {};
    level.view.add(m.root, (dt) => m.update?.(visDt(level, holder, dt), {}));
    return;
  }
  const root = new THREE.Group();
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = yaw;
  // Vorhang: leicht nach vorn gewölbt, oben eine Abbruchkante
  const g = new THREE.PlaneGeometry(W, H, 8, Math.max(4, Math.round(H)));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = (y + H / 2) / H;                     // 0 unten … 1 oben
    pos.setZ(i, Math.sin(u * Math.PI) * 0.18 + (u > 0.92 ? (u - 0.92) * 4 : 0) - Math.abs(x / W) * 0.12);
    pos.setY(i, y + H / 2);
  }
  g.computeVertexNormals();
  const mat = fallMaterial(pal, spec.speed ?? 4, lava);
  const sheet = new THREE.Mesh(g, mat);
  sheet.renderOrder = 1;
  root.add(sheet);
  if (spec.glow !== false) {
    const gl = glowSprite(pal.hi, W * 1.4, lava ? 0.75 : 0.5);
    gl.position.set(0, 0.4, 0.3);
    root.add(gl);
    if (lava) { const g2 = glowSprite(0xff7a20, W * 1.1, 0.45); g2.position.set(0, H * 0.55, 0.4); g2.scale.set(W * 1.4, H * 1.1, 1); root.add(g2); }
  }
  const holder = {};
  let t = 0;
  addObject(level, root, (dt) => { t += visDt(level, holder, dt); mat.userData.uniforms.uTime.value = t; });
}

// ------------------------------------------------------------------ Glasrohr durch die Lava

export function buildLavarohr(level, spec) {
  const res = buildGlassPipe(level, { ...spec, type: 'glasspipe' });
  if (!level.view) return res;
  const P = (spec.path ?? []).map((q) => new THREE.Vector3(q[0], q[1], q[2]));
  if (P.length < 2) return res;
  const R = spec.radius ?? 1;
  const lavaY = spec.lava ?? Math.min(...P.map((q) => q.y)) + 0.2;
  const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P, false, 'centripetal') : new THREE.LineCurve3(P[0], P[1]);
  const L = curve.getLength();
  const n = Math.max(2, Math.ceil(L / 0.5));
  // Glutsaum: Band beiderseits des Rohrs auf der Lava-Oberfläche, wo das Rohr sie schneidet
  const pos = [], col = [];
  const hot = lin(0xffb040), warm = lin(0x401004);
  const q = new THREE.Vector3(), tg = new THREE.Vector3();
  let prev = null;
  for (let i = 0; i <= n; i++) {
    curve.getPointAt(i / n, q); curve.getTangentAt(i / n, tg);
    const dy = lavaY - q.y;
    if (Math.abs(dy) >= R * 0.98) { prev = null; continue; }
    const hw = Math.sqrt(R * R - dy * dy);
    const sx = -tg.z, sz = tg.x, sl = Math.hypot(sx, sz) || 1;
    const cur = [];
    for (const side of [-1, 1]) {
      const ix = q.x + (sx / sl) * hw * side, iz = q.z + (sz / sl) * hw * side;
      const ox = ix + (sx / sl) * 0.32 * side, oz = iz + (sz / sl) * 0.32 * side;
      cur.push([ix, iz, ox, oz]);
    }
    if (prev) {
      for (let k = 0; k < 2; k++) {
        const [a0x, a0z, b0x, b0z] = prev[k], [a1x, a1z, b1x, b1z] = cur[k];
        const y = lavaY + 0.03;
        pos.push(a0x, y, a0z, a1x, y, a1z, b1x, y, b1z, a0x, y, a0z, b1x, y, b1z, b0x, y, b0z);
        for (const c of [hot, hot, warm, hot, warm, warm]) col.push(c[0], c[1], c[2]);
      }
    }
    prev = cur;
  }
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 3;
    const holder = {};
    let t = 0;
    addObject(level, m, (dt) => { t += visDt(level, holder, dt); m.material.opacity = 0.55 + 0.2 * Math.sin(t * 3.1); });
  }
  // Hitzeflimmern/Glut über dem Rohr (einige Leuchtpunkte)
  const glows = new THREE.Group();
  for (let i = 1; i < 6; i++) {
    curve.getPointAt(i / 6, q);
    if (q.y > lavaY + R) continue;
    const s = glowSprite(0xff8a30, 2.6, 0.35);
    s.position.set(q.x, lavaY + 0.5, q.z);
    glows.add(s);
  }
  if (glows.children.length) {
    const holder = {};
    let t = 0;
    addObject(level, glows, (dt) => { t += visDt(level, holder, dt); glows.children.forEach((s, i) => { s.material.opacity = 0.25 + 0.15 * Math.sin(t * 2 + i * 1.7); }); });
  }
  return res;
}

export const TYPES = {
  giftwasser: buildGiftwasser,
  giftfall: (level, spec) => buildFall(level, spec, 'gift'),
  lavafall: (level, spec) => buildFall(level, spec, 'lava'),
  lavarohr: buildLavarohr,
};
