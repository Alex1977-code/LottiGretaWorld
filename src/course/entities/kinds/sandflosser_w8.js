// Sandflosser – Gegner Welt 8 „Brummbär-Rummelplatz“ (8-2 Wüsten-Abfahrt auf Pflaume): dicker, lustiger Wüstenfisch, der unter der
// Dünenoberfläche schwimmt (nur Rückenflosse, Rücken und Glubschaugen schauen heraus – harmlos, unberührbar) und im Takt in hohen
// Bögen aus dem Sand springt. Modell 'sandflosser' (Ursprung = Sandoberfläche; im Sprung = Bauch), sonst Ersatz 'glotzfisch' (gelb).
//
// Verhalten: schwimmt seine Bahn (path + loop | center + radius + cw | pos + dir · dist hin und her | ohne Bahn: an pos) mit speed
//   m/s (ohne Bahn springt er abwechselnd hin und her um pos: pos ± dir · jump/2). Alle every s (phase versetzt) **kündigt er den
//   Sprung an** (warn s): er hält an, der Sand brodelt (Wellenmarke: Staubring
//   am Absprung) und an der **Landestelle erscheint eine rote Schattenmarke** – auch beim Pflaume-Ritt gut lesbar. Dann springt er
//   (flight s) im Bogen (height m über dem Sand) jump m weit seine Bahn entlang; mit aim springt er der nächsten Figur in sight m
//   entgegen (Landestelle = ihre Lage in lead s, 0,6 … 1,6 · jump m weit) und schwimmt danach zu seiner Bahn zurück.
// Konter: **im Sprung von oben bespringbar** (Draufspringen/Stampfattacke: Abprall mit Federung, er kippt auf den Rücken und plumpst
//   in den Sand – besiegt), ebenso alle Angriffe im Sprung (Feuer, Tatze, Wurfsichel, Panzer, Wurf, Kanone, Explosion, Stern, Riese,
//   Rutschen). Seitliche Berührung im Sprung verletzt (beim Ritt: Treffer im Sattel). Unter dem Sand unberührbar.
//   star: Stern-Träger (Funkeln an der Flosse); besiegt → der Stern erscheint über ihm und fällt in den Sand (8-2 Stern 1).
// Daten: { kind: 'sandflosser', pos: [x, y, z] (y = Sandoberfläche), path?: [[x, y, z], …] + loop? | center?: [x, y, z] + radius?: 3
//          + cw? | dir?: [dx, dz] + dist?: 6, start?: 0..1 (Startstelle auf der Bahn), speed?: 2.5 (m/s unter dem Sand), every?: 3.2 (s je Sprung), phase?: 0..1,
//          warn?: 0.8 (s Vorwarnung), flight?: 1.2 (s), height?: 2.6 (m), jump?: 5 (m Sprungweite), aim?: false, sight?: 14,
//          lead?: 0.7 (s Vorhalt), star?: true | Index, drop?, id? }
//   Beispiel: { kind: 'sandflosser', pos: [0, 0, -40], dir: [1, 0], dist: 8, every: 3, star: 0 }
// Sandhöhe: im Ritt-Level das Dünennetz (level.river.sample), sonst der Boden unter der Bahn (raycastDown).
// Zustände: swim → warn → jump → land → swim …; (aim) return; defeated (1,2 s). Laufzeit: jumps, apex (Scheitel über dem Sand im
//   letzten Sprung), jumpFrom/jumpTo, marked (Schattenmarke sichtbar), star (Stern-Index | null), info().
// Sound: 'dig' (Ankündigung), 'splash' (Ab-/Eintauchen), 'stomp', 'sand_crumble' (besiegt).

import { EnemyW2, activeFigure, clamp } from '../EnemyW2.js';
import { getModel, hasModel } from '../../models/index.js';
import { sandTop, trackOf, Markers, fallingStar, POWER_HIT, glint } from '../w8help.js';

const LAND = 0.25, DEFEAT = 1.2;

class Sandflosser extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'sandflosser');
    this.half.set(0.55, 0.38, 0.55);
    this.shadow = 0;
    this.wake = 0;
    this.edges = false;
    this.refY = this.pos.y;
    this.speed = spec.speed ?? 2.5;
    this.warnT = spec.warn ?? 0.8;
    this.flightT = spec.flight ?? 1.2;
    this.every = Math.max(this.warnT + this.flightT + LAND + 0.3, spec.every ?? 3.2);
    this.height = spec.height ?? 2.6;
    this.jumpLen = spec.jump ?? 5;
    this.aim = !!spec.aim;
    this.sight = spec.sight ?? 14;
    this.lead = spec.lead ?? 0.7;
    this.star = spec.star === true ? 0 : Number.isFinite(spec.star) ? spec.star : null;
    this.track = trackOf(spec, this.pos, this.dir, 0);
    if (this.track) { this.track.s = this.track.wrap((spec.start ?? 0) * this.track.L); this.track.posAt(this.track.s, this.track.pos); }
    this.home = this.pos.clone();
    this.clock = (((spec.phase ?? 0) % 1) + 1) % 1 * this.every;
    this.jumps = 0;
    this.apex = 0;
    this.jumpFrom = null; this.jumpTo = null;
    this.jump = null;
    this.flying = false;
    this.touch = false;
    this.markers = new Markers(level);
    this.mark = null;
    this.state = 'swim';
    this.placeOnSand();
    this.fallback = false;
    if (level.view) {
      if (hasModel('sandflosser')) this.setModel(getModel('sandflosser'));
      else { this.fallback = true; this.setModel(getModel('glotzfisch', { color: 'gelb' })); this.model.root.scale.setScalar(1.45); }
      this.initShadows(1);
    }
  }

  sandAt(x, z) { return sandTop(this.level, x, z, this.refY, 6); }

  placeOnSand() {
    const t = this.track;
    if (t) { this.pos.x = t.pos.x; this.pos.z = t.pos.z; this.refY = t.pos.y; }
    this.pos.y = this.sandAt(this.pos.x, this.pos.z);
  }

  get swimTime() { return this.every - this.warnT - this.flightT - LAND; }

  update(dt) {
    this.stateT += dt;
    this.markers.update(dt);
    if (this.state === 'defeated') { this.defeatStep(dt); return; }
    if (this.updateDefeat(dt)) return;
    this.clock += dt;
    switch (this.state) {
      case 'swim': {
        if (this.track) {
          const ox = this.pos.x, oz = this.pos.z;
          this.track.advance(this.speed * dt);
          this.placeOnSand();
          this.faceToward(this.pos.x - ox, this.pos.z - oz, dt, 8);
        } else this.pos.y = this.sandAt(this.pos.x, this.pos.z);
        this.trail(dt);
        if (this.clock >= this.swimTime) this.startWarn();
        break;
      }
      case 'return': {
        // nach einem gezielten Sprung zurück zur Bahn (unter dem Sand)
        const t = this.track;
        const tx = t ? t.pos.x : this.home.x, tz = t ? t.pos.z : this.home.z;
        const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
        const s = Math.min(d, this.speed * 1.4 * dt);
        if (d > 1e-3) { this.pos.x += (dx / d) * s; this.pos.z += (dz / d) * s; this.faceToward(dx, dz, dt, 8); }
        this.pos.y = this.sandAt(this.pos.x, this.pos.z);
        this.trail(dt);
        if (d < 0.15) this.setState('swim');
        if (this.clock >= this.swimTime + 1.5) { this.setState('swim'); }
        break;
      }
      case 'warn':
        this.pos.y = this.sandAt(this.pos.x, this.pos.z);
        if (this.jump) this.faceToward(this.jump.bx - this.jump.ax, this.jump.bz - this.jump.az, dt, 10);
        if (Math.floor(this.stateT / 0.16) !== Math.floor((this.stateT - dt) / 0.16)) this.level.effects?.dust(this.pos, 3, 0.7);
        if (this.stateT >= this.warnT) this.startJump();
        break;
      case 'jump': this.jumpStep(dt); break;
      case 'land':
        this.pos.y = this.sandAt(this.pos.x, this.pos.z);
        if (this.stateT >= LAND) { this.clock = 0; this.setState(this.aimed ? 'return' : 'swim'); }
        break;
      default: break;
    }
    if (this.star !== null && !this.defeated && (this.state === 'swim' || this.state === 'warn' || this.state === 'return')) {
      glint(this.level, this, this.pos.x, this.pos.y + 0.9, this.pos.z, dt, 0.5);
    }
  }

  /** Sandspur beim Schwimmen. */
  trail(dt) {
    this.trailT = (this.trailT ?? 0) - dt;
    if (this.trailT > 0) return;
    this.trailT = 0.22;
    const f = this.facing({});
    this.level.effects?.dust({ x: this.pos.x - f.x * 0.6, y: this.pos.y, z: this.pos.z - f.z * 0.6 }, 1, 0.45);
  }

  /** Sprung planen: Absprung hier, Landestelle entlang der Bahn bzw. vor der Figur; Schattenmarke zeigen. */
  startWarn() {
    const ax = this.pos.x, az = this.pos.z, ay = this.pos.y;
    let bx, bz, s1 = null;
    this.aimed = false;
    const p = this.player;
    if (this.aim && activeFigure(p) && Math.hypot(p.pos.x - ax, p.pos.z - az) < this.sight) {
      const tx = p.pos.x + p.vel.x * this.lead, tz = p.pos.z + p.vel.z * this.lead;
      let dx = tx - ax, dz = tz - az;
      const d = Math.hypot(dx, dz) || 1;
      const L = clamp(d, this.jumpLen * 0.6, this.jumpLen * 1.6);
      dx /= d; dz /= d;
      bx = ax + dx * L; bz = az + dz * L;
      this.aimed = true;
    } else if (this.track) {
      const q = this.track.peek(this.jumpLen, {});
      bx = q.x; bz = q.z; s1 = { s: q.s, dir: q.dir };
    } else {
      // ohne Bahn: abwechselnd hin und her um den Startplatz (pos ± dir · jump/2)
      this.side = -(this.side ?? -1);
      bx = this.home.x + this.dir.x * this.jumpLen * 0.5 * this.side; bz = this.home.z + this.dir.z * this.jumpLen * 0.5 * this.side;
    }
    const by = this.sandAt(bx, bz);
    this.jump = { ax, ay, az, bx, by, bz, T: this.flightT, H: this.height, s1 };
    this.jumpFrom = [+ax.toFixed(2), +ay.toFixed(2), +az.toFixed(2)];
    this.jumpTo = [+bx.toFixed(2), +by.toFixed(2), +bz.toFixed(2)];
    this.mark = this.markers.add(bx, by, bz, this.warnT + this.flightT, 1.15);
    this.level.effects?.ring({ x: ax, y: ay + 0.05, z: az }, 1.2);
    this.level.sfx('dig');
    this.setState('warn');
  }

  startJump() {
    this.jumps++;
    this.apex = 0;
    this.touch = true;
    this.flying = true;
    this.setState('jump');
    this.level.sfx('splash');
    this.level.effects?.dust(this.pos, 8, 1.4);
  }

  jumpStep(dt) {
    const j = this.jump;
    const k = clamp(this.stateT / j.T, 0, 1);
    const x = j.ax + (j.bx - j.ax) * k, z = j.az + (j.bz - j.az) * k;
    const base = j.ay + (j.by - j.ay) * k;
    this.pos.set(x, base + 4 * j.H * k * (1 - k), z);
    this.apex = Math.max(this.apex, this.pos.y - Math.max(j.ay, j.by));
    this.yaw = Math.atan2(-(j.bz - j.az), j.bx - j.ax);
    if (k >= 1) {
      this.pos.y = j.by;
      if (j.s1 && this.track) { this.track.s = j.s1.s; this.track.dir = j.s1.dir; this.track.posAt(this.track.s, this.track.pos); }
      this.touch = false;
      this.flying = false;
      this.setState('land');
      this.level.sfx('splash');
      this.level.effects?.dust(this.pos, 8, 1.3);
    }
  }

  get marked() { return !!this.mark && this.markers.list.includes(this.mark); }

  // ------------------------------------------------------------------ Niederlage

  defeat(source, bounce = true) {
    if (this.defeated) return;
    this.markers.clear();
    this.mark = null;
    this.setState('defeated');
    this.touch = false;
    this.flying = false;
    const sx = source?.pos?.x ?? this.pos.x, sz = source?.pos?.z ?? this.pos.z;
    let ax = this.pos.x - sx, az = this.pos.z - sz;
    const l = Math.hypot(ax, az);
    if (l > 1e-3) { ax /= l; az /= l; } else { ax = 0; az = 0; }
    this.vel.set(ax * 1.2, bounce ? 3 : 1, az * 1.2);
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 8);
    if (this.star !== null && !this.starDone) {
      this.starDone = true;
      // Stern erscheint über ihm und fällt in den Sand (im Dünennetz ohne Kollision: auf die Netz-Oberfläche)
      fallingStar(this.level, this.star, this.pos.x, this.pos.y + 1.1, this.pos.z, this.sandAt(this.pos.x, this.pos.z));
    }
    this.markDefeated();
  }

  defeatStep(dt) {
    const sand = this.sandAt(this.pos.x, this.pos.z);
    if (this.pos.y > sand + 1e-3 || this.vel.y > 0) {
      this.vel.y -= 30 * dt;
      this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
      if (this.pos.y <= sand) { this.pos.y = sand; this.vel.set(0, 0, 0); this.level.sfx('sand_crumble'); this.level.effects?.dust(this.pos, 8, 1.2); }
    }
    if (this.stateT >= DEFEAT) this.kill();
  }

  onPlayer(player, contact) {
    if (this.defeated || this.state !== 'jump') return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.defeat(player); return 'none'; }
    if (contact.fromAbove) { this.defeat(player); return 'stomp'; }
    if (contact.dive) { this.defeat(player); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.defeated || this.state !== 'jump') return;
    if (kind === 'bump') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (POWER_HIT.has(kind) || kind === 'slide' || kind === 'pound' || source?.sichel) this.defeat(source, false);
  }

  // ------------------------------------------------------------------ Darstellung

  modelState() {
    const s = this.state;
    if (s === 'defeated') return { anim: 'defeated', progress: Math.min(1, this.stateT / DEFEAT) };
    if (s === 'jump') return { anim: 'jump', progress: clamp(this.stateT / this.jump.T, 0, 1) };
    if (this.fallback) return { anim: s === 'warn' ? 'peek' : 'swim', speed: this.speed };
    return { anim: 'swim', speed: s === 'warn' ? 0.5 : this.speed };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.copy(this.pos);
    r.rotation.y = this.yaw;
    // Ersatzmodell: unter dem Sand versenkt (nur der Rücken schaut heraus)
    if (this.fallback && this.state !== 'jump' && this.state !== 'defeated') r.position.y -= this.state === 'warn' ? 0.35 : 0.5;
    if (this.fallback && this.state === 'defeated') r.position.y -= Math.min(1, this.stateT / DEFEAT) * 0.6;
  }

  render(dt, t) {
    super.render(dt, t);
    this.markers.render(dt);
  }

  dispose() {
    this.markers.clear();
    super.dispose();
  }

  info() {
    return {
      state: this.state, jumps: this.jumps, apex: +this.apex.toFixed(2), defeated: this.defeated, marked: this.marked, star: this.star,
      from: this.jumpFrom, to: this.jumpTo, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = { sandflosser: (level, spec) => new Sandflosser(level, spec) };

