// Baustein Zeit-Uhren (Präzisierung „Motor und Bausteine Bonuswelten“; Remix-Regel `clocks`, Bauplan P-1 „Ziel nur mit
// eingesammelten Zeit-Uhren erreichbar – die Uhren bilden die Ideallinie“, B-4 „nur Zeit-Uhren verlängern“, B-9).
//
// zeituhren – schwebende goldene Wecker: Berühren (auch Wurfsichel-Fang zählt nicht) gibt +sec Sekunden Restzeit, Funkeln,
//   Ansage „+10 Sekunden“. Eine Instanz-Gruppe für alle Uhren (1 Zeichenaufruf). Eingesammelte Uhren bleiben nach einem
//   Neustart am Checkpoint weg (wie Münzen).
//   { type: 'zeituhren', id, list: [[x, y, z] …] (Mitte der Uhr) | from: [x, y, z], to: [x, y, z], n (Reihe), sec: 10,
//     size: 1 (Maßstab), color: 'gold' | 'silber' | 'rosa', banner: true }
//   level.named.get(id) = { got, items: [{ x, y, z, taken }], sec, info() → { got, left, sec } }; Signal 'zeituhr'
//   ({ sec, got, pos }) je Uhr; Sammelstelle star(level).clocks.
//   Beispiel: { type: 'zeituhren', id: 'uhren', list: [[0, 2, -20], [2, 2.5, -34]], sec: 10 }

import * as THREE from 'three';
import { v3, addObject, lin, mixc, smooth, colorize, merge } from '../kit.js';
import { visDt } from '../../entities/gimmick.js';
import { banner } from '../w3kit.js';
import { star, figures } from '../starkit.js';

const COL = { gold: [0xffc83a, 0xfff2b0, 0xb07a10], silber: [0xd8e0f0, 0xffffff, 0x7a8496], rosa: [0xff8ac8, 0xffe4f4, 0xa83a7a] };

/** Wecker-Geometrie (Ursprung Mitte, Zifferblatt nach +Z): Gehäuse, Zifferblatt, Zeiger, Glocken, Füßchen. */
export function clockGeo(color = 'gold') {
  const C = COL[color] ?? COL.gold;
  const a = lin(C[0]), hi = lin(C[1]), lo = lin(C[2]);
  const parts = [];
  const shade = (g, base) => colorize(g.toNonIndexed(), (p, n, o) => mixc(mixc(lo, base, 0.7, [0, 0, 0]), hi, smooth(-0.3, 0.9, n.y * 0.6 + n.z * 0.5), o));
  const body = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 22);
  body.rotateX(Math.PI / 2);
  parts.push(shade(body, a));
  const face = new THREE.CircleGeometry(0.29, 22);
  face.translate(0, 0, 0.101);
  parts.push(colorize(face.toNonIndexed(), (p, n, o) => { o[0] = 0.98; o[1] = 0.96; o[2] = 0.9; }));
  const back = new THREE.CircleGeometry(0.29, 22);
  back.rotateY(Math.PI); back.translate(0, 0, -0.101);
  parts.push(colorize(back.toNonIndexed(), (p, n, o) => { o[0] = 0.98; o[1] = 0.96; o[2] = 0.9; }));
  const dark = [0.08, 0.06, 0.1];
  for (const [w, h, rot] of [[0.035, 0.22, 0], [0.03, 0.16, -2.1]]) {
    for (const side of [1, -1]) {
      const hand = new THREE.BoxGeometry(w, h, 0.01);
      hand.translate(0, h / 2, 0);
      hand.rotateZ(rot);
      if (side < 0) hand.rotateY(Math.PI);
      hand.translate(0, 0, side * 0.108);
      parts.push(colorize(hand.toNonIndexed(), (p, n, o) => { o[0] = dark[0]; o[1] = dark[1]; o[2] = dark[2]; }));
    }
  }
  for (const s of [-1, 1]) {
    const bell = new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    bell.rotateZ(-s * 0.55); bell.translate(s * 0.24, 0.3, 0);
    parts.push(shade(bell, a));
    const foot = new THREE.CylinderGeometry(0.035, 0.05, 0.12, 8);
    foot.rotateZ(s * 0.5); foot.translate(s * 0.22, -0.36, 0);
    parts.push(shade(foot, lo));
  }
  const knob = new THREE.SphereGeometry(0.05, 8, 6);
  knob.translate(0, 0.42, 0);
  parts.push(shade(knob, a));
  return merge(parts);
}

export function buildZeituhren(level, spec) {
  let list = (spec.list ?? []).map((q) => v3(q));
  if (spec.from && spec.to) {
    const a = v3(spec.from), b = v3(spec.to), n = Math.max(1, spec.n ?? 3);
    for (let i = 0; i < n; i++) { const u = n === 1 ? 0.5 : i / (n - 1); list.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }); }
  }
  if (spec.pos && !list.length) list = [v3(spec.pos)];
  const sec = spec.sec ?? 10;
  const S = spec.size ?? 1;
  const st = { got: 0, sec, items: list.map((p) => ({ x: p.x, y: p.y, z: p.z, taken: false, pop: 0 })) };
  const handle = {
    get got() { return st.got; }, items: st.items, sec,
    info: () => ({ got: st.got, left: st.items.filter((i) => !i.taken).length, sec }),
  };
  if (spec.id) level.named.set(spec.id, handle);
  star(level).clocks.push(handle);
  level.onStep(() => {
    for (const it of st.items) {
      if (it.taken) continue;
      for (const f of figures(level)) {
        const c = f.center();
        if (Math.abs(c.x - it.x) < 0.75 * S + f.half.x && Math.abs(c.y - it.y) < 0.6 * S + f.half.y && Math.abs(c.z - it.z) < 0.75 * S + f.half.z) {
          it.taken = true; st.got++;
          if (level.runtime) level.runtime.timeLeft += sec;
          level.sfx('coin'); level.sfx('timewarn');
          level.effects?.sparks?.({ x: it.x, y: it.y, z: it.z }, 12);
          if (spec.banner !== false) banner(level, `+${sec} Sekunden`, { hold: 0.6, size: 14 });
          level.signal?.('zeituhr', { sec, got: st.got, pos: [it.x, it.y, it.z] });
          break;
        }
      }
    }
  });
  if (!level.view || !st.items.length) return handle;
  const mesh = new THREE.InstancedMesh(clockGeo(spec.color), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.3, emissive: 0x2a1a00 }), st.items.length);
  mesh.name = 'zeituhren';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const holder = {};
  let t = 0;
  const place = (d) => {
    t += d;
    st.items.forEach((it, i) => {
      if (it.taken) it.pop = Math.min(1, it.pop + d * 3);
      const k = it.taken ? 1 - it.pop : 1;
      v.set(it.x, it.y + Math.sin(t * 2.4 + i) * 0.12 + (it.taken ? it.pop * 1.2 : 0), it.z);
      e.set(Math.sin(t * 3 + i) * 0.12, t * 1.6 + i * 0.7, 0); q.setFromEuler(e);
      sc.setScalar(Math.max(0.0001, k * 1.25 * S));
      m4.compose(v, q, sc);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  addObject(level, mesh, (dt) => place(visDt(level, holder, dt)));
  return handle;
}

export const TYPES = { zeituhren: buildZeituhren };
