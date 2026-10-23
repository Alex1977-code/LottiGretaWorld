// Gimmick-Entitäten Welt 3 (Kurs-Modus): Schienen, Spukhaus, Lagune, Himmel. Alle auch als `type` in LEVEL.segments
// verwendbar (blocks/types/w3_misc.js). Aktionen (onPress, onOpen, onTrick, onBreak, onFull, reward …) im Format von
// entities/gimmick.js ({ reveal, spawn, star, power, coins, water … }).
//
// schaltblock – Schaltblock 1 m (3-7): Kopfstoß (oder Stampfen) kehrt die Fahrtrichtung aller Schienen des Netzes um.
//   { kind: 'schaltblock', pos (Mitte der Unterseite), net: 'n1' | ['n1', 'n2'], id }   Laufzeit: hits
//
// buecherregal – verschiebbares Bücherregal (3-3): Hineinlaufen schiebt es entlang `slide` (1,8 m/s) – sofort über die
//   Schiebe-Schnittstelle des Motors (Wandform-Besitzer mit onPush(player, dir, speed)), danach hält die eigene Anlage-
//   Erkennung (Stick gegen die Seite, ≈ 0,15 s) das Schieben; Angriffe (Tatze, Feuer, Panzer, Stampfwelle, Bombe, Riesentrank, Kanone) stoßen es 1 m weiter.
//   Erreicht es das Ende seines Wegs, löst es einmal `onOpen` aus (z. B. Stern dahinter).
//   { kind: 'buecherregal', pos (Mitte der Unterseite), yaw: −π/2 (Bücher zur Kamera +Z; 90°-Raster), width: 2,
//     height: 2.8, slide: [1, 0] (erlaubte Schieberichtung, Welt-xz; beide Richtungen), range: [0, 2] (m entlang
//     slide, Start 0), speed: 1.8, onOpen: Aktion, id }   Laufzeit: off (m), moving, opened, pushes (onPush-Meldungen)
//
// bilderrahmen – Spuk-Gemälde (3-3), das eine Wandnische verdeckt; in der Nische liegt eine Warp-Box (oder Belohnung):
//   Angriff (Tatze, Feuer …), Hineinspringen (Figur in der Luft berührt das Bild = Kopfstoß) oder Signal { open: id }
//   klappt es zur Seite auf; dann ist die Nische offen und die Warp-Box erscheint. Solange es zu ist, versperrt das Bild
//   die Nische (fest). Der Level baut die Wand mit einer Lücke (≥ Bildbreite) und eine Rückwand dahinter.
//   { kind: 'bilderrahmen', pos (Mitte der Unterkante des Rahmens in der Wandebene), yaw: −π/2 (Bild zur Kamera),
//     size: [1.4, 1.8], motif: 'spuk'|'portraet'|'landschaft', watch: true (Augen folgen), solid: true,
//     warp: { id, target, style: 'warp'|'mystery', pos (Standard: 1 m hinter der Bildebene auf `floor`) },
//     floor: pos.y (Boden der Nische), content: Aktion (statt/zusätzlich zur Warp-Box), id }
//   Laufzeit: opened, openK (0..1), warp (Entität)
//
// zielmast_spuk – falscher Zielmast (3-3): sieht aus wie der Zielmast; Berührung → „Reingelegt!“, Fahne zeigt ein
//   Spukgesicht, ein Spuk erscheint (spawn), der Mast verblasst (1,2 s) und ist weg.
//   { kind: 'zielmast_spuk', pos (Fußpunkt des Sockels), height: 6, text: 'Reingelegt!',
//     spawn: { kind: 'spuk', … } (Standard: Spuk, falls es die Art gibt; false = keiner), onTrick: Aktion, id }
//   Laufzeit: tricked, t
//
// spuk_tuer – Flügeltür des Spukhauses (2,2 × 3,0 m, Modell 'spuk_tuer') mit Durchgang wie `tuer` (target, auto, locked,
//   key, onEnter …) und Raumwechsel: mood (Stimmung der Ansicht nach dem Durchgang, Thema ghost: 'aussen' | 'innen' |
//   null = Grundstimmung des Themas).
//   { kind: 'spuk_tuer', id, pos (Mitte der Schwelle), yaw: −π/2, target: Tür-Id | [x, y, z], mood: 'aussen', … }
//
// wasserschalter – Wasserstand-Schalter (3-Kapitän, 3-5): Draufspringen/Stampfen drückt ihn → Aktion water (Wasserstand)
//   und onPress. toggle → erneutes Drücken stellt den alten Stand wieder her; back: s → Wasser sinkt nach s zurück.
//   { kind: 'wasserschalter', pos, water: { id, y | dy, speed: 1.5 }, onPress: Aktion, toggle: false, back: 0, id }
//   Laufzeit: pressed, presses
//
// goldring – goldener Ring (3-2): hindurchspringen/-laufen → Münzen (coins 5) bzw. reward, Funkeln, Ring verschwindet.
//   { kind: 'goldring', pos (Ring-Mitte), yaw: π/2 (Durchflug entlang Z), radius: 1.1, coins: 5, reward: Aktion, id }
//
// wandriss – rissige Felswand (3-5): nur Kanonenkugel (Kanonen-Helm), Bombe und Riesentrank sprengen sie (Stampfen
//   prallt ab, mit breakable: 'pound' auch Stampfen von oben); dahinter z. B. goldene Röhre.
//   { kind: 'wandriss', pos (Mitte der Unterseite), size: [3, 3, 1], breakable: 'cannon' | 'pound', onBreak: Aktion,
//     color, id }   Laufzeit: broken
//
// kurbelrad – Kurbelrad (3-2): Angriffe drehen es um eine Vierteldrehung, eine Figur, die daneben läuft, dreht es mit;
//   je Drehung hebt sich die Plattform (`platform`), ohne Drehen sinkt sie mit `back` m/s zurück.
//   { kind: 'kurbelrad', pos (Fußpunkt des Sockels), yaw: 0 (Radachse ±X lokal), turns: 2 (Umdrehungen bis oben),
//     platform: { pos (Mitte der Unterseite, unten), size: [3, 0.5, 3], rise: 4 }, back: 0.4, range: 1.6, onFull, id }
//   Laufzeit: angle (rad), k (0..1), platformY

import * as THREE from 'three';
import { Gimmick, runAction, playerOn, visDt } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { getEntityKind, hasEntityKind } from '../index.js';
import { box, merge, lin, mixc, colorize, hex } from '../../blocks/kit.js';
import { figures, MovingBox, wantOf, banner, yawBox, rotXZ, snapYaw } from '../../blocks/w3kit.js';
import { setWaterLevel, waterTop } from '../../blocks/water_level.js';

const sz3 = (a, d) => (Array.isArray(a) ? { x: a[0] ?? d[0], y: a[1] ?? d[1], z: a[2] ?? d[2] } : { x: d[0], y: d[1], z: d[2] });
const LIST = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

// =============================================================================================
// Schaltblock
// =============================================================================================
class Schaltblock extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'schaltblock');
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    this.hits = 0;
    this.cool = 0;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], tag: 'schaltblock' });
    this.nets = LIST(spec.net ?? 'schiene');
    if (level.view) this.setModel(getModel('schaltblock'));
  }

  netObjs() { return this.nets.map((n) => this.level._rails?.get(n)).filter(Boolean); }

  onBump() {
    if (this.cool > 0 || this.hidden) return;
    this.cool = 0.3;
    this.hits++;
    for (const n of this.netObjs()) n.reverse();
    if (!this.netObjs().length) console.warn(`[schaltblock] Schienennetz ${this.nets.join(', ')} fehlt`);
    this.level.sfx('blockhit');
    for (const e of this.level.entities) {
      if (e === this || !e.alive) continue;
      if (Math.abs(e.pos.x - this.pos.x) < 0.8 && Math.abs(e.pos.z - this.pos.z) < 0.8 && Math.abs(e.pos.y - (this.pos.y + 1)) < 0.35) e.onHit?.('bump', this);
    }
  }

  onPound() { this.onBump(); }
  update(dt) { if (this.cool > 0) this.cool -= dt; }

  modelState() {
    const n = this.netObjs()[0];
    return { anim: this.hits ? 'bump' : 'idle', dir: n ? n.sign : 1, n: this.hits };
  }
}

// =============================================================================================
// Bücherregal
// =============================================================================================
const PUSHERS = new Set(['claw', 'fire', 'shell', 'pound', 'bomb', 'mega', 'cannon', 'throw', 'slide', 'bump']);

class Buecherregal extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'buecherregal');
    this.yaw = snapYaw(spec.yaw ?? -Math.PI / 2);
    this.w = spec.width ?? 2;
    this.h = spec.height ?? 2.8;
    this.touch = false;
    const sl = spec.slide ?? [1, 0], l = Math.hypot(sl[0], sl[1]) || 1;
    this.dir = { x: sl[0] / l, z: sl[1] / l };
    this.range = spec.range ?? [0, 2];
    this.speed = spec.speed ?? 1.8;
    this.off = 0;
    this.target = null;
    this.pushT = 0;
    this.moving = false;
    this.opened = false;
    this.origin = this.pos.clone();
    const ext = yawBox(0, 0, 0, -0.25, 0.25, this.h, -this.w / 2, this.w / 2, this.yaw);
    this.ext = { x: (ext.max[0] - ext.min[0]) / 2, z: (ext.max[2] - ext.min[2]) / 2 };
    this.half.set(this.ext.x, this.h / 2, this.ext.z);
    this.bx = new MovingBox(level, this.pos.x, this.pos.y, this.pos.z, this.ext.x * 2, this.h, this.ext.z * 2, { tag: 'buecherregal', solid: false });
    this.bx.shape.owner = this;
    if (!this.hidden) this.bx.setSolid(true);
    if (level.view) this.setModel(getModel('buecherregal', { width: this.w, height: this.h }));
  }

  reveal() { super.reveal(); this.bx.setSolid(true); }
  hide() { super.hide(); this.bx.setSolid(false); }

  onHit(kind, source) {
    if (!PUSHERS.has(kind) || this.hidden) return;
    const sp = source?.pos ?? this.level.player?.pos;
    if (!sp) return;
    const d = (this.pos.x - sp.x) * this.dir.x + (this.pos.z - sp.z) * this.dir.z;
    this.nudge(d >= 0 ? 1 : -1, 1);
  }

  /** Schiebe-Schnittstelle des Motors (Player.move: Figur läuft mit speed m/s in Richtung dir gegen die Wandform). */
  onPush(player, dir, speed) {
    if (this.hidden || !(speed > 0)) return;
    const along = dir.x * this.dir.x + dir.z * this.dir.z;
    if (Math.abs(along) < 0.6) return;
    this.pushSig = along > 0 ? 1 : -1;
    this.pushAt = this.level.time;
    this.pushes = (this.pushes ?? 0) + 1;
  }

  /** Um m Meter in Richtung sign (±1) entlang slide schieben (weich). */
  nudge(sign, m) {
    const t = Math.max(this.range[0], Math.min(this.range[1], (this.target ?? this.off) + sign * m));
    if (Math.abs(t - this.off) < 0.01) { this.level.sfx('bump'); return; }
    this.target = t;
    this.level.sfx('step');
  }

  update(dt) {
    if (this.hidden) return;
    // Hineinlaufen: Figur liegt an einer Seite quer zur Schieberichtung an und drückt dagegen
    let push = 0;
    const s = this.bx.shape;
    for (const p of figures(this.level)) {
      if (p.mode !== 'ground') continue;
      if (p.pos.y > s.top - 0.2 || p.pos.y + p.half.y * 2 < s.bot + 0.1) continue;
      const w = wantOf(this.level, p);
      if (w.mag < 0.4) continue;
      const along = w.x * this.dir.x + w.z * this.dir.z;
      if (Math.abs(along) < 0.6) continue;
      const sg = along > 0 ? 1 : -1;
      // Seite: Figurenkante an der Regal-Fläche (Abstand ≤ 0,12 m), seitlich überlappend
      const ax = Math.abs(this.dir.x) > 0.5;
      const lo = ax ? s.x0 : s.z0, hi = ax ? s.x1 : s.z1;
      const pc = ax ? p.pos.x : p.pos.z, ph = ax ? p.half.x : p.half.z;
      const qc = ax ? p.pos.z : p.pos.x, qh = ax ? p.half.z : p.half.x;
      const qlo = ax ? s.z0 : s.x0, qhi = ax ? s.z1 : s.x1;
      if (qc + qh < qlo + 0.05 || qc - qh > qhi - 0.05) continue;
      const gap = sg > 0 ? lo - (pc + ph) : (pc - ph) - hi;
      if (gap > -0.05 && gap < 0.12) push = sg;
    }
    // Motor-Meldung (onPush) schiebt sofort; die eigene Anlage-Erkennung hält das Schieben bei gedrücktem Stick
    const viaMotor = this.pushAt !== undefined && this.level.time - this.pushAt < 0.12;
    if (!push && viaMotor) push = this.pushSig;
    if (push) this.pushT += dt; else this.pushT = 0;
    let v = 0;
    if (push && (this.pushT > 0.15 || viaMotor)) {
      const lim = push > 0 ? this.range[1] : this.range[0];
      if ((push > 0 && this.off < lim) || (push < 0 && this.off > lim)) { v = push * this.speed; this.target = null; }
    } else if (this.target !== null) {
      const d = this.target - this.off;
      v = Math.sign(d) * Math.min(Math.abs(d) / dt, this.speed * 2.2);
      if (Math.abs(d) < 1e-3) { this.target = null; v = 0; }
    }
    const was = this.off;
    this.off = Math.max(this.range[0], Math.min(this.range[1], this.off + v * dt));
    this.moving = Math.abs(this.off - was) > 1e-5;
    const o = this.origin;
    this.pos.set(o.x + this.dir.x * this.off, o.y, o.z + this.dir.z * this.off);
    if (this.moving) {
      this.bx.moveTo(this.pos.x, this.pos.y, this.pos.z, dt);
      if (((this.level.time * 4) | 0) !== (((this.level.time - dt) * 4) | 0)) this.level.effects?.dust({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 2, 0.6);
    } else this.bx.still();
    if (!this.opened && this.off >= this.range[1] - 1e-3 && this.range[1] > this.range[0]) {
      this.opened = true;
      this.level.sfx('switch');
      runAction(this.level, this.spec.onOpen, { pos: [this.origin.x, this.origin.y + 1, this.origin.z], source: this });
    }
  }

  modelState() { return { anim: this.moving ? 'shake' : 'idle' }; }

  dispose() { this.bx.setSolid(false); super.dispose(); }
}

// =============================================================================================
// Bilderrahmen (Spuk-Gemälde) mit Warp-Box in der Nische
// =============================================================================================
const OPENERS = new Set(['claw', 'fire', 'shell', 'pound', 'bomb', 'mega', 'cannon', 'throw', 'bump', 'star']);

class Bilderrahmen extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'bilderrahmen');
    this.yaw = spec.yaw ?? -Math.PI / 2;
    const sz = spec.size ?? [1.4, 1.8];
    this.W = sz[0]; this.H = sz[1];
    this.touch = false;
    this.opened = false;
    this.openK = 0;
    this.half.set(0.6, this.H / 2 + 0.16, 0.6);
    this.front = rotXZ(1, 0, this.yaw);
    this.warp = null;
    if (spec.warp) {
      const w = spec.warp;
      const floor = spec.floor ?? this.pos.y;
      const wp = w.pos ?? [this.pos.x - this.front.x * 1.0, floor, this.pos.z - this.front.z * 1.0];
      this.warp = level.spawn('warpbox', { ...w, pos: wp, hidden: true });
    }
    // Bild als Tür vor der Nische (fest, bis es aufklappt)
    if (spec.solid !== false) {
      const b = yawBox(this.pos.x, this.pos.y - 0.05, this.pos.z, -0.12, 0.1, this.H + 0.4, -this.W / 2 - 0.16, this.W / 2 + 0.16, this.yaw);
      this.addSolid({ type: 'box', ...b, owner: this, tag: 'bilderrahmen' });
    }
    if (level.view) {
      const m = getModel('bilderrahmen', { motif: spec.motif ?? 'spuk', size: [this.W, this.H] });
      // Nische (dunkel) hinter dem Bild + Scharnier links: Bild klappt zur Seite auf
      const root = new THREE.Group();
      const hinge = new THREE.Group();
      const niche = new THREE.Mesh(merge([box(0.04, this.H + 0.1, this.W + 0.1, -0.06, this.H / 2 + 0.16, 0, 0x120818, { r: 0, seg: 0 })]),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
      niche.visible = false;
      hinge.position.set(0, 0, -this.W / 2 - 0.16);
      m.root.position.set(0, 0, this.W / 2 + 0.16);
      hinge.add(m.root);
      root.add(niche, hinge);
      this.hinge = hinge; this.niche = niche; this.inner = m;
      this.setModel({ root, update: (dt, st) => m.update(dt, st), dispose: () => { m.dispose?.(); niche.geometry.dispose(); niche.material.dispose(); } });
    }
  }

  open() {
    if (this.opened || this.hidden) return;
    this.opened = true;
    this.removeShapes();
    this.solids.length = 0;
    this.level.sfx('ghost');
    this.level.sfx('switch');
    const p = this.pos;
    this.level.effects?.sparks({ x: p.x + this.front.x * 0.3, y: p.y + this.H / 2, z: p.z + this.front.z * 0.3 }, 14);
    this.warp?.reveal?.();
    runAction(this.level, this.spec.content, { pos: [p.x + this.front.x * 1.2, p.y + this.H / 2, p.z + this.front.z * 1.2], source: this });
  }

  toggle() { this.open(); }

  onHit(kind) { if (OPENERS.has(kind)) this.open(); }
  onBump() { this.open(); }

  update(dt) {
    if (this.opened) { this.openK = Math.min(1, this.openK + dt * 2.2); return; }
    // Hineinspringen: eine Figur in der Luft berührt das Bild (vor der Wand)
    const p0 = this.pos;
    for (const p of figures(this.level)) {
      if (p.mode !== 'air') continue;
      const dx = p.pos.x - p0.x, dz = p.pos.z - p0.z;
      const fr = dx * this.front.x + dz * this.front.z;
      const lat = Math.abs(-dx * this.front.z + dz * this.front.x);
      const y = p.pos.y + p.half.y;
      if (fr > -0.2 && fr < 0.75 && lat < this.W / 2 + 0.1 && y > p0.y + 0.1 && y < p0.y + this.H + 0.3) { this.open(); break; }
    }
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    this.model.root.visible = !this.hidden;
    const k = this.openK;
    if (this.hinge) { this.hinge.rotation.y = k * 1.9; this.niche.visible = k > 0.02; }
    this.model.update(visDt(this.level, this, dt), { anim: this.spec.watch === false || this.opened ? 'idle' : 'watch' });
  }
}

// =============================================================================================
// Falscher Zielmast
// =============================================================================================
class ZielmastSpuk extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'zielmast_spuk');
    this.height = spec.height ?? 6;
    this.half.set(0.55, this.height / 2, 0.55);
    this.tricked = false;
    this.t = 0;
    const p = this.pos;
    this.base = this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], tag: 'zielmast_spuk' });
    if (level.view) this.setModel(getModel('zielmast_spuk', { height: this.height }));
  }

  onPlayer(player) {
    if (this.tricked || this.hidden) return 'none';
    this.trick(player);
    return 'none';
  }

  trick(player) {
    this.tricked = true;
    this.t = 0;
    const p = this.pos;
    banner(this.level, this.spec.text ?? 'Reingelegt!', { hold: 1.8, color: '#e0b0ff', size: 18 });
    this.level.sfx('ghost');
    this.level.sfx('timewarn');
    this.level.effects?.sparks({ x: p.x, y: p.y + this.height * 0.8, z: p.z }, 20);
    const sp = this.spec.spawn;
    const want = sp === false ? null : sp ?? (hasEntityKind('spuk') ? { kind: 'spuk' } : null);
    if (want?.kind && hasEntityKind(want.kind)) {
      const side = player ? Math.sign(player.pos.x - p.x) || 1 : 1;
      this.spook = this.level.spawn(want.kind, { ...want, pos: want.pos ?? [p.x - side * 1.2, p.y + this.height * 0.6, p.z] });
    }
    runAction(this.level, this.spec.onTrick, { pos: [p.x, p.y + 1.5, p.z], source: this });
  }

  update(dt) {
    if (!this.tricked) return;
    this.t += dt;
    if (this.t > 1.2 && this.solids.length && !this.hidden) { this.hide(); }
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    this.model.root.visible = !(this.hidden && this.t > 1.3);
    this.model.update(visDt(this.level, this, dt), { anim: this.tricked ? 'reveal' : 'idle' });
  }

  // nach dem Verblassen bleibt nichts zurück (hide versteckt sonst auch das Modell sofort)
  get touch() { return this._touch !== false && !this.hidden && !this.tricked; }
  set touch(v) { this._touch = v; }
}

// =============================================================================================
// Spuk-Tür (Tür `tuer` mit Spukhaus-Modell und Raumwechsel)
// =============================================================================================
function makeSpukTuer(level, spec) {
  const make = getEntityKind('tuer');
  if (!make) { console.warn('[spuk_tuer] Entität tuer fehlt'); return null; }
  const mood = spec.mood;
  const onEnter = mood === undefined ? spec.onEnter : [spec.onEnter, { fn: (lv) => lv.view?.setMood?.(mood) }].filter(Boolean);
  const e = make(level, { ...spec, width: spec.width ?? 2.2, height: spec.height ?? 3.0, onEnter });
  if (!e) return null;
  e.kind = 'spuk_tuer';
  if (level.view && hasModel('spuk_tuer')) e.setModel(getModel('spuk_tuer'));
  return e;
}

// =============================================================================================
// Wasserstand-Schalter
// =============================================================================================
class Wasserschalter extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'wasserschalter');
    this.half.set(0.5, 0.26, 0.5);
    this.touch = false;
    this.pressed = false;
    this.presses = 0;
    this.backT = 0;
    this.cool = 0;
    this.orig = null;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 0.5, p.z + 0.5], tag: 'wasserschalter' });
    this.wasOn = false;
    if (level.view) this.setModel(getModel('wasserschalter'));
  }

  press() {
    const w = this.spec.water;
    if ((this.pressed && !this.spec.toggle) || this.cool > 0) return;
    this.cool = 0.5;
    const ws = LIST(w);
    if (!this.orig) this.orig = ws.map((x) => waterTop(this.level, x.id));
    const back = this.pressed && this.spec.toggle;
    this.pressed = !back;
    this.presses++;
    this.level.sfx('switch');
    this.level.sfx('splash_big');
    this.level.shake?.(0.15);
    const p = this.pos;
    this.level.effects?.ring({ x: p.x, y: p.y + 0.5, z: p.z }, 1.2);
    ws.forEach((x, i) => {
      if (back) { if (this.orig[i] !== null) setWaterLevel(this.level, { id: x.id, y: this.orig[i], speed: x.speed }); }
      else setWaterLevel(this.level, x);
    });
    if (!back) runAction(this.level, this.spec.onPress, { pos: [p.x, p.y + 1, p.z], source: this });
    this.backT = !back && this.spec.back > 0 ? this.spec.back : 0;
  }

  open() { this.press(); }
  toggle() { this.press(); }
  onPound() { this.press(); }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    const on = playerOn(this.level, this);
    if (on && !this.wasOn) this.press();
    this.wasOn = on;
    if (this.backT > 0) {
      this.backT -= dt;
      if (this.backT <= 0 && this.orig) {
        LIST(this.spec.water).forEach((x, i) => { if (this.orig[i] !== null) setWaterLevel(this.level, { id: x.id, y: this.orig[i], speed: x.speed }); });
        this.pressed = false;
      }
    }
  }

  modelState() { return { anim: this.pressed ? 'pressed' : 'idle' }; }
}

// =============================================================================================
// Goldring
// =============================================================================================
class Goldring extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'goldring');
    this.R = spec.radius ?? 1.1;
    this.yaw = spec.yaw ?? Math.PI / 2;
    this.touch = false;
    this.done = false;
    this.fade = 0;
    this.n = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };   // Ring-Normale (Durchflugrichtung)
    this.half.set(this.R, this.R, this.R);
    this.center0 = this.pos.clone();
    this.pos.y -= this.R;      // pos = Fußpunkt des Hüllquaders (Schatten, Kontakt)
    this.prevSide = new Map();
    if (level.view) {
      const g = new THREE.TorusGeometry(this.R, 0.12, 10, 40);
      g.rotateY(Math.PI / 2);
      const hi = lin(0xfff2a0), mid = lin(0xffc21a), lo = lin(0xb07a10);
      const geo = colorize(g.toNonIndexed(), (p, n, o) => { const k = n.y * 0.5 + 0.5; if (k > 0.6) mixc(mid, hi, (k - 0.6) / 0.4, o); else mixc(lo, mid, k / 0.6, o); });
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.5, emissive: 0x3a2400, transparent: true }));
      mesh.castShadow = true;
      const root = new THREE.Group();
      mesh.position.y = this.R;
      root.add(mesh);
      this.mesh = mesh;
      this.setModel({ root, update: () => {}, dispose: () => { geo.dispose(); mesh.material.dispose(); } });
    }
  }

  update(dt) {
    if (this.done) { this.fade += dt; if (this.fade > 0.6) this.kill(); return; }
    if (this.hidden) return;
    const c0 = this.center0;
    for (const p of figures(this.level)) {
      const c = p.center();
      const dx = c.x - c0.x, dy = c.y - c0.y, dz = c.z - c0.z;
      const side = dx * this.n.x + dz * this.n.z;
      const lat = Math.hypot(-dx * this.n.z + dz * this.n.x, dy);
      const prev = this.prevSide.get(p);
      this.prevSide.set(p, side);
      if (prev === undefined || lat > this.R - 0.1) continue;
      if ((prev < 0 && side >= 0) || (prev > 0 && side <= 0)) { this.collect(p); break; }
    }
  }

  collect() {
    this.done = true;
    const c = this.center0;
    this.level.sfx('star');
    this.level.effects?.sparks({ x: c.x, y: c.y, z: c.z }, 24);
    const reward = this.spec.reward ?? { coins: this.spec.coins ?? 5 };
    runAction(this.level, reward, { pos: [c.x, c.y, c.z], source: this });
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    this.model.root.visible = !this.hidden;
    const k = this.done ? Math.min(1, this.fade / 0.6) : 0;
    this.mesh.rotation.y = this.done ? t * 12 : Math.sin(t * 1.5) * 0.12;
    this.mesh.scale.setScalar(1 + k * 0.6);
    this.mesh.material.opacity = 1 - k;
  }
}

// =============================================================================================
// Wandriss
// =============================================================================================
const RISS_CANNON = new Set(['cannon', 'bomb', 'mega']);
const RISS_POUND = new Set(['cannon', 'bomb', 'mega', 'pound']);

function rissGeo(s, color) {
  const parts = [];
  const nx = Math.max(1, Math.round(s.x)), ny = Math.max(1, Math.round(s.y));
  const base = lin(hex(color, 0x8a8a9a)), dark = mixc(base, [0, 0, 0], 0.55, [0, 0, 0]);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const off = (j % 2) * 0.5;
    const x = -s.x / 2 + (i + 0.5) * (s.x / nx) + (off && i === nx - 1 ? 0 : 0), y = (j + 0.5) * (s.y / ny);
    const k = 0.85 + ((i * 7 + j * 13) % 5) * 0.04;
    const g = box(s.x / nx - 0.05, s.y / ny - 0.05, s.z, x, y, 0, 0xffffff, { r: 0.06, seg: 1 });
    const col = g.attributes.color;
    for (let v = 0; v < col.count; v++) col.setXYZ(v, base[0] * k, base[1] * k, base[2] * k);
    parts.push(g);
  }
  // Risse: dunkle Zickzack-Linien auf der Vorder- und Rückseite
  for (const sz of [1, -1]) {
    let x = -s.x * 0.05, y = s.y * 0.95;
    for (let i = 0; i < 7; i++) {
      const nx2 = x + (i % 2 ? 0.35 : -0.3) * (s.x / 3), ny2 = y - s.y / 7.5;
      const len = Math.hypot(nx2 - x, ny2 - y), a = Math.atan2(ny2 - y, nx2 - x);
      const g = box(len, 0.07, 0.03, 0, 0, 0, 0x000000, { r: 0, seg: 0 });
      g.rotateZ(a);
      g.translate((x + nx2) / 2, (y + ny2) / 2, sz * (s.z / 2 + 0.012));
      const col = g.attributes.color;
      for (let v = 0; v < col.count; v++) col.setXYZ(v, dark[0] * 0.3, dark[1] * 0.3, dark[2] * 0.3);
      parts.push(g);
      x = nx2; y = ny2;
    }
  }
  return merge(parts);
}

class Wandriss extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'wandriss');
    const s = sz3(spec.size, [3, 3, 1]);
    this.size = s;
    this.half.set(s.x / 2, s.y / 2, s.z / 2);
    this.touch = false;
    this.mode = spec.breakable === 'pound' ? 'pound' : 'cannon';
    this.broken = false;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], breakable: this.mode === 'pound' ? true : 'cannon', tag: 'wandriss' });
    if (level.view) {
      const mesh = new THREE.Mesh(rissGeo(s, spec.color), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.setModel({ root: mesh, update() {}, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } });
    }
  }

  onHit(kind, source) {
    if (this.broken || this.hidden) return;
    const ok = this.mode === 'pound' ? RISS_POUND.has(kind) : RISS_CANNON.has(kind);
    if (!ok) { if (kind === 'pound' || kind === 'claw') this.level.sfx('blockhit'); return; }
    if (kind === 'pound' && source?.pos && source.pos.y < this.pos.y + this.size.y - 0.35) return;
    this.broken = true;
    const p = this.pos, s = this.size;
    for (let i = 0; i < 6; i++) this.level.effects?.debris({ x: p.x + (i - 2.5) * (s.x / 6), y: p.y + s.y * (0.3 + (i % 3) * 0.25), z: p.z }, 0x8a8a9a, 5);
    this.level.sfx('brickbreak');
    this.level.shake?.(0.3);
    this.hide();
    runAction(this.level, this.spec.onBreak, { pos: [p.x, p.y + 0.2, p.z], source: this });
  }

  onPound(player) { this.onHit('pound', player); }
}

// =============================================================================================
// Kurbelrad
// =============================================================================================
const CRANKERS = new Set(['claw', 'fire', 'shell', 'pound', 'bomb', 'mega', 'cannon', 'throw', 'slide', 'bump', 'star']);

class Kurbelrad extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'kurbelrad');
    this.yaw = spec.yaw ?? 0;
    this.half.set(0.55, 0.9, 0.55);
    this.touch = false;
    this.angle = 0;
    this.av = 0;              // rad/s
    this.max = Math.PI * 2 * (spec.turns ?? 2);
    this.full = false;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.45, p.y, p.z - 0.45], max: [p.x + 0.45, p.y + 0.3, p.z + 0.45], tag: 'kurbelrad:sockel' });
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: 0.2, y0: p.y, y1: p.y + 1.25, tag: 'kurbelrad:saeule' });
    const pl = spec.platform;
    this.plat = null;
    if (pl) {
      const pp = pl.pos ?? [p.x + 3, p.y, p.z];
      const ps = pl.size ?? [3, 0.5, 3];
      this.plat = { base: pp[1], rise: pl.rise ?? 4, bx: new MovingBox(level, pp[0], pp[1], pp[2], ps[0], ps[1], ps[2], { tag: 'kurbelrad:plattform' }), size: ps, x: pp[0], z: pp[2] };
      this.platformY = pp[1];
      if (level.view) {
        const g = merge([
          box(ps[0], ps[1], ps[2], 0, ps[1] / 2, 0, pl.color ?? 0xe8283a, { r: 0.1, topColor: 0xffd0a0 }),
          box(ps[0] * 0.7, 0.05, ps[2] * 0.7, 0, ps[1] + 0.02, 0, 0xffc21a, { r: 0.02, seg: 1 }),
        ]);
        this.platMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
        this.platMesh.castShadow = true; this.platMesh.receiveShadow = true;
        this.platMesh.userData.owned = true;
        level.view.add(this.platMesh, () => { this.platMesh.position.set(this.plat.x, this.platformY, this.plat.z); });
        // Seil/Zahnstange als Andeutung: senkrechte Schiene neben der Plattform
        const rail = new THREE.Mesh(merge([box(0.18, this.plat.rise + ps[1] + 0.6, 0.18, -ps[0] / 2 - 0.15, (this.plat.rise + ps[1] + 0.6) / 2, 0, 0x6a7a98, { r: 0.04, seg: 1 })]),
          new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3 }));
        rail.position.set(pp[0], pp[1], pp[2]);
        rail.userData.owned = true;
        level.view.add(rail);
      }
    }
    if (level.view) this.setModel(getModel('kurbelrad'));
  }

  get k() { return Math.max(0, Math.min(1, this.angle / this.max)); }

  onHit(kind) {
    if (!CRANKERS.has(kind) || this.hidden) return;
    this.av = Math.max(this.av, 7);     // Schwung ≈ Vierteldrehung
    this.level.sfx('switch');
  }

  update(dt) {
    // Laufen neben dem Rad dreht es mit
    let drive = 0;
    for (const p of figures(this.level)) {
      if (p.mode !== 'ground') continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d > (this.spec.range ?? 1.6) || Math.abs(p.pos.y - this.pos.y) > 1.2) continue;
      const sp = p.hSpeed();
      if (sp > 1) drive = Math.max(drive, sp / 0.8);
    }
    if (drive) this.av = Math.max(this.av, Math.min(drive, 9));
    const before = this.angle;
    if (this.av > 0) {
      this.angle = Math.min(this.max, this.angle + this.av * dt);
      this.av = Math.max(0, this.av - 9 * dt);
    } else if ((this.spec.back ?? 0.4) > 0 && this.plat) {
      this.angle = Math.max(0, this.angle - ((this.spec.back ?? 0.4) / this.plat.rise) * this.max * dt);
    }
    if (!this.full && this.angle >= this.max - 1e-6) {
      this.full = true;
      this.level.sfx('key');
      runAction(this.level, this.spec.onFull, { pos: [this.pos.x, this.pos.y + 2, this.pos.z], source: this });
    }
    if (this.plat) {
      const y = this.plat.base + this.k * this.plat.rise;
      if (Math.abs(y - this.platformY) > 1e-7) this.plat.bx.moveTo(this.plat.x, y, this.plat.z, dt);
      else this.plat.bx.still();
      this.platformY = y;
    }
    if (Math.floor(before / (Math.PI / 2)) !== Math.floor(this.angle / (Math.PI / 2))) this.level.sfx('select');
  }

  modelState() { return { angle: this.angle }; }

  dispose() {
    if (this.plat) this.plat.bx.setSolid(false);
    if (this.platMesh) this.level.view?.remove(this.platMesh);
    super.dispose();
  }
}

export const KINDS = {
  schaltblock: (level, spec) => new Schaltblock(level, spec),
  buecherregal: (level, spec) => new Buecherregal(level, spec),
  bilderrahmen: (level, spec) => new Bilderrahmen(level, spec),
  zielmast_spuk: (level, spec) => new ZielmastSpuk(level, spec),
  spuk_tuer: (level, spec) => makeSpukTuer(level, spec),
  wasserschalter: (level, spec) => new Wasserschalter(level, spec),
  goldring: (level, spec) => new Goldring(level, spec),
  wandriss: (level, spec) => new Wandriss(level, spec),
  kurbelrad: (level, spec) => new Kurbelrad(level, spec),
};
