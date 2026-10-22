// Baustein `quicksand` – Treibsand (Präzisierung Motor Welt 2; Bauplan 2-1 „Treibsandbecken“, „Treibsand-Absturz“).
//
// Sandfläche, in die Figuren und Gegner langsam einsinken: Laufen ist langsamer (×0,5, je tiefer desto zäher),
// Springen geht nur schwach (Sprunggeschwindigkeit ×0,75 … ×0,375 je nach Tiefe). Ist der Kopf unter der
// Oberfläche, ist es ein Tod (`die('sand')`; Klone verschwinden nur). Gegner sinken ebenso und verschwinden.
// Mit `flow` fließt der Sand und trägt mit (Treibsand-Absturz: der Sand läuft über eine Kante ins Nichts).
//
// Parameter:
//   pos:   [x, y, z]  Mitte der Unterseite des Sandkörpers;  size: [w, h, d] – h = Sandtiefe (Standard 1.2, mindestens
//          1,0 – größer als die Figur); Oberfläche = pos.y + h. Darunter liegt ein fester Boden (0,5 m) für Gegner/Items
//          (Flag quicksandFloor – die Figur ignoriert ihn).
//   sink:  0.3   m/s Einsinken (Figur groß 0,95 m → ≈ 3 s bis zum Tod; Gegner gleich)
//   slow:  0.5   Lauftempo-Faktor an der Oberfläche
//   jump:  0.75  Sprung-Faktor (Absprunggeschwindigkeit) an der Oberfläche
//   flow:  [fx, fz]  m/s Fließrichtung (Standard keine)
//   color: Sandfarbe (Standard 0xe8c26e; Körnungs-Textur)
//   swirl: 0.7   rad/s Wirbel des Beckens (Modell 'treibsand', nur ohne flow; mit flow fließt eine Körnungs-Textur)
// Das Becken braucht ein Loch im Boden ringsum (Inseln daneben, nicht darunter) – die Ränder baut der Baustein nicht.
// Kollision: Box mit Flags `quicksand: { sink, slow, jump, flow }`, `oneWay`, `camIgnore` (Gegner stehen zuerst auf der
// Oberfläche, Schatten-Blobs liegen darauf; die Figur ignoriert sie und wird von Player.sandSupport gehalten).
// Gegner: je Schritt (level.onStep, vor den Entitäten) hält der Baustein einsinkende Entitäten (enemy oder `sinks:
// true`) auf Oberfläche − Tiefe; ganz eingesunken → markDefeated (Beute an der Oberfläche) + kill.
// Beispiel: { type: 'quicksand', pos: [0, -0.2, -20], size: [6, 1.2, 4] }
//           { type: 'quicksand', pos: [0, -0.2, -60], size: [4, 1.2, 10], flow: [0, -1.6] }   // fließt nach −Z

import * as THREE from 'three';
import { v3, sz3, hex, box, addStatic } from '../kit.js';
import { hasModel, getModel } from '../../models/index.js';

function sandTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const col = new THREE.Color(color);
  g.fillStyle = `#${col.getHexString()}`;
  g.fillRect(0, 0, 128, 128);
  // Körner und Rippel (deterministisch)
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 700; i++) {
    const x = rnd() * 128, y = rnd() * 128, r = 0.6 + rnd() * 1.4, d = rnd();
    g.fillStyle = d < 0.5 ? 'rgba(120,80,30,0.22)' : 'rgba(255,245,210,0.35)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(150,100,40,0.22)'; g.lineWidth = 2;
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    for (let x = 0; x <= 128; x += 4) { const y = k * 21 + 8 + Math.sin(x / 128 * Math.PI * 2 * 2 + k) * 4; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function buildQuicksand(level, spec) {
  const p = v3(spec.pos), s = sz3(spec.size, [4, 1.2, 4]);
  const top = p.y + s.y;
  const flow = Array.isArray(spec.flow) ? { x: spec.flow[0] ?? 0, z: spec.flow[1] ?? 0 } : null;
  const q = { sink: spec.sink ?? 0.3, slow: spec.slow ?? 0.5, jump: spec.jump ?? 0.75, plop: 0.06, flow };
  const shape = {
    type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, top, p.z + s.z / 2],
    oneWay: true, camIgnore: true, noWallSlide: true, quicksand: q, tag: 'quicksand',
  };
  const owner = { quicksand: true, shape, top };
  shape.owner = owner;
  level.world.add(shape);
  level.world.hasQuicksand = true;
  // fester Boden unter dem Sand
  // (die Figur ignoriert ihn – sie versinkt vorher; sonst stünde sie unsichtbar unter dem Sand)
  level.world.add({ type: 'box', min: [p.x - s.x / 2, p.y - 0.5, p.z - s.z / 2], max: [p.x + s.x / 2, p.y, p.z + s.z / 2], quicksandFloor: true, tag: 'quicksand-floor' });
  if (spec.id) level.named.set(spec.id, owner);

  // Gegner (und Entitäten mit sinks: true) sinken ein
  const x0 = p.x - s.x / 2, x1 = p.x + s.x / 2, z0 = p.z - s.z / 2, z1 = p.z + s.z / 2;
  const inside = (e) => e.pos.x > x0 && e.pos.x < x1 && e.pos.z > z0 && e.pos.z < z1;
  level.onStep((dt) => {
    for (const e of level.entities) {
      if (!e.alive || e.removed || e.carrier || !(e.enemy || e.sinks)) continue;
      if (e.defeated && e.state !== 'squashed') { e._sandOf = null; continue; }
      const mine = e._sandOf === shape;
      const onTop = e.grounded && e.ground === shape;
      if (!mine && !onTop) continue;
      if (!inside(e) || (!mine && e.pos.y > top + 0.05)) { if (mine) { e._sandOf = null; e._sandDepth = 0; } continue; }
      if (!mine) { e._sandOf = shape; e._sandDepth = 0.07; }
      e._sandDepth += q.sink * dt;
      const floor = top - e._sandDepth;
      if (e.pos.y < floor || onTop || mine) { e.pos.y = floor; if (e.vel.y < 0) e.vel.y = 0; }
      if (flow) { e.pos.x += flow.x * dt; e.pos.z += flow.z * dt; }
      if (e._sandDepth >= e.half.y * 2 * 0.95) {
        e._sandOf = null;
        level.effects?.dust({ x: e.pos.x, y: top, z: e.pos.z }, 6, 0.8);
        level.sfx('quicksand');
        if (!e.defeated) { e.pos.y = top; e.markDefeated?.(); }
        e.kill();
      }
    }
  });

  if (level.view) {
    const color = hex(spec.color, 0xe8c26e);
    // Sandkörper-Seiten (sichtbar, wo der Rand offen ist) – verschmolzen
    addStatic(level, box(s.x, s.y - 0.02, s.z, p.x, p.y + (s.y - 0.02) / 2, p.z, 0xc9a050, { r: 0.04, topColor: color }), { material: 'world', castShadow: false, receiveShadow: true });
    // Stehendes Becken: Registry-Modell 'treibsand' (Wirbel zur Mitte, Sandwall ringsum), sonst Körnungs-Textur
    if (!flow && hasModel('treibsand')) {
      const m = getModel('treibsand', { size: [s.x, s.z], depth: 0 });
      m.root.position.set(p.x, top - 0.025, p.z);
      level.view.add(m.root, (dt) => m.update?.(dt, { speed: spec.swirl ?? 0.7 }));
      owner.mesh = m.root;
      return owner;
    }
    // Oberfläche mit Körnung, fließt bei flow
    const tex = sandTexture(color);
    tex.repeat.set(s.x / 2.5, s.z / 2.5);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const geo = new THREE.PlaneGeometry(s.x, s.z);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, top + 0.005, p.z);
    mesh.receiveShadow = true;
    mesh.userData.owned = true;
    mesh.name = 'treibsand';
    let t = 0;
    level.view.add(mesh, (dt) => {
      t += dt;
      if (flow) { tex.offset.x = -(flow.x * t) / 2.5; tex.offset.y = (flow.z * t) / 2.5; }
      else tex.offset.y = Math.sin(t * 0.6) * 0.01;   // leises Wabern
    });
    owner.mesh = mesh;
    owner.dispose = () => tex.dispose();
  }
  return owner;
}

export const TYPES = { quicksand: buildQuicksand };
