// Gimmick-Entitäten Welt 4 (Kurs-Modus). Alle auch als `type` in LEVEL.segments verwendbar (blocks/types/w4_misc.js).
// Aktionen (reward …) im Format von entities/gimmick.js ({ reveal, spawn, star, power, coins … }).
//
// stachelstange – drehende Stange mit Stachelkugeln (4-5): Kugeln (und optional die Stange) verletzen die Figur; die Nabe
//   steht auf einer Säule (fest). Mit attach fährt sie auf einer beweglichen Plattform mit (mover-Id, Fahrzeug,
//   Schwank-/Drehplattform-Id: Versatz zur Startlage bleibt erhalten).
//   { kind: 'stachelstange', pos: [x, y, z] (Fußpunkt der Säule), height: 1 (Höhe der Stange über pos), length: 4
//     (Armlänge ab Nabe), arms: 1 (2 = beidseitig, 3, 4 …), balls: 3 (Stachelkugeln je Arm, gleichmäßig bis zur
//     Spitze), radius: 0.42 (Kugelradius), speed: 1.2 (rad/s, + = gegen den Uhrzeigersinn von oben bzw. vorn),
//     angle: 0 (Startwinkel), axis: 'y' (kreist waagerecht) | 'x' | 'z' (senkrechtes Rad um diese Achse), bar: false
//     (true: auch die Stange verletzt), post: true (Säule fest), attach: id, id }
//   Laufzeit: angle, hits, balls() → [[x, y, z], …].
// roulette_block – Roulette-Block (4-2): das Symbol wechselt im Takt der Musik (Taktuhr blocks/w4kit.js beatClock: je
//   `beats` Zählzeiten ein Symbol; mit period stattdessen feste Sekunden); Kopfstoß (oder Stampfen) gibt das gerade
//   gezeigte Power-up (bzw. Münzen/1-Up), danach leerer Block.
//   { kind: 'roulette_block', pos (Mitte der Unterseite, 1-m-Würfel), items: ['wachstumsbeere', 'krallen', 'funken',
//     'stern'] (Power-up-Namen, 'oneup', 'coin', 'coins:5' oder Aktionen), beats: 1, period: (s, optional), id, hidden }
//   Laufzeit: current (Index), item (Name des gezeigten Symbols), used, given.
// sternring / sternmuenze – Sternring (4-2, wie roter_ring): Durchlaufen → acht Sternmünzen für `time` s (Zeitanzeige über
//   der Figur, grün); alle eingesammelt → Belohnung (Aktion), Zeit um → Münzen weg, mit retry erneut startbar.
//   { kind: 'sternring', pos: [x, y, z] (Fußpunkt; Ring-Mitte bei y + 1,2), yaw: π/2 (Durchlaufrichtung entlang Z),
//     coins: [[x, y, z], …] | { from, to, n } | { pos, r, n } (Standard: Kreis r 3 um pos, 8 Münzen), time: 10,
//     reward: Aktion (Standard { power: 'oneup' }) | star: Index, retry: true, id, hidden }
//   Laufzeit: state ('idle'|'active'|'done'), got, timeLeft. sternmuenze einzeln: { kind: 'sternmuenze', pos, hidden }.
// Modelle aus der Registry, sobald vorhanden: 'stachelstange' ({ length, arms, balls, radius }, state { angle }),
// 'roulette_block' (Inhalt-Symbole darin, wie Sonder-Bausteine), 'sternring' (state { anim }), 'sternmuenze' (Instanzen);
// sonst eigene Geometrie.

import * as THREE from 'three';
import { Gimmick, runAction, contentAction, countdown, visDt } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { powerupModel } from '../visuals.js';
import { normalizePower } from '../../player/powers.js';
import { lin, mixc, smooth, colorize, merge } from '../../blocks/kit.js';
import { figures } from '../../blocks/w2kit.js';
import { beatClock } from '../../blocks/w4kit.js';

// =============================================================================================
// Stachelstange
// =============================================================================================

function spikeBallGeo(r) {
  const parts = [];
  const core = new THREE.IcosahedronGeometry(r * 0.72, 1);
  const steel = lin(0x6a6e7c), hi = lin(0xd8dce8), dark = lin(0x2a2c36);
  parts.push(colorize(core, (p, n, o) => mixc(dark, steel, smooth(-0.6, 0.8, n.y * 0.6 + n.z * 0.3), o)));
  const dirs = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  const seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const d = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize();
    const k = `${d.x.toFixed(2)}|${d.y.toFixed(2)}|${d.z.toFixed(2)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const c = new THREE.ConeGeometry(r * 0.2, r * 0.62, 5);
    c.translate(0, r * 0.72 + r * 0.26, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
    parts.push(colorize(c, (p, n, o) => mixc(steel, hi, smooth(r * 0.8, r * 1.3, p.length()), o)));
  }
  return merge(parts);
}

function stangeModel(o) {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const H = o.height, L = o.length, R = o.radius;
  const steel = lin(0x7a7e8c), steelHi = lin(0xd0d4e0), sand = lin(0xd2b080), sandD = lin(0x8a6a44), gold = lin(0xe0a840);
  // Säule (Ruinen-Stein) und Bronze-Kappe: ein Mesh
  const fixed = [];
  if (o.post) {
    const post = new THREE.CylinderGeometry(0.3, 0.38, H, 10, 2);
    post.translate(0, H / 2, 0);
    fixed.push(colorize(post, (p, n, out) => { mixc(sandD, sand, smooth(-0.6, 0.8, n.x * -0.5 + n.z * 0.5), out); if ((Math.floor(p.y * 3) & 1) === 1) { out[0] *= 0.93; out[1] *= 0.93; out[2] *= 0.93; } }));
  }
  const cap = new THREE.SphereGeometry(0.3, 12, 8);
  cap.translate(0, H, 0);
  fixed.push(colorize(cap, (p, n, out) => mixc(mixc(gold, [0, 0, 0], 0.4, [0, 0, 0]), gold, smooth(-0.4, 0.9, n.y), out)));
  const fixedMesh = new THREE.Mesh(merge(fixed), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 }));
  fixedMesh.castShadow = true;
  root.add(fixedMesh);
  // Arme mit Stachelkugeln: ein Mesh, das sich dreht
  const arms = [];
  for (let a = 0; a < o.arms; a++) {
    const ang = (a / o.arms) * Math.PI * 2;
    const rod = new THREE.CylinderGeometry(0.08, 0.08, L, 8);
    rod.rotateZ(Math.PI / 2);
    rod.translate(L / 2, 0, 0);
    const parts = [colorize(rod, (p, n, out) => mixc(steel, steelHi, smooth(-0.5, 0.9, n.y), out))];
    for (let k = 1; k <= o.balls; k++) { const b = spikeBallGeo(R); b.translate((L * k) / o.balls, 0, 0); parts.push(b); }
    const g = merge(parts);
    if (o.axis === 'y') g.rotateY(ang); else g.rotateZ(ang);
    arms.push(g);
  }
  const armMesh = new THREE.Mesh(merge(arms), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.6 }));
  armMesh.castShadow = true;
  spin.add(armMesh);
  spin.position.y = H;
  if (o.axis === 'x') spin.rotation.y = Math.PI / 2;
  return {
    root,
    update(dt, st) { if (o.axis === 'y') spin.rotation.y = st.angle ?? 0; else spin.rotation.z = st.angle ?? 0; },
    dispose() { fixedMesh.geometry.dispose(); fixedMesh.material.dispose(); armMesh.geometry.dispose(); armMesh.material.dispose(); },
  };
}

/** Modell der Registry; höher als 0,75 m → auf einer Ruinensäule. */
function regStange(o) {
  const m = getModel('stachelstange', { length: o.length * 2, balls: o.balls, sides: o.arms >= 2 ? 2 : 1 });
  const bar = m.root.userData.barHeight ?? 0.75;
  const root = new THREE.Group();
  const lift = Math.max(0, o.height - bar);
  m.root.position.y = lift;
  root.add(m.root);
  let col = null;
  if (lift > 0.05) {
    const g = new THREE.CylinderGeometry(0.4, 0.46, lift, 12, 2);
    g.translate(0, lift / 2, 0);
    const sand = lin(0xe8d0a0), sandD = lin(0xa8845a);
    col = new THREE.Mesh(colorize(g, (p, n, out) => { mixc(sandD, sand, smooth(-0.6, 0.8, n.x * -0.5 + n.z * 0.5), out); if ((Math.floor(p.y * 2.5) & 1) === 1) { out[0] *= 0.92; out[1] *= 0.92; out[2] *= 0.92; } }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    col.castShadow = true; col.receiveShadow = true;
    root.add(col);
  }
  return { root, update: (dt, st) => m.update?.(dt, st), dispose() { m.dispose?.(); if (col) { col.geometry.dispose(); col.material.dispose(); } } };
}

class Stachelstange extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'stachelstange');
    this.touch = false;
    this.half.set(0.35, 0.5, 0.35);
    this.length = spec.length ?? 4;
    this.arms = Math.max(1, spec.arms ?? 1);
    this.nBalls = Math.max(1, spec.balls ?? 3);
    this.ballR = spec.radius ?? 0.42;
    this.speed = spec.speed ?? 1.2;
    this.angle = spec.angle ?? 0;
    this.axis = spec.axis === 'x' || spec.axis === 'z' ? spec.axis : 'y';
    // Modell der Registry (Bronze-Sockel, Stange in 0,75 m Höhe; Armlänge in 0,25-m-Schritten) für axis y mit 1–2 Armen
    this.reg = hasModel('stachelstange') && this.axis === 'y' && this.arms <= 2;
    if (this.reg) this.length = Math.max(0.75, Math.round(this.length * 4) / 4);
    this.height = spec.height ?? (this.reg ? 0.75 : 1);
    this.hits = 0;
    this.base = this.pos.clone();
    this.attachRef = null;
    this.attach0 = null;
    this._pts = [];
    this._b = new THREE.Vector3();
    this.hitter = { pos: new THREE.Vector3(), kind: 'stachelkugel' };
    if (spec.post !== false) this.postShape = this.addSolid({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: this.reg ? 0.45 : 0.34, y0: this.pos.y, y1: this.pos.y + this.height - 0.12, tag: 'stachelstange:saeule' });
    if (level.view) {
      const o = { length: this.length, arms: this.arms, balls: this.nBalls, radius: this.ballR, height: this.height, axis: this.axis, post: spec.post !== false };
      this.setModel(this.reg ? regStange(o) : stangeModel(o));
    }
  }

  /** Mitfahren: Versatz zur Startlage des Trägers (mover, Plattform mit pos) übernehmen. */
  follow() {
    const id = this.spec.attach;
    if (!id) return;
    const t = this.attachRef ??= this.level.named.get(id) ?? null;
    if (!t || t.attached) return;   // Fahrzeuge (vehicle) nehmen ihre Unterobjekte selbst mit
    const q = t.pm?.pos ?? t.pos;
    if (!q) return;
    if (!this.attach0) { this.attach0 = { x: q.x, y: q.y, z: q.z }; return; }
    const nx = this.base.x + q.x - this.attach0.x, ny = this.base.y + q.y - this.attach0.y, nz = this.base.z + q.z - this.attach0.z;
    const dx = nx - this.pos.x, dy = ny - this.pos.y, dz = nz - this.pos.z;
    this.pos.set(nx, ny, nz);
    if (this.postShape && (dx || dy || dz)) {
      const s = this.postShape;
      s.x += dx; s.z += dz; s.y0 += dy; s.y1 += dy;
      s.mover = t.mover ?? s.mover;
      for (const sid of this.shapes) this.level.world.update(sid);
    }
  }

  /** Lage der Stachelkugeln (Welt). */
  balls() {
    const out = this._pts;
    out.length = 0;
    const h = this.pos.y + this.height;
    for (let a = 0; a < this.arms; a++) {
      const ang = this.angle + (a / this.arms) * Math.PI * 2;
      const c = Math.cos(ang), s = Math.sin(ang);
      for (let k = 1; k <= this.nBalls; k++) {
        const d = (this.length * k) / this.nBalls;
        if (this.axis === 'y') out.push([this.pos.x + c * d, h, this.pos.z - s * d]);
        else if (this.axis === 'z') out.push([this.pos.x + c * d, h + s * d, this.pos.z]);
        else out.push([this.pos.x, h + s * d, this.pos.z - c * d]);
      }
    }
    return out;
  }

  update(dt) {
    this.follow();
    if (this.hidden) return;
    this.angle += this.speed * dt;
    const pts = this.balls();
    const reach = this.ballR + 0.36;
    for (const p of figures(this.level)) {
      if (p.mode === 'script' || p.invulnerable) continue;
      const c = p.center();
      let hit = null;
      for (const q of pts) {
        const dx = c.x - q[0], dy = (c.y - q[1]) * 0.85, dz = c.z - q[2];
        if (dx * dx + dy * dy + dz * dz < reach * reach) { hit = q; break; }
      }
      if (!hit && this.spec.bar) hit = this.barHit(c);
      if (hit) {
        this.hitter.pos.set(hit[0], hit[1], hit[2]);
        if (p.hurt(this.hitter)) this.hits++;
      }
    }
  }

  /** Abstand Figur ↔ Stange (Strecke Nabe → Spitze je Arm). */
  barHit(c) {
    const h = this.pos.y + this.height;
    for (let a = 0; a < this.arms; a++) {
      const ang = this.angle + (a / this.arms) * Math.PI * 2, co = Math.cos(ang), si = Math.sin(ang);
      const tip = this.axis === 'y' ? [this.pos.x + co * this.length, h, this.pos.z - si * this.length]
        : this.axis === 'z' ? [this.pos.x + co * this.length, h + si * this.length, this.pos.z] : [this.pos.x, h + si * this.length, this.pos.z - co * this.length];
      const ax = tip[0] - this.pos.x, ay = tip[1] - h, az = tip[2] - this.pos.z;
      const L2 = ax * ax + ay * ay + az * az;
      const t = Math.max(0, Math.min(1, ((c.x - this.pos.x) * ax + (c.y - h) * ay + (c.z - this.pos.z) * az) / L2));
      const px = this.pos.x + ax * t, py = h + ay * t, pz = this.pos.z + az * t;
      if (Math.hypot(c.x - px, (c.y - py) * 0.85, c.z - pz) < 0.5) return [px, py, pz];
    }
    return null;
  }

  modelState() { return { angle: this.angle }; }
}

// =============================================================================================
// Roulette-Block (im Takt)
// =============================================================================================

/** Inhalt → Symbol des Modells roulette_block_w4 (null = kein passendes Symbol). */
function rouletteSymbol(c) {
  if (!c) return null;
  if (c.power) {
    const p = normalizePower(c.power);
    return { wachstumsbeere: 'pilz', beere: 'pilz', pilz: 'pilz', funken: 'blume', krallen: 'krallen', stern: 'stern' }[p] ?? null;
  }
  if (c.coins > 0) return 'muenze';
  return null;
}

class RouletteBlockW4 extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'roulette_block');
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], tag: 'block:roulette_block' });
    this.names = (spec.items ?? spec.contents ?? ['wachstumsbeere', 'krallen', 'funken', 'stern']).map((c) => (typeof c === 'string' ? c : c?.power ?? 'coin'));
    this.items = (spec.items ?? spec.contents ?? ['wachstumsbeere', 'krallen', 'funken', 'stern']).map((c) => contentAction(c));
    this.beats = Math.max(0.25, spec.beats ?? 1);
    this.period = spec.period ?? null;
    this.clock = this.period ? null : beatClock(level);
    this.used = false;
    this.given = null;
    this.n = 0;
    this.anim = 'idle';
    this.icons = [];
    this.lastIdx = -1;
    this.tick = 0;
    // Modell 'roulette_block_w4' (Symbole pilz|blume|krallen|stern|muenze), sonst Glaswürfel aus Welt 1 mit Power-up-Modellen
    this.symbols = this.items.map((c) => rouletteSymbol(c));
    this.w4 = hasModel('roulette_block_w4') && this.symbols.every(Boolean);
    if (level.view) {
      if (this.w4) this.setModel(getModel('roulette_block_w4'));
      else {
        this.setModel(getModel('roulette_block'));
        const inner = this.model.root.userData.inner ?? this.model.root;
        for (const c of this.items) {
          const icon = c?.power ? powerupModel(normalizePower(c.power)) : getModel('coin');
          icon.root.scale.setScalar(0.72);
          icon.root.visible = false;
          inner.add(icon.root);
          this.icons.push(icon);
        }
      }
    }
  }

  get current() {
    const n = Math.max(1, this.items.length);
    const k = this.period ? Math.floor(this.level.time / this.period) : Math.floor((this.clock?.beat ?? 0) / this.beats);
    return ((k % n) + n) % n;
  }

  get item() { return this.names[this.current]; }

  bumpTop() {
    this.n++;
    this.anim = 'bump';
    for (const e of this.level.entities) {
      if (!e.alive || e === this) continue;
      if (Math.abs(e.pos.x - this.pos.x) < 0.8 && Math.abs(e.pos.z - this.pos.z) < 0.8 && Math.abs(e.pos.y - (this.pos.y + 1)) < 0.35) e.onHit?.('bump', this);
    }
  }

  onPound(player) { this.onBump(player); }

  onBump() {
    this.bumpTop();
    if (this.used || this.hidden) { this.level.sfx('blockhit'); return; }
    this.used = true;
    const i = this.current;
    const c = this.items[i];
    this.given = this.names[i];
    const top = [this.pos.x, this.pos.y + 1, this.pos.z];
    if (c?.power) {
      this.level.spawn('powerup', { pos: top, power: normalizePower(c.power), emerge: true });
      this.level.sfx('powerup_appear');
    } else runAction(this.level, c, { pos: top, source: this });
    this.level.sfx('blockhit');
    if (this.level.view && !this.w4) {
      for (const ic of this.icons) ic.dispose?.();
      this.icons = [];
      this.setModel(getModel('used_block'));
    }
  }

  render(dt, t) {
    super.render(dt, t);
    if (this.w4 && this.model && !this.used) {
      const cur = this.current;
      if (cur !== this.lastIdx) { this.lastIdx = cur; this.tick = 1; }
      this.tick = Math.max(0, this.tick - dt * 6);
      this.model.root.scale.setScalar(1 + this.tick * 0.06);
    }
    if (this.used || !this.icons.length || !this.model) return;
    const cur = this.current;
    if (cur !== this.lastIdx) { this.lastIdx = cur; this.tick = 1; }
    this.tick = Math.max(0, this.tick - dt * 6);
    this.model.root.scale.setScalar(1 + this.tick * 0.06);
    this.icons.forEach((ic, i) => {
      ic.root.visible = i === cur;
      if (i === cur) { ic.root.rotation.y = t * 2; ic.update?.(dt, { anim: 'idle' }); }
    });
  }

  modelState() {
    if (this.w4) return { item: this.symbols[this.used ? Math.max(0, this.names.indexOf(this.given)) : this.current] ?? 'muenze', anim: this.used ? 'used' : this.anim === 'bump' ? 'bump' : 'idle', n: this.n };
    return { anim: this.anim === 'bump' ? 'bump' : 'idle', n: this.n, item: this.item };
  }

  dispose() {
    for (const ic of this.icons) ic.dispose?.();
    this.icons = [];
    super.dispose();
  }
}

// =============================================================================================
// Sternring und Sternmünzen
// =============================================================================================

function starShape(rO, rI, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n * 2; i++) {
    const a = Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? rI : rO;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

/** Sternmünze (Vorlage für den Instanz-Pool): grüner Stern mit Goldrand, Mitte 0,45 über dem Fußpunkt. */
function starCoinTemplate() {
  if (hasModel('sternmuenze')) return getModel('sternmuenze').root;
  const g = new THREE.ExtrudeGeometry(starShape(0.42, 0.19), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  g.translate(0, 0, -0.06);
  const green = lin(0x3ee05a), light = lin(0xb8ff9a), gold = lin(0xffd84a);
  const cg = colorize(g, (p, n, o) => (Math.abs(n.z) > 0.7 ? mixc(green, light, smooth(0.1, 0.4, Math.hypot(p.x, p.y) < 0.16 ? 0.4 : 0), o) : mixc(gold, light, 0.2, o)));
  const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.2, emissive: 0x1a6a24, emissiveIntensity: 0.6 }));
  m.position.y = 0.45;
  const root = new THREE.Group();
  root.add(m);
  return root;
}

function sternringModel() {
  if (hasModel('sternring')) return getModel('sternring');
  const root = new THREE.Group();
  const spin = new THREE.Group();
  spin.position.y = 1.15;
  root.add(spin);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.13, 10, 40), new THREE.MeshStandardMaterial({ color: 0x3ee05a, roughness: 0.3, metalness: 0.3, emissive: 0x1a8a2a, emissiveIntensity: 0.55 }));
  ring.rotation.y = Math.PI / 2;
  spin.add(ring);
  const sg = new THREE.ExtrudeGeometry(starShape(0.2, 0.09), { depth: 0.06, bevelEnabled: false });
  sg.translate(0, 0, -0.03);
  const sm = new THREE.MeshStandardMaterial({ color: 0xffe060, roughness: 0.3, metalness: 0.4, emissive: 0x8a6a10, emissiveIntensity: 0.5 });
  const stars = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const st = new THREE.Mesh(sg, sm);
    st.position.set(0, Math.sin(a) * 1.1, Math.cos(a) * 1.1);
    st.rotation.y = Math.PI / 2;
    spin.add(st);
    stars.push(st);
  }
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.42, 0.18), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }), new THREE.MeshStandardMaterial({ color: 0x5aff7a, roughness: 0.25, emissive: 0x2aa04a, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }));
  core.rotation.y = Math.PI / 2;
  spin.add(core);
  let t = 0, k = 1;
  return {
    root,
    update(dt, st) {
      t += dt;
      const want = st.anim === 'idle' ? 1 : 0;
      k += (want - k) * Math.min(1, dt * 6);
      spin.scale.setScalar(Math.max(0.001, k));
      spin.visible = k > 0.02;
      spin.rotation.x = Math.sin(t * 0.8) * 0.08;
      core.rotation.x = t * 1.6;
      stars.forEach((s, i) => { s.rotation.z = t * 2 + i; });
    },
    dispose() { ring.geometry.dispose(); sg.dispose(); sm.dispose(); core.geometry.dispose(); },
  };
}

class Sternmuenze extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'sternmuenze');
    this.owner = spec.owner ?? null;
    this.half.set(0.4, 0.45, 0.4);
    this.pool = level.view?.pool('sternmuenze', starCoinTemplate, { castShadow: false, capacity: 16 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.phase = (this.pos.x * 1.3 + this.pos.z * 0.7) % 6.28;
    this.render(0, 0);
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (this.idx < 0) return;
    if (this.hidden) { this.pool.hide(this.idx); return; }
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    const blink = this.owner?.state === 'active' && this.owner.timeLeft < 3 && Math.floor(t * 8) % 2 === 0;
    if (blink) { this.pool.hide(this.idx); return; }
    this.pool.set(this.idx, this.pos.x, this.pos.y + Math.sin(t * 2.6 + this.phase) * 0.06, this.pos.z, t * 2.4 + this.phase, Math.min(1, 0.2 + k));
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'mega' || kind === 'fire') this.collect(); }

  collect() {
    if (!this.alive || this.hidden) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 12);
    this.kill();
    this.owner?.onCoin?.(this);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

function coinSpots(spec, pos, n0 = 8) {
  const c = spec.coins;
  if (Array.isArray(c) && Array.isArray(c[0])) return c;
  if (c?.from && c?.to) {
    const n = c.n ?? n0, out = [];
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); out.push(c.from.map((a, k) => a + (c.to[k] - a) * t)); }
    return out;
  }
  const p = c?.pos ?? [pos.x, pos.y + 0.4, pos.z], r = c?.r ?? 3, n = c?.n ?? n0;
  return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [p[0] + Math.cos(a) * r, p[1], p[2] + Math.sin(a) * r]; });
}

class Sternring extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'sternring');
    this.time = spec.time ?? 10;
    this.retry = spec.retry !== false;
    this.spots = coinSpots(spec, this.pos);
    this.reward = spec.reward ?? (spec.star !== undefined ? { star: spec.star } : { power: 'oneup' });
    this.state = 'idle';
    this.timeLeft = 0;
    this.got = 0;
    this.coins = [];
    this.rearm = 0;
    this.yaw = spec.yaw ?? Math.PI / 2;
    const ax = Math.abs(Math.cos(this.yaw)), az = Math.abs(Math.sin(this.yaw));
    this.half.set(ax * 0.45 + az * 1.2, 1.15, az * 0.45 + ax * 1.2);
    if (level.view) this.setModel(sternringModel());
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + 1.15, this.pos.z); }

  onPlayer() {
    if (this.state === 'idle' && this.rearm <= 0) this.begin();
    return 'none';
  }

  begin() {
    if (this.state !== 'idle' || this.hidden) return;
    this.state = 'active';
    this.timeLeft = this.time;
    this.got = 0;
    for (const c of this.coins) if (c.alive) c.kill();
    this.coins = this.spots.map((p) => this.level.spawn('sternmuenze', { pos: p, owner: this })).filter(Boolean);
    for (const c of this.coins) c.popT = 0.45;
    this.level.sfx('switch');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.2, z: this.pos.z }, 20);
  }

  onCoin(coin) {
    if (this.state !== 'active') return;
    this.got++;
    this.lastCoin = coin;
    if (this.got >= this.coins.length) this.succeed();
  }

  succeed() {
    this.state = 'done';
    countdown(this.level).hide(this);
    this.level.sfx('key');
    const r = this.reward;
    const c = this.lastCoin?.pos ?? this.pos;
    const rp = r && !Array.isArray(r) && r.pos ? r.pos : [c.x, c.y + 0.3, c.z];
    runAction(this.level, r, { pos: rp, source: this });
  }

  fail() {
    for (const c of this.coins) if (c.alive) c.kill();
    this.coins = [];
    countdown(this.level).hide(this);
    this.level.sfx('vanish');
    this.state = this.retry ? 'idle' : 'done';
    this.rearm = 1.0;
  }

  update(dt) {
    if (this.rearm > 0) this.rearm -= dt;
    if (this.state !== 'active') return;
    this.timeLeft -= dt;
    countdown(this.level).show(this, this.timeLeft, `${this.got}/${this.coins.length}`, '#4ef06a');
    if (this.timeLeft <= 0) this.fail();
  }

  modelState() { return { anim: this.state, progress: this.state === 'active' ? Math.max(0, this.timeLeft / this.time) : 1 }; }

  dispose() {
    countdown(this.level).hide(this);
    super.dispose();
  }
}

export const KINDS = {
  stachelstange: (level, spec) => new Stachelstange(level, spec),
  roulette_block: (level, spec) => new RouletteBlockW4(level, spec),
  sternring: (level, spec) => new Sternring(level, spec),
  sternmuenze: (level, spec) => new Sternmuenze(level, spec),
};
