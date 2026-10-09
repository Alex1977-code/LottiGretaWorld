// Baustein `fallplatform`: fallende Plattform – betritt die Figur sie, wackelt sie `delay` s und stürzt dann ab
// (trägt die Figur mit hinunter); nach `respawn` s erscheint sie wieder an ihrem Platz. Per Signal { drop: id }
// stürzt sie sofort (kurzes Wackeln) und bleibt weg (Bauplan 1-5: „die letzte Plattform davor stürzt ab, sobald
// alle Schalter aktiv sind“).
//
// Parameter:
//   pos:     [x, y, z]  Mitte der Unterseite;  size: [w, h, d] (Standard [2.5, 0.5, 2.5])
//   delay:   0.8   s Wackeln nach dem Betreten
//   respawn: 4     s nach Beginn des Absturzes erscheint sie wieder (0 = nie; mindestens 2,2 s Fall)
//   trigger: 'stand' (Standard) | 'signal' (nur per drop-Signal)
//   color:   'orange' (Standard) | Farbe
//   id:      Name → level.named: { state, drop(), reset() }
// Kollision: Quader mit mover-Flag (Figur fährt beim Absturz mit).
// Beispiel: { type: 'fallplatform', pos: [0, 4, -50], size: [2.5, 0.5, 2.5], delay: 0.8, respawn: 4 }

import * as THREE from 'three';
import { v3, sz3, box, hex, merge, addObject } from '../kit.js';
import { playerOn, visDt } from '../../entities/gimmick.js';

export function buildFallPlatform(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [2.5, 0.5, 2.5]);
  const delay = spec.delay ?? 0.8, respawnT = spec.respawn ?? 4;
  const mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
  const fp = { state: 'idle', t: 0, y: p.y, vy: 0, keep: false, shake: 0, pop: 1 };
  const shape = { type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], mover, owner: fp, tag: 'fallplatform' };
  let id = level.world.add(shape);
  const setY = (y) => { shape.min[1] = y; shape.max[1] = y + s.y; if (id) level.world.update(id); };
  fp.drop = () => { if (fp.state === 'idle' || fp.state === 'shake') { fp.state = 'shake'; fp.t = Math.max(fp.t, delay - 0.4); fp.keep = true; } };
  fp.reset = () => { fp.keep = false; if (fp.state === 'gone') fp.t = respawnT; };
  if (spec.id) level.named.set(spec.id, fp);
  level.onStep((dt) => {
    mover.dy = 0; mover.vy = 0;
    fp.t += dt;
    switch (fp.state) {
      case 'idle':
        if (spec.trigger !== 'signal' && playerOn(level, fp)) { fp.state = 'shake'; fp.t = 0; level.sfx('step'); }
        break;
      case 'shake':
        fp.shake = Math.min(1, fp.t / delay);
        if (fp.t >= delay) { fp.state = 'fall'; fp.t = 0; fp.vy = 0; fp.shake = 0; level.sfx('vanish'); }
        break;
      case 'fall': {
        fp.vy = Math.min(fp.vy + 24 * dt, 18);
        const dy = -fp.vy * dt;
        fp.y += dy;
        mover.dy = dy; mover.vy = dy / dt;
        setY(fp.y);
        if (fp.t > 2.2 || fp.y < level.killY) {
          fp.state = 'gone'; // t läuft weiter: Wiederkehr respawn s nach Beginn des Absturzes
          level.world.remove(id); id = null;
        }
        break;
      }
      case 'gone':
        if (!fp.keep && respawnT > 0 && fp.t >= respawnT) {
          fp.state = 'idle'; fp.t = 0; fp.y = p.y; fp.pop = 0;
          setY(p.y);
          id = level.world.add(shape);
          level.effects?.sparks({ x: p.x, y: p.y + s.y, z: p.z }, 8);
        }
        break;
      default: break;
    }
  });
  if (level.view) {
    const col = hex(spec.color ?? 'orange', 0xff9a2e);
    const parts = [box(s.x, s.y, s.z, 0, s.y / 2, 0, col, { r: Math.min(0.12, s.y * 0.3), topColor: 0xffd27a })];
    // Warnstreifen an der Oberkante und Risse oben
    const n = Math.max(2, Math.round(s.x / 0.5));
    for (let i = 0; i < n; i++) {
      if (i % 2) continue;
      const x = -s.x / 2 + (i + 0.5) * (s.x / n);
      for (const z of [-s.z / 2 - 0.01, s.z / 2 + 0.01]) parts.push(box(s.x / n, s.y * 0.5, 0.03, x, s.y * 0.5, z, 0x3a2a1a, { r: 0, seg: 0 }));
    }
    for (const [x, z, a] of [[-0.3, 0.2, 0.6], [0.35, -0.25, -0.4], [0, 0.45, 1.2]]) {
      const g = box(Math.min(s.x, s.z) * 0.35, 0.03, 0.05, 0, 0, 0, 0x8a4a12, { r: 0, seg: 0 });
      g.rotateY(a); g.translate(x * s.x * 0.5, s.y + 0.012, z * s.z * 0.5);
      parts.push(g);
    }
    const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(p.x, p.y, p.z);
    addObject(level, mesh, (dt, t) => {
      fp.pop = Math.min(1, fp.pop + visDt(level, fp, dt) * 3);
      const j = fp.state === 'shake' ? 0.03 + fp.shake * 0.06 : 0;
      mesh.visible = fp.state !== 'gone';
      mesh.position.set(p.x + Math.sin(t * 61) * j, fp.y + Math.cos(t * 47) * j * 0.5, p.z + Math.sin(t * 53) * j);
      mesh.rotation.z = fp.state === 'shake' ? Math.sin(t * 40) * 0.02 * fp.shake : 0;
      const k = fp.pop < 1 ? Math.sin(fp.pop * Math.PI * 0.5) + Math.sin(fp.pop * Math.PI) * 0.12 : 1;
      mesh.scale.setScalar(Math.max(0.05, k));
    });
  }
  return fp;
}

export const TYPES = { fallplatform: buildFallPlatform };
