// Welt-4-Gegner der Ruinen und Bergwiesen: Walzenwerfer (+ Stachelwalze), Stachelpanzer, Springklotz.
//
// walzenwerfer – Wurf-Echsling, steht meist auf einer Ruinensäule (pillar m; die Säule ist fest, oben begehbar). Im Takt:
//   idle (interval s) → spit (1,2 s, holt eine Stachelwalze aus dem Maul und stemmt sie hoch) → throw (0,6 s; bei 0,5
//   verlässt die Walze die Hände). Mit aim 'player' dreht er sich zur nächsten Figur in sight m, sonst wirft er in dir.
//   Konter: Draufspringen (Abprall, platt), Stampfattacke, alle Angriffe; seitlich = Treffer. „Walze ausweichen,
//   Walzenwerfer treffen.“
//   Daten: { kind: 'walzenwerfer', pos (Fußpunkt der Säule bzw. des Werfers), pillar?: 0, dir?|yaw?, aim?: 'player' |
//            'dir', sight?: 16, interval?: 2.2, first?: 0.8, walze?: 0.85 (Größe), speed?: 3.5 (Walzentempo), throwSpeed?:
//            4.5, life?: 12, max?: 3 (Walzen gleichzeitig), id?, drop? }
//   Laufzeit: throws, walzen (lebende), stand (Standhöhe), info().
// stachelwalze – rollende Stachelwalze (Ø ≈ size m): rollt in dir, **hangabwärts schneller** (Rampen), lenkt bergab ein,
//   zerbricht an Wänden (Aufprall), in Lava/Giftwasser/Abgrund und nach life s. Jede Berührung verletzt (auch von oben;
//   **Stampfattacke zerstört sie nicht**). Nur Kanonenkugel, Explosion, Riesentrank, Funkelstern zerbrechen sie. Keine
//   Gegnerin (zählt nicht in Arenen), Geschoss.
//   Daten: { kind: 'stachelwalze', pos (Bodenpunkt), dir?, size?: 0.85, speed?: 3.5, vel?: [vx, vy, vz] (fliegt zuerst),
//            life?: 12, owner? (Werfer: dessen Formen ignoriert), id? }
//   Zustände: air → roll → break. Laufzeit: rolled (m), speed(), info().
//
// stachelpanzer – Stachel-Krabbler: läuft/patrouilliert (behavior 'chase': folgt). **Nicht von oben besiegbar**
//   (Stacheln verletzen auch von oben). Besiegt durch Feuer, Wurf, Panzer, Biss, Kanonenkugel, Explosion, Riesentrank,
//   Funkelstern; **Stampfwelle daneben** wirft ihn auf den Rücken (flipped, up s, harmlos) – dann besiegt ihn jede
//   Berührung/jeder Angriff. Krallen, Schwanzhieb, Faust, Rutschen prallen ab (stehend). Seitlich = Treffer.
//   Daten: { kind: 'stachelpanzer', pos, path?, loop?, dir?, speed?: 1.2, behavior?: 'walk' | 'chase', sight?: 6,
//            chaseSpeed?: 1.8, up?: 4, wake?, edges?, drop? }
//
// springklotz – federnder Klotz mit Gesicht als **Sprungfeder**: wer daraufspringt, wird hoch geschleudert (Form mit
//   bounce strength m/s; Stampfattacke ×1,3, Sprung gehalten ×1,15 – Motor). Seitlich stößt er die Figur weg (kein
//   Schaden). hop: hüpft im Takt (every s) vorwärts (Umkehr an Kanten/Wänden). Besiegt durch Feuer, Krallen, Wurf,
//   Panzer, Faust, Biss, Kanonenkugel, Explosion, Riesentrank, Funkelstern.
//   Daten: { kind: 'springklotz', pos, strength?: 18, hop?: false, every?: 1.8, dir?, hopDist?: 1.2, id?, drop? }
//   Laufzeit: launches (Abprall-Zähler), info().

import { EnemyW2, activeFigure, localOffset, toWorld, STRONG, clamp } from '../EnemyW2.js';
import { getModel } from '../../models/index.js';
import { surfaceNormal } from '../../physics/shapes.js';

const SPIT = 1.2, THROW = 0.6;

// =====================================================================================================================
// Walzenwerfer
// =====================================================================================================================

class Walzenwerfer extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'walzenwerfer');
    this.wake = 0;
    this.edges = false;
    this.pillar = Math.max(0, spec.pillar ?? 0);
    this.base = this.pos.clone();
    this.stand = this.pillar > 0.5 ? Math.round(this.pillar * 10) / 10 : 0;
    this.pos.y = this.base.y + this.stand;
    this.half.set(0.45, 0.62, 0.45);
    this.shadow = this.stand > 0 ? 0 : 0.5;
    this.aim = spec.aim ?? 'player';
    this.sight = spec.sight ?? 16;
    this.interval = spec.interval ?? 2.2;
    this.cool = spec.first ?? 0.8;
    this.wsize = spec.walze ?? 0.85;
    this.maxW = spec.max ?? 3;
    this.throws = 0;
    this.walzen = [];
    this.thrown = false;
    this.state = 'idle';
    this.baseYaw = this.yaw;
    if (this.stand > 0) {
      const p = this.base, h = this.stand;
      this.addShape({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + h, p.z + 0.5], tag: 'walzensaeule' });
    }
    let model = null;
    if (level.view) {
      model = this.setModel(getModel('walzenwerfer', { pillar: this.stand, walze: this.wsize }));
      this.initShadows(2);
    }
    // Abwurfpunkt (Hände bei throw 0,5) relativ zum Standpunkt
    const key = `walzenwerfer:${this.stand}:${this.wsize}`;
    const off = localOffset(key, model, { anim: 'throw', progress: 0.5 }, model?.hand ? (o) => model.hand(o) : null, { x: -0.25, y: this.stand + 1.5, z: 0 });
    this.hand = { x: off.x, y: off.y - this.stand, z: off.z };
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'down') {
      // besiegt: platt, dann weg (die Säule bleibt stehen)
      if (this.stateT > 0.7 && !this.gone) {
        this.gone = true;
        if (this.stand > 0) { if (this.model) for (const c of this.model.root.children) if (c !== this.model.root.children[0]) c.visible = false; }
        else this.kill();
      }
      return;
    }
    this.walzen = this.walzen.filter((w) => !w.removed && w.state !== 'break');
    const p = this.player;
    const see = activeFigure(p) && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.sight && Math.abs(p.pos.y - this.pos.y) < 10;
    if (this.aim === 'player' && see && this.state !== 'throw') this.facePlayer(dt, 4);
    switch (this.state) {
      case 'idle':
        if (this.cool > 0) this.cool -= dt;
        if (this.cool <= 0 && (see || this.aim !== 'player') && this.walzen.length < this.maxW) { this.setState('spit'); this.level.sfx('bullet'); }
        break;
      case 'spit':
        if (this.stateT >= SPIT) { this.setState('throw'); this.thrown = false; this.level.sfx('swoop'); }
        break;
      case 'throw':
        if (!this.thrown && this.stateT >= THROW * 0.5) { this.thrown = true; this.release(); }
        if (this.stateT >= THROW) { this.setState('idle'); this.cool = this.interval; }
        break;
      default: break;
    }
  }

  /** Walze an den Händen erzeugen (Unterkante = Handmitte − 0,5·size), fliegt nach vorn. */
  release() {
    const w = toWorld(this.pos, this.yaw, this.hand.x, this.hand.y, this.hand.z, {});
    const fx = Math.cos(this.yaw), fz = -Math.sin(this.yaw);
    const ts = this.spec.throwSpeed ?? 4.5;
    const spec = { pos: [w.x, w.y - 0.5 * this.wsize, w.z], dir: [fx, fz], size: this.wsize, vel: [fx * ts, 3.5, fz * ts], owner: this };
    for (const k of ['speed', 'life']) if (this.spec[k] !== undefined) spec[k] = this.spec[k];
    const e = this.level.spawn('stachelwalze', spec);
    if (e) this.walzen.push(e);
    this.throws++;
  }

  /** Besiegt (Draufspringen, Stampfen, Angriffe): platt, Säule bleibt. */
  defeat(source, fx) {
    if (this.defeated) return;
    this.setState('down');
    this.touch = false;
    this.level.sfx('stomp');
    if (fx) this.level.effects?.sparks(this.center(), 8);
    else this.level.effects?.dust(this.pos, 5);
    this.markDefeated();
  }

  squash() { this.defeat(null, false); }
  flip(source) { this.defeat(source, true); }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    return super.onPlayer(player, contact);
  }

  modelState() {
    const s = this.state;
    if (s === 'spit') return { anim: 'spit', progress: Math.min(1, this.stateT / SPIT) };
    if (s === 'throw') return { anim: 'throw', progress: Math.min(1, this.stateT / THROW) };
    if (s === 'down') return { anim: 'squashed' };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.set(this.base.x, this.base.y, this.base.z);
    r.rotation.y = this.yaw;
  }

  info() { return { state: this.state, throws: this.throws, walzen: this.walzen.length, yaw: +this.yaw.toFixed(2), defeated: this.defeated, stand: this.stand }; }
}

// =====================================================================================================================
// Stachelwalze
// =====================================================================================================================

const _n = { x: 0, y: 1, z: 0 };

class Stachelwalze extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'stachelwalze');
    this.enemy = false;
    this.wake = 0;
    this.edges = false;
    this.size = spec.size ?? 0.85;
    this.speed0 = spec.speed ?? 3.5;
    this.life = spec.life ?? 12;
    this.owner = spec.owner ?? null;
    this.flying = true;
    this.age = 0;
    this.rolled = 0;
    this.rollA = 0;
    this.shadow = 0.45 * this.size;
    this.sizeHull();
    this.state = 'roll';
    this.hv = { x: this.dir.x * this.speed0, z: this.dir.z * this.speed0 };
    if (Array.isArray(spec.vel)) { this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]); this.state = 'air'; this.hv.x = spec.vel[0]; this.hv.z = spec.vel[2]; }
    this._ign = (s) => s.owner === this || (this.owner && s.owner === this.owner);
    if (level.view) this.setModel(getModel('stachelwalze', { size: this.size }));
    this.initShadows(1);
  }

  /** Hülle: Achse quer zur Rollrichtung (Länge ≈ 0,9·size), Durchmesser size. */
  sizeHull() {
    const c = Math.abs(Math.cos(this.yaw)), s = Math.abs(Math.sin(this.yaw));
    const r = 0.45 * this.size, a = 0.45 * this.size;
    this.half.set(c * r + s * a, 0.5 * this.size, s * r + c * a);
  }

  speed() { return Math.hypot(this.hv.x, this.hv.z); }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    if (this.state === 'break') { if (this.stateT >= 0.8) this.kill(); return; }
    if (this.age > this.life) { this.shatter(); return; }
    // Hang: bergab beschleunigen und einlenken
    if (this.grounded && this.ground) {
      surfaceNormal(this.ground, _n);
      const k = Math.hypot(_n.x, _n.z);
      if (k > 0.02) { this.hv.x += _n.x * 16 * dt; this.hv.z += _n.z * 16 * dt; }
      else {
        // auf ebenem Boden: Tempo langsam auf speed0 bringen
        const sp = this.speed();
        if (sp > this.speed0) { const f = Math.max(this.speed0, sp - 1.5 * dt) / sp; this.hv.x *= f; this.hv.z *= f; }
        else if (sp < this.speed0 && sp > 0.1) { const f = Math.min(this.speed0, sp + 2 * dt) / sp; this.hv.x *= f; this.hv.z *= f; }
      }
      const sp = this.speed();
      if (sp > 9) { this.hv.x *= 9 / sp; this.hv.z *= 9 / sp; }
    }
    this.vel.x = this.hv.x; this.vel.z = this.hv.z;
    const c = this.center();
    this.vel.y = Math.max(this.vel.y - 40 * dt, -24);
    if (this.grounded && this.vel.y < -2) this.vel.y = -2;
    const x0 = this.pos.x, z0 = this.pos.z;
    const res = this.level.world.moveAABB(c, this.half, { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt }, { step: 0.3, snap: this.grounded ? 0.3 : 0, ignore: this._ign });
    this.pos.set(c.x, c.y - this.half.y, c.z);
    this.grounded = res.grounded; this.ground = res.ground;
    if (res.grounded && this.vel.y < 0) this.vel.y = 0;
    const moved = Math.hypot(this.pos.x - x0, this.pos.z - z0);
    this.rolled += moved;
    this.rollA += moved / (0.5 * this.size);
    if (this.state === 'air' && res.grounded) { this.state = 'roll'; this.level.sfx('land'); this.level.effects?.dust(this.pos, 4, 1); }
    const sp = this.speed();
    if (sp > 0.2) { this.yaw = Math.atan2(-this.hv.z, this.hv.x); this.sizeHull(); }
    if (res.hitWall && this.stateT > 0.05) { this.shatter(); return; }
    if (this.pos.y < this.level.killY) { this.markDefeated(); this.kill(); return; }
    for (const s of this.level.world.overlapAABB(this.center(), this.half)) {
      if ((s.kill === 'lava' || s.lava || s.kill === 'gift') && this.pos.y < s.top + 0.02) { this.shatter(); return; }
    }
  }

  shatter() {
    if (this.state === 'break') return;
    this.setState('break');
    this.touch = false;
    this.level.sfx('brickbreak');
    this.level.effects?.debris(this.center(), 0x4a4e66, 10);
    this.level.effects?.dust(this.pos, 4, 1.2);
  }

  onPlayer(player, contact) {
    if (this.state === 'break') return 'none';
    if (contact.star) { this.shatter(); return 'none'; }
    return 'hurt';
  }

  onHit(kind) {
    if (this.state === 'break') return;
    if (STRONG.has(kind)) this.shatter();
  }

  modelState() {
    if (this.state === 'break') return { anim: 'break' };
    return { anim: 'roll', roll: this.rollA };
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), speed: +this.speed().toFixed(2), rolled: +this.rolled.toFixed(2), age: +this.age.toFixed(2) }; }
}

// =====================================================================================================================
// Stachelpanzer
// =====================================================================================================================

class Stachelpanzer extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'stachelpanzer');
    this.half.set(0.36, 0.3, 0.36);
    this.shadow = 0.38;
    this.speed = spec.speed ?? 1.2;
    this.behavior = spec.behavior ?? 'walk';
    this.sight = spec.sight ?? 6;
    this.chaseSpeed = spec.chaseSpeed ?? 1.8;
    this.upTime = spec.up ?? 4;
    this.state = 'idle';
    if (level.view) this.setModel(getModel('stachelpanzer'));
    this.initShadows(1);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'gone') { this.vel.x = 0; this.vel.z = 0; this.moveWithGravity(dt); if (this.stateT > 0.85) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'idle':
        this.stand(dt);
        if (!this.level.player || this.playerDist() < this.wake) this.setState('walk');
        break;
      case 'walk':
        this.walk(dt, this.speed);
        if (this.behavior === 'chase' && this.grounded && this.canSee(this.sight)) this.setState('chase');
        break;
      case 'chase':
        this.chase(dt, this.chaseSpeed);
        if (!this.canSee(this.sight * 1.5, 4)) this.setState('walk');
        break;
      case 'back':
        this.stand(dt);
        if (this.stateT >= this.upTime) { this.setState('walk'); this.vel.y = 3; this.grounded = false; }
        break;
      default: break;
    }
  }

  /** Besiegt: auf dem Rücken drehen und schrumpfen (Modell defeated 0,8 s). */
  vanish(source) {
    if (this.defeated) return;
    this.setState('gone');
    this.touch = false;
    this.level.sfx('stomp');
    this.level.effects?.sparks(this.center(), 6);
    this.markDefeated();
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (this.state === 'back') {
      if (contact.fromAbove) { this.vanish(player); return 'stomp'; }
      this.vanish(player);
      return 'none';
    }
    return 'hurt';            // Stacheln: auch von oben
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (this.state === 'back') { this.vanish(source); return; }
    if (kind === 'pound') {
      const above = source?.pos && source.pos.y > this.pos.y + 0.35;
      if (above) { this.vanish(source); return; }      // von oben zertreten (Schlittschuh, Statue)
      if (source?.pos && Math.abs(source.pos.y - this.pos.y) < 0.6) { this.setState('back'); this.vel.x = 0; this.vel.z = 0; this.vel.y = 4; this.grounded = false; this.level.sfx('bounce'); }
      return;
    }
    if (kind === 'claw' || kind === 'punch' || kind === 'slide' || kind === 'bump') {
      this.level.effects?.sparks(this.center(), 3);
      this.level.sfx('blockhit');
      return;
    }
    this.vanish(source);      // Feuer, Wurf, Panzer, Biss, Kanone, Explosion, Riese, Stern, Unbekanntes
  }

  modelState() {
    const s = this.state;
    if (s === 'walk' || s === 'chase') return { anim: 'walk', speed: s === 'chase' ? this.chaseSpeed : this.speed };
    if (s === 'back') return { anim: 'flipped' };
    if (s === 'gone' || s === 'flipped' || s === 'squashed') return { anim: 'defeated' };
    return { anim: 'idle' };
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), defeated: this.defeated }; }
}

// =====================================================================================================================
// Springklotz
// =====================================================================================================================

const SK_TOP = 1.3, SK_W = 0.82, HOP = 0.9;

class Springklotz extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'springklotz');
    this.half.set(SK_W / 2 + 0.04, SK_TOP / 2, SK_W / 2 + 0.04);
    this.shadow = 0.5;
    this.wake = 0;
    this.strength = spec.strength ?? 18;
    this.hop = !!spec.hop;
    this.every = spec.every ?? 1.8;
    this.hopDist = spec.hopDist ?? 1.2;
    this.launches = 0;
    this.squashT = 0;
    this.pushCool = 0;
    this.hopT = this.every * 0.5;
    this.hopping = false;
    this.ground0 = this.pos.y;
    this.state = 'idle';
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: 0, cz: 0 };
    const p = this.pos;
    this.topId = this.addShape({ type: 'box', min: [p.x - SK_W / 2, p.y, p.z - SK_W / 2], max: [p.x + SK_W / 2, p.y + SK_TOP, p.z + SK_W / 2], bounce: this.strength, mover: this.mover, tag: 'springklotz' });
    if (level.view) this.setModel(getModel('springklotz'));
    this.initShadows(2);
  }

  syncShape(dt, x0, y0, z0) {
    const sh = this.level.world.get(this.topId);
    if (!sh) return;
    const p = this.pos, m = this.mover;
    m.dx = p.x - x0; m.dy = p.y - y0; m.dz = p.z - z0;
    const k = dt > 0 ? 1 / dt : 0;
    m.vx = m.dx * k; m.vy = m.dy * k; m.vz = m.dz * k;
    sh.min = [p.x - SK_W / 2, p.y, p.z - SK_W / 2];
    sh.max = [p.x + SK_W / 2, p.y + SK_TOP, p.z + SK_W / 2];
    this.level.world.update(this.topId);
  }

  update(dt) {
    this.stateT += dt;
    if (this.squashT > 0) this.squashT -= dt;
    if (this.pushCool > 0) this.pushCool -= dt;
    if (this.updateDefeat(dt)) return;
    const x0 = this.pos.x, y0 = this.pos.y, z0 = this.pos.z;
    if (this.hop) {
      this.hopT += dt;
      if (!this.hopping && this.hopT >= this.every) { this.hopping = true; this.hopT = 0; }
      if (this.hopping) {
        const p = this.hopT / HOP;
        if (p >= 0.4 && p < 0.85) {
          // Flug: Parabel 0,6 m hoch, vorwärts hopDist
          const k = (p - 0.4) / 0.45;
          if (this.edges && !this.groundAhead(this.dir.x, this.dir.z, 0.2, 1.1) && k < 0.1) this.turn();
          const sp = this.hopDist / (0.45 * HOP);
          this.vel.x = this.dir.x * sp; this.vel.z = this.dir.z * sp;
          const res = this.moveWithGravity(dt);
          if (res.hitWall) this.turn(res);
        } else this.stand(dt);
        if (p >= 1) { this.hopping = false; this.hopT = 0; }
        this.faceToward(this.dir.x, this.dir.z, dt, 8);
        if (p >= 0.4 && p < 0.42 && this.grounded) { this.vel.y = 5.5; this.grounded = false; }
      } else this.stand(dt);
    } else this.stand(dt);
    if (this.removed) return;
    this.syncShape(dt, x0, y0, z0);
  }

  /** Motor (Player.land) meldet den Abprall von der Feder-Oberseite. */
  onBounce() {
    this.launches++;
    this.squashT = 0.25;
    this.level.effects?.ring({ x: this.pos.x, y: this.pos.y + SK_TOP, z: this.pos.z }, 0.8);
  }

  onPlayer(player, contact) {
    if (this.defeated) return 'none';
    if (contact.fromAbove || player.pos.y >= this.pos.y + SK_TOP - 0.15) return 'none';   // Feder (Motor)
    // seitlich: wegstoßen ohne Schaden
    if (this.pushCool <= 0 && typeof player.knockback === 'function' && !player.invulnerable) {
      this.pushCool = 0.5;
      player.knockback({ pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z } });
      this.squashT = 0.15;
    }
    return 'none';
  }

  onHit(kind, source) {
    if (this.defeated) return;
    if (kind === 'pound' || kind === 'bump' || kind === 'slide') return;
    this.flip(source, 7);
    this.removeShapes();
    this.topId = null;
  }

  modelState() {
    if (this.squashT > 0) return { anim: 'squash' };
    if (this.hopping) return { anim: 'hop', progress: clamp(this.hopT / HOP, 0, 1) };
    return { anim: 'idle' };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.rotation.z = this.state === 'flipped' ? Math.PI * 0.6 : 0;
  }

  info() { return { state: this.state, launches: this.launches, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), hopping: this.hopping, defeated: this.defeated }; }
}

export const KINDS = {
  walzenwerfer: (level, spec) => new Walzenwerfer(level, spec),
  stachelwalze: (level, spec) => new Stachelwalze(level, spec),
  stachelpanzer: (level, spec) => new Stachelpanzer(level, spec),
  springklotz: (level, spec) => new Springklotz(level, spec),
};

