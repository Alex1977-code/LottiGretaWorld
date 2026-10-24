// Hilfen für die Welt-5-Level 5-1 „Schlüsselsuche am Muschelstrand“ und 5-2 „Zirkus Schwingeschwung“ (kein Level:
// exportiert kein LEVEL, die Level-Registry überspringt dieses Modul). Nur für diese beiden Level – andere Welt-5-Level
// haben eigene Hilfsdateien.
//
// Oben reine Daten-Helfer (Inseln, Felsen, Münzspuren), darunter level-lokale Entitäten und Kulisse, die es als Baustein
// nicht gibt:
//   Strand (5-1)  Pilzlings-Sandskulpturen zum Zertrümmern (Stern / Mini-Pilzlinge darin), Krümel in der Wandhöhle (gibt
//                 den Stern, sobald die Krabbelkäfer besiegt sind), Rettungsturm, Leuchtturm, Strandtücher, Krabben,
//                 springende Delfine, Brandungsschaum, Stimmung je Bereich (Grotte), Glitzerkristalle, Tropfsteine,
//                 Lichtschächte.
//   Zirkus (5-2)  bunte, mitdrehende Hüllen für die Drehscheiben (ganz unten).
// Statische Teile gehen über addStatic in die Abschnitts-Meshes (keine zusätzlichen Zeichenaufrufe), belebte
// Kleinigkeiten sind je ein Mesh bzw. eine Instanz-Gruppe ohne Sonnenschatten.

import * as THREE from 'three';
import { box, colorize, merge, lin, mixc, smooth, hex, addStatic, addObject, Rnd } from '../../blocks/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel, hasModel } from '../../models/index.js';

const TAU = Math.PI * 2;
const L = (c) => lin(hex(c));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, c) => { const col = Array.isArray(c) ? c : L(c); return colorize(ni(g), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }); };
const shadeY = (g, lo, hi, a = -0.6, b = 0.9) => { const A = L(lo), B = L(hi); return colorize(ni(g), (p, n, o) => mixc(A, B, smooth(a, b, n.y), o)); };

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Insel über ihre Grundfläche x0..x1, zA..zB (Reihenfolge egal), Oberseite top, Höhe h; o: weitere Felder (under 0). */
export function isl(x0, x1, zA, zB, top, h = 4, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}
/** Fels mit Felsdeckel (top 'rock') über die Grundfläche. */
export const rock = (x0, x1, zA, zB, top, h = 4, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'rock', ...o });

/** Münzreihe von a nach b (n Münzen). */
export const line = (a, b, n) => ({ kind: 'coins', from: a, to: b, n });
/** Münzbogen von a nach b mit Scheitel h (n Münzen, Enden eingeschlossen). */
export function arc(a, b, n, h) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Münzring (waagerecht) um c mit Radius r. */
export const ring = (c, r, n) => ({ kind: 'coins', pos: c, r, n });
/** Münzsäule bei (x, z) von y0 bis y1. */
export function column(x, z, y0, y1, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'coin', pos: [x, y0 + (y1 - y0) * (n === 1 ? 0 : i / (n - 1)), z] });
  return out;
}

// =====================================================================================================================
// Kleine Werkzeuge
// =====================================================================================================================

/** Stimmungen moods (Format view/mood.js) anmelden und je Bereich zones = [{ min: [x, z], max: [x, z], mood }] umschalten. */
export function areaMoods(level, moods, zones) {
  const v = level.view;
  level.moodNow = null;
  if (v) v.theme = { ...v.theme, moods: { ...(v.theme.moods ?? {}), ...moods } };
  const pick = (p) => {
    for (const zn of zones) if (p.pos.x >= zn.min[0] && p.pos.x <= zn.max[0] && p.pos.z >= zn.min[1] && p.pos.z <= zn.max[1]) return zn.mood ?? null;
    return null;
  };
  const apply = (fast) => {
    const p = level.player;
    if (!p) return;
    const m = pick(p);
    if (m === level.moodNow) return;
    level.moodNow = m;
    v?.setMood?.(m, { time: fast ? 0 : 1.1 });
  };
  apply(true);
  level.onStep(() => apply(false));
}

/**
 * Klare Sicht in Räume (Baustein room): der Ausschnitt (Decke und Wand zur Kamera) blendet der Baustein auf 18 % ab –
 * bei hellen Decken liegt dann ein milchiger Schleier über dem Raum. Hier verschwindet er ganz, sobald er weit genug
 * abgeblendet ist (gilt für alle Räume des Levels; im Haken nach den Bausteinen aufrufen).
 */
export function raumKlar(level, below = 0.4) {
  const v = level.view;
  if (!v) return;
  const meshes = [];
  v.three.traverse((o) => { if (o.isMesh && o.name === 'raum:ausschnitt') meshes.push(o); });
  if (!meshes.length) return;
  v.onFrame(() => { for (const m of meshes) m.visible = !(m.material.transparent && m.material.opacity < below); });
}

/**
 * Budget: Objekte (Name genau oder Präfix mit „*“, z. B. 'wasser:*'; optional nur wo where(Mittelpunkt) gilt) blenden
 * aus, solange far(player) gilt – für Teile, die von dort verdeckt oder außer Sicht sind, aber im Sichtkegel
 * Zeichenaufrufe kosten. Stellt beim Zurückkehren den vorherigen Zustand wieder her. Im Haken nach den Bausteinen.
 */
export function fernAus(level, names, far, where = null) {
  const v = level.view;
  if (!v) return;
  const exact = new Set(names.filter((n) => !n.endsWith('*'))), pre = names.filter((n) => n.endsWith('*')).map((n) => n.slice(0, -1));
  const objs = [];
  v.three.updateMatrixWorld(true);
  v.three.traverse((o) => {
    if (!o.name || !(exact.has(o.name) || pre.some((q) => o.name.startsWith(q)))) return;
    if (where) {
      // Mittelpunkt der Geometrie in Weltkoordinaten (Objekte stehen oft im Ursprung)
      const g = o.geometry;
      if (g && !g.boundingSphere) g.computeBoundingSphere();
      const c = g?.boundingSphere ? g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld) : o.getWorldPosition(new THREE.Vector3());
      if (!where(c, o)) return;
    }
    objs.push(o);
  });
  let hidden = false;
  const saved = new Map();
  v.onFrame(() => {
    const p = level.player;
    const h = !!p && far(p);
    if (h === hidden) return;
    hidden = h;
    for (const o of objs) {
      if (h) { saved.set(o, o.visible); o.visible = false; } else o.visible = saved.get(o) ?? true;
    }
  });
}

/** Nur in der Nähe der Figur sichtbar (Darstellung): liefert eine Prüffunktion, die obj.visible setzt. */
function nearOnly(level, obj, x, z, r = 40) {
  return () => { const p = level.player; obj.visible = !p || Math.hypot(p.pos.x - x, p.pos.z - z) < r; return obj.visible; };
}

let glowTex = null;
/** Weicher, runder Glanz (Sprites für Leuchtturm-Licht, Kristallschein). */
function glowTexture() {
  if (glowTex) return glowTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Sprechblase (Sprite mit Leinwand-Text). */
function bubbleSprite(text, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const r = 46;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#3a2a6a'; g.lineWidth = 10;
  g.beginPath();
  g.moveTo(30 + r, 20); g.lineTo(482 - r, 20); g.quadraticCurveTo(482, 20, 482, 20 + r); g.lineTo(482, 180 - r);
  g.quadraticCurveTo(482, 180, 482 - r, 180); g.lineTo(290, 180); g.lineTo(240, 238); g.lineTo(236, 180); g.lineTo(30 + r, 180);
  g.quadraticCurveTo(30, 180, 30, 180 - r); g.lineTo(30, 20 + r); g.quadraticCurveTo(30, 20, 30 + r, 20); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = '#3a2a6a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 60px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  g.fillText(text, 256, sub ? 80 : 100);
  if (sub) { g.font = 'bold 36px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif'; g.fillStyle = '#e8438c'; g.fillText(sub, 256, 140); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.4, 1.2, 1);
  sp.renderOrder = 6;
  return sp;
}

// =====================================================================================================================
// Strand (5-1): Pilzlings-Sandskulpturen
// =====================================================================================================================

const CRUMBLE = new Set(['claw', 'fire', 'shell', 'pound', 'bomb', 'mega', 'cannon', 'throw', 'star', 'punch', 'tail']);

/**
 * Pilzlings-Sandskulptur als level-lokale Entität (Modell 'sandskulptur_pilzling'): fester Zylinder mit Flag breakable –
 * eine Stampfattacke von oben, Tatzenhieb, Feuer, Panzer, Bombe, Riesentrank lassen sie zu einem Sandhaufen zerfallen;
 * danach läuft content (Aktion im Format von entities/gimmick.js, z. B. { star: 0 }) bzw. es springen minis
 * Mini-Pilzlinge aus dem Torbogen.
 */
class SandSkulptur extends CourseEntity {
  constructor(level, it) {
    super(level, { pos: it.pos, id: it.id }, 'sandskulptur');
    this.it = it;
    this.h = it.height ?? 2.6;
    this.r = it.r ?? 0.95;
    this.half.set(this.r, this.h / 2, this.r);
    this.yaw = it.yaw ?? -Math.PI / 2;
    this.shadow = 0;
    this.broken = false;
    this.k = 0;
    this.spawned = false;
    this.minis = it.minis ?? 0;
    this.content = it.content ?? null;
    this.addShape({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: this.r, y0: this.pos.y, y1: this.pos.y + this.h * 0.94, breakable: true, tag: 'sandskulptur' });
    if (level.view) {
      const m = getModel('sandskulptur_pilzling', { height: this.h, hole: this.minis > 0, toys: it.toys ?? false });
      m.root.traverse((o) => { if (o.isMesh) o.castShadow = it.shadow !== false; });
      this.setModel(m);
      if (it.sparkle) this.buildSparkle();
    }
  }

  /** Feines Glitzern über der Skulptur mit dem Stern (Hinweis für Kinder). */
  buildSparkle() {
    const n = 10, g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, map: glowTexture(), color: 0xfff4a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    this.sparkle = pts;
    const seeds = Array.from({ length: n }, (_, i) => ({ a: i * 2.39, s: 0.6 + (i % 4) * 0.25, y: (i * 0.37) % 1 }));
    const holder = {};
    addObject(this.level, pts, (dt) => {
      const d = visDt(this.level, holder, dt);
      pts.visible = !this.broken;
      if (!pts.visible) return;
      for (let i = 0; i < n; i++) {
        const s = seeds[i];
        s.y += d * 0.35 * s.s; if (s.y > 1) s.y -= 1;
        const rr = this.r * (0.6 + 0.5 * Math.sin(s.a + s.y * 3));
        arr[i * 3] = this.pos.x + Math.cos(s.a + s.y * 2) * rr;
        arr[i * 3 + 1] = this.pos.y + this.h * (0.4 + s.y * 0.85);
        arr[i * 3 + 2] = this.pos.z + Math.sin(s.a + s.y * 2) * rr;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  onPlayer() { return 'none'; }
  onHit(kind) { if (CRUMBLE.has(kind)) this.crumble(); }
  onPound() { this.crumble(); }

  crumble() {
    if (this.broken) return;
    this.broken = true;
    this.k = 0;
    this.removeShapes();
    // flacher Sandhaufen bleibt liegen (begehbar)
    this.addShape({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: this.r * 1.1, y0: this.pos.y, y1: this.pos.y + 0.3, tag: 'sandhaufen' });
    this.level.sfx('sand_crumble');
    this.level.sfx('brickbreak');
    this.level.effects?.dust?.({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 14, 1.8);
    this.level.effects?.debris?.({ x: this.pos.x, y: this.pos.y + 1.4, z: this.pos.z }, 0xf4d49a);
  }

  update(dt) {
    if (!this.broken) return;
    this.k += dt;
    if (!this.spawned && this.k > 0.45) {
      this.spawned = true;
      const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
      for (let i = 0; i < this.minis; i++) {
        const side = (i - (this.minis - 1) / 2) * 0.9;
        this.level.spawn('pilzling', {
          id: this.it.id ? `${this.it.id}_mini${i}` : undefined, mini: true, behavior: 'chase', sight: 8,
          pos: [this.pos.x + fx * 1.3 - fz * side, this.pos.y, this.pos.z + fz * 1.3 + fx * side], dir: [fx, fz],
        });
      }
      if (this.content) runAction(this.level, this.content, { pos: [this.pos.x, this.pos.y + 1.2, this.pos.z], source: this });
    }
  }

  modelState() { return this.broken ? { anim: 'crumble', progress: Math.min(1, this.k / 1.2) } : { anim: 'idle' }; }

  info() { return { broken: this.broken, spawned: this.spawned, minis: this.minis }; }
}

/** Sandskulpturen anlegen: list = [{ id, pos, yaw, height, minis, content, sparkle }]. → Entitäten (auch level.named). */
export function sandSkulpturen(level, list) {
  const out = [];
  for (const it of list) {
    const e = new SandSkulptur(level, it);
    level.entities.push(e);
    if (it.id) level.named.set(it.id, e);
    out.push(e);
  }
  return out;
}

// =====================================================================================================================
// Strand (5-1): Krümel in der Wandhöhle
// =====================================================================================================================

/**
 * Krümel (Kapitäns-Rolle) wartet in der Wandhöhle bei seiner Laterne. Solange die Krabbelkäfer der Aufgabe (task-Id)
 * leben, zittert er ängstlich („Hilfe!“); sind alle besiegt, jubelt er, hüpft und der Stern der Aufgabe erscheint vor
 * ihm („Danke! Der ist für dich!“). o: { pos, yaw, task (Id der task-Entität), hero-Name im Dank }.
 */
export function kruemelHoehle(level, o) {
  const st = { state: 'wait', t: 0, hops: 0 };
  level.named.set('kruemel', st);
  const [x, y, z] = o.pos;
  level.onStep((dt) => {
    const task = level.named.get(o.task);
    st.t += dt;
    if (st.state !== 'happy' && task?.state === 'done') { st.state = 'happy'; st.t = 0; }
    else if (st.state === 'wait' && task?.state === 'active') { st.state = 'scared'; st.t = 0; }
  });
  if (!level.view || !hasModel('kruemel')) return st;
  const m = getModel('kruemel');
  m.root.scale.setScalar(1.25);
  m.root.position.set(x, y, z);
  m.root.rotation.y = o.yaw ?? -Math.PI / 2;
  const help = bubbleSprite('Hilfe!', 'Käfer überall!');
  const thanks = bubbleSprite('Danke!', 'Der Stern ist für dich!');
  help.position.set(x, y + 1.9, z); thanks.position.set(x, y + 1.9, z);
  help.visible = false; thanks.visible = false;
  const grp = new THREE.Group();
  grp.add(m.root, help, thanks);
  level.view.shadows?.add?.({ pos: new THREE.Vector3(x, y, z), radius: 0.36, alive: () => true, visible: () => true });
  const holder = {};
  const near = () => { const p = level.player; return !!p && Math.hypot(p.pos.x - x, p.pos.z - z) < 12; };
  addObject(level, grp, (dt) => {
    const d = visDt(level, holder, dt);
    const happy = st.state === 'happy';
    const scared = st.state === 'scared' || (st.state === 'wait' && near());
    m.update?.(d, { anim: happy ? (st.t < 3 ? 'cheer' : 'hop') : scared ? 'scared' : 'idle' });
    help.visible = scared && !happy;
    thanks.visible = happy && st.t < 6;
    const bob = Math.sin(level.time * 3) * 0.05;
    help.position.y = y + 1.9 + bob; thanks.position.y = y + 1.9 + bob;
  });
  return st;
}

// =====================================================================================================================
// Strand (5-1): Kulisse
// =====================================================================================================================

/**
 * Rettungsturm (Strandwache): vier Holzbeine, Plattform (begehbar, Oberseite top), Dach mit Streifen, Rettungsring,
 * Treppe nach +Z (Stufen begehbar). pos = Mitte am Boden; o: { top: 3, stairs: true }.
 */
export function rettungsturm(level, x, y, z, o = {}) {
  const top = y + (o.top ?? 3);
  const W = 2.8;
  level.world.add({ type: 'box', min: [x - W / 2, top - 0.3, z - W / 2], max: [x + W / 2, top, z + W / 2], tag: 'rettungsturm' });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) level.world.add({ type: 'cyl', x: x + dx * (W / 2 - 0.2), z: z + dz * (W / 2 - 0.2), r: 0.14, y0: y, y1: top - 0.3, tag: 'rettungsturm:bein' });
  // Treppe (Stufen ≤ 0,27 m hoch, 0,45 m tief) nach +Z
  const steps = Math.ceil((top - y) / 0.27), RUN = 0.45;
  if (o.stairs !== false) {
    for (let i = 0; i < steps - 1; i++) {
      const sy = y + (i + 1) * ((top - y) / steps), sz = z + W / 2 + (steps - 1 - i) * RUN + RUN / 2 - 0.05;
      level.world.add({ type: 'box', min: [x - 0.7, sy - 0.15, sz - RUN / 2], max: [x + 0.7, sy, sz + RUN / 2], tag: 'rettungsturm:stufe' });
    }
  }
  if (!level.view) return;
  const parts = [];
  parts.push(box(W, 0.3, W, x, top - 0.15, z, 0xf0d8b0, { r: 0.06, seg: 1, topColor: 0xfff0d0 }));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(box(0.26, top - y, 0.26, x + dx * (W / 2 - 0.2), (y + top) / 2, z + dz * (W / 2 - 0.2), 0xd85a4a, { r: 0.05, seg: 1 }));
  // Kreuzstreben
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.1, Math.hypot(W - 0.4, top - y) * 0.98, 0.1);
    g.rotateZ(s * Math.atan2(W - 0.4, top - y));
    g.translate(x, (y + top) / 2, z - W / 2 + 0.2);
    parts.push(fill(g, 0xb84a3a));
  }
  // Geländer und Dach
  for (const [dx, dz, w, d] of [[0, -1, W, 0.08], [-1, 0, 0.08, W], [1, 0, 0.08, W]]) parts.push(box(w, 0.08, d, x + dx * (W / 2 - 0.04), top + 0.85, z + dz * (W / 2 - 0.04), 0xffffff, { r: 0.03, seg: 0 }));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(box(0.1, 2.1, 0.1, x + dx * (W / 2 - 0.1), top + 1.05, z + dz * (W / 2 - 0.1), 0xffffff, { r: 0.03, seg: 0 }));
  const roof = new THREE.ConeGeometry(W * 0.86, 0.9, 4, 1);
  roof.rotateY(Math.PI / 4);
  roof.translate(x, top + 2.55, z);
  const ra = L(0xff4a4a), rb = L(0xffffff);
  parts.push(colorize(ni(roof), (p, n, o2) => { const k = Math.floor(((Math.atan2(p.z - z, p.x - x) + Math.PI) / TAU) * 8) & 1; const c = k ? ra : rb; o2[0] = c[0]; o2[1] = c[1]; o2[2] = c[2]; }));
  // Rettungsring vorn am Geländer
  const ringG = new THREE.TorusGeometry(0.34, 0.1, 6, 16);
  ringG.translate(x + 0.6, top + 0.55, z + W / 2 + 0.06);
  parts.push(colorize(ni(ringG), (p, n, o2) => { const k = Math.floor(((Math.atan2(p.y - top - 0.55, p.x - x - 0.6) + Math.PI) / TAU) * 8) & 1; const c = k ? ra : rb; o2[0] = c[0]; o2[1] = c[1]; o2[2] = c[2]; }));
  // Treppe
  if (o.stairs !== false) {
    for (let i = 0; i < steps - 1; i++) {
      const sy = y + (i + 1) * ((top - y) / steps), sz = z + W / 2 + (steps - 1 - i) * RUN + RUN / 2 - 0.05;
      parts.push(box(1.4, 0.15, RUN + 0.02, x, sy - 0.075, sz, 0xf0d8b0, { r: 0.03, seg: 0 }));
    }
    for (const s of [-1, 1]) {
      const len = Math.hypot((steps - 1) * RUN, top - y);
      const g = new THREE.BoxGeometry(0.12, 0.2, len);
      g.rotateX(-Math.atan2(top - y, (steps - 1) * RUN));
      g.translate(x + s * 0.75, (y + top) / 2 - 0.1, z + W / 2 + ((steps - 1) * RUN) / 2);
      parts.push(fill(g, 0xd85a4a));
    }
  }
  // Fähnchen
  parts.push(box(0.05, 1.2, 0.05, x - W / 2 + 0.1, top + 3.2, z - W / 2 + 0.1, 0xffffff, { r: 0.01, seg: 0 }));
  const flag = new THREE.BoxGeometry(0.7, 0.4, 0.03);
  flag.translate(x - W / 2 + 0.47, top + 3.6, z - W / 2 + 0.1);
  parts.push(fill(flag, 0xff3a5a));
  addStatic(level, merge(parts), { castShadow: true });
}

/**
 * Leuchtturm (rot-weiß gestreift) auf einem Felssockel, Laterne mit drehendem Lichtstrahl (additiv, 1 Objekt).
 * pos = Fuß; o: { h: 9, r: 1.3, solid: true }.
 */
export function leuchtturm(level, x, y, z, o = {}) {
  const H = o.h ?? 9, R = o.r ?? 1.3;
  if (o.solid !== false) level.world.add({ type: 'cyl', x, z, r: R, y0: y, y1: y + H, tag: 'leuchtturm' });
  if (!level.view) return;
  const parts = [];
  const body = new THREE.CylinderGeometry(R * 0.72, R, H, 18, 9, false);
  body.translate(x, y + H / 2, z);
  const red = L(0xe8323a), white = L(0xfff6ee);
  parts.push(colorize(ni(body), (p, n, o2) => { const k = Math.floor((p.y - y) / (H / 6)) & 1; const c = k ? white : red; const s = 0.82 + 0.18 * smooth(-1, 1, n.x * 0.6 + n.z * 0.8); o2[0] = c[0] * s; o2[1] = c[1] * s; o2[2] = c[2] * s; }));
  // Galerie, Laternenhaus, Kuppel
  parts.push(box(R * 2.1, 0.22, R * 2.1, x, y + H + 0.11, z, 0x3a3a4a, { r: 0.1, seg: 1 }));
  const glass = new THREE.CylinderGeometry(R * 0.6, R * 0.6, 1.2, 10, 1);
  glass.translate(x, y + H + 0.82, z);
  parts.push(fill(glass, 0xfff4b0));
  const dome = new THREE.SphereGeometry(R * 0.66, 12, 6, 0, TAU, 0, Math.PI / 2);
  dome.translate(x, y + H + 1.42, z);
  parts.push(fill(dome, 0xe8323a));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    parts.push(box(0.06, 0.7, 0.06, x + Math.cos(a) * R * 1.0, y + H + 0.55, z + Math.sin(a) * R * 1.0, 0xffffff, { r: 0.01, seg: 0 }));
  }
  // Tür und Fenster
  parts.push(box(0.7, 1.3, 0.12, x, y + 0.65, z + R - 0.02, 0x2a5aa8, { r: 0.05, seg: 1 }));
  for (const k of [0.38, 0.62]) parts.push(box(0.45, 0.6, 0.1, x, y + H * k, z + R * (1 - k * 0.28) - 0.02, 0x3a6ac8, { r: 0.05, seg: 1 }));
  addStatic(level, merge(parts), { castShadow: true });
  // Lichtstrahl: zwei gegenüberliegende Kegel, drehen sich
  const beam = new THREE.ConeGeometry(1.4, 14, 12, 1, true);
  beam.rotateZ(Math.PI / 2);
  beam.translate(7.2, 0, 0);
  const b2 = beam.clone(); b2.rotateY(Math.PI);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(merge([beam, b2]), mat);
  mesh.position.set(x, y + H + 0.82, z);
  mesh.renderOrder = 4;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff0a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(3.2, 3.2, 1);
  glow.position.set(x, y + H + 0.82, z);
  const grp = new THREE.Group();
  grp.add(mesh, glow);
  const holder = {};
  addObject(level, grp, (dt) => { const d = visDt(level, holder, dt); mesh.rotation.y += d * 0.9; glow.material.opacity = 0.75 + 0.25 * Math.sin(level.time * 2); });
}

/** Strandtücher (flach, gestreift): list = [[x, y, z, yaw, farbe1, farbe2]]. */
export function strandtuecher(level, list) {
  if (!level.view) return;
  const parts = [];
  for (const [x, y, z, yaw = 0, c1 = 0xff5a8a, c2 = 0xffffff] of list) {
    const g = new THREE.BoxGeometry(1.0, 0.03, 1.9);
    g.rotateY(yaw);
    g.translate(x, y + 0.015, z);
    const A = L(c1), B = L(c2), cy = Math.cos(yaw), sy = Math.sin(yaw);
    parts.push(colorize(ni(g), (p, n, o) => { const lz = -(p.x - x) * sy + (p.z - z) * cy; const k = Math.floor((lz + 1) / 0.3) & 1; const c = k ? A : B; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/**
 * Krabben, die seitwärts über den Strand flitzen (eine Instanz-Gruppe, ohne Schatten; nur nahe der Figur bewegt):
 * list = [{ from: [x, y, z], to: [x, y, z], speed: 1.6, pause: 1.5 }].
 */
export function krabben(level, list) {
  if (!level.view || !list.length) return;
  const parts = [];
  const body = new THREE.SphereGeometry(0.2, 10, 6); body.scale(1.3, 0.55, 1); body.translate(0, 0.14, 0);
  parts.push(shadeY(body, 0xc8281e, 0xff6a4a, -0.4, 1));
  for (const s of [-1, 1]) {
    const claw = new THREE.SphereGeometry(0.1, 8, 5); claw.scale(1.2, 0.8, 0.9); claw.translate(s * 0.33, 0.2, 0.12);
    parts.push(shadeY(claw, 0xd8321e, 0xff7a5a));
    for (let k = 0; k < 3; k++) { const leg = new THREE.BoxGeometry(0.22, 0.03, 0.03); leg.rotateZ(s * 0.5); leg.translate(s * 0.22, 0.07, -0.08 + k * 0.08); parts.push(fill(leg, 0xb8281e)); }
    const eye = new THREE.SphereGeometry(0.045, 6, 4); eye.translate(s * 0.07, 0.3, 0.12); parts.push(fill(eye, 0xffffff));
    const pup = new THREE.SphereGeometry(0.022, 5, 3); pup.translate(s * 0.07, 0.31, 0.16); parts.push(fill(pup, 0x1a1a2a));
  }
  const geo = merge(parts);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), list.length);
  inst.castShadow = false; inst.receiveShadow = false;
  inst.frustumCulled = false;
  inst.name = 'zier:krabben';
  const st = list.map((c, i) => ({ ...c, u: (i * 0.37) % 1, dir: 1, wait: 0 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const holder = {};
  addObject(level, inst, (dt) => {
    const d = visDt(level, holder, dt);
    st.forEach((c, i) => {
      const [ax, ay, az] = c.from, [bx, by, bz] = c.to;
      const len = Math.hypot(bx - ax, bz - az) || 1;
      if (c.wait > 0) c.wait -= d;
      else {
        c.u += (c.dir * (c.speed ?? 1.6) * d) / len;
        if (c.u > 1 || c.u < 0) { c.u = Math.max(0, Math.min(1, c.u)); c.dir = -c.dir; c.wait = c.pause ?? 1.5; }
      }
      const moving = c.wait <= 0;
      v.set(ax + (bx - ax) * c.u, ay + (by - ay) * c.u + (moving ? Math.abs(Math.sin(level.time * 22 + i)) * 0.03 : 0), az + (bz - az) * c.u);
      // seitwärts laufen: Körper quer zur Bahn
      q.setFromAxisAngle(up, Math.atan2(-(bz - az), bx - ax) + Math.PI / 2 + (moving ? 0 : Math.sin(level.time * 3 + i) * 0.3));
      m4.compose(v, q, sc);
      inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
}

/**
 * Delfine springen in Bögen aus dem Meer (Kulisse weit draußen; eine Instanz-Gruppe): list = [{ pos: [x, y, z] (Wasser),
 * dir: [dx, dz], period: 4.5, phase: 0, len: 6, h: 3 }].
 */
export function delfine(level, list) {
  if (!level.view || !list.length) return;
  const parts = [];
  const body = new THREE.SphereGeometry(0.5, 14, 8); body.scale(2.2, 0.75, 0.7);
  const P = body.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i); const k = 1 - Math.max(0, x / 1.1) * 0.55; P.setY(i, P.getY(i) * k); P.setZ(i, P.getZ(i) * k); }
  body.computeVertexNormals();
  parts.push(colorize(ni(body), (p, n, o) => mixc(L(0xe8f4ff), L(0x5a8ad8), smooth(-0.2, 0.5, n.y), o)));
  const fin = new THREE.ConeGeometry(0.18, 0.5, 4); fin.translate(0, 0.55, 0); fin.rotateZ(-0.4); parts.push(fill(fin, 0x4a7ac8));
  const tail = new THREE.BoxGeometry(0.15, 0.06, 0.8); tail.translate(-1.15, 0, 0); parts.push(fill(tail, 0x4a7ac8));
  const nose = new THREE.SphereGeometry(0.15, 6, 4); nose.scale(1.6, 0.8, 0.8); nose.translate(1.15, -0.04, 0); parts.push(fill(nose, 0x6a9ae0));
  const eye = new THREE.SphereGeometry(0.05, 5, 3); for (const s of [-1, 1]) { const e = eye.clone(); e.translate(0.8, 0.08, s * 0.24); parts.push(fill(e, 0x1a1a2a)); }
  const inst = new THREE.InstancedMesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }), list.length);
  inst.castShadow = false; inst.frustumCulled = false; inst.name = 'zier:delfine';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
  const holder = {};
  let t = 0;
  addObject(level, inst, (dt) => {
    t += visDt(level, holder, dt);
    list.forEach((dl, i) => {
      const per = dl.period ?? 4.5, k = ((t / per + (dl.phase ?? 0)) % 1 + 1) % 1;
      const air = k < 0.35 ? k / 0.35 : -1;
      const [dx, dz] = dl.dir ?? [1, 0], len = dl.len ?? 6, h = dl.h ?? 3;
      if (air < 0) { sc.set(0.0001, 0.0001, 0.0001); v.set(dl.pos[0], dl.pos[1] - 3, dl.pos[2]); }
      else {
        sc.set(1, 1, 1);
        v.set(dl.pos[0] + dx * len * (air - 0.5), dl.pos[1] + 4 * h * air * (1 - air) - 0.3, dl.pos[2] + dz * len * (air - 0.5));
      }
      const pitch = Math.atan2(4 * h * (1 - 2 * Math.max(0, air)), len);
      e.set(0, Math.atan2(-dz, dx), pitch, 'YXZ');
      q.setFromEuler(e);
      m4.compose(v, q, sc);
      inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
}

/** Brandung: weiße Schaumsäume entlang von Strecken (zwei Lagen, atmen; ein Objekt). list = [[[x, y, z], [x, y, z]], …]. */
export function brandung(level, list, o = {}) {
  if (!level.view || !list.length) return;
  const parts = [];
  for (const [a, b] of list) {
    const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) || 1;
    const n = Math.max(2, Math.round(len / 1.2));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const g = new THREE.CircleGeometry(0.55 + ((i * 7) % 5) * 0.08, 8);
      g.rotateX(-Math.PI / 2);
      g.scale(1.6, 1, 0.5);
      g.rotateY(Math.atan2(-dz, dx));
      g.translate(a[0] + dx * t, a[1] + 0.02, a[2] + dz * t);
      parts.push(fill(g, 0xffffff));
    }
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false });
  const mesh = new THREE.Mesh(merge(parts), mat);
  mesh.renderOrder = 2;
  mesh.name = 'zier:brandung';
  const holder = {};
  addObject(level, mesh, (dt) => { visDt(level, holder, dt); mat.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(level.time * (o.speed ?? 1.6))); });
}

/**
 * Glitzerkristalle (leuchtend, Glüh-Material, verschmolzen): list = [[x, y, z, size, farbe, neigung?]]. Dazu je Gruppe ein
 * weicher Schein (Sprites, nur nahe der Figur).
 */
export function kristalle(level, list, o = {}) {
  if (!level.view) return;
  const parts = [];
  const rnd = new Rnd(o.seed ?? 17);
  const glows = [];
  for (const [x, y, z, s = 1, c = 0x7ae8ff, tilt = 0] of list) {
    const col = L(c), hi = mixc(col, L(0xffffff), 0.55, [0, 0, 0]);
    const n = 3 + rnd.int(0, 2);
    for (let i = 0; i < n; i++) {
      const h = s * rnd.real(0.6, 1.3), r = s * rnd.real(0.12, 0.22);
      const g = new THREE.ConeGeometry(r, h, 5, 1);
      g.translate(0, h / 2, 0);
      g.rotateZ(rnd.real(-0.5, 0.5) + tilt);
      g.rotateX(rnd.real(-0.4, 0.4));
      g.translate(x + rnd.real(-0.25, 0.25) * s, y, z + rnd.real(-0.25, 0.25) * s);
      parts.push(colorize(ni(g), (p, nn, oo) => mixc(col, hi, smooth(-0.2, 0.9, nn.y + nn.x * 0.3), oo)));
    }
    glows.push([x, y + s * 0.5, z, s, c]);
  }
  addStatic(level, merge(parts), { material: 'glow', castShadow: false });
  if (o.halo === false) return;
  const grp = new THREE.Group();
  for (const [x, y, z, s, c] of glows) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(s * 2.6, s * 2.6, 1);
    sp.position.set(x, y, z);
    grp.add(sp);
  }
  const holder = {};
  addObject(level, grp, (dt) => {
    visDt(level, holder, dt);
    const p = level.player;
    grp.children.forEach((sp, i) => {
      sp.visible = !p || Math.hypot(p.pos.x - sp.position.x, p.pos.z - sp.position.z) < 36;
      sp.material.opacity = 0.42 + 0.18 * Math.sin(level.time * 1.7 + i * 1.3);
    });
  });
}

/** Tropfsteine (hängend: len < 0 von der Decke herab, stehend: len > 0): list = [[x, y, z, len, r]]. Felsfarben o.colors. */
export function tropfsteine(level, list, o = {}) {
  if (!level.view) return;
  const parts = [];
  const [c0, c1] = o.colors ?? [0x9a6ab0, 0xd8b0e0];
  for (const [x, y, z, len, r = 0.4] of list) {
    const h = Math.abs(len);
    const g = new THREE.ConeGeometry(r, h, 7, 2);
    if (len < 0) { g.rotateX(Math.PI); g.translate(x, y - h / 2, z); } else g.translate(x, y + h / 2, z);
    parts.push(shadeY(g, c0, c1, -0.8, 0.8));
  }
  addStatic(level, merge(parts), { castShadow: false });
}

/** Lichtschächte: weiche, additive Lichtkegel von oben (Grotte; ein Objekt). list = [[x, yTop, z, r, h]]. */
export function lichtschaechte(level, list, o = {}) {
  if (!level.view || !list.length) return;
  const parts = [];
  for (const [x, y, z, r = 1.6, h = 9] of list) {
    const g = new THREE.CylinderGeometry(r * 0.7, r * 1.25, h, 14, 4, true);
    g.translate(x, y - h / 2, z);
    const P = g.attributes.position, A = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { const k = (P.getY(i) - (y - h)) / h; const a = smooth(0, 0.65, k) * 0.9; A[i * 3] = a; A[i * 3 + 1] = a * 0.98; A[i * 3 + 2] = a * 0.85; }
    g.setAttribute('color', new THREE.BufferAttribute(A, 3));
    parts.push(ni(g));
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, color: o.color ?? 0xfff2c0, transparent: true, opacity: o.opacity ?? 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(merge(parts), mat);
  mesh.renderOrder = 4;
  mesh.name = 'zier:lichtschaechte';
  const holder = {};
  addObject(level, mesh, (dt) => { visDt(level, holder, dt); mat.opacity = (o.opacity ?? 0.22) * (0.85 + 0.15 * Math.sin(level.time * 0.9)); });
}

/**
 * Tropfen und Glitzerstaub in der Grotte (Punkte, folgen dem Blickziel; additiv): fallen langsam.
 */
export function grottenStaub(level, o = {}) {
  if (!level.view) return;
  const n = o.n ?? 90;
  const g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cols = (o.colors ?? [0x9af8ff, 0xd8a8ff, 0xffffff]).map((c) => new THREE.Color(c));
  const rnd = new Rnd(o.seed ?? 5);
  const seeds = [];
  for (let i = 0; i < n; i++) {
    seeds.push({ x: rnd.real(-12, 12), y: rnd.real(0, 10), z: rnd.real(-18, 8), s: rnd.real(0.3, 1) });
    const c = cols[i % cols.length]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, map: glowTexture(), vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  pts.name = 'zier:grottenstaub';
  const holder = {};
  addObject(level, pts, (dt) => {
    const d = visDt(level, holder, dt);
    const inside = o.inside ? o.inside(level.player) : true;
    pts.visible = inside;
    if (!inside) return;
    const t = level.view.rig?.target ?? level.player?.pos ?? { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i++) {
      const s = seeds[i];
      s.y -= d * 0.5 * s.s; if (s.y < -1) s.y += 11;
      arr[i * 3] = t.x + s.x + Math.sin(level.time * 0.6 + i) * 0.3;
      arr[i * 3 + 1] = (o.y0 ?? 0) + s.y;
      arr[i * 3 + 2] = t.z + s.z;
    }
    g.attributes.position.needsUpdate = true;
  });
}

/**
 * Holzsteg (Lauffläche top, achsenparallel x0..x1 × z0..z1) mit Pfählen bis ins Wasser (Kollision box).
 */
export function holzsteg(level, x0, x1, z0, z1, top, o = {}) {
  const zA = Math.max(z0, z1), zB = Math.min(z0, z1);
  level.world.add({ type: 'box', min: [x0, top - 0.3, zB], max: [x1, top, zA], tag: 'holzsteg' });
  if (!level.view) return;
  const parts = [];
  const n = Math.max(2, Math.round((zA - zB) / 0.5));
  for (let i = 0; i < n; i++) {
    const z = zA - (i + 0.5) * ((zA - zB) / n);
    parts.push(box(x1 - x0, 0.16, (zA - zB) / n - 0.05, (x0 + x1) / 2, top - 0.08, z, i % 2 ? 0xd8a466 : 0xe8b878, { r: 0.03, seg: 1, topColor: i % 2 ? 0xe8b878 : 0xf2c88a }));
  }
  const post = o.postDown ?? 2.5;
  for (const x of [x0 + 0.15, x1 - 0.15]) {
    for (let z = zA - 0.3; z > zB; z -= 2.2) parts.push(box(0.22, post + 0.5, 0.22, x, top - post / 2 + 0.1, z, 0x8a5a32, { r: 0.08, seg: 1 }));
  }
  if (o.rails) for (const x of [x0 + 0.1, x1 - 0.1]) parts.push(box(0.08, 0.08, zA - zB, x, top + 0.75, (zA + zB) / 2, 0xf0d0a0, { r: 0.03, seg: 0 }));
  addStatic(level, merge(parts), { castShadow: true });
}

/**
 * Höhlentor vor einer Felswand (Wand zeigt nach +Z): Felsbogen aus Brocken um die Türöffnung, Tropfstein-Zähne am
 * Sturz, Moospolster auf der Kante und Ranken, die seitlich der Öffnung herabhängen (nicht vor die Sicht in die Höhle).
 * x = Mitte der Tür, y = Boden, z = Wandfläche; o: { w: 2.8 (Türbreite), h: 3.2, top: Wandoberkante, span: 7 (halbe
 * Breite der bemoosten Kante), rock: [dunkel, hell] }. Statisch (keine zusätzlichen Zeichenaufrufe).
 */
export function hoehlenTor(level, x, y, z, o = {}) {
  if (!level.view) return;
  const W = o.w ?? 2.8, H = o.h ?? 3.2, top = o.top ?? y + 7.6, span = o.span ?? 7;
  const rnd = new Rnd(o.seed ?? 41);
  const [dark, light] = (o.rock ?? [0x7a4a98, 0xd8a8e0]).map(L);
  const rockC = (g) => colorize(ni(g), (p, n, oo) => mixc(dark, light, smooth(-0.5, 0.95, n.y * 0.8 + n.z * 0.35), oo));
  const parts = [], soft = [];
  const lump = (cx, cy, cz, r, sy = 0.85) => {
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(1, sy, 0.8);
    g.rotateY(rnd.real(0, TAU));
    g.translate(cx, cy, cz);
    parts.push(rockC(g));
  };
  // Pfeiler aus gestapelten Brocken links und rechts
  for (const sx of [-1, 1]) {
    let yy = y;
    for (let i = 0; i < 4; i++) {
      const r = 0.62 - i * 0.06 + rnd.real(-0.05, 0.05);
      lump(x + sx * (W / 2 + 0.42 + rnd.real(-0.06, 0.06)), yy + r * 0.7, z + 0.35, r);
      yy += r * 1.25;
    }
  }
  // Sturz: drei breite Brocken über der Öffnung, darunter Tropfstein-Zähne
  for (let i = -1; i <= 1; i++) lump(x + i * (W / 2.2), y + H + 0.45 + (i === 0 ? 0.2 : 0), z + 0.3, i === 0 ? 0.85 : 0.72, 0.7);
  for (const dx of [-0.9, -0.3, 0.35, 0.95]) {
    const l = rnd.real(0.35, 0.6);
    const g = new THREE.ConeGeometry(0.13, l, 5, 1);
    g.rotateX(Math.PI);
    g.translate(x + dx, y + H - l / 2 + 0.06, z + 0.42);
    parts.push(rockC(g));
  }
  // Moospolster entlang der Wandkante und auf dem Sturz
  const mossA = L(0x3cc06a), mossB = L(0x9af0a0);
  const moss = (cx, cy, cz, r) => {
    const g = new THREE.SphereGeometry(r, 7, 4, 0, TAU, 0, Math.PI / 2);
    g.scale(1, 0.45, 0.8);
    g.translate(cx, cy, cz);
    soft.push(colorize(ni(g), (p, n, oo) => mixc(mossA, mossB, smooth(0.2, 1, n.y), oo)));
  };
  for (let k = 0; k < 14; k++) moss(x - span + (k + rnd.real(0.1, 0.9)) * (span * 2 / 14), top - 0.05, z + rnd.real(0.05, 0.35), rnd.real(0.45, 0.8));
  moss(x - 0.4, y + H + 0.95, z + 0.45, 0.55); moss(x + 0.6, y + H + 0.85, z + 0.4, 0.45);
  // Ranken (seitlich der Tür, höchstens bis 3,5 m unter die Kante)
  const vine = L(0x2a9a52), leaf = L(0x6ad86a);
  const strands = o.vines ?? [-5.6, -4.3, -3.1, 3.0, 4.4, 5.5];
  for (const dx of strands) {
    const len = rnd.real(1.8, 3.5);
    const g = new THREE.CylinderGeometry(0.035, 0.035, len, 4, 1, true);
    g.translate(x + dx, top - len / 2, z + 0.08);
    soft.push(fill(g, vine));
    for (let yy = top - 0.35; yy > top - len + 0.1; yy -= 0.42) {
      const lf = new THREE.SphereGeometry(0.14, 5, 3);
      lf.scale(1.3, 0.55, 0.6);
      lf.rotateZ(rnd.real(-0.6, 0.6));
      lf.translate(x + dx + rnd.real(-0.14, 0.14), yy, z + 0.12);
      soft.push(colorize(ni(lf), (p, n, oo) => mixc(vine, leaf, smooth(-0.3, 0.9, n.y + n.z * 0.5), oo)));
    }
  }
  addStatic(level, merge(parts), { castShadow: true });
  addStatic(level, merge(soft), { castShadow: false });
  // dunkler Höhlenschlund in der Öffnung (nur Optik): blendet aus, sobald die Figur nahe am Tor oder drinnen ist
  if (o.dark === false) return;
  const g = new THREE.PlaneGeometry(W, H);
  g.translate(x, y + H / 2, z - (o.depth ?? 0.3));
  const P = g.attributes.position, A = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const k = smooth(y, y + H, P.getY(i)); A[i * 3] = 0.05 + 0.05 * k; A[i * 3 + 1] = 0.02 + 0.03 * k; A[i * 3 + 2] = 0.1 + 0.08 * k; }
  g.setAttribute('color', new THREE.BufferAttribute(A, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'zier:hoehlenschlund';
  addObject(level, mesh, () => {
    const p = level.player;
    const near = !p ? 9 : Math.max(p.pos.z - z, Math.abs(p.pos.x - x) - W / 2);
    mat.opacity = 0.8 * smooth(0.6, 3, near);
    mesh.visible = mat.opacity > 0.02;
  });
}

/** Leuchtpilze in Grüppchen (Glüh-Material, statisch): list = [[x, y, z, size = 1, farbe = 0x7ae8ff]]. */
export function leuchtpilze(level, list, o = {}) {
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? 23);
  const stems = [], caps = [];
  const stemC = L(0xf4f0e8);
  for (const [x, y, z, s = 1, c = 0x7ae8ff] of list) {
    const col = L(c), hi = mixc(col, L(0xffffff), 0.6, [0, 0, 0]);
    const n = 3 + rnd.int(0, 2);
    for (let i = 0; i < n; i++) {
      const k = s * (i === 0 ? 1 : rnd.real(0.45, 0.8));
      const px = x + (i === 0 ? 0 : rnd.real(-0.55, 0.55) * s), pz = z + (i === 0 ? 0 : rnd.real(-0.55, 0.55) * s);
      const h = 0.5 * k;
      const st = new THREE.CylinderGeometry(0.06 * k, 0.09 * k, h, 6, 1, true);
      st.translate(px, y + h / 2, pz);
      stems.push(fill(st, stemC));
      const cap = new THREE.SphereGeometry(0.26 * k, 8, 4, 0, TAU, 0, Math.PI / 2);
      cap.scale(1, 0.62, 1);
      cap.translate(px, y + h - 0.02, pz);
      caps.push(colorize(ni(cap), (p, nn, oo) => mixc(col, hi, smooth(0.3, 1, nn.y), oo)));
    }
  }
  addStatic(level, merge(stems), { castShadow: false });
  addStatic(level, merge(caps), { material: 'glow', castShadow: false });
}

/** Karottenkorb für Pflaume (Weidenkorb mit Möhren und Grün, statisch, mit Kollision). */
export function karottenkorb(level, x, y, z, o = {}) {
  const R = o.r ?? 0.5;
  level.world.add({ type: 'cyl', x, z, r: R, y0: y, y1: y + 0.55, tag: 'korb' });
  if (!level.view) return;
  const rnd = new Rnd(o.seed ?? 5);
  const parts = [];
  const wick = L(0xc8904a), wickD = L(0x8a5a2a);
  const body = new THREE.CylinderGeometry(R, R * 0.82, 0.55, 14, 3, true);
  body.translate(x, y + 0.275, z);
  parts.push(colorize(ni(body), (p, n, oo) => mixc(wickD, wick, (Math.floor((p.y - y) / 0.09) + Math.floor(Math.atan2(p.z - z, p.x - x) * 4)) & 1 ? 0.85 : 0.35, oo)));
  const rim = new THREE.TorusGeometry(R, 0.05, 4, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(x, y + 0.55, z);
  parts.push(fill(rim, 0xb07a3a));
  const fill0 = new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.04, 12);
  fill0.translate(x, y + 0.48, z);
  parts.push(fill(fill0, 0x6a3a1a));
  const or = L(0xff8a1e), orL = L(0xffb04a), green = L(0x3cc06a);
  for (let i = 0; i < 7; i++) {
    const a = rnd.real(0, TAU), d = rnd.real(0, R * 0.6);
    const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
    const c = new THREE.ConeGeometry(0.075, 0.42, 6, 1);
    c.rotateX(Math.PI);
    c.rotateZ(rnd.real(-0.5, 0.5));
    c.rotateX(rnd.real(-0.4, 0.4));
    c.translate(cx, y + 0.62, cz);
    parts.push(colorize(ni(c), (p, n, oo) => mixc(or, orL, smooth(-0.5, 0.9, n.y + n.x * 0.3), oo)));
    for (let j = 0; j < 3; j++) {
      const lf = new THREE.ConeGeometry(0.03, 0.24, 4, 1);
      lf.rotateZ((j - 1) * 0.45);
      lf.translate(cx, y + 0.94, cz);
      parts.push(fill(lf, green));
    }
  }
  // zwei Möhren daneben im Sand
  for (const [dx, dz, yaw] of [[R + 0.35, 0.2, 0.4], [R + 0.15, -0.45, 2.1]]) {
    const c = new THREE.ConeGeometry(0.075, 0.42, 6, 1);
    c.rotateZ(Math.PI / 2);
    c.rotateY(yaw);
    c.translate(x + dx, y + 0.08, z + dz);
    parts.push(colorize(ni(c), (p, n, oo) => mixc(or, orL, smooth(-0.5, 0.9, n.y), oo)));
  }
  addStatic(level, merge(parts), { castShadow: true });
}

/**
 * Schwimmtiere im Flachwasser (Gummiente, Schwimmring), schaukeln sanft (ein Mesh für alle):
 * list = [[x, y (Wasseroberfläche), z, 'ente' | 'ring', yaw, farbe]].
 */
export function schwimmtiere(level, list) {
  if (!level.view) return;
  const parts = [];
  for (const [x, y, z, kind = 'ente', yaw = 0, c] of list) {
    const local = [];
    if (kind === 'ring') {
      const col = L(c ?? 0xe8323a), white = L(0xffffff);
      const g = new THREE.TorusGeometry(0.55, 0.2, 8, 16);
      g.rotateX(Math.PI / 2);
      local.push(colorize(ni(g), (p, n, o) => { const a = Math.atan2(p.z, p.x); const k = Math.floor((a + Math.PI) / (Math.PI / 4)) & 1; const cc = k ? col : white; const sh = 0.8 + 0.25 * smooth(-1, 1, n.y); o[0] = cc[0] * sh; o[1] = cc[1] * sh; o[2] = cc[2] * sh; }));
    } else {
      const yel = L(c ?? 0xffd23a), yelL = L(0xfff0a0), beak = L(0xff8a1e);
      const body = new THREE.SphereGeometry(0.42, 12, 8);
      body.scale(1.25, 0.8, 1);
      body.translate(0, 0.12, 0);
      local.push(colorize(ni(body), (p, n, o) => mixc(yel, yelL, smooth(-0.2, 1, n.y), o)));
      const tail = new THREE.ConeGeometry(0.16, 0.3, 6);
      tail.rotateZ(Math.PI / 2 + 0.7);
      tail.translate(-0.55, 0.3, 0);
      local.push(fill(tail, yel));
      const head = new THREE.SphereGeometry(0.27, 10, 7);
      head.translate(0.28, 0.58, 0);
      local.push(colorize(ni(head), (p, n, o) => mixc(yel, yelL, smooth(-0.2, 1, n.y), o)));
      const bk = new THREE.ConeGeometry(0.1, 0.24, 6);
      bk.rotateZ(-Math.PI / 2);
      bk.scale(1, 1, 1.4);
      bk.translate(0.62, 0.54, 0);
      local.push(fill(bk, beak));
      for (const sz of [-1, 1]) {
        const e = new THREE.SphereGeometry(0.045, 6, 4);
        e.translate(0.46, 0.66, sz * 0.13);
        local.push(fill(e, 0x1a1a2a));
      }
    }
    const g = merge(local);
    g.rotateY(yaw);
    g.translate(x, y, z);
    parts.push(g);
  }
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  mesh.name = 'zier:schwimmtiere';
  const holder = {};
  addObject(level, mesh, (dt) => { visDt(level, holder, dt); mesh.position.y = Math.sin(level.time * 1.7) * 0.05; mesh.rotation.z = Math.sin(level.time * 1.1) * 0.004; });
}

/**
 * Tiefes Wasser sichtbar machen (Meeresloch): dunkelblauer, durchscheinender Körper unter der Wasseroberfläche (die
 * Oberfläche zeichnet das umgebende Wasser), dazu ein heller Schaumring an der Kante. x0..x1 × z0..z1, top … bot.
 */
export function tiefwasser(level, x0, x1, z0, z1, top, bot) {
  if (!level.view) return;
  const zA = Math.max(z0, z1), zB = Math.min(z0, z1);
  const g = new THREE.BoxGeometry(x1 - x0 - 0.04, top - bot, zA - zB - 0.04);
  g.translate((x0 + x1) / 2, (top + bot) / 2, (zA + zB) / 2);
  const P = g.attributes.position, A = new Float32Array(P.count * 3);
  const deep = new THREE.Color(0x06306a), rim = new THREE.Color(0x1a8ac8);
  for (let i = 0; i < P.count; i++) { const k = smooth(bot, top, P.getY(i)); const c = deep.clone().lerp(rim, k * 0.6); A[i * 3] = c.r; A[i * 3 + 1] = c.g; A[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(A, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false }));
  mesh.renderOrder = 0;
  mesh.name = 'zier:tiefwasser';
  addObject(level, mesh);
  brandung(level, [[[x0, top, zA], [x1, top, zA]], [[x0, top, zB], [x1, top, zB]], [[x0, top, zA], [x0, top, zB]], [[x1, top, zA], [x1, top, zB]]], { speed: 2.2 });
}

/**
 * Schatten-Diät (Budget): Modelle der Entitäten dieser Arten werfen ihren Sonnenschatten nur noch mit den keep größten
 * Teilen (der Blob-Schatten bleibt); keep 0 = gar nicht. Auch später erzeugte Entitäten (Mini-Pilzlinge) werden erfasst.
 */
export function schattenDiaet(level, kinds, keep = 1) {
  if (!level.view) return;
  const set = new Set(kinds);
  const done = new WeakSet();
  const apply = () => {
    for (const e of level.entities) {
      if (!set.has(e.kind) || !e.model || done.has(e)) continue;
      done.add(e);
      const meshes = [];
      e.model.root.traverse((o) => {
        if (!o.isMesh || !o.castShadow) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const s = o.getWorldScale(new THREE.Vector3());
        meshes.push([o, (o.geometry.boundingSphere?.radius ?? 0) * Math.max(s.x, s.y, s.z) * (o.isInstancedMesh ? Math.sqrt(o.count) : 1)]);
      });
      meshes.sort((a, b) => b[1] - a[1]);
      meshes.forEach(([o], i) => { if (i >= keep) o.castShadow = false; });
    }
  };
  apply();
  let t = 0;
  level.onStep((dt) => { t += dt; if (t > 0.5) { t = 0; apply(); } });
}

// =====================================================================================================================
// Zirkus (5-2)
// =====================================================================================================================

/**
 * Bunte Zirkus-Hülle für Drehscheiben (drehplattform axis 'y', arms 0): Tortenstücke in Zirkusfarben, Goldrand und
 * gestreifte Seite; dreht sich mit der Scheibe (Winkel aus dem benannten Griff) – so sieht man, dass sie sich dreht.
 * list = [{ id, pos (wie die Scheibe: Mitte der Unterseite), r (= length), thick: 0.5, colors }]. 1 Mesh je Scheibe.
 */
export function zirkusScheiben(level, list) {
  if (!level.view) return;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  for (const s of list) {
    const h = level.named.get(s.id);
    if (!h) continue;
    const R = s.r, T = s.thick ?? 0.5;
    const cols = s.colors ?? [0xe8323a, 0xfff4e0, 0xffc21a, 0xfff4e0, 0x2f7bff, 0xfff4e0, 0x35c24a, 0xfff4e0];
    const parts = [];
    const n = cols.length;
    for (let i = 0; i < n; i++) {
      const g = new THREE.CircleGeometry(R - 0.26, 4, (i / n) * TAU, TAU / n);
      g.rotateX(-Math.PI / 2);
      g.translate(0, T + 0.014, 0);
      parts.push(fill(g, cols[i]));
    }
    const rim = new THREE.RingGeometry(R - 0.3, R + 0.05, 40, 1);
    rim.rotateX(-Math.PI / 2);
    rim.translate(0, T + 0.016, 0);
    parts.push(fill(rim, 0xffc21a));
    const stripes = 20;
    for (let i = 0; i < stripes; i++) {
      const g = new THREE.CylinderGeometry(R + 0.05, R * 0.97, T + 0.05, 2, 1, true, (i / stripes) * TAU, TAU / stripes);
      g.translate(0, T / 2 - 0.005, 0);
      parts.push(fill(g, i & 1 ? 0xfff4e0 : 0xe8323a));
    }
    // Goldnieten auf dem Rand
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const b = new THREE.SphereGeometry(0.09, 6, 3, 0, TAU, 0, Math.PI / 2);
      b.translate(Math.cos(a) * (R - 0.12), T + 0.016, -Math.sin(a) * (R - 0.12));
      parts.push(fill(b, 0xfff3b0));
    }
    const mesh = new THREE.Mesh(merge(parts), mat);
    mesh.name = `zier:${s.id}`;
    mesh.receiveShadow = true;
    mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
    addObject(level, mesh, () => { mesh.rotation.y = h.angle; });
  }
}

/**
 * Konfetti-Regen (bunte Plättchen rieseln, flattern seitlich) über einem Bereich; nur sichtbar, solange near(player).
 * o: { min: [x, y, z], max: [x, y, z], n: 140, size: 0.16, near }. 1 Zeichenaufruf.
 */
export function konfettiRegen(level, o) {
  if (!level.view) return;
  const n = o.n ?? 140;
  const [x0, y0, z0] = o.min, [x1, y1, z1] = o.max;
  const g = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cols = [0xe8323a, 0xffd23a, 0x2f7bff, 0x35c24a, 0xff6fb5, 0xa865ff, 0xffffff].map((c) => new THREE.Color(c));
  const rnd = new Rnd(o.seed ?? 31);
  const seeds = [];
  for (let i = 0; i < n; i++) {
    seeds.push({ x: rnd.real(x0, x1), y: rnd.real(y0, y1), z: rnd.real(z0, z1), v: rnd.real(0.5, 1.1), ph: rnd.real(0, TAU) });
    const c = cols[i % cols.length]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 1);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: o.size ?? 0.16, vertexColors: true }));
  pts.name = 'zier:konfetti';
  const holder = {};
  addObject(level, pts, (dt) => {
    const d = visDt(level, holder, dt);
    const on = !o.near || (level.player && o.near(level.player));
    pts.visible = on;
    if (!on) return;
    const t = level.time;
    for (let i = 0; i < n; i++) {
      const s = seeds[i];
      s.y -= d * s.v; if (s.y < y0) s.y += y1 - y0;
      arr[i * 3] = s.x + Math.sin(t * 2.1 + s.ph) * 0.35;
      arr[i * 3 + 1] = s.y;
      arr[i * 3 + 2] = s.z + Math.cos(t * 1.7 + s.ph) * 0.25;
    }
    g.attributes.position.needsUpdate = true;
  });
}
