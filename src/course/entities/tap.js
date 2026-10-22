// Antipp-Ziele (Welt 2, Bauplan 2-2 „Antipp-Plattformen“, „Touchscreen-Antipp-Elemente“): Elemente, die man im
// Handy-Spiel direkt auf dem Bildschirm antippt. Ein Tipp (kurz, kaum bewegt) wird als Strahl von der Kurs-Kamera
// in die 3D-Szene geschickt; getroffen wird das nächste freigegebene Ziel (Hüllquader + Toleranz für Finger).
// Alternative ohne Touch: Aktionstaste (Shift/X, Touch-Y) – das nächste Ziel in Reichweite der Figur löst aus.
// Liegt bewusst außerhalb von kinds/ (die Registry sammelt nur kinds/*.js).
//
//   const taps = tapTargets(level);              // eine Instanz je Level (level.taps)
//   const t = taps.add({
//     owner,                                     // Besitzer (Fehlersuche)
//     box: () => ({ min: [x, y, z], max: [x, y, z] }),   // aktueller Hüllquader (Welt)
//     enabled: () => true,                       // antippbar?
//     reach: 4.5,                                // m: Aktionstaste wirkt bis zu diesem Abstand (0 = nie)
//     hint: true,                                // Tipp-Symbol über dem Ziel, solange antippbar
//     onTap(via) {},                             // via = 'touch' | 'action' (im Simulationsschritt aufgerufen)
//   });
//   taps.remove(t);
//
// Ablauf: pointerdown/pointerup der Kurs-Szene (Phaser) → Strahl → Ziel vormerken → im nächsten Simulationsschritt
// onTap (deterministisch, auch bei schnellem Tippen zwischen zwei Schritten). Tipps auf die Touch-Knöpfe (A/B/Y,
// Kamera) zählen nicht; ein Stick-Wischen (> 14 Logik-Pixel oder länger als 0,45 s) auch nicht.
// Test-Schnittstelle: taps.tapScreen(x, y) (Logik-Koordinaten 480×270, wie ein echter Tipp), taps.tapTarget(t),
// taps.screenPos(t) → { x, y, visible } (Logik-Koordinaten der Zielmitte), taps.info().

import * as THREE from 'three';
import { GAME } from '../../config.js';
import { TOUCH_LAYOUT } from '../input/CourseTouch.js';

const TAP_MAX_T = 450;   // ms
const TAP_MAX_D = 14;    // Logik-Pixel
const PAD = 0.55;        // m Finger-Toleranz um den Hüllquader
const SCREEN_R = 20;     // Logik-Pixel: Zielmitte so nah am Tipp zählt auch

const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _box = new THREE.Box3();
const _hit = new THREE.Vector3();
const _p = new THREE.Vector3();

class TapTargets {
  constructor(level) {
    this.level = level;
    this.targets = [];
    this.queue = [];
    this.downs = new Map();
    this.taps = 0;          // gezählte Tipps (auch ohne Treffer)
    this.hits = 0;
    this.last = null;       // letzter Tipp { x, y, target }
    level.onStep(() => this.step());
    const scene = level.scene;
    const input = scene?.input;
    if (input?.on && level.view) {
      this.scene = scene;
      this.onDown = (p) => this.downs.set(p.id, { x: p.x, y: p.y, t: performance.now() });
      this.onUp = (p) => {
        const d = this.downs.get(p.id);
        this.downs.delete(p.id);
        if (!d) return;
        const k = this.pixelScale();
        if (performance.now() - d.t > TAP_MAX_T || Math.hypot(p.x - d.x, p.y - d.y) > TAP_MAX_D * k) return;
        this.tapScreen(p.x / k, p.y / k);
      };
      input.on('pointerdown', this.onDown);
      input.on('pointerup', this.onUp);
      scene.events?.once?.('shutdown', () => this.dispose());
    }
    if (level.view) this.buildHints();
  }

  /** Spielpixel je Logik-Pixel (Render-Skalierung). */
  pixelScale() { return (this.scene?.scale?.width ?? GAME.width) / GAME.width; }

  add(t) {
    const target = { reach: 4.5, hint: true, enabled: () => true, ...t };
    this.targets.push(target);
    return target;
  }

  remove(t) { const i = this.targets.indexOf(t); if (i >= 0) this.targets.splice(i, 1); }

  /** Liegt der Tipp auf einem Touch-Knopf? */
  onButton(x, y) {
    for (const k of ['A', 'B', 'Y', 'camL', 'camR', 'zoom']) {
      const b = TOUCH_LAYOUT[k];
      if (Math.hypot(x - b.x, y - b.y) <= b.r + 6) return true;
    }
    return x > GAME.width - 34 && y < 32; // Pause-Knopf
  }

  /** Tipp an Logik-Koordinaten (480×270): Strahl in die Szene, nächstes Ziel vormerken. Liefert das Ziel oder null. */
  tapScreen(x, y) {
    this.taps++;
    const view = this.level.view;
    if (!view || this.onButton(x, y)) { this.last = { x, y, target: null }; return null; }
    const cam = view.camera;
    cam.updateMatrixWorld();
    _ndc.set((x / GAME.width) * 2 - 1, 1 - (y / GAME.height) * 2);
    _ray.setFromCamera(_ndc, cam);
    let best = null, bestScore = Infinity;
    for (const t of this.targets) {
      if (!t.enabled()) continue;
      const b = t.box();
      _box.min.set(b.min[0], b.min[1], b.min[2]); _box.max.set(b.max[0], b.max[1], b.max[2]);
      let score = Infinity;
      if (_ray.ray.intersectBox(_box, _hit)) score = _hit.distanceTo(_ray.ray.origin);
      else {
        _box.expandByScalar(PAD);
        if (_ray.ray.intersectBox(_box, _hit)) score = _hit.distanceTo(_ray.ray.origin) + 500;
        else {
          const s = this.screenPos(t);
          if (s.visible && Math.hypot(s.x - x, s.y - y) <= SCREEN_R) score = 1000 + Math.hypot(s.x - x, s.y - y);
        }
      }
      if (score < bestScore) { bestScore = score; best = t; }
    }
    this.last = { x, y, target: best };
    if (best) this.queue.push({ target: best, via: 'touch' });
    return best;
  }

  /** Ziel direkt antippen (Tests). */
  tapTarget(t) { this.queue.push({ target: t, via: 'touch' }); }

  /** Bildschirmlage (Logik-Koordinaten) der Mitte eines Ziels. */
  screenPos(t) {
    const b = t.box();
    _p.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
    const cam = this.level.view.camera;
    cam.updateMatrixWorld();
    const q = _p.clone().project(cam);
    return { x: ((q.x + 1) / 2) * GAME.width, y: ((1 - q.y) / 2) * GAME.height, visible: q.z < 1 && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 };
  }

  /** Simulationsschritt (vor der Figur): vorgemerkte Tipps ausführen, Aktionstaste in Reichweite. */
  step() {
    if (this.queue.length) {
      const q = this.queue.splice(0);
      for (const it of q) if (it.target.enabled()) { this.hits++; it.target.onTap?.(it.via); }
    }
    const p = this.level.player;
    if (!p || p.dead || p.mode === 'script' || !p.input?.actionPressed || p.holding) return;
    const c = p.center();
    const f = p.facingVec();
    let best = null, bd = Infinity;
    for (const t of this.targets) {
      if (!(t.reach > 0) || !t.enabled()) continue;
      const b = t.box();
      const dx = Math.max(b.min[0] - c.x, 0, c.x - b.max[0]), dy = Math.max(b.min[1] - c.y, 0, c.y - b.max[1]), dz = Math.max(b.min[2] - c.z, 0, c.z - b.max[2]);
      const d = Math.hypot(dx, dy, dz);
      if (d > t.reach) continue;
      // Ziele vor der Figur bevorzugen
      const mx = (b.min[0] + b.max[0]) / 2 - c.x, mz = (b.min[2] + b.max[2]) / 2 - c.z, ml = Math.hypot(mx, mz) || 1;
      const score = d - 0.8 * ((mx * f.x + mz * f.z) / ml);
      if (score < bd) { bd = score; best = t; }
    }
    if (best) { this.hits++; best.onTap?.('action'); }
  }

  // ------------------------------------------------------------------ Tipp-Symbole (ein Punktwolken-Objekt)

  buildHints() {
    const N = 48;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    // Finger-Tipp: weißer Punkt mit zwei Wellenringen
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.globalAlpha = 0.7; g.beginPath(); g.arc(32, 32, 18, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a2a6a'; g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 9, 0, Math.PI * 2); g.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size: 0.9, map: tex, transparent: true, depthWrite: false, sizeAttenuation: true, color: 0xfff6c8, fog: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    pts.userData.owned = true;
    this.hintTex = tex;
    this.level.view.add(pts, (dt, t) => {
      const p = this.level.player;
      let n = 0;
      if (p) {
        for (const tg of this.targets) {
          if (n >= N || !tg.hint || !tg.enabled()) continue;
          const b = tg.box();
          const x = (b.min[0] + b.max[0]) / 2, z = (b.min[2] + b.max[2]) / 2, y = b.max[1] + 0.55;
          if (Math.hypot(x - p.pos.x, z - p.pos.z) > 22) continue;
          pos[n * 3] = x; pos[n * 3 + 1] = y + Math.sin(t * 3 + n) * 0.08; pos[n * 3 + 2] = z;
          n++;
        }
      }
      geo.setDrawRange(0, n);
      geo.attributes.position.needsUpdate = true;
      mat.size = 0.8 + Math.max(0, Math.sin(t * 4)) * 0.25;
      pts.visible = n > 0;
    });
  }

  info() {
    return { targets: this.targets.length, enabled: this.targets.filter((t) => t.enabled()).length, taps: this.taps, hits: this.hits, last: this.last ? { x: this.last.x, y: this.last.y, hit: !!this.last.target } : null };
  }

  dispose() {
    const input = this.scene?.input;
    if (input?.off) { input.off('pointerdown', this.onDown); input.off('pointerup', this.onUp); }
    this.hintTex?.dispose();
    this.targets.length = 0;
  }
}

/** Antipp-Ziele des Levels (eine Instanz je Level, auch als level.taps erreichbar). */
export function tapTargets(level) {
  if (!level.taps) level.taps = new TapTargets(level);
  return level.taps;
}
