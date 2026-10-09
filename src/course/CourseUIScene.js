// Phaser-Szene 'CourseUI': HUD über der 3D-Leinwand (Leben, Bitcoins, Power-up, 3 Stern-Plätze, Stempel,
// Timer, Pause-Knopf) und Touch-Steuerung (CourseTouch). Liest je Bild aus der laufenden CourseScene.
// Touch-Knöpfe erscheinen auf Touch-Geräten (oder mit ?touch=1) – sonst nur der Pause-Knopf.
// Alles im Stil von src/ui.js; das HUD bleibt am oberen Rand (Mitte frei für die Figur).

import Phaser from 'phaser';
import { GAME } from '../config.js';
import { setupUiCamera } from '../render.js';
import { uiText, uiPanel } from '../ui.js';
import { CourseTouch } from './input/CourseTouch.js';
import { getPower } from './player/powers.js';

const HERO_HAIR = { lotti: 0xc8963c, greta: 0xf3d97a };

function starPoints(cx, cy, r1, r0) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? r0 : r1; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
  return pts;
}

export class CourseUIScene extends Phaser.Scene {
  constructor() {
    super('CourseUI');
  }

  init(data) {
    this.course = data.course;
  }

  create() {
    setupUiCamera(this);
    const W = GAME.width;
    this.prev = {};
    // Panels
    uiPanel(this, 46, 15, 76, 20, { color: 0x1a1830, alpha: 0.5, radius: 10, shadow: false, border: 0 }).setDepth(40);
    uiPanel(this, 120, 15, 62, 20, { color: 0x1a1830, alpha: 0.5, radius: 10, shadow: false, border: 0 }).setDepth(40);
    uiPanel(this, W / 2, 15, 106, 22, { color: 0x1a1830, alpha: 0.5, radius: 11, shadow: false, border: 0 }).setDepth(40);
    uiPanel(this, W - 66, 15, 64, 20, { color: 0x1a1830, alpha: 0.5, radius: 10, shadow: false, border: 0 }).setDepth(40);
    this.icons = this.add.graphics().setDepth(41);
    this.livesText = uiText(this, 44, 15, '×5', { size: 11, originX: 0 }).setDepth(42);
    this.coinText = uiText(this, 116, 15, '0', { size: 11, originX: 0 }).setDepth(42);
    uiText(this, 104, 15.5, '₿', { size: 9, thickness: 0, shadow: false, color: '#fff8ee' }).setDepth(43);
    this.timeText = uiText(this, W - 50, 15, '000', { size: 11, originX: 1 }).setDepth(42);
    this.powerText = uiText(this, 90, 34, '', { size: 7, thickness: 2, originX: 0.5 }).setDepth(42);
    this.msg = uiText(this, W / 2, GAME.height * 0.36, '', { size: 18, thickness: 4, stroke: '#3a2a6a' }).setDepth(60).setVisible(false);
    this.debugText = uiText(this, 6, GAME.height - 6, '', { size: 6, thickness: 2, originX: 0, originY: 1, shadow: false, align: 'left' }).setDepth(80);

    // Pause-Knopf oben rechts
    const px = W - 16, py = 15;
    const pg = this.add.graphics().setDepth(41);
    pg.fillStyle(0x1a1830, 0.55); pg.fillCircle(px, py, 11);
    pg.lineStyle(1, 0xffffff, 0.45); pg.strokeCircle(px, py, 11);
    pg.fillStyle(0xffffff, 0.9); pg.fillRoundedRect(px - 5, py - 5.5, 3.5, 11, 1); pg.fillRoundedRect(px + 1.5, py - 5.5, 3.5, 11, 1);
    const zone = this.add.zone(px, py, 34, 30).setInteractive().setDepth(41);
    zone.on(Phaser.Input.Events.POINTER_DOWN, (p, lx, ly, ev) => { ev?.stopPropagation?.(); this.course.pauseGame(); });

    this.touchCtl = new CourseTouch(this, this.course.cinput);
    const forced = new URLSearchParams(window.location.search).get('touch');
    const touchDevice = this.sys.game.device.input.touch && forced !== '0';
    this.touchCtl.setVisible(forced === '1' || touchDevice);
    // Erste Berührung schaltet die Touch-Knöpfe ein (z. B. Tablet mit Tastatur)
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p) => { if (p.wasTouch && !this.touchCtl.visible) this.touchCtl.setVisible(true); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.touchCtl.destroy());
    this.refresh(true);
  }

  update() {
    this.refresh(false);
  }

  refresh(force) {
    const c = this.course;
    if (!c?.level) return;
    const rt = c.level.runtime, p = c.player;
    const time = Math.ceil(rt.timeLeft);
    const key = [rt.lives, rt.coins, time, rt.stars.join(), rt.stamp, p.power, p.hero, Math.ceil(p.powerTime)].join('|');
    if (force || key !== this.prev.key) {
      this.prev.key = key;
      this.livesText.setText(`×${rt.lives}`);
      this.coinText.setText(String(rt.coins));
      this.timeText.setText(String(time).padStart(3, '0'));
      this.timeText.setColor(time <= 100 ? '#ffb0a0' : '#ffffff');
      const def = getPower(p.power);
      this.powerText.setText(p.power !== 'none' ? `${def.label ?? p.power}${def.duration ? ` ${Math.ceil(p.powerTime)}` : ''}` : '');
      this.drawIcons(rt, p, def);
    }
    if (c.debug) {
      const s = c.state();
      const st = c.view.stats();
      this.debugText.setText(`${s.player.mode}/${s.player.state} x${s.player.x} y${s.player.y} z${s.player.z} v${s.player.vx},${s.player.vy},${s.player.vz}  calls ${st.calls} tris ${st.triangles} fps ${Math.round(this.game.loop.actualFps)}`);
    } else if (this.debugText.text) this.debugText.setText('');
    const status = rt.status;
    const m = status === 'gameover' ? 'Spiel vorbei' : status === 'goal' ? 'Ziel!' : p.dead && rt.status === 'dying' && p.deathCause === 'time' ? 'Zeit abgelaufen' : '';
    if (m !== this.prev.msg) { this.prev.msg = m; this.msg.setText(m).setVisible(!!m); }
  }

  drawIcons(rt, p, def) {
    const g = this.icons;
    const W = GAME.width;
    g.clear();
    // Leben: Köpfchen der Heldin
    g.fillStyle(0xffd6b0, 1); g.fillCircle(24, 15, 6.5);
    g.fillStyle(HERO_HAIR[p.hero] ?? 0xc8963c, 1); g.slice(24, 14, 7, Math.PI, 0, false); g.fillPath();
    g.fillStyle(0x2a2550, 1); g.fillCircle(22, 16, 0.9); g.fillCircle(26, 16, 0.9);
    // Power-up
    if (p.power !== 'none') {
      g.fillStyle(def.icon ?? 0xffffff, 1); g.fillCircle(80, 15, 5.5);
      g.lineStyle(1.5, 0xffffff, 0.9); g.strokeCircle(80, 15, 5.5);
    }
    // Bitcoin-Symbol
    g.fillStyle(0xf7931a, 1); g.fillCircle(104, 15, 7);
    g.lineStyle(1, 0xffe0b0, 1); g.strokeCircle(104, 15, 6);
    // Sterne (gesammelt = grün, schon gespeichert = blass, offen = Umriss). Anzahl: LEVEL.starSlots (Arena 1),
    // sonst max(3, LEVEL.stars) – Präzisierung (Arena/Boss); ohne LEVEL.stamp kein Stempel-Platz.
    const data = this.course.level?.data ?? {};
    const nStars = data.starSlots ?? Math.max(3, rt.starCount ?? 3);
    const x0 = W / 2 - 34 + (3 - nStars) * 10 + (data.stamp ? 0 : 10);
    for (let i = 0; i < nStars; i++) {
      const x = x0 + i * 20, y = 15;
      const pts = starPoints(x, y, 8, 3.6);
      if (rt.stars[i]) { g.fillStyle(0x3ee05a, 1); g.fillPoints(pts, true); g.lineStyle(1.2, 0xeaffea, 1); g.strokePoints(pts, true); }
      else if (rt.starsSaved[i]) { g.fillStyle(0x3ee05a, 0.35); g.fillPoints(pts, true); g.lineStyle(1, 0xffffff, 0.5); g.strokePoints(pts, true); }
      else { g.fillStyle(0x000000, 0.25); g.fillPoints(pts, true); g.lineStyle(1, 0xffffff, 0.55); g.strokePoints(pts, true); }
    }
    // Stempel
    const sx = W / 2 + 36;
    if (!data.stamp) { /* Level ohne Stempel (Arena) */ }
    else if (rt.stamp) { g.fillStyle(0xff7ab8, 1); g.fillCircle(sx, 15, 7); g.fillStyle(0xfff4fa, 1); g.fillCircle(sx, 15, 4.5); g.fillStyle(0xe8438c, 1); g.fillCircle(sx, 16, 2.2); }
    else { g.fillStyle(0x000000, rt.stampSaved ? 0.1 : 0.25); g.fillCircle(sx, 15, 7); g.lineStyle(1, rt.stampSaved ? 0xff9ccc : 0xffffff, 0.55); g.strokeCircle(sx, 15, 7); }
    // Uhr
    const tx = W - 86;
    g.fillStyle(0xffffff, 0.95); g.fillCircle(tx, 15, 6.5);
    g.lineStyle(1.4, 0x2a2550, 1); g.strokeCircle(tx, 15, 6.5);
    g.lineBetween(tx, 15, tx, 10.5); g.lineBetween(tx, 15, tx + 3, 15);
  }
}
