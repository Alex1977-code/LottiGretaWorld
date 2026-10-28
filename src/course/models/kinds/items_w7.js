// Power-up Welt 7 „Lava-Festung“: Wurfsichel (Bumerang-Power-up, sammelt Münzen ein). Eigene Gestaltung: goldener
// Halbmond mit türkisem Innenband, roten Spitzenkappen und einer Blüten-Nabe (fünf weiße Blütenblätter mit rosa Rand,
// gelbe Mitte). Maßstab Meter, Blick +X; state darf ein String sein. progress (0..1) überschreibt bei Einmal-Animationen die
// Zeit seit dem Zustandswechsel.
//
// wurfsichel_item     ≈0,7 m breit  Wurfsichel zum Einsammeln: schwebt ≈0,55 m über dem Fußpunkt (Ursprung = Boden), dreht
//   sich aufrecht um die Hochachse, wippt, goldener Schein und Funkeln.
//   state { anim: 'idle'|'collected', progress? (collected: 0,5 s – wirbelt hoch, schrumpft, Funkeln; danach unsichtbar) }
// wurfsichel_geschoss ≈0,6 m  geworfene Wurfsichel: liegt flach (Fläche nach oben) und kreiselt um die Hochachse, goldener
//   Wirbel-Schein. **Ursprung = Mitte.**
//   state { anim: 'spin'|'idle', spin? (Drehwinkel in rad, überschreibt; sonst ≈ 3 U/s bei 'spin'), speed? (rad/s) }
// wurfsichel_kostuem  Kostüm-Vorlage für die Figuren (nur Geometrie/Material; der Figuren-Agent übernimmt sie):
//   opts  { part: 'muetze' (Standard) | 'umhang', size (Kopfbreite in m, 0,5) }
//     muetze: türkise Schirmmütze mit Goldband, rosa Bommel hinten und goldener Halbmond-Sichel als Kamm vorn oben (+X).
//             **Ursprung = Kopfmitte**, Breite ≈ 1,1·size, sitzt auf der oberen Kopfhälfte.
//     umhang: kurzes türkises Cape (innen rosa, Goldsaum) mit Sichel-Schließe. **Ursprung = Halsansatz (vorn oben)**, hängt
//             hinter der Figur (−X) bis ≈ 1,4·size herab.
//   state { anim: 'idle', wind (0..1: Umhang weht nach hinten), bob? (0..1 Bommel wippt, Standard 1) }
//   root.userData.parts → { cap, crest } bzw. { cape, clasp } (Meshes zum Übernehmen).

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, lerp, glowSprite,
  sparkleSprite,
} from '../lib/kit.js';
import { W7, SICHEL, sichelGeo, sichelMat, prog, num, gradV, ownMat } from '../lib/w7Geos.js';

// =============================================================================================
// Wurfsichel (Item)
// =============================================================================================
function buildItem() {
  const root = new THREE.Group();
  const own = [];
  const spinJ = joint([0, 0.55, 0]);
  const body = mesh(sichelGeo(0.34), sichelMat(), {}, true);
  spinJ.add(body);
  const halo = glowSprite(0xffd23a, 1.25, 0.55);
  const sp1 = sparkleSprite(0xfff6c0, 0.32), sp2 = sparkleSprite(0xffffff, 0.22);
  spinJ.add(halo);
  root.add(spinJ, sp1, sp2);
  const clk = new Clock();
  let spin = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'collected' ? 'collected' : 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    let y = 0.55 + Math.sin(t * 2.4) * 0.06, sc = 1, rate = 2.2;
    if (anim === 'collected') {
      const p = prog(st, clk, 0.5);
      y += smoothstep(p) * 0.9; sc = Math.max(0.001, 1 - smoothstep((p - 0.35) / 0.65)); rate = 16;
    }
    spin += dt * rate;
    spinJ.position.y = y;
    spinJ.rotation.set(0, spin, Math.sin(t * 1.7) * 0.12);
    spinJ.scale.setScalar(sc);
    spinJ.visible = sc > 0.002;
    halo.material.opacity !== undefined && (halo.scale.setScalar(1.15 + Math.sin(t * 3) * 0.1));
    const k = (t * 0.9) % 1, k2 = (t * 0.9 + 0.5) % 1;
    sp1.position.set(Math.cos(t * 1.3) * 0.35, y + 0.2 - k * 0.1, Math.sin(t * 1.3) * 0.35);
    sp1.scale.setScalar(0.32 * Math.sin(k * Math.PI) * sc + 0.001);
    sp2.position.set(-Math.cos(t * 1.1) * 0.3, y - 0.15 + k2 * 0.1, -Math.sin(t * 1.1) * 0.3);
    sp2.scale.setScalar(0.22 * Math.sin(k2 * Math.PI) * sc + 0.001);
    sp1.visible = sp2.visible = sc > 0.01;
  };
  return makeModel('wurfsichel_item', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Wurfsichel (Geschoss)
// =============================================================================================
const swirlGeo = () => cached('w7:sichel:swirl', () => {
  const g = new THREE.TorusGeometry(0.33, 0.045, 4, 36, Math.PI * 1.4);
  g.rotateX(Math.PI / 2);
  return g;
});
function buildGeschoss() {
  const root = new THREE.Group();
  const own = [];
  const spinJ = joint();
  const body = mesh(sichelGeo(0.3), sichelMat(), { r: [-Math.PI / 2, 0, 0] }, true);
  spinJ.add(body);
  const swirlMat = new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  own.push(swirlMat);
  const swirl = mesh(swirlGeo(), swirlMat);
  const halo = glowSprite(0xffd23a, 0.9, 0.45);
  root.add(spinJ, swirl, halo);
  const clk = new Clock();
  let spin = 0;
  const update = (dt, st) => {
    const anim = st.anim === 'idle' ? 'idle' : 'spin';
    clk.tick(dt, anim);
    if (st.spin !== undefined) spin = num(st.spin, 0);
    else if (anim === 'spin') spin += dt * num(st.speed, 19);
    spinJ.rotation.set(Math.sin(clk.t * 3) * 0.08, spin, 0);
    const on = anim === 'spin';
    swirl.visible = on;
    swirl.rotation.y = spin + 0.6;
    swirlMat.opacity = 0.45 + Math.sin(clk.t * 20) * 0.1;
    halo.visible = on;
  };
  return makeModel('wurfsichel_geschoss', root, update, own, { initial: 'spin' });
}

// =============================================================================================
// Wurfsichel-Kostüm (Vorlage)
// =============================================================================================
const KO = { cap: 0x1ec8b0, capHi: 0x8af4e0, capLow: 0x0a7a76, band: 0xffc21a, bandHi: 0xfff0a0, bobble: 0xff6ab4, bobbleHi: 0xffc8e4, lining: 0xff8ac0, liningHi: 0xffd0e8 };
/** Mütze (Kopfbreite 1, Ursprung Kopfmitte): Kappe mit Nähten, Goldband, Schirm nach +X, Bommel hinten oben. */
function capGeo() {
  return cached('w7:ko:cap', () => {
    const b = new Build();
    const capV = { v: (x, y, z, nx, ny) => {
      const seam = Math.abs(Math.atan2(z, x)) % (Math.PI / 3);
      const s = seam < 0.06 || seam > Math.PI / 3 - 0.06 ? 0.8 : 1;
      return mix(KO.capLow, KO.capHi, smoothstep(ny * 0.5 + nx * 0.25 + 0.15) * s);
    } };
    b.dome(0.56, capV, { p: [0, 0.04, 0], s: [1, 0.8, 1] }, Math.PI * 0.52, 36, 14);
    b.torus(0.555, 0.05, gradV(0xd8900a, KO.bandHi), { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0] }, 8, 40);
    // Schirm vorn: flacher Halbmond-Rand, leicht nach unten geneigt
    const visor = new THREE.CylinderGeometry(0.8, 0.8, 0.035, 28, 1, false, Math.PI / 2 - 1.05, 2.1);
    b.add(visor, gradV(KO.capLow, KO.capHi, 0.7, 0.4), { p: [-0.05, 0.03, 0], r: [0, 0, -0.12], s: [0.95, 1, 0.82] });
    // Bommel hinten oben
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      b.sphere(0.06, KO.bobble, { p: [-0.18 + Math.cos(a) * 0.055, 0.57 + Math.sin(i * 2.1) * 0.02, Math.sin(a) * 0.055] }, 10, 8);
    }
    b.sphere(0.085, gradV(KO.bobble, KO.bobbleHi), { p: [-0.18, 0.6, 0] }, 14, 10);
    return b.geometry();
  });
}
/** Umhang-Grundform (Ursprung Halsansatz, hängt nach −Y hinter der Figur): Bogen um −X, außen türkis, innen rosa, Goldsaum. */
const CU = 16, CV = 8;
function capeBase() {
  return cached('w7:ko:cape', () => {
    const pos = [], colA = [], idx = [];
    const c = new THREE.Color();
    for (const side of [0, 1]) {
      for (let j = 0; j <= CV; j++) {
        const v = j / CV;
        const y = -v * 1.4;
        const r = lerp(0.36, 0.62, Math.pow(v, 0.8)) - side * 0.012;
        for (let i = 0; i <= CU; i++) {
          const u = i / CU;
          const a = Math.PI + (u - 0.5) * 2.7;
          pos.push(Math.cos(a) * r - 0.05, y, Math.sin(a) * r);
          if (v > 0.9) c.set(KO.band); else if (side) c.copy(mix(KO.lining, KO.liningHi, 0.3 + v * 0.4)); else c.copy(mix(KO.capLow, KO.cap, 0.4 + (1 - v) * 0.5 + Math.abs(Math.sin(u * Math.PI * 3)) * 0.1));
          colA.push(c.r, c.g, c.b);
        }
      }
    }
    const per = (CV + 1) * (CU + 1);
    for (let j = 0; j < CV; j++) for (let i = 0; i < CU; i++) {
      const a = j * (CU + 1) + i, b = a + 1, d = a + CU + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);                       // außen
      idx.push(per + a, per + b, per + d, per + b, per + e, per + d);   // innen (umgekehrt)
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}
function buildKostuem(opts = {}) {
  const part = opts.part === 'umhang' ? 'umhang' : 'muetze';
  const size = Math.max(0.1, num(opts.size, 0.5));
  const root = new THREE.Group();
  const own = [];
  const scaleJ = joint(); scaleJ.scale.setScalar(size);
  root.add(scaleJ);
  const clk = new Clock();
  let update;
  if (part === 'muetze') {
    const cap = mesh(capGeo(), vcol(0.42, {}, 'w7cap'), {}, true);
    // Abzeichen: aufrecht stehende Sichel vorn oben (Öffnung nach oben), wie ein Helmkamm
    const crest = mesh(sichelGeo(0.22), sichelMat(), { p: [0.3, 0.42, 0], r: [0, 0, Math.PI / 2 - 0.35], s: [1, 1, 1.1] }, true);
    scaleJ.add(cap, crest);
    root.userData.parts = { cap, crest };
    update = (dt, st) => {
      clk.tick(dt, st.anim ?? 'idle');
      const bob = num(st.bob, 1);
      cap.rotation.z = Math.sin(clk.t * 2.2) * 0.015 * bob;
      crest.rotation.x = Math.sin(clk.t * 3) * 0.04 * bob;
    };
  } else {
    const geo = capeBase().clone();
    own.push(geo);
    const cape = mesh(geo, vcol(0.6, {}, 'w7cape'), {}, true);
    const clasp = mesh(sichelGeo(0.12), sichelMat(), { p: [0.33, -0.08, 0], r: [0, Math.PI / 2, -0.2] }, true);
    scaleJ.add(cape, clasp);
    root.userData.parts = { cape, clasp };
    const base = geo.attributes.position.array.slice();
    const P = geo.attributes.position;
    let lift = 0;
    update = (dt, st) => {
      clk.tick(dt, st.anim ?? 'idle');
      const t = clk.t;
      lift = damp(lift, clamp(num(st.wind, 0), 0, 1), 4, dt);
      const fl = 0.25 + lift * 0.75;
      for (let k = 0; k < P.count; k++) {
        const bx = base[k * 3], by = base[k * 3 + 1], bz = base[k * 3 + 2];
        const v = clamp(-by / 1.4, 0, 1), u = (k % (CU + 1)) / CU;
        const w = Math.sin(t * 6 + u * 6 - v * 4) * fl * v;
        const back = lift * v * v;
        P.setXYZ(k, bx - back * 0.55 + w * 0.04, by + back * 0.35 + Math.abs(w) * 0.02, bz * (1 + back * 0.1) + w * 0.02);
      }
      P.needsUpdate = true;
      geo.computeVertexNormals();
    };
  }
  return makeModel('wurfsichel_kostuem', root, update, own, { initial: 'idle' });
}

export const MODELS = {
  wurfsichel_item: buildItem,
  wurfsichel_geschoss: buildGeschoss,
  wurfsichel_kostuem: buildKostuem,
};
