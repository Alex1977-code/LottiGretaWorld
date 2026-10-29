// Hilfen der Level S-8 „Geisterreigen im Schneenebelmoor“ und S-9 „Kanonenhelm-Express durch die Neonstation“ (Bonuswelt
// Stern „Sternenzelt“). Kein LEVEL – die Level-Registry überspringt dieses Modul. Nur für diese beiden Level; gemeinsame
// Dateien werden nicht verändert. Alles hängt sich über die offiziellen Aufbau-Haken an (LEVEL.build / LEVEL.setup,
// Präzisierung „Leistung und Level-Haken 2“) und über level.onStep / view.onFrame.
//
//   1) Daten-Helfer   line/ring/arc/column (Bitcoin-Pfade), sign, isl (Insel über ihre Grundfläche), Bld (Sammler für
//                     statische Zier), litTop
//   2) S-8 Mechanik   grablicht (Licht vor dem Grabstein: Stampfattacke → Funkelstern), kruemelAngst (Krümel im
//                     Geisterring: zittert, jubelt nach der Rettung), unsichtbareWolke (fest, erst beim Betreten sichtbar),
//                     sternlaterne (Käfig um einen Stern: nur Schneebälle fliegen hindurch), friedhofstor (Gittertor mit fünf
//                     Schlüssel-Lampen, öffnet auf Signal), schneebaelle (Wurfbälle mit Schneeball-Optik)
//   3) S-8 Kulisse    eisenzaun, gruft, kapelle, schneemann, baenke, kerzen, steg (Holzsteg auf Pfählen über dem Nebel)
//   4) S-9 Mechanik   sternkapsel (Glaskapsel mit Stern: Kanonenkugel trifft → Stern gehört der Schützin),
//                     kanonenFrageBloecke (?-Blöcke lösen auch bei Kanonenkugeln aus; alle benutzt → Aktion),
//                     glasdecke (durchsichtige feste Decke über dem Unterwassertunnel)
//   5) S-9 Kulisse    deckZier (Neonkanten, Warnstreifen, Düsen unter den Stationsdecks), tunnelZier, signalLampen
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe); belebte
// Kleinigkeiten sind je ein Mesh ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, addStatic, addObject } from '../../blocks/kit.js';
import { Build } from '../../models/lib/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { cloudGeo } from '../../blocks/types/cloud.js';
import { banner } from '../../blocks/w3kit.js';

export const PI = Math.PI;
const TAU = Math.PI * 2;
export { banner };

// =====================================================================================================================
// 1) Daten-Helfer
// =====================================================================================================================

export const line = (a, b, n, o = {}) => ({ kind: 'coins', from: a, to: b, n, ...o });
export const ring = (p, r, n, o = {}) => ({ kind: 'coins', pos: p, r, n, ...o });
/** Münzbogen von a nach b (Scheitel h m über der Verbindungslinie), n Einzel-Münzen. */
export function arc(a, b, n, h = 1.5, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * PI) * h, a[2] + (b[2] - a[2]) * u], ...o });
  }
  return out;
}
export const column = (x, z, y0, y1, n, o = {}) => line([x, y0, z], [x, y1, z], n, o);
export const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, ...o });
/** Insel über [x0, x1] × [zA, zB] mit Oberseite top (Körper h m hoch). */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [Math.abs(x1 - x0), h, z0 - z1], under: o.under ?? 2, ...o };
}

/** Entität anmelden (level.entities, level.named) – für die eigenen Arten dieser Datei. */
function push(level, e) {
  level.entities.push(e);
  if (e.spec.id) level.named.set(e.spec.id, e);
  return e;
}

/**
 * Sammler für statische Zier (Weltkoordinaten; Mitte unten): b.box(w, h, d, x, y, z, farbe, { r, yaw, rx, rz }),
 * b.cyl(rTop, rBot, h, x, y, z, farbe, seg, o), b.sphere(r, x, y, z, farbe, { s }), b.cone(r, h, x, y, z, farbe, seg),
 * b.torus(R, t, x, y, z, farbe, { rx, yaw }), b.add(g, farbe, o); b.flush(level, { material: 'glow' | 'world', castShadow }).
 */
export class Bld {
  constructor() { this.b = new Build(); this.n = 0; }
  box(w, h, d, x, y, z, color, o = {}) { this.b.box(w, h, d, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], order: o.order }, o.r ?? 0.04, o.seg ?? 1); this.n++; return this; }
  cyl(rTop, rBot, h, x, y, z, color, seg = 10, o = {}) { this.b.cyl(rTop, rBot, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, seg, !!o.open); this.n++; return this; }
  sphere(r, x, y, z, color, o = {}) { this.b.sphere(r, color, { p: [x, y, z], s: o.s ?? 1, r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.ws ?? 10, o.hs ?? 7); this.n++; return this; }
  cone(r, h, x, y, z, color, seg = 8, o = {}) { this.b.cone(r, h, color, { p: [x, y + h / 2, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0], s: o.s ?? 1 }, seg); this.n++; return this; }
  torus(R, t, x, y, z, color, o = {}) { this.b.torus(R, t, color, { p: [x, y, z], r: [o.rx ?? 0, o.yaw ?? 0, o.rz ?? 0] }, o.rs ?? 6, o.ts ?? 16, o.arc ?? TAU); this.n++; return this; }
  add(g, color, o) { this.b.add(g, color, o); this.n++; return this; }
  geometry() { if (!this.n) return null; this.n = 0; const g = this.b.geometry(); this.b = new Build(); return g; }
  flush(level, opts) {
    const g = this.geometry();
    if (!g) return;
    if (!level.view) { g.dispose(); return; }
    addStatic(level, g, opts);
  }
  mesh(material) { const g = this.geometry(); return g ? new THREE.Mesh(g, material) : null; }
}

/** Oben hell, unten dunkler (Licht von oben) – Bld-Farbe je Ecke. */
export const litTop = (base, k = 0.72) => {
  const M = new THREE.Color(base), T = M.clone().multiplyScalar(1.14), D = M.clone().multiplyScalar(k), c = new THREE.Color();
  return { v: (x, y, z, nx, ny) => (ny >= 0 ? c.copy(M).lerp(T, ny) : c.copy(M).lerp(D, -ny)) };
};

const figuresOf = (level) => (level.players ?? [level.player]).filter((p) => p && !p.dead && !p.hidden);

/** Leinwand-Sprechblase (Sprite). */
function bubbleSprite(text, color = '#3a2a6a') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const draw = (t) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = '#ffffff'; g.strokeStyle = color; g.lineWidth = 10;
    const r = 46;
    g.beginPath();
    g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
    g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
    g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 66px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
    g.fillText(t, 256, 100);
  };
  draw(text);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.6, 0.8, 1);
  sp.renderOrder = 5;
  return { sprite: sp, set(t) { draw(t); tex.needsUpdate = true; }, dispose() { tex.dispose(); sp.material.dispose(); } };
}

/** Weiches, additives Leuchten (Sprite) – Farbe, Größe. */
function glowSprite(color, size) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.setScalar(size);
  return sp;
}

// =====================================================================================================================
// 2) S-8 Mechanik
// =====================================================================================================================

/**
 * Grablicht (Bauplan S-8 Stern 1 „Stampfen auf ein Licht vor einem Grabstein → Unverwundbarkeit“): ein warm leuchtender
 * Sternstein im Schnee vor einem Grabstein. Stampfattacke darauf → Funkelstern (10 s unverwundbar; Berührung vertreibt
 * Kreisgeister). Danach glimmt es nur noch und lädt sich in recharge s wieder auf. Draufspringen allein wirkt nicht.
 *   { pos: [x, y, z] (Mitte unten), recharge: 14, id }   Laufzeit: uses, cool, info().
 */
class Grablicht extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'grablicht');
    this.touch = false;
    this.half.set(0.45, 0.1, 0.45);
    this.cool = 0;
    this.uses = 0;
    this.lands = 0;
    const p = this.pos;
    this.addShape({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 0.16, p.z + 0.5], tag: 'grablicht' });
    if (level.view) this.buildModel();
  }

  buildModel() {
    const root = new THREE.Group();
    const b = new Bld();
    b.cyl(0.56, 0.62, 0.12, 0, 0, 0, 0x8a92b0, 18);
    b.torus(0.5, 0.06, 0, 0.13, 0, 0xc8d0e8, { rx: PI / 2, ts: 22 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.sphere(0.07, Math.cos(a) * 0.5, 0.14, Math.sin(a) * 0.5, 0xf0f4ff, { s: [1, 0.6, 1] }); }
    const base = b.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    base.receiveShadow = true;
    root.add(base);
    // Sternfläche (leuchtet)
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.17 : 0.4; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    s.closePath();
    const sg = new THREE.ShapeGeometry(s);
    sg.rotateX(-PI / 2);
    this.starMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
    const star = new THREE.Mesh(sg, this.starMat);
    star.position.y = 0.135;
    root.add(star);
    this.glow = glowSprite(0xffd870, 2.2);
    this.glow.position.y = 0.6;
    root.add(this.glow);
    this.glow2 = glowSprite(0xfff4c8, 0.9);
    this.glow2.position.y = 0.3;
    root.add(this.glow2);
    this.star = star;
    this.setModel({ root, update: () => {}, dispose: () => { b.b.parts.length = 0; sg.dispose(); this.starMat.dispose(); } });
  }

  onPound(player) {
    if (this.cool > 0 || player.dead) return;
    const L = this.level;
    this.cool = this.spec.recharge ?? 14;
    this.uses++;
    player.collectPowerup('stern');
    L.sfx('powerup_appear');
    L.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.8, z: this.pos.z }, 26);
    L.effects?.ring?.({ x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z }, 2.4);
    L.signal?.('grablicht', { id: this.spec.id ?? null, pos: [this.pos.x, this.pos.y, this.pos.z] });
    if (this.uses === 1) banner(L, 'Sternenkraft! Schnell zu den Geistern!', { hold: 1.6, size: 13, y: 0.36 });
  }

  update(dt) { if (this.cool > 0) this.cool = Math.max(0, this.cool - dt); }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    const on = this.cool <= 0;
    const k = on ? 0.8 + 0.2 * Math.sin(t * 3.2 + this.pos.x) : 0.18 + 0.1 * (1 - this.cool / (this.spec.recharge ?? 14));
    this.glow.material.opacity = k;
    this.glow2.material.opacity = Math.min(1, k * 1.2);
    this.starMat.color.setHex(on ? 0xfff0a0 : 0x8a8270);
    this.star.rotation.y = t * 0.6;
  }

  info() { return { uses: this.uses, cool: +this.cool.toFixed(2) }; }
}
export function grablicht(level, spec) { return push(level, new Grablicht(level, spec)); }

/**
 * Krümel im Geisterring (Bauplan S-8 „Geisterring um den Kapitän besiegen“): Krümel (Kapitän-Rolle, mit Stirnlampe)
 * hockt ängstlich in der Mitte eines Kreisgeist-Rings (Daten-id ring, Glieder ring_0 … ring_{n−1}); Sprechblase „Hilfe!“.
 * Sind alle Geister vertrieben, jubelt er („Danke!“) und onFree läuft einmal (z. B. { reveal: 'kruemelstern' }).
 *   { pos, ring: Id, count, yaw, onFree, id }   Laufzeit: free, left, info().
 */
class KruemelAngst extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'kruemel_angst');
    this.touch = false;
    this.half.set(0.3, 0.3, 0.3);
    this.shadow = 0.32;
    this.free = false;
    this.freeT = 0;
    this.left = spec.count ?? 0;
    this.yaw = spec.yaw ?? -PI / 2;
    this.addShape({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: 0.4, y0: this.pos.y, y1: this.pos.y + 0.95, tag: 'kruemel' });
    if (level.view) {
      const m = getModel(hasModel('kruemel') ? 'kruemel' : 'bunny_small');
      const root = new THREE.Group();
      m.root.scale.setScalar(spec.scale ?? 1.4);
      root.add(m.root);
      // Stirnlampe des Kapitäns (kleines Leuchten am Kopf)
      this.lamp = glowSprite(0xfff2b0, 0.5);
      this.lamp.position.set(0.22, 0.7, 0);
      root.add(this.lamp);
      this.bubble = bubbleSprite('Hilfe!');
      this.bubble.sprite.position.set(0, 1.75, 0);
      root.add(this.bubble.sprite);
      this.inner = m;
      this.setModel({ root, update: (dt, st) => m.update?.(dt, st), dispose: () => { m.dispose?.(); this.bubble.dispose(); } });
      level.view.shadows?.add({ pos: this.pos, radius: 0.32, alive: () => !this.removed, visible: () => true });
    }
  }

  members() {
    const id = this.spec.ring, n = this.spec.count ?? 0;
    const out = [];
    for (let i = 0; i < n; i++) { const g = this.level.named.get(`${id}_${i}`); if (g) out.push(g); }
    return out;
  }

  update(dt) {
    if (this.free) { this.freeT += dt; return; }
    const m = this.members();
    this.left = m.filter((g) => !g.defeated && !g.removed).length;
    if (m.length && this.left === 0) {
      this.free = true;
      this.freeT = 0;
      const L = this.level;
      L.sfx('victory');
      L.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 30);
      this.bubble?.set(`Danke, ${L.player?.hero === 'greta' ? 'Greta' : 'Lotti'}!`);
      runAction(L, this.spec.onFree, { pos: [this.pos.x, this.pos.y + 1.4, this.pos.z], source: this });
      L.signal?.('kruemelFrei', { id: this.spec.id ?? null });
    }
  }

  modelState() { return { anim: this.free ? (this.freeT < 4 ? 'cheer' : 'idle') : 'scared' }; }

  render(dt, t) {
    if (!this.model) return;
    const p = this.level.player;
    // schaut zur Figur
    if (p) this.yaw = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x);
    this.syncModel();
    this.model.update?.(dt, this.modelState());
    if (this.bubble) {
      const near = p && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 11;
      this.bubble.sprite.visible = near && (!this.free || this.freeT < 6);
      this.bubble.sprite.position.y = 1.75 + Math.sin(t * 2.4) * 0.05;
      this.bubble.sprite.rotation.y = -this.yaw;
    }
    if (this.lamp) this.lamp.material.opacity = 0.65 + 0.2 * Math.sin(t * 5);
  }

  info() { return { free: this.free, left: this.left }; }
}
export function kruemelAngst(level, spec) { return push(level, new KruemelAngst(level, spec)); }

/**
 * Unsichtbare Wolke (Bauplan S-8 Schlüsselmünze c „auf einer unsichtbaren Wolke links“): fest von oben (Einweg), aber
 * unsichtbar – nur ein zarter Schimmer und ein paar funkelnde Schneeflocken verraten sie. Betritt eine Figur sie, wird
 * sie sichtbar (bleibt sichtbar).
 *   { pos: [x, y, z] (Mitte unten), size: [3, 0.6, 3], hint: 0.07 (Deckkraft vorher), id }   Laufzeit: shown, info().
 */
class UnsichtbareWolke extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'unsichtbare_wolke');
    this.touch = false;
    const s = spec.size ?? [3, 0.6, 3];
    this.s = s;
    this.half.set(s[0] / 2, s[1] / 2, s[2] / 2);
    this.shown = false;
    this.k = 0;
    const p = this.pos;
    this.shape = this.addShape({ type: 'box', min: [p.x - s[0] / 2, p.y, p.z - s[2] / 2], max: [p.x + s[0] / 2, p.y + s[1], p.z + s[2] / 2], oneWay: true, tag: 'unsichtbare_wolke' });
    if (level.view) {
      const g = cloudGeo({ x: s[0], y: s[1], z: s[2] }, 7);
      this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true, opacity: spec.hint ?? 0.07, depthWrite: false });
      const mesh = new THREE.Mesh(g, this.mat);
      const root = new THREE.Group();
      root.add(mesh);
      // funkelnde Flocken über der Wolke
      const n = 9, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = (Math.sin(i * 12.9) * 0.5) * s[0] * 0.8; pos[i * 3 + 1] = s[1] + 0.15 + (i % 3) * 0.12; pos[i * 3 + 2] = (Math.cos(i * 7.3) * 0.5) * s[2] * 0.8; }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.pmat = new THREE.PointsMaterial({ color: 0xe8f4ff, size: 0.16, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
      const pts = new THREE.Points(pg, this.pmat);
      root.add(pts);
      this.setModel({ root, update: () => {}, dispose: () => { g.dispose(); this.mat.dispose(); pg.dispose(); this.pmat.dispose(); } });
    }
  }

  update(dt) {
    if (!this.shown) {
      for (const f of figuresOf(this.level)) {
        if (f.mode === 'ground' && f.ground?.owner === this) {
          this.shown = true;
          this.level.sfx('powerup_appear');
          this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.s[1] + 0.4, z: this.pos.z }, 18);
          this.level.signal?.('wolkeSichtbar', { id: this.spec.id ?? null });
        }
      }
    }
    if (this.shown) this.k = Math.min(1, this.k + dt * 1.6);
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    const hint = this.spec.hint ?? 0.07;
    this.mat.opacity = hint + (1 - hint) * this.k + (this.k < 1 ? 0.03 * Math.sin(t * 2.2) : 0);
    this.mat.depthWrite = this.k > 0.9;
    this.pmat.opacity = (0.35 + 0.35 * Math.sin(t * 3.1 + this.pos.x)) * (1 - this.k * 0.7);
  }

  info() { return { shown: this.shown, k: +this.k.toFixed(2) }; }
}
export function unsichtbareWolke(level, spec) { return push(level, new UnsichtbareWolke(level, spec)); }

/**
 * Sternlaterne (Bauplan S-8 Stern 3 „neben dem Steg aus der Ferne bewerfen“): ein Laternenkäfig an einem Galgenarm über dem
 * Nebel; innen schwebt ein grüner Stern. Die Gitterstäbe halten Figuren ab (feste Form), Schneebälle (Wurfball) fliegen
 * hindurch (ballPass) – ein Treffer sammelt den Stern für die Werferin. Statische Optik + Kollision.
 *   { pos: [x, y, z] (Mitte unten des Käfigs), size: 1.6 (Kantenlänge), post: [x, z] (Fußpunkt des Pfahls), postY (Fuß-
 *     höhe), arm: Höhe des Arms über dem Käfig }
 */
export function sternlaterne(level, spec) {
  const [x, y, z] = spec.pos, S = spec.size ?? 1.6, h = S * 1.15;
  // Käfig: fest für Figuren, Bälle fliegen hindurch
  level.world.add({ type: 'box', min: [x - S / 2, y, z - S / 2], max: [x + S / 2, y + h + 0.35, z + S / 2], ballPass: true, camIgnore: true, noWallSlide: true, tag: 'sternlaterne' });
  const [px, pz] = spec.post ?? [x - 2, z];
  const py = spec.postY ?? y - 4;
  const top = y + h + (spec.arm ?? 1.2);
  level.world.add({ type: 'cyl', x: px, z: pz, r: 0.22, y0: py, y1: top + 0.3, tag: 'sternlaterne-pfahl' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const iron = 0x3a3e58, gold = 0xd8a840;
  // Pfahl mit Arm, Kette
  b.cyl(0.2, 0.26, top + 0.3 - py, px, py, pz, 0x5a4a5a, 10);
  b.cyl(0.32, 0.32, 0.18, px, top + 0.3, pz, gold, 10);
  const dx = x - px, dz = z - pz, L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
  b.box(0.18, 0.18, L + 0.3, (px + x) / 2, top, (pz + z) / 2, 0x5a4a5a, { yaw });
  b.cyl(0.04, 0.04, top - (y + h + 0.35), x, y + h + 0.35, z, iron, 6);
  // Käfig: Boden, Dach (Spitzhaube mit Schnee), Gitterstäbe
  b.box(S + 0.12, 0.14, S + 0.12, x, y, z, iron, { r: 0.05 });
  b.cone(S * 0.78, 0.55, x, y + h + 0.05, z, iron, 4, { yaw: PI / 4 });
  b.cone(S * 0.62, 0.28, x, y + h + 0.3, z, 0xf4f8ff, 4, { yaw: PI / 4 });
  b.sphere(0.12, x, y + h + 0.62, z, gold);
  const nb = 4;
  for (let i = 0; i <= nb; i++) for (const side of [-1, 1]) {
    const u = -S / 2 + (i / nb) * S;
    b.cyl(0.035, 0.035, h, x + u, y + 0.1, z + side * S / 2, iron, 5);
    b.cyl(0.035, 0.035, h, x + side * S / 2, y + 0.1, z + u, iron, 5);
  }
  b.box(S + 0.1, 0.08, 0.08, x, y + h, z - S / 2, gold); b.box(S + 0.1, 0.08, 0.08, x, y + h, z + S / 2, gold);
  b.box(0.08, 0.08, S + 0.1, x - S / 2, y + h, z, gold); b.box(0.08, 0.08, S + 0.1, x + S / 2, y + h, z, gold);
  b.flush(level, { castShadow: true });
  // warmes Laternenleuchten am Dach
  g.sphere(0.16, x + S / 2, y + h - 0.15, z + S / 2, 0xffe8a0);
  g.flush(level, { material: 'glow' });
  const glow = glowSprite(0x9affb0, 2.4);
  glow.position.set(x, y + h / 2 + 0.1, z);
  addObject(level, glow, (dt) => { glow.material.opacity = 0.35 + 0.12 * Math.sin(level.time * 2.5); });
}

/**
 * Friedhofstor (Bauplan S-8 „5 Schlüsselmünzen nötig“): schmiedeeisernes Doppeltor zwischen zwei Steinpfeilern mit Bogen;
 * auf dem Bogen fünf Schlüssel-Lampen, die mit den gesammelten Schlüsselmünzen der Gruppe (level.keys[group]) aufleuchten.
 * Geschlossen ist der Durchgang fest; open() (Signal { open: id }) schwingt die Flügel auf.
 *   { id, pos: [x, y, z] (Mitte der Schwelle), width: 6, height: 3.4, group: 'tor', lamps: 5 }   Laufzeit: open, k, info().
 * Die Mauer links/rechts baut das Level.
 */
class Friedhofstor extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'friedhofstor');
    this.touch = false;
    this.W = spec.width ?? 6;
    this.H = spec.height ?? 3.4;
    this.half.set(this.W / 2, this.H / 2, 0.3);
    this.isOpen = false;
    this.k = 0;
    const p = this.pos, W = this.W, H = this.H;
    // Pfeiler und Gitter; darüber eine unsichtbare Sperre bis 12 m (über das Tor springt man nicht)
    for (const s of [-1, 1]) this.addShape({ type: 'box', min: [p.x + s * W / 2 - (s > 0 ? 0 : 0.9), p.y, p.z - 0.55], max: [p.x + s * W / 2 + (s > 0 ? 0.9 : 0), p.y + 12, p.z + 0.55], tag: 'tor-pfeiler', camIgnore: true });
    this.gate = this.addShape({ type: 'box', min: [p.x - W / 2, p.y, p.z - 0.15], max: [p.x + W / 2, p.y + 12, p.z + 0.15], tag: 'tor-gitter', camIgnore: true });
    if (level.view) this.buildModel();
  }

  buildModel() {
    const W = this.W, H = this.H;
    const root = new THREE.Group();
    const b = new Bld();
    const stone = litTop(0xb8c0d8), snow = 0xf4f8ff;
    for (const s of [-1, 1]) {
      const x = s * (W / 2 + 0.45);
      b.box(0.9, H + 1.2, 1.1, x, 0, 0, stone, { r: 0.08 });
      b.box(1.1, 0.3, 1.3, x, H + 1.2, 0, 0x9aa2c0, { r: 0.08 });
      b.sphere(0.36, x, H + 1.75, 0, snow, { s: [1.2, 0.7, 1.2] });
      b.sphere(0.28, x, H + 1.55, 0, 0xa8b0c8);
    }
    // Bogen
    const arch = new THREE.TorusGeometry(W / 2 + 0.2, 0.16, 6, 22, PI);
    b.add(arch, 0x3a3e58, { p: [0, H + 0.1, 0] });
    b.add(new THREE.TorusGeometry(W / 2 - 0.1, 0.08, 5, 22, PI), 0xd8a840, { p: [0, H + 0.1, 0] });
    const base = b.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    base.castShadow = true; base.receiveShadow = true;
    root.add(base);
    // Flügel (je eine Gruppe um die Angel)
    this.wings = [];
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(s * W / 2, 0, 0);
      const w = new Bld();
      const n = 6, ww = W / 2;
      for (let i = 0; i < n; i++) {
        const u = -s * (0.25 + (i / (n - 1)) * (ww - 0.5));
        const hh = H - 0.2 + Math.cos((i / (n - 1)) * PI) * -0.25 * s * s;
        w.cyl(0.05, 0.05, hh, u, 0.1, 0, 0x2a2e48, 6);
        w.cone(0.1, 0.24, u, hh + 0.1, 0, 0xd8a840, 6);
      }
      w.box(ww, 0.12, 0.1, -s * ww / 2, 0.5, 0, 0x2a2e48);
      w.box(ww, 0.12, 0.1, -s * ww / 2, H - 0.7, 0, 0x2a2e48);
      w.torus(0.32, 0.05, -s * ww / 2, 1.6, 0, 0xd8a840, { ts: 14 });
      w.torus(0.18, 0.04, -s * ww / 2, 1.6, 0, 0xd8a840, { ts: 12 });
      const m = w.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 }));
      m.castShadow = true;
      hinge.add(m);
      root.add(hinge);
      this.wings.push({ hinge, s });
    }
    // Schlüssel-Lampen auf dem Bogen
    this.lamps = [];
    const nL = this.spec.lamps ?? 5;
    for (let i = 0; i < nL; i++) {
      const a = PI * (0.15 + (i / (nL - 1)) * 0.7);
      const mat = new THREE.MeshBasicMaterial({ color: 0x4a4e68 });
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), mat);
      m.position.set(Math.cos(a) * (W / 2 + 0.2), H + 0.1 + Math.sin(a) * (W / 2 + 0.2), 0.12);
      root.add(m);
      const gl = glowSprite(0xffd870, 1.1);
      gl.position.copy(m.position);
      gl.visible = false;
      root.add(gl);
      this.lamps.push({ m, mat, gl });
    }
    this.setModel({ root, update: () => {}, dispose: () => { for (const l of this.lamps) { l.m.geometry.dispose(); l.mat.dispose(); } } });
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const L = this.level;
    L.sfx('gate');
    L.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H, z: this.pos.z }, 24);
    banner(L, 'Das Tor ist offen!', { hold: 1.4, size: 14, y: 0.36 });
  }

  update(dt) {
    if (this.isOpen && this.k < 1) {
      this.k = Math.min(1, this.k + dt * 0.8);
      if (this.k > 0.25 && this.gate) { this.level.world.remove(this.gate); this.shapes = this.shapes.filter((s) => s !== this.gate); this.gate = null; }
    }
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    const e = 1 - Math.pow(1 - this.k, 3);
    for (const w of this.wings) w.hinge.rotation.y = w.s * e * 1.75;
    const n = this.level.keys?.[this.spec.group ?? 'tor']?.n ?? 0;
    this.lamps.forEach((l, i) => {
      const on = i < n || this.isOpen;
      l.mat.color.setHex(on ? 0xffe070 : 0x4a4e68);
      l.gl.visible = on;
      if (on) l.gl.material.opacity = 0.7 + 0.2 * Math.sin(t * 4 + i);
    });
  }

  info() { return { open: this.isOpen, k: +this.k.toFixed(2) }; }
}
export function friedhofstor(level, spec) { return push(level, new Friedhofstor(level, spec)); }

/**
 * Schneebälle (Bauplan S-8 „Schneeball auf POW“, „aus der Ferne bewerfen“): Wurfbälle (Bestand `wurfball`, Welt 6) mit der
 * Schneeball-Optik (Modell `schneeball`) – Aktion hebt einen auf, Aktion wirft ihn flach in Blickrichtung. Sie lösen
 * POW-Blöcke aus, treffen Zielscheiben und sammeln Sterne. In LEVEL.setup: die Wurfbälle mit den genannten Ids umkleiden.
 */
export function schneebaelle(level, ids) {
  if (!level.view || !hasModel('schneeball')) return;
  for (const id of ids) {
    const e = level.entities.find((x) => x.kind === 'wurfball' && x.spec?.id === id);
    if (!e) continue;
    const m = getModel('schneeball', { size: e.size * 1.1 });
    e.spin = null;
    e.setModel({ root: m.root, update: (dt, st) => m.update?.(dt, { anim: st?.anim === 'thrown' ? 'roll' : 'idle', roll: st?.roll ?? 0 }), dispose: () => m.dispose?.() });
  }
}

// =====================================================================================================================
// 3) S-8 Kulisse
// =====================================================================================================================

/**
 * Schmiedeeisenzaun mit Steinpfosten (Schneehauben): list [{ from: [x, z], to: [x, z], y: 0, h: 1.2, gap: 3, solid: true,
 * lights: false (bunte Lichterkette zwischen den Pfosten) }] – achsenparallel; Kollision als dünner Quader (springbar).
 * Sparsam gebaut (vierkantige Stäbe, ohne Sonnenschatten).
 */
const BULBS = [0xff7ab8, 0x8affd0, 0xffe070, 0xb89aff, 0x7ad8ff];
export function eisenzaun(level, list) {
  const b = new Bld(), g = new Bld();
  let bi = 0;
  for (const f of list) {
    const [x0, z0] = f.from, [x1, z1] = f.to, y = f.y ?? 0, h = f.h ?? 1.2;
    if (f.solid !== false) level.world.add({ type: 'box', min: [Math.min(x0, x1) - 0.1, y, Math.min(z0, z1) - 0.1], max: [Math.max(x0, x1) + 0.1, y + h, Math.max(z0, z1) + 0.1], tag: 'zaun', noWallSlide: true });
    if (!level.view) continue;
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / (f.gap ?? 3)));
    const ux = (x1 - x0) / L, uz = (z1 - z0) / L;
    for (let i = 0; i <= n; i++) {
      const px = x0 + (x1 - x0) * (i / n), pz = z0 + (z1 - z0) * (i / n);
      b.box(0.36, h + 0.25, 0.36, px, y, pz, litTop(0xa8b0c8), { r: 0 });
      b.sphere(0.24, px, y + h + 0.3, pz, 0xf6f9ff, { s: [1.15, 0.55, 1.15], ws: 8, hs: 5 });
      if (i === n) continue;
      const seg = L / n, m = Math.max(2, Math.round(seg / 0.45));
      for (let k = 1; k < m; k++) {
        const qx = px + ux * seg * (k / m), qz = pz + uz * seg * (k / m);
        b.box(0.05, h - 0.1, 0.05, qx, y, qz, 0x2a2e48, { r: 0 });
        b.cone(0.07, 0.16, qx, y + h - 0.1, qz, k % 2 ? 0x3a3e58 : 0xb89a50, 4);
      }
      const cx = px + ux * seg / 2, cz = pz + uz * seg / 2, yaw = Math.atan2(ux, uz);
      b.box(0.06, 0.06, seg, cx, y + 0.25, cz, 0x2a2e48, { yaw, r: 0 });
      b.box(0.06, 0.06, seg, cx, y + h - 0.35, cz, 0x2a2e48, { yaw, r: 0 });
      if (f.lights) {
        const nb = Math.max(2, Math.round(seg / 0.7));
        for (let k = 1; k < nb; k++) {
          const u = k / nb, sag = Math.sin(u * PI) * 0.32;
          g.sphere(0.07, px + ux * seg * u, y + h + 0.42 - sag, pz + uz * seg * u, BULBS[bi++ % BULBS.length], { ws: 6, hs: 4 });
        }
      }
    }
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Gräber (eigene, sparsame Optik mit Schmuck; Kollision je Grab): list [{ pos: [x, y, z], yaw, size: 1, kind: 'rund' |
 * 'kreuz' | 'herz' | 'spitz', deko: 'kranz' | 'blumen' | 'kerze' | 'herz' | 'stern' | null, color }]. Steine in sanften
 * Lavendel-/Blaugrautönen mit Schneehaube; der Schmuck bringt Farbe (Kränze mit roter Schleife, bunte Blumen, Laternchen).
 */
const FLOWER = [0xff5a8a, 0xffb83a, 0xb87aff, 0x5ac8ff, 0xff7ad8];
export function graeber(level, list) {
  const b = new Bld(), g = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, k = s.size ?? 1, yaw = s.yaw ?? 0;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);              // Vorderseite (Standard +Z, zur Kamera)
    const w = 0.85 * k, h = 1.05 * k, d = 0.26 * k;
    level.world.add({ type: 'box', min: [x - w / 2 - 0.05, y, z - w / 2 - 0.05], max: [x + w / 2 + 0.05, y + h + 0.2 * k, z + w / 2 + 0.05], tag: 'grab' });
    if (!level.view) return;
    const col = s.color ?? [0xc4b2ec, 0xa8d6d4, 0xe4b8d2, 0xaec0f0, 0xdccab4][idx % 5];
    const stone = litTop(col);
    const kind = s.kind ?? ['rund', 'kreuz', 'herz', 'rund', 'spitz'][idx % 5];
    b.box(w + 0.24, 0.16, d + 0.34, x, y, z, 0x8a90ac, { yaw, r: 0 });                       // Sockel
    b.box(w + 0.16, 0.06, d + 0.26, x, y + 0.16, z, 0xf6f9ff, { yaw, r: 0 });                 // Schnee auf dem Sockel
    if (kind === 'kreuz') {
      b.box(0.22 * k, h, d, x, y + 0.16, z, stone, { yaw, r: 0 });
      b.box(0.7 * k, 0.2 * k, d, x, y + 0.16 + h * 0.62, z, stone, { yaw, r: 0 });
      b.box(0.26 * k, 0.07, d + 0.04, x, y + 0.16 + h, z, 0xf8faff, { yaw, r: 0 });
      b.box(0.74 * k, 0.06, d + 0.04, x, y + 0.36 + h * 0.62, z, 0xf8faff, { yaw, r: 0 });
    } else {
      const hh = kind === 'spitz' ? h * 0.75 : h * 0.8;
      b.box(w, hh, d, x, y + 0.16, z, stone, { yaw, r: 0 });
      if (kind === 'rund') {
        b.add(new THREE.CylinderGeometry(w / 2, w / 2, d, 10, 1, false, 0, PI), col, { p: [x, y + 0.16 + hh, z], r: [PI / 2, yaw, PI / 2], order: 'YZX' });
        b.sphere(w * 0.5, x, y + 0.16 + hh + w * 0.3, z, 0xf8faff, { s: [1, 0.28, d / w * 1.4], yaw, ws: 8, hs: 4 });
      } else if (kind === 'spitz') {
        b.cone(w * 0.72, h * 0.42, x, y + 0.16 + hh, z, col, 4, { yaw: yaw + PI / 4, s: [1, 1, d / w * 1.5] });
        b.cone(w * 0.36, h * 0.2, x, y + 0.16 + hh + h * 0.26, z, 0xf8faff, 4, { yaw: yaw + PI / 4, s: [1, 1, d / w * 1.6] });
      } else {
        // Herz-Grabstein (zwei Kugeln und eine Spitze)
        for (const sd of [-1, 1]) b.sphere(w * 0.3, x + Math.cos(yaw) * sd * w * 0.22, y + 0.16 + hh + w * 0.08, z - Math.sin(yaw) * sd * w * 0.22, col, { s: [1, 1, d / (w * 0.6) * 1.2], ws: 8, hs: 6 });
        b.box(w * 0.9, 0.08, d * 1.1, x, y + 0.16 + hh + w * 0.3, z, 0xf8faff, { yaw, r: 0 });
      }
    }
    // Schmuck vor dem Grab
    const dx = x + fx * (d / 2 + 0.24), dz = z + fz * (d / 2 + 0.24);
    const deko = s.deko === undefined ? ['kranz', 'blumen', 'kerze', 'blumen', 'herz', null][idx % 6] : s.deko;
    if (deko === 'kranz') {
      b.torus(0.24 * k, 0.07 * k, x + fx * (d / 2 + 0.03), y + 0.16 + h * 0.45, z + fz * (d / 2 + 0.03), 0x2a8a5a, { rx: 0, yaw, ts: 10, rs: 4 });
      g.sphere(0.07 * k, x + fx * (d / 2 + 0.08), y + 0.16 + h * 0.45 - 0.22 * k, z + fz * (d / 2 + 0.08), 0xff3a5a, { s: [1.6, 1, 1], ws: 6, hs: 4 });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; g.sphere(0.035, x + fx * (d / 2 + 0.07) + Math.cos(yaw) * Math.cos(a) * 0.24 * k, y + 0.16 + h * 0.45 + Math.sin(a) * 0.24 * k, z + fz * (d / 2 + 0.07) - Math.sin(yaw) * Math.cos(a) * 0.24 * k, 0xff4a4a, { ws: 4, hs: 3 }); }
    } else if (deko === 'blumen') {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 0.18;
        const qx = dx + Math.cos(yaw) * ox, qz = dz - Math.sin(yaw) * ox;
        b.box(0.03, 0.26, 0.03, qx, y + 0.16, qz, 0x3a8a4a, { r: 0 });
        g.sphere(0.07, qx, y + 0.45, qz, FLOWER[(idx + i) % FLOWER.length], { ws: 6, hs: 4 });
      }
    } else if (deko === 'kerze') {
      b.box(0.2, 0.26, 0.2, dx, y + 0.16, dz, 0xd8403a, { r: 0 });
      b.cone(0.16, 0.14, dx, y + 0.42, dz, 0xb8303a, 4, { yaw: PI / 4 });
      g.box(0.12, 0.16, 0.12, dx, y + 0.21, dz, 0xffd870, { r: 0 });
    } else if (deko === 'herz') {
      g.sphere(0.08, dx - Math.cos(yaw) * 0.06, y + 0.3, dz + Math.sin(yaw) * 0.06, 0xff6aa8, { ws: 6, hs: 4 });
      g.sphere(0.08, dx + Math.cos(yaw) * 0.06, y + 0.3, dz - Math.sin(yaw) * 0.06, 0xff6aa8, { ws: 6, hs: 4 });
      g.cone(0.1, 0.14, dx, y + 0.16, dz, 0xff6aa8, 4, { rx: PI });
    } else if (deko === 'stern') {
      g.sphere(0.12, x + fx * (d / 2 + 0.02), y + 0.16 + h * 0.5, z + fz * (d / 2 + 0.02), 0xffe070, { ws: 6, hs: 4 });
    }
  });
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/** Gepflasterte Wege (flache Pflastersteine, Schneeränder): list [{ x0, x1, z0, z1, y: 0, cell: 1 }]. */
export function wege(level, list) {
  if (!level.view) return;
  const b = new Bld();
  const cols = [0x9a98b8, 0x8e8eae, 0xa6a2c0, 0x908ab0];
  for (const s of list) {
    const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1), z0 = Math.max(s.z0, s.z1), z1 = Math.min(s.z0, s.z1), y = s.y ?? 0, c = s.cell ?? 1;
    const nx = Math.max(1, Math.round((x1 - x0) / c)), nz = Math.max(1, Math.round((z0 - z1) / c));
    const cw = (x1 - x0) / nx, cd = (z0 - z1) / nz;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const h = (i * 31 + k * 17) % 7;
      b.box(cw - 0.12, 0.05, cd - 0.12, x0 + (i + 0.5) * cw + ((k % 2) ? 0.04 : -0.04), y, z0 - (k + 0.5) * cd, cols[h % cols.length], { r: 0 });
    }
  }
  b.flush(level, { castShadow: false });
}

/** Verschneite Tannen (Kulisse; solid: Stamm-Kollision; lights: bunte Lichterkette rundherum): list [{ pos, height: 5, solid, lights }]. */
export function tannen(level, list) {
  const b = new Bld(), g = new Bld();
  let bi = 0;
  for (const s of list) {
    const [x, y, z] = s.pos, h = s.height ?? 5;
    if (s.solid !== false) level.world.add({ type: 'cyl', x, z, r: 0.5, y0: y, y1: y + h, tag: 'tanne' });
    if (!level.view) continue;
    b.cyl(0.18 * h / 5, 0.26 * h / 5, h * 0.2, x, y, z, 0x6a4a3a, 6);
    for (let i = 0; i < 3; i++) {
      const r = h * (0.36 - i * 0.09), y0 = y + h * (0.16 + i * 0.24), hh = h * 0.38;
      b.cone(r, hh, x, y0, z, i % 2 ? 0x2a7a6a : 0x2a6a5e, 8);
      b.cone(r * 0.62, hh * 0.45, x, y0 + hh * 0.55, z, 0xf6f9ff, 8);
    }
    b.sphere(0.12 * h / 5, x, y + h + 0.05, z, 0xfff6c0);
    if (s.lights) {
      // Lichterkette als Spirale um die Tanne, goldener Stern an der Spitze
      const n = 26;
      for (let i = 0; i < n; i++) {
        const u = i / n, yy = y + h * (0.2 + u * 0.72), rr = h * 0.36 * (1 - u * 0.86) + 0.06, a = u * TAU * 3.2;
        g.sphere(0.075 * h / 5 + 0.03, x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr, BULBS[bi++ % BULBS.length], { ws: 6, hs: 4 });
      }
      g.add(starGeo(0.32 * h / 5, 0.08), 0xffd23a, { p: [x, y + h + 0.3, z], r: [0, 0, 0] });
    }
  }
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/**
 * Laternen mit leuchtendem Glas (Pfahl, Käfig mit vier leuchtenden Scheiben, Dach mit Schneehaube): list [{ pos, height: 2.6,
 * color: 'warm' | 'lila' | 'mint' }] – Laternenlicht des Themas (view.addLantern), Kollision schlanker Zylinder.
 */
const LAMP = { warm: 0xffd880, lila: 0xd8b0ff, mint: 0xa8ffe0, rosa: 0xffb0d8 };
export function laternen(level, list) {
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos, h = s.height ?? 2.6;
    level.world.add({ type: 'cyl', x, z, r: 0.14, y0: y, y1: y + h + 0.6, tag: 'laterne' });
    if (!level.view) continue;
    const c = LAMP[s.color ?? 'warm'] ?? s.color;
    b.cyl(0.07, 0.1, h, x, y, z, 0x3a3a52, 6);
    b.cyl(0.18, 0.22, 0.14, x, y, z, 0x3a3a52, 6);
    b.box(0.46, 0.08, 0.46, x, y + h, z, 0x2a2a40, { r: 0 });
    for (const [ox, oz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.box(0.05, 0.5, 0.05, x + ox, y + h + 0.08, z + oz, 0x2a2a40, { r: 0 });
    g.box(0.36, 0.44, 0.36, x, y + h + 0.1, z, c, { r: 0 });
    b.cone(0.38, 0.32, x, y + h + 0.58, z, 0x2a2a40, 4, { yaw: PI / 4 });
    b.cone(0.26, 0.16, x, y + h + 0.66, z, 0xf6f9ff, 4, { yaw: PI / 4 });
    b.sphere(0.06, x, y + h + 0.92, z, 0xd8a840, { ws: 5, hs: 4 });
    level.view.addLantern?.(x, y + h + 0.3, z);
  }
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/** Zugefrorener Teich (flach, ohne Kollision) mit Schneerand und Spiegelungen: list [{ pos, r: 3 }]. */
export function eisteiche(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos, r = s.r ?? 3;
    b.add(new THREE.CircleGeometry(r, 20), { v: (px, py, pz) => new THREE.Color(0x9ad8f0).lerp(new THREE.Color(0xe0f6ff), Math.min(1, Math.hypot(px, pz) / r * 0.7)) }, { p: [x, y + 0.03, z], r: [-PI / 2, 0, 0] });
    b.torus(r, 0.22, x, y + 0.03, z, 0xf8faff, { rx: PI / 2, ts: 24, rs: 4 });
    for (let i = 0; i < 3; i++) g.box(0.06, 0.01, r * (0.5 - i * 0.12), x + (i - 1) * r * 0.3, y + 0.045, z, 0xffffff, { yaw: 0.6, r: 0 });
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Gruft (Mausoleum) aus hellem Stein mit Säulen, Dreiecksgiebel und Schneedach: { pos: [x, y, z] (Mitte unten), size:
 * [w, h, d], face: '+z' | '-z' | '+x' | '-x' (Vorderseite), door: false | 'offen' (dunkle Öffnung) | 'zu', roof: 'giebel' |
 * 'kuppel', color }. Kollision: Körper (Vorderseite 0,3 m hinter pos-Kante bleibt frei für eine Tür-Entität davor).
 * Mit opening: { w, h } bleibt in der Vorderseite eine Öffnung (Kollision ausgespart) – z. B. für eine Ziegelwand.
 */
export function gruft(level, spec) {
  const [x, y, z] = spec.pos, [w, h, d] = spec.size ?? [5, 3.2, 4];
  const face = spec.face ?? '+z';
  const fx = face === '+x' ? 1 : face === '-x' ? -1 : 0, fz = face === '+z' ? 1 : face === '-z' ? -1 : 0;
  // Breite entlang der Vorderseite (W) und Tiefe (D) in Weltachsen
  const alongX = fx === 0;
  const W = alongX ? w : d, D = alongX ? d : w;
  const op = spec.opening;
  const add = (ax0, ax1, ay0, ay1, an0, an1) => {
    // lokale Koordinaten (a = entlang der Vorderseite, n = Tiefe nach vorn) → Welt
    const p = alongX
      ? { min: [x + ax0, y + ay0, z + fz * an0], max: [x + ax1, y + ay1, z + fz * an1] }
      : { min: [x + fx * an0, y + ay0, z + ax0], max: [x + fx * an1, y + ay1, z + ax1] };
    const mn = [Math.min(p.min[0], p.max[0]), p.min[1], Math.min(p.min[2], p.max[2])], mx = [Math.max(p.min[0], p.max[0]), p.max[1], Math.max(p.min[2], p.max[2])];
    level.world.add({ type: 'box', min: mn, max: mx, tag: 'gruft' });
  };
  if (op) {
    const ow = op.w ?? 2, oh = op.h ?? 2.2, back = op.depth ?? 1.6;
    add(-W / 2, -ow / 2, 0, h, -D / 2, D / 2);
    add(ow / 2, W / 2, 0, h, -D / 2, D / 2);
    add(-ow / 2, ow / 2, oh, h, -D / 2, D / 2);
    add(-ow / 2, ow / 2, 0, h, -D / 2, D / 2 - back);
  } else add(-W / 2, W / 2, 0, h, -D / 2, D / 2);
  const roofH = spec.roof === 'kuppel' ? 0 : 1.2;
  // Dach begehbar (Giebel als flache Stufe, damit man oben landen kann)
  if (roofH) add(-W / 2 - 0.2, W / 2 + 0.2, h, h + 0.35, -D / 2 - 0.2, D / 2 + 0.2);
  if (!level.view) return;
  const b = new Bld();
  const yaw = alongX ? (fz > 0 ? 0 : PI) : (fx > 0 ? PI / 2 : -PI / 2);
  const P = (a, n) => (alongX ? [x + a * (fz || 1), z + fz * n] : [x + fx * n, z - a * fx]);
  const stone = litTop(spec.color ?? 0xc8cee2), dark = 0x8a92b0, snow = 0xf6f9ff;
  // Körper
  {
    const [cx, cz] = P(0, 0);
    if (op) {
      const ow = op.w ?? 2, oh = op.h ?? 2.2;
      const side = (W - ow) / 2;
      let [qx, qz] = P(-(ow / 2 + side / 2), 0); b.box(alongX ? side : D, h, alongX ? D : side, qx, y, qz, stone, { r: 0.06 });
      [qx, qz] = P(ow / 2 + side / 2, 0); b.box(alongX ? side : D, h, alongX ? D : side, qx, y, qz, stone, { r: 0.06 });
      [qx, qz] = P(0, 0); b.box(alongX ? ow : D, h - oh, alongX ? D : ow, qx, y + oh, qz, stone, { r: 0.06 });
      const back = op.depth ?? 1.6;
      [qx, qz] = P(0, -back / 2); b.box(alongX ? ow : D - back, oh, alongX ? D - back : ow, qx, y, qz, 0x4a4e68, { r: 0.04 });
    } else b.box(alongX ? W : D, h, alongX ? D : W, cx, y, cz, stone, { r: 0.08 });
    // Sockel und Gesims
    b.box(alongX ? W + 0.5 : D + 0.5, 0.35, alongX ? D + 0.5 : W + 0.5, cx, y, cz, dark, { r: 0.06 });
    b.box(alongX ? W + 0.4 : D + 0.4, 0.3, alongX ? D + 0.4 : W + 0.4, cx, y + h - 0.05, cz, 0xa8b0c8, { r: 0.06 });
  }
  // Säulen an der Vorderseite
  for (const a of [-W / 2 + 0.35, W / 2 - 0.35]) {
    const [qx, qz] = P(a, D / 2 + 0.25);
    b.cyl(0.22, 0.26, h - 0.2, qx, y + 0.2, qz, 0xe0e6f4, 10);
    b.box(0.6, 0.18, 0.6, qx, y + 0.1, qz, dark);
  }
  // Dach
  if (spec.roof === 'kuppel') {
    const [cx, cz] = P(0, 0);
    b.sphere(Math.min(W, D) * 0.45, cx, y + h + 0.2, cz, 0x9aa8c8, { s: [1, 0.75, 1] });
    b.sphere(Math.min(W, D) * 0.4, cx, y + h + 0.55, cz, snow, { s: [1, 0.55, 1] });
    b.cone(0.12, 0.7, cx, y + h + 1.2, cz, 0xd8a840, 6);
  } else {
    const [cx, cz] = P(0, 0);
    const tri = new THREE.Shape();
    tri.moveTo(-W / 2 - 0.3, 0); tri.lineTo(W / 2 + 0.3, 0); tri.lineTo(0, roofH); tri.closePath();
    b.add(new THREE.ExtrudeGeometry(tri, { depth: D + 0.5, bevelEnabled: false }), 0x8a90b0, { p: [cx, y + h + 0.25, cz], r: [0, yaw, 0], s: [1, 1, 1] });
    const tri2 = new THREE.Shape();
    tri2.moveTo(-W / 2 - 0.15, 0.08); tri2.lineTo(W / 2 + 0.15, 0.08); tri2.lineTo(0, roofH + 0.12); tri2.closePath();
    b.add(new THREE.ExtrudeGeometry(tri2, { depth: D + 0.3, bevelEnabled: false }), snow, { p: [cx, y + h + 0.32, cz], r: [0, yaw, 0] });
  }
  // Tür (Bild) bzw. dunkle Öffnung
  if (spec.door) {
    const [qx, qz] = P(0, D / 2 + 0.02);
    const dw = spec.doorW ?? 1.6, dh = spec.doorH ?? 2.3;
    b.box(alongX ? dw : 0.06, dh, alongX ? 0.06 : dw, qx, y + 0.3, qz, spec.door === 'zu' ? 0x6a4a3a : 0x2a2a40);
  }
  // Inschrift-Tafel / Stern über dem Eingang
  {
    const [qx, qz] = P(0, D / 2 + 0.05);
    b.box(alongX ? 1.2 : 0.08, 0.4, alongX ? 0.08 : 1.2, qx, y + h - 0.65, qz, 0x6a7090);
  }
  b.flush(level, { castShadow: true });
  const g = new Bld();
  const [lx, lz] = P(0, D / 2 + 0.12);
  g.sphere(0.12, lx, y + h - 0.45, lz, 0xffe090);
  g.flush(level, { material: 'glow' });
}

/**
 * Kapelle mit Glockentürmchen und leuchtenden Fenstern: { pos (Mitte unten), size: [w, h, d], face: '+z', bell: true }.
 * Kollision: Körper (Vorderseite bündig mit pos + d/2); eine Tür-Entität davor setzt das Level.
 */
export function kapelle(level, spec) {
  const [x, y, z] = spec.pos, [w, h, d] = spec.size ?? [6, 4, 7];
  level.world.add({ type: 'box', min: [x - w / 2, y, z - d / 2], max: [x + w / 2, y + h, z + d / 2 - 0.3], tag: 'kapelle' });
  level.world.add({ type: 'box', min: [x - w / 2 - 0.3, y + h, z - d / 2 - 0.2], max: [x + w / 2 + 0.3, y + h + 0.4, z + d / 2 - 0.1], tag: 'kapelle-dach' });
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  b.box(w, h, d - 0.3, x, y, z - 0.15, litTop(0xd8d2e8), { r: 0.08 });
  b.box(w + 0.4, 0.35, d + 0.1, x, y, z - 0.15, 0x8a92b0);
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2 - 0.45, 0); tri.lineTo(w / 2 + 0.45, 0); tri.lineTo(0, 2.4); tri.closePath();
  b.add(new THREE.ExtrudeGeometry(tri, { depth: d + 0.4, bevelEnabled: false }), 0x6a5a8a, { p: [x, y + h, z - d / 2 - 0.25] });
  const tri2 = new THREE.Shape();
  tri2.moveTo(-w / 2 - 0.3, 0.12); tri2.lineTo(w / 2 + 0.3, 0.12); tri2.lineTo(0, 2.5); tri2.closePath();
  b.add(new THREE.ExtrudeGeometry(tri2, { depth: d + 0.2, bevelEnabled: false }), 0xf6f9ff, { p: [x, y + h + 0.06, z - d / 2 - 0.15] });
  // Glockentürmchen
  if (spec.bell !== false) {
    const tz = z + d / 2 - 1.2;
    b.box(1.5, 1.6, 1.5, x, y + h + 1.6, tz, litTop(0xd8d2e8));
    b.cone(1.15, 1.8, x, y + h + 3.2, tz, 0x6a5a8a, 4, { yaw: PI / 4 });
    b.cone(0.75, 0.9, x, y + h + 3.35, tz, 0xf6f9ff, 4, { yaw: PI / 4 });
    b.cyl(0.05, 0.05, 0.8, x, y + h + 5, tz, 0xd8a840, 5);
    b.sphere(0.3, x, y + h + 2.15, tz, 0xd8a840);
  }
  // Fenster (leuchten warm)
  for (const s of [-1, 1]) for (const k of [0.3, -0.25]) {
    g.box(0.08, 1.2, 0.8, x + s * (w / 2 + 0.02), y + 1.4, z + k * d, 0xffd890, { r: 0.02 });
    b.box(0.12, 0.12, 0.9, x + s * (w / 2 + 0.04), y + 2.0, z + k * d, 0x6a5a8a);
  }
  g.add(new THREE.CircleGeometry(0.55, 14), 0xffc870, { p: [x, y + h - 0.9, z + d / 2 - 0.27] });
  b.torus(0.58, 0.07, x, y + h - 0.9, z + d / 2 - 0.26, 0x6a5a8a, { ts: 16 });
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/** Schneemänner (Kulisse, Kollision Zylinder): list [{ pos, yaw, size: 1, lamp: true, hat: 'zylinder' | 'muetze', scarf: 0xff5a72 }] */
export function schneemann(level, list) {
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos, k = s.size ?? 1, yaw = s.yaw ?? 0;
    level.world.add({ type: 'cyl', x, z, r: 0.62 * k, y0: y, y1: y + 2 * k, tag: 'schneemann' });
    if (!level.view) continue;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw);       // Blickrichtung
    const rx = Math.sin(yaw), rz = Math.cos(yaw);        // rechts davon (lokal +Z)
    b.sphere(0.7 * k, x, y + 0.6 * k, z, 0xf8faff, { s: [1, 0.92, 1], ws: 14, hs: 10 });
    b.sphere(0.5 * k, x, y + 1.45 * k, z, 0xf8faff, { ws: 14, hs: 10 });
    b.sphere(0.36 * k, x, y + 2.05 * k, z, 0xffffff, { ws: 14, hs: 10 });
    // Augen, Knöpfe, Karottennase
    for (const sd of [-1, 1]) b.sphere(0.055 * k, x + fx * 0.31 * k + rx * sd * 0.13 * k, y + 2.13 * k, z + fz * 0.31 * k + rz * sd * 0.13 * k, 0x1a1a2a);
    for (let i = 0; i < 3; i++) b.sphere(0.06 * k, x + fx * 0.47 * k, y + (1.62 - i * 0.2) * k, z + fz * 0.47 * k, 0x2a2a3a);
    b.cone(0.07 * k, 0.4 * k, x + fx * 0.48 * k, y + 2.03 * k, z + fz * 0.48 * k, 0xff8a2a, 6, { rx: 0, rz: -PI / 2, yaw });
    // Schal
    b.torus(0.37 * k, 0.09 * k, x, y + 1.8 * k, z, s.scarf ?? 0xff5a72, { rx: PI / 2, ts: 14 });
    b.box(0.18 * k, 0.5 * k, 0.08 * k, x + fx * 0.3 * k + rx * 0.22 * k, y + 1.3 * k, z + fz * 0.3 * k + rz * 0.22 * k, s.scarf ?? 0xff5a72, { yaw });
    // Hut
    if ((s.hat ?? 'zylinder') === 'zylinder') {
      b.cyl(0.36 * k, 0.36 * k, 0.05 * k, x, y + 2.3 * k, z, 0x2a2a3a, 12);
      b.cyl(0.24 * k, 0.24 * k, 0.42 * k, x, y + 2.33 * k, z, 0x2a2a3a, 12);
      b.cyl(0.245 * k, 0.245 * k, 0.08 * k, x, y + 2.4 * k, z, 0xd84a6a, 12);
    } else {
      b.cone(0.3 * k, 0.6 * k, x, y + 2.28 * k, z, s.scarf ?? 0xff5a72, 10);
      b.sphere(0.1 * k, x, y + 2.9 * k, z, 0xffffff);
    }
    // Stockarme
    for (const sd of [-1, 1]) b.cyl(0.03 * k, 0.04 * k, 0.8 * k, x + rx * sd * 0.6 * k, y + 1.35 * k, z + rz * sd * 0.6 * k, 0x6a4a3a, 5, { rx: rz * sd * 0.9, rz: -rx * sd * 0.9 });
    if (s.lamp) {
      const lx = x + rx * 0.98 * k + fx * 0.15, lz = z + rz * 0.98 * k + fz * 0.15;
      b.box(0.24, 0.32, 0.24, lx, y + 1.05 * k, lz, 0x3a3e58, { r: 0.04 });
      g.sphere(0.1, lx, y + 1.2 * k, lz, 0xffd870);
      level.view.addLantern?.(lx, y + 1.3 * k, lz);
    }
  }
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/** Bänke mit Schneehaube: list [{ pos, yaw, length: 1.8 }] (Kollision niedriger Quader). */
export function baenke(level, list) {
  const b = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos, L = s.length ?? 1.8, yaw = s.yaw ?? 0;
    const ax = Math.abs(Math.cos(yaw)) > 0.5;
    level.world.add({ type: 'box', min: [x - (ax ? L / 2 : 0.35), y, z - (ax ? 0.35 : L / 2)], max: [x + (ax ? L / 2 : 0.35), y + 0.5, z + (ax ? 0.35 : L / 2)], tag: 'bank' });
    if (!level.view) continue;
    b.box(L, 0.1, 0.6, x, y + 0.42, z, 0x8a5a4a, { yaw: ax ? 0 : PI / 2 });
    b.box(L, 0.08, 0.55, x, y + 0.53, z, 0xf8faff, { yaw: ax ? 0 : PI / 2, r: 0.04 });
    b.box(L, 0.5, 0.08, x - (ax ? 0 : 0.3), y + 0.5, z - (ax ? 0.3 : 0), 0x8a5a4a, { yaw: ax ? 0 : PI / 2 });
    for (const sd of [-1, 1]) {
      const px = x + (ax ? sd * (L / 2 - 0.15) : 0), pz = z + (ax ? 0 : sd * (L / 2 - 0.15));
      b.box(0.1, 0.42, 0.5, px, y, pz, 0x3a3e58, { yaw: ax ? 0 : PI / 2 });
    }
  }
  b.flush(level, { castShadow: true });
}

/** Kerzengruppen (leuchten): list [{ pos, n: 3, r: 0.25 }] – für Gräber und die Kerzenkammer. */
export function kerzen(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos, n = s.n ?? 3, r = s.r ?? 0.25;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + x, h = 0.22 + ((i * 7) % 3) * 0.1;
      const px = x + Math.cos(a) * r * (i ? 1 : 0), pz = z + Math.sin(a) * r * (i ? 1 : 0);
      b.cyl(0.06, 0.07, h, px, y, pz, 0xfff4e0, 8);
      g.cone(0.045, 0.14, px, y + h + 0.02, pz, 0xffc850, 6);
    }
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Holzsteg auf Pfählen über dem Nebel: list [{ x0, x1, z0, z1, top, post: Fußhöhe der Pfähle }] – Planken quer zur
 * Längsrichtung, Pfähle an den Ecken, Kollision als Quader (0,3 m dick).
 */
export function steg(level, list) {
  const b = new Bld();
  for (const s of list) {
    const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1), z0 = Math.max(s.z0, s.z1), z1 = Math.min(s.z0, s.z1), top = s.top;
    level.world.add({ type: 'box', min: [x0, top - 0.3, z1], max: [x1, top, z0], tag: 'steg' });
    if (!level.view) continue;
    const alongZ = z0 - z1 >= x1 - x0;
    const L = alongZ ? z0 - z1 : x1 - x0, W = alongZ ? x1 - x0 : z0 - z1;
    const n = Math.max(1, Math.round(L / 0.42));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const shade = i % 3 === 0 ? 0x9a6a4a : i % 3 === 1 ? 0x8a5a3e : 0xa8785a;
      if (alongZ) b.box(W, 0.12, L / n - 0.05, (x0 + x1) / 2, top - 0.12, z0 - u * L, shade, { r: 0.03 });
      else b.box(L / n - 0.05, 0.12, W, x0 + u * L, top - 0.12, (z0 + z1) / 2, shade, { r: 0.03 });
    }
    // Längsbalken und Pfähle
    if (alongZ) for (const px of [x0 + 0.12, x1 - 0.12]) b.box(0.18, 0.2, L, px, top - 0.32, (z0 + z1) / 2, 0x6a4a3a);
    else for (const pz of [z1 + 0.12, z0 - 0.12]) b.box(L, 0.2, 0.18, (x0 + x1) / 2, top - 0.32, pz, 0x6a4a3a);
    const py = s.post ?? top - 4;
    const np = Math.max(1, Math.round(L / 3.2));
    for (let i = 0; i <= np; i++) {
      const u = i / np;
      for (const sd of [0, 1]) {
        const px = alongZ ? (sd ? x1 - 0.1 : x0 + 0.1) : x0 + u * L, pz = alongZ ? z0 - u * L : (sd ? z1 + 0.1 : z0 - 0.1);
        b.cyl(0.11, 0.13, top - 0.3 - py, px, py, pz, 0x5a4034, 6);
        b.sphere(0.14, px, top + 0.02, pz, 0xf4f8ff, { s: [1, 0.5, 1] });
      }
    }
  }
  b.flush(level, { castShadow: true });
}

/** Fünfzackiger Stern (flach extrudiert, Mitte im Ursprung, Fläche in XY). */
function starGeo(r, depth) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.45 : r;
    if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * Sumpf-Zier (Kulisse ohne Kollision): list [{ pos, kind: 'pilze' (leuchtende Giftpilze) | 'schilf' (Rohrkolben), n: 5,
 * r: 0.7 }].
 */
const PILZ = [0xc86aff, 0x7affb0, 0xff6ad8, 0x8ad8ff];
export function sumpfZier(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, n = s.n ?? 5, r = s.r ?? 0.7;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + idx, rr = r * Math.sqrt((i + 0.4) / n), px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      if ((s.kind ?? 'pilze') === 'pilze') {
        const h = 0.22 + ((i * 7 + idx) % 4) * 0.1, cr = 0.14 + ((i * 3) % 3) * 0.06;
        b.cyl(0.04, 0.06, h, px, y, pz, 0xf4f0ff, 6);
        g.sphere(cr, px, y + h, pz, PILZ[(i + idx) % PILZ.length], { s: [1, 0.6, 1], ws: 8, hs: 5 });
        b.sphere(cr * 0.25, px + cr * 0.4, y + h + cr * 0.4, pz, 0xffffff, { ws: 5, hs: 3 });
      } else {
        const h = 0.9 + ((i * 5 + idx) % 4) * 0.25;
        b.cyl(0.025, 0.035, h, px, y, pz, 0x6a8a4a, 4, { rz: Math.sin(a) * 0.12 });
        b.cyl(0.07, 0.07, 0.26, px + Math.sin(a) * 0.12 * h * -0.9, y + h - 0.32, pz, 0x7a4a2a, 6);
        b.box(0.05, 0.5, 0.01, px + 0.06, y, pz, 0x8aaa5a, { yaw: a, rz: 0.3, r: 0 });
      }
    }
  });
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/** Schwebende Asteroiden (Kulisse, ohne Kollision und Schatten): list [{ pos, r: 1.2, color }] – mit Kratern. */
export function asteroiden(level, list) {
  if (!level.view) return;
  const b = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, r = s.r ?? 1.2, col = s.color ?? [0x8a7aa8, 0x7a8098, 0x9a8a7a][idx % 3];
    b.add(new THREE.IcosahedronGeometry(r, 1), litTop(col, 0.6), { p: [x, y, z], r: [idx * 0.7, idx * 1.3, 0], s: [1, 0.78, 0.9] });
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + idx, e = 0.4 - i * 0.25;
      b.sphere(r * 0.24, x + Math.cos(a) * Math.cos(e) * r * 0.86, y + Math.sin(e) * r * 0.7, z + Math.sin(a) * Math.cos(e) * r * 0.8, new THREE.Color(col).multiplyScalar(0.62).getHex(), { s: [1, 0.45, 1], ws: 7, hs: 4 });
    }
  });
  b.flush(level, { castShadow: false });
}

/** Leucht-Bojen neben den Gleisen (schweben, Kulisse): list [{ pos, color }] – Scheibe mit Neonring und Lichtkuppel. */
export function bojen(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, col = NEON[s.color ?? ['cyan', 'pink', 'gold', 'gruen'][idx % 4]] ?? s.color;
    b.cyl(0.55, 0.4, 0.22, x, y, z, 0xd8e0f4, 12);
    g.torus(0.56, 0.05, x, y + 0.14, z, col, { rx: PI / 2, ts: 18, rs: 4 });
    b.cyl(0.08, 0.08, 0.5, x, y + 0.22, z, 0x5a6080, 6);
    g.sphere(0.16, x, y + 0.8, z, col, { ws: 8, hs: 6 });
    g.cone(0.22, 0.4, x, y - 0.4, z, 0x8af4ff, 8, { rx: PI });
  });
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/** Weicher Leuchtpunkt (Textur für Irrlichter): heller Kern, sanfter Hof. */
function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,1)'); gr.addColorStop(0.26, 'rgba(255,255,255,0.7)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Irrlichter: schwebende, sanft wippende Lichtpunkte mit weichem Hof in bunten Farben – alle zusammen ein Points-Objekt
 * (ein Zeichenaufruf, kein Schatten): list [{ pos, color }], o.size (1,3 m).
 */
export function irrlichter(level, list, o = {}) {
  if (!level.view || !list.length) return;
  const n = list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), base = new Float32Array(n);
  const c = new THREE.Color();
  list.forEach((s, i) => {
    pos[i * 3] = s.pos[0]; pos[i * 3 + 1] = s.pos[1]; pos[i * 3 + 2] = s.pos[2]; base[i] = s.pos[1];
    c.set(s.color ?? 0x9af0ff); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: o.size ?? 3.4, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  pts.name = 'irrlichter';
  const attr = geo.attributes.position;
  addObject(level, pts, () => {
    const t = level.time ?? 0;
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = base[i] + Math.sin(t * 1.5 + i * 1.7) * 0.2;
    attr.needsUpdate = true;
  });
}

/**
 * Lichterketten: list [{ from: [x, y, z], to: [x, y, z], sag: 0.35 (Durchhang; negativ = Bogen nach oben), gap: 0.55,
 * wire: true, posts: false | Fußhöhe (Pfosten an beiden Enden, ohne Kollision), star: false (goldener Stern in der Mitte) }]
 * – bunte Birnchen (Leuchtmaterial) an einem dunklen Draht.
 */
export function lichterkette(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  let bi = 0;
  for (const s of list) {
    const [x0, y0, z0] = s.from, [x1, y1, z1] = s.to, sag = s.sag ?? 0.35;
    const L = Math.hypot(x1 - x0, z1 - z0, y1 - y0), nb = Math.max(2, Math.round(L / (s.gap ?? 0.55)));
    const at = (u) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(u * PI) * sag, z0 + (z1 - z0) * u];
    const yawL = Math.atan2(x1 - x0, z1 - z0);
    if (s.wire !== false) {
      const ns = Math.max(4, Math.round(nb / 2));
      for (let i = 0; i < ns; i++) {
        const a = at(i / ns), c = at((i + 1) / ns);
        const dl = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), hz = Math.hypot(c[0] - a[0], c[2] - a[2]);
        b.box(0.035, 0.035, dl, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 0.0175, (a[2] + c[2]) / 2, 0x2a2e48, { yaw: yawL, rx: -Math.atan2(c[1] - a[1], hz), order: 'YXZ', r: 0 });
      }
    }
    for (let k = 1; k < nb; k++) {
      const [px, py, pz] = at(k / nb);
      g.sphere(0.075, px, py - 0.06, pz, BULBS[bi++ % BULBS.length], { s: [1, 1.25, 1], ws: 6, hs: 4 });
    }
    if (s.star) {
      const [px, py, pz] = at(0.5);
      g.add(starGeo(0.34, 0.08), 0xffd23a, { p: [px, py - 0.4, pz], r: [0, yawL + PI / 2, 0] });
    }
    if (s.posts !== undefined && s.posts !== false) {
      for (const [px, py, pz] of [[x0, y0, z0], [x1, y1, z1]]) {
        b.cyl(0.06, 0.08, py - s.posts + 0.1, px, s.posts, pz, 0x3a3a52, 6);
        b.sphere(0.1, px, py + 0.14, pz, 0xf6f9ff, { s: [1.1, 0.6, 1.1], ws: 6, hs: 4 });
      }
    }
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Winterbeete (Kulisse ohne Kollision und Schatten): list [{ pos, r: 0.8, n: 6, kind: 'rosen' (Christrosen weiß/rosa) |
 * 'krokus' (lila/gelb) | 'beeren' (Strauch mit roten Beeren und Schneehaube) }] – bringen Farbe auf den Schnee.
 */
const ROSE = [0xffffff, 0xffc8dc, 0xff8ab8, 0xfff0f6];
const KROKUS = [0xb87aff, 0x9a5aff, 0xffd23a, 0xd8a8ff];
export function winterbeete(level, list) {
  if (!level.view) return;
  const b = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, r = s.r ?? 0.8, n = s.n ?? 6, kind = s.kind ?? ['rosen', 'krokus', 'beeren'][idx % 3];
    if (kind === 'beeren') {
      b.sphere(r * 0.7, x, y + r * 0.3, z, litTop(0x2a6a4e), { s: [1.2, 0.75, 1], ws: 10, hs: 6 });
      b.sphere(r * 0.55, x, y + r * 0.62, z, 0xf8faff, { s: [1.25, 0.32, 1.05], ws: 10, hs: 5 });
      for (let i = 0; i < n + 3; i++) {
        const a = i * 2.4 + idx, rr = r * 0.62;
        b.sphere(0.07, x + Math.cos(a) * rr * 1.15, y + r * 0.3 + Math.sin(i * 1.3) * 0.12, z + Math.sin(a) * rr * 0.95, 0xe8203a, { ws: 6, hs: 4 });
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + idx * 0.7, rr = r * Math.sqrt((i + 0.5) / n);
      const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      b.cone(0.09, 0.22, px, y, pz, 0x2a7a4a, 4);
      if (kind === 'rosen') {
        const c = ROSE[(i + idx) % ROSE.length];
        b.sphere(0.17, px, y + 0.25, pz, c, { s: [1, 0.45, 1], ws: 7, hs: 4 });
        b.sphere(0.06, px, y + 0.31, pz, 0xffd23a, { ws: 5, hs: 3 });
      } else {
        b.cone(0.12, 0.26, px, y + 0.18, pz, KROKUS[(i + idx) % KROKUS.length], 5);
      }
    }
  });
  b.flush(level, { castShadow: false });
}

/** Eiszapfen an einer Kante (Kulisse): list [{ from: [x, y, z], to: [x, y, z], gap: 0.45, len: 0.5 }] – hängen nach unten. */
export function eiszapfen(level, list) {
  if (!level.view) return;
  const b = new Bld();
  for (const s of list) {
    const [x0, y0, z0] = s.from, [x1, y1, z1] = s.to;
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / (s.gap ?? 0.45)));
    for (let i = 0; i <= n; i++) {
      const u = i / n, len = (s.len ?? 0.5) * (0.55 + ((i * 7) % 5) * 0.14);
      b.cone(0.07 + ((i * 3) % 4) * 0.012, len, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - len, z0 + (z1 - z0) * u, i % 3 ? 0xc8ecff : 0xe8f8ff, 5, { rx: PI });
    }
  }
  b.flush(level, { castShadow: false });
}

/**
 * Ferne Kulisse nicht zeichnen (nur Darstellung, im LEVEL.setup anmelden): statische Abschnitts-Meshes, deren Quader
 * weiter als dist m von der Kamera entfernt ist, und Baustein-Modelle `modell:<name>` (o.models, z. B. ['weiche']) weiter
 * als o.modelDist m werden je Bild ausgeblendet – flache bzw. hohe Kameras sähen sonst den ganzen Kurs (der Weltraum hat
 * keinen Nebel, der ihn verdeckt). Quader werden neu vermessen, wenn ein Abschnitt neue Geometrie bekommt.
 */
export function fernSicht(level, o = {}) {
  const v = level.view;
  if (!v) return;
  const dist = o.dist ?? 80, mDist = o.modelDist ?? dist * 0.7, names = (o.models ?? []).map((n) => `modell:${n}`);
  const boxes = new Map(), c = new THREE.Vector3(), w = new THREE.Vector3();
  let models = [], scanT = 0;
  const scan = () => {
    models = [];
    if (!names.length) return;
    v.three.traverse((ob) => { if (names.includes(ob.name)) models.push(ob); });
  };
  v.onFrame((dt) => {
    const cam = v.camera.position;
    for (const m of v.static.meshes) {
      let it = boxes.get(m);
      if (!it || it.g !== m.geometry) {
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        it = { g: m.geometry, b: m.geometry.boundingBox.clone() };
        boxes.set(m, it);
      }
      it.b.clampPoint(cam, c);
      m.visible = c.distanceToSquared(cam) <= dist * dist;
    }
    scanT -= dt ?? 0.016;
    if (scanT <= 0) { scan(); scanT = 2; }
    for (const ob of models) { ob.getWorldPosition(w); ob.visible = w.distanceToSquared(cam) <= mDist * mDist; }
  });
}

// =====================================================================================================================
// 4) S-9 Mechanik
// =====================================================================================================================

/**
 * Sternkapsel (Bauplan S-9 Stern 3 „Weiche umschießen und Stern abschießen, bevor das Brett fällt“): eine schwebende
 * Glaskapsel mit grünem Stern (LEVEL.stars-Eintrag mit hidden: true und id). Trifft eine Kanonenkugel die Kapsel, platzt
 * sie, und der Stern fliegt zur Schützin (eingesammelt). Andere Angriffe prallen ab.
 *   { pos: [x, y, z] (Mitte), star: Index, starId, r: 0.7, id }   Laufzeit: broken, info().
 */
class Sternkapsel extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'sternkapsel');
    this.touch = false;
    const r = spec.r ?? 0.7;
    this.r = r;
    this.pos.y -= r;          // pos = Mitte → Fußpunkt
    this.half.set(r, r, r);
    this.broken = false;
    this.flyT = -1;
    if (level.view) {
      const root = new THREE.Group();
      this.glassMat = new THREE.MeshStandardMaterial({ color: 0xb8f0ff, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2, depthWrite: false });
      const glass = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), this.glassMat);
      glass.position.y = r;
      const ringM = new THREE.MeshStandardMaterial({ color: 0xff4ad8, emissive: 0x6a0a50, roughness: 0.3, metalness: 0.5 });
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, 0.07, 6, 24), ringM);
      ring2.position.y = r; ring2.rotation.x = PI / 2;
      root.add(glass, ring2);
      this.glow = glowSprite(0x7affc0, r * 3.2);
      this.glow.position.y = r;
      root.add(this.glow);
      this.parts = { glass, ring2, ringM };
      this.setModel({ root, update: () => {}, dispose: () => { glass.geometry.dispose(); this.glassMat.dispose(); ring2.geometry.dispose(); ringM.dispose(); } });
    }
  }

  starEnt() { return this.level.entities.find((e) => e.kind === 'star' && e.index === this.spec.star && !e.removed); }

  onCannon(ball) {
    if (this.broken) return;
    this.broken = true;
    const L = this.level;
    L.sfx('brickbreak');
    L.effects?.sparks(this.center(), 26);
    L.effects?.debris?.(this.center(), 0xb8f0ff, 10);
    const s = this.starEnt();
    if (s?.hidden) s.reveal?.([this.pos.x, this.pos.y + this.r - 0.4, this.pos.z]);
    this.shooter = ball?.owner ?? L.player;
    this.flyT = 0;
    L.signal?.('sternkapsel', { id: this.spec.id ?? null });
  }

  update(dt) {
    if (this.flyT < 0) return;
    this.flyT += dt;
    // der Stern fliegt zur Schützin und wird eingesammelt
    const s = this.starEnt(), p = this.shooter;
    if (!s || !p || s.removed || !s.alive) { this.kill(); return; }
    const tx = p.pos.x, ty = p.pos.y + 0.6, tz = p.pos.z;
    const k = Math.min(1, dt * (4 + this.flyT * 10));
    s.pos.x += (tx - s.pos.x) * k; s.pos.y += (ty - s.pos.y) * k; s.pos.z += (tz - s.pos.z) * k;
    if (Math.hypot(tx - s.pos.x, ty - s.pos.y, tz - s.pos.z) < 0.6 || this.flyT > 1.2) { s.onPlayer?.(p, {}); }
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    this.model.root.visible = !this.broken;
    this.parts.ring2.rotation.z = t * 1.2;
    this.glow.material.opacity = 0.45 + 0.15 * Math.sin(t * 3);
  }

  info() { return { broken: this.broken }; }
}
export function sternkapsel(level, spec) { return push(level, new Sternkapsel(level, spec)); }

/**
 * ?-Blöcke für den Kanonen-Helm (Bauplan S-9 Stempel „?-Blöcke beschießen → Brücke erscheint“): die genannten Blöcke
 * (LEVEL.blocks mit id) lösen auch bei einem Kanonenkugel-Treffer aus (wie ein Panzer von der Seite); sind alle benutzt,
 * läuft onAll einmal. In LEVEL.setup aufrufen. → { done, used, of, info() } unter id.
 */
export function kanonenFrageBloecke(level, o) {
  const st = { done: false, used: 0, of: o.ids.length };
  const blocks = o.ids.map((id) => level.entities.find((e) => e.spec?.id === id)).filter(Boolean);
  for (const b of blocks) {
    const orig = b.onHit.bind(b);
    b.onHit = (kind, src, form) => orig(kind === 'cannon' ? 'shell' : kind, src, form);
  }
  level.onStep(() => {
    if (st.done) return;
    st.used = blocks.filter((b) => b.kind === 'used' || b.used || b.look === 'used').length;
    if (st.used >= st.of) {
      st.done = true;
      level.sfx('key');
      runAction(level, o.onAll, { pos: o.pos ?? [blocks[0].pos.x, blocks[0].pos.y + 1, blocks[0].pos.z] });
    }
  });
  const h = { get done() { return st.done; }, get used() { return st.used; }, of: st.of, info: () => ({ ...st }) };
  if (o.id) level.named.set(o.id, h);
  return h;
}

/**
 * Glasdecke (Unterwassertunnel S-9): feste, durchsichtige Decke (Kamera sieht hindurch) mit Metallrahmen und Neonstreben.
 *   { x0, x1, z0, z1, y (Unterkante), thick: 0.35, ribs: 4 (m Abstand der Streben) }
 */
export function glasdecke(level, spec) {
  const x0 = Math.min(spec.x0, spec.x1), x1 = Math.max(spec.x0, spec.x1), z0 = Math.max(spec.z0, spec.z1), z1 = Math.min(spec.z0, spec.z1);
  const y = spec.y, t = spec.thick ?? 0.35;
  level.world.add({ type: 'box', min: [x0, y, z1], max: [x1, y + t, z0], camIgnore: true, noWallSlide: true, tag: 'glasdecke' });
  if (!level.view) return;
  const mat = new THREE.MeshStandardMaterial({ color: 0xa8f0ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, t * 0.5, z0 - z1), mat);
  glass.position.set((x0 + x1) / 2, y + t * 0.6, (z0 + z1) / 2);
  glass.renderOrder = 2;
  addObject(level, glass);
  const b = new Bld(), g = new Bld();
  const rib = spec.ribs ?? 4;
  const n = Math.max(1, Math.round((z0 - z1) / rib));
  for (let i = 0; i <= n; i++) {
    const z = z0 - (i / n) * (z0 - z1);
    b.box(x1 - x0 + 0.2, t, 0.22, (x0 + x1) / 2, y, z, 0xd8e0f4, { r: 0.04 });
    g.box(x1 - x0, 0.06, 0.06, (x0 + x1) / 2, y + t + 0.01, z, i % 2 ? 0x4ae8ff : 0xff4ad8);
  }
  for (const x of [x0, x1]) b.box(0.3, t + 0.1, z0 - z1, x, y - 0.05, (z0 + z1) / 2, 0xb8c0d8);
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Klares Wasser (Darstellung zu einem `water`-Baustein mit show: false): leicht getönter Wasserkörper und eine bewegte
 * Oberfläche nur über surface-Bereichen (z. B. dem offenen Becken; unter der Glasdecke sieht man durch das Glas auf das
 * Riff). { pos, size } wie beim water-Baustein, surface: [[zA, zB], …], color, opacity }.
 */
export function klaresWasser(level, spec) {
  if (!level.view) return;
  const [x, y, z] = spec.pos, [w, h, d] = spec.size;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.06, d - 0.02),
    new THREE.MeshStandardMaterial({ color: spec.color ?? 0x2a8ad8, transparent: true, opacity: spec.opacity ?? 0.2, roughness: 0.2, depthWrite: false }));
  body.position.set(x, y + (h - 0.06) / 2, z);
  body.renderOrder = 1;
  addObject(level, body);
  for (const [zA, zB] of spec.surface ?? []) {
    const za = Math.max(zA, zB), zb = Math.min(zA, zB), L = za - zb;
    const g = new THREE.PlaneGeometry(w - 0.02, L, Math.max(2, Math.round(w)), Math.max(2, Math.round(L)));
    g.rotateX(-PI / 2);
    const surf = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6ad8ff, transparent: true, opacity: 0.5, roughness: 0.12, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    surf.position.set(x, y + h - 0.04, (za + zb) / 2);
    surf.renderOrder = 1;
    surf.receiveShadow = true;
    const P = g.attributes.position, base = Float32Array.from(P.array);
    addObject(level, surf, () => {
      const t = level.time ?? 0;
      for (let i = 0; i < P.count; i++) P.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(base[i * 3] * 1.7 + t * 2.2) * 0.04 + Math.cos(base[i * 3 + 2] * 1.3 + t * 1.7) * 0.04;
      P.needsUpdate = true;
    });
  }
}

// =====================================================================================================================
// 5) S-9 Kulisse
// =====================================================================================================================

/**
 * Neon-Zier für Stationsdecks (die Decks selbst sind island-Bausteine): list [{ x0, x1, z0, z1, top, edge: 'cyan' |
 * 'pink' | 'gruen', stripes: true (Warnstreifen an den Kanten), jets: true (Düsen unten), lights: true }].
 */
const NEON = { cyan: 0x4ae8ff, pink: 0xff4ad8, gruen: 0x6aff9a, gold: 0xffd23a };
export function deckZier(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1), z0 = Math.max(s.z0, s.z1), z1 = Math.min(s.z0, s.z1), top = s.top;
    const col = NEON[s.edge ?? 'cyan'] ?? s.edge;
    const W = x1 - x0, D = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // Neonkante knapp unter der Oberkante
    g.box(W + 0.06, 0.1, 0.08, cx, top - 0.28, z0 + 0.02, col); g.box(W + 0.06, 0.1, 0.08, cx, top - 0.28, z1 - 0.02, col);
    g.box(0.08, 0.1, D + 0.06, x0 - 0.02, top - 0.28, cz, col); g.box(0.08, 0.1, D + 0.06, x1 + 0.02, top - 0.28, cz, col);
    // Warnstreifen an der Vorderkante (gelb-dunkel)
    if (s.stripes !== false) {
      const n = Math.max(2, Math.round(W / 0.8));
      for (let i = 0; i < n; i++) b.box(W / n * 0.5, 0.03, 0.4, x0 + (i + 0.5) * (W / n), top, z1 + 0.3, 0xffd23a, { r: 0.01 });
      for (let i = 0; i < n; i++) b.box(W / n * 0.5, 0.03, 0.4, x0 + (i + 0.5) * (W / n), top, z0 - 0.3, 0xffd23a, { r: 0.01 });
    }
    // Lichtpunkte im Boden
    if (s.lights !== false) {
      const nx = Math.max(1, Math.floor(W / 3)), nz = Math.max(1, Math.floor(D / 3));
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) if ((i + k) % 2 === 0) g.cyl(0.12, 0.12, 0.03, x0 + (i + 0.5) * (W / nx), top, z1 + (k + 0.5) * (D / nz), (i + k) % 4 ? col : 0xffffff, 8);
    }
    // Düsen unter dem Deck
    if (s.jets !== false) {
      const under = s.under ?? 1.4;
      for (const [jx, jz] of [[x0 + 0.9, z0 - 0.9], [x1 - 0.9, z0 - 0.9], [x0 + 0.9, z1 + 0.9], [x1 - 0.9, z1 + 0.9]]) {
        b.cyl(0.42, 0.3, 0.7, jx, top - under - 0.9, jz, 0x5a6080, 10);
        g.cone(0.3, 0.9, jx, top - under - 1.9, jz, 0x8af4ff, 8, { rx: PI });
      }
    }
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Neon-Bodenzeichen auf den Decks (Kulisse, ohne Kollision): list [{ kind: 'ring' (Landefeld: zwei Leuchtringe mit
 * Punkten) | 'pfeile' (drei Leuchtwinkel in Richtung dir) | 'feld' (bunte Bodenplatten n × n), pos: [x, y, z], r: 1.6,
 * color, dir: [0, -1], n: 3, cell: 1 }].
 */
const FELD = [0xff8ad8, 0x8af4ff, 0xffe27a, 0xb89aff, 0x9affb0];
export function neonBoden(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, col = NEON[s.color ?? 'cyan'] ?? s.color;
    if (s.kind === 'ring') {
      const r = s.r ?? 1.6;
      g.torus(r, 0.06, x, y + 0.03, z, col, { rx: PI / 2, ts: 32, rs: 4 });
      g.torus(r * 0.62, 0.05, x, y + 0.03, z, 0xffffff, { rx: PI / 2, ts: 24, rs: 4 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.cyl(0.08, 0.08, 0.03, x + Math.cos(a) * r * 1.18, y, z + Math.sin(a) * r * 1.18, i % 2 ? col : 0xffffff, 6); }
      b.cyl(r * 0.98, r * 0.98, 0.02, x, y, z, 0x3a3e6a, 24);
    } else if (s.kind === 'pfeile') {
      const [dx, dz] = s.dir ?? [0, -1], yaw = Math.atan2(dx, dz), L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      for (let i = 0; i < 3; i++) {
        const cx = x + ux * i * 0.9, cz = z + uz * i * 0.9;
        for (const sd of [-1, 1]) {
          const ox = Math.cos(yaw) * sd * 0.32, oz = -Math.sin(yaw) * sd * 0.32;
          g.box(0.16, 0.03, 0.8, cx + ox - ux * 0.2, y, cz + oz - uz * 0.2, i === 1 ? 0xffffff : col, { yaw: yaw - sd * 0.8, r: 0 });
        }
      }
    } else {
      const n = s.n ?? 3, c = s.cell ?? 1;
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
        const px = x + (i - (n - 1) / 2) * c, pz = z + (k - (n - 1) / 2) * c;
        b.box(c - 0.1, 0.03, c - 0.1, px, y, pz, FELD[(i * 3 + k * 2 + idx) % FELD.length], { r: 0 });
      }
    }
  });
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/**
 * Weltraum-Pflanzen in Pflanzkübeln (Kulisse; Kollision schlanker Zylinder um den Kübel): list [{ pos, size: 1, color }] –
 * Metallkübel mit Neonrand, gebogene Stiele mit leuchtenden Knospen, runde Blätter.
 */
const KNOSPE = [0xff6ad8, 0x6af4ff, 0xc8ff6a, 0xffd23a, 0xb89aff];
export function weltraumPflanzen(level, list) {
  const b = new Bld(), g = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, k = s.size ?? 1;
    level.world.add({ type: 'cyl', x, z, r: 0.5 * k, y0: y, y1: y + 0.7 * k, tag: 'pflanzkuebel' });
    if (!level.view) return;
    b.cyl(0.5 * k, 0.4 * k, 0.6 * k, x, y, z, litTop(0x5a6088), 10);
    g.torus(0.48 * k, 0.04 * k, x, y + 0.6 * k, z, NEON[s.color ?? ['pink', 'cyan', 'gruen', 'gold'][idx % 4]] ?? 0xff4ad8, { rx: PI / 2, ts: 16, rs: 4 });
    b.cyl(0.44 * k, 0.44 * k, 0.04, x, y + 0.56 * k, z, 0x3a2a4a, 10);
    const n = 4 + (idx % 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + idx, h = (0.9 + ((i * 5 + idx) % 4) * 0.28) * k, lean = 0.28;
      const tx = x + Math.cos(a) * 0.22 * k, tz = z + Math.sin(a) * 0.22 * k;
      b.cyl(0.035 * k, 0.05 * k, h, tx, y + 0.56 * k, tz, 0x3ac88a, 5, { rx: Math.sin(a) * lean, rz: -Math.cos(a) * lean });
      const ex = tx + Math.cos(a) * Math.sin(lean) * h, ez = tz + Math.sin(a) * Math.sin(lean) * h, ey = y + 0.56 * k + Math.cos(lean) * h;
      g.sphere(0.13 * k, ex, ey, ez, KNOSPE[(i + idx) % KNOSPE.length], { ws: 8, hs: 6 });
      b.sphere(0.2 * k, tx + Math.cos(a) * 0.12, y + 0.62 * k + h * 0.35, tz + Math.sin(a) * 0.12, 0x2aa87a, { s: [1.2, 0.3, 0.7], yaw: -a, ws: 8, hs: 4 });
    }
  });
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/**
 * Riff im Unterwassertunnel (Kulisse ohne Kollision): list [{ pos: [x, y, z] (Boden), kind: 'koralle' (verzweigt) | 'roehren'
 * (Röhrenbüschel) | 'faecher' (Fächerkoralle) | 'tang' (Seegras) | 'muschel' | 'seestern' (leuchtend), size: 1, color }].
 */
const RIFF = { seestern: [0xff8a3a, 0xffd23a], koralle: [0xff6a8a, 0xff8ad8], roehren: [0xffa83a, 0xffd23a], faecher: [0xb87aff, 0x8a5aff], tang: [0x3ad88a, 0x2ab87a], muschel: [0xffc8e0, 0xfff0f6] };
export function riffZier(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  list.forEach((s, idx) => {
    const [x, y, z] = s.pos, k = s.size ?? 1, kind = s.kind ?? 'koralle', [c1, c2] = RIFF[kind] ?? RIFF.koralle, col = s.color ?? c1;
    if (kind === 'koralle') {
      b.cyl(0.08 * k, 0.12 * k, 0.5 * k, x, y, z, col, 6);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + idx, lean = 0.5 + (i % 2) * 0.2, h = (0.45 + (i % 3) * 0.15) * k;
        const bx = x + Math.cos(a) * 0.05, bz = z + Math.sin(a) * 0.05;
        (i % 2 ? g : b).cyl(0.04 * k, 0.07 * k, h, bx, y + 0.4 * k, bz, i % 2 ? col : c2, 5, { rx: Math.sin(a) * lean, rz: -Math.cos(a) * lean });
        g.sphere(0.06 * k, bx + Math.cos(a) * Math.sin(lean) * h, y + 0.4 * k + Math.cos(lean) * h, bz + Math.sin(a) * Math.sin(lean) * h, 0xffe0f0, { ws: 5, hs: 4 });
      }
    } else if (kind === 'roehren') {
      for (let i = 0; i < 6; i++) {
        const a = i * 2.4 + idx, rr = 0.16 * k * (i ? 1 : 0), h = (0.4 + ((i * 3) % 4) * 0.16) * k;
        b.cyl(0.09 * k, 0.1 * k, h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, i % 2 ? col : c2, 7, { open: true });
        g.cyl(0.07 * k, 0.07 * k, 0.02, x + Math.cos(a) * rr, y + h - 0.03, z + Math.sin(a) * rr, 0xfff6a0, 7);
      }
    } else if (kind === 'faecher') {
      b.add(new THREE.CircleGeometry(0.6 * k, 12, 0, PI), col, { p: [x, y, z], r: [0, s.yaw ?? (idx * 0.9), 0] });
      b.add(new THREE.CircleGeometry(0.45 * k, 10, 0, PI), c2, { p: [x + 0.02, y, z + 0.02], r: [0, (s.yaw ?? (idx * 0.9)) + 0.2, 0] });
    } else if (kind === 'tang') {
      for (let i = 0; i < 4; i++) {
        const ox = (i - 1.5) * 0.14 * k, h = (0.9 + (i % 3) * 0.35) * k;
        for (let j = 0; j < 3; j++) b.cyl(0.035 * k, 0.05 * k, h / 3, x + ox + Math.sin(j * 1.4 + i) * 0.08, y + (h / 3) * j, z, j % 2 ? c2 : col, 5, { rz: Math.sin(j * 1.4 + i) * 0.3 });
      }
    } else if (kind === 'seestern') {
      g.add(starGeo(0.32 * k, 0.08), col, { p: [x, y + 0.05, z], r: [-PI / 2, 0, idx * 0.7], order: 'XYZ' });
      g.sphere(0.06 * k, x, y + 0.1, z, 0xffffff, { ws: 5, hs: 3 });
    } else {
      b.sphere(0.3 * k, x, y + 0.08, z, col, { s: [1, 0.35, 0.85], ws: 10, hs: 5 });
      b.sphere(0.28 * k, x, y + 0.2, z - 0.06, c2, { s: [1, 0.3, 0.8], rx: -0.5, ws: 10, hs: 5 });
      g.sphere(0.08 * k, x, y + 0.16, z + 0.02, 0xffffff, { ws: 6, hs: 4 });
    }
  });
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}

/** Signal-Lampen (Ampeln) an Masten neben den Gleisen: list [{ pos, yaw, color }] – Kulisse. */
export function signalLampen(level, list) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  for (const s of list) {
    const [x, y, z] = s.pos;
    b.cyl(0.08, 0.1, 2.6, x, y, z, 0xd8e0f4, 8);
    b.box(0.42, 0.9, 0.3, x, y + 2.4, z, 0x2a2c48, { r: 0.06 });
    g.sphere(0.13, x, y + 3.0, z + 0.16, 0xff4a6a);
    g.sphere(0.13, x, y + 2.7, z + 0.16, NEON[s.color ?? 'gruen'] ?? 0x6aff9a);
  }
  b.flush(level, { castShadow: true });
  g.flush(level, { material: 'glow' });
}

/**
 * Tunnel-Zier (Unterwassertunnel S-9): Leuchtstreifen an den Wänden, Bodenlichter, Bullaugen. spec { x0, x1, z0, z1, y0
 * (Boden), y1 (Decke) }.
 */
export function tunnelZier(level, spec) {
  if (!level.view) return;
  const b = new Bld(), g = new Bld();
  const x0 = Math.min(spec.x0, spec.x1), x1 = Math.max(spec.x0, spec.x1), z0 = Math.max(spec.z0, spec.z1), z1 = Math.min(spec.z0, spec.z1);
  const y0 = spec.y0, y1 = spec.y1;
  const n = Math.max(2, Math.round((z0 - z1) / 3));
  for (let i = 0; i <= n; i++) {
    const z = z0 - (i / n) * (z0 - z1);
    for (const x of [x0 + 0.06, x1 - 0.06]) {
      g.box(0.06, (y1 - y0) * 0.5, 0.12, x, y0 + (y1 - y0) * 0.22, z, i % 2 ? 0x4ae8ff : 0xff4ad8);
      b.torus(0.32, 0.06, x, y0 + (y1 - y0) * 0.75, z + 1.5, 0xd8e0f4, { yaw: PI / 2, ts: 14 });
      g.add(new THREE.CircleGeometry(0.28, 12), 0x8af4ff, { p: [x + (x === x0 + 0.06 ? 0.02 : -0.02), y0 + (y1 - y0) * 0.75, z + 1.5], r: [0, x === x0 + 0.06 ? PI / 2 : -PI / 2, 0] });
    }
    g.cyl(0.14, 0.14, 0.04, (x0 + x1) / 2, y0, z, 0xffffff, 8);
  }
  b.flush(level, { castShadow: false });
  g.flush(level, { material: 'glow' });
}
