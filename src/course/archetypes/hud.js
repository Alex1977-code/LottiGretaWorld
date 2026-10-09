// Zusatz-HUD der Archetypen (Arena, Boss): Boss-Lebensleiste, Restgegner-Anzeige der Arena und große Ansagen.
// Hängt sich an die laufende Phaser-Szene 'CourseUI' (480 × 270, über der 3D-Leinwand), sobald sie aktiv ist –
// CourseUIScene.js bleibt unverändert. Je Bild tick() aufrufen (aus archetype.render).
//
//   hud.boss({ name, hp, max, car })   Leiste unter der Stern-Zeile (Herzen; car = Blechschäden 0..2 als Punkte)
//   hud.arena({ left, total })         Bullenköpfe (übrig = farbig, besiegt = grau mit Kreuz) + „noch N“
//   hud.banner(text, { color, size, hold }) große Ansage in der Bildmitte (blendet ein und aus)
//   hud.hideBoss(), hud.hideArena(), hud.state() (für Tests), hud.dispose()

import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { uiText } from '../../ui.js';

export class ArchHud {
  /** @param {Phaser.Scene} course CourseScene */
  constructor(course) {
    this.course = course;
    this.ui = null;
    this.objs = null;
    this.want = { boss: null, arena: null };
    this.banners = [];
    this.queue = [];
    this.lastKey = '';
  }

  /** An die UI-Szene anhängen (sobald sie läuft); neu anhängen, wenn sie neu gestartet wurde. */
  tick() {
    let ui = null;
    try { ui = this.course.scene.get('CourseUI'); } catch (_) { ui = null; }
    if (!ui || !ui.sys.isActive() || ui.course !== this.course) return;
    if (this.ui !== ui || !this.objs) this.attach(ui);
    while (this.queue.length) this.showBanner(...this.queue.shift());
    this.draw();
  }

  attach(ui) {
    this.ui = ui;
    const g = ui.add.graphics().setDepth(44);
    const bossName = uiText(ui, GAME.width / 2, 37, '', { size: 7, thickness: 2, color: '#ffe8a0' }).setDepth(46);
    const arenaText = uiText(ui, GAME.width / 2 + 34, 39, '', { size: 8, thickness: 2 }).setDepth(46);
    this.objs = { g, bossName, arenaText };
    this.lastKey = '';
    ui.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.objs = null; this.ui = null; this.banners = []; });
  }

  boss(s) { this.want.boss = s; }
  hideBoss() { this.want.boss = null; }
  arena(s) { this.want.arena = s; }
  hideArena() { this.want.arena = null; }

  banner(text, opts = {}) {
    if (this.objs) this.showBanner(text, opts);
    else this.queue.push([text, opts]);
  }

  showBanner(text, opts = {}) {
    const ui = this.ui;
    for (const b of this.banners) b.destroy();
    this.banners = [];
    const t = uiText(ui, GAME.width / 2, GAME.height * (opts.y ?? 0.3), text, { size: opts.size ?? 17, thickness: 4, stroke: '#3a2a6a', color: opts.color ?? '#ffe066' }).setDepth(61);
    t.setScale(0.4).setAlpha(0);
    this.banners.push(t);
    this.lastBanner = text;
    ui.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    ui.tweens.add({ targets: t, alpha: 0, y: t.y - 10, delay: (opts.hold ?? 1.6) * 1000, duration: 380, onComplete: () => { t.destroy(); this.banners = this.banners.filter((b) => b !== t); } });
  }

  draw() {
    const { boss, arena } = this.want;
    const key = JSON.stringify([boss, arena]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const o = this.objs, g = o.g;
    g.clear();
    o.bossName.setText(''); o.arenaText.setText('');
    const W = GAME.width;
    if (boss) {
      const w = 150, x = W - 90, y = 42;   // rechts unter der Uhr (die Mitte bleibt für den Endgegner frei)
      g.fillStyle(0x2a1030, 0.62); g.fillRoundedRect(x - w / 2, y - 9, w, 20, 9);
      g.lineStyle(1, 0xffc21a, 0.7); g.strokeRoundedRect(x - w / 2 + 0.5, y - 8.5, w - 1, 19, 9);
      o.bossName.setPosition(x - w / 2 + 8, y).setOrigin(0, 0.5).setText(boss.name ?? 'Boss');
      for (let i = 0; i < boss.max; i++) {
        const hx = x + w / 2 - 14 - (boss.max - 1 - i) * 15, hy = y + 0.5;
        this.heart(g, hx, hy, i < boss.hp);
      }
      // Blechschäden (drei = ein Treffer)
      for (let i = 0; i < 2; i++) {
        g.fillStyle(i < (boss.car ?? 0) ? 0xffc21a : 0x000000, i < (boss.car ?? 0) ? 1 : 0.3);
        g.fillCircle(x + w / 2 - 14 - boss.max * 15 - 4 - i * 6, y + 5, 2);
      }
    }
    if (arena) {
      const n = arena.total, w = 26 + n * 18 + 46, x = W / 2, y = 40;
      g.fillStyle(0x1a1830, 0.55); g.fillRoundedRect(x - w / 2, y - 9, w, 19, 9);
      for (let i = 0; i < n; i++) this.bullHead(g, x - w / 2 + 16 + i * 18, y + 0.5, i < arena.left);
      o.arenaText.setPosition(x - w / 2 + 16 + n * 18 + 2, y + 0.5).setOrigin(0, 0.5)
        .setText(arena.left > 0 ? `noch ${arena.left}` : 'frei!').setColor(arena.left > 0 ? '#ffffff' : '#7dffa0');
    }
  }

  heart(g, x, y, full) {
    const draw = () => {
      g.fillCircle(x - 2.6, y - 1.5, 3.2); g.fillCircle(x + 2.6, y - 1.5, 3.2);
      g.fillTriangle(x - 5.6, y - 0.6, x + 5.6, y - 0.6, x, y + 5.6);
    };
    g.fillStyle(full ? 0xff3a5a : 0x000000, full ? 1 : 0.35); draw();
    if (full) { g.fillStyle(0xffffff, 0.7); g.fillCircle(x - 3.2, y - 2.4, 1); }
  }

  bullHead(g, x, y, alive) {
    g.fillStyle(alive ? 0xb3572a : 0x6a6470, 1); g.fillCircle(x, y, 6);
    g.fillStyle(alive ? 0x2f6ee0 : 0x8a8490, 1); g.slice(x, y - 0.5, 6.4, Math.PI, 0, false); g.fillPath();
    g.fillStyle(0xfff2d6, 1); g.fillTriangle(x - 6, y - 3, x - 9.5, y - 7, x - 4.5, y - 5); g.fillTriangle(x + 6, y - 3, x + 9.5, y - 7, x + 4.5, y - 5);
    g.fillStyle(0xffc9b0, 1); g.fillEllipse(x, y + 3, 7, 4);
    if (!alive) { g.lineStyle(2, 0xff3a3a, 0.95); g.lineBetween(x - 5, y - 5, x + 5, y + 5); g.lineBetween(x + 5, y - 5, x - 5, y + 5); }
  }

  state() {
    return { attached: !!this.objs, boss: this.want.boss, arena: this.want.arena, banner: this.lastBanner ?? null };
  }

  dispose() {
    if (this.objs) { for (const v of Object.values(this.objs)) v.destroy?.(); }
    for (const b of this.banners) b.destroy?.();
    this.objs = null; this.banners = []; this.ui = null;
  }
}
