// Kampfraum – „alle Gegner eines Raums besiegt → Signal“ (Präzisierung Gegner Bonuswelten: P-Haus-Kampfräume, P-4 „erst wenn alle
// Gegner besiegt sind, erscheint die Ziel-Warp-Box“, B-9 „4 Pilzlingstürme mit Feuer-Werfern – alle besiegen → Ziel-Warp-Box“,
// S-6 „alle Flatterkäfer im Mittelteil“, K-1 Zauberarena). Unsichtbar, ohne Modell.
//
// Sobald eine Figur den Bereich betritt (start 'betreten', Standard), werden die Gegner darin gezählt (bzw. die mit ids
// benannten): Entitäten mit enemy (auch Endgegner mit boss: true) und Fußpunkt im Bereich; spec.count: false nimmt eine aus,
// spec.count: true nimmt eine Nicht-Gegner-Entität auf. Besiegt zählt markDefeated (defeated) sowie Lava/Absturz und
// Entfernen (removed). Sind alle besiegt: Signal (signal, Standard 'kampfraumFrei', Daten { id, count, pos }) und Aktion
// onClear (z. B. { reveal: 'warp_ziel' } oder { star: 2 }). Erst später erscheinende Gegner zählen nicht mit (add: true zählt
// neue Gegner im Bereich hinzu, solange der Raum läuft). Tod der Figur: der Raum zählt beim nächsten Betreten neu (Gegner, die
// der Motor/Archetyp neu erzeugt, werden erfasst).
// Daten: { kind: 'kampfraum', id?, area: { min: [x, y, z], max: [x, y, z] } | { pos: [x, y, z], r } (Kreis, Höhe ± 8),
//          ids?: ['g1', …], start?: 'betreten' | 'sofort' | 'signal' (Signal start: { start: id }), signal?: 'kampfraumFrei',
//          onClear?: Aktion, add?: false, banner?: '' (Ansage beim Freikämpfen, z. B. 'Alle besiegt!') }
//   Beispiel: { kind: 'kampfraum', id: 'raum1', area: { min: [-8, 0, -18], max: [8, 6, -2] }, onClear: { reveal: 'warp_ziel' } }
// Laufzeit: state ('wait' | 'active' | 'done'), total, left, cleared (Zahl der Freikämpfe), targets, start(), reset(), info().

import { CourseEntity } from '../CourseEntity.js';
import { runAction } from '../gimmick.js';
import { bannerOf } from '../bonushelp.js';

class Kampfraum extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'kampfraum');
    this.touch = false;
    this.shadow = 0;
    const a = spec.area ?? {};
    if (a.min && a.max) this.area = { box: true, min: a.min, max: a.max };
    else { const c = a.pos ?? spec.pos ?? [0, 0, 0]; this.area = { box: false, c, r: a.r ?? 10 }; }
    this.ids = spec.ids ?? null;
    this.startMode = spec.start ?? 'betreten';
    this.state = 'wait';
    this.targets = [];
    this.total = 0;
    this.cleared = 0;
    this.armed = this.startMode === 'sofort';
    // Tod der Figur: beim nächsten Betreten neu zählen
    const rt = level.runtime;
    if (rt && !rt._kampfraumWrapped) {
      rt._kampfraumWrapped = true;
      const respawn = rt.respawn.bind(rt);
      rt.respawn = () => { respawn(); for (const e of level.entities) if (e.kind === 'kampfraum' && e.state === 'active') e.reset(); };
    }
  }

  inArea(p) {
    const A = this.area;
    if (A.box) return p.x >= A.min[0] && p.x <= A.max[0] && p.y >= A.min[1] - 0.5 && p.y <= A.max[1] && p.z >= A.min[2] && p.z <= A.max[2];
    return Math.hypot(p.x - A.c[0], p.z - A.c[2]) <= A.r && Math.abs(p.y - A.c[1]) < 8;
  }

  counts(e) {
    if (!e || e === this || e.removed || !e.alive) return false;
    if (e.spec?.count === false) return false;
    if (e.spec?.count === true) return true;
    return !!e.enemy || !!e.boss;
  }

  /** Signal start (Aktion { start: id }). */
  start() { if (this.state === 'wait') this.armed = true; }

  reset() { this.state = 'wait'; this.targets = []; this.total = 0; this.armed = this.startMode === 'sofort'; }

  collect() {
    const L = this.level;
    this.targets = this.ids ? this.ids.map((id) => L.named.get(id)).filter((e) => e && !e.removed)
      : L.entities.filter((e) => this.counts(e) && !e.defeated && this.inArea(e.pos));
    this.total = this.targets.length;
  }

  get left() { return this.targets.filter((e) => !e.defeated && !e.removed && !e.fellOut).length; }

  update() {
    if (this.state === 'done') return;
    if (this.state === 'wait') {
      if (this.startMode === 'betreten') {
        const p = this.level.player;
        if (p && !p.dead && this.inArea(p.pos)) this.armed = true;
      }
      if (!this.armed) return;
      this.collect();
      if (!this.total) return;
      this.state = 'active';
      return;
    }
    if (this.spec.add) {
      for (const e of this.level.entities) if (this.counts(e) && !e.defeated && !this.targets.includes(e) && this.inArea(e.pos)) { this.targets.push(e); this.total++; }
    }
    if (this.left === 0) this.clear();
  }

  clear() {
    this.state = 'done';
    this.cleared++;
    const A = this.area;
    const pos = A.box ? [(A.min[0] + A.max[0]) / 2, A.min[1], (A.min[2] + A.max[2]) / 2] : A.c.slice();
    this.level.sfx('room_clear');
    this.level.signal(this.spec.signal ?? 'kampfraumFrei', { id: this.spec.id ?? null, count: this.total, pos });
    runAction(this.level, this.spec.onClear, { pos, source: this });
    if (this.spec.banner) bannerOf(this.level, this.spec.banner, { color: '#7dffa0' });
  }

  info() { return { state: this.state, total: this.total, left: this.state === 'active' ? this.left : this.state === 'done' ? 0 : null, cleared: this.cleared }; }
}

export const KINDS = { kampfraum: (level, spec) => new Kampfraum(level, spec) };
