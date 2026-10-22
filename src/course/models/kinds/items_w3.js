// Items und Power-ups Welt 3 (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Ursprung = Fußpunkt (schwebende
// Items: Unterkante des Schwebebereichs), Blick nach +X; state darf ein String sein.
// Licht-Kasten (3-3) und Propeller-Helm (3-1) kommen aus Welt 2: 'helm_licht', 'helm_propeller'.
//
// schlittschuhe       ≈0,6 m  Paar Eis-Schlittschuhe (Power-up/Item): himmelblaue Stiefel mit weißem Plüschrand und
//                     Schnürung, Silberkufen mit eingerollter Spitze, rote Bommel; schwebt, dreht sich, funkelt.
//                     state { anim: 'idle'|'collected' }  collected: hüpft hoch und schrumpft (0,35 s).
// schneeball          rollbarer Schneeball (Ø opts.size, Standard 1 m), klumpige Oberfläche mit blaugrauen Sprenkeln
//                     (Drehung sichtbar). Ursprung = Auflagepunkt (Mitte bei y = size/2).
//                     opts  { size (Durchmesser) }
//                     state { anim: 'idle'|'roll'|'break', roll (rad, Rollwinkel um die Querachse; positiv = rollt nach
//                             +X), size? (Durchmesser, überschreibt opts.size → Ball wächst; weich nachgeführt) }
//                     break: zerplatzt in Schneebrocken (0,8 s), danach unsichtbar.
// powerup_gleitblatt  ≈0,85 m  Gleitblatt: großes Fächerblatt (Ginkgo-Form) von Lindgrün nach Gold, Adern, gebogener
//                     Stiel; segelt sacht hin und her.  state { anim: 'idle' }

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, makeModel, Clock, clamp, mix, smoothstep, sparkleSprite, smoothNormals,
} from '../lib/kit.js';
import { Puffs } from '../lib/kit_w3.js';

function floater(root, y0, rate = 1.6, amp = 0.06) {
  const spin = joint([0, y0, 0]);
  root.add(spin);
  return { spin, step(t, r = rate) { spin.rotation.y = t * r; spin.position.y = y0 + Math.sin(t * 2.4) * amp; } };
}
const twinkle = (sp, t, phase, size) => {
  const k = Math.pow(Math.max(0, Math.sin(t * 2.2 + phase)), 6);
  sp.scale.setScalar(Math.max(0.001, k * size));
  sp.visible = k > 0.03;
};

// =============================================================================================
// Schlittschuhe
// =============================================================================================
const SKI = { boot: 0x4fb0ff, bootHi: 0x9ad8ff, fluff: 0xffffff, lace: 0xffffff, blade: 0xe6edf8, pom: 0xff3a5a, sole: 0x2a6ad8 };
function skatePairGeo() {
  return cached('w3:item:skates', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      const z = s * 0.13, x0 = s * 0.03;
      const boot = { v: (x, y, zz, nx, ny) => mix(SKI.boot, SKI.bootHi, smoothstep(ny * 0.5 + nx * 0.3 + 0.3)) };
      b.sphere(1, boot, { p: [x0 + 0.05, 0.12, z], s: [0.19, 0.1, 0.1] }, 18, 12);
      b.cyl(0.095, 0.1, 0.22, boot, { p: [x0 - 0.04, 0.24, z] }, 16);
      b.sphere(1, SKI.sole, { p: [x0 - 0.04, 0.035, z], s: [0.13, 0.025, 0.085] }, 12, 6);
      b.torus(0.1, 0.04, SKI.fluff, { p: [x0 - 0.04, 0.35, z], r: [Math.PI / 2, 0, 0] }, 8, 16);
      for (let i = 0; i < 4; i++) b.box(0.014, 0.014, 0.13, SKI.lace, { p: [x0 + 0.1 - i * 0.04, 0.16 + i * 0.045, z], r: [0, 0, 0.6] }, 0, 1);
      // Bommel an den Schnürsenkeln
      b.sphere(0.04, SKI.pom, { p: [x0 + 0.06, 0.33, z + s * 0.06] }, 10, 8);
      // Kufe mit Stützen und eingerollter Spitze
      b.box(0.44, 0.03, 0.03, SKI.blade, { p: [x0 + 0.04, -0.03, z] }, 0.01, 1);
      for (const x of [-0.08, 0.14]) b.box(0.03, 0.06, 0.028, SKI.blade, { p: [x0 + x, 0.0, z] }, 0.008, 1);
      b.torus(0.045, 0.014, SKI.blade, { p: [x0 + 0.26, 0.0, z], r: [0, 0, -0.7] }, 6, 14, Math.PI * 1.35);
    }
    return b.geometry();
  });
}
function buildSchlittschuhe() {
  const root = new THREE.Group();
  const f = floater(root, 0.32, 1.7, 0.06);
  const pair = mesh(skatePairGeo(), vcol(0.22, { metalness: 0.1 }, 'w3skates'), { r: [0, 0, 0.18], s: 1.15 }, true);
  f.spin.add(pair);
  const sp = sparkleSprite(0xffffff, 0.35); sp.position.set(0.22, 0.75, 0.15);
  const sp2 = sparkleSprite(0xbfe8ff, 0.25); sp2.position.set(-0.2, 0.35, -0.2);
  root.add(sp, sp2);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    f.step(clk.t);
    twinkle(sp, clk.t, 0, 0.4); twinkle(sp2, clk.t, 2, 0.3);
    if (anim === 'collected') {
      const k = Math.min(1, clk.age / 0.35);
      f.spin.position.y += Math.sin(k * Math.PI * 0.6) * 0.8;
      f.spin.scale.setScalar(Math.max(0.001, 1 - k * k));
      f.spin.rotation.y += clk.age * 20;
    } else f.spin.scale.setScalar(1);
  };
  return makeModel('schlittschuhe', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Schneeball
// =============================================================================================
function snowballGeo() {
  return cached('w3:snowball', () => {
    const g = new THREE.IcosahedronGeometry(0.5, 4);
    const P = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      const n = 1 + 0.035 * Math.sin(v.x * 17 + 1.3) * Math.sin(v.y * 15 + 0.4) + 0.03 * Math.sin(v.z * 19 + v.x * 7) + 0.02 * Math.sin(v.y * 31);
      v.multiplyScalar(n); P.setXYZ(i, v.x, v.y, v.z);
    }
    const b = new Build();
    const fleck = (x, y, z) => Math.sin(x * 23 + 1) * Math.sin(y * 21 + 2) * Math.sin(z * 25 + 0.5);
    b.add(smoothNormals(g), { v: (x, y, z, nx, ny) => {
      const base = mix(0xc4d6ee, 0xffffff, smoothstep(ny * 0.7 + 0.55));
      const f = fleck(x, y, z);
      return f > 0.45 ? base.lerp(new THREE.Color(0x9fb6d6), smoothstep((f - 0.45) / 0.2)) : base;
    } }, { p: [0, 0.5, 0] });
    return b.geometry();
  });
}
function buildSchneeball(opts = {}) {
  const size0 = clamp(Number(opts.size ?? 1), 0.2, 8);
  const root = new THREE.Group();
  const scaleJ = joint();
  const spin = joint([0, 0.5, 0]);
  const ball = mesh(snowballGeo(), vcol(0.75, {}, 'w3snowball'), { p: [0, -0.5, 0] }, true);
  ball.receiveShadow = true;
  spin.add(ball);
  scaleJ.add(spin);
  const chunks = new Puffs(14, 0xffffff, { opacity: 1, radius: 4, cy: 1, detail: 0 });
  chunks.gravity = 9;
  chunks.mat.roughness = 0.8; chunks.mat.transparent = false; chunks.mat.depthWrite = true;
  chunks.mesh.castShadow = true;
  root.add(scaleJ, chunks.mesh);
  const clk = new Clock();
  let size = size0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const target = clamp(Number(st.size ?? size0), 0.2, 8);
    size += (target - size) * (1 - Math.exp(-8 * dt));
    if (Math.abs(size - target) < 1e-3) size = target;
    scaleJ.scale.setScalar(size);
    spin.rotation.z = -(st.roll ?? 0);
    const br = anim === 'break';
    if (clk.entered && br) chunks.burst([0, size * 0.5, 0], { count: 14, speed: 3 * Math.sqrt(size), up: 3, size: 0.16 * size, life: 0.8, spread: size * 0.35, grow: 0.3, force: true });
    scaleJ.visible = !br;
    chunks.step(dt);
  };
  return makeModel('schneeball', root, update, [chunks], { initial: 'idle' });
}

// =============================================================================================
// Gleitblatt
// =============================================================================================
function leafGeo() {
  return cached('w3:leaf', () => {
    const b = new Build();
    // Fächerblatt: Stielansatz unten (0,0), Fächer nach oben, Kerbe in der Mitte des Randes
    const s = new THREE.Shape();
    const R = 0.36;
    s.moveTo(0, 0);
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (0.13 + 0.74 * (i / 20));
      const notch = 1 - 0.22 * Math.exp(-Math.pow((i / 20 - 0.5) / 0.06, 2));
      const wav = 1 + 0.03 * Math.sin(i * 1.7);
      pts.push([Math.cos(a) * R * notch * wav, Math.sin(a) * R * notch * wav + 0.05]);
    }
    s.lineTo(pts[0][0] * 0.4, pts[0][1] * 0.4);
    for (const [x, y] of pts) s.lineTo(x, y);
    s.lineTo(pts[20][0] * 0.4, pts[20][1] * 0.4);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -0.01);
    // leicht gewölbt (Schale)
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, P.getZ(i) + x * x * 0.9 - y * 0.08); }
    g.computeVertexNormals();
    b.add(g, { v: (x, y) => mix(0x7ad83a, 0xffc61a, smoothstep((Math.hypot(x, y) - 0.12) / 0.26)) }, { p: [0, 0.18, 0] });
    // Adern
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.2 + 0.6 * (i / 6));
      const len = 0.27;
      b.box(0.012, len, 0.01, 0xd8a010, { p: [Math.cos(a) * len * 0.55, 0.2 + Math.sin(a) * len * 0.55 + 0.02, 0.022 + Math.cos(a) * Math.cos(a) * 0.04], r: [0, 0, a - Math.PI / 2] }, 0, 1);
    }
    // gebogener Stiel
    b.tube([[0, 0.19, 0], [0.01, 0.1, 0.0], [0.05, 0.03, 0.0], [0.1, 0.0, 0.0]], 0.018, 0x6a9a2a, null, 12, 6);
    return b.geometry();
  });
}
function buildGleitblatt() {
  const root = new THREE.Group();
  const sway = joint([0, 0.2, 0]);
  const leaf = mesh(leafGeo(), vcol(0.35, { side: THREE.DoubleSide }, 'w3leaf'), { r: [0, Math.PI / 2, 0], s: 1.35 }, true);
  sway.add(leaf);
  const sp = sparkleSprite(0xffffff, 0.3); sp.position.set(0.1, 0.75, 0.2);
  root.add(sway, sp);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, st.anim ?? 'idle');
    const t = clk.t;
    // segelt wie ein fallendes Blatt: Pendeln, Kippen, Wippen
    sway.position.set(Math.sin(t * 1.3) * 0.08, 0.2 + Math.abs(Math.cos(t * 1.3)) * 0.08, 0);
    sway.rotation.set(Math.sin(t * 1.3) * 0.35, t * 0.8, Math.sin(t * 2.6) * 0.12);
    twinkle(sp, t, 1, 0.35);
  };
  return makeModel('powerup_gleitblatt', root, update, [], { initial: 'idle' });
}

export const MODELS = {
  schlittschuhe: buildSchlittschuhe,
  schneeball: buildSchneeball,
  powerup_gleitblatt: buildGleitblatt,
};
