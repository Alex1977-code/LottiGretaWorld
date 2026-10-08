// Kurs-Modus: Kollisionswelt ohne Browser prüfen (reines Node, wenige Sekunden).
// Stufen, Wände, Rampen, Zylinder, Kanten, Einweg-Plattformen, versteckte Blöcke, Raycasts, Leistung.
// Aufruf: node tests/course_physics.mjs
import { CollisionWorld } from '../src/course/physics/CollisionWorld.js';
import { makeChecker } from './helpers.mjs';

const { check, summary } = makeChecker();
const half = { x: 0.3, y: 0.475, z: 0.3 };
const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;

/** Quader n-mal um d bewegen (wie die Figur: leichter Druck nach unten, Bodenhaftung). */
function walk(w, c, d, n, opts = { snap: 0.35 }) {
  let r;
  for (let i = 0; i < n; i++) r = w.moveAABB(c, half, d, opts);
  return r;
}

console.log('Kollisionswelt');
const w = new CollisionWorld();
w.add({ type: 'box', min: [-10, -1, -10], max: [30, 0, 10], tag: 'boden' });
w.add({ type: 'box', min: [2, 0, -1], max: [3, 0.25, 1], tag: 'stufe' });
w.add({ type: 'box', min: [5, 0, -1], max: [6, 1, 1], tag: 'wand' });

// Stufe 0,25 m wird hochgegangen, 1-m-Wand blockiert
let c = { x: 0, y: 0.475, z: 0 };
let r = walk(w, c, { x: 0.05, y: -0.02, z: 0 }, 50);
check('Stufe 0,25 m automatisch hochgegangen', c.x > 2.4 && near(c.y - half.y, 0.25) && r.grounded);
c = { x: 3.6, y: 0.475, z: 0 };
r = walk(w, c, { x: 0.05, y: -0.02, z: 0 }, 40);
check('1-m-Wand blockiert (Wandnormale −X)', near(c.x, 5 - 0.3, 0.005) && r.hitWall && r.wallNormal.x === -1);

// Gleiten an der Wand entlang (schräg hineinlaufen)
c = { x: 4.5, y: 0.475, z: -0.5 };
walk(w, c, { x: 0.05, y: -0.02, z: 0.03 }, 20);
check('An der Wand entlang gleiten', near(c.x, 4.7, 0.005) && c.z > 0);

// Rampe (steigt nach −Z) hinauf und oben weiter
const w2 = new CollisionWorld();
w2.add({ type: 'box', min: [-10, -1, -20], max: [10, 0, 10] });
w2.add({ type: 'ramp', min: [-2, 0, -8], max: [2, 2, -2], axis: 'z', dir: -1 });
w2.add({ type: 'box', min: [-2, 0, -12], max: [2, 2, -8] });
c = { x: 0, y: 0.475, z: 0 };
r = walk(w2, c, { x: 0, y: -0.02, z: -0.05 }, 220);
check('Rampe hinauf auf das Plateau', near(c.y - half.y, 2, 0.02) && c.z < -9 && r.grounded);
c = { x: 0, y: 2.475, z: -10 };
r = walk(w2, c, { x: 0, y: -0.02, z: 0.05 }, 220);
check('Rampe hinab mit Bodenhaftung (immer am Boden)', near(c.y - half.y, 0, 0.02) && r.grounded);

// Steile Rampe (> 50°) wirkt bergauf als Wand
const w3 = new CollisionWorld();
w3.add({ type: 'box', min: [-10, -1, -10], max: [10, 0, 10] });
w3.add({ type: 'ramp', min: [-2, 0, -4], max: [2, 3, -2], axis: 'z', dir: -1 });
c = { x: 0, y: 0.475, z: 0 };
walk(w3, c, { x: 0, y: -0.02, z: -0.05 }, 100);
check('Steile Rampe nicht begehbar', c.y - half.y < 0.35);

// Zylinder: radial hinausgeschoben
const w4 = new CollisionWorld();
w4.add({ type: 'box', min: [-10, -1, -10], max: [10, 0, 10] });
w4.add({ type: 'cyl', x: 0, z: -3, r: 1, y0: 0, y1: 3 });
c = { x: 0.2, y: 0.475, z: 0 };
r = walk(w4, c, { x: 0, y: -0.02, z: -0.05 }, 80);
check('Zylinder blockiert, Figur gleitet seitlich ab', Math.hypot(c.x, c.z + 3) >= 1.29 && r.hitWall);

// Kante: ragt nur der Rand über, rutscht die Figur ab (kein Anhaften)
const w5 = new CollisionWorld();
w5.add({ type: 'box', min: [-2, 2, -2], max: [2, 3, 2] });
c = { x: 2.2, y: 3.475, z: 0 };
r = walk(w5, c, { x: 0, y: -0.05, z: 0 }, 30, {});
check('Kante: Mitte 0,2 m über dem Rand → fällt', c.y < 3.3 && !r.grounded);
c = { x: 2.1, y: 3.475, z: 0 };
r = walk(w5, c, { x: 0, y: -0.05, z: 0 }, 30, {});
check('Kante: Mitte 0,1 m über dem Rand → steht', near(c.y, 3.475) && r.grounded);

// Einweg-Plattform: von unten durch, oben tragend
const w6 = new CollisionWorld();
w6.add({ type: 'box', min: [-2, 3, -2], max: [2, 3.5, 2], oneWay: true });
c = { x: 0, y: 2.2, z: 0 };
walk(w6, c, { x: 0, y: 0.1, z: 0 }, 20, {});
const through = c.y - half.y > 3.5;
r = walk(w6, c, { x: 0, y: -0.1, z: 0 }, 30, {});
check('Einweg-Plattform: von unten durch, oben stehen', through && near(c.y - half.y, 3.5) && r.grounded);

// Versteckter Block: nur Kopfstoß von unten, seitlich und von oben durchlässig
const w7 = new CollisionWorld();
const hid = w7.add({ type: 'box', min: [-0.5, 2, -0.5], max: [0.5, 3, 0.5], fromBelowOnly: true });
c = { x: 0, y: 0.6, z: 0 };
r = walk(w7, c, { x: 0, y: 0.1, z: 0 }, 20, {});
check('Versteckter Block hält Kopfstoß von unten auf', r.ceiling && r.ceilingShape?.id === hid && near(c.y + half.y, 2, 0.01));
c = { x: -2, y: 2.5, z: 0 };
walk(w7, c, { x: 0.1, y: 0, z: 0 }, 30, {});
check('Versteckter Block seitlich durchlässig', c.x > 0.5);

// Raycast nach unten (höchste Oberseite, Rampe interpoliert), Überlappung
check('raycastDown findet Rampenhöhe', near(w2.raycastDown(0, 5, -5, 10).y, 1));
check('raycastDown ignoriert Formen über dem Startpunkt', w2.raycastDown(0, 1.5, -10, 10).y === 0);
check('overlapAABB liefert Formen', w4.overlapAABB({ x: 0, y: 1, z: -3 }, { x: 0.2, y: 0.2, z: 0.2 }).length === 1);
check('raycast trifft Zylinder-Hülle', !!w4.raycast({ x: 0, y: 1, z: 2 }, { x: 0, y: 1, z: -8 }));

// Bewegte Form (update) und Entfernen
const w8 = new CollisionWorld();
const id = w8.add({ type: 'box', min: [-1, 0, -1], max: [1, 1, 1] });
w8.update(id, { min: [9, 0, -1], max: [11, 1, 1] });
check('update verschiebt Form im Gitter', !w8.raycastDown(0, 5, 0, 10) && w8.raycastDown(10, 5, 0, 10)?.y === 1);
w8.remove(id);
check('remove entfernt Form', !w8.raycastDown(10, 5, 0, 10) && w8.count === 0);

// Leistung: 3000 Formen
const big = new CollisionWorld();
for (let i = 0; i < 3000; i++) big.add({ type: 'box', min: [(i % 50) * 2, 0, -Math.floor(i / 50) * 2], max: [(i % 50) * 2 + 1, 1, -Math.floor(i / 50) * 2 + 1] });
const t0 = performance.now();
c = { x: 0.5, y: 5, z: -0.5 };
for (let i = 0; i < 2400; i++) big.moveAABB(c, half, { x: 0.05, y: -0.1, z: -0.03 }, { snap: 0.3 });
const ms = performance.now() - t0;
console.log(`  3000 Formen: 2400 Bewegungen in ${ms.toFixed(1)} ms`);
check('3000 Formen: Bewegung < 0,1 ms je Schritt', ms / 2400 < 0.1);

process.exit(summary([]) ? 0 : 1);
