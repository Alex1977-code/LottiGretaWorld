// Karten-HUD der Kurs-Weltkarte (Phaser, über der 3D-Leinwand, Logik-Koordinaten 480x270):
//   oben links   Leben, Bitcoins, Sterne der Welt (gesammelt/möglich), darunter Figur-Porträts (Lotti/Greta, Tab)
//                und das mitgenommene Power-up aus dem Beerenhaus
//   oben Mitte   Weltname
//   oben rechts  Ton an/aus (M), „Klassik“ (bisherige Weltkarte), „Neu“ (Spielstand löschen, mit Rückfrage)
//   über den Eingängen  Nummer + Titel, Sterne (gesammelt/möglich), Stempel – an die 3D-Lage projiziert
//   unten Mitte  Hinweis zum nächsten Eingang (Titel, Sterne, Status) und – auf freiem Eingang mit Touch – „Los!“
//   Touch-Steuerung (Stick, A/B/Y, Kamera) wie im Level (CourseTouch).
// Alle Knöpfe haben große Treffflächen (mind. 34 × 30 Logik-Pixel) und halten den Stick-Finger fern.

import Phaser from 'phaser';
import * as THREE from 'three';
import { GAME, HERO_VARIANTS } from '../../config.js';
import { setupUiCamera, fit } from '../../render.js';
import { uiText, uiPanel, uiButton } from '../../ui.js';
import { CourseTouch } from '../input/CourseTouch.js';
import { getPower } from '../player/powers.js';
import { courseSave } from '../level/CourseSave.js';
import { engine } from '../../audio/index.js';

const HERO_HAIR = { lotti: 0xc8963c, greta: 0xf3d97a };
const _v = new THREE.Vector3();

function starPoints(cx, cy, r1, r0) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? r0 : r1; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
  return pts;
}

/** Stern-Reihe und Stempel in eine Graphics zeichnen (Mitte cx, cy). */
function drawStars(g, cx, cy, n, got, hasStamp, stamp, size = 4.6) {
  const gap = size * 2.3;
  const total = n + (hasStamp ? 1 : 0);
  let x = cx - ((total - 1) * gap) / 2;
  for (let i = 0; i < n; i++, x += gap) {
    const pts = starPoints(x, cy, size, size * 0.45);
    if (i < got) { g.fillStyle(0x3ee05a, 1); g.fillPoints(pts, true); g.lineStyle(1, 0xeaffea, 1); g.strokePoints(pts, true); }
    else { g.fillStyle(0x000000, 0.3); g.fillPoints(pts, true); g.lineStyle(0.8, 0xffffff, 0.7); g.strokePoints(pts, true); }
  }
  if (hasStamp) {
    const r = size * 0.95;
    if (stamp) { g.fillStyle(0xff7ab8, 1); g.fillCircle(x, cy, r); g.fillStyle(0xfff4fa, 1); g.fillCircle(x, cy, r * 0.62); g.fillStyle(0xe8438c, 1); g.fillCircle(x, cy + 0.4, r * 0.3); }
    else { g.fillStyle(0x000000, 0.3); g.fillCircle(x, cy, r); g.lineStyle(0.8, 0xffffff, 0.7); g.strokeCircle(x, cy, r); }
  }
}

/** Trefffläche eines UiButton vergrößern (Handy). */
function growHit(btn, minW = 40, minH = 30) {
  const w = Math.max(minW, btn.width), h = Math.max(minH, btn.height);
  btn.input.hitArea.setTo((btn.width - w) / 2, (btn.height - h) / 2, w, h);
  return btn;
}

export class MapHud {
  /** @param {import('./CourseMapScene.js').CourseMapScene} scene */
  constructor(scene) {
    this.scene = scene;
    setupUiCamera(scene);
    const W = GAME.width, H = GAME.height;
    this.prev = {};
    this.labels = new Map();
    this.toastT = 0;

    // ---- oben links: Leben, Bitcoins, Sterne
    uiPanel(scene, 82, 15, 152, 22, { color: 0x1a1830, alpha: 0.55, radius: 11, shadow: false, border: 0 }).setDepth(40);
    this.icons = scene.add.graphics().setDepth(41);
    this.livesText = uiText(scene, 31, 15, '×5', { size: 10, originX: 0 }).setDepth(42);
    this.coinText = uiText(scene, 79, 15, '0', { size: 10, originX: 0 }).setDepth(42);
    uiText(scene, 67, 15.5, '₿', { size: 8, thickness: 0, shadow: false, color: '#fff8ee' }).setDepth(43);
    this.starText = uiText(scene, 125, 15, '0/24', { size: 10, originX: 0 }).setDepth(42);

    // ---- Weltname
    const map = scene.map;
    // Weltname: groß beim Betreten, blendet nach ein paar Sekunden aus (oben bleibt Platz für die Beschriftungen)
    this.title = uiText(scene, W / 2, 104, `Welt ${map.world}\n${map.title}`, { size: 17, color: '#ffffff', stroke: '#3a2a6a', thickness: 4, align: 'center' }).setDepth(70);
    this.titleT = scene.arrive?.from ? 0 : 3.2;          // nur beim Betreten der Welt, nicht nach jedem Level
    this.title.setVisible(this.titleT > 0);

    // ---- oben rechts: Ton, Klassik, Neu
    const btn = (x, label, cb, opts = {}) => {
      const b = uiButton(scene, x, 15, label, { size: 8, dark: true, padX: 8, padY: 5, minWidth: 46, ...opts }).setDepth(44);
      growHit(b, Math.max(46, (opts.minWidth ?? 46)), 32);
      b.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev?.stopPropagation?.(); if (!this.confirm) cb(); });
      return b;
    };
    this.resetBtn = btn(W - 24, 'Neu', () => this.askReset(), { minWidth: 40 });
    this.classicBtn = btn(W - 79, 'Klassik', () => scene.toClassic(), { color: 0x8a6ad8, dark: false, minWidth: 60 });
    this.muteBtn = btn(W - 134, '', () => scene.toggleMute(), { minWidth: 44 });

    // ---- Figur-Porträts
    this.heroPicker = {};
    [['lotti', 22, 'Lotti'], ['greta', 60, 'Greta']].forEach(([key, x, name]) => {
      const c = scene.add.container(x, 46).setDepth(44);
      const ring = scene.add.circle(0, 0, 13, 0xffffff, 0.9).setStrokeStyle(2.5, 0xffc21a);
      let face;
      if (scene.textures.exists(key)) face = fit(scene.add.image(0, 1, key, 'idle0'), 0.95).setOrigin(0.5, 0.5);
      else { face = scene.add.circle(0, 0, 8, HERO_HAIR[key]); }
      const label = uiText(scene, 0, 18, name, { size: 7, color: '#ffffff', stroke: '#2a2550', thickness: 2, shadow: false });
      c.add([ring, face, label]);
      c.setSize(34, 40);
      c.setInteractive({ hitArea: new Phaser.Geom.Circle(17, 20, 20), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
      c.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev?.stopPropagation?.(); if (!this.confirm) scene.selectHero(key); });
      this.heroPicker[key] = { c, ring };
    });
    this.traitText = uiText(scene, 41, 76, '', { size: 6, color: '#ffe9a8', stroke: '#2a2550', thickness: 2, shadow: false }).setDepth(44);

    // ---- mitgenommenes Power-up
    this.carryBg = uiPanel(scene, 0, 0, 10, 10, { color: 0x1a1830, alpha: 0, radius: 8, shadow: false, border: 0 }).setDepth(40);
    this.carryIcon = scene.add.graphics().setDepth(41);
    this.carryText = uiText(scene, 20, 92, '', { size: 7, originX: 0, color: '#fff2b0', stroke: '#2a2550', thickness: 2, shadow: false }).setDepth(42);

    // ---- unten: Hinweis zum Eingang
    this.banner = scene.add.container(W / 2, H - 30).setDepth(46).setVisible(false);
    this.bannerBg = scene.add.graphics();
    this.bannerTitle = uiText(scene, 0, -7, '', { size: 10 });
    this.bannerStars = scene.add.graphics();
    this.bannerStatus = uiText(scene, 0, 8, '', { size: 7.5, color: '#fff2b0', stroke: '#2a2550', thickness: 2, shadow: false, originX: 0 });
    this.banner.add([this.bannerBg, this.bannerTitle, this.bannerStars, this.bannerStatus]);

    // ---- „Los!“ (Touch, auf freiem Eingang)
    // rechts neben der Bildmitte (Daumen der rechten Hand, verdeckt weder Figur noch Podest)
    this.goBtn = uiButton(scene, W - 112, 128, 'Los!', { size: 15, color: 0x4fb833, minWidth: 104, padY: 7 }).setDepth(95).setVisible(false);
    growHit(this.goBtn, 120, 44);
    this.goBtn.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev?.stopPropagation?.(); if (!this.confirm) scene.pressGo(); });

    // ---- Meldung
    this.toastText = uiText(scene, W / 2, 62, '', { size: 12, color: '#ffffff', stroke: '#3a2a6a', thickness: 4 }).setDepth(70).setVisible(false);

    // ---- Beschriftungen über den Eingängen
    this.labelLayer = scene.add.container(0, 0).setDepth(30);

    // ---- Touch-Steuerung
    this.touchCtl = new CourseTouch(scene, scene.cinput);
    const forced = new URLSearchParams(window.location.search).get('touch');
    const touchDevice = scene.sys.game.device.input.touch && forced !== '0';
    this.touchCtl.setVisible(forced === '1' || touchDevice);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p) => { if (p.wasTouch && !this.touchCtl.visible) this.touchCtl.setVisible(true); });

    // ---- Rückfrage „Spielstand löschen“
    this.confirm = null;
    this.debugText = uiText(scene, 6, H - 6, '', { size: 6, thickness: 2, originX: 0, originY: 1, shadow: false, align: 'left' }).setDepth(80);

    this.updateMute();
    this.updateHeroPicker();
    this.refresh(true);
  }

  // ------------------------------------------------------------------ oben

  refresh(force) {
    const s = this.scene;
    const stars = s.worldStars(), max = s.worldStarsMax();
    const key = [courseSave.lives, courseSave.coins, stars, max, s.player?.hero, courseSave.carryPower].join('|');
    if (!force && key === this.prev.key) return;
    this.prev.key = key;
    this.livesText.setText(`×${courseSave.lives}`);
    this.coinText.setText(String(courseSave.coins));
    this.starText.setText(`${stars}/${max}`);
    const g = this.icons;
    g.clear();
    g.fillStyle(0xffd6b0, 1); g.fillCircle(19, 15, 6.5);
    g.fillStyle(HERO_HAIR[s.player?.hero ?? 'lotti'] ?? 0xc8963c, 1); g.slice(19, 14, 7, Math.PI, 0, false); g.fillPath();
    g.fillStyle(0x2a2550, 1); g.fillCircle(17, 16, 0.9); g.fillCircle(21, 16, 0.9);
    g.fillStyle(0xf7931a, 1); g.fillCircle(67, 15, 7);
    g.lineStyle(1, 0xffe0b0, 1); g.strokeCircle(67, 15, 6);
    const pts = starPoints(113, 15, 7.5, 3.4);
    g.fillStyle(0x3ee05a, 1); g.fillPoints(pts, true); g.lineStyle(1.2, 0xeaffea, 1); g.strokePoints(pts, true);
    // mitgenommenes Power-up
    const cp = courseSave.carryPower;
    this.carryIcon.clear();
    this.carryBg.clear();
    if (cp) {
      const def = getPower(cp);
      const text = `Im Gepäck: ${def.label ?? cp}`;
      this.carryText.setText(text).setVisible(true);
      const w = this.carryText.width + 30;
      this.carryBg.fillStyle(0x1a1830, 0.55); this.carryBg.fillRoundedRect(4, 83, w, 18, 9);
      this.carryIcon.fillStyle(def.icon ?? 0xffffff, 1); this.carryIcon.fillCircle(13, 92, 5.5);
      this.carryIcon.lineStyle(1.5, 0xffffff, 0.9); this.carryIcon.strokeCircle(13, 92, 5.5);
    } else this.carryText.setVisible(false);
    this.updateHeroPicker();
  }

  updateMute() { this.muteBtn.setText(engine.muted ? '♪ aus' : '♪ an'); growHit(this.muteBtn, 46, 32); }

  updateHeroPicker() {
    const hero = this.scene.player?.hero ?? courseSave.hero;
    for (const [key, { ring, c }] of Object.entries(this.heroPicker)) {
      const active = key === hero;
      ring.setStrokeStyle(active ? 3 : 1.5, active ? 0xffc21a : 0x9a9ab0);
      ring.setFillStyle(0xffffff, active ? 0.95 : 0.55);
      c.setAlpha(active ? 1 : 0.8);
    }
    this.traitText.setText(HERO_VARIANTS[hero]?.trait ?? '');
  }

  hideTitle() { this.titleT = 0; this.title.setVisible(false); }

  pulseHero(key) {
    const p = this.heroPicker[key];
    if (p) this.scene.tweens.add({ targets: p.c, scaleX: 1.18, scaleY: 1.18, duration: 100, yoyo: true });
  }

  // ------------------------------------------------------------------ Meldungen, Rückfrage

  toast(text, seconds = 2.2) {
    this.toastText.setText(text).setVisible(true).setAlpha(1);
    this.toastT = seconds;
  }

  /** Rückfrage „Spielstand löschen?“ – einmal gebaut, danach nur ein-/ausgeblendet. */
  askReset() {
    if (this.confirm) return;
    if (!this.confirmUi) this.confirmUi = this.buildConfirm();
    this.confirmUi.c.setVisible(true);
    this.confirm = this.confirmUi;
    this.touchWasVisible = this.touchCtl.visible;
    this.touchCtl.releaseAll();
    this.touchCtl.setVisible(false);
    this.scene.setInputLocked(true);
  }

  buildConfirm() {
    const s = this.scene, W = GAME.width, H = GAME.height;
    const c = s.add.container(0, 0).setDepth(120);
    // Abdunkeln ohne eigene Trefffläche: Knöpfe darunter sind gesperrt (this.confirm), Touch-Steuerung ist aus
    const shade = s.add.rectangle(0, 0, W, H, 0x10102a, 0.55).setOrigin(0);
    const panel = uiPanel(s, W / 2, H / 2, 230, 112);
    const t1 = uiText(s, W / 2, H / 2 - 30, 'Spielstand löschen?', { size: 13, color: '#3a2a6a', stroke: '#ffffff', thickness: 3, shadow: false });
    const t2 = uiText(s, W / 2, H / 2 - 10, 'Alle Sterne, Stempel und Bitcoins\ndes 3D-Kurses gehen verloren.', { size: 7.5, color: '#5a4a7a', stroke: '#ffffff', thickness: 2, shadow: false });
    const yes = uiButton(s, W / 2 - 54, H / 2 + 30, 'Ja, löschen', { size: 9, color: 0xe0453a, minWidth: 92, padY: 7 });
    const no = uiButton(s, W / 2 + 54, H / 2 + 30, 'Nein', { size: 9, color: 0x4fb833, minWidth: 92, padY: 7 });
    // Treffer selbst prüfen (Szenen-Ereignis): unabhängig von der Reihenfolge der Phaser-Treffflächen im Container
    yes.disableInteractive(); no.disableInteractive();
    c.add([shade, panel, t1, t2, yes, no]);
    c.setVisible(false);
    const inside = (b, p) => Math.abs(p.worldX - b.x) <= Math.max(50, b.width / 2 + 4) && Math.abs(p.worldY - b.y) <= Math.max(18, b.height / 2 + 4);
    s.input.on(Phaser.Input.Events.POINTER_DOWN, (p) => {
      if (!this.confirm) return;
      if (inside(yes, p)) { this.closeConfirm(); s.resetSave(); }
      else if (inside(no, p)) this.closeConfirm();
    });
    return { c, yes, no };
  }

  closeConfirm() {
    if (!this.confirm) return;
    this.confirm.c.setVisible(false);
    this.confirm = null;
    if (this.touchWasVisible) this.touchCtl.setVisible(true);
    this.scene.setInputLocked(false);
  }

  // ------------------------------------------------------------------ je Bild

  update(dt) {
    const s = this.scene;
    this.refresh(false);
    if (this.titleT > 0) {
      this.titleT -= this.banner.visible ? dt * 4 : dt;   // Hinweis-Leiste hat Vorrang
      this.title.setAlpha(Math.min(1, this.titleT / 0.8));
      if (this.titleT <= 0) this.title.setVisible(false);
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      this.toastText.setAlpha(Math.min(1, this.toastT / 0.4));
      if (this.toastT <= 0) this.toastText.setVisible(false);
    }
    this.updateLabels();
    this.updateBanner();
    if (s.debug) {
      const st = s.view.stats(), p = s.player.info();
      this.debugText.setText(`${p.mode}/${p.state} x${p.x} y${p.y} z${p.z}  calls ${st.calls} tris ${st.triangles} fps ${Math.round(s.game.loop.actualFps)}`);
    } else if (this.debugText.text) this.debugText.setText('');
  }

  /** Beschriftung je Eingang an die projizierte Lage setzen (nur nahe und im Bild). */
  updateLabels() {
    const s = this.scene;
    const p = s.player.pos;
    const near = s.nearEntrance?.id ?? null;
    for (const id of s.entranceViews().keys()) {
      const st = s.status(id);
      let lab = this.labels.get(id);
      if (!lab) { lab = this.makeLabel(id); this.labels.set(id, lab); }
      const key = [st.title, st.stars, st.starsMax, st.stamp, st.locked, st.soon, st.done].join('|');
      if (key !== lab.key) { lab.key = key; this.drawLabel(lab, st); }
      const a = s.labelAnchor(id, _v);
      const dist = Math.hypot(a.x - p.x, a.z - p.z);
      const scr = s.view.project(a.x, a.y, a.z);
      const vis = scr.visible && dist < 34 && scr.x > -40 && scr.x < GAME.width + 40 && scr.y > 22 && scr.y < GAME.height - 20 && id !== near;
      lab.c.setVisible(vis);
      if (!vis) continue;
      lab.c.setPosition(Math.round(scr.x * 2) / 2, Math.round(scr.y * 2) / 2);
      lab.c.setAlpha(dist < 18 ? 1 : Math.max(0.55, 1 - (dist - 18) / 30));
      lab.c.setScale(dist < 14 ? 1 : Math.max(0.8, 1 - (dist - 14) / 60));
    }
  }

  makeLabel(id) {
    const s = this.scene;
    const c = s.add.container(0, 0);
    const bg = s.add.graphics();
    const text = uiText(s, 0, -6, '', { size: 7.5, thickness: 2.5 });
    const stars = s.add.graphics();
    c.add([bg, text, stars]);
    this.labelLayer.add(c);
    return { c, bg, text, stars, key: null, id };
  }

  drawLabel(lab, st) {
    lab.text.setText(`${st.label}  ${st.title}`);
    const w = Math.max(lab.text.width + 14, (st.starsMax + (st.hasStamp ? 1 : 0)) * 10 + 12);
    const h = st.starsMax > 0 || st.hasStamp ? 26 : 16;
    lab.bg.clear();
    lab.bg.fillStyle(st.locked ? 0x3a3a4a : 0x1a1830, st.locked ? 0.6 : 0.62);
    lab.bg.fillRoundedRect(-w / 2, -14, w, h, 7);
    lab.bg.lineStyle(1, st.locked ? 0xb0b0c0 : st.done ? 0xffd23a : 0xffffff, 0.55);
    lab.bg.strokeRoundedRect(-w / 2, -14, w, h, 7);
    lab.bg.fillStyle(st.locked ? 0x3a3a4a : 0x1a1830, 0.62);
    lab.bg.fillTriangle(-4, h - 14, 4, h - 14, 0, h - 9);
    lab.text.setColor(st.locked ? '#c8c8d4' : '#ffffff');
    lab.stars.clear();
    if (h > 16) drawStars(lab.stars, 0, 5, st.starsMax, st.stars, st.hasStamp, st.stamp, 3.6);
  }

  /** Hinweis-Leiste unten (nächster Eingang) und „Los!“-Knopf. */
  updateBanner() {
    const s = this.scene;
    const ne = s.nearEntrance;
    const onPad = s.onPad;
    const st = ne ? s.status(ne.id) : null;
    const showGo = !!(onPad && s.status(onPad.id).enterable && this.touchCtl.visible && !s.inputLocked && !s.leaving);
    this.goBtn.setVisible(showGo);
    const key = st ? [ne.id, st.title, st.stars, st.stamp, st.locked, st.reason, st.soon, !!onPad, s.worldStars()].join('|') : '';
    if (key === this.prev.banner) return;
    this.prev.banner = key;
    if (!st) { this.banner.setVisible(false); return; }
    let status;
    if (st.reason === 'stars') status = `Benötigt ${st.minStars} Sterne (${s.worldStars()}/${st.minStars})`;
    else if (st.locked) status = 'Noch nicht frei';
    else if (st.soon) status = st.next ? 'Bald – hier geht es später weiter' : 'Bald';
    else if (onPad) status = this.touchCtl.visible ? 'A oder „Los!“ – los geht’s!' : 'A / Leertaste / Enter: Los!';
    else status = st.roamer ? 'Lauf die Bullen an!' : 'Aufs Podest stellen';
    this.bannerTitle.setText(`${st.label}  ·  ${st.title}`);
    this.bannerStatus.setText(status);
    const starW = (st.starsMax + (st.hasStamp ? 1 : 0)) * 11;
    const w = Math.max(this.bannerTitle.width + 28, starW + this.bannerStatus.width + 34, 150);
    const g = this.bannerBg;
    g.clear();
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(-w / 2, -17 + 2, w, 34, 12);
    g.fillStyle(st.locked ? 0x3a3a4a : 0x1a1830, 0.78); g.fillRoundedRect(-w / 2, -17, w, 34, 12);
    g.lineStyle(1.2, st.locked ? 0xb0b0c0 : 0xffd23a, 0.8); g.strokeRoundedRect(-w / 2, -17, w, 34, 12);
    const x0 = -w / 2 + 14;
    this.bannerStars.clear();
    if (starW > 0) drawStars(this.bannerStars, x0 + starW / 2 - 5, 8, st.starsMax, st.stars, st.hasStamp, st.stamp, 4.2);
    this.bannerStatus.setPosition(x0 + starW + (starW > 0 ? 4 : 0), 8);
    this.bannerStatus.setColor(st.locked ? '#ffb0a0' : st.soon ? '#d8d8e8' : '#fff2b0');
    this.banner.setVisible(true);
  }

  destroy() { this.touchCtl?.destroy(); }
}
