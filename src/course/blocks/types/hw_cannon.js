// Halloween-Baustein Kürbis-Kanone: die Röhrenkanone (Welt 5, blocks/types/w5_savanna.js – Mechanik unverändert
// wiederverwendet) im Kürbis-Look. Ein großer Kürbis mit Öffnung oben und geschnitztem Grinsegesicht: hineinspringen
// (auf der Öffnung landen) oder darauf ducken → die Figur verschwindet darin, das Gesicht glüht auf, der Kürbis bläht
// sich, dann fliegt die Figur in hohem Bogen genau auf `to` (Zustand 'cannon', Kamera folgt, Münzen unterwegs).
//
//   { type: 'kuerbis_kanone', id, pos: [x, y, z] (Fuß, Mitte), to: [x, y, z] (Landepunkt), height: 2.0, radius: 1.1
//     (Kollision; Öffnung = 0,85·radius), arc, gravity: 30, charge: 0.6, enter: 'both' | 'land' | 'crouch', yaw: −π/2
//     (Gesicht zeigt nach +Z, zur Kamera), face: 'grinsen' | 'lachen' | 'staunen', color: 'orange' | 'gelb' | 'weiss',
//     onFire: Aktion, hidden, mark: true (Zielmarke am Landepunkt) }
//   level.named.get(id) = Griff der Röhrenkanone { shots, state ('idle' | 'load' | 'fly'), flightTime, from, to,
//     fire(player), reveal(), hide(), info() }
// Modell 'kuerbis_kanone' aus der Registry ({ height, radius, color, face }, Ursprung Fuß, Gesicht +X; state { anim:
//   'idle' | 'load' | 'fire', k }), sonst eigener Kürbis (blocks/hwkit.js pumpkinGeo + faceGeo).

import * as THREE from 'three';
import { v3, lin, mixc, colorize, merge, hex, addObject } from '../kit.js';
import { buildRoehrenkanone } from './w5_savanna.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { modelOr, pumpkinGeo, faceGeo, HWC, softTexture } from '../hwkit.js';

/** Zielmarke: oranger Ring mit kleinen Kürbis-Zacken. */
function markGeo(r) {
  const ring = new THREE.RingGeometry(r * 0.72, r, 32); ring.rotateX(-Math.PI / 2);
  const parts = [colorize(ring.toNonIndexed(), (p, n, o) => mixc(lin(hex(HWC.glowEdge)), lin(hex(HWC.glow)), 0.3, o))];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const t = new THREE.CircleGeometry(r * 0.16, 3); t.rotateX(-Math.PI / 2); t.rotateY(-a + Math.PI / 2);
    t.translate(Math.cos(a) * r * 0.52, 0.01, Math.sin(a) * r * 0.52);
    parts.push(colorize(t.toNonIndexed(), (p, n, o) => mixc(lin(hex(HWC.pk)), lin(hex(HWC.glowCore)), 0.4, o)));
  }
  return merge(parts);
}

export function buildKuerbisKanone(level, spec) {
  const p = v3(spec.pos);
  const h = spec.height ?? 2.0, r = spec.radius ?? 1.1;
  // Mechanik der Röhrenkanone ohne deren Optik (Hülle ohne Ansicht); Aktionen laufen im echten Level
  const lv = Object.create(level);
  lv.view = null;
  const onFire = spec.onFire;
  const handle = buildRoehrenkanone(lv, { ...spec, height: h, radius: r, charge: spec.charge ?? 0.6, onFire: onFire ? (_, ctx) => runAction(level, onFire, ctx) : undefined });
  if (!level.view) return handle;
  const to = handle.to;
  // Sichtbarkeit folgt reveal()/hide() der Röhrenkanone
  const st = { hidden: !!spec.hidden };
  const reveal = handle.reveal, hide = handle.hide;
  handle.reveal = () => { st.hidden = false; reveal(); };
  handle.hide = () => { st.hidden = true; hide(); };
  const yaw = spec.yaw ?? -Math.PI / 2;
  const root = new THREE.Group();
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = yaw;
  const color = spec.color ?? 'orange';
  // Kürbis so groß, dass die Öffnung oben auf Höhe h liegt (Form 'dick': Höhe = 1,69·R)
  const R = h / 1.692;
  let faceMat = null;
  const model = modelOr('kuerbis_kanone', { height: h, radius: r, color, face: spec.face ?? 'grinsen' }, () => {
    const pk = pumpkinGeo({ r: R, shape: 'dick', color, hole: 0.6, ribs: 12, seg: 36 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(pk.body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: 0x3a1400 }));
    body.castShadow = true; body.receiveShadow = true;
    faceMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xb8b8b8 });
    const glowParts = [faceGeo({ r: R, shape: 'dick', kind: spec.face ?? 'grinsen' })];
    if (pk.glow) glowParts.push(pk.glow);
    g.add(body, new THREE.Mesh(merge(glowParts), faceMat));
    // Blätter und Ranke am Boden
    const leaves = [];
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + 0.6;
      const lf = new THREE.CircleGeometry(0.42, 6); lf.scale(1.5, 1, 1); lf.rotateX(-Math.PI / 2); lf.rotateY(-a);
      lf.translate(Math.cos(a) * R * 1.15, 0.03 + k * 0.004, Math.sin(a) * R * 1.15);
      leaves.push(colorize(lf.toNonIndexed(), (q, n, o) => mixc(lin(hex(HWC.leafLow)), lin(hex(HWC.leaf)), 0.5 + 0.3 * Math.sin(q.x * 6), o)));
    }
    g.add(new THREE.Mesh(merge(leaves), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })));
    // abgeschnittener Deckel mit Stiel lehnt am Kürbis (liest sich sofort als „Kürbis“)
    const lid = pumpkinGeo({ r: R * 0.42, shape: 'flach', color, leaf: true, ribs: 12 });
    lid.body.rotateX(0.5); lid.body.translate(-R * 0.35, 0, R * 1.05);
    const lm = new THREE.Mesh(lid.body, body.material);
    lm.castShadow = true;
    g.add(lm);
    return { root: g };
  });
  root.add(model.root);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffa040, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(R * 2.4, R * 1.6, 1);
  glow.position.set(0, h + 0.3, 0);
  root.add(glow);
  if (spec.mark !== false) {
    const mark = new THREE.Mesh(markGeo(1.3), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false }));
    mark.position.set(to.x, to.y + 0.04, to.z);
    mark.renderOrder = 2;
    addObject(level, mark, (dt, t) => { mark.visible = !st.hidden; mark.rotation.y = t * 0.8; mark.material.opacity = 0.55 + 0.25 * Math.sin(t * 4); });
  }
  const hold = {};
  let tt = 0, k = 0, last = 'idle', puff = 0;
  addObject(level, root, (dt) => {
    const d = visDt(level, hold, dt);
    tt += d;
    root.visible = !st.hidden;
    const s = handle.state;
    k = s === 'load' ? Math.min(1, k + d / 0.6) : Math.max(0, k - d * 3);
    if (s === 'fly' && last === 'load') {
      puff = 1;
      const top = { x: p.x, y: p.y + h, z: p.z };
      level.effects?.ring(top, r + 0.4);
      level.effects?.dust(top, 8, 1.2);
      level.effects?.sparks(top, 14);
      level.shake(0.35);
    }
    last = s;
    puff = Math.max(0, puff - d * 3);
    const sh = s === 'load' ? 0.05 * k : 0;
    root.position.x = p.x + Math.sin(tt * 61) * sh; root.position.z = p.z + Math.cos(tt * 53) * sh;
    const bl = 0.08 * k - 0.06 * Math.sin(puff * Math.PI);
    root.scale.set(1 + bl, 1 - bl * 0.6 + 0.08 * Math.sin(puff * Math.PI), 1 + bl);
    if (faceMat) { const f = 0.62 + 0.06 * Math.sin(tt * 9) + 0.35 * k + 0.4 * puff; faceMat.color.setScalar(Math.min(1.2, f)); }
    glow.material.opacity = 0.12 + 0.4 * k + 0.45 * puff + 0.04 * Math.sin(tt * 7);
    model.update?.(d, { anim: s === 'load' ? 'load' : s === 'fly' ? 'fire' : 'idle', k });
  });
  return handle;
}

export const TYPES = { kuerbis_kanone: buildKuerbisKanone };
