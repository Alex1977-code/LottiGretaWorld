// Knochenflieger-Gruppe – Gegner Welt 8 „Brummbär-Rummelplatz“ (8-1 Knochenflieger-Strecke, 8-4, 8-6): ein Schwarm aus 3–8
// Knochenfliegern (lustige Knochen-Vögel wie Welt 7) in Formation, der **gemeinsam herabstößt**. Besiegte Flieger zerfallen in
// Knochen und **setzen sich nach einigen Sekunden neu zusammen** (klappernd, gut lesbar) – außer mit Power-up/Wurfsichel (endgültig)
// bzw. mit respawn: false. Darstellung: alle Flieger eines Levels als eine Instanz-Gruppe (lib/instanced_w8.js 'knochenflieger':
// 'fly' | 'dive' | { anim: 'bones' | 'assemble', progress }, 4 Zeichenaufrufe für alle Schwärme).
//
// Steuerung (knochenflieger_gruppe, unsichtbar, kein Gegner) und Glieder (knochenflieger_glied, je Flieger eine Entität: Berührung,
//   Treffer, Schatten; level.named `${id}_${i}`).
// Formation (Körpermitten relativ zur Mitte, Blick in Flugrichtung):
//   'ring'          Kreis (radius), dreht sich langsam (spin rad/s); Sturzflug: alle zugleich, der Ring zieht sich um die Figur
//                   zusammen (Zange, tiefster Punkt 0,55 m neben ihrer Körpermitte).
//   'linie'|'reihe' Kette hintereinander (spacing m); Sturzflug: einer nach dem anderen (0,22 s Abstand) genau durch die Figur.
//   'welle'         nebeneinander (spacing m, wippt als Welle auf und ab); Sturzflug: der Reihe nach (0,15 s), jeder um seinen
//                   seitlichen Versatz neben der Figur – der mittlere genau durch sie.
//   'keil'          V hinter dem Anführer; Sturzflug: Anführer zuerst, dann paarweise (0,25 s), Zielpunkte leicht gespreizt.
// Bahn der Formation: center + orbit (Kreis, cw) | path + loop | ohne: schwebt an pos (wippt, bob).
// Ablauf: fly (Bahn) → Figur waagerecht < sight m von der Mitte und 0,8 … reach m darunter → warn (warn s: Formation hält an,
//   klappert) → dive (je Flieger ein Bogen S → tiefster Punkt → gespiegelt auf Starthöhe, Tempo dive m/s; dann rise zurück auf den
//   Platz in der Formation) → fly (cooldown s Pause). Eine zugewandte Figur mit Pilz-Maske übersieht er.
// Konter je Flieger: **Draufspringen / Stampfattacke / Rutschen → Knochenhaufen** (fällt klappernd zu Boden; harmlos), nach
//   respawn s zittert er (letzte 0,8 s) und **setzt sich wieder zusammen** (rebuild s: die Knochen wirbeln hoch auf seinen Platz).
//   **Endgültig besiegt** (zählt, drop): Power-ups und Wurfsichel (Feuer, Tatze/Schwanz/Krallen-Sturzflug, Wurfsichel, Panzer, Wurf,
//   Kanone, Explosion, Stern, Riese, Faust), Stampfattacke **auf den Knochenhaufen**, Angriffe auf den Haufen, respawn: false.
//   Seitliche Berührung im Flug/Sturzflug verletzt. POW-Erschütterung lässt Flieger kalt (flying).
// Daten: { kind: 'knochenflieger_gruppe', id?, pos: [x, y, z] (Mitte der Formation; y = Flughöhe der Körpermitten), count?: 5 (3–8),
//          formation?: 'ring' | 'linie' | 'welle' | 'keil', radius?: 1.8 (Ring), spacing?: 1.5 (Linie/Welle/Keil),
//          center?: [x, y, z] + orbit?: 4 + cw? | path?: [[x, y, z], …] + loop?, speed?: 2.2 (m/s), spin?: 0.7 (rad/s, Ring),
//          sight?: 7, reach?: 7, dive?: 8.5 (m/s), warn?: 0.8 (s), cooldown?: 2.6 (s), respawn?: 4 (s) | false, rebuild?: 1.2 (s),
//          bob?: 0.15, phase?: 0..1 (Start auf der Bahn), drop? (je Flieger, nur endgültig) }
//   Beispiel: { kind: 'knochenflieger_gruppe', id: 'kg1', pos: [0, 5, -60], count: 6, formation: 'ring', center: [0, 5, -60], orbit: 3 }
// Laufzeit: Gruppe state (fly | warn | dive), dives, members, aliveCount (nicht endgültig besiegt), formed (in Formation), rebuilds,
//   info(); Glied state (form | wait | dive | rise | bones | rebuild | gone), bonesT, rebuilds, defeated (endgültig), info().
// Sound: 'hover' (Ankündigung), 'swoop' (Sturzflug), 'blockhit' (Knochen fallen), 'step' (Klappern), 'switch' (setzt sich zusammen),
//   'poof' (Haufen zerstiebt), 'stomp'.

import * as THREE from 'three';
import { EnemyW2, activeFigure, clamp, maskedFrom, sharedSlot } from '../EnemyW2.js';
import { Track, groundBelow, POWER_HIT } from '../w8help.js';

const TAU = Math.PI * 2;
const SHAKE = 0.8, GONE = 0.9, BONES_P = 0.5;
const FORMS = { ring: 'ring', linie: 'linie', reihe: 'linie', welle: 'welle', keil: 'keil' };

// =====================================================================================================================
// Steuerung
// =====================================================================================================================
class KnochenGruppe extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'knochenflieger_gruppe');
    this.enemy = false;
    this.touch = false;
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.half.set(0.1, 0.1, 0.1);
    this.count = clamp(Math.round(spec.count ?? 5), 1, 8);
    this.form = FORMS[spec.formation] ?? 'ring';
    this.radius = spec.radius ?? 1.8;
    this.spacing = spec.spacing ?? 1.5;
    this.speed = spec.speed ?? 2.2;
    this.spinRate = spec.spin ?? 0.7;
    this.sight = spec.sight ?? 7;
    this.reach = spec.reach ?? 7;
    this.diveSpeed = spec.dive ?? 8.5;
    this.warnT = spec.warn ?? 0.8;
    this.coolTime = spec.cooldown ?? 2.6;
    this.respawn = spec.respawn === false ? 0 : (spec.respawn ?? 4);
    this.rebuildT = spec.rebuild ?? 1.2;
    this.bobA = spec.bob ?? 0.15;
    this.center0 = this.pos.clone();
    this.track = null;
    if (Array.isArray(spec.center)) this.track = Track.circle(spec.center, spec.orbit ?? 4, !!spec.cw);
    else if (Array.isArray(spec.path) && spec.path.length >= 2) this.track = new Track(spec.path, spec.loop ?? spec.path.length >= 3);
    if (this.track) { this.track.s = this.track.wrap((spec.phase ?? 0) * this.track.L); this.track.posAt(this.track.s, this.track.pos); this.pos.set(this.track.pos.x, this.track.pos.y, this.track.pos.z); }
    this.mid = this.pos.clone();            // Mitte der Formation (ohne Wippen)
    this.heading = { x: 1, z: 0 };
    if (this.track) this.track.heading(this.heading);
    this.spin = 0;
    this.bobNow = 0;
    this.cool = 0.8;
    this.dives = 0;
    this.rebuilds = 0;
    this.state = 'fly';
    this.t0 = (spec.phase ?? 0) * 4.1;
    this.members = [];
    for (let i = 0; i < this.count; i++) {
      const g = new KnochenGlied(level, { pos: [this.pos.x, this.pos.y, this.pos.z], id: spec.id ? `${spec.id}_${i}` : undefined, drop: spec.drop }, this, i);
      level.entities.push(g);
      if (g.spec.id) level.named.set(g.spec.id, g);
      if (g.shadow > 0 && level.view) level.view.shadows.add({ pos: g.pos, radius: g.shadow, alive: () => !g.removed, visible: () => g.alive && g.shadowVisible !== false });
      this.members.push(g);
    }
    for (const g of this.members) g.toSlot();
  }

  /** Körpermitte des Platzes i in der Formation (Welt) → out. */
  slotPos(i, out) {
    const n = this.count, h = this.heading, sx = -h.z, sz = h.x;       // s = rechts quer zur Flugrichtung
    let fx = 0, fy = 0, lx = 0;
    const t = this.level.time + this.t0;
    switch (this.form) {
      case 'linie': fx = -i * this.spacing; fy = Math.sin(t * 2 + i * 0.7) * 0.08; break;
      case 'welle': lx = (i - (n - 1) / 2) * this.spacing; fy = Math.sin(t * 2.4 - i * 0.9) * 0.35; break;
      case 'keil': { const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; fx = -k * this.spacing * 0.75; lx = i ? s * k * this.spacing * 0.8 : 0; fy = k * 0.12; break; }
      default: {
        const a = this.spin + (i / n) * TAU;
        out.x = this.mid.x + Math.cos(a) * this.radius; out.z = this.mid.z - Math.sin(a) * this.radius;
        out.y = this.mid.y + Math.sin(t * 2.2 + i * 2.1) * 0.12 + this.bobNow;
        return out;
      }
    }
    out.x = this.mid.x + h.x * fx + sx * lx;
    out.z = this.mid.z + h.z * fx + sz * lx;
    out.y = this.mid.y + fy + this.bobNow;
    return out;
  }

  /** Blickrichtung (Gier) eines Platzes: Ring tangential, sonst Flugrichtung. */
  slotYaw(i) {
    if (this.form === 'ring') { const a = this.spin + (i / this.count) * TAU; return a + (this.spinRate >= 0 ? Math.PI / 2 : -Math.PI / 2); }
    return Math.atan2(-this.heading.z, this.heading.x);
  }

  get aliveCount() { return this.members.filter((m) => !m.defeated).length; }
  get formed() { return this.members.filter((m) => m.state === 'form').length; }

  update(dt) {
    this.stateT += dt;
    if (this.cool > 0) this.cool -= dt;
    this.bobNow = Math.sin((this.level.time + this.t0) * 1.6) * this.bobA;
    if (this.members.every((m) => m.removed)) { this.kill(); return; }
    switch (this.state) {
      case 'fly': {
        if (this.track) {
          const ox = this.track.pos.x, oz = this.track.pos.z;
          this.track.advance(this.speed * dt);
          const p = this.track.pos;
          this.mid.set(p.x, p.y, p.z);
          const dx = p.x - ox, dz = p.z - oz, l = Math.hypot(dx, dz);
          if (l > 1e-6) { this.heading.x += (dx / l - this.heading.x) * Math.min(1, dt * 4); this.heading.z += (dz / l - this.heading.z) * Math.min(1, dt * 4); const k = Math.hypot(this.heading.x, this.heading.z) || 1; this.heading.x /= k; this.heading.z /= k; }
        } else if (this.form !== 'ring') {
          const p = this.player;
          if (activeFigure(p)) {
            const dx = p.pos.x - this.mid.x, dz = p.pos.z - this.mid.z, l = Math.hypot(dx, dz);
            if (l > 0.5) { this.heading.x += (dx / l - this.heading.x) * Math.min(1, dt * 1.5); this.heading.z += (dz / l - this.heading.z) * Math.min(1, dt * 1.5); const k = Math.hypot(this.heading.x, this.heading.z) || 1; this.heading.x /= k; this.heading.z /= k; }
          }
        }
        this.spin += this.spinRate * dt;
        this.pos.copy(this.mid);
        if (this.cool <= 0 && this.formed > 0 && this.wantsDive()) { this.setState('warn'); this.level.sfx('hover'); this.level.sfx('step'); }
        break;
      }
      case 'warn':
        if (this.stateT >= this.warnT) this.startDive();
        break;
      case 'dive':
        if (!this.members.some((m) => m.state === 'wait' || m.state === 'dive' || m.state === 'rise')) { this.cool = this.coolTime; this.setState('fly'); }
        break;
      default: break;
    }
  }

  wantsDive() {
    const p = this.player;
    if (!activeFigure(p)) return false;
    const d = Math.hypot(p.pos.x - this.mid.x, p.pos.z - this.mid.z);
    const dy = this.mid.y - (p.pos.y + p.half.y);
    return d < this.sight && dy > 0.8 && dy < this.reach && !maskedFrom(this.level, this, p);
  }

  /** Sturzflug: je Flieger in Formation ein Bogen durch (bzw. neben) die Figur, nach Formation gestaffelt. */
  startDive() {
    const p = this.player;
    const T = activeFigure(p) ? { x: p.pos.x, y: p.pos.y + p.half.y, z: p.pos.z } : { x: this.mid.x, y: this.mid.y - 3, z: this.mid.z };
    const dx = T.x - this.mid.x, dz = T.z - this.mid.z, dl = Math.hypot(dx, dz) || 1;
    const ux = dx / dl, uz = dz / dl, sx = -uz, sz = ux;
    const n = this.count;
    let order = 0;
    for (const m of this.members) {
      if (m.state !== 'form') continue;
      const i = m.index;
      let ox = 0, oz = 0, delay = 0;
      if (this.form === 'ring') {
        const a = this.spin + (i / n) * TAU;
        ox = Math.cos(a) * 0.55; oz = -Math.sin(a) * 0.55;
      } else if (this.form === 'linie') delay = order * 0.22;
      else if (this.form === 'welle') { const lx = (i - (n - 1) / 2) * this.spacing * 0.7; ox = sx * lx; oz = sz * lx; delay = order * 0.15; }
      else if (this.form === 'keil') { const k = Math.ceil(i / 2), s = i % 2 ? 1 : -1; ox = sx * s * k * 0.45; oz = sz * s * k * 0.45; delay = k * 0.25; }
      m.beginDive({ x: T.x + ox, y: T.y, z: T.z + oz }, delay, this.diveSpeed);
      order++;
    }
    this.dives++;
    this.setState('dive');
    this.level.sfx('swoop');
  }

  onPlayer() { return 'none'; }
  onHit() {}

  kill() {
    for (const m of this.members) if (!m.removed) m.kill();
    super.kill();
  }

  info() {
    return {
      state: this.state, dives: this.dives, alive: this.aliveCount, formed: this.formed, rebuilds: this.rebuilds, count: this.count, form: this.form,
      x: +this.mid.x.toFixed(2), y: +this.mid.y.toFixed(2), z: +this.mid.z.toFixed(2),
    };
  }
}

// =====================================================================================================================
// Glied (ein Knochenflieger)
// =====================================================================================================================
const HY = 0.32;

class KnochenGlied extends EnemyW2 {
  constructor(level, spec, group, index) {
    super(level, spec, 'knochenflieger_glied');
    this.group = group;
    this.index = index;
    this.half.set(0.4, HY, 0.4);
    this.shadow = 0.32;
    this.wake = 0;
    this.edges = false;
    this.flying = true;
    this.state = 'form';
    this.body = new THREE.Vector3();
    this.S = new THREE.Vector3(); this.C = new THREE.Vector3(); this.E = new THREE.Vector3(); this.R = new THREE.Vector3();
    this.pile = new THREE.Vector3();
    this.bonesT = 0;
    this.rebuilds = 0;
    this.collapses = 0;
    this.slot = sharedSlot(level, 'knochenflieger');
  }

  setBody(x, y, z) { this.body.set(x, y, z); this.pos.set(x, y - HY, z); }

  toSlot() {
    const o = this.group.slotPos(this.index, this._sp ?? (this._sp = {}));
    this.setBody(o.x, o.y, o.z);
    this.yaw = this.group.slotYaw(this.index);
  }

  /** Sturzflug vorbereiten: tiefster Punkt low, nach delay s, Tempo v. */
  beginDive(low, delay, v) {
    this.S.copy(this.body);
    this.E.set(2 * low.x - this.S.x, this.S.y, 2 * low.z - this.S.z);
    this.C.set(2 * low.x - (this.S.x + this.E.x) / 2, 2 * low.y - (this.S.y + this.E.y) / 2, 2 * low.z - (this.S.z + this.E.z) / 2);
    const L = Math.hypot(this.E.x - this.S.x, this.E.z - this.S.z) + 2 * (this.S.y - low.y);
    this.diveT = clamp(L / v, 0.8, 2.2);
    this.diveLow = [+low.x.toFixed(2), +low.y.toFixed(2), +low.z.toFixed(2)];
    this.delay = delay;
    this.setState(delay > 0 ? 'wait' : 'dive');
  }

  update(dt) {
    this.stateT += dt;
    const g = this.group;
    switch (this.state) {
      case 'form':
        this.toSlot();
        break;
      case 'wait':
        if (this.stateT >= this.delay) this.setState('dive');
        break;
      case 'dive': {
        const u = Math.min(1, this.stateT / this.diveT);
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
        const ox = this.body.x, oz = this.body.z;
        this.setBody(a * this.S.x + b * this.C.x + c * this.E.x, a * this.S.y + b * this.C.y + c * this.E.y, a * this.S.z + b * this.C.z + c * this.E.z);
        if (Math.abs(this.body.x - ox) + Math.abs(this.body.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.body.z - oz), this.body.x - ox);
        if (u >= 1) { this.R.copy(this.body); this.riseT = clamp(this.R.distanceTo(this.S) / 4, 0.8, 2.0); this.setState('rise'); }
        break;
      }
      case 'rise': {
        const u = Math.min(1, this.stateT / this.riseT), k = u * u * (3 - 2 * u);
        const o = g.slotPos(this.index, this._sp ?? (this._sp = {}));
        const ox = this.body.x, oz = this.body.z;
        this.setBody(this.R.x + (o.x - this.R.x) * k, this.R.y + (o.y - this.R.y) * k + Math.sin(u * Math.PI) * 0.8, this.R.z + (o.z - this.R.z) * k);
        if (Math.abs(this.body.x - ox) + Math.abs(this.body.z - oz) > 1e-6) this.yaw = Math.atan2(-(this.body.z - oz), this.body.x - ox);
        if (u >= 1) this.setState('form');
        break;
      }
      case 'bones': this.bonesStep(dt); break;
      case 'rebuild': {
        const u = Math.min(1, this.stateT / g.rebuildT), k = u * u * (3 - 2 * u);
        const o = g.slotPos(this.index, this._sp ?? (this._sp = {}));
        this.setBody(this.pile.x + (o.x - this.pile.x) * k, this.pile.y + (o.y - this.pile.y) * k + Math.sin(u * Math.PI) * 1.2, this.pile.z + (o.z - this.pile.z) * k);
        this.yaw += dt * 9 * (1 - u);
        if (u >= 1) { this.touch = true; this.yaw = g.slotYaw(this.index); this.setState('form'); this.level.sfx('switch'); this.level.effects?.sparks(this.body, 6); }
        break;
      }
      case 'gone': {
        this.vel.y -= 14 * dt;
        this.pos.addScaledVector(this.vel, dt);
        this.body.set(this.pos.x, this.pos.y + HY, this.pos.z);
        if (this.stateT >= GONE || this.pos.y < this.level.killY) this.kill();
        break;
      }
      default: break;
    }
  }

  /** Knochenhaufen: fällt zu Boden, liegt, zittert, setzt sich wieder zusammen. */
  bonesStep(dt) {
    const g = this.group;
    if (!this.landed) {
      this.vel.y = Math.max(this.vel.y - 30 * dt, -20);
      this.pile.addScaledVector(this.vel, dt);
      if (this.floor !== null && this.pile.y <= this.floor + 0.42) { this.pile.y = this.floor + 0.42; this.vel.set(0, 0, 0); this.landed = true; this.level.sfx('blockhit'); this.level.effects?.dust({ x: this.pile.x, y: this.floor, z: this.pile.z }, 6, 0.9); }
      if (this.floor === null && this.pile.y < g.mid.y - 30) { this.landed = true; this.vel.set(0, 0, 0); }
    }
    this.setBody(this.pile.x, this.pile.y, this.pile.z);
    this.half.set(0.55, 0.22, 0.55);
    this.pos.y = this.pile.y - 0.42;
    this.bonesT += dt;
    const left = g.respawn - this.bonesT;
    if (left <= SHAKE && left + dt > SHAKE) this.level.sfx('step');
    if (left <= 0 && g.state === 'fly') {
      this.half.set(0.4, HY, 0.4);
      this.touch = false;
      this.rebuilds++;
      g.rebuilds++;
      this.setState('rebuild');
      this.level.sfx('switch');
      this.level.effects?.dust({ x: this.pile.x, y: this.pile.y - 0.3, z: this.pile.z }, 5, 0.8);
    }
  }

  get shaking() { return this.state === 'bones' && this.landed && this.group.respawn - this.bonesT <= SHAKE; }

  /** Zerfällt in Knochen (Draufspringen/Stampfen/Rutschen). Ohne Neu-Zusammensetzen: endgültig. */
  collapse(source) {
    if (this.defeated || this.state === 'bones' || this.state === 'rebuild' || this.state === 'gone') return;
    if (!(this.group.respawn > 0)) { this.defeat(source); return; }
    this.collapses++;
    this.pile.copy(this.body);
    this.floor = groundBelow(this.level, this.body.x, this.body.y, this.body.z, 40);
    this.landed = false;
    this.vel.set(0, 1.5, 0);
    this.bonesT = 0;
    this.touch = true;          // Haufen: harmlos, aber Stampfattacke/Angriffe besiegen endgültig
    this.setState('bones');
    this.level.sfx('blockhit');
    this.level.effects?.dust(this.body, 6, 0.8);
  }

  /** Endgültig besiegt: fällt klappernd auseinander (zählt). */
  defeat(source, up = 4) {
    if (this.defeated) return;
    const sx = source?.pos?.x ?? this.pos.x, sz = source?.pos?.z ?? this.pos.z;
    let ax = this.pos.x - sx, az = this.pos.z - sz;
    const l = Math.hypot(ax, az);
    if (l > 1e-3) { ax /= l; az /= l; } else { ax = 0; az = 0; }
    const wasPile = this.state === 'bones';
    this.half.set(0.4, HY, 0.4);
    this.setState('gone');
    this.touch = false;
    this.vel.set(ax * 1.5, wasPile ? 1 : up, az * 1.5);
    this.level.sfx(wasPile ? 'poof' : 'blockhit');
    this.level.effects?.dust(this.body, 8, 1);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state === 'rebuild' || this.state === 'gone') return 'none';
    if (this.state === 'bones') {
      // Knochenhaufen: Stampfattacke darauf besiegt endgültig; sonst harmlos
      if (contact.pound) { this.defeat(player); return 'none'; }
      return 'none';
    }
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.collapse(player); return 'stomp'; }
    if (contact.fromAbove) { this.collapse(player); return 'stomp'; }
    if (contact.dive) { this.defeat(player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state === 'rebuild' || this.state === 'gone' || kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (POWER_HIT.has(kind) || source?.sichel) { this.defeat(source, 5); return; }
    if (this.state === 'bones') return;
    this.collapse(source);            // Rutschen, Stampfwelle daneben, Schwanz ohne Power-up …
  }

  // ------------------------------------------------------------------ Darstellung (gemeinsame Instanz-Gruppe)

  render() {
    const s = this.slot;
    if (!s || this.removed) return;
    const st = this.state;
    if (st === 'bones') {
      const j = this.shaking ? Math.sin(this.level.time * 55 + this.index) * 0.05 : 0;
      s.set({ x: this.body.x + j, y: this.body.y, z: this.body.z }, this.yaw, 1, { anim: 'bones', progress: this.landed ? BONES_P : Math.min(BONES_P, this.stateT / 0.9) });
      return;
    }
    if (st === 'rebuild') { s.set(this.body, this.yaw, 1, { anim: 'assemble', progress: Math.min(1, this.stateT / this.group.rebuildT) }); return; }
    if (st === 'gone') { s.set(this.body, this.yaw, 1, { anim: 'bones', progress: Math.min(1, this.stateT / GONE) }); return; }
    s.set(this.body, this.yaw, 1, st === 'dive' ? 'dive' : 'fly');
  }

  get shadowVisible() { return this.state !== 'gone' && this.state !== 'rebuild'; }

  dispose() {
    this.slot?.release();
    this.slot = null;
    super.dispose();
  }

  info() {
    return {
      state: this.state, defeated: this.defeated, collapses: this.collapses, rebuilds: this.rebuilds, landed: !!this.landed,
      bonesT: +this.bonesT.toFixed(2), x: +this.body.x.toFixed(2), y: +this.body.y.toFixed(2), z: +this.body.z.toFixed(2),
    };
  }
}

export const KINDS = { knochenflieger_gruppe: (level, spec) => new KnochenGruppe(level, spec) };
