// Einfache eigene Darstellungen für Items und Blöcke des Kurs-Modus – Rückfall, solange der Modell-Agent
// (src/course/models/kinds/) die Namen noch nicht liefert. Jede Funktion `model(name, opts)` nimmt das
// Registry-Modell, wenn hasModel(name), sonst die Vorlage hier. Form: { root, update(dt, state), dispose }.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X.
//
// Vorlagen (für InstancePools): coinTemplate(), blockTemplate(kind) mit kind ∈ question|brick|used|crystal.

import * as THREE from 'three';
import { hasModel, getModel } from '../models/index.js';
import { roundedBox, colorize, lin, mixc, smooth, SIDE } from '../../three/world/geometry.js';

const TAU = Math.PI * 2;
const cache = new Map();
const once = (key, make) => { let v = cache.get(key); if (!v) { v = make(); cache.set(key, v); } return v; };

function canvasTex(key, w, h, draw) {
  return once(`tex:${key}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/** Registry-Modell oder eigene Vorlage. */
export function model(name, fallback, opts = {}) {
  if (hasModel(name)) return getModel(name, opts);
  return fallback(opts);
}

// ------------------------------------------------------------------ Münze (Bitcoin, orange mit ₿)

function btc(ctx, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(-1.0, 2.3);
  ctx.moveTo(-1.0, -2.3); ctx.lineTo(0.3, -2.3);
  ctx.arc(0.3, -1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 0);
  ctx.moveTo(-1.0, 0); ctx.lineTo(0.55, 0);
  ctx.arc(0.55, 1.15, 1.15, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-1.0, 2.3);
  for (const x of [-0.35, 0.55]) { ctx.moveTo(x, -3.0); ctx.lineTo(x, -2.3); ctx.moveTo(x, 2.3); ctx.lineTo(x, 3.0); }
  ctx.stroke();
}

export function coinTemplate() {
  const body = once('coin:body', () => {
    const prof = [[0, 0.055], [0.29, 0.055], [0.32, 0.068], [0.36, 0.07], [0.385, 0.055], [0.4, 0.025], [0.4, -0.025], [0.385, -0.055], [0.36, -0.07], [0.32, -0.068], [0.29, -0.055], [0, -0.055]];
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 18);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const faces = once('coin:faces', () => {
    const a = new THREE.CircleGeometry(0.3, 18); a.translate(0, 0, 0.057);
    const b = new THREE.CircleGeometry(0.3, 18); b.rotateY(Math.PI); b.translate(0, 0, -0.057);
    const g = new THREE.BufferGeometry();
    const merge = (geos) => {
      const pos = [], nor = [], uv = [];
      for (const x of geos) { const ni = x.toNonIndexed(); pos.push(...ni.attributes.position.array); nor.push(...ni.attributes.normal.array); uv.push(...ni.attributes.uv.array); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    };
    merge([a, b]);
    return g;
  });
  const tex = canvasTex('coin', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f7931a'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(0.2); ctx.scale(w * 0.105, w * 0.105);
    ctx.save(); ctx.translate(0.17, 0.17); btc(ctx, 'rgba(110,50,0,0.6)', 0.95); ctx.restore();
    btc(ctx, '#fff8ee', 0.95);
    ctx.restore();
  });
  const bodyMat = once('coin:bodyMat', () => new THREE.MeshStandardMaterial({ color: 0xf7931a, metalness: 0.45, roughness: 0.3, emissive: 0x3a1a00 }));
  const faceMat = once('coin:faceMat', () => new THREE.MeshStandardMaterial({ map: tex, metalness: 0.3, roughness: 0.35, emissive: 0x2a1200, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const root = new THREE.Group();
  const m1 = new THREE.Mesh(body, bodyMat); m1.position.y = 0.42;
  const m2 = new THREE.Mesh(faces, faceMat); m2.position.y = 0.42;
  root.add(m1, m2);
  return root;
}

// ------------------------------------------------------------------ Blöcke

const BLOCK = {
  question: { body: 0xffc62a, edge: 0xe08a12, decal: 'question' },
  brick: { body: 0xd8743a, edge: 0x9a4a1e, decal: 'brick' },
  used: { body: 0xb98a5e, edge: 0x7c5634, decal: 'rivets' },
  crystal: { body: 0x9fe8ff, edge: 0x58b8e8, decal: 'crystal' },
  coinblock: { body: 0xffc62a, edge: 0xe08a12, decal: 'coin' },
};

function decalTexture(kind) {
  return canvasTex(`decal:${kind}`, 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    if (kind === 'question' || kind === 'coin') {
      ctx.font = 'bold 92px Arial Rounded MT Bold, Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const s = kind === 'coin' ? '₿' : '?';
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(140,70,0,0.9)'; ctx.strokeText(s, w / 2 + 3, h / 2 + 8);
      ctx.fillStyle = '#ffffff'; ctx.fillText(s, w / 2, h / 2 + 4);
      ctx.fillStyle = 'rgba(150,80,10,0.8)';
      for (const [x, y] of [[14, 14], [114, 14], [14, 114], [114, 114]]) { ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); }
    } else if (kind === 'brick') {
      ctx.strokeStyle = 'rgba(90,30,10,0.85)'; ctx.lineWidth = 6;
      for (let r = 0; r < 4; r++) {
        const y = r * 32;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        const off = r % 2 ? 0 : 32;
        for (let x = off; x <= w; x += 64) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(255,220,180,0.35)';
      for (let r = 0; r < 4; r++) ctx.fillRect(0, r * 32 + 4, w, 4);
    } else if (kind === 'rivets') {
      ctx.fillStyle = 'rgba(80,50,25,0.9)';
      for (const [x, y] of [[20, 20], [108, 20], [20, 108], [108, 108]]) { ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); }
    } else if (kind === 'crystal') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(30, 98); ctx.lineTo(64, 30); ctx.lineTo(98, 98); ctx.moveTo(44, 70); ctx.lineTo(84, 70); ctx.stroke();
    }
  });
}

/** Sechs Abziehbild-Flächen eines 1-m-Würfels (knapp außerhalb), mit UVs. */
function decalGeo() {
  return once('decalGeo', () => {
    const parts = [];
    const d = 0.503;
    const add = (rx, ry, x, y, z) => { const g = new THREE.PlaneGeometry(0.9, 0.9); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); parts.push(g.toNonIndexed()); };
    add(0, 0, 0, 0.5, d); add(0, Math.PI, 0, 0.5, -d); add(0, Math.PI / 2, d, 0.5, 0); add(0, -Math.PI / 2, -d, 0.5, 0);
    add(-Math.PI / 2, 0, 0, 0.5 + d, 0); add(Math.PI / 2, 0, 0, 0.5 - d, 0);
    const pos = [], nor = [], uv = [];
    for (const g of parts) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  });
}

/** Block-Vorlage (1 m Würfel, Fußpunkt unten Mitte): runder Körper + Abziehbilder. */
export function blockTemplate(kind) {
  const name = { question: 'question_block', brick: 'brick_block', used: 'used_block', crystal: 'crystal_block', coinblock: 'question_block' }[kind];
  if (name && hasModel(name)) return getModel(name, { kind }).root;
  const st = BLOCK[kind] ?? BLOCK.used;
  const body = once(`block:${kind}`, () => {
    const g = roundedBox(0.98, 0.98, 0.98, 0.1, SIDE.ALL, 0, 2);
    const base = lin(st.body), edge = lin(st.edge), light = mixc(base, [1, 1, 1], 0.3, [0, 0, 0]);
    colorize(g, (p, n, o) => {
      const flat = Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z));
      mixc(edge, base, smooth(0.8, 0.98, flat), o);
      if (n.y > 0.9) mixc(o, light, 0.4, o);
    });
    g.translate(0, 0.5, 0);
    return g;
  });
  const crystal = kind === 'crystal';
  const bodyMat = once(`blockMat:${crystal}`, () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: crystal ? 0.15 : 0.55, metalness: 0, transparent: crystal, opacity: crystal ? 0.85 : 1 }));
  const decalMat = once(`decalMat:${st.decal}`, () => new THREE.MeshStandardMaterial({ map: decalTexture(st.decal), transparent: true, alphaTest: 0.2, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const root = new THREE.Group();
  root.add(new THREE.Mesh(body, bodyMat), new THREE.Mesh(decalGeo(), decalMat));
  return root;
}

// ------------------------------------------------------------------ Grüner Stern

function starGeo(r1 = 0.5, r0 = 0.24, depth = 0.22) {
  return once(`starGeo:${r1}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? r0 : r1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    return g;
  });
}

export function starModel(opts = {}) {
  return model('star', () => {
    const root = new THREE.Group();
    const spin = new THREE.Group();
    spin.position.y = 0.6;
    const mat = new THREE.MeshStandardMaterial({ color: opts.ghost ? 0x9fe0b0 : 0x3ee05a, emissive: 0x0e5a1a, roughness: 0.25, metalness: 0.1, transparent: !!opts.ghost, opacity: opts.ghost ? 0.45 : 1 });
    const m = new THREE.Mesh(starGeo(), mat);
    m.castShadow = !opts.ghost;
    spin.add(m);
    // Augen (eigene Figur, freundlich)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x163a1c });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.07, 2, 6), eyeMat); e.position.set(s * 0.08, 0.03, 0.2); spin.add(e); }
    root.add(spin);
    let t = Math.random() * TAU;
    return {
      root,
      update(dt) { t += dt; spin.rotation.y = t * 1.8; spin.position.y = 0.6 + Math.sin(t * 2.4) * 0.08; },
      dispose() { mat.dispose(); eyeMat.dispose(); spin.children.forEach((c) => { if (c.geometry !== starGeo()) c.geometry.dispose(); }); },
    };
  }, opts);
}

// ------------------------------------------------------------------ Stempel (Medaille mit Pfote)

export function stampModel(opts = {}) {
  return model('stamp', () => {
    const root = new THREE.Group();
    const spin = new THREE.Group();
    spin.position.y = 0.6;
    const tex = canvasTex('stamp', 128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#ff7ab8'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff4fa'; ctx.beginPath(); ctx.arc(64, 64, 50, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8438c';
      ctx.beginPath(); ctx.ellipse(64, 78, 20, 16, 0, 0, TAU); ctx.fill();
      for (const [x, y] of [[38, 54], [54, 40], [74, 40], [90, 54]]) { ctx.beginPath(); ctx.ellipse(x, y, 8, 10, 0, 0, TAU); ctx.fill(); }
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, transparent: !!opts.ghost, opacity: opts.ghost ? 0.45 : 1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.6, roughness: 0.3, transparent: !!opts.ghost, opacity: opts.ghost ? 0.45 : 1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 28).rotateX(Math.PI / 2), [rimMat, faceMat, faceMat]);
    body.castShadow = !opts.ghost;
    spin.add(body);
    root.add(spin);
    let t = Math.random() * TAU;
    return {
      root,
      update(dt) { t += dt; spin.rotation.y = t * 1.6; spin.position.y = 0.6 + Math.sin(t * 2) * 0.07; },
      dispose() { body.geometry.dispose(); faceMat.dispose(); rimMat.dispose(); },
    };
  }, opts);
}

// ------------------------------------------------------------------ Checkpoint-Fahne

export function checkpointModel(opts = {}) {
  return model('checkpoint_flag', () => {
    const root = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 10), poleMat);
    pole.position.y = 1.2; pole.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.5, roughness: 0.3 }));
    knob.position.y = 2.45;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.18, 16), new THREE.MeshStandardMaterial({ color: 0x8b8f9c, roughness: 0.7 }));
    base.position.y = 0.09; base.receiveShadow = true;
    const flagGeo = new THREE.PlaneGeometry(0.9, 0.6, 6, 2);
    flagGeo.translate(0.45, 0, 0);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xd8dbe4, roughness: 0.6, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.06, 2.0, 0); flag.castShadow = true;
    root.add(pole, knob, base, flag);
    const pos = flagGeo.attributes.position, basePos = Float32Array.from(pos.array);
    let t = Math.random() * 3, on = 0;
    return {
      root,
      update(dt, state) {
        t += dt;
        on = Math.min(1, on + (state.active ? dt * 3 : -on));
        flagMat.color.setHex(state.active ? 0x4fd04a : 0xd8dbe4);
        flag.position.y = 1.2 + 0.8 * (state.active ? on : 0) + (state.active ? 0 : 0);
        for (let i = 0; i < pos.count; i++) { const x = basePos[i * 3]; pos.array[i * 3 + 2] = Math.sin(x * 4 - t * 6) * 0.06 * x; }
        pos.needsUpdate = true;
      },
      dispose() { pole.geometry.dispose(); poleMat.dispose(); flagGeo.dispose(); flagMat.dispose(); knob.geometry.dispose(); base.geometry.dispose(); },
    };
  }, opts);
}

// ------------------------------------------------------------------ Zielmast

export function goalModel(opts = {}) {
  const H = opts.height ?? 9;
  return model('goal_pole', () => {
    const root = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0xd9dbe3, roughness: 0.6 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), stone);
    base.position.y = 0.5; base.castShadow = true; base.receiveShadow = true;
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0x222222 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, H, 12), poleMat);
    pole.position.y = 1 + H / 2; pole.castShadow = true;
    // Ringe im Wechsel (gut lesbare Höhe)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xff4a3d, roughness: 0.4 });
    const rings = [];
    for (let i = 1; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 14), ringMat); r.rotation.x = Math.PI / 2; r.position.y = 1 + (H * i) / 5; root.add(r); rings.push(r); }
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10), new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.6, roughness: 0.25, emissive: 0x3a2600 }));
    top.position.y = 1 + H + 0.2; top.castShadow = true;
    const flagGeo = new THREE.PlaneGeometry(1.5, 1.0, 6, 2);
    flagGeo.translate(-0.78, 0, 0);
    const tex = canvasTex('goalflag', 128, 96, (ctx, w, h) => {
      ctx.fillStyle = '#ff4a3d'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(w * 0.45, h / 2, h * 0.32, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3ee05a';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 9 : 22; const x = w * 0.45 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fill();
    });
    const flagMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.castShadow = true;
    root.add(base, pole, top, flag);
    const pos = flagGeo.attributes.position, basePos = Float32Array.from(pos.array);
    let t = 0;
    return {
      root,
      update(dt, state) {
        t += dt;
        flag.position.y = 1 + 0.6 + (H - 1.2) * (state.flag ?? 1);
        for (let i = 0; i < pos.count; i++) { const x = basePos[i * 3]; pos.array[i * 3 + 2] = Math.sin(x * 3 + t * 6) * 0.07 * x; }
        pos.needsUpdate = true;
      },
      dispose() { for (const o of [base, pole, top, flag, ...rings]) o.geometry.dispose(); stone.dispose(); poleMat.dispose(); ringMat.dispose(); flagMat.dispose(); },
    };
  }, opts);
}

// ------------------------------------------------------------------ Power-ups

const POWER_MODEL = { wachstumsbeere: 'powerup_wachstumsbeere', krallen: 'powerup_krallen', funken: 'powerup_funken', riese: 'powerup_riese', stern: 'powerup_stern', oneup: 'oneup' };

export function powerupModel(power, opts = {}) {
  const name = POWER_MODEL[power] ?? `powerup_${power}`;
  return model(name, () => {
    const root = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.y = 0.42;
    root.add(inner);
    const geos = [], mats = [];
    const add = (g, color, o = {}) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.35, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000 });
      const me = new THREE.Mesh(g, m);
      me.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
      if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz; if (o.ry) me.rotation.y = o.ry;
      if (o.sx) me.scale.set(o.sx, o.sy ?? o.sx, o.sz ?? o.sx);
      me.castShadow = true;
      inner.add(me); geos.push(g); mats.push(m);
      return me;
    };
    switch (power) {
      case 'wachstumsbeere': case 'oneup': {
        const col = power === 'oneup' ? 0x3ee05a : 0xff3a5a;
        add(new THREE.SphereGeometry(0.34, 16, 12), col, { emissive: power === 'oneup' ? 0x0a3a10 : 0x3a0a10 });
        for (const [x, z] of [[0.12, 0.25], [-0.15, 0.22], [0.2, -0.05]]) add(new THREE.SphereGeometry(0.05, 8, 6), 0xffffff, { x, y: 0.1, z });
        add(new THREE.ConeGeometry(0.16, 0.18, 5), 0x3f9a2a, { y: 0.36 });
        if (power === 'oneup') add(new THREE.TorusGeometry(0.16, 0.035, 6, 16), 0xffffff, { y: 0, z: 0.34 });
        break;
      }
      case 'krallen': {
        add(new THREE.SphereGeometry(0.32, 16, 12), 0xffb52e, { sy: 0.85 });
        for (const a of [-0.5, 0, 0.5]) add(new THREE.ConeGeometry(0.06, 0.24, 6), 0xffffff, { x: 0.3 * Math.cos(a), y: 0.18, z: 0.3 * Math.sin(a), rz: -0.6 });
        add(new THREE.SphereGeometry(0.11, 10, 8), 0xff8fb0, { x: 0.27, y: -0.03 });
        break;
      }
      case 'funken': {
        add(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 6), 0x3f9a2a, { y: -0.2 });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; add(new THREE.SphereGeometry(0.13, 8, 6), 0xff5a2a, { x: Math.cos(a) * 0.17, y: 0.05, z: Math.sin(a) * 0.17, sy: 0.6 }); }
        add(new THREE.SphereGeometry(0.11, 10, 8), 0xffe066, { y: 0.07, emissive: 0x553300 });
        break;
      }
      case 'riese': {
        add(new THREE.SphereGeometry(0.3, 16, 12), 0xc04cff, { y: -0.05, rough: 0.15, emissive: 0x200030 });
        add(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 10), 0xd9c9ff, { y: 0.3 });
        add(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), 0x8a5a36, { y: 0.45 });
        break;
      }
      case 'stern': default: {
        add(starGeo(0.42, 0.2, 0.16), 0xfff04a, { emissive: 0x6a5a00, metal: 0.2 });
        break;
      }
    }
    let t = Math.random() * TAU;
    return {
      root,
      update(dt) { t += dt; inner.rotation.y = t * 1.5; inner.position.y = 0.42 + Math.sin(t * 3) * 0.04; },
      dispose() { for (const g of geos) if (g !== starGeo(0.42, 0.2, 0.16)) g.dispose(); for (const m of mats) m.dispose(); },
    };
  }, opts);
}
