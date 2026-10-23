// Krümel als Spielfigur des Dioramas (Präzisierung „Leistung und Level-Haken 2“: LEVEL.diorama.figure = 'kruemel';
// aus levels/w3/_helpers_c.js in den Motor übernommen). Registry-Modell `kruemel` × 1,35 mit Kapitänsmütze, Rucksack mit
// Kartenrolle und rot-weißem Schwimmring beim Schwimmen; Animationen idle/hop/cheer/scared, swim/pipe/dig; info() für
// Tests. Steuerung bleibt der DioramaController (kein Sprung, 3,5 m/s).

import * as THREE from 'three';
import { getModel } from '../models/index.js';
import { Build, TAU } from '../models/lib/kit.js';

const KRUEMEL_SCALE = 1.35;       // Modell ≈ 0,55 m Kopf, Ohren bis 0,78 m → ≈ 0,75 / 1,05 m
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

/** Kapitänsmütze, Rucksack mit Karte, Schwimmring (lokal wie das Hasenmodell: Blick +X, Fußpunkt 0). */
function kruemelGear() {
  const cap = new Build();
  cap.cyl(0.068, 0.082, 0.07, 0xfaf8f2, { p: [0, 0.035, 0] }, 14);
  cap.cyl(0.071, 0.071, 0.018, 0xfaf8f2, { p: [0, 0.075, 0], s: [1.15, 1, 1.05] }, 14);
  cap.cyl(0.084, 0.084, 0.022, 0x1e2a5a, { p: [0, 0.012, 0] }, 14);
  cap.add(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 14, 1, false, -Math.PI / 2, Math.PI), 0x1e2a5a, { p: [0.03, 0.002, 0], r: [0, Math.PI / 2, 0] });
  // goldener Anker vorn
  cap.box(0.006, 0.034, 0.01, 0xffc21a, { p: [0.083, 0.04, 0] }, 0);
  cap.box(0.006, 0.008, 0.026, 0xffc21a, { p: [0.083, 0.052, 0] }, 0);
  cap.torus(0.012, 0.004, 0xffc21a, { p: [0.083, 0.028, 0], r: [0, Math.PI / 2, Math.PI] }, 4, 8, Math.PI);
  const pack = new Build();
  pack.box(0.1, 0.13, 0.15, 0x9a5a2a, { p: [0, 0, 0] }, 0.025);
  pack.box(0.03, 0.08, 0.11, 0x7a4420, { p: [-0.06, -0.01, 0] }, 0.012);
  pack.cyl(0.028, 0.028, 0.17, 0xf6e8c0, { p: [0.005, 0.085, 0], r: [Math.PI / 2, 0, 0] }, 10);
  pack.cyl(0.03, 0.03, 0.012, 0xc84a3a, { p: [0.005, 0.085, 0.06], r: [Math.PI / 2, 0, 0] }, 10);
  for (const s of [-1, 1]) pack.box(0.11, 0.012, 0.016, 0x6a3a1a, { p: [0.08, 0.02, s * 0.06], r: [0, 0, -0.5] }, 0);
  const ring = new Build();
  for (let i = 0; i < 8; i++) ring.torus(0.19, 0.05, i % 2 ? 0xffffff : 0xe8322a, { r: [Math.PI / 2, 0, (i / 8) * TAU] }, 6, 6, TAU / 8 + 0.02);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  const mk = (b) => new THREE.Mesh(b.geometry(), mat);
  return { cap: mk(cap), pack: mk(pack), ring: mk(ring), mat };
}

export class KruemelRig {
  constructor(view, player) {
    this.view = view;
    this.player = player;
    this.kind = 'kruemel';
    this.hull = new THREE.Group();
    this.hull.name = 'kruemel';
    this.tilt = new THREE.Group();
    this.hull.add(this.tilt);
    view.three.add(this.hull);
    this.model = getModel('kruemel');
    // Sonnenschatten nur vom Körper (Augen, Ohren, Glitzer ohne: Budget)
    let body = null;
    this.model.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; if (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count) body = o; } });
    if (body) body.castShadow = true;
    this.tilt.add(this.model.root);
    // Hüpf-Gelenk des Hasenmodells (bunny_small → hop), daran hängen Mütze und Rucksack
    const hop = this.model.root.children[0]?.children?.[0] ?? this.model.root;
    this.gear = kruemelGear();
    this.gear.cap.position.set(0.16, 0.5, 0);
    this.gear.cap.rotation.set(0, 0, -0.28);
    this.gear.pack.position.set(-0.14, 0.26, 0);
    hop.add(this.gear.cap, this.gear.pack);
    this.gear.ring.position.set(0.04, 0.2, 0);
    this.gear.ring.visible = false;
    this.tilt.add(this.gear.ring);
    this.yaw = player.yaw;
    this.scale = KRUEMEL_SCALE;
    this.squash = 0; this.squashV = 0;
    this.lastMode = player.mode;
    this.anim = 'idle';
    this.swimK = 0;
    this.t = 0;
  }

  update(dt, t) {
    const p = this.player;
    this.t += dt;
    this.hull.position.copy(p.pos);
    this.yaw += wrap(p.yaw - this.yaw) * (1 - Math.exp(-14 * dt));
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const swim = p.mode === 'swim';
    const pipe = p.mode === 'script' && p.state === 'pipe';
    let anim;
    if (p.treasure || p.state === 'victory') anim = 'cheer';
    else if (p.dead || (p.invuln > 1.2 && p.mode === 'air')) anim = 'scared';
    else if (swim || pipe || p.digging) anim = 'idle';
    else if (p.mode === 'air') anim = 'hop';
    else anim = speed < 0.3 ? 'idle' : 'hop';
    this.anim = swim ? 'swim' : pipe ? 'pipe' : p.digging ? 'dig' : anim;
    // Schwimmen: Schwimmring sichtbar, Krümel sitzt tiefer im Wasser und wippt; Röhre: liegt in Fahrtrichtung
    this.swimK = damp(this.swimK, swim ? 1 : 0, 8, dt);
    this.gear.ring.visible = this.swimK > 0.2;
    let tx = 0, tz = 0, ty = 0;
    if (swim) { ty = -0.32 + Math.sin(this.t * 4.2) * 0.03; tz = Math.sin(this.t * 6) * 0.06; }
    else if (pipe) { tz = -0.5; }
    else if (p.digging) { tz = -0.45 + Math.sin(this.t * 22) * 0.12; ty = -0.04; }
    this.tilt.position.y = damp(this.tilt.position.y, ty, 10, dt);
    this.tilt.rotation.z = damp(this.tilt.rotation.z, tz, 10, dt);
    this.tilt.rotation.x = damp(this.tilt.rotation.x, tx, 10, dt);
    if (p.digging && Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) this.view.effects?.dust({ x: p.pos.x, y: p.pos.y, z: p.pos.z }, 2, 0.5);
    if (swim && Math.floor(this.t * 2.5) !== Math.floor((this.t - dt) * 2.5) && speed > 0.6) this.view.effects?.ring?.({ x: p.pos.x, y: (p.water?.top ?? p.pos.y + 0.4) + 0.02, z: p.pos.z }, 0.5);
    // Landung federt
    if (this.lastMode === 'air' && p.mode === 'ground') this.squashV -= Math.min(5, 1.5 + Math.abs(p.lastLandVy ?? 0) * 0.25);
    this.lastMode = p.mode;
    this.squashV += (-90 * this.squash - 12 * this.squashV) * dt;
    this.squash += this.squashV * dt;
    const sq = Math.max(-0.3, Math.min(0.3, this.squash));
    this.scale = damp(this.scale, KRUEMEL_SCALE * (p.big ? 1 : 0.78), 10, dt);
    this.hull.scale.set(this.scale * (1 - sq * 0.5), this.scale * (1 + sq), this.scale * (1 - sq * 0.5));
    this.hull.rotation.set(0, this.yaw + (p.dead ? this.t * 9 : 0), 0);
    const blink = (p.invuln > 0 && Math.floor(t * 16) % 2 === 0) || (p.dead && p.deathCause === 'fall' && p.script?.t > 0.3);
    this.hull.visible = !blink;
    try { this.model.update(dt, { anim }); } catch (err) { console.error('Krümel-Animation fehlgeschlagen:', err); }
  }

  info() { return { kind: this.kind, anim: this.anim, ring: this.gear.ring.visible, cap: !!this.gear.cap.parent, pack: !!this.gear.pack.parent }; }

  dispose() {
    for (const k of ['cap', 'pack', 'ring']) this.gear[k].geometry.dispose();
    this.gear.mat.dispose();
    this.model.dispose?.();
    this.hull.parent?.remove(this.hull);
  }
}
