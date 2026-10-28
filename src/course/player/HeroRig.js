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
//
// Ergänzungen (Präzisierung Motor Welt 2):
//  - new HeroRig(view, player, { lite }) – `lite` für Spiegelfrucht-Klone: kein Sonnen-Schattenwurf (der Blob bleibt),
//    vereinfachte Zöpfe (Lotti: je Zopf nur das obere Glied), ohne Augen-Glanzpunkte → ≈ 15 statt ≈ 34 Zeichenaufrufe.
//    Für alle Figuren: der geschlossene (auf ~0 skalierte) Mund wird ausgeblendet (spart einen Aufruf).
//    setLite(on) schaltet um (wird ein Klon zur Haupt-Figur, bekommt er die volle Darstellung).
//  - player.hidden blendet die Figur aus (reist unsichtbar mit der Haupt-Figur durch eine Röhre).
//  - Trage-Helm: player.helmet → Modell aus helmetModel() (Registry 'helm_…' oder Rückfall) als Kind am Kopf des
//    Avatars (avatar.head, Kopf-Oberseite ≈ 0,58 Einheiten über dem Halsgelenk; ohne Kopf-Objekt an der Hülle in
//    Kopfhöhe), Maßstab 1,5 (Meter → Avatar-Einheiten, wächst mit Klein/Groß/Riesentrank). Je Bild
//    model.update(dt, helmDef.state(player)). Licht-Helm: halbdurchsichtiger Lichtkegel (7 m) vor dem Kopf.
//
// Ergänzungen (Präzisierung Motor Welt 3) – neue Werte von proxy.course.state (Avatar fällt ohne Pose auf Bestehendes
// zurück): 'tailswipe' (Schwanzhieb, phase 0..1), 'glide' (Gleiten), 'statue' (Statue, phase = Anteil der Höchstdauer),
// 'fence' (am Kettenzaun; proxy.course.fenceMove = { x, y } −1..1, fencePunch 0..1 während des Faustschlags),
// 'skate' (auf dem Schlittschuh am Boden; proxy.course.speed = Tempo, proxy.course.skates = true auch in der Luft),
// 'swimUnder' (getaucht); proxy.course.power = 'gleitblatt' mit dem Gleitblatt. Mit Schlittschuh steht die Hülle
// SKATE_LIFT m höher (Kufen; das Schlittschuh-Modell zeichnet die Entität an den Füßen).
//
// Ergänzungen (Präzisierung Motor und Bausteine Welt 5) – neue Werte von proxy.course.state:
//   'trapeze'  hängt am Trapez (Hände an der Stange über dem Kopf, Körper hängt am Seil): die Hülle wird um die Querachse
//              der Blickrichtung um player.swingTilt (rad, + = Füße schwingen nach vorn) geneigt – Drehpunkt ist der
//              Fußpunkt der Hülle; die Simulation legt ihn entlang des Seils unter die Stange, so liegen die Hände an
//              der Stange; proxy.course.swing = Seilwinkel
//              (rad, + = nach vorn), swingVel (rad/s), phase = Anteil der Ausschlagsgrenze (0..1).
//   'cannon'   Flug aus der Röhrenkanone (gestreckt wie ein Geschoss, Arme vorn); phase = Flugfortschritt 0..1. Während
//              die Figur in der Röhre steckt, ist sie unsichtbar (player.hidden).
//
// Ergänzungen (Präzisierung Motor und Bausteine Welt 6) – neuer Wert von proxy.course.state:
//   'hang'     hängt unter einem Deckengitter (Hände über dem Kopf am Gitter, 0,2 m über dem Scheitel wie am Trapez) und
//              hangelt; proxy.course.hangMove = { x, y } (−1..1 Stick: x = rechts, y = vor), speed = Hangeltempo m/s.
//              Solange der Avatar die Pose nicht anbietet (avatar.courseStates?.has('hang')), zeigt HeroRig ersatzweise
//              'trapeze' (gleiche Handhöhe, Seilwinkel 0). proxy.course.hangGrid = Deckengitter ({ x0, x1, z0, z1, y }, sonst
//              null) – der HeroAvatar hält die Griffe damit im Gitter (am Rand).
//   Die Pilz-Maske ist ein Trage-Helm (player.helmet = 'maske'): Modell wie die anderen Helme am Kopf.
//
// Ergänzung (Präzisierung Figuren Welt 7): proxy.course.sichelFlying / sichelReady / sichelCatch = player.sichelFlying (0 =
// Wurfsichel in der Hand) / sichelReady / sichelCatch (Zähler, Wechsel = Fang-Geste) für das Wurfsichel-Kostüm.

import * as THREE from 'three';
import { createAvatar } from '../../three/avatars/index.js';
import { helmetModel, getHelmet, LIGHT } from './helmets.js';
import { hasModel } from '../models/index.js';

const AVATAR_H = 1.5;          // Höhe der Heldin in Avatar-Einheiten
const PX = 16;                 // Avatar-Rückfall: Weltpixel je Einheit
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
const damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));

const RIDING = { hovering: false };
const SKATE_LIFT = 0.1;        // m: Figur steht auf den Kufen
const HELMET_K = 0.9;          // Helm-Modell (Meter) etwas kleiner als Kopfbreite × 1,25

/** Zustand der Spielfigur → Avatar-Zustand (Vertrag); interne Zustände werden abgebildet. */
const STATE_MAP = { dive: 'longjump' };
/** Welt 6: neue Zustände mit Ersatz-Pose, solange der Avatar sie nicht kennt (avatar.courseStates). */
const FALLBACK_W6 = { hang: 'trapeze' };

export class HeroRig {
  /**
   * @param {{three: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer}} view
   * @param {import('./Player.js').Player} player
   */
  constructor(view, player, opts = {}) {
    this.view = view;
    this.player = player;
    this.lite = !!opts.lite;
    this.helmetKind = null;
    this.helmet = null;      // { root, update, dispose } am Kopf
    this.cone = null;        // Lichtkegel (Licht-Helm)
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
      course: { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: null, climbing: false,
        fenceMove: { x: 0, y: 0 }, fencePunch: 0, skates: false },
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
    this.detachHelmet();
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
    this.applyLite();
  }

  // ------------------------------------------------------------------ Klon-Darstellung (lite)

  setLite(on) {
    on = !!on;
    if (on === this.lite) return;
    this.lite = on;
    this.applyLite();
  }

  /** lite: kein Schattenwurf, Zöpfe nur mit dem oberen Glied; sonst Ausgangszustand. */
  applyLite() {
    const av = this.avatar;
    if (!av) return;
    av.root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.cs0 === undefined) o.userData.cs0 = o.castShadow;
      o.castShadow = this.lite ? false : o.userData.cs0;
    });
    for (const b of av.braids ?? []) b.links?.forEach((l, k) => { if (k > 0 && l) l.visible = !this.lite; });
    if (av.eyeHl) av.eyeHl.visible = !this.lite;   // winzige Augen-Glanzpunkte (aus der Kurskamera kaum sichtbar)
    if (this.helmet) this.helmet.root.traverse((o) => { if (o.isMesh) { if (o.userData.cs0 === undefined) o.userData.cs0 = o.castShadow; o.castShadow = this.lite ? false : o.userData.cs0; } });
  }

  // ------------------------------------------------------------------ Trage-Helm

  /** Helm-Modell an den Kopf (bzw. in Kopfhöhe an die Hülle) hängen; kind null = abnehmen. */
  setHelmet(kind) {
    this.detachHelmet();
    this.helmetKind = kind ?? null;
    if (!kind) return;
    let m = null;
    try { m = helmetModel(kind); } catch (err) { console.error('Helm-Modell fehlgeschlagen:', err); }
    if (!m) return;
    const head = this.avatar?.head;
    // Avatar-Einheiten: Kopfmitte 0,28 über dem Halsgelenk, Radius 0,30 → Helm-Unterkante knapp unter dem Scheitel
    if (head) { m.root.position.set(0.02, 0.44, 0); head.add(m.root); }
    else { m.root.position.set(0, 0.62, 0); this.flip.add(m.root); }
    m.root.scale.setScalar(AVATAR_H * HELMET_K);
    this.helmet = m;
    this.applyLite();
  }

  detachHelmet() {
    if (!this.helmet) return;
    this.helmet.root.parent?.remove(this.helmet.root);
    this.helmet.dispose?.();
    this.helmet = null;
  }

  /** Lichtkegel des Licht-Helms (Weltobjekt, folgt dem Kopf). */
  updateCone(p, on) {
    if (!on) { if (this.cone) this.cone.visible = false; return; }
    if (!this.cone) {
      const len = LIGHT.range, r = len * LIGHT.tan;
      const geo = new THREE.ConeGeometry(r, len, 24, 1, true);
      geo.translate(0, -len / 2, 0);       // Spitze im Ursprung, öffnet nach −Y …
      geo.rotateZ(Math.PI / 2);            // … gedreht: öffnet nach +X (Blickrichtung)
      // Das Registry-Modell helm_licht hat selbst einen kurzen Kegel (2,6 m) – dann den langen etwas zarter
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: hasModel('helm_licht') ? 0.1 : 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
      this.cone = new THREE.Mesh(geo, mat);
      this.cone.name = 'lichtkegel';
      this.cone.renderOrder = 3;
      this.cone.castShadow = false;
      this.view.three.add(this.cone);
    }
    const c = this.cone;
    c.visible = this.hull.visible;
    const hy = p.pos.y + p.half.y * 2 * 0.92 * (p.powerDef.scale ?? 1);
    c.position.set(p.pos.x, hy, p.pos.z);
    c.rotation.set(0, this.yaw, -LIGHT.pitch, 'YXZ');
  }

  update(dt, t) {
    const p = this.player;
    if (p.hero !== this.key) { this.build(p.hero); this.helmetKind = null; }
    const av = this.avatar;
    this.hull.position.copy(p.pos);
    if (p.skate) this.hull.position.y += SKATE_LIFT * (p.big ? 1 : 0.7);
    // Blickrichtung weich nachführen (Simulation dreht in Stufen von 1/120 s)
    // Wandrutschen: der Spieler blickt in der Simulation zur Wand; die Kurs-Pose des Avatars hat die Wand
    // hinter sich (−X) und blickt von ihr weg – deshalb im Kurs-Modus um 180° gedreht darstellen.
    const targetYaw = p.yaw + (this.courseMode && p.state === 'wallslide' ? Math.PI : 0);
    this.yaw += wrap(targetYaw - this.yaw) * (1 - Math.exp(-28 * dt));
    this.hull.rotation.y = this.yaw;
    // Welt 5: Trapez – Körper hängt entlang des Seils (Euler XYZ: Neigung im lokalen Rahmen, dann Gier)
    this.tilt = p.state === 'trapeze' ? (p.swingTilt ?? 0) : damp(this.tilt ?? 0, 0, 10, dt);
    this.hull.rotation.z = Math.abs(this.tilt) < 1e-4 ? 0 : this.tilt;
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
    // Ausgeschwungen → genau 0: eine Rest-Stauchung (< 0,2 %, unsichtbar) machte die Hülle sekundenlang ungleichmäßig skaliert,
    // dann zerfiel das Figur-Bündel (view/ShadowProxy.js) in Einzelaufrufe (z. B. 18 statt 9 im Kanonenflug nach der Landung
    // auf der Röhre)
    if (Math.abs(this.squash) < 2e-3 && Math.abs(this.squashV) < 2e-2) { this.squash = 0; this.squashV = 0; }
    const sq = Math.max(-0.35, Math.min(0.35, this.squash));
    let sy = 1 + sq, sxz = 1 - sq * 0.5;
    if (p.state === 'crouch' || (p.state === 'slide' && !this.courseMode)) { sy *= 0.72; sxz *= 1.08; }
    this.hull.scale.set(this.scale * sxz, this.scale * sy, this.scale * sxz);
    // Blinken bei Unverwundbarkeit, unsichtbar in der Röhre (Teleport) und nach dem Absturz
    const blink = p.invuln > 0 && !p.powerDef.invulnerable && Math.floor(t * 16) % 2 === 0;
    this.hull.visible = !blink && !p.hidden && !(p.dead && p.deathCause === 'fall' && p.script?.t > 0.3);
    // Trage-Helm (Präzisierung Motor Welt 2)
    if ((p.helmet ?? null) !== this.helmetKind && av) this.setHelmet(p.helmet ?? null);
    if (this.helmet) this.helmet.update?.(dt, getHelmet(this.helmetKind)?.state?.(p) ?? {});
    this.updateCone(p, this.helmetKind === 'licht' && !p.dead);
    if (!av) return;

    // Stellvertreter füllen
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const grounded = p.mode === 'ground';
    const c = this.proxy.course;
    // Tatzenhieb und Wurf sind kurze Aktionen über dem Bewegungszustand (Präzisierung Gegner/Power-ups)
    // Welt 3: Schwanzhieb (Gleitblatt) wie der Tatzenhieb über dem Bewegungszustand; Statue/Zaun/Schlittschuh/getaucht
    // kommen als Player.state ('statue', 'fence', 'skate', 'swimUnder', 'glide')
    c.state = p.throwTime > 0 && !p.dead ? 'throw'
      : p.tailTime > 0 && !p.dead && p.mode !== 'script' ? 'tailswipe'
      : p.clawTime > 0 && p.state !== 'dive' && !p.dead ? 'claw' : STATE_MAP[p.state] ?? p.state;
    if (FALLBACK_W6[c.state] && !av.courseStates?.has?.(c.state)) c.state = FALLBACK_W6[c.state];
    c.speed = p.mode === 'stalk' || (p.mode === 'wall' && !p.fence && !p.hang) ? 0 : speed;
    c.vy = p.vel.y;
    c.grounded = grounded;
    // Wurf/Tatzenhieb: Fortschritt 0..1 aus der Restzeit (jeder neue Wurf beginnt von vorn)
    c.phase = c.state === 'throw' ? Math.min(1, Math.max(0.01, 1 - p.throwTime / (p.throwDur || 0.25)))
      : c.state === 'claw' ? Math.min(1, Math.max(0.01, 1 - p.clawTime / 0.3))
      : c.state === 'tailswipe' ? Math.min(1, Math.max(0.01, 1 - p.tailTime / (p.tailDur || 0.32))) : p.phase;
    c.fenceMove.x = p.fence ? p.fenceMove.x : 0;
    c.fenceMove.y = p.fence ? p.fenceMove.y : 0;
    c.fencePunch = p.fence && p.punchTime > 0 ? Math.min(1, Math.max(0.01, 1 - p.punchTime / 0.28)) : 0;
    c.skates = !!p.skate;
    c.hangMove ??= { x: 0, y: 0 };
    c.hangMove.x = p.hang ? p.hangMove.x : 0;
    c.hangMove.y = p.hang ? p.hangMove.y : 0;
    c.hangGrid = p.hang?.obj ?? null;   // Figuren Welt 6: Rechteck des Deckengitters (Griffe bleiben im Gitter)
    c.swing = p.state === 'trapeze' ? (p.swingTilt ?? 0) : 0;
    c.swingVel = p.state === 'trapeze' ? (p.swingVel ?? 0) : 0;
    c.power = p.power;
    // Figuren Welt 7: Wurfsichel – Sicheln in der Luft (0 = in der Hand), Wurf möglich, Fang-Zähler (Wechsel = Fang-Geste)
    c.sichelFlying = p.sichelFlying ?? 0;
    c.sichelReady = p.sichelReady ?? true;
    c.sichelCatch = p.sichelCatch ?? 0;
    c.big = p.big;
    // Avatar-Vertrag: holding = false | 'front' | 'over' (Haltestil der getragenen Entität, Standard über dem Kopf)
    c.holding = p.holding ? (p.holding.holdStyle ?? 'over') : false;
    c.climbing = p.climbing;
    const pr = this.proxy;
    pr.dead = p.dead;
    pr.mount = p.mode === 'mount' ? (p.mountObj?.avatarMount ?? RIDING) : null; // Reitpose (Fluss-Floß mit Pflaume)
    pr.flipX = false;
    pr.onGround = grounded || p.mode === 'stalk' || p.mode === 'wall';
    pr.moveState = pr.onGround ? 'ground' : 'air';
    pr.body.velocity.x = (pr.onGround && (p.state === 'idle' || p.state === 'crouch' || p.state === 'land') ? 0 : speed) * PX;
    pr.body.velocity.y = -p.vel.y * PX;
    if (p.mode === 'stalk' || p.mode === 'wall') { pr.body.velocity.x = Math.abs(p.vel.y) * PX; pr.body.velocity.y = 0; }
    if (p.mode === 'swim') { pr.moveState = 'glide'; pr.onGround = false; }

    if (!this.courseMode) this.applyFallbackPose(p, dt);
    try { av.animate(dt, t); } catch (err) { console.error('Avatar-Animation fehlgeschlagen:', err); this.avatar = null; return; }
    // Geschlossener Mund ist auf ~0 skaliert, kostet aber einen Zeichenaufruf → dann ausblenden
    if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004;
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
      case 'swimUnder': rz = -1.2; break;
      case 'slide': rz = 0.35; break;
      default: break;
    }
    const fl = this.flip.rotation;
    // Saltos direkt (Phase ist schon weich), Haltungen weich
    if (p.state === 'backflip' || p.state === 'jump3' || p.state === 'sideflip' || (p.state === 'groundpound' && p.poundPhase === 'spin')) { fl.z = rz; fl.x = rx; }
    else { fl.z = damp(wrap(fl.z), rz, 14, dt); fl.x = damp(wrap(fl.x), rx, 14, dt); }
  }

  dispose() {
    this.detachHelmet();
    if (this.cone) { this.cone.parent?.remove(this.cone); this.cone.geometry.dispose(); this.cone.material.dispose(); this.cone = null; }
    if (this.avatar) this.avatar.dispose();
    this.avatar = null;
    this.hull.parent?.remove(this.hull);
  }
}
