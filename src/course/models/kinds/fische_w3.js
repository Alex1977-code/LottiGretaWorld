// Wasser-Gegner Welt 3 (Kurs-Modus, Lagune 3-5 und Kapitäns-See 3-Kapitän). Eigene Gestaltung.
// Maßstab Meter, Ursprung = Unterkante des Körpers (Bauch), Blick nach +X; state darf ein String sein.
//
// flossling     ≈0,7 m lang  runder Fisch mit Stirnlocke, Fächer-Rückenflosse, Schmollmund, großen Augen.
//   opts  { color: 'tuerkis'|'koralle'|'gold' (Standard 'tuerkis') }
//   state { anim: 'swim'|'jump'|'flop'|'defeated', speed }
//         swim: Schwanz schlägt, Brustflossen paddeln; jump: Körper bogenförmig nach oben gereckt, Flossen
//         gespreizt (Motor bewegt root); flop: liegt auf der Seite und zappelt; defeated: Bauch nach oben.
// stachelfisch  Ø ≈1,4 m  Stachel-Kugelfisch: grün-lindgrün, cremefarbener Bauch, ≈ 40 Stacheln, Unterbiss mit
//   zwei Zähnen, finstere Brauen. Körpermitte bei y = 0,7·size.
//   opts  { size: Faktor (Standard 1; z. B. 0,45 für die kleinen Wandloch-Schützen) }
//   state { anim: 'swim'|'chase'|'puff'|'defeated' }  chase: vorgebeugt, Maul weiter auf, schneller Schwanz;
//         puff: bläst sich auf (×1,25, 0,25 s), Stacheln länger; defeated: dreht sich auf den Rücken, Luft entweicht.
// rammfisch     ≈1,9 m lang  bulliger Rammfisch: marineblau mit hellem Bauch, genieteter Stahl-Stirnpanzer,
//   rote Rückenflosse, Unterbiss.  state { anim: 'swim'|'charge'|'turn'|'stunned' }
//         charge: Kopf gesenkt, Schwanz rast, Blasen; turn: biegt sich zur Seite (Wende); stunned: Sterne.

import {
  THREE, TAU, Build, cached, vcol, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, mix,
  smoothstep, std, placed,
} from '../lib/kit.js';
import { alongY, onEll, stick, Puffs } from '../lib/kit_w3.js';

// =============================================================================================
// Flossling
// =============================================================================================
const FL_COLORS = {
  tuerkis: { top: 0x16a9c0, side: 0x3fd8d0, belly: 0xfff0b8, fin: 0xff8a2a, finTip: 0xffd36a },
  koralle: { top: 0xe8403a, side: 0xff7a5a, belly: 0xfff0dc, fin: 0xffc21a, finTip: 0xfff0a0 },
  gold: { top: 0xf09a10, side: 0xffc83a, belly: 0xfff6d8, fin: 0xff4a7a, finTip: 0xffb0c8 },
};
const FL_C = [0, 0.27, 0], FL_R = [0.3, 0.26, 0.235];
function flBodyGeo(color) {
  const C = FL_COLORS[color];
  return cached(`w3:fl:body:${color}`, () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => (ny < -0.25 ? mix(C.belly, C.side, smoothstep((ny + 0.6) / 0.35)) : mix(C.side, C.top, smoothstep(ny))) }, { p: FL_C, s: FL_R }, 28, 20);
    // Schmollmund vorn
    b.torus(0.045, 0.026, 0xff6a8a, { p: [0.295, 0.22, 0], r: [0, Math.PI / 2, 0], s: [1.25, 1, 1] }, 8, 16);
    b.sphere(1, 0x5a1a2a, { p: [0.3, 0.22, 0], s: [0.012, 0.035, 0.045] }, 8, 6);
    // Stirnlocke (Flosse, nach vorn eingerollt)
    b.tube([[0.08, 0.5, 0], [0.12, 0.6, 0], [0.2, 0.63, 0], [0.24, 0.58, 0], [0.2, 0.54, 0]], 0.032, { v: (x) => mix(C.fin, C.finTip, smoothstep((x - 0.08) / 0.16)) }, null, 18, 7);
    // Fächer-Rückenflosse
    const fan = new THREE.Shape();
    fan.moveTo(0, 0); fan.lineTo(0.16, 0.0);
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI * 0.85; fan.lineTo(Math.cos(a) * 0.17 - 0.0, Math.sin(a) * 0.15 + (i % 2) * 0.02); }
    fan.lineTo(0, 0);
    b.extrude(fan, 0.03, { v: (x, y) => mix(C.fin, C.finTip, smoothstep(y / 0.16)) }, { p: [-0.1, 0.47, 0], r: [0, 0, 0.35] }, 0.01, 6, 1);
    // Wangen
    for (const s of [1, -1]) stick(b, onEll(FL_C, FL_R, s * 0.62, -0.18), 0xff9ab0, [0.045, 0.03, 0.015], 0.3);
    return b.geometry();
  });
}
function flTailGeo(color) {
  const C = FL_COLORS[color];
  return cached(`w3:fl:tail:${color}`, () => {
    const b = new Build();
    for (const s of [1, -1]) b.sphere(1, { v: (x) => mix(C.fin, C.finTip, smoothstep(-x / 0.18)) }, { p: [-0.1, s * 0.07, 0], s: [0.13, 0.08, 0.025], r: [0, 0, s * 0.55] }, 14, 8);
    return b.geometry();
  });
}
const flFinGeo = (color) => cached(`w3:fl:fin:${color}`, () => new Build().sphere(1, { v: (x) => mix(FL_COLORS[color].fin, FL_COLORS[color].finTip, smoothstep(-x / 0.08)) }, { p: [-0.05, 0, 0], s: [0.08, 0.02, 0.05] }, 12, 6).geometry());

function buildFlossling(opts = {}) {
  const color = FL_COLORS[opts.color] ? opts.color : 'tuerkis';
  const root = new THREE.Group();
  const pose = joint([0, 0.27, 0]);
  const body = joint([0, -0.27, 0]);
  const bodyM = mesh(flBodyGeo(color), vcol(0.28), {}, true);
  const tail = joint([-0.27, 0.27, 0], mesh(flTailGeo(color), vcol(0.3), {}, true));
  const fins = [1, -1].map((s) => joint([0.04, 0.2, s * 0.22], mesh(flFinGeo(color), vcol(0.3))));
  const eye = eyes([{ p: [0.18, 0.34, 0.135], r: 0.085, sy: 1.25, dir: [0.75, 0.15, 0.65] }, { p: [0.18, 0.34, -0.135], r: 0.085, sy: 1.25, dir: [0.75, 0.15, -0.65] }],
    { key: 'w3:fl', iris: 0x1a3a8a, pupil: 0.58, depth: 0.5 });
  body.add(bodyM, tail, ...fins, eye);
  pose.add(body);
  root.add(pose);
  const clk = new Clock(), blink = new Blinker();
  let pitch = 0, rollA = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const jump = anim === 'jump', flop = anim === 'flop', dead = anim === 'defeated';
    const f = jump ? 14 : flop ? 9 : 6 + (st.speed ?? 0) * 1.5;
    tail.rotation.y = Math.sin(t * f) * (jump ? 0.6 : 0.45);
    body.rotation.y = -Math.sin(t * f) * 0.08;
    fins.forEach((fn, i) => { const s = i ? -1 : 1; fn.rotation.set(s * (0.3 + Math.sin(t * f * 0.7 + i) * (jump ? 0.1 : 0.4)), s * (jump ? -0.6 : -0.2), jump ? 0.3 : 0); });
    pitch = damp(pitch, jump ? 0.55 : flop ? 0 : Math.sin(t * 1.6) * 0.06, 8, dt);
    rollA = damp(rollA, flop ? Math.PI / 2 : dead ? Math.PI : 0, 8, dt);
    pose.rotation.set(rollA + (flop ? Math.sin(t * 9) * 0.15 : 0), 0, pitch + (flop ? Math.abs(Math.sin(t * 9)) * 0.3 : 0));
    pose.position.y = flop ? 0.235 + Math.abs(Math.sin(t * 9)) * 0.08 : dead ? 0.27 : 0.27 + Math.sin(t * 2.2) * 0.03;
    eye.userData.blink(dead ? 0.1 : flop ? 1 : blink.update(dt));
    eye.scale.setScalar(jump || flop ? 1.15 : 1);
  };
  return makeModel('flossling', root, update, [], { initial: 'swim' });
}

// =============================================================================================
// Stachelfisch
// =============================================================================================
const SF = { top: 0x1c6e66, side: 0x7cc84a, belly: 0xfff0c4, spikeLo: 0x6a4a2a, spikeHi: 0xfff8e8, lip: 0xff6a3a, mouth: 0x3a0e14, tooth: 0xffffff, brow: 0x10302a, fin: 0xffb21a, cheek: 0xff8a6a };
const SF_R = 0.7;
function sfBodyGeo() {
  return cached('w3:sf:body', () => {
    const b = new Build();
    b.sphere(SF_R, { v: (x, y, z, nx, ny) => (ny < -0.2 ? mix(SF.belly, SF.side, smoothstep((ny + 0.45) / 0.25)) : mix(SF.side, SF.top, smoothstep((ny - 0.05) / 0.8))) }, null, 36, 26);
    // dunkle Tupfen auf dem Rücken
    for (let i = 0; i < 9; i++) stick(b, onEll([0, 0, 0], [SF_R, SF_R, SF_R], Math.PI * 0.55 + i * 0.55, 0.55 + (i % 3) * 0.2), 0x0f4a44, [0.07, 0.07, 0.02], 0.3);
    // Stacheln (Fibonacci-Kugel, Gesicht und Bauch frei)
    const n = 70;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (y < -0.35) continue;
      if (d.x > 0.45 && y < 0.62 && Math.abs(d.z) < 0.8) continue;
      b.add(new THREE.ConeGeometry(0.055, 0.26, 7), { v: (x, yy) => mix(SF.spikeLo, SF.spikeHi, smoothstep((yy + 0.13) / 0.2)) }, alongY(d.clone().multiplyScalar(SF_R * 0.9), d, 0.26));
    }
    // Maul: dunkle Öffnung mit wulstigem Lippenring, Unterbiss mit zwei Zähnen nach oben
    const mh = onEll([0, 0, 0], [SF_R, SF_R, SF_R], 0, -0.24);
    stick(b, mh, SF.mouth, [0.2, 0.085, 0.06], 0.25);
    const lip = new THREE.TorusGeometry(1, 0.28, 8, 28);
    b.add(lip, SF.lip, placed(mh.p.clone().addScaledVector(mh.n, 0.0), mh.n, new THREE.Vector3(0.2, 0.09, 0.12)));
    for (const s of [1, -1]) {
      const tp = mh.p.clone().addScaledVector(mh.n, 0.03).add(new THREE.Vector3(0, -0.035, s * 0.075));
      b.cone(0.03, 0.08, SF.tooth, { p: [tp.x, tp.y + 0.03, tp.z], r: [0, 0, -0.25] }, 6);
    }
    // finstere Brauen
    for (const s of [1, -1]) b.capsule(0.04, 0.19, SF.brow, { p: [0.53, 0.45, s * 0.25], r: [Math.PI / 2 - s * 0.5, -s * 0.5, 0], order: 'YXZ' }, 3, 6);
    // Wangen
    for (const s of [1, -1]) stick(b, onEll([0, 0, 0], [SF_R, SF_R, SF_R], s * 0.75, -0.05), SF.cheek, [0.09, 0.06, 0.02], 0.3);
    return b.geometry();
  });
}
const sfTailGeo = () => cached('w3:sf:tail', () => {
  const b = new Build();
  for (const s of [1, -1]) b.sphere(1, { v: (x) => mix(SF.fin, 0xfff0a0, smoothstep(-x / 0.25)) }, { p: [-0.16, s * 0.1, 0], s: [0.2, 0.12, 0.035], r: [0, 0, s * 0.6] }, 14, 8);
  return b.geometry();
});
const sfFinGeo = () => cached('w3:sf:fin', () => new Build().sphere(1, { v: (x) => mix(SF.fin, 0xfff0a0, smoothstep(-x / 0.12)) }, { p: [-0.08, 0, 0], s: [0.13, 0.03, 0.09] }, 12, 6).geometry());

function buildStachelfisch(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.2, 4);
  const root = new THREE.Group();
  const sj = joint(); sj.scale.setScalar(size);
  const pose = joint([0, SF_R, 0]);
  const puff = joint();
  const bodyM = mesh(sfBodyGeo(), vcol(0.32), {}, true);
  const tail = joint([-SF_R * 0.95, 0, 0], mesh(sfTailGeo(), vcol(0.3), {}, true));
  const fins = [1, -1].map((s) => joint([0.05, -0.15, s * SF_R * 0.92], mesh(sfFinGeo(), vcol(0.3))));
  const eye = eyes([{ p: [0.56, 0.21, 0.27], r: 0.15, sy: 1.15, dir: [0.85, 0.32, 0.41] }, { p: [0.56, 0.21, -0.27], r: 0.15, sy: 1.15, dir: [0.85, 0.32, -0.41] }],
    { key: 'w3:sf', iris: 0xe8a010, pupil: 0.5, depth: 0.5 });
  puff.add(bodyM, tail, ...fins, eye);
  pose.add(puff);
  sj.add(pose);
  root.add(sj);
  const clk = new Clock(), blink = new Blinker();
  let inflate = 0, roll = 0, lean = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const chase = anim === 'chase', dead = anim === 'defeated';
    const f = chase ? 9 : 5;
    inflate = damp(inflate, anim === 'puff' ? 1 : dead ? -0.15 : 0, anim === 'puff' ? 14 : 5, dt);
    const sc = 1 + inflate * 0.25 + Math.sin(t * 2.5) * 0.015;
    puff.scale.setScalar(sc);
    tail.rotation.y = Math.sin(t * f) * 0.5;
    fins.forEach((fn, i) => { const s = i ? -1 : 1; fn.rotation.set(s * (0.2 + Math.sin(t * f + i) * 0.5), s * -0.3, 0); });
    lean = damp(lean, chase ? -0.22 : 0, 6, dt);
    roll = damp(roll, dead ? Math.PI : 0, 5, dt);
    pose.rotation.set(roll, Math.sin(t * 1.2) * 0.08, lean + Math.sin(t * 1.7) * 0.04);
    pose.position.y = SF_R + Math.sin(t * 1.8) * 0.04;
    let k = blink.update(dt);
    if (dead) k = 0.1; else if (chase || anim === 'puff') k = 1;
    eye.userData.blink(k);
  };
  return makeModel('stachelfisch', root, update, [], { initial: 'swim' });
}

// =============================================================================================
// Rammfisch
// =============================================================================================
const RM = { top: 0x23306e, side: 0x3a5ab8, belly: 0xd4e2f4, plate: 0xa8b4c8, plateDark: 0x6a7890, rivet: 0xe8eef8, fin: 0xe8403a, finTip: 0xff9a6a, mouth: 0x1a0a14, tooth: 0xffffff };
const RM_C = [0, 0.5, 0], RM_R = [0.95, 0.5, 0.46];
function rmBodyGeo() {
  return cached('w3:rm:body', () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z, nx, ny) => (ny < -0.3 ? mix(RM.belly, RM.side, smoothstep((ny + 0.6) / 0.3)) : mix(RM.side, RM.top, smoothstep(ny))) }, { p: RM_C, s: RM_R }, 32, 22);
    // Stahl-Rammkappe vorn (Achse +X, flache Stirn mit Nietenkranz, Bänder)
    // (sitzt hoch auf der Stirn, Augen und Unterbiss bleiben frei)
    const cap = [[0.0, -0.2], [0.27, -0.2], [0.3, -0.15], [0.31, 0.02], [0.29, 0.1], [0.24, 0.14], [0.0, 0.15]];
    b.lathe(cap, { v: (x, y, z, nx, ny) => mix(RM.plateDark, RM.plate, smoothstep(ny * 0.7 + 0.45)) }, { p: [0.86, 0.74, 0], r: [0, 0, -Math.PI / 2 - 0.15], s: [1, 1, 0.92] }, 28, 2);
    b.torus(0.31, 0.03, RM.plateDark, { p: [0.77, 0.75, 0], r: [0, Math.PI / 2, 0.15], s: [1, 1, 0.92] }, 6, 28);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.03, RM.rivet, { p: [1.0 - Math.sin(a) * 0.03, 0.72 + Math.sin(a) * 0.18, Math.cos(a) * 0.17] }, 8, 6); }
    b.sphere(1, RM.plateDark, { p: [1.01, 0.72, 0], s: [0.02, 0.08, 0.08] }, 12, 8);
    // grimmige Brauenkante unter der Kappe
    for (const s of [1, -1]) b.capsule(0.035, 0.16, RM.top, { p: [0.68, 0.58, s * 0.3], r: [Math.PI / 2 - s * 0.35, -s * 0.7, 0], order: 'YXZ' }, 3, 6);
    // Unterbiss: Maul unter dem Panzer, zwei Zähne nach oben
    stick(b, onEll(RM_C, RM_R, 0, -0.42), RM.mouth, [0.26, 0.09, 0.06], 0.35);
    for (const s of [1, -1]) b.cone(0.03, 0.08, RM.tooth, { p: [0.8, 0.3, s * 0.11], r: [0, 0, -0.35] }, 6);
    // Kiemen-Striche
    for (const s of [1, -1]) for (let i = 0; i < 2; i++) b.torus(0.14 - i * 0.03, 0.012, RM.top, { p: [0.18 - i * 0.07, 0.48, s * 0.43], r: [0, s * 0.35, 0] }, 5, 12, Math.PI * 0.7);
    // Rückenflosse (rot, abgerundet)
    const fin = new THREE.Shape();
    fin.moveTo(-0.3, 0); fin.quadraticCurveTo(-0.15, 0.5, 0.2, 0.45); fin.quadraticCurveTo(0.12, 0.2, 0.25, 0); fin.lineTo(-0.3, 0);
    b.extrude(fin, 0.05, { v: (x, y) => mix(RM.fin, RM.finTip, smoothstep(y / 0.45)) }, { p: [-0.1, 0.92, 0] }, 0.02, 8, 1);
    return b.geometry();
  });
}
const rmTailGeo = () => cached('w3:rm:tail', () => {
  const b = new Build();
  const s = new THREE.Shape();
  s.moveTo(0.05, 0); s.quadraticCurveTo(-0.2, 0.15, -0.45, 0.45); s.quadraticCurveTo(-0.3, 0.05, -0.35, 0); s.quadraticCurveTo(-0.3, -0.05, -0.45, -0.45); s.quadraticCurveTo(-0.2, -0.15, 0.05, 0);
  b.extrude(s, 0.05, { v: (x) => mix(RM.fin, RM.finTip, smoothstep(-x / 0.45)) }, null, 0.02, 8, 1);
  return b.geometry();
});
const rmFinGeo = () => cached('w3:rm:fin', () => new Build().sphere(1, { v: (x) => mix(RM.fin, RM.finTip, smoothstep(-x / 0.2)) }, { p: [-0.12, 0, 0], s: [0.2, 0.03, 0.11] }, 12, 6).geometry());

function buildRammfisch() {
  const root = new THREE.Group();
  const pose = joint([0, 0.5, 0]);
  const body = joint([0, -0.5, 0]);
  const bodyM = mesh(rmBodyGeo(), vcol(0.3), {}, true);
  const tail = joint([-0.9, 0.5, 0], mesh(rmTailGeo(), vcol(0.3), {}, true));
  const fins = [1, -1].map((s) => joint([0.25, 0.3, s * 0.4], mesh(rmFinGeo(), vcol(0.3))));
  const eye = eyes([{ p: [0.63, 0.47, 0.32], r: 0.085, sy: 0.85, dir: [0.75, 0.05, 0.66] }, { p: [0.63, 0.47, -0.32], r: 0.085, sy: 0.85, dir: [0.75, 0.05, -0.66] }],
    { key: 'w3:rm', iris: 0xff3a2a, pupil: 0.5, depth: 0.55 });
  const dizzy = dizzyStars(0.4, 0.09); dizzy.position.set(0.3, 1.3, 0);
  body.add(bodyM, tail, ...fins, eye);
  pose.add(body);
  const bubbles = new Puffs(10, 0xe8f8ff, { opacity: 0.55, radius: 4, cy: 0.6 });
  root.add(pose, dizzy, bubbles.mesh);
  const clk = new Clock(), blink = new Blinker();
  let pitch = 0, bend = 0, emit = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'swim';
    clk.tick(dt, anim);
    const t = clk.t;
    const charge = anim === 'charge', turn = anim === 'turn', stunned = anim === 'stunned';
    const f = charge ? 13 : 5;
    tail.rotation.y = Math.sin(t * f) * (charge ? 0.55 : 0.4) + bend * 0.8;
    pitch = damp(pitch, charge ? -0.22 : stunned ? 0.15 : Math.sin(t * 1.3) * 0.05, 6, dt);
    bend = damp(bend, turn ? 0.6 : 0, 6, dt);
    body.rotation.y = -Math.sin(t * f) * 0.05 + bend * 0.5;
    pose.rotation.set(stunned ? Math.sin(t * 5) * 0.15 : 0, 0, pitch);
    pose.position.set(charge ? Math.sin(t * 40) * 0.01 : 0, 0.5 + Math.sin(t * 1.6) * 0.04, 0);
    fins.forEach((fn, i) => { const s = i ? -1 : 1; fn.rotation.set(s * (0.25 + Math.sin(t * f * 0.6 + i) * 0.35), s * -0.4, charge ? 0.4 : 0); });
    if (charge) { emit -= dt; if (emit <= 0) { emit = 0.12; bubbles.burst([0.95, 0.65, 0], { count: 2, speed: 0.6, up: 0.6, size: 0.07, life: 0.9, spread: 0.2 }); } }
    bubbles.step(dt);
    dizzy.visible = stunned;
    if (stunned) dizzy.rotation.y = t * 4;
    eye.userData.blink(stunned ? 0.35 : blink.update(dt));
  };
  return makeModel('rammfisch', root, update, [bubbles], { initial: 'swim' });
}

export const MODELS = {
  flossling: buildFlossling,
  stachelfisch: buildStachelfisch,
  rammfisch: buildRammfisch,
};
