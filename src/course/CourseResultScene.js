// Ergebnis-Szene des Kurs-Modus ('CourseResult'): Zielmast-Höhe → Punkte (Spitze = Extraleben), Bitcoins,
// Sterne, Stempel, Zeit (mit Bestzeit). Weiter → Weltkarte, Nochmal → Level neu.

import Phaser from 'phaser';
import { GAME } from '../config.js';
import { setupUiCamera } from '../render.js';
import { sfx } from '../audio/index.js';
import { uiText, uiPanel, uiButton } from '../ui.js';

const fmt = (s) => {
  if (s === null || s === undefined) return '–';
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};

export class CourseResultScene extends Phaser.Scene {
  constructor() {
    super('CourseResult');
  }

  init(data) {
    this.course = data.course;
    this.result = data.result ?? {};
  }

  create() {
    const { width: w, height: h } = GAME;
    const r = this.result;
    setupUiCamera(this);
    this.add.rectangle(0, 0, w, h, 0x10102a, 0.35).setOrigin(0);
    uiPanel(this, w / 2, h / 2 + 6, 236, 200);
    uiText(this, w / 2, h / 2 - 78, 'Geschafft!', { size: 20, color: '#ffe066', stroke: '#3a2a6a', thickness: 4 });
    uiText(this, w / 2, h / 2 - 58, `${r.id ?? ''} · ${r.title ?? ''}`, { size: 8, color: '#5a4a7a', stroke: '#ffffff', thickness: 2, shadow: false });
    const rows = [
      r.pole === null ? ['Schatz', `alle ${(r.stars ?? []).length} Sterne gefunden!`]
        : ['Zielmast', `${Math.round((r.pole ?? 0) * 100)} %  →  ${r.points ?? 0} Punkte${r.top ? '  · Spitze! +1 Leben' : ''}`],
      ['Bitcoins', `${r.coins ?? 0}`],
      ['Zeit', `${fmt(r.time)}   (Bestzeit ${fmt(r.bestTime)})`],
      ['Leben', `${r.lives ?? ''}`],
    ];
    let y = h / 2 - 36;
    for (const [k, v] of rows) {
      uiText(this, w / 2 - 100, y, k, { size: 9, color: '#3a2a6a', stroke: '#ffffff', thickness: 2, shadow: false, originX: 0 });
      uiText(this, w / 2 - 38, y, v, { size: 9, color: '#2a2550', stroke: '#ffffff', thickness: 2, shadow: false, originX: 0 });
      y += 17;
    }
    // Sterne und Stempel
    const g = this.add.graphics();
    const stars = r.stars ?? [];
    // so viele Sterne wie das Level hat (Diorama 5); Stempel nur, wenn das Level einen hat
    const n = Math.max(1, stars.length || 3), hasStamp = this.course.levelData?.stamp != null;
    const x0 = w / 2 - (n - 1) * 13 - (hasStamp ? 15 : 0);
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * 26, cy = y + 8;
      const pts = [];
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? 4.6 : 10; pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }); }
      const got = stars[i] || r.starsSaved?.[i];
      g.fillStyle(0x3ee05a, stars[i] ? 1 : got ? 0.4 : 0.12); g.fillPoints(pts, true);
      g.lineStyle(1.2, 0x2a7a3a, 0.8); g.strokePoints(pts, true);
    }
    const sx = x0 + n * 26 + 4;
    if (hasStamp) {
      g.fillStyle(0xff7ab8, r.stamp ? 1 : r.stampSaved ? 0.4 : 0.12); g.fillCircle(sx, y + 8, 9);
      g.lineStyle(1.2, 0xb8306c, 0.8); g.strokeCircle(sx, y + 8, 9);
    }
    y += 32;
    const next = uiButton(this, w / 2 - 50, y, 'Weiter', { size: 10, color: 0x4fb833, minWidth: 88, padY: 5 });
    next.on(Phaser.Input.Events.POINTER_DOWN, () => { sfx('select'); this.course.exitToMap({ done: r.id }); });
    const again = uiButton(this, w / 2 + 50, y, 'Nochmal', { size: 10, color: 0xff9f1a, minWidth: 88, padY: 5 });
    again.on(Phaser.Input.Events.POINTER_DOWN, () => { sfx('select'); this.course.restartLevel(); });
    this.input.keyboard.on('keydown-SPACE', () => this.course.exitToMap({ done: r.id }));
    this.input.keyboard.on('keydown-ENTER', () => this.course.exitToMap({ done: r.id }));
  }
}
