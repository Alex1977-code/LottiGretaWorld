// Warp-Box / Rätselbox und Aufgabe (Sonder-Bausteine).
//
// warpbox – Kasten (1,6 × 1,2 × 1,6 m), in den man hineinspringt: Landen auf der Öffnung zieht die Figur hinein
//   (wie eine Röhre: hinab, Teleport, Kamera springt mit) – zu einer anderen Warp-Box (die Figur steigt dort
//   heraus), zu einer Röhre (pipe-Id) oder an einen Punkt. Ein Unterbereich abseits im Level (Raum, Münzhimmel)
//   bekommt eine eigene Kameraschiene mit `area: [xMin, xMax]` (LEVEL.camera). Nach der Ankunft reagiert die
//   Ziel-Box erst, wenn die Figur einmal heruntergestiegen ist.
//   style 'mystery' = Rätselbox (violett-gold), meist mit task: Aufgabe im Raum, Belohnung Stern.
//   { kind: 'warpbox', id, pos: [x, y, z] (Mitte der Unterseite), target: Id (warpbox/pipe) | [x, y, z],
//     style: 'warp' | 'mystery', task?: { …wie Entität task }, hidden?, onEnter?: Aktion }
//   Beispiel (hin und zurück, Rätselbox mit Aufgabe):
//     { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [6, 1, -80], target: 'rb2' },
//     { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [80, 1, -80], target: 'rb1',
//       task: { area: { min: [72, 0, -88], max: [88, 6, -72] }, star: 1, pos: [80, 2, -84] } }
//
// task – Aufgabe in einem Bereich: type 'defeatAll' (Standard): sobald die Figur den Bereich betritt, werden die
//   Gegner darin (bzw. die mit ids benannten) gezählt; sind alle besiegt → Belohnung (Stern erscheint, Arena 1-A).
//   { kind: 'task', type: 'defeatAll', area: { min: [x, y, z], max: [x, y, z] } | { pos, r }, ids?: [Gegner-Ids],
//     star: Index | reward: Aktion (entities/gimmick.js), pos: Ort des Sterns (Standard 1 m über der Mitte des
//     Bereichs), id? }
//   Beispiel: { kind: 'task', area: { pos: [0, 1, -20], r: 11 }, star: 0, pos: [0, 2, -20] }

import { Gimmick, playerOn, runAction } from '../gimmick.js';
import { getModel } from '../../models/index.js';

const W = 1.6, H = 1.2;

class WarpBox extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'warpbox');
    this.half.set(W / 2, H / 2, W / 2);
    this.touch = false;
    this.top = this.pos.y + H;
    this.target = spec.target ?? null;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - W / 2, p.y, p.z - W / 2], max: [p.x + W / 2, this.top, p.z + W / 2], tag: 'warpbox' });
    this.armed = true;
    this.armT = 0;
    this.suckT = 0;
    this.pipe = true; // als Röhren-Ziel nutzbar (x, z, top)
    if (spec.task) this.task = level.spawn('task', { ...spec.task, owner: this });
    if (level.view) this.setModel(getModel('warp_box', { style: spec.style === 'mystery' ? 'mystery' : 'warp' }));
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  /** Ziel-Box: Figur ist gerade angekommen – erst nach dem Absteigen wieder bereit. */
  disarm() { this.armed = false; this.armT = 0; }

  update(dt) {
    if (this.suckT > 0) this.suckT -= dt;
    if (this.hidden) return;
    // Ankunft aus einer Röhre/Box, die diese Box als Ausgang hat → nicht gleich wieder hinein
    const sc = this.level.player?.script;
    if (sc?.type === 'pipe' && sc.exit && Math.abs(sc.exit.x - this.pos.x) < 0.01 && Math.abs(sc.exit.z - this.pos.z) < 0.01) this.disarm();
    const on = playerOn(this.level, this);
    if (!this.armed) {
      if (!on) { this.armT += dt; if (this.armT > 0.25) this.armed = true; } else this.armT = 0;
      return;
    }
    if (on) this.enter(this.level.player);
  }

  /** Ausgang bestimmen: Warp-Box/Röhre (herausklettern) oder Punkt. */
  exitInfo() {
    const t = this.target;
    if (t === null || t === undefined) return null;
    if (typeof t === 'string') {
      const o = this.level.named.get(t);
      if (!o) { console.warn(`[Warp-Box] Ziel ${t} fehlt`); return null; }
      if (o.pipe) return { exit: { pipe: true, x: o.x, z: o.z, top: o.top }, target: o };
      if (o.pos) return { exit: { pos: [o.pos.x, o.pos.y + 0.1, o.pos.z] }, target: o };
      return null;
    }
    return { exit: { pos: t }, target: null };
  }

  enter(player) {
    const info = this.exitInfo();
    if (!info || player.dead || player.mode === 'script') return;
    this.suckT = 0.8;
    runAction(this.level, this.spec.onEnter, { pos: [this.pos.x, this.top, this.pos.z], source: this });
    player.enterPipe({
      x: this.pos.x, z: this.pos.z, top: this.top, exit: info.exit,
      onWarp: () => { info.target?.disarm?.(); if (info.target) info.target.suckT = 0.8; },
    });
  }

  modelState() { return { anim: this.suckT > 0 ? 'suck' : 'idle' }; }
}

class Task extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'task');
    this.touch = false;
    this.type = spec.type ?? 'defeatAll';
    const a = spec.area ?? {};
    if (a.min && a.max) this.area = { box: true, min: a.min, max: a.max };
    else { const c = a.pos ?? spec.pos ?? [0, 0, 0]; this.area = { box: false, c, r: a.r ?? 10 }; }
    this.ids = spec.ids ?? null;
    // Stern erscheint an pos (falls angegeben), sonst 1 m über der Mitte des Bereichs
    this.reward = spec.reward ?? (spec.star !== undefined ? { star: spec.pos ? { index: spec.star, pos: spec.pos } : spec.star } : { coins: 10 });
    const c = this.area.box ? this.area.min.map((v, i) => (v + this.area.max[i]) / 2) : this.area.c;
    this.rewardPos = spec.pos ?? [c[0], this.area.box ? this.area.min[1] : c[1], c[2]];
    this.state = 'wait';
    this.targets = [];
  }

  inArea(p) {
    const A = this.area;
    if (A.box) return p.x >= A.min[0] && p.x <= A.max[0] && p.y >= A.min[1] - 0.5 && p.y <= A.max[1] && p.z >= A.min[2] && p.z <= A.max[2];
    return Math.hypot(p.x - A.c[0], p.z - A.c[2]) <= A.r && Math.abs(p.y - A.c[1]) < 8;
  }

  /** Noch nicht besiegte Ziele. */
  get remaining() { return this.targets.filter((e) => e.alive && !e.removed).length; }

  update() {
    if (this.state === 'done') return;
    const p = this.level.player;
    if (this.state === 'wait') {
      if (!p || !this.inArea(p.pos)) return;
      this.targets = this.ids ? this.ids.map((id) => this.level.named.get(id)).filter(Boolean)
        : this.level.entities.filter((e) => e.enemy && e.alive && this.inArea(e.pos));
      if (!this.targets.length) return;
      this.state = 'active';
      return;
    }
    if (this.remaining === 0) {
      this.state = 'done';
      this.level.sfx('key');
      runAction(this.level, this.reward, { pos: this.rewardPos, source: this });
    }
  }
}

export const KINDS = {
  warpbox: (level, spec) => new WarpBox(level, spec),
  task: (level, spec) => new Task(level, spec),
};
