// Gimmick-Entitäten Welt 5 (Präzisierung Motor und Bausteine Welt 5).
//
// schluesselmuenze – Schlüsselmünze (Bauplan 5-1 „5 Schlüsselmünzen öffnen den Zugang“): goldene Münze mit Schlüssel.
//   Berühren (auch Tatze/Feuer/Riesentrank) sammelt sie; HUD „Schlüssel n/N“ (blocks/w5kit.js keyHud) zeigt den Stand der
//   Gruppe. Sind alle Münzen einer Gruppe gesammelt, läuft deren Aktion (Aktionsformat, z. B. { reveal: 'warp1' } – die
//   Warp-Box mit hidden: true erscheint) und die Anzeige leuchtet grün auf. Gesammelte bleiben bis zum Levelende gesammelt
//   (auch nach einem Neustart am Checkpoint).
//   { kind: 'schluesselmuenze', pos: [x, y, z] (Fußpunkt), group: 'schluessel', onAll: Aktion (an irgendeiner Münze der
//     Gruppe; mehrere werden alle ausgeführt), of: N (Standard: Zahl der Münzen der Gruppe im Level), id, hidden }
//   level.keys = { [group]: { n, of, done, onAll } }; Modell 'schluesselmuenze' aus der Registry (Instanzen), sonst eigene.
// schiebekugel – große Kugel für Kugel-Rätsel (Bauplan 5-6 „Kugel auf das P-Feld bugsieren“): Hineinlaufen schiebt sie
//   (Player.move → onPush), Angriffe (Tatze, Schwanzhieb, Faust, Panzer, Wurf, Rutschen, Biss, Stampfwelle daneben)
//   stoßen sie weg; sie rollt mit Reibung aus, prallt an Wänden ab, trägt die Figur (mover) und zählt auf einem
//   Druckfeld (pfeld) als Gewicht (weight 1): Rollt sie langsam über ein Druckfeld, zieht dessen Mulde sie in die Mitte.
//   Fällt sie in einen Abgrund (oder Lava/Gift), erscheint sie nach respawn s wieder am Start.
//   { kind: 'schiebekugel', pos: [x, y, z] (Auflagepunkt), size: 1.6 (Ø), weight: 1, friction: 3.2 (m/s²), kick: 6,
//     push: 1.0 (Schiebe-Faktor), respawn: 1.2 (s, 0 = nie), color: 'rosa' | 'blau' | 'gold' | 'grau', id, hidden }
//   Laufzeit: onField (Druckfeld unter ihr | null), rolled, resets, speed(), info(). Modell 'schiebekugel' (Registry,
//   state { roll, size }) oder eigene Geometrie (Bonbon-Kugel mit Streifen).
// suchscheinwerfer / kippquader / trapez / roehrenkanone / drehbruecke / pendelplattform / flipper / donutblock –
//   die Welt-5-Bausteine sind über eine Hülle auch als kind in enemies/items erlaubt ({ kind: 'suchscheinwerfer', … }).

import * as THREE from 'three';
import { Gimmick, runAction, visDt } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { surfaceNormal } from '../../physics/shapes.js';
import { keyHud } from '../../blocks/w5kit.js';
import { lin, mixc, smooth, colorize, merge } from '../../blocks/kit.js';
import { buildSuchscheinwerfer } from '../../blocks/types/w5_sneak.js';
import { buildKippquader } from '../../blocks/types/w5_temple.js';
import { buildTrapez, buildPendelplattform } from '../../blocks/types/w5_circus.js';
import { buildRoehrenkanone, buildDrehbruecke } from '../../blocks/types/w5_savanna.js';
import { buildDonutblock } from '../../blocks/types/w5_donut.js';

const BUILD = { suchscheinwerfer: buildSuchscheinwerfer, kippquader: buildKippquader, trapez: buildTrapez, roehrenkanone: buildRoehrenkanone, drehbruecke: buildDrehbruecke, pendelplattform: buildPendelplattform, donutblock: buildDonutblock };

// ------------------------------------------------------------------ Schlüsselmünze

function keyCoinTemplate() {
  const root = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, roughness: 0.28, metalness: 0.65, emissive: 0x3a2400, emissiveIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0xb8801e, roughness: 0.35, metalness: 0.6 });
  const prof = [[0, 0.07], [0.34, 0.07], [0.39, 0.085], [0.44, 0.08], [0.46, 0.04], [0.46, -0.04], [0.44, -0.08], [0.39, -0.085], [0.34, -0.07], [0, -0.07]];
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 22);
  g.rotateX(Math.PI / 2);
  const coin = new THREE.Mesh(g, gold);
  coin.position.y = 0.48;
  root.add(coin);
  // Schlüssel als Relief auf beiden Seiten
  const parts = [];
  const ring = new THREE.TorusGeometry(0.1, 0.035, 6, 14); ring.translate(-0.13, 0, 0); parts.push(ring.toNonIndexed());
  const shaft = new THREE.BoxGeometry(0.3, 0.05, 0.05); shaft.translate(0.07, 0, 0); parts.push(shaft.toNonIndexed());
  const bit1 = new THREE.BoxGeometry(0.05, 0.09, 0.05); bit1.translate(0.17, -0.05, 0); parts.push(bit1.toNonIndexed());
  const bit2 = new THREE.BoxGeometry(0.05, 0.07, 0.05); bit2.translate(0.09, -0.04, 0); parts.push(bit2.toNonIndexed());
  const key = merge(parts);
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(key, dark);
    m.position.set(0, 0.48, s * 0.075);
    m.rotation.z = 0.5;
    root.add(m);
  }
  return root;
}

class KeyCoin extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schluesselmuenze');
    this.half.set(0.42, 0.48, 0.42);
    this.group = spec.group ?? 'schluessel';
    level.keys ??= {};
    const g = (level.keys[this.group] ??= { n: 0, of: 0, done: false, actions: [], fixedOf: null, coins: [] });
    g.of++;
    g.coins.push(this);
    if (spec.of) g.fixedOf = spec.of;
    if (spec.onAll) g.actions.push(spec.onAll);
    this.pool = level.view?.pool('schluesselmuenze', () => (hasModel('schluesselmuenze') ? getModel('schluesselmuenze').root : keyCoinTemplate()), { castShadow: false, capacity: 8 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.phase = (this.pos.x * 1.3 + this.pos.z * 0.7) % 6.28;
    this.shadow = 0.38;
    this.render(0, 0);
    // Anzeige, sobald es Schlüsselmünzen gibt (0/N)
    if (level.view) queueMicrotask(() => { const gg = level.keys?.[this.group]; if (gg && !gg.n && !gg.done) keyHud(level).set(this.group, 0, gg.fixedOf ?? gg.of, false); });
  }

  get groupInfo() { return this.level.keys[this.group]; }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (this.idx < 0) return;
    if (this.hidden || !this.alive) { this.pool.hide(this.idx); return; }
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    this.pool.set(this.idx, this.pos.x, this.pos.y + Math.sin(t * 2.4 + this.phase) * 0.07, this.pos.z, t * 2.2 + this.phase, Math.min(1, 0.2 + k));
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'mega' || kind === 'fire') this.collect(); }

  collect() {
    if (!this.alive || this.hidden) return;
    const g = this.groupInfo;
    g.n++;
    const of = g.fixedOf ?? g.of;
    this.level.sfx('key'); this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.5, z: this.pos.z }, 12);
    this.kill();
    const done = g.n >= of && !g.done;
    if (done) {
      g.done = true;
      this.level.sfx('powerup_appear');
      for (const a of g.actions) runAction(this.level, a, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    }
    keyHud(this.level).set(this.group, g.n, of, g.done);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

// ------------------------------------------------------------------ Schiebekugel

const KICK = new Set(['claw', 'punch', 'shell', 'throw', 'slide', 'bite', 'bump', 'pound', 'cannon', 'bomb', 'mega']);
const BALL_COL = { rosa: [0xff7ab8, 0xfff0f6], blau: [0x4a9aff, 0xe8f4ff], gold: [0xffc23a, 0xfff4c8], grau: [0x9a96a8, 0xe4e2ea] };
const N = { x: 0, y: 1, z: 0 };

function ballGeo(size, color) {
  const [a, b] = (BALL_COL[color] ?? BALL_COL.rosa).map((c) => lin(c));
  const g = new THREE.SphereGeometry(size / 2, 26, 18);
  g.translate(0, size / 2, 0);
  // Bonbon-Streifen (um die Rollachse lokal z): beim Rollen um z sichtbar
  return colorize(g.toNonIndexed(), (p, n, o) => {
    const ang = Math.atan2(p.y - size / 2, p.x);
    const stripe = Math.sin(ang * 3 + p.z * 2.2) > 0.35;
    mixc(stripe ? b : a, a, 0.12 * smooth(-1, 1, n.y), o);
  });
}

class PushBall extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schiebekugel');
    this.size = Math.max(0.6, spec.size ?? 1.6);
    this.weight = spec.weight ?? 1;
    this.friction = spec.friction ?? 3.2;
    this.kickSpeed = spec.kick ?? 6;
    this.pushK = spec.push ?? 1.0;
    this.respawnT = spec.respawn ?? 1.2;
    this.home = this.pos.clone();
    this.roll = 0; this.rolled = 0; this.resets = 0; this.lost = 0;
    this.onField = null;
    const r = this.size / 2;
    this.half.set(r * 0.82, r, r * 0.82);
    this.shadow = r * 0.95;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: this.pos.x, cz: this.pos.z };
    this._touch = false;
    this.shape = this.addSolid({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: r * 0.86, y0: this.pos.y, y1: this.pos.y + this.size * 0.97, noStep: true, camIgnore: true, mover: this.mover, tag: 'schiebekugel' });
    this.ignoreOwn = (s) => s.owner === this || !!s.quicksand || !!s.quicksandFloor;
    if (level.view) {
      if (hasModel('schiebekugel')) this.setModel(getModel('schiebekugel', { size: this.size, color: spec.color ?? 'rosa' }));
      else {
        const root = new THREE.Group();
        const spin = new THREE.Group();
        spin.position.y = this.size / 2;
        const m = new THREE.Mesh(ballGeo(this.size, spec.color ?? 'rosa'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.05 }));
        m.position.y = -this.size / 2;
        m.castShadow = true;
        spin.add(m);
        root.add(spin);
        this.spin = spin;
        this.setModel({ root, update() {}, dispose() { m.geometry.dispose(); m.material.dispose(); } });
      }
    }
  }

  speed() { return Math.hypot(this.vel.x, this.vel.z); }

  placeShape() {
    const s = this.shape;
    s.x = this.pos.x; s.z = this.pos.z; s.y0 = this.pos.y; s.y1 = this.pos.y + this.size * 0.97;
    if (this.shapes.length) this.level.world.update(s.id);
  }

  /** Hineinlaufen (Player.move): anschieben in Richtung von der Figur weg. */
  onPush(player, dir, speed) {
    if (this.hidden || this.lost) return;
    let dx = this.pos.x - player.pos.x, dz = this.pos.z - player.pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) { dx = dir.x; dz = dir.z; } else { dx /= l; dz /= l; }
    const want = Math.min(8, (Math.max(speed, player.hSpeed()) * 1.05 + 0.5) * this.pushK / (0.7 + 0.2 * this.size));
    const along = this.vel.x * dx + this.vel.z * dz;
    if (along < want) { this.vel.x += dx * (want - along); this.vel.z += dz * (want - along); }
    this.pushes = (this.pushes ?? 0) + 1;
  }

  onHit(kind, source) {
    if (this.hidden || this.lost || !KICK.has(kind) || !source?.pos) return;
    let dx = this.pos.x - source.pos.x, dz = this.pos.z - source.pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) { const f = source.facingVec?.() ?? { x: 1, z: 0 }; dx = f.x; dz = f.z; } else { dx /= l; dz /= l; }
    const v = this.kickSpeed / (0.7 + 0.2 * this.size);
    this.vel.x = dx * v; this.vel.z = dz * v;
    this.vel.y = Math.max(this.vel.y, 1.5);
    this.grounded = false;
    this.level.sfx('bump');
  }

  /** Druckfeld (pfeld) unter der Kugel (Mitte über dem Feld) oder null. */
  fieldBelow() {
    for (const e of this.level.entities) {
      if (e.kind !== 'pfeld' || e.removed || e.hidden) continue;
      if (Math.abs(this.pos.x - e.pos.x) <= e.w / 2 && Math.abs(this.pos.z - e.pos.z) <= e.d / 2 && Math.abs(this.pos.y - (e.top ?? e.pos.y)) < 0.6) return e;
    }
    return null;
  }

  reset() {
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.lost = 0;
    this.grounded = false;
    this.setSolid(true);
    this.placeShape();
    this.popT = 0.45;
    this.resets++;
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.size * 0.5, z: this.pos.z }, 10);
  }

  update(dt) {
    const m = this.mover;
    m.dx = m.dy = m.dz = m.vx = m.vy = m.vz = 0;
    if (this.hidden) return;
    if (this.lost) {
      this.lost += dt;
      if (this.respawnT > 0 && this.lost > this.respawnT) this.reset();
      return;
    }
    const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
    const g = this.grounded ? this.ground : null;
    if (g?.mover && g.owner !== this) { this.pos.x += g.mover.dx; this.pos.y += g.mover.dy; this.pos.z += g.mover.dz; }
    // Druckfeld-Mulde: langsam darüber → zur Mitte ziehen, dort liegen bleiben
    this.onField = this.grounded ? this.fieldBelow() : null;
    if (g) {
      const hv = this.speed();
      let fr = g.ice ? this.friction * 0.15 : this.friction;
      if (this.onField && hv < 2.2) {
        const f = this.onField, dx = f.pos.x - this.pos.x, dz = f.pos.z - this.pos.z;
        this.vel.x += dx * 9 * dt; this.vel.z += dz * 9 * dt;
        fr *= 2.2;
      }
      if (hv > 1e-4) { const nv = Math.max(0, hv - fr * dt); this.vel.x *= nv / hv; this.vel.z *= nv / hv; }
      if (g.type === 'ramp') { const n = surfaceNormal(g, N); this.vel.x += n.x * 14 * dt; this.vel.z += n.z * 14 * dt; }
    }
    this.vel.y = Math.max(this.vel.y - 30 * dt, -24);
    if (this.grounded && this.vel.y < -2) this.vel.y = -2;
    const vx0 = this.vel.x, vz0 = this.vel.z;
    const c = this.center();
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, {
      step: Math.min(0.35, this.size * 0.22), snap: this.grounded ? 0.3 : 0, ignore: this.ignoreOwn,
    });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.grounded = res.grounded;
    this.ground = res.ground;
    if (res.grounded && this.vel.y < 0) this.vel.y = 0;
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;
    if (res.hitWall) {
      const n = res.wallNormal, d = vx0 * n.x + vz0 * n.z;
      if (d < 0) { this.vel.x = vx0 - n.x * d * 1.45; this.vel.z = vz0 - n.z * d * 1.45; }
    }
    // Abgrund, Lava, Gift → später wieder am Start
    const hz = this.level.world.overlapAABB(this.center(), this.half, { filter: (s) => !!s.kill });
    if (this.pos.y < this.level.killY || hz.length) { this.lost = 1e-3; this.setSolid(false); this.level.sfx('fall'); return; }
    const dist = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (dist > 1e-5) {
      this.rolled += dist;
      this.roll += dist / (this.size / 2);
      if (this.speed() > 0.15) this.yaw = Math.atan2(-this.vel.z, this.vel.x);
    }
    this.placeShape();
    m.dx = this.pos.x - ox; m.dy = this.pos.y - oy; m.dz = this.pos.z - oz;
    m.vx = m.dx / dt; m.vy = m.dy / dt; m.vz = m.dz / dt;
    m.cx = this.pos.x; m.cz = this.pos.z;
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    const mm = this.model;
    if (!mm) return;
    mm.root.visible = !this.hidden && !this.lost;
    if (!mm.root.visible) return;
    mm.root.position.copy(this.pos);
    mm.root.rotation.y = this.yaw;
    if (this.spin) this.spin.rotation.z = -this.roll;
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    mm.root.scale.setScalar(k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5)) : 1);
    mm.update?.(dt, { roll: this.roll, size: this.size, speed: this.speed() });
  }

  info() {
    return { x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), speed: +this.speed().toFixed(2), rolled: +this.rolled.toFixed(2), onField: this.onField?.spec?.id ?? (this.onField ? 'pfeld' : null), grounded: this.grounded, ground: this.ground?.tag ?? null, resets: this.resets, lost: !!this.lost };
  }
}

// ------------------------------------------------------------------ Hüllen: Welt-5-Bausteine auch als kind

class BlockShell extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.touch = false;
    this.shadow = 0;
    this.handle = BUILD[kind]?.(level, { ...spec, type: kind }) ?? null;
    // Griff des Bausteins statt der Hülle unter der Daten-Id (Level.spawn trägt die Hülle erst danach ein → nachziehen)
    if (spec.id && this.handle) queueMicrotask(() => { if (level.named.get(spec.id) === this) level.named.set(spec.id, this.handle); });
  }
  info() { return this.handle?.info?.() ?? null; }
}

const shell = (kind) => (level, spec) => new BlockShell(level, spec, kind);

export const KINDS = {
  schluesselmuenze: (level, spec) => new KeyCoin(level, spec),
  schiebekugel: (level, spec) => new PushBall(level, spec),
  suchscheinwerfer: shell('suchscheinwerfer'),
  kippquader: shell('kippquader'),
  trapez: shell('trapez'),
  roehrenkanone: shell('roehrenkanone'),
  drehbruecke: shell('drehbruecke'),
  pendelplattform: shell('pendelplattform'),
  donutblock: shell('donutblock'),
};
