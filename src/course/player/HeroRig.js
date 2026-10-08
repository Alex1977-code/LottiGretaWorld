// HeroRig: bindet den vorhandenen HeroAvatar (src/three/avatars/hero.js) an die Kurs-Spielfigur.
//
// Statt eines Phaser-Sprites bekommt der Avatar einen Stellvertreter (`proxy`) mit den Feldern, die er
// liest. Aufbau der Szene:
//   hull  (Position = Fußpunkt, Gier aus der Blickrichtung, Maßstab 1,5 Avatar-Einheiten → 1,0 m / 0,7 m)
//   └ flip  (Drehpunkt in Körpermitte – Saltos/Stampfen/Sturzflug, nur im Rückfall ohne setCourseMode)
//     └ avatar.root
//
// Je Bild: proxy.course = { state, speed, vy, grounded, phase, power, big, holding, climbing } füllen,
// dann avatar.animate(dt, t). Solange der Avatar `setCourseMode` nicht kennt (Rückfall), werden zusätzlich
// die alten Sprite-Felder gesetzt: body.velocity (px/s: x = Tempo·16, y = −vy·16), moveState, onGround,
// flipX = false – und die Facing-Drehung des Avatars (3/4-Ansicht zur Seitenkamera) wird an avatar.root
// ausgeglichen, damit die Figur genau in Laufrichtung blickt. Mit setCourseMode(true) übernimmt der
// Avatar Posen (inkl. Saltos über `phase`) selbst; HeroRig setzt dann nur hull.

import * as THREE from 'three';
import { createAvatar } from '../../three/avatars/index.js';

const AVATAR_H = 1.5;          // Höhe der Heldin in Avatar-Einheiten
const PX = 16;                 // Avatar-Rückfall: Weltpixel je Einheit
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

/** Zustand der Spielfigur → Avatar-Zustand (Vertrag); interne Zustände werden abgebildet. */
const STATE_MAP = { dive: 'longjump' };

export class HeroRig {
  /**
   * @param {{three: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer}} view
   * @param {import('./Player.js').Player} player
   */
  constructor(view, player) {
    this.view = view;
    this.player = player;
    this.hull = new THREE.Group();
    this.hull.name = 'heldin';
    this.flip = new THREE.Group();
    this.flip.position.y = AVATAR_H / 2;
    this.hull.add(this.flip);
    view.three.add(this.hull);
    this.proxy = {
      texture: { key: 'lotti' }, key: 'lotti',
      x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true,
      flipX: false, body: { velocity: { x: 0, y: 0 } }, moveState: 'ground', onGround: true,
      mount: null, leaf: { visible: false }, swooping: false, dead: false, locked: false,
      course: { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: null, climbing: false },
    };
    this.avatar = null;
    this.key = null;
    this.yaw = player.yaw;
    this.scale = (player.big ? 1 : 0.7) / AVATAR_H;
    this.squash = 0; this.squashV = 0;
    this.lastState = null;
    this.build(player.hero);
  }

  /** Avatar (neu) erzeugen – auch beim Figurwechsel Lotti ↔ Greta zur Laufzeit. */
  build(key) {
    if (this.avatar) { this.flip.remove(this.avatar.root); this.avatar.dispose(); this.avatar = null; }
    this.key = key;
    this.proxy.texture.key = key;
    this.proxy.key = key;
    let av = null;
    try { av = createAvatar(this.view, this.proxy); } catch (err) { console.error('Heldin-Avatar fehlgeschlagen:', err); }
    if (!av) return;
    this.courseMode = typeof av.setCourseMode === 'function';
    av.setCourseMode?.(true);
    av.root.position.set(0, -AVATAR_H / 2, 0);
    this.flip.add(av.root);
    this.avatar = av;
  }

  update(dt, t) {
    const p = this.player;
    if (p.hero !== this.key) this.build(p.hero);
    const av = this.avatar;
    this.hull.position.copy(p.pos);
    // Blickrichtung weich nachführen (Simulation dreht in Stufen von 1/120 s)
    // Wandrutschen: der Spieler blickt in der Simulation zur Wand; die Kurs-Pose des Avatars hat die Wand
    // hinter sich (−X) und blickt von ihr weg – deshalb im Kurs-Modus um 180° gedreht darstellen.
    const targetYaw = p.yaw + (this.courseMode && p.state === 'wallslide' ? Math.PI : 0);
    this.yaw += wrap(targetYaw - this.yaw) * (1 - Math.exp(-28 * dt));
    this.hull.rotation.y = this.yaw;
    // Größe (Klein/Groß, Riesentrank) weich, Squash & Stretch bei Landung/Absprung
    const target = ((p.big ? 1 : 0.7) / AVATAR_H) * (p.powerDef.scale ?? 1);
    this.scale = damp(this.scale, target, 10, dt);
    if (p.state !== this.lastState) {
      if (p.state === 'land') this.squashV -= p.poundLanded ? 6 : 3.5;
      else if (['jump', 'jump2', 'jump3', 'walljump', 'longjump', 'backflip', 'sideflip'].includes(p.state)) this.squashV += 3;
      this.lastState = p.state;
    }
    this.squashV += (-90 * this.squash - 12 * this.squashV) * dt;
    this.squash += this.squashV * dt;
    const sq = Math.max(-0.35, Math.min(0.35, this.squash));
    let sy = 1 + sq, sxz = 1 - sq * 0.5;
    if (p.state === 'crouch' || (p.state === 'slide' && !this.courseMode)) { sy *= 0.72; sxz *= 1.08; }
    this.hull.scale.set(this.scale * sxz, this.scale * sy, this.scale * sxz);
    // Blinken bei Unverwundbarkeit, unsichtbar in der Röhre (Teleport) und nach dem Absturz
    const blink = p.invuln > 0 && !p.powerDef.invulnerable && Math.floor(t * 16) % 2 === 0;
    this.hull.visible = !blink && !(p.dead && p.deathCause === 'fall' && p.script?.t > 0.3);
    if (!av) return;

    // Stellvertreter füllen
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const grounded = p.mode === 'ground';
    const c = this.proxy.course;
    // Tatzenhieb und Wurf sind kurze Aktionen über dem Bewegungszustand (Präzisierung Gegner/Power-ups)
    c.state = p.throwTime > 0 && !p.dead ? 'throw' : p.clawTime > 0 && p.state !== 'dive' && !p.dead ? 'claw' : STATE_MAP[p.state] ?? p.state;
    c.speed = p.mode === 'stalk' || p.mode === 'wall' ? 0 : speed;
    c.vy = p.vel.y;
    c.grounded = grounded;
    c.phase = p.phase;
    c.power = p.power;
    c.big = p.big;
    c.holding = p.holding;
    c.climbing = p.climbing;
    const pr = this.proxy;
    pr.dead = p.dead;
    pr.flipX = false;
    pr.onGround = grounded || p.mode === 'stalk' || p.mode === 'wall';
    pr.moveState = pr.onGround ? 'ground' : 'air';
    pr.body.velocity.x = (pr.onGround && (p.state === 'idle' || p.state === 'crouch' || p.state === 'land') ? 0 : speed) * PX;
    pr.body.velocity.y = -p.vel.y * PX;
    if (p.mode === 'stalk' || p.mode === 'wall') { pr.body.velocity.x = Math.abs(p.vel.y) * PX; pr.body.velocity.y = 0; }
    if (p.mode === 'swim') { pr.moveState = 'glide'; pr.onGround = false; }

    if (!this.courseMode) this.applyFallbackPose(p, dt);
    try { av.animate(dt, t); } catch (err) { console.error('Avatar-Animation fehlgeschlagen:', err); this.avatar = null; return; }
    // Rückfall: Facing-Drehung des Avatars (3/4-Ansicht) ausgleichen → Blick genau in Laufrichtung
    if (!this.courseMode) av.root.rotation.y = -av.model.rotation.y;
  }

  /** Saltos, Stampfen, Sturzflug, Schwimmlage als Drehung der flip-Gruppe (Avatar blickt nach +X). */
  applyFallbackPose(p, dt) {
    const ph = p.phase;
    let rz = 0, rx = 0;
    switch (p.state) {
      case 'backflip': rz = TAU * ph; break;                       // Kopf nach hinten über
      case 'jump3': rz = -TAU * ph; break;                         // Vorwärtssalto
      case 'sideflip': rx = -TAU * ph; break;                      // seitlich über
      case 'groundpound': rz = p.poundPhase === 'spin' ? -TAU * ph : 0; break;
      case 'dive': case 'longjump': rz = -1.15; break;             // waagerecht nach vorn
      case 'swim': rz = Math.hypot(p.vel.x, p.vel.z) > 1 ? -1.2 : -0.3; break;
      case 'slide': rz = 0.35; break;
      default: break;
    }
    const fl = this.flip.rotation;
    // Saltos direkt (Phase ist schon weich), Haltungen weich
    if (p.state === 'backflip' || p.state === 'jump3' || p.state === 'sideflip' || (p.state === 'groundpound' && p.poundPhase === 'spin')) { fl.z = rz; fl.x = rx; }
    else { fl.z = damp(wrap(fl.z), rz, 14, dt); fl.x = damp(wrap(fl.x), rx, 14, dt); }
  }

  dispose() {
    if (this.avatar) this.avatar.dispose();
    this.avatar = null;
    this.hull.parent?.remove(this.hull);
  }
}
