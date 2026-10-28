// Phaser-Szene 'Credits': der Abspann nach dem Sieg in 8-Burg (Präzisierung Motor und Bausteine Welt 8). Eine eigene kleine
// 3D-Bühne (dieselbe Infrastruktur wie ein Kurs-Level: CourseView + Level + Bausteine, Thema `abspann` – Sommerabend auf
// einer Wiese): Picknick mit Torte, Lampionketten, Wimpel, Ballons, Karussell; Lotti und Greta jubeln, Pflaume macht
// Freudensprünge, Krümel hüpft, die befreiten Freunde (Flocke, Hoppel und die kleinen Tiere aus dem Glas) tanzen im Kreis.
// Die Kamera fährt in einem langen Bogen über die Wiese um die Feier herum und steigt am Ende in den Abendhimmel mit
// Feuerwerk; Konfetti rieselt. Darüber rollen die Danksagungen (deutsch; Figuren und ihre Rollen, die Reise durch alle
// Welten – Namen aus den Weltkarten –, „Danke fürs Spielen!“). Musik `course_abspann` spielt einmal (≈ 76 s, endet von
// selbst); danach steht „Danke fürs Spielen!“ noch kurz, dann geht es zur Weltkarte. Der Spielstand merkt sich
// courseSave.data.finished = true (die Karte zeigt dann einen Pokal im HUD).
//
// Aufruf: this.scene.start('Credits', { from: '8-Burg' }) – bzw. im Level die Aktion { credits: true } (nach dem Ergebnis-
// Bildschirm) / { credits: 'sofort' } oder LEVEL.credits = true (src/course/credits.js); URL ?credits=1 (Test/Vorschau).
// Überspringen: nach 3 s „Weiter ›“ (Touch/Klick) bzw. Enter/Leertaste.
// Registry-Modell `abspann_buehne` ({ size }, Ursprung Mitte der Wiese) ersetzt, sobald es es gibt, die eigene Kulisse
// (Picknick, Lampions, Karussell …); die Wiese (Insel) bleibt.
//
// Test-Schnittstelle window.__credits (= diese Szene): setManual(b), advance(s) (Zeitleiste in Schritten von 1/30 s
// vorrücken, deterministisch), state() → { t, duration, end, music, playing, roll (y der Textrolle), lines, shown (sichtbare
// Zeilen), finished (Spielstand), actors, confetti, fireworks, camera }, finish() (sofort zur Karte), stats().

import Phaser from 'phaser';
import * as THREE from 'three';
import { GAME } from '../config.js';
import { setupUiCamera } from '../render.js';
import { uiText, uiButton } from '../ui.js';
import { RENDER3D } from '../render3d.js';
import { music, sfx } from '../audio/index.js';
import { CourseView } from './view/CourseView.js';
import { Level } from './level/Level.js';
import { buildLevel } from './level/LevelLoader.js';
import { courseSave } from './level/CourseSave.js';
import { createAvatar } from '../three/avatars/index.js';
import { getModel, hasModel } from './models/index.js';
import { getWorldMap, listWorldMaps } from './map/worlds/index.js';
import { mapSceneKey } from './CourseScene.js';
import { CREDITS_KEY } from './credits.js';

const AVATAR_H = 1.5;
const TAU = Math.PI * 2;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const MUSIC = 'course_abspann';
const HOLD = 3;                 // s „Danke fürs Spielen!“ nach dem Ende der Musik

/** Bühne als Level-Daten (Bausteine): Wiese, Bäume, Picknick, Lampions, Kulisse. */
function stageData(withDeco) {
  const segs = [
    { type: 'island', pos: [0, -3, -10], size: [150, 3, 150], under: 0 },
    { type: 'mound', pos: [-14, 0, -14], radius: 6, height: 1.4 },
    { type: 'mound', pos: [15, 0, -12], radius: 5, height: 1 },
    { type: 'deco_w1', items: [
      { kind: 'daisies', pos: [0, 0, 4], size: [36, 26], n: 46 },
      { kind: 'tufts', pos: [0, 0, -2], size: [38, 34], n: 26 },
      { kind: 'fireflies', pos: [0, 1.5, -2], n: 14, size: [26, 3, 22] },
      { kind: 'butterflies', pos: [-6, 0, 6], n: 3 },
    ] },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-15, 1.4, -14], size: 6 }, { kind: 'tree', pos: [-19, 0, -4], size: 5 }, { kind: 'tree', pos: [17, 1, -13], size: 5.5 },
      { kind: 'tree', pos: [19, 0, 2], size: 4.5 }, { kind: 'tree', pos: [-8, 0, -19], size: 5, color: 'autumn' }, { kind: 'tree', pos: [9, 0, -19], size: 5.5 },
      { kind: 'flowers', pos: [-9, 0, 9], size: [5, 3], n: 12 }, { kind: 'flowers', pos: [10, 0, 10], size: [5, 3], n: 12 },
      { kind: 'bush', pos: [-13, 0, 4], size: 1 }, { kind: 'bush', pos: [13, 0, 6], size: 0.9 },
      // Baumkranz weiter draußen (füllt die Wiese im Überblick)
      ...[[-24, -6], [-27, 8], [-22, 20], [-12, 28], [24, -4], [27, 10], [21, 22], [12, 30], [-30, -20], [30, -22], [-16, -30], [4, -32], [18, -30]]
        .map(([x, z], i) => ({ kind: 'tree', pos: [x, 0, z], size: 5 + (i % 3), color: i % 4 === 1 ? 'autumn' : undefined, solid: false })),
      { kind: 'flowers', pos: [-18, 0, 14], size: [6, 4], n: 14 }, { kind: 'flowers', pos: [18, 0, 16], size: [6, 4], n: 14 },
      { kind: 'bush', pos: [-20, 0, 12], size: 1.2 }, { kind: 'bush', pos: [22, 0, -14], size: 1.1 },
    ] },
  ];
  if (withDeco) {
    // Lampion-Geviert (x ±9, z −8 … 8) um die Picknickdecke; Masten an den Ecken und Seitenmitten
    const M = [[-9, 8], [0, 8.6], [9, 8], [9, -8], [0, -8.6], [-9, -8]];
    const items = [{ kind: 'picknick', pos: [0, 0, 0], size: 3.4 }];
    for (const [x, z] of M) items.push({ kind: 'mast', pos: [x, 0, z], height: 4.4 });
    for (let i = 0; i < M.length; i++) {
      const a = M[i], b = M[(i + 1) % M.length];
      items.push({ kind: 'lampions', from: [a[0], 4.3, a[1]], to: [b[0], 4.3, b[1]], sag: 0.8 });
    }
    items.push(
      { kind: 'wimpel', from: [-9, 4.0, 8], to: [9, 4.0, -8], sag: 1.4 }, { kind: 'wimpel', from: [9, 4.0, 8], to: [-9, 4.0, -8], sag: 1.4 },
      { kind: 'ballons', pos: [-8, 0, 6.5], n: 6, height: 3.4 }, { kind: 'ballons', pos: [8, 0, -6.5], n: 5, height: 3.4 },
      { kind: 'karussell', pos: [-14, 0, -12], radius: 2.6, height: 3.2, solid: false },
      { kind: 'bude', pos: [13, 0, -9], width: 3, color: 'rosa', yaw: Math.PI }, { kind: 'bude', pos: [-14, 0, 2], width: 2.6, color: 'blau', yaw: 0 },
      { kind: 'torbogen', pos: [0, 0, 14], width: 6, height: 4.6, yaw: Math.PI / 2, solid: false },
      { kind: 'keksstapel', pos: [2.6, 0, 1.8], n: 3, radius: 0.45 },
    );
    segs.push({ type: 'deco_w8', items });
  }
  return {
    id: 'abspann', world: 0, title: 'Abspann', theme: 'abspann', archetype: 'credits', music: MUSIC, timeLimit: 0,
    camera: [{ from: 40, to: -40, pitch: 30, dist: 16 }], sky: { clouds: 14 }, segments: segs,
  };
}

/** Danksagungen (Zeilen: [Text, Stil]); Welten aus den Weltkarten. */
function creditLines() {
  const L = [];
  const add = (t, s = 'text') => L.push([t, s]);
  add('Lotti & Greta', 'title');
  add('Das große Abenteuer bis zum Brummbär-Rummelplatz', 'sub');
  add('', 'gap');
  add('Mit Pflaume, Krümel und allen Freunden', 'head');
  add('', 'gap');
  add('Die Heldinnen', 'head');
  add('Lotti – springt am allerhöchsten');
  add('Greta – springt am allerweitesten');
  add('', 'gap');
  add('Die Freunde', 'head');
  add('Pflaume – schnellster Schlappohr-Hase der Welt');
  add('Krümel – Kapitän, Kartenleser und Schatzsucher');
  add('Flocke und Hoppel – endlich wieder frei!');
  add('… und alle kleinen Tiere aus dem großen Glas');
  add('', 'gap');
  add('Die Reise', 'head');
  for (const n of listWorldMaps()) {
    const m = getWorldMap(n);
    if (!m) continue;
    add(`${m.worldLabel ?? `Welt ${n}`} · ${m.title}`);
  }
  add('Welt 8 · Brummbär-Rummelplatz');
  add('', 'gap');
  add('Mit dabei', 'head');
  add('Baron Brummbär – diesmal fast gewonnen');
  add('Schubser, Pilzlinge, Spuke und Stampfsteine');
  add('jede Menge Bitcoins, grüne Sterne und Stempel');
  add('', 'gap');
  const stars = courseSave.totalStars();
  if (stars > 0) { add(`Du hast ${stars} grüne Sterne gefunden!`, 'sub'); add('', 'gap'); }
  add('Ausgedacht und gebaut mit ganz viel Liebe', 'sub');
  add('', 'gap');
  add('', 'gap');
  add('Danke fürs Spielen!', 'title');
  return L;
}

const STYLE = {
  title: { size: 22, color: '#ffe066', stroke: '#3a2a6a', thickness: 5, gap: 34 },
  sub: { size: 10, color: '#ffffff', stroke: '#3a2a6a', thickness: 3, gap: 20 },
  head: { size: 13, color: '#ffd0f0', stroke: '#4a1a5a', thickness: 4, gap: 24 },
  text: { size: 10, color: '#ffffff', stroke: '#2a2550', thickness: 3, gap: 17 },
  gap: { gap: 14 },
};

// ------------------------------------------------------------------ Darsteller

/** Heldin bzw. Pflaume als Avatar (wie HeroRig/PflaumeRig über einen Stellvertreter). */
function avatarActor(view, key, pos, yaw, scale) {
  const hull = new THREE.Group();
  hull.name = key === 'pflaume' ? 'pflaume' : 'heldin';
  hull.position.set(pos[0], pos[1], pos[2]);
  hull.rotation.y = yaw;
  hull.scale.setScalar(scale / AVATAR_H);
  view.three.add(hull);
  const proxy = {
    texture: { key }, key, x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true,
    flipX: false, body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }, moveState: 'ground', onGround: true,
    mount: null, leaf: { visible: false }, swooping: false, dead: false, locked: false, power: 'none',
    course: { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: null, climbing: false,
      fenceMove: { x: 0, y: 0 }, fencePunch: 0, skates: false, gear: null, rider: null },
  };
  let av = null;
  try { av = createAvatar(view, proxy); av?.setCourseMode?.(true); if (av) hull.add(av.root); } catch (err) { console.error('Abspann-Avatar fehlgeschlagen:', err); av = null; }
  view.shadows.add({ pos: hull.position, radius: key === 'pflaume' ? 0.45 : 0.4, alive: () => true, visible: () => true });
  return { key, hull, proxy, av, base: new THREE.Vector3(...pos), yaw, state: 'idle' };
}

function modelActor(view, name, pos, scale, yaw = 0) {
  const m = getModel(name);
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.scale.setScalar(scale);
  m.root.rotation.y = yaw;
  view.three.add(m.root);
  const p = new THREE.Vector3(pos[0], pos[1], pos[2]);
  view.shadows.add({ pos: p, radius: 0.28 * scale, alive: () => true, visible: () => true });
  return { name, model: m, root: m.root, base: p.clone(), shadowPos: p, scale, yaw };
}

// ------------------------------------------------------------------ Szene

export class CreditsScene extends Phaser.Scene {
  constructor() { super(CREDITS_KEY); }

  init(data) {
    this.from = data?.from ?? '8-Burg';
    this.t = 0;
    this.manual = false;
    this.ending = false;
    this.done = false;
    this.level = null;
    this.view = null;
  }

  create() {
    // Spielstand: Spiel geschafft (additiv; auch wenn der Abspann übersprungen wird)
    courseSave.data.finished = true;
    courseSave.data.finishedVisits = (courseSave.data.finishedVisits ?? 0) + 1;
    courseSave.save();
    this.duration = music.themeInfo?.(MUSIC)?.seconds ?? 76;
    this.end = this.duration + HOLD;
    setupUiCamera(this);
    if (!RENDER3D.enabled) { this.buildRoll(); music.play(MUSIC); window.__credits = this; return; }

    // ---- 3D-Bühne
    const withModel = hasModel('abspann_buehne');
    const data = stageData(!withModel);
    this.view = new CourseView(this, data);
    this.level = new Level(this, data, { view: this.view, save: courseSave });
    this.level.muted = true;
    buildLevel(this.level);
    const view = this.view;
    if (withModel) {
      this.stage = getModel('abspann_buehne', { size: [46, 44] });
      view.three.add(this.stage.root);
    }
    // Darsteller rund um die Picknickdecke
    this.heroes = [
      avatarActor(view, 'lotti', [-2.3, 0, 1.0], -0.35, 1.0),
      avatarActor(view, 'greta', [2.3, 0, 1.0], Math.PI + 0.35, 1.0),
    ];
    // Blickrichtung yaw: 0 = +X, −π/2 = zur Kamera (+Z)
    this.pflaume = avatarActor(view, 'pflaume', [0.9, 0, -2.4], -Math.PI / 2 + 0.3, 1.3);
    this.kruemel = hasModel('kruemel') ? modelActor(view, 'kruemel', [-1.0, 0, -2.2], 1.35, -Math.PI / 2 - 0.3) : null;
    this.friends = [];
    const FRIENDS = 7;
    for (let i = 0; i < FRIENDS; i++) {
      const s = [1.25, 1.1, 1.4, 1.0, 1.2, 0.95, 1.3][i];
      const f = modelActor(view, 'bunny_small', [0, 0, 0], s);
      f.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });   // Schatten-Blob genügt (Zeichenaufrufe)
      f.phase = (i / FRIENDS) * TAU;
      f.r = 4.3 + (i % 2) * 0.5;
      this.friends.push(f);
    }
    this.buildConfetti();
    this.buildFireworks();
    // Kamerafahrt (Lage und Blickpunkt als Kurven über die Zeitleiste)
    const V = (a) => new THREE.Vector3(...a);
    // Überblick → Lotti → Greta → Pflaume und Krümel → Reigen der Freunde (von hinten) → Runde → hinauf ins Feuerwerk
    this.camPath = new THREE.CatmullRomCurve3([
      V([26, 20, 40]), V([12, 7, 17]), V([-3.6, 2.5, 6.4]), V([3.6, 2.5, 6.4]), V([5.6, 2.3, 0.4]), V([0, 3.1, -6.6]),
      V([-6.6, 2.9, -2]), V([-5.2, 3.6, 6]), V([0, 7, 14]), V([0, 22, 28]),
    ], false, 'centripetal');
    this.lookPath = new THREE.CatmullRomCurve3([
      V([0, 2, 0]), V([0, 1.2, 0]), V([-2.2, 1.0, 1]), V([2.2, 1.0, 1]), V([0.2, 0.6, -2.2]), V([0, 0.8, 0.5]),
      V([0, 0.9, 0]), V([0, 1, 0]), V([0, 2, -2]), V([0, 9, -22]),
    ], false, 'centripetal');
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.placeCamera();

    this.buildRoll();
    this.events.on(Phaser.Scenes.Events.RENDER, this.renderFrame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    music.play(MUSIC);
    this.cameras.main.fadeIn(900, 255, 255, 255);
    window.__credits = this;
  }

  // ------------------------------------------------------------------ Textrolle und Knöpfe

  buildRoll() {
    const W = GAME.width, H = GAME.height;
    this.lines = creditLines();
    this.roll = this.add.container(W / 2, H + 12).setDepth(20);
    let y = 0;
    this.lineY = [];
    for (const [text, style] of this.lines) {
      const s = STYLE[style] ?? STYLE.text;
      if (text) {
        const tx = uiText(this, 0, y, text, { size: s.size, color: s.color, stroke: s.stroke, thickness: s.thickness });
        this.roll.add(tx);
      }
      this.lineY.push(y);
      y += s.gap;
    }
    this.rollH = y;
    // Rollgeschwindigkeit: die letzte Zeile erreicht die Bildmitte, wenn die Musik endet
    this.rollStop = H * 0.48 - this.lineY[this.lineY.length - 1];
    this.rollSpeed = (H + 12 - this.rollStop) / Math.max(10, this.duration - 4);
    this.skip = uiButton(this, W - 44, H - 18, 'Weiter ›', { size: 9, dark: true, padX: 8, padY: 4, minWidth: 64 }).setDepth(30).setVisible(false);
    this.skip.on(Phaser.Input.Events.POINTER_DOWN, () => { if (this.t > 3) { sfx('select'); this.finish(); } });
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ENTER', () => { if (this.t > 3) this.finish(); });
      kb.on('keydown-SPACE', () => { if (this.t > 3) this.finish(); });
    }
  }

  // ------------------------------------------------------------------ Konfetti und Feuerwerk

  buildConfetti() {
    const N = 220;
    const g = new THREE.PlaneGeometry(0.12, 0.18);
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    const im = new THREE.InstancedMesh(g, m, N);
    im.frustumCulled = false;
    const cols = [0xff5a6a, 0xffd23a, 0x5ad0ff, 0x8ae05a, 0xc87aff, 0xff9ac8, 0xffffff];
    const c = new THREE.Color();
    this.conf = [];
    for (let i = 0; i < N; i++) {
      const h = (k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
      this.conf.push({ x: (h(1) - 0.5) * 30, y: h(2) * 14, z: (h(3) - 0.5) * 28, sp: 0.6 + h(4) * 0.8, w: h(5) * TAU, r: h(6) * TAU, rs: 2 + h(7) * 4 });
      im.setColorAt(i, c.setHex(cols[i % cols.length]));
    }
    this.view.three.add(im);
    this.confetti = im;
  }

  buildFireworks() {
    const N = 240;
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 5, 4), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), N);
    im.frustumCulled = false;
    im.count = 0;
    this.view.three.add(im);
    this.fw = { im, sparks: [], bursts: 0, next: 0 };
  }

  burst(x, y, z, hex) {
    const c = new THREE.Color(hex);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU, b = Math.acos(1 - 2 * ((i * 0.618) % 1));
      const v = 7 + (i % 3);
      this.fw.sparks.push({ x, y, z, vx: Math.cos(a) * Math.sin(b) * v, vy: Math.cos(b) * v, vz: Math.sin(a) * Math.sin(b) * v, t: 0, life: 1.6 + (i % 4) * 0.15, c });
    }
    if (this.fw.sparks.length > 240) this.fw.sparks.splice(0, this.fw.sparks.length - 240);
    this.fw.bursts++;
  }

  // ------------------------------------------------------------------ Zeitleiste

  update(time, delta) {
    if (this.manual || this.done) return;
    this.tick(Math.min(delta, 100) / 1000);
  }

  /** Zeitleiste um dt s vorrücken (Darstellung folgt im nächsten Bild). */
  tick(dt) {
    this.t += dt;
    if (this.roll) {
      const y = Math.max(this.rollStop, GAME.height + 12 - this.rollSpeed * this.t);
      this.roll.y = y;
    }
    if (this.skip) this.skip.setVisible(this.t > 3 && !this.ending);
    if (this.fw && this.t > this.duration * 0.42) {
      this.fw.next -= dt;
      if (this.fw.next <= 0) {
        const k = this.fw.bursts;
        const cols = [0xff6a8a, 0xffd23a, 0x6ad8ff, 0xb88aff, 0x8af06a, 0xff9a3a];
        this.burst(-16 + ((k * 7.3) % 32), 17 + (k % 3) * 3, -22 - (k % 4) * 3, cols[k % cols.length]);
        this.fw.next = this.t > this.duration * 0.85 ? 0.7 : 1.9;
      }
    }
    if (!this.ending && this.t >= this.end) this.finish();
  }

  /** Testhaken: Zeitleiste ohne Echtzeit vorrücken (Schritte 1/30 s). */
  setManual(on) { this.manual = !!on; }
  advance(s) {
    this.manual = true;
    const n = Math.max(1, Math.round(s * 30));
    for (let i = 0; i < n && !this.ending; i++) this.tick(1 / 30);
    return this.state();
  }

  finish() {
    if (this.ending) return;
    this.ending = true;
    this.skip?.setVisible(false);
    const go = () => {
      if (this.done) return;
      this.done = true;
      const target = mapSceneKey(this);
      this.scene.start(target, target === 'CourseMap' ? { from: this.from, credits: true } : {});
    };
    if (this.manual) { go(); return; }
    this.cameras.main.fadeOut(900, 255, 246, 230);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
    this.time.delayedCall(1400, go);
  }

  // ------------------------------------------------------------------ Darstellung

  placeCamera() {
    const u = ease(Math.min(1, this.t / Math.max(1, this.duration)));
    this.camPath.getPoint(u, this.camPos);
    this.lookPath.getPoint(u, this.camLook);
    // sanftes Schweben
    this.camPos.y += Math.sin(this.t * 0.7) * 0.25;
    const cam = this.view.camera;
    cam.position.copy(this.camPos);
    cam.lookAt(this.camLook);
    cam.updateMatrixWorld();
    this.view.rig.target.copy(this.camLook);
  }

  renderFrame() {
    if (!this.view || this.done) return;
    const dt = Math.min(this.game.loop.delta, 50) / 1000;
    const T = this.t;
    this.placeCamera();
    // Heldinnen: Jubel und Verschnaufen im Wechsel (versetzt)
    this.heroes.forEach((h, i) => {
      const cyc = (T + i * 1.3) % 4.2;
      const st = cyc < 2.6 ? 'victory' : 'idle';
      const c = h.proxy.course;
      c.state = st; c.speed = 0; c.grounded = true;
      h.hull.position.copy(h.base);
      h.hull.rotation.y = h.yaw + Math.sin(T * 0.6 + i) * 0.25;
      try { h.av?.animate(dt, this.view.time + dt); } catch (err) { console.error('Abspann-Animation:', err); h.av = null; }
    });
    // Pflaume: Freudensprünge, dreht sich dabei langsam
    {
      const p = this.pflaume, c = p.proxy.course;
      c.state = (T % 3.4) < 2.4 ? 'victory' : 'idle'; c.speed = 0; c.grounded = true;
      p.hull.rotation.y = p.yaw + Math.sin(T * 0.5) * 0.6;
      try { p.av?.animate(dt, this.view.time + dt); } catch (err) { console.error('Abspann-Animation:', err); p.av = null; }
    }
    if (this.kruemel) {
      const k = this.kruemel;
      k.root.position.y = k.base.y + Math.abs(Math.sin(T * 4.2)) * 0.18;
      k.root.rotation.y = k.yaw + Math.sin(T * 0.8) * 0.5;
      k.model.update?.(dt, { anim: 'cheer' });
    }
    // Freunde: Reigen um die Decke, hoppelnd
    for (const f of this.friends) {
      const a = f.phase + T * 0.32;
      const x = Math.cos(a) * f.r, z = -Math.sin(a) * f.r * 0.85 - 0.6;
      const hop = Math.abs(Math.sin(T * 5.5 + f.phase * 3)) * 0.28;
      f.root.position.set(x, hop, z);
      f.shadowPos.set(x, 0, z);
      f.root.rotation.y = a + Math.PI / 2;   // Blick (+X des Modells) entlang der Bahn
      f.model.update?.(dt, { anim: 'hop' });
    }
    // Konfetti rieselt um die Feier
    if (this.confetti) {
      const M = this.mat ?? (this.mat = new THREE.Matrix4()), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < this.conf.length; i++) {
        const q = this.conf[i];
        let y = q.y - (T * q.sp) % 14;
        if (y < 0) y += 14;
        P.set(q.x + Math.sin(T * 1.3 + q.w) * 0.6, y + 0.1, q.z + Math.cos(T * 1.1 + q.w) * 0.6);
        E.set(q.r + T * q.rs, q.w + T * q.rs * 0.7, 0);
        Q.setFromEuler(E);
        M.compose(P, Q, S);
        this.confetti.setMatrixAt(i, M);
      }
      this.confetti.instanceMatrix.needsUpdate = true;
      if (this.confetti.instanceColor) this.confetti.instanceColor.needsUpdate = false;
    }
    // Feuerwerk
    if (this.fw) {
      const im = this.fw.im, M = new THREE.Matrix4();
      let n = 0;
      for (const s of this.fw.sparks) {
        s.t += dt;
        if (s.t > s.life) continue;
        s.vy -= 6 * dt; s.vx *= 0.985; s.vz *= 0.985; s.vy *= 0.985;
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        const k = 1 - s.t / s.life;
        M.makeScale(k + 0.2, k + 0.2, k + 0.2).setPosition(s.x, s.y, s.z);
        im.setMatrixAt(n, M);
        im.setColorAt(n, s.c);
        n++;
      }
      this.fw.sparks = this.fw.sparks.filter((s) => s.t <= s.life);
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    this.stage?.update?.(dt, { t: T });
    this.level.render(dt, T);
    this.view.render(dt, null, this.level.world);
  }

  // ------------------------------------------------------------------ Test, Aufräumen

  state() {
    const H = GAME.height;
    const ry = this.roll?.y ?? 0;
    const shown = this.lines ? this.lines.filter((l, i) => l[0] && ry + this.lineY[i] > -10 && ry + this.lineY[i] < H + 10).map((l) => l[0]) : [];
    return {
      t: +this.t.toFixed(2), duration: +this.duration.toFixed(2), end: +this.end.toFixed(2), music: music.current ?? music.beat?.().theme ?? null, playing: !!music.beat?.().playing,
      roll: +ry.toFixed(1), lines: this.lines?.length ?? 0, shown, finished: !!courseSave.data.finished, ending: this.ending,
      actors: (this.heroes?.length ?? 0) + (this.pflaume ? 1 : 0) + (this.kruemel ? 1 : 0) + (this.friends?.length ?? 0),
      confetti: this.confetti?.count ?? 0, fireworks: this.fw?.bursts ?? 0, stage: this.stage ? 'abspann_buehne' : 'eigen',
      camera: this.view ? this.view.camera.position.toArray().map((v) => +v.toFixed(2)) : null,
    };
  }

  stats() { return this.view ? this.view.stats() : null; }

  cleanup() {
    this.events.off(Phaser.Scenes.Events.RENDER, this.renderFrame, this);
    if (window.__credits === this) window.__credits = null;
    for (const h of [...(this.heroes ?? []), this.pflaume].filter(Boolean)) { try { h.av?.dispose?.(); } catch (_) { /* ignorieren */ } }
    this.stage?.dispose?.();
    this.level?.dispose();
    this.view?.dispose();
    this.level = null;
    this.view = null;
  }
}
