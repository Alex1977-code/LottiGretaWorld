// Zopf-Physik (HangChain) deterministisch in Node bei 60 fps: weht beim Laufen nach hinten,
// kommt im Stand zur Ruhe, hebt sich beim Fallen. Ergänzt tests/braids3d.mjs, dessen Physik-Prüfungen
// im langsamen Headless-Renderer (wenige Bilder/s) nicht aussagekräftig sind.
import * as THREE from 'three';
import { HangChain } from '../src/three/lib/figures.js';

let ok = 0, fail = 0;
const check = (label, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); cond ? ok++ : fail++; };
const links = [0.12, 0.11, 0.10];
const mk = (s) => {
  const c = new HangChain(links, { gravity: 32, drag: 0.4, damping: 4, stiffness: 40, straighten: 120, maxBend: 0.7, rootCone: { back: 1.85, front: 0.61, out: 1.4, inward: 0.21, zSign: s } });
  c.rest[0].set(-0.12, -1, s * 0.3).normalize(); c.rest[1].set(-0.04, -1, s * 0.1).normalize(); c.rest[2].set(0, -1, s * 0.02).normalize();
  return c;
};
const fmt = (v) => v.toArray().map((n) => n.toFixed(2)).join(',');
/** Aufhängung mit Geschwindigkeit vx (Einheiten/s) und Fallgeschwindigkeit vy(t) bewegen. */
const run = (label, fps, vx, vyFn, seconds) => {
  const c = mk(1); const a = new THREE.Vector3(0, 1.2, 0.26); c.reset(a);
  const dt = 1 / fps; let t = 0;
  for (let i = 0; i < seconds * fps; i++) { t += dt; a.x += vx * dt; a.y -= (vyFn ? vyFn(t) : 0) * dt; c.update(a, dt); }
  console.log(`  ${label.padEnd(32)} dir0 ${fmt(c.dirs[0])}  dir2 ${fmt(c.dirs[2])}`);
  return c;
};
const laufen = run('Lauf 7,8 E/s (2 s)', 60, 7.8, null, 2);
check('Zöpfe wehen beim Laufen nach hinten', laufen.dirs[0].x < -0.15 && laufen.dirs[2].x < -0.15);
const stand = run('Stand (3 s)', 60, 0, null, 3);
check('Zöpfe kommen im Stand zur Ruhe', stand.dirs[0].y < -0.9 && stand.dirs[2].y < -0.9);
const fall = run('Fall bis 24 E/s (1,5 s)', 60, 0, (t) => Math.min(24, 62 * t), 1.5);
check('Zöpfe heben sich beim Fallen', fall.dirs[0].y > -0.5);
check('Zöpfe klappen nicht über den Kopf (Wurzelkegel)', fall.dirs[0].y < 0.95);
const langsam = run('Lauf bei 30 fps (2 s)', 30, 7.8, null, 2);
check('Verhalten bei 30 fps gleichwertig', langsam.dirs[0].x < -0.15);
const start = run('Teleport (Sprung der Aufhängung)', 60, 400, null, 0.05);
check('Teleport setzt die Kette ohne Fehler zurück', Number.isFinite(start.dirs[0].x) && start.resets >= 1);
console.log(`\n${ok}/${ok + fail} Prüfungen bestanden`);
process.exit(fail ? 1 : 0);
