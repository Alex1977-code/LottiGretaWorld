// Mehrfigur-Mechanik (Präzisierung Motor Welt 2; Bauplan 2-4 „Figurenschalter“, 2-5 „Schalter nur mit 2–5 Klonen
// gleichzeitig drückbar“). Auch als `type` in LEVEL.segments verwendbar (blocks/types/w2engine.js).
//
// pfeld – Druckfeld: löst erst aus, wenn `need` Figuren gleichzeitig darauf stehen (Spiegelfrucht-Klone zählen).
//   Gruppe: alle Felder mit gleicher `group` müssen gleichzeitig belegt sein (je Feld `need`, Standard 1); das
//   Ereignis steht an einem der Felder (`on`). Anzeige über dem Feld: „1/2“ (Figuren bzw. belegte Felder der Gruppe).
//   { kind: 'pfeld', pos: [x, y, z] (Mitte der Unterseite), size: [w, d] (2 × 2), need: 2, group?: 'name',
//     on: Aktion (Format der Sonder-Bausteine: { reveal, spawn, star, path, power, coins … }),
//     once: true (Standard; false = Halten: `on` beim Belegen, `off` beim Verlassen), off?: Aktion, color?, id?, hidden? }
//   Beispiele: { kind: 'pfeld', pos: [0, 1, -20], need: 2, on: { reveal: 'weg1' } }
//              { kind: 'pfeld', pos: [-3, 1, -30], group: 'paar', on: { star: 1 } }, { kind: 'pfeld', pos: [3, 1, -30], group: 'paar' }
//
// figurenschalter – Schalter mit Porträt Lotti oder Greta: nur **diese** Heldin löst ihn aus (draufstellen);
//   die andere bekommt „Nur für Lotti!“ und ein Wackeln. Heldin wechseln: Pause-Menü → „Figur“.
//   { kind: 'figurenschalter', pos: [x, y, z] (Mitte der Unterseite), hero: 'lotti' | 'greta', on: Aktion,
//     once: true, yaw?: Blickrichtung des Porträts (Standard zur Kamera), id?, hidden? }
//   Beispiel: { kind: 'figurenschalter', pos: [6, 1, -12], hero: 'greta', on: { reveal: 'stempelweg' } }
//
// Zusätzlich exportiert: Badge (Text-Schild über einem Objekt, Canvas-Sprite) – auch für den Viererlift.

import * as THREE from 'three';
import { Gimmick, runAction, LIST } from '../gimmick.js';
import { box, disc, merge } from '../../blocks/kit.js';

// ------------------------------------------------------------------ Anzeige-Schild (Canvas-Sprite)

export class Badge {
  /** @param {object} level  opts: { w: 1.1, h: 0.55, color: '#ffd23d' } */
  constructor(level, opts = {}) {
    this.level = level;
    this.key = '';
    this.sprite = null;
    if (!level.view) return;
    this.canvas = document.createElement('canvas');
    // Seitenverhältnis wie das Schild (Höhe 96 px)
    this.canvas.width = Math.round(96 * (opts.w ?? 1.1) / (opts.h ?? 0.55)); this.canvas.height = 96;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.scale.set(opts.w ?? 1.1, opts.h ?? 0.55, 1);
    this.sprite.renderOrder = 12;
    this.sprite.visible = false;
    this.color = opts.color ?? '#ffd23d';
    level.view.add(this.sprite);
  }

  /** Text zeigen (nur neu zeichnen bei Änderung); dots = Zahl der Figur-Symbole (optional), color = Akzent. */
  show(text, color = this.color, sub = '') {
    if (!this.sprite) return;
    const key = `${text}|${color}|${sub}`;
    if (key !== this.key) {
      this.key = key;
      const g = this.canvas.getContext('2d');
      const W = this.canvas.width, H = this.canvas.height;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(26,24,48,0.78)';
      g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 24); g.fill();
      g.lineWidth = 6; g.strokeStyle = color; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = sub ? 40 : 52;
      g.font = `bold ${size}px sans-serif`;
      const tw = g.measureText(text).width;
      if (tw > W - 36) { size = Math.floor(size * (W - 36) / tw); g.font = `bold ${size}px sans-serif`; }
      g.lineWidth = 7; g.strokeStyle = '#1a1830';
      const ty = sub ? 38 : H / 2 + 2;
      g.strokeText(text, W / 2, ty); g.fillStyle = '#ffffff'; g.fillText(text, W / 2, ty);
      if (sub) { g.font = 'bold 24px sans-serif'; g.fillStyle = color; g.fillText(sub, W / 2, 72); }
      this.tex.needsUpdate = true;
    }
    this.sprite.visible = true;
  }

  hide() { if (this.sprite) this.sprite.visible = false; }
  at(x, y, z) { this.sprite?.position.set(x, y, z); }

  dispose() {
    if (!this.sprite) return;
    this.level.view?.remove(this.sprite);
    this.tex.dispose(); this.mat.dispose();
    this.sprite = null;
  }
}

/** Figuren, die (am Boden) auf einer Form dieses Besitzers stehen. */
export function figuresOn(level, owner, filter) {
  let n = 0;
  for (const p of level.players ?? [level.player]) {
    if (!p || p.dead || p.removedFigure || p.mode !== 'ground' || p.ground?.owner !== owner) continue;
    if (filter && !filter(p)) continue;
    n++;
  }
  return n;
}

// ------------------------------------------------------------------ Druckfeld

const PLATE_H = 0.2, PRESS = 0.09;

class PField extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'pfeld');
    const sz = spec.size ?? [2, 2];
    this.w = sz[0] ?? 2; this.d = sz.length >= 3 ? sz[2] : (sz[1] ?? 2);
    this.need = Math.max(1, spec.need ?? (spec.group ? 1 : 2));
    this.group = spec.group ?? null;
    this.once = spec.once !== false;
    this.action = spec.on ?? spec.onAll ?? spec.reward ?? null;
    this.offAction = spec.off ?? null;
    this.half.set(this.w / 2, PLATE_H / 2, this.d / 2);
    this.touch = false;
    this.count = 0;
    this.pressed = false;     // Feld belegt (count ≥ need)
    this.done = false;        // Ereignis ausgelöst (once)
    this.active = false;      // Halten-Modus: Ereignis an
    this.fired = 0;
    this.press = 0;           // Darstellung 0..1
    const p = this.pos;
    this.top = p.y + PLATE_H;
    this.shape = this.addSolid({ type: 'box', min: [p.x - this.w / 2, p.y, p.z - this.d / 2], max: [p.x + this.w / 2, this.top, p.z + this.d / 2], tag: 'pfeld' });
    if (this.group) {
      const groups = level._pfeldGroups ?? (level._pfeldGroups = new Map());
      if (!groups.has(this.group)) groups.set(this.group, []);
      groups.get(this.group).push(this);
    }
    this.badge = new Badge(level, { color: '#ffd23d' });
    if (level.view) this.buildView(spec);
  }

  buildView(spec) {
    const col = spec.color ?? 0xffc83a;
    const parts = [box(this.w, PLATE_H, this.d, 0, PLATE_H / 2, 0, col, { r: 0.06, topColor: 0xffe27a })];
    // Figur-Punkte: so viele weiße Kreise wie Figuren nötig
    const n = this.need, step = Math.min(0.55, (this.w - 0.4) / Math.max(1, n));
    for (let i = 0; i < n; i++) parts.push(disc((i - (n - 1) / 2) * step, PLATE_H, 0, Math.min(0.2, step * 0.38), 0.025, 0xffffff, 0xf2efe6, 14));
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    this.mesh = new THREE.Mesh(merge(parts), this.mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.userData.owned = true;
    this.setModel({ root: this.mesh, update: () => {}, dispose: () => {} });
  }

  groupMembers() { return this.group ? this.level._pfeldGroups?.get(this.group) ?? [this] : [this]; }

  update(dt) {
    if (this.hidden) return;
    this.count = figuresOn(this.level, this);
    this.pressed = this.count >= this.need;
    this.syncShapeY();
    const members = this.groupMembers();
    // Nur ein Feld je Gruppe wertet aus (das erste); alle zeigen den Stand
    if (members[0] !== this) return;
    const all = members.every((m) => m.pressed && !m.hidden);
    if (this.once) {
      if (all && !this.done) this.fire(members);
    } else if (all !== this.active) {
      this.active = all;
      for (const m of members) m.active = all;
      const act = all ? members.map((m) => m.action).filter(Boolean) : members.map((m) => m.offAction).filter(Boolean);
      for (const a of act) runAction(this.level, a, { pos: [this.pos.x, this.top + 0.3, this.pos.z], source: this });
      this.level.sfx('switch');
      if (all) this.fired++;
    }
  }

  fire(members) {
    for (const m of members) { m.done = true; m.level.effects?.sparks({ x: m.pos.x, y: m.top + 0.2, z: m.pos.z }, 12); }
    this.fired++;
    this.level.sfx('switch');
    for (const m of members) for (const a of LIST(m.action)) runAction(this.level, a, { pos: [m.pos.x, m.top + 0.3, m.pos.z], source: m });
  }

  /** Stand für die Anzeige: Gruppe → belegte Felder, sonst Figuren auf dem Feld. */
  progress() {
    const members = this.groupMembers();
    if (members.length > 1) return [members.filter((m) => m.pressed).length, members.length];
    return [Math.min(this.count, this.need), this.need];
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.mesh || this.hidden) { this.badge.hide(); return; }
    const down = this.done || this.active || this.pressed;
    this.press += ((down ? 1 : 0) - this.press) * Math.min(1, dt * 14);
    this.mesh.position.y = this.pos.y - PRESS * this.press;
    const lit = this.done || this.active;
    this.mat.color.setRGB(lit ? 0.62 : 1, lit ? 1 : 1, lit ? 0.62 : 1);
    const [a, b] = this.progress();
    if (this.done) this.badge.hide();
    else if (a > 0) { this.badge.show(`${a}/${b}`, a >= b ? '#5fcf6a' : '#ffd23d'); this.badge.at(this.pos.x, this.top + 1.6, this.pos.z); }
    else this.badge.hide();
  }

  // Kollisionsform folgt dem Eindrücken (Figuren sinken mit)
  syncShapeY() {
    const s = this.shape;
    const y = this.top - (this.done || this.active || this.pressed ? PRESS : 0);
    if (Math.abs(s.max[1] - y) < 1e-4) return;
    s.max[1] = y;
    if (this.shapes[0]) this.level.world.update(this.shapes[0]);
  }

  dispose() { this.badge.dispose(); super.dispose(); }
}

// ------------------------------------------------------------------ Figurenschalter (Lotti / Greta)

const HERO = {
  lotti: { name: 'Lotti', hair: '#c8963c', tip: '#f2d886', dress: '#3b7cf0', iris: '#3e82f5', braids: true },
  greta: { name: 'Greta', hair: '#f3d97a', tip: '#fff3c4', dress: '#4fb833', iris: '#49a84a', braids: false },
};

/** Porträt der Heldin (Canvas 256²): runder Rahmen in Kleidfarbe, Gesicht, Haar, Name. */
function portraitTexture(hero) {
  const h = HERO[hero] ?? HERO.lotti;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = h.dress; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff8ee'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
  // Haar hinten (Zöpfe bei Lotti, lange Mähne bei Greta)
  g.fillStyle = h.hair;
  if (h.braids) { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(128 + s * 62, 168, 17, 42, s * 0.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e83a30'; g.fillRect(128 + s * 62 - 12, 196, 24, 9); g.fillStyle = h.hair; } }
  else { g.beginPath(); g.ellipse(128, 150, 76, 70, 0, 0, Math.PI * 2); g.fill(); }
  // Gesicht
  g.fillStyle = '#ffd6b0'; g.beginPath(); g.arc(128, 132, 56, 0, Math.PI * 2); g.fill();
  // Pony
  g.fillStyle = h.hair; g.beginPath(); g.arc(128, 118, 60, Math.PI * 1.02, Math.PI * 1.98); g.fill();
  g.fillStyle = h.tip; g.beginPath(); g.ellipse(108, 84, 16, 7, -0.3, 0, Math.PI * 2); g.fill();
  // Augen, Wangen, Mund
  for (const s of [-1, 1]) {
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(128 + s * 20, 136, 9, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = h.iris; g.beginPath(); g.arc(128 + s * 20, 138, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2550'; g.beginPath(); g.arc(128 + s * 20, 139, 3.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,120,140,0.45)'; g.beginPath(); g.arc(128 + s * 36, 156, 8, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#a23a3a'; g.lineWidth = 3.5; g.beginPath(); g.arc(128, 156, 11, 0.2, Math.PI - 0.2); g.stroke();
  // Name
  g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = '#1a1830'; g.strokeText(h.name, 128, 218); g.fillStyle = '#ffffff'; g.fillText(h.name, 128, 218);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const SW_R = 0.85, SW_H = 0.22;

class Figurenschalter extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'figurenschalter');
    this.hero = HERO[spec.hero] ? spec.hero : 'lotti';
    this.action = spec.on ?? spec.reward ?? null;
    this.once = spec.once !== false;
    this.half.set(SW_R, SW_H / 2, SW_R);
    this.touch = false;
    this.done = false;
    this.wrongT = 0;
    this.wrongCount = 0;
    this.press = 0;
    this.yawP = spec.yaw ?? 0;
    const p = this.pos;
    this.top = p.y + SW_H;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: SW_R, y0: p.y, y1: this.top, tag: 'figurenschalter' });
    this.badge = new Badge(level, { w: 2.2, h: 0.62, color: HERO[this.hero].dress });
    this.wasOn = false;
    if (level.view) this.buildView();
  }

  buildView() {
    const root = new THREE.Group();
    const geo = merge([disc(0, 0, 0, SW_R, SW_H, 0xf6f4ef, 0xd9c7a8, 32), disc(0, SW_H, 0, SW_R * 0.92, 0.02, 0x1a1830, 0x1a1830, 32)]);
    this.baseMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const base = new THREE.Mesh(geo, this.baseMat);
    base.castShadow = true; base.receiveShadow = true;
    this.tex = portraitTexture(this.hero);
    this.faceMat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: this.tex, emissiveIntensity: 0.12 });
    const face = new THREE.Mesh(new THREE.CircleGeometry(SW_R * 0.86, 32), this.faceMat);
    face.rotation.x = -Math.PI / 2;
    face.rotation.z = this.yawP;
    face.position.y = SW_H + 0.025;
    face.receiveShadow = true;
    this.face = face;
    root.add(base, face);
    root.traverse((o) => { if (o.isMesh) o.userData.owned = true; });
    this.setModel({ root, update: () => {}, dispose: () => { geo.dispose(); face.geometry.dispose(); this.tex.dispose(); this.faceMat.dispose(); this.baseMat.dispose(); } });
  }

  update(dt) {
    if (this.hidden) return;
    if (this.wrongT > 0) this.wrongT -= dt;
    const right = figuresOn(this.level, this, (p) => p.hero === this.hero);
    const any = figuresOn(this.level, this);
    if (right > 0 && !this.done) {
      this.done = true;
      this.level.sfx('switch');
      this.level.effects?.sparks({ x: this.pos.x, y: this.top + 0.3, z: this.pos.z }, 16);
      runAction(this.level, this.action, { pos: [this.pos.x, this.top + 0.3, this.pos.z], source: this });
    } else if (any > right && !this.wasOn && !this.done) {
      // falsche Heldin: Hinweis „Nur für …“
      this.wrongT = 1.6;
      this.wrongCount++;
      this.level.sfx('blockhit');
    }
    if (!this.once && this.done && right === 0 && any === 0) this.done = false;
    this.wasOn = any > 0;
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.model || this.hidden) { this.badge.hide(); return; }
    this.press += ((this.done ? 1 : 0) - this.press) * Math.min(1, dt * 12);
    const wob = this.wrongT > 0 ? Math.sin(t * 38) * 0.05 * Math.min(1, this.wrongT) : 0;
    this.model.root.position.y = this.pos.y - 0.1 * this.press;
    this.model.root.rotation.z = wob;
    this.faceMat.emissiveIntensity = this.done ? 0.45 + Math.sin(t * 4) * 0.1 : 0.12;
    if (this.wrongT > 0) { this.badge.show(`Nur für ${HERO[this.hero].name}!`, HERO[this.hero].dress); this.badge.at(this.pos.x, this.top + 1.9, this.pos.z); }
    else this.badge.hide();
  }

  dispose() { this.badge.dispose(); super.dispose(); }
}

export const KINDS = {
  pfeld: (level, spec) => new PField(level, spec),
  figurenschalter: (level, spec) => new Figurenschalter(level, spec),
};
