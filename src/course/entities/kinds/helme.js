// Trage-Helme (Präzisierung Motor Welt 2; Bauplan „Kanonenbox / Propellerbox / Lichtbox“), Kanonenkugel, Testgeist.
//
// helm_kanone | helm_propeller | helm_licht – liegt/steht im Level; Berühren setzt ihn auf den Kopf
//   (player.wearHelmet, unabhängig vom Power-up; eine Figur trägt höchstens einen Helm). Wirkung: player/helmets.js.
//   Abgeworfene Helme (Treffer, Ducken + Aktion) sind wieder diese Entität (fallen, rollen aus, aufhebbar).
//   { kind: 'helm_kanone', pos: [x, y, z] (Fußpunkt), respawn?: s (0 = nie; sonst liegt nach dem Aufheben bzw. Verlust
//     nach so vielen s wieder einer hier), id?, hidden? }
//   Beispiel: { kind: 'helm_propeller', pos: [4, 1, -20], respawn: 6 }
//
// kanonenkugel – vom Kanonen-Helm abgefeuert: fliegt geradeaus (11 m/s, ohne Schwerkraft, höchstens 1,6 s ≈ 17 m).
//   Trifft sie einen Gegner (enemy) → onHit('cannon', kugel) (Standard-Gegner fliegen weg); trifft sie eine Wand:
//   Formen mit breakable: 'cannon' (Holzwand) → owner.onHit('cannon', kugel, form); breakable: true (Holzkiste, Ziegel)
//   → onHit('cannon') und, falls die Form danach noch steht, onHit('shell') (wirkt wie ein Panzer). Danach zerplatzt
//   sie. Gegner/Entitäten können eigene Wirkung über onHit('cannon') bzw. onCannon(kugel) festlegen.
//   { kind: 'kanonenkugel', pos, dir: [dx, dz], owner: Figur, speed?: 11, life?: 1.6 }
//
// testgeist – Teststub für die Licht-Schnittstelle (Welt 3: Spuk, Kreisgeist): schwebt, folgt langsam der nächsten
//   Figur, verletzt bei Berührung. onLight(dt, figur) – im Lichtkegel des Licht-Helms erstarrt er und löst sich nach
//   insgesamt `fade` s (0,9) Licht auf (besiegt). Ohne Licht erholt er sich langsam.
//   { kind: 'testgeist', pos, speed?: 1.1, fade?: 0.9, follow?: true }
//   Modell 'testgeist' bzw. 'spuk' aus der Registry, sonst eigener Rückfall (state { lit: 0..1, alpha }).

import * as THREE from 'three';
import { Gimmick } from '../gimmick.js';
import { Enemy } from '../Enemy.js';
import { hasModel, getModel } from '../../models/index.js';
import { helmetModel, normalizeHelmet } from '../../player/helmets.js';

// ------------------------------------------------------------------ Helm (aufhebbar)

class HelmItem extends Gimmick {
  constructor(level, spec, name) {
    super(level, spec, `helm_${name}`);
    this.helm = name;
    this.half.set(0.28, 0.2, 0.28);
    this.shadow = 0.38;
    this.home = this.pos.clone();
    this.respawn = spec.respawn ?? 0;
    this.dropped = !!spec.dropped;
    this.bob = 0;
    if (Array.isArray(spec.vel)) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.yaw = spec.yaw ?? -Math.PI / 2;
    this.spin = this.dropped ? 7 : 0;
    if (level.view) this.setModel(helmetModel(name));
  }

  update(dt) {
    if (this.hidden) return;
    this.bob += dt;
    const res = this.moveWithGravity(dt, { gravity: 30 });
    if (this.grounded) { this.vel.x *= Math.max(0, 1 - dt * 6); this.vel.z *= Math.max(0, 1 - dt * 6); this.spin *= Math.max(0, 1 - dt * 5); }
    if (res.hitWall) { this.vel.x *= -0.4; this.vel.z *= -0.4; }
    this.yaw += this.spin * dt;
    if (!this.alive && this.respawn > 0) this.scheduleRespawn();
  }

  onPlayer(player) {
    if (this.hidden || !this.alive || player.dead || player.mode === 'script') return 'none';
    if (player.helmet || player.helmetCooldown > 0) return 'none';
    if (!player.wearHelmet(this.helm)) return 'none';
    this.level.effects?.sparks(this.center(), 10);
    this.scheduleRespawn();
    this.kill();
    return 'collect';
  }

  kill() {
    if (!this.removed && this.respawn > 0 && !this._respawnSet && this.pos.y < this.level.killY) this.scheduleRespawn();
    super.kill();
  }

  /** Nach respawn s liegt wieder ein Helm am Ursprungsort (nur der im Level platzierte, nicht abgeworfene). */
  scheduleRespawn() {
    if (this._respawnSet || !(this.respawn > 0) || this.dropped) return;
    this._respawnSet = true;
    const L = this.level, kind = this.kind, home = [this.home.x, this.home.y, this.home.z], respawn = this.respawn, yaw = this.yaw;
    let t = 0, done = false;
    const off = L.onStep((dt) => {
      if (done) return;
      t += dt;
      if (t < respawn) return;
      done = true;
      queueMicrotask(off);
      const e = L.spawn(kind, { pos: home, respawn, yaw });
      if (e) { e.popT = 0.45; L.effects?.sparks({ x: home[0], y: home[1] + 0.3, z: home[2] }, 10); }
    });
  }

  modelState() { return { fire: 0, spin: 2 + this.spin, on: true }; }

  render(dt, t) {
    super.render(dt, t);
    if (this.model && !this.hidden && this.grounded && !this.dropped) this.model.root.position.y = this.pos.y + 0.05 + Math.sin(this.bob * 2.4) * 0.04;
  }
}

// ------------------------------------------------------------------ Kanonenkugel

const BALL_R = 0.22;
let ballTemplate = null;

function ballModel() {
  if (hasModel('kanonenkugel')) {
    // Registry-Modell: Ø 0,5 m, Mitte bei y = 0,25 → auf die Trefferkugel (Ø 0,44 m) skaliert
    const m = getModel('kanonenkugel');
    const inner = new THREE.Group();
    inner.scale.setScalar((BALL_R * 2) / 0.5);
    while (m.root.children.length) inner.add(m.root.children[0]);
    m.root.add(inner);
    return m;
  }
  if (!ballTemplate) {
    ballTemplate = {
      geo: new THREE.SphereGeometry(BALL_R, 16, 12),
      mat: new THREE.MeshStandardMaterial({ color: 0x2c2f3c, roughness: 0.32, metalness: 0.55 }),
      hi: new THREE.SphereGeometry(BALL_R * 0.32, 8, 6),
      hiMat: new THREE.MeshBasicMaterial({ color: 0xdfe6ff }),
    };
  }
  const root = new THREE.Group();
  const m = new THREE.Mesh(ballTemplate.geo, ballTemplate.mat);
  m.position.y = BALL_R;
  m.castShadow = true;
  const h = new THREE.Mesh(ballTemplate.hi, ballTemplate.hiMat);
  h.position.set(BALL_R * 0.45, BALL_R * 1.5, BALL_R * 0.35);
  root.add(m, h);
  return { root, update() {}, dispose() {} };
}

const BALL_IGNORE = (s) => s.oneWay || s.quicksand || s.trigger;

class Kanonenkugel extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'kanonenkugel');
    this.half.set(BALL_R, BALL_R, BALL_R);
    this.touch = false;
    this.shadow = 0.22;
    this.owner = spec.owner ?? null;
    const d = spec.dir ?? [1, 0];
    const l = Math.hypot(d[0], d[1]) || 1;
    this.dir = { x: d[0] / l, z: d[1] / l };
    this.speed = spec.speed ?? 11;
    this.life = spec.life ?? 1.6;
    this.age = 0;
    this.vel.set(this.dir.x * this.speed, 0, this.dir.z * this.speed);
    this.yaw = Math.atan2(-this.dir.z, this.dir.x);
    this.hitList = [];
    if (level.view) this.setModel(ballModel());
  }

  update(dt) {
    if (!this.alive) return;
    this.age += dt;
    if (this.age > this.life) { this.burst(false); return; }
    // Schon beim Abschuss in einer Wand (direkt davor gefeuert)?
    if (this.age <= dt + 1e-6) {
      const c0 = this.center();
      const inside = this.level.world.overlapAABB(c0, this.half, { filter: (s) => s.solid && !BALL_IGNORE(s) });
      if (inside.length) { this.impact(inside); return; }
    }
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: 0, z: this.vel.z * dt }, { step: 0, ignore: BALL_IGNORE });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    if (res.hitWall || res.ceiling) { this.impact(res.hits); return; }
    if (this.pos.y < this.level.killY) { this.kill(); return; }
    this.hitEntities();
  }

  /** Gegner (und Entitäten mit onCannon) im Weg: Treffer, Kugel zerplatzt. */
  hitEntities() {
    for (const e of this.level.entities) {
      if (e === this || !e.alive || e.removed || e.kind === 'kanonenkugel' || e.carrier) continue;
      const enemy = e.enemy && !e.defeated && e.touch !== false;
      if (!enemy && typeof e.onCannon !== 'function') continue;
      if (!this.overlaps(e, 0.05)) continue;
      if (typeof e.onCannon === 'function') e.onCannon(this);
      else e.onHit?.('cannon', this);
      this.burst(true);
      return;
    }
  }

  /**
   * Wand/Form getroffen: jeder Besitzer mit onHit bekommt onHit('cannon', kugel, form) (Holzwand 'cannon' zerbricht,
   * Gegner fliegen weg, Kristall-/Holzbausteine entscheiden selbst); Zerbrechliches (breakable: true – Kiste, Ziegel),
   * das danach noch steht, zusätzlich onHit('shell'). Dann zerplatzt die Kugel.
   */
  impact(hits) {
    const w = this.level.world;
    const done = new Set();
    for (const s of hits ?? []) {
      const o = s.owner;
      if (!o || done.has(o) || typeof o.onHit !== 'function') continue;
      done.add(o);
      o.onHit('cannon', this, s);
      if (s.breakable === true && w.get(s.id) === s) o.onHit('shell', this, s);
    }
    this.burst(true);
  }

  burst(hit) {
    if (!this.alive) return;
    const c = this.center();
    this.level.effects?.dust({ x: c.x, y: c.y - 0.15, z: c.z }, hit ? 7 : 4, hit ? 1.2 : 0.7);
    if (hit) { this.level.effects?.sparks(c, 6); this.level.sfx('blockhit'); }
    this.kill();
  }

  render(dt, t) {
    this.syncModel();
    if (!this.model) return;
    this.model.root.rotation.y = this.yaw;
    this.model.update?.(dt, { anim: 'fly', speed: this.speed });
  }
}

// ------------------------------------------------------------------ Testgeist (Licht-Schnittstelle)

function ghostModel() {
  for (const n of ['testgeist', 'spuk']) if (hasModel(n)) return getModel(n);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.55;
  root.add(body);
  const mat = new THREE.MeshStandardMaterial({ color: 0xf4f2ff, roughness: 0.4, transparent: true, opacity: 0.85, emissive: 0x2a2850 });
  const geos = [];
  const add = (g, m, x, y, z, s = 1) => { const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.scale.setScalar(s); body.add(me); geos.push(g); return me; };
  add(new THREE.SphereGeometry(0.45, 18, 14), mat, 0, 0, 0);
  const tail = add(new THREE.ConeGeometry(0.3, 0.45, 12), mat, -0.25, -0.3, 0);
  tail.rotation.z = 2.2;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2550 });
  add(new THREE.SphereGeometry(0.07, 8, 6), eyeMat, 0.4, 0.08, 0.14);
  add(new THREE.SphereGeometry(0.07, 8, 6), eyeMat, 0.4, 0.08, -0.14);
  const mouth = add(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6a8a }), 0.42, -0.12, 0, 1);
  mouth.scale.set(0.6, 0.5, 1.4);
  let t = 0;
  return {
    root,
    update(dt, st) {
      t += Math.min(dt, 0.1);
      const lit = st?.lit ?? 0;
      body.position.y = 0.55 + Math.sin(t * 2.2) * 0.08;
      body.rotation.z = lit > 0 ? Math.sin(t * 40) * 0.08 * lit : Math.sin(t * 1.7) * 0.06;
      mat.opacity = 0.85 * (st?.alpha ?? 1);
      mat.emissive.setRGB(0.16 + lit * 0.6, 0.16 + lit * 0.55, 0.31 + lit * 0.2);
    },
    dispose() { for (const g of geos) g.dispose(); mat.dispose(); eyeMat.dispose(); },
  };
}

class Testgeist extends Enemy {
  constructor(level, spec) {
    super(level, spec, 'testgeist');
    this.half.set(0.42, 0.5, 0.42);
    this.shadow = 0.45;
    this.speed = spec.speed ?? 1.1;
    this.fade = spec.fade ?? 0.9;
    this.follow = spec.follow !== false;
    this.light = 0;          // aufsummierte Lichtzeit (s)
    this.litNow = 0;         // s seit dem letzten Licht
    this.lightCalls = 0;
    this.baseY = this.pos.y;
    this.setState('float');
    if (level.view) this.setModel(ghostModel());
  }

  /** Licht-Schnittstelle: im Lichtkegel (Licht-Helm) – erstarrt, löst sich nach `fade` s auf. */
  onLight(dt, player) {
    if (this.defeated) return;
    this.lightCalls++;
    this.light += dt;
    this.litNow = 0;
    if (this.light >= this.fade) this.vanish(player);
  }

  vanish(source) {
    if (this.defeated) return;
    this.setState('vanish');
    this.touch = false;
    this.level.effects?.sparks(this.center(), 18);
    this.level.sfx('powerdown');
    this.markDefeated();
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'vanish') { if (this.stateT > 0.6) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    this.litNow += dt;
    if (this.litNow > 0.5) this.light = Math.max(0, this.light - dt * 0.5);
    const lit = this.litNow < 0.1;
    if (!lit && this.follow && this.playerActive() && this.playerDist() < 14) {
      const tp = this.toPlayer(this._tp ?? (this._tp = {}));
      if (tp.d > 0.6) { this.pos.x += tp.x * this.speed * dt; this.pos.z += tp.z * this.speed * dt; }
      this.faceToward(tp.x, tp.z, dt, 4);
    }
    // schwebt in fester Höhe über dem Boden darunter
    this.pos.y += (this.baseY - this.pos.y) * Math.min(1, dt * 3);
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'vanish') return 'none';
    if (contact.fromAbove) { this.vanish(player); return 'stomp'; }
    return 'hurt';
  }

  modelState() {
    const lit = Math.min(1, this.light / this.fade);
    return { lit: this.litNow < 0.1 ? Math.max(0.3, lit) : lit * 0.5, alpha: this.state === 'vanish' ? Math.max(0, 1 - this.stateT / 0.6) : 1 - lit * 0.6 };
  }
}

// ------------------------------------------------------------------ Registrierung

const helm = (name) => (level, spec) => new HelmItem(level, spec, normalizeHelmet(name));

export const KINDS = {
  helm_kanone: helm('kanone'),
  helm_propeller: helm('propeller'),
  helm_licht: helm('licht'),
  kanonenkugel: (level, spec) => new Kanonenkugel(level, spec),
  testgeist: (level, spec) => new Testgeist(level, spec),
};
