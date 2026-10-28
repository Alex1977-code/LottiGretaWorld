// Baron Brummbär im Krallen-Anzug – Endgegner Welt 8 (8-Burg, Finale „Brummbär-Rummelplatz“). Der Erzfeind zieht wie die Heldinnen
// einen Krallen-Anzug an (Modell 'baron_krallen'; Doppelgänger { clone: true }). Eine Boss-Entität mit **Abschnitts-Steuerung**: ein
// Level-Bauer legt die Abschnitte entlang des Turms an (sections), der Baron spielt sie nacheinander. Kindgerecht und fair: jede
// Gefahr kündigt sich an (Wandstück glüht und wackelt, Landemarken unter Feuerbällen und Doppelgängern, Knurren vor dem Rutschen),
// zwischen zwei Angriffen ist immer Pause (every s), nie Dauerbeschuss.
//
// ---------------------------------------------------------------------------------------------------------------------------------
// Abschnitte (sections: [{ type, … }], in dieser Reihenfolge; Beginn: eine Figur betritt den trigger-Kasten des Abschnitts):
//
//   type 'turm' (Turm unten, Aufstieg ≈ 40 m): der Baron klettert die Wände **vor der Figur** hinauf (route, immer lead m über
//     ihr; er wartet, wenn sie zurückbleibt) und greift an: **Feuerbälle** (Bogen mit Landemarke bzw. gerade), **Krallenhiebe** auf
//     nahe Wandstücke (walls: Entitäten 'bruchstueck' – Vorwarnung warn s: das Stück glüht rot, wackelt, knirscht; dann reißt er es
//     ein, es stürzt mit Schattenmarke ab und verletzt, wen es trifft), **Rutschen** (steht die Figur unter ihm an seiner Wand,
//     knurrt er 0,5 s und rutscht slide m auf sie herab – Berührung verletzt –, dann klettert er zurück).
//     Oben angekommen wartet er am POW-Block (pow: Id eines 'pow' – vorhandene Logik pow.js; guard: Wachplatz; block: Sperre,
//     solange er wacht) und spuckt weiter Feuer: **trifft die Figur den POW-Block, wird der Baron weggeschleudert** (throwTo),
//     die Sperre fällt, Signal level.signal(signal ?? 'baronPow', { section, pos }), Fanfare, Abschnitt geschafft. Ohne pow: der
//     Abschnitt endet, wenn eine Figur den end-Kasten betritt (er springt davon).
//     { type: 'turm', id?, trigger: { min, max }, route: [[x, y, z, wx?, wz?], …] (Fußpunkte; mit [wx, wz] = Richtung zur Wand:
//       dort klettert er, Wand 0,8 m vor ihm; ohne läuft er), lead?: 3.5, climb?: 2.2 (m/s), walk?: 2.6, sight?: 22,
//       every?: 2.6 (s), fire?: { shots: 1, speed: 6.5, arc: true, flight: 1.0 }, slide?: 4 (m; 0 = nie), slideSpeed?: 5,
//       walls?: ['id', …] | [{ id?, pos, size, climbable?, look? }] (bruchstueck-Daten), swipeR?: 2.6, warn?: 1.2,
//       pow?: 'id', guard?: [x, y, z], block?: { min, max }, throwTo?: [x, y, z], signal?: 'baronPow', end?: { min, max },
//       banner?: Text }
//
//   type 'spiegel' (Oberer Turm ≈ 40 m, nach der Kanonen-Glasröhre): klettert wie oben voraus (route, lead, fire; slide Standard 0)
//     und **frisst Spiegelfrüchte** (fruits: am Weg; je Frucht 0,4 s Fressen + 0,6 s Zauber) – er **vervielfacht sich**: clones[k]
//     leuchtende Doppelgänger (Entität 'baron_klon', höchstens 4 zugleich) springen herab und **stürmen** ihre Bahn entlang (lanes:
//     [[von, bis], …]; ohne lanes: vor die Figur, dann auf sie zu) – Wegstücke (breaks: 'bruchstueck'), auf denen sie landen oder
//     laufen, zerbröckeln nach 0,6 s Wackeln. Doppelgänger: Draufspringen/Stampfen, Power-ups, Wurfsichel, POW → platzen in Funken;
//     seitlich verletzen sie. Ende: eine Figur betritt end → er springt zum Gipfel (Doppelgänger platzen).
//     { type: 'spiegel', id?, trigger, route, follow?: 'weg' (Standard: ahead m vor der Figur entlang der Route; 'hoehe' = lead m
//       über ihr wie im Turm), ahead?: 6, climb?, every?: 3.0, fire?, fruits: [[x, y, z], …], clones?: [2, 3, 4],
//       lanes?: [[[x, y, z], [x, y, z]], …], breaks?: ['id', …] | [{ … }], cloneSpeed?: 4.5, end: { min, max }, banner? }
//
//   type 'gipfel' (Finale, Gipfel ≈ 25 × 25 m): riesiger **Super-POW-Block** (Baustein des Motors, Kind 'super_pow_block'; fehlt er
//     unter pow.id, legt der Baron ihn an – ohne Motor-Baustein den Ersatz 'baron_superpow'), darauf der Baron und das **Glas der
//     gefangenen Freunde** ('freunde_glas'). Er greift von oben an: Feuerbälle im Bogen (fire[Phase], Landemarken), **Sprung-
//     Schockwellen** (shock[Phase] Ringe um den Block, 0,45 m hoch – drüberspringen), **Doppelgänger** (clones[Phase], springen
//     herab und jagen die Figur life s). Pause every[Phase] s. **Jeder Stoß gegen den Super-POW-Block** (Signal powSignal ??
//     'super_pow' bzw. Zähler hits des Blocks) schleudert ihn hoch – er taumelt (Lebensleiste: 4 Stufen, hp = maxHp − Stöße),
//     nächste Phase. Nach dem 4. Stoß **fliegt er davon** (lustig, rudernd, den Zylinder in der Tatze, rufend), das Glas zerbricht,
//     die Freunde jubeln; gone → Boss-Archetyp: Glasröhre/Warp (LEVEL.boss.warp), Aktion onWin (Standard { credits: true } –
//     Abspann nach dem Zielmast, Motor) und Signal level.signal('finaleWon', { pos, friends }).
//     { type: 'gipfel', id?, trigger, center: [x, y, z] (Gipfelmitte am Boden), pow: { id: 'superpow', pos: [x, y, z] (Mitte der
//       Unterseite), size: 4.5, hits: 4 }, powSignal?: 'super_pow', perch?: [dx, dz] (Platz auf dem Block, relativ zur Mitte;
//       Standard [0.8, 0]), glass?: [dx, dz] (Glas auf dem Block, Standard [−1.1, −0.3]), friends?: […],
//       every?: [2.8, 2.4, 2.1, 1.8], fire?: [1, 2, 3, 3], shock?: [0, 1, 1, 2], shockR?: 11, clones?: [0, 0, 2, 3], cloneLife?: 6,
//       flight?: 1.1, flyTo?: [x, y, z], onWin?: Aktion, banner? }
//
// Gemeinsam: { kind: 'baron_krallen', id: 'baron', pos: [x, y, z] (Wartestelle vor dem ersten Abschnitt), hp?: 4, sections: […],
//   seed? }   boss: { id: 'baron', name: 'Baron Brummbär', speed: 0, trigger (= trigger des ersten Abschnitts), warp, warpPos,
//   warpTo, frame: 0.25, center, warpBanner: 'Ab in die Glasröhre!', musicAfter }  (bzw. ein Eintrag in LEVEL.bosses)
// Archetyp-Schnittstelle wie Baron im Kampfwagen: begin, reset, state, stateT, hp, maxHp, phase (1..4), visible, home (Kampfkamera),
//   half, carHits (0), vulnerable, info(); level.onBossHit(boss, 'superpow'), level.onBossDefeated(boss); boss: true, kein enemy.
//   Betritt eine Figur nach einem Tod den trigger des aktuellen Abschnitts, startet der Baron den Kampf selbst wieder (arch.start).
// **Tod im Kampf** (reset): nur der aktuelle Abschnitt beginnt von vorn – Wand-/Wegstücke, Früchte, Sperre zurück, Feuerbälle,
//   Doppelgänger, Wellen weg; geschaffte Abschnitte bleiben geschafft (Checkpoint-fair). Gipfel: hat der Super-POW-Block reset(),
//   beginnt der Kampf mit 4/4, sonst bleiben die Stöße (hp = 4 − Stöße).
// Draufspringen = Abprall ohne Schaden; Feuer, Krallen, Panzer, Stern, Riese prallen ab (Funken); **Wurfsichel**: er zuckt
//   (Angriff unterbrochen, „Kratzer!“), kein Schaden. Berührung im Kampf verletzt.
// Zustände: wait | intro | climb | fire | swipe | slidewarn | slide | slideup | eat | clone | guard | thrown | leave | between |
//   perch | hop | summon | launched | stunned | defeated | flyaway | gone. Laufzeit: section (Id/Typ), cur (Index), done (geschaffte
//   Abschnitte), s (Weg auf der Route), fires, fireballs, swipes, wallsBroken, slides, eaten, clonesMade, powHit, hops, waves,
//   hits, hitLog, bounces, flinches, info().
// Sound: 'claw' (Krallenhieb), 'fireball', 'wallslide' (Rutschen), 'brickbreak', 'rumble' (Warnung), 'clone', 'berry', 'slam',
//   'boss_hit', 'victory' (Abschnitts-/Treffer-Fanfare), 'panic', 'hop', 'land', 'bounce', 'blockhit', 'poof', 'vanish', 'gong'.
//
// ---------------------------------------------------------------------------------------------------------------------------------
// bruchstueck – Wand- bzw. Wegstück, das einbrechen kann (Baron-Krallenhieb, Doppelgänger). Fester Quader (climbable: Krallen-Wand),
//   startWarn(t) → glüht rot und wackelt t s → bricht: stürzt (Schattenmarke am Boden darunter) und verletzt, wen es trifft, dann
//   weg. restore() setzt es zurück (Tod im Kampf).
//   Daten: { kind: 'bruchstueck', id, pos: [x, y, z] (Mitte der Unterseite), size?: [2, 1, 2], climbable?: false, look?: 'stein' |
//            'holz' | 'rummel', color?, warn?: 1.0 }   Laufzeit: state ('ganz' | 'warn' | 'fall' | 'weg'), breaks, hurts, info().
// baron_klon – Spiegelfrucht-Doppelgänger (nur vom Baron erzeugt): { owner, pos, from?, lane?: [[x,y,z],[x,y,z]], target?, life? }.
// baron_superpow – Ersatz-Super-POW-Block ohne Motor-Baustein (gleiche Schnittstelle: hits, left, done, state, hit(via), reset(),
//   info(); Signal 'super_pow' { hit, of, left, done, pos, source, via, id }): { kind: 'baron_superpow', id, pos, size?: 4.5,
//   hits?: 4, cool?: 0.6 } – Kopfstoß von unten, Stampfattacke, Wurfsichel, Panzer, Bombe, Riesentrank zählen.

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { EnemyW2, figures, activeFigure, localOffset, clamp, wrapAngle } from '../EnemyW2.js';
import { getModel, hasModel } from '../../models/index.js';
import { ballistic } from './bomb_cannon.js';
import { bossManaged } from '../w6help.js';
import { Markers, POWER_HIT, groundBelow } from '../w8help.js';
import { runAction } from '../gimmick.js';
import { box as kitBox } from '../../blocks/kit.js';

const TAU = Math.PI * 2;
const INTRO = 2.0, FIRE = 0.8, FIRE_AT = 0.45, SWIPE = 0.7, SWIPE_AT = 0.42, SLIDE_WARN = 0.5, EAT = 0.4, CLONE = 0.6;
const THROWN = 1.5, LEAVE = 1.0, HOP_UP = 0.55, HOP_DOWN = 0.35, SUMMON = 0.6, LAUNCH = 1.3, STUN = 1.4, DEFEAT = 1.2, FLEE = 4.0;
const FLINCH = 0.6;
const HALF = { x: 0.75, y: 1.35, z: 0.75 };
const ease = (k) => k * k * (3 - 2 * k);
const pick = (v, ph, def) => (Array.isArray(v) ? v[Math.min(v.length - 1, Math.max(0, ph - 1))] : v ?? def[Math.min(def.length - 1, ph - 1)]);
const inBox = (p, b) => !!b && p.x >= b.min[0] && p.x <= b.max[0] && p.y >= b.min[1] && p.y <= b.max[1] && p.z >= b.min[2] && p.z <= b.max[2];
const ACTIVE = new Set(['climb', 'fire', 'swipe', 'slidewarn', 'slide', 'slideup', 'eat', 'clone', 'guard', 'perch', 'hop', 'summon']);

// =====================================================================================================================
// Kletterweg
// =====================================================================================================================
class Route {
  constructor(pts) {
    this.pts = (pts?.length ? pts : [[0, 0, 0]]).map((p) => {
      let wall = null;
      if (p.length >= 5) { const l = Math.hypot(p[3], p[4]) || 1; wall = { x: p[3] / l, z: p[4] / l }; }
      else if (p.length === 4) wall = { x: Math.cos(p[3]), z: -Math.sin(p[3]) };
      return { x: p[0], y: p[1], z: p[2], wall };
    });
    if (this.pts.length === 1) this.pts.push({ ...this.pts[0] });
    this.seg = [];
    let L = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      this.seg.push({ a, b, l, s0: L, climb: Math.abs(b.y - a.y) > Math.hypot(b.x - a.x, b.z - a.z) * 0.8 && !!(b.wall || a.wall) });
      L += l;
    }
    this.L = L;
  }

  segAt(s) {
    s = clamp(s, 0, this.L);
    for (const g of this.seg) if (s <= g.s0 + g.l + 1e-9) return g;
    return this.seg[this.seg.length - 1];
  }

  posAt(s, out = {}) {
    const g = this.segAt(s);
    const t = g.l > 0 ? clamp((s - g.s0) / g.l, 0, 1) : 0;
    out.x = g.a.x + (g.b.x - g.a.x) * t; out.y = g.a.y + (g.b.y - g.a.y) * t; out.z = g.a.z + (g.b.z - g.a.z) * t;
    out.wall = g.b.wall ?? g.a.wall;
    out.climb = g.climb;
    return out;
  }

  /** Kleinste Weglänge, ab der die Route die Höhe y erreicht (sonst L). */
  sAtHeight(y) {
    for (const g of this.seg) {
      if (g.b.y >= y && g.a.y < y) return g.s0 + g.l * clamp((y - g.a.y) / Math.max(1e-6, g.b.y - g.a.y), 0, 1);
      if (g.a.y >= y) return g.s0;
    }
    return this.L;
  }

  /** Weglänge der nächsten Stelle zu (x, y, z). */
  nearestS(x, y, z) {
    let best = 0, bd = Infinity;
    for (const g of this.seg) {
      const bx = g.b.x - g.a.x, by = g.b.y - g.a.y, bz = g.b.z - g.a.z, l2 = bx * bx + by * by + bz * bz;
      const t = l2 > 1e-8 ? clamp(((x - g.a.x) * bx + (y - g.a.y) * by + (z - g.a.z) * bz) / l2, 0, 1) : 0;
      const d = Math.hypot(g.a.x + bx * t - x, (g.a.y + by * t - y) * 0.5, g.a.z + bz * t - z);
      if (d < bd) { bd = d; best = g.s0 + g.l * t; }
    }
    return best;
  }

  get end() { return this.pts[this.pts.length - 1]; }
}

// =====================================================================================================================
// Bruchstück (Wand-/Wegstück)
// =====================================================================================================================
const LOOKS = { stein: 0x8a7a9a, holz: 0xb07a48, rummel: 0xd04a5a };

class Bruchstueck extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'bruchstueck');
    this.touch = false;
    this.shadow = 0;
    const s = spec.size ?? [2, 1, 2];
    this.size = { x: s[0], y: s[1], z: s[2] };
    this.half.set(s[0] / 2, s[1] / 2, s[2] / 2);
    this.home = this.pos.clone();
    this.warnDefault = spec.warn ?? 1.0;
    this.climbable = !!spec.climbable;
    this.state = 'ganz';
    this.stateT = 0;
    this.breaks = 0;
    this.hurts = 0;
    this.hitSet = new Set();
    this.markers = new Markers(level);
    this.addSolidShape();
    if (level.view) this.buildModel(spec);
  }

  addSolidShape() {
    if (this.shapeId != null) return;
    const p = this.home, h = this.half;
    this.shapeId = this.addShape({ type: 'box', min: [p.x - h.x, p.y, p.z - h.z], max: [p.x + h.x, p.y + 2 * h.y, p.z + h.z], climbable: this.climbable || undefined, tag: 'bruchstueck' });
  }

  dropSolidShape() {
    if (this.shapeId == null) return;
    this.level.world.remove(this.shapeId);
    this.shapes = this.shapes.filter((id) => id !== this.shapeId);
    this.shapeId = null;
  }

  buildModel(spec) {
    const col = spec.color ?? LOOKS[spec.look] ?? LOOKS.stein;
    const g = kitBox(this.size.x, this.size.y, this.size.z, 0, this.size.y / 2, 0, col, { r: Math.min(0.12, this.size.y * 0.2) });
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: new THREE.Color(0x000000) });
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    // Fugen/Risse als dunkle Streifen (sichtbar beim Warnen)
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const cracks = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(this.size.x * 1.01, 0.05, this.size.z * 1.01), crackMat);
      c.position.y = this.size.y * (0.25 + i * 0.25);
      c.rotation.z = (i - 1) * 0.12;
      cracks.add(c);
    }
    const root = new THREE.Group();
    root.add(mesh, cracks);
    const self = this;
    this.setModel({
      root,
      update() {
        const warn = self.state === 'warn';
        const k = warn ? 0.5 + 0.5 * Math.sin(self.stateT * 18) : 0;
        mat.emissive.setRGB(k * 0.7, k * 0.12, 0);
        crackMat.opacity = warn ? 0.5 + 0.4 * k : 0;
        root.visible = self.state !== 'weg';
      },
      dispose() { g.dispose(); mat.dispose(); crackMat.dispose(); for (const c of cracks.children) c.geometry.dispose(); },
    });
  }

  get intact() { return this.state === 'ganz' || this.state === 'warn'; }

  /** Vorwarnung: glüht rot und wackelt t s, bricht dann (auto = true) bzw. wartet auf breakNow (auto = false). */
  startWarn(t = this.warnDefault, auto = true) {
    if (this.state !== 'ganz') return false;
    this.state = 'warn';
    this.stateT = 0;
    this.warnT = t;
    this.autoBreak = auto;
    this.level.sfx('rumble');
    this.level.effects?.dust({ x: this.pos.x, y: this.pos.y + this.half.y, z: this.pos.z }, 4, 0.6);
    return true;
  }

  cancelWarn() { if (this.state === 'warn') { this.state = 'ganz'; this.stateT = 0; } }

  breakNow(by = 'baron') {
    if (!this.intact) return false;
    this.state = 'fall';
    this.stateT = 0;
    this.by = by;
    this.breaks++;
    this.dropSolidShape();
    this.vel.set(0, 1.2, 0);
    this.spinV = (this.home.x * 13.1 + this.home.z * 7.7) % 2 > 1 ? 2.2 : -2.2;
    this.hitSet.clear();
    this.floor = groundBelow(this.level, this.pos.x, this.pos.y - 0.05, this.pos.z, 60);
    if (this.floor !== null) this.markers.add(this.pos.x, this.floor, this.pos.z, Math.sqrt(Math.max(0.1, 2 * (this.pos.y - this.floor) / 30)) + 0.2, Math.max(1, Math.max(this.size.x, this.size.z) / 1.6));
    this.level.sfx('brickbreak');
    this.level.effects?.debris({ x: this.pos.x, y: this.pos.y + this.half.y, z: this.pos.z }, 0x8a7a9a, 10);
    this.level.signal?.('bruchstueckKaputt', { id: this.spec.id ?? null, by, pos: [this.pos.x, this.pos.y, this.pos.z] });
    return true;
  }

  restore() {
    this.markers.clear();
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.state = 'ganz';
    this.stateT = 0;
    this.addSolidShape();
    if (this.model) this.model.root.rotation.set(0, this.yaw, 0);
  }

  update(dt) {
    this.stateT += dt;
    this.markers.update(dt);
    if (this.state === 'warn') {
      if (this.autoBreak && this.stateT >= this.warnT) this.breakNow(this.warnBy ?? 'zeit');
      return;
    }
    if (this.state !== 'fall') return;
    this.vel.y = Math.max(this.vel.y - 30 * dt, -22);
    this.pos.y += this.vel.y * dt;
    // fallend: wer getroffen wird, wird verletzt (einmal je Figur)
    for (const p of figures(this.level)) {
      if (!activeFigure(p) || this.hitSet.has(p)) continue;
      if (Math.abs(p.pos.x - this.pos.x) > this.half.x + p.half.x || Math.abs(p.pos.z - this.pos.z) > this.half.z + p.half.z) continue;
      if (p.pos.y > this.pos.y + 2 * this.half.y || p.pos.y + 2 * p.half.y < this.pos.y) continue;
      this.hitSet.add(p);
      if (p.hurt(this)) this.hurts++;
    }
    const landed = this.floor !== null && this.pos.y <= this.floor;
    if (landed || this.stateT > 2.5 || this.pos.y < this.level.killY) {
      if (landed) { this.level.effects?.dust({ x: this.pos.x, y: this.floor, z: this.pos.z }, 10, 1.4); this.level.sfx('slam'); }
      this.state = 'weg';
      this.stateT = 0;
      this.markers.clear();
    }
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.copy(this.pos);
    if (this.state === 'warn') { r.position.x += Math.sin(this.stateT * 47) * 0.04; r.position.z += Math.cos(this.stateT * 53) * 0.03; }
    if (this.state === 'fall') { r.rotation.x = this.stateT * this.spinV * 0.6; r.rotation.z = this.stateT * this.spinV; }
    else r.rotation.set(0, this.yaw, 0);
  }

  render(dt, t) { super.render(dt, t); this.markers.render(dt); }

  onPlayer() { return 'none'; }
  onHit() {}

  dispose() { this.markers.clear(); super.dispose(); }

  info() { return { state: this.state, breaks: this.breaks, hurts: this.hurts, by: this.by ?? null, y: +this.pos.y.toFixed(2) }; }
}

// =====================================================================================================================
// Doppelgänger
// =====================================================================================================================
class BaronKlon extends EnemyW2 {
  constructor(level, spec) {
    super(level, spec, 'baron_klon');
    this.owner = spec.owner ?? null;
    this.half.set(0.7, 1.3, 0.7);
    this.shadow = 0.7;
    this.wake = 0;
    this.edges = false;
    this.lane = spec.lane ?? null;
    this.target = spec.target ?? null;
    this.life = spec.life ?? 6;
    this.speed = spec.speed ?? 4.5;
    this.breaks = spec.breaks ?? [];
    this.state = 'pop';
    this.touch = false;
    this.age = 0;
    this.popT = spec.pop ?? 0.5;
    this.jumpT = 0.85;
    this.markers = new Markers(level);
    this.anim = 'clone';
    if (level.view) { this.setModel(getModel('baron_krallen', { clone: true })); this.initShadows(0); }
  }

  /** Sprung zum Ziel (Landemarke). */
  startJump() {
    const to = this.lane ? this.lane[0] : this.target;
    const tx = to ? to[0] : this.pos.x, tz = to ? to[2] : this.pos.z;
    let ty = to ? to[1] : this.pos.y;
    const g = groundBelow(this.level, tx, ty + 1.5, tz, 8);
    if (g !== null) ty = g;
    this.jump = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1: tx, y1: ty, z1: tz, T: this.jumpT };
    this.markers.add(tx, ty, tz, this.jumpT, 1.3);
    this.setState('jump');
    this.level.sfx('hop');
  }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    this.markers.update(dt);
    if (this.state === 'burst') { if (this.stateT > 0.35) this.kill(); return; }
    if (this.updateDefeat(dt)) return;
    switch (this.state) {
      case 'pop':
        this.anim = 'clone';
        if (this.stateT >= this.popT) this.startJump();
        return;
      case 'jump': {
        const j = this.jump, k = clamp(this.stateT / j.T, 0, 1);
        this.pos.set(j.x0 + (j.x1 - j.x0) * k, j.y0 + (j.y1 - j.y0) * k + 4 * 2.2 * k * (1 - k), j.z0 + (j.z1 - j.z0) * k);
        this.faceToward(j.x1 - j.x0, j.z1 - j.z0, dt, 8);
        this.anim = 'fall';
        if (k >= 1) {
          this.touch = true;
          this.vel.set(0, 0, 0);
          this.grounded = false;
          this.level.sfx('land');
          this.level.effects?.sparks(this.pos, 8);
          this.setState('run');
          this.stomped();
        }
        return;
      }
      case 'run': {
        this.anim = 'walk';
        let dx = 0, dz = 0;
        if (this.lane) { dx = this.lane[1][0] - this.pos.x; dz = this.lane[1][2] - this.pos.z; }
        else { const p = this.player; if (activeFigure(p)) { dx = p.pos.x - this.pos.x; dz = p.pos.z - this.pos.z; } }
        const d = Math.hypot(dx, dz);
        const sp = this.lane ? this.speed : this.speed * 0.7;
        if (d > 0.3) { this.vel.x = (dx / d) * sp; this.vel.z = (dz / d) * sp; this.faceToward(dx, dz, dt, 8); } else { this.vel.x = 0; this.vel.z = 0; }
        this.moveWithGravity(dt);
        if (this.removed) return;
        this.stomped();
        if (!this.grounded) this.fallY = this.fallY ?? this.pos.y;
        else this.fallY = undefined;
        if (this.fallY !== undefined && this.pos.y < this.fallY - 3) { this.burst('fall'); return; }
        if ((this.lane && d <= 0.3) || this.age >= this.life) this.burst('ende');
        return;
      }
      default: break;
    }
  }

  /** Steht/landet er auf einem Wegstück, zerbröckelt es (Vorwarnung 0,6 s). */
  stomped() {
    const g = this.ground?.owner ?? null;
    if (g && g.kind === 'bruchstueck' && g.intact) { if (g.startWarn(0.6)) { g.warnBy = 'klon'; this.level.sfx('stomp'); } return; }
    // Landung ohne Bodenmeldung: Stücke unter dem Fußpunkt
    if (this.state === 'run' && !this.grounded) return;
    for (const b of this.breaks) {
      if (!b?.intact) continue;
      if (Math.abs(this.pos.x - b.pos.x) <= b.half.x + 0.2 && Math.abs(this.pos.z - b.pos.z) <= b.half.z + 0.2 && Math.abs(this.pos.y - (b.home.y + 2 * b.half.y)) < 0.4) {
        if (b.startWarn(0.6)) { b.warnBy = 'klon'; this.level.sfx('stomp'); }
      }
    }
  }

  burst(why = 'treffer') {
    if (this.state === 'burst' || this.removed) return;
    this.setState('burst');
    this.burstBy = why;
    this.touch = false;
    this.markers.clear();
    this.level.effects?.sparks(this.center(), 18);
    this.level.effects?.ring(this.pos, 1.2);
    this.level.sfx('poof');
    if (why !== 'fall' && why !== 'ende' && why !== 'abschnitt') this.markDefeated();
    this.owner?.onClonePopped?.(this, why);
  }

  onPlayer(player, contact) {
    if (this.state !== 'run' || !this.touch) return 'none';
    if (this.slideAttack(player, contact)) return 'none';
    if (contact.pound) { this.burst('stampfen'); return 'none'; }
    if (contact.fromAbove) { this.burst('stampfen'); return 'stomp'; }
    if (contact.dive || contact.star) { this.burst('angriff'); return 'none'; }
    return 'hurt';
  }

  onHit(kind, source) {
    if (this.state === 'burst' || this.state === 'pop') return;
    if (kind === 'pound' && source?.pos && Math.abs(source.pos.y - this.pos.y) > 1.2) return;
    if (POWER_HIT.has(kind) || kind === 'bump' || kind === 'slide' || kind === 'pound' || source?.sichel) this.burst(source?.sichel ? 'sichel' : kind);
  }

  modelState() {
    if (this.state === 'pop') return { anim: 'clone', progress: Math.min(1, this.stateT / CLONE) };
    if (this.state === 'run') return { anim: 'walk', speed: this.lane ? this.speed : this.speed * 0.7 };
    return { anim: this.anim };
  }

  syncModel() {
    if (!this.model) return;
    super.syncModel();
    this.model.root.visible = this.state !== 'burst';
  }

  render(dt, t) { super.render(dt, t); this.markers.render(dt); }

  dispose() { this.markers.clear(); super.dispose(); }

  info() { return { state: this.state, age: +this.age.toFixed(2), by: this.burstBy ?? null, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2) }; }
}

// =====================================================================================================================
// Ersatz-Super-POW-Block (ohne Motor-Baustein)
// =====================================================================================================================
class BaronSuperPow extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'baron_superpow');
    this.touch = false;
    this.shadow = 0;
    this.S = spec.size ?? 4.5;
    this.N = Math.max(1, spec.hits ?? 4);
    this.cool = spec.cool ?? 0.6;
    this.half.set(this.S / 2, this.S / 2, this.S / 2);
    this.hits = 0;
    this.cd = 0;
    this.squash = 0; this.sv = 0;
    this.hitT = 9;
    this.state = 'bereit';
    this.last = null;
    this.place();
    if (level.view) this.setModel(getModel('super_pow_block', { size: this.S }));
  }

  get left() { return this.N - this.hits; }
  get done() { return this.hits >= this.N; }
  get top() { return this.pos.y + this.S * (1 - 0.16 * Math.min(this.hits, 4)); }

  place() {
    this.removeShapes();
    if (this.done) return;
    const p = this.pos, h = this.S / 2;
    this.addShape({ type: 'box', min: [p.x - h, p.y, p.z - h], max: [p.x + h, this.top, p.z + h], tag: 'super_pow' });
  }

  hit(via = 'extern', source = null) {
    if (this.cd > 0 || this.done) return false;
    this.cd = this.cool;
    this.hits++;
    this.last = via;
    this.hitT = 0;
    this.sv -= 6;
    this.state = 'stoss';
    const lv = this.level;
    lv.shake(0.9);
    lv.sfx('slam');
    lv.effects?.ring({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, this.S * 1.2);
    lv.effects?.ring({ x: this.pos.x, y: this.pos.y - 0.5, z: this.pos.z }, this.S * 2);
    const data = { hit: this.hits, of: this.N, left: this.left, done: this.done, pos: [this.pos.x, this.top, this.pos.z], source, via, id: this.spec.id ?? null };
    this.place();
    lv.signal?.(this.spec.signal ?? 'super_pow', data);
    if (this.done) { this.state = 'fertig'; lv.sfx('victory'); lv.effects?.debris({ x: this.pos.x, y: this.pos.y + this.S / 2, z: this.pos.z }, 0x3a7aff, 24); }
    return true;
  }

  reset() { this.hits = 0; this.cd = 0; this.state = 'bereit'; this.place(); }

  onBump(player) { this.hit('kopf', player); }
  onPound(player) { this.hit('stampfen', player); }
  onHit(kind, src) { if (kind === 'shell' || kind === 'bomb' || kind === 'mega' || kind === 'throw') this.hit(kind, src); }
  onSichelHit(s) { this.hit('sichel', s); }
  onPlayer() { return 'none'; }

  update(dt) {
    if (this.cd > 0) this.cd -= dt;
    this.hitT += dt;
    if (this.state === 'stoss' && this.hitT > 0.4) this.state = 'bereit';
    this.sv += (-120 * this.squash - 10 * this.sv) * dt;
    this.squash += this.sv * dt;
  }

  modelState() { return { anim: this.hitT < 0.7 ? 'hit' : 'idle', progress: Math.min(1, this.hitT / 0.7), hits: this.hits, squash: clamp(Math.abs(this.squash), 0, 1) }; }

  syncModel() {
    if (!this.model) return;
    this.model.root.position.copy(this.pos);
    this.model.root.visible = !this.done;
  }

  info() { return { hits: this.hits, of: this.N, left: this.left, state: this.state, last: this.last, solid: this.shapes.length > 0 }; }
}

// =====================================================================================================================
// Baron Brummbär im Krallen-Anzug
// =====================================================================================================================
class BaronKrallen extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'baron_krallen');
    this.enemy = false;
    this.boss = true;
    this.half.set(HALF.x, HALF.y, HALF.z);
    this.shadow = 0.8;
    this.start = this.pos.clone();
    this.home = this.pos.clone();
    this.maxHp = spec.hp ?? 4;
    this.hp = this.maxHp;
    this.carHits = 0;
    this.sections = (spec.sections ?? []).map((s, i) => this.normSection(s, i));
    this.cur = 0;
    this.done = [];
    this.markers = new Markers(level);
    this.fires = [];
    this.clones = [];
    this.waves = [];
    this.waveQueue = [];
    this.fruitModels = [];
    this.visible = true;
    this.touch = false;
    this.hits = 0; this.hitLog = []; this.bounces = 0; this.flinches = 0;
    this.fireballs = 0; this.firesN = 0; this.swipes = 0; this.wallsBroken = 0; this.slides = 0; this.eaten = 0; this.clonesMade = 0;
    this.powHit = 0; this.hops = 0; this.wavesN = 0; this.superHits = 0;
    this.glass = null; this.glassState = { shake: 0, break: 0, cheer: 0 };
    this.hatMesh = null;
    let model = null;
    if (level.view) {
      model = this.setModel(getModel('baron_krallen'));
      // Zylinder (für die Flucht in die Tatze): Mesh am Rumpf mit eigenem Material, ≈ 1,96 m über der Hüfte
      try {
        model.update(0.01, { anim: 'idle' });
        const body = model.root.children[0];
        this.hatMesh = body?.children?.find((c) => c.isMesh && !c.isInstancedMesh && c.position.y > 1.5 && c.material?.emissive) ?? null;
        this.hatBody = body ?? null;
      } catch (_) { this.hatMesh = null; }
    }
    this.mouthOff = localOffset('baron_krallen:mouth', model, { anim: 'fire', progress: FIRE_AT }, model?.mouth ? (o) => model.mouth(o) : null, { x: 0.95, y: 2.0, z: 0 });
    this.handOff = localOffset('baron_krallen:hand', model, { anim: 'swipe', progress: SWIPE_AT }, model?.hand ? (o) => model.hand(o, 'rechts') : null, { x: 1.0, y: 1.6, z: 0.4 });
    this.resetCommon();
    this.state = 'wait';
    this.stateT = 0;
    this.placeWait();
  }

  normSection(s, i) {
    const type = s.type ?? 'turm';
    const sec = { ...s, type, index: i, id: s.id ?? `${type}${i}` };
    if (type !== 'gipfel') sec.routeObj = new Route(s.route ?? [[this.pos.x, this.pos.y, this.pos.z]]);
    return sec;
  }

  get player() { return this.level.nearestPlayer?.(this.pos) ?? this.level.player ?? null; }
  get section() { return this.sections[this.cur] ?? null; }
  get phase() { return clamp(this.maxHp - this.hp + 1, 1, 4); }
  get managed() { return bossManaged(this.level, this.spec.id); }
  get vulnerable() { return false; }
  get engaged() { return !['wait', 'between', 'gone'].includes(this.state); }
  setState(s) { this.state = s; this.stateT = 0; this.released = false; }

  resetCommon() {
    this.s = 0;
    this.attackCool = 1.4;
    this.attacks = 0;
    this.released = false;
    this.flinchT = 0;
    this.swipeTarget = null;
    this.slideFrom = 0;
    this.fruitIdx = 0;
    this.blockId = null;
    this.thrown = null;
    this.hop = null;
    this.launch = null;
    this.flee = null;
    this.lastPowN = null;
    this.lastHits = null;
    this.hinted = {};
    this.won = false;
  }

  // ------------------------------------------------------------------ Gipfel: Block und Glas

  /** Super-POW-Block des Gipfels finden bzw. anlegen (erster Schritt). */
  setupGipfel() {
    if (this.gipfelReady) return;
    this.gipfelReady = true;
    const sec = this.sections.find((s) => s.type === 'gipfel');
    if (!sec) return;
    this.gipfel = sec;
    const ps = typeof sec.pow === 'string' ? { id: sec.pow } : (sec.pow ?? {});
    const id = ps.id ?? 'superpow';
    sec.powId = id;
    const c = sec.center ?? [this.pos.x, this.pos.y, this.pos.z];
    sec.powPos = ps.pos ?? [c[0], c[1] + 2.6, c[2]];
    sec.powSize = ps.size ?? 4.5;
    let h = this.level.named.get(id);
    if (!h) {
      const kind = this.level.hasKind('super_pow_block') ? 'super_pow_block' : 'baron_superpow';
      this.level.spawn(kind, { id, pos: sec.powPos, size: sec.powSize, hits: ps.hits ?? this.maxHp, signal: sec.powSignal ?? 'super_pow' });
    }
    this.offPow = this.level.onSignal(sec.powSignal ?? 'super_pow', (data) => this.onSuperPow(data));
    if (this.level.view && hasModel('freunde_glas')) {
      this.glass = getModel('freunde_glas', { size: 2.2, ...(sec.friends ? { friends: sec.friends } : {}) });
      this.level.view.add(this.glass.root);
    }
    this.placeGlass();
  }

  get powHandle() { const s = this.gipfel; return s ? this.level.named.get(s.powId) ?? null : null; }
  get powHits() { const h = this.powHandle; return h ? (h.hits ?? 0) : 0; }

  /** Oberkante des Super-POW-Blocks (sichtbar; je Stoß 16 % niedriger). */
  powTop() {
    const s = this.gipfel;
    if (!s) return this.pos.y;
    const h = this.powHandle;
    if (h && typeof h.top === 'number') return h.top;
    return s.powPos[1] + s.powSize * (1 - 0.16 * Math.min(4, this.powHits));
  }

  /** Block nach dem letzten Stoß verschwunden (nicht mehr fest)? */
  powGone() {
    const h = this.powHandle;
    if (!h) return true;
    if (!h.done && h.state !== 'fertig') return false;
    const i = h.info?.();
    return i ? i.solid === false : true;
  }

  perchPos(out = {}) {
    const s = this.gipfel, o = s.perch ?? [s.powSize * 0.18, 0];
    out.x = s.powPos[0] + o[0]; out.y = this.powTop(); out.z = s.powPos[2] + o[1];
    return out;
  }

  placeGlass() {
    const s = this.gipfel;
    if (!s) return;
    const o = s.glass ?? [-s.powSize * 0.24, -s.powSize * 0.06];
    const g = this.glassPos ?? (this.glassPos = new THREE.Vector3());
    if (this.glassFall) {
      const f = this.glassFall, k = clamp(f.t / f.T, 0, 1);
      g.set(f.x, f.y0 + (f.y1 - f.y0) * k * k, f.z);
    } else g.set(s.powPos[0] + o[0], this.powTop(), s.powPos[2] + o[1]);
  }

  // ------------------------------------------------------------------ Archetyp

  begin() {
    if (this.state === 'wait' || this.state === 'between') this.beginSection();
  }

  /** Kampf (wieder) aufnehmen: Archetyp starten, sonst selbst beginnen. */
  engage() {
    const a = this.level.archetype;
    if (this.managed && a) {
      if (a.boss !== this && typeof a.select === 'function') {
        const cfg = (a.cfgs ?? []).find((c) => (c.id ?? 'baron') === this.spec.id);
        if (cfg && !a.started) { a.select(cfg); a.won = false; a.wonT = 0; a.calm = false; a.introSaid = false; a.seenPhase = 1; a.frame = 0; }
      }
      if (a.boss === this && !a.started && !a.won) { a.start(); return; }
      if (a.boss === this && a.started) { this.beginSection(); return; }
      return;
    }
    this.beginSection();
  }

  reset() {
    const sec = this.section;
    this.clearFight();
    if (sec) this.restoreSection(sec);
    this.visible = true;
    this.touch = false;
    this.resetCommon();
    if (sec?.type === 'gipfel') {
      const h = this.powHandle;
      if (h && typeof h.reset === 'function') h.reset();
      this.hp = this.maxHp - this.powHits;
    }
    this.setState('wait');
    this.placeWait();
  }

  clearFight() {
    for (const f of this.fires) if (!f.removed) f.kill();
    this.fires.length = 0;
    for (const c of this.clones) if (!c.removed) c.burst('abschnitt');
    this.clones.length = 0;
    for (const w of this.waves) if (!w.removed) w.kill();
    this.waves.length = 0;
    this.waveQueue.length = 0;
    this.markers.clear();
    if (this.swipeTarget?.state === 'warn') this.swipeTarget.cancelWarn();
    this.swipeTarget = null;
    this.removeBlock();
  }

  /** Stücke, Früchte, Sperre des Abschnitts zurück. */
  restoreSection(sec) {
    for (const b of this.pieces(sec, 'walls').concat(this.pieces(sec, 'breaks'))) b.restore?.();
    sec.eaten = 0;
    this.showFruits(sec);
  }

  /** Bruchstücke eines Abschnitts (Ids bzw. Daten → Entitäten, einmal angelegt). */
  pieces(sec, key) {
    const list = sec[key];
    if (!Array.isArray(list) || !list.length) return [];
    if (!sec['_' + key]) {
      sec['_' + key] = list.map((w) => {
        if (typeof w === 'string') return this.level.named.get(w) ?? null;
        if (w && typeof w === 'object') return (w.id && this.level.named.get(w.id)) || this.level.spawn('bruchstueck', w);
        return null;
      }).filter(Boolean);
    }
    return sec['_' + key];
  }

  /** Wartestelle: vor dem Abschnitt sichtbar am Routenanfang (Gipfel: auf dem Block). */
  placeWait() {
    const sec = this.section;
    if (!sec) { this.pos.copy(this.start); return; }
    if (sec.type === 'gipfel') { if (this.gipfel) { const p = this.perchPos(); this.pos.set(p.x, p.y, p.z); } }
    else { const p = sec.routeObj.posAt(0, {}); this.pos.set(p.x, p.y, p.z); this.faceRoute(p); }
    this.home.copy(this.pos);
    this.visible = sec.index === 0 || sec.type === 'gipfel' ? true : this.done[sec.index - 1] === true;
  }

  // ------------------------------------------------------------------ Abschnitte

  figureInTrigger(sec) {
    if (!sec) return false;
    for (const p of figures(this.level)) {
      if (!activeFigure(p)) continue;
      if (sec.trigger ? inBox(p.pos, sec.trigger) : this.distXZ(p, this.pos) < 6) return true;
    }
    return false;
  }

  distXZ(p, q) { return Math.hypot(p.pos.x - q.x, p.pos.z - q.z); }

  beginSection() {
    const sec = this.section;
    if (!sec) return;
    this.clearFight();
    this.resetCommon();
    this.visible = true;
    this.touch = false;
    if (sec.type === 'gipfel') {
      this.setupGipfel();
      this.hp = this.maxHp - this.powHits;
      const p = this.perchPos();
      this.pos.set(p.x, p.y + 6, p.z);
      this.introFrom = { x: p.x, y: p.y + 6, z: p.z };
    } else {
      const p = sec.routeObj.posAt(0, {});
      this.introFrom = { x: p.x, y: p.y + 4, z: p.z };
      this.pos.set(p.x, p.y + 4, p.z);
      this.showFruits(sec);
    }
    this.setState('intro');
    this.level.sfx('panic');
    const text = sec.banner ?? (sec.type === 'turm' ? 'Folge Baron Brummbär den Turm hinauf!' : sec.type === 'spiegel' ? 'Er frisst Spiegelfrüchte – Vorsicht, Doppelgänger!' : 'Stoß den Super-POW-Block an – viermal!');
    this.banner(text, { hold: 2.2, color: '#ffd080' });
  }

  finishSection(text = 'Weg frei!') {
    const sec = this.section;
    if (!sec) return;
    this.done[sec.index] = true;
    this.clearFight();
    for (const c of this.clones) c.burst('abschnitt');
    this.hideFruits(sec);
    this.cur++;
    this.visible = false;
    this.touch = false;
    this.setState('between');
    this.level.sfx('victory');
    if (text) this.banner(text, { hold: 1.6, color: '#7dffa0' });
    this.level.signal?.('baronAbschnitt', { section: sec.id, type: sec.type, index: sec.index });
    this.placeWait();
    this.visible = false;
  }

  banner(text, o = {}) { this.level.archetype?.hud?.banner?.(text, { hold: 1.6, size: 13, y: 0.36, ...o }); }

  hint(key, text, o) { if (this.hinted[key]) return; this.hinted[key] = true; this.banner(text, o); }

  // ------------------------------------------------------------------ Schritt

  update(dt) {
    this.stateT += dt;
    if (!this.gipfelReady) this.setupGipfel();
    if (!this.wrapped && !this.managed) this.wrapRespawn();
    this.markers.update(dt);
    this.fires = this.fires.filter((f) => !f.removed);
    this.clones = this.clones.filter((c) => !c.removed);
    this.waves = this.waves.filter((w) => !w.removed);
    this.stepWaveQueue(dt);
    this.stepGlass(dt);
    if (this.flinchT > 0) this.flinchT -= dt;
    if (ACTIVE.has(this.state) && this.flinchT <= 0) this.attackCool -= dt;
    const sec = this.section;
    switch (this.state) {
      case 'wait': case 'between':
        this.touch = false;
        if (sec?.type === 'gipfel' && this.gipfel) { const p = this.perchPos(); this.pos.set(p.x, p.y, p.z); this.facePlayer(dt, 2); this.hp = this.maxHp - this.powHits; }
        if (sec && this.figureInTrigger(sec)) this.engage();
        break;
      case 'intro': this.introStep(dt, sec); break;
      case 'climb': this.climbStep(dt, sec); break;
      case 'fire': this.fireStep(dt, sec); break;
      case 'swipe': this.swipeStep(dt, sec); break;
      case 'slidewarn':
        this.facePlayer(dt, 6);
        if (this.stateT >= SLIDE_WARN) { this.setState('slide'); this.slides++; this.level.sfx('wallslide'); }
        break;
      case 'slide': this.slideStep(dt, sec); break;
      case 'slideup': {
        this.s = Math.min(this.slideFrom, this.s + (sec.climb ?? 2.2) * dt);
        this.placeOnRoute(sec);
        if (this.s >= this.slideFrom - 1e-4) { this.setState('climb'); this.attackCool = Math.max(this.attackCool, 1.0); }
        break;
      }
      case 'eat':
        this.facePlayer(dt, 3);
        if (this.stateT >= EAT) { this.setState('clone'); this.level.sfx('clone'); }
        break;
      case 'clone':
        if (!this.released && this.stateT >= CLONE * 0.6) { this.released = true; this.spawnClones(sec, sec.type === 'gipfel' ? pick(sec.clones, this.phase, [0, 0, 2, 3]) : pick(sec.clones, Math.max(1, sec.eaten ?? 1), [2, 3, 4])); }
        if (this.stateT >= CLONE) { this.setState(sec.type === 'gipfel' ? 'perch' : 'climb'); this.attackCool = Math.max(this.attackCool, 1.2); }
        break;
      case 'guard': this.guardStep(dt, sec); break;
      case 'thrown': this.thrownStep(dt, sec); break;
      case 'leave': {
        const k = clamp(this.stateT / LEAVE, 0, 1);
        this.pos.y = this.leaveFrom + 9 * ease(k);
        if (k >= 1) this.finishSection('Weiter nach oben!');
        break;
      }
      case 'perch': this.perchStep(dt, sec); break;
      case 'hop': this.hopStep(dt, sec); break;
      case 'summon':
        if (this.stateT >= SUMMON) this.setState('clone');
        break;
      case 'launched': this.launchStep(dt, sec); break;
      case 'stunned':
        { const p = this.perchPos(); this.pos.set(p.x, p.y, p.z); }
        if (this.stateT >= STUN) { this.setState('perch'); this.attackCool = 1.0; this.phaseBanner(); }
        break;
      case 'defeated': this.defeatStep(dt); break;
      case 'flyaway': this.fleeStep(dt); break;
      default: break;
    }
    // Kampfkamera: beim Davonfliegen bleibt der Blick auf dem Gipfel (Glas, Freunde) – der Baron fliegt im Hintergrund davon
    if (this.state === 'flyaway' && this.gipfel) { const q = this.perchPos(); this.home.set(q.x, q.y, q.z); }
    else this.home.copy(this.pos);
    this.syncArch();
  }

  /** Ohne Boss-Archetyp: Tod der Figur setzt den Abschnitt selbst zurück. */
  wrapRespawn() {
    this.wrapped = true;
    const rt = this.level.runtime;
    if (!rt || typeof rt.respawn !== 'function') return;
    const orig = rt.respawn.bind(rt);
    rt.respawn = (...a) => { if (this.engaged && this.state !== 'gone') this.reset(); return orig(...a); };
  }

  introStep(dt, sec) {
    const k = clamp(this.stateT / INTRO, 0, 1);
    const to = sec.type === 'gipfel' ? this.perchPos() : sec.routeObj.posAt(0, {});
    const f = this.introFrom ?? to;
    const kk = clamp(k / 0.55, 0, 1);
    this.pos.set(f.x + (to.x - f.x) * kk, f.y + (to.y - f.y) * kk * kk, f.z + (to.z - f.z) * kk);
    this.facePlayer(dt, 4);
    if (kk >= 1 && !this.landedIntro) { this.landedIntro = true; this.level.sfx('land'); this.level.shake(0.35); this.level.effects?.dust(this.pos, 10, 1.6); }
    if (k >= 1) {
      this.landedIntro = false;
      this.touch = true;
      this.attackCool = 1.2;
      if (sec.type === 'gipfel') this.setState('perch');
      else { this.s = 0; this.setState('climb'); }
    }
  }

  // ------------------------------------------------------------------ Turm / Spiegel: klettern

  faceRoute(p) {
    if (p.climb && p.wall) this.yaw = Math.atan2(-p.wall.z, p.wall.x);
  }

  placeOnRoute(sec) {
    const p = sec.routeObj.posAt(this.s, this._rp ?? (this._rp = {}));
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.set(p.x, p.y, p.z);
    this.onWall = p.climb;
    if (p.climb && p.wall) this.yaw = Math.atan2(-p.wall.z, p.wall.x);
    else if (Math.hypot(p.x - ox, p.z - oz) > 1e-4) this.yaw = Math.atan2(-(p.z - oz), p.x - ox);
    return p;
  }

  climbStep(dt, sec) {
    const R = sec.routeObj;
    const p = this.player;
    let want = this.s;
    if (activeFigure(p)) {
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.y - this.pos.y, p.pos.z - this.pos.z);
      const mode = sec.follow ?? (sec.type === 'spiegel' ? 'weg' : 'hoehe');
      if (d < (sec.sight ?? 22)) {
        want = mode === 'weg' ? R.nearestS(p.pos.x, p.pos.y, p.pos.z) + (sec.ahead ?? 6) : R.sAtHeight(p.pos.y + (sec.lead ?? 3.5));
        want = Math.max(this.s, want);
      }
    }
    const seg = R.segAt(this.s);
    const v = seg.climb ? (sec.climb ?? 2.2) : (sec.walk ?? 2.6);
    const prev = this.s;
    this.s = Math.min(want, this.s + v * dt, R.L);
    this.moving = this.s > prev + 1e-5;
    this.placeOnRoute(sec);
    if (!this.moving && !this.onWall) this.facePlayer(dt, 3);
    // Spiegelfrucht am Weg
    if (sec.type === 'spiegel' && this.tryEat(sec)) return;
    // oben angekommen
    if (this.s >= R.L - 1e-3) {
      if (sec.type === 'turm' && sec.pow) { this.startGuard(sec); return; }
      if (sec.end && this.figureIn(sec.end)) { this.startLeave(); return; }
    } else if (sec.end && this.figureIn(sec.end)) { this.startLeave(); return; }
    if (this.attackCool <= 0) this.chooseAttack(sec);
  }

  figureIn(box) { for (const p of figures(this.level)) if (activeFigure(p) && inBox(p.pos, box)) return true; return false; }

  chooseAttack(sec) {
    const p = this.player;
    if (!activeFigure(p)) { this.attackCool = 0.5; return; }
    this.attacks++;
    const every = pick(sec.every, 1, [sec.type === 'spiegel' ? 3.0 : 2.6]);
    this.attackCool = every;
    // 2. Angriff: Krallenhieb auf ein nahes Wandstück; 3.: Rutschen; sonst Feuer
    if (this.attacks % 3 === 2) {
      const w = this.nearWall(sec);
      if (w) { this.startSwipe(sec, w); return; }
    }
    if (this.attacks % 3 === 0 && this.canSlide(sec, p)) { this.slideFrom = this.s; this.setState('slidewarn'); this.level.sfx('claw'); this.banner('Vorsicht – er rutscht herab!', { hold: 1.0, color: '#ffb0a0' }); return; }
    this.setState('fire');
  }

  nearWall(sec) {
    const r = sec.swipeR ?? 2.6;
    const cx = this.pos.x, cy = this.pos.y + 1.3, cz = this.pos.z;
    let best = null, bd = Infinity;
    for (const w of this.pieces(sec, 'walls')) {
      if (w.state !== 'ganz') continue;
      const d = w.distanceTo(cx, cy, cz);
      if (d < r && d < bd) { bd = d; best = w; }
    }
    return best;
  }

  canSlide(sec, p) {
    const L = sec.slide ?? (sec.type === 'spiegel' ? 0 : 4);
    if (!(L > 0) || !this.onWall) return false;
    const dy = this.pos.y - p.pos.y;
    return Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 2.4 && dy > 1.5 && dy < L + 2.5 && this.s > 1;
  }

  startSwipe(sec, w) {
    this.swipeTarget = w;
    w.startWarn(99, false);
    this.swipeWarn = sec.warn ?? 1.2;
    this.setState('swipe');
    this.hint('swipe', 'Achtung – das Wandstück bricht gleich!', { hold: 1.4, color: '#ffb070' });
  }

  swipeStep(dt, sec) {
    const w = this.swipeTarget;
    if (w) this.faceTowardXZ(w.pos.x - this.pos.x, w.pos.z - this.pos.z, dt, 6);
    const t = this.stateT - this.swipeWarn;
    if (t >= SWIPE * SWIPE_AT && !this.released) {
      this.released = true;
      this.swipes++;
      this.level.sfx('claw');
      if (w && w.breakNow('baron')) this.wallsBroken++;
      const h = this.handWorld();
      this.level.effects?.sparks(h, 10);
    }
    if (t >= SWIPE) { this.swipeTarget = null; this.setState('climb'); }
  }

  fireStep(dt, sec) {
    if (this.guarding && this.checkPow(sec)) return;
    this.facePlayer(dt, 8);
    if (!this.released && this.stateT >= FIRE * FIRE_AT) {
      this.released = true;
      if (sec.type === 'gipfel') this.fireVolley(pick(sec.fire, this.phase, [1, 2, 3, 3]), { arc: true, flight: sec.flight ?? 1.1, spread: 1.7 });
      else { const f = sec.fire ?? {}; this.fireVolley(f.shots ?? 1, { arc: f.arc !== false, speed: f.speed ?? 6.5, flight: f.flight ?? 1.0, spread: 1.4 }); }
    }
    if (this.stateT >= FIRE) this.setState(sec.type === 'gipfel' ? 'perch' : this.guarding ? 'guard' : 'climb');
  }

  mouthWorld() {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw), o = this.mouthOff;
    return { x: this.pos.x + o.x * c + o.z * s, y: this.pos.y + o.y, z: this.pos.z - o.x * s + o.z * c };
  }

  handWorld() {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw), o = this.handOff;
    return { x: this.pos.x + o.x * c + o.z * s, y: this.pos.y + o.y, z: this.pos.z - o.x * s + o.z * c };
  }

  /** Feuerbälle: Bogen mit Landemarke (Fächer um die Figur) bzw. gerade auf sie. */
  fireVolley(n, o) {
    const p = this.player;
    if (!activeFigure(p)) return;
    const m = this.mouthWorld();
    const dx = p.pos.x - m.x, dz = p.pos.z - m.z, dl = Math.hypot(dx, dz) || 1;
    const sx = -dz / dl, sz = dx / dl;
    for (let i = 0; i < n; i++) {
      const off = n <= 1 ? 0 : (i - (n - 1) / 2) * o.spread;
      let f;
      if (o.arc) {
        const tx = p.pos.x + sx * off, tz = p.pos.z + sz * off;
        let ty = p.pos.y;
        const g = groundBelow(this.level, tx, p.pos.y + 1.5, tz, 6);
        if (g !== null) ty = g;
        const T = o.flight ?? 1.0;
        const v = ballistic([m.x, m.y - 0.18, m.z], [tx, ty, tz], T);
        f = this.level.spawn('feuerkugel', { pos: [m.x, m.y - 0.18, m.z], vel: v, mode: 'bounce', owner: this, life: T + 1.3 });
        this.markers.add(tx, ty, tz, T, 0.9);
      } else {
        const sp = o.speed ?? 6.5;
        const ty = p.pos.y + p.half.y, d3 = Math.hypot(p.pos.x + sx * off - m.x, ty - m.y, p.pos.z + sz * off - m.z) || 1;
        f = this.level.spawn('feuerkugel', { pos: [m.x, m.y - 0.18, m.z], vel: [((p.pos.x + sx * off - m.x) / d3) * sp, ((ty - m.y) / d3) * sp, ((p.pos.z + sz * off - m.z) / d3) * sp], mode: 'straight', owner: this, life: 3 });
      }
      if (f) { this.fires.push(f); this.fireballs++; }
    }
    this.firesN++;
    this.level.sfx('fireball');
    this.level.effects?.sparks(m, 8);
  }

  slideStep(dt, sec) {
    const L = sec.slide ?? 4;
    const p = this.player;
    const floorS = Math.max(0, this.slideFrom - L);
    this.s = Math.max(floorS, this.s - (sec.slideSpeed ?? 5) * dt);
    this.placeOnRoute(sec);
    if (Math.floor(this.stateT / 0.1) !== Math.floor((this.stateT - dt) / 0.1)) this.level.effects?.sparks(this.handWorld(), 3);
    const reached = activeFigure(p) && this.pos.y <= p.pos.y + 0.3;
    if (this.s <= floorS + 1e-4 || reached) this.setState('slideup');
  }

  // ------------------------------------------------------------------ Turm: POW-Block

  startGuard(sec) {
    this.guarding = true;
    if (sec.guard) this.guardTo = { x: sec.guard[0], y: sec.guard[1], z: sec.guard[2] };
    if (sec.block && this.blockId === null) this.blockId = this.level.world.add({ type: 'box', min: sec.block.min, max: sec.block.max, camIgnore: true, tag: 'baron-sperre' });
    const pw = this.level.named.get(sec.pow);
    this.lastPowN = pw?.n ?? 0;
    this.setState('guard');
    this.hint('pow', 'Triff den POW-Block!', { hold: 1.8, color: '#ffe080' });
  }

  removeBlock() {
    if (this.blockId !== null && this.blockId !== undefined) { this.level.world.remove(this.blockId); }
    this.blockId = null;
    this.guarding = false;
  }

  guardStep(dt, sec) {
    if (this.guardTo) {
      const g = this.guardTo, dx = g.x - this.pos.x, dz = g.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { const st = Math.min(d, 2.6 * dt); this.pos.x += (dx / d) * st; this.pos.z += (dz / d) * st; this.pos.y += (g.y - this.pos.y) * Math.min(1, dt * 6); this.faceTowardXZ(dx, dz, dt, 8); this.moving = true; }
      else { this.pos.set(g.x, g.y, g.z); this.moving = false; this.facePlayer(dt, 4); }
    } else { this.moving = false; this.facePlayer(dt, 4); }
    if (this.checkPow(sec)) return;
    if (this.attackCool <= 0) { this.attacks++; this.attackCool = pick(sec.every, 1, [2.6]); this.setState('fire'); }
  }

  /** POW-Block benutzt (Zähler n von pow.js)? → weggeschleudert. */
  checkPow(sec) {
    const pw = this.level.named.get(sec.pow);
    const n = pw?.n ?? 0;
    if (pw && n > (this.lastPowN ?? 0)) { this.lastPowN = n; this.powThrown(sec, pw); return true; }
    return false;
  }

  /** POW getroffen: weggeschleudert, Weg frei. */
  powThrown(sec, pw) {
    this.powHit++;
    const t = sec.throwTo ?? [this.pos.x + 7, this.pos.y + 11, this.pos.z - 6];
    this.thrown = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1: t[0], y1: t[1], z1: t[2] };
    this.touch = false;
    this.removeBlock();
    this.setState('thrown');
    this.level.sfx('boss_hit');
    this.level.sfx('panic');
    this.level.shake(0.6);
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.6, z: this.pos.z }, 20);
    this.level.signal?.(sec.signal ?? 'baronPow', { section: sec.id, pos: [this.pos.x, this.pos.y, this.pos.z], pow: sec.pow });
  }

  thrownStep(dt, sec) {
    const j = this.thrown, k = clamp(this.stateT / THROWN, 0, 1);
    this.pos.set(j.x0 + (j.x1 - j.x0) * k, j.y0 + (j.y1 - j.y0) * k + 5 * k * (1 - k), j.z0 + (j.z1 - j.z0) * k);
    this.yaw += dt * 9;
    if (k >= 1) { this.level.effects?.dust(this.pos, 10, 1.6); this.level.sfx('poof'); this.finishSection('Weg frei!'); }
  }

  startLeave() {
    this.leaveFrom = this.pos.y;
    this.touch = false;
    for (const c of this.clones) c.burst('abschnitt');
    this.setState('leave');
    this.level.sfx('hop');
  }

  // ------------------------------------------------------------------ Spiegel: Früchte und Doppelgänger

  showFruits(sec) {
    this.hideFruits(sec);
    if (!Array.isArray(sec.fruits)) return;
    sec.eatenSet = new Set();
    if (!this.level.view) return;
    for (const f of sec.fruits) {
      const m = getModel('powerup_spiegel');
      m.root.position.set(f[0], f[1], f[2]);
      m.root.scale.setScalar(1.4);
      this.level.view.add(m.root);
      this.fruitModels.push({ m, f, sec });
    }
  }

  hideFruits(sec) {
    for (let i = this.fruitModels.length - 1; i >= 0; i--) {
      const e = this.fruitModels[i];
      if (sec && e.sec !== sec) continue;
      this.level.view?.remove(e.m.root); e.m.dispose?.();
      this.fruitModels.splice(i, 1);
    }
  }

  tryEat(sec) {
    if (!Array.isArray(sec.fruits) || !sec.eatenSet) return false;
    for (let i = 0; i < sec.fruits.length; i++) {
      if (sec.eatenSet.has(i)) continue;
      const f = sec.fruits[i];
      if (Math.hypot(f[0] - this.pos.x, f[1] - (this.pos.y + 1), f[2] - this.pos.z) > 1.8) continue;
      sec.eatenSet.add(i);
      sec.eaten = (sec.eaten ?? 0) + 1;
      this.eaten++;
      const e = this.fruitModels.find((x) => x.f === f);
      if (e) { this.level.view?.remove(e.m.root); e.m.dispose?.(); this.fruitModels.splice(this.fruitModels.indexOf(e), 1); }
      this.level.effects?.sparks({ x: f[0], y: f[1] + 0.4, z: f[2] }, 12);
      this.level.sfx('berry');
      this.setState('eat');
      this.hint('fruit', 'Er frisst eine Spiegelfrucht!', { hold: 1.4, color: '#ff9af0' });
      return true;
    }
    return false;
  }

  spawnClones(sec, n) {
    n = Math.min(n, 4 - this.clones.length);
    if (n <= 0) return;
    const lanes = Array.isArray(sec.lanes) && sec.lanes.length ? sec.lanes : null;
    const breaks = this.pieces(sec, 'breaks');
    const p = this.player;
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * TAU + this.clonesMade * 0.9;
      const spec = { owner: this, pos: [this.pos.x + Math.cos(a) * 1.2, this.pos.y, this.pos.z - Math.sin(a) * 1.2], breaks, speed: sec.cloneSpeed ?? 4.5, life: sec.type === 'gipfel' ? (sec.cloneLife ?? 6) : 7, pop: 0.35 + i * 0.12 };
      if (lanes) spec.lane = lanes[(this.clonesMade + i) % lanes.length];
      else if (activeFigure(p)) {
        const ang = a + 0.6, r = sec.type === 'gipfel' ? 2.6 : 2.2;
        spec.target = [p.pos.x + Math.cos(ang) * r, p.pos.y, p.pos.z - Math.sin(ang) * r];
        if (sec.type === 'gipfel' && sec.center) {
          // auf dem Gipfel bleiben
          const c = sec.center, half = (sec.size?.[0] ?? 25) / 2 - 1.5;
          spec.target[0] = clamp(spec.target[0], c[0] - half, c[0] + half);
          spec.target[2] = clamp(spec.target[2], c[2] - half, c[2] + half);
          spec.target[1] = c[1];
        }
      }
      const c = this.level.spawn('baron_klon', spec);
      if (c) { this.clones.push(c); this.clonesMade++; }
    }
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.6, z: this.pos.z }, 24);
    this.hint('clones', 'Doppelgänger! Spring drauf – sie platzen!', { hold: 1.6, color: '#ff9af0' });
  }

  onClonePopped() {}

  // ------------------------------------------------------------------ Gipfel

  perchStep(dt, sec) {
    const p = this.perchPos();
    this.pos.set(p.x, p.y, p.z);
    this.facePlayer(dt, 3);
    this.checkPowHits();
    if (this.state !== 'perch' || this.attackCool > 0) return;
    if (!activeFigure(this.player)) { this.attackCool = 0.5; return; }
    this.attacks++;
    this.attackCool = pick(sec.every, this.phase, [2.8, 2.4, 2.1, 1.8]);
    const nShock = pick(sec.shock, this.phase, [0, 1, 1, 2]), nClones = pick(sec.clones, this.phase, [0, 0, 2, 3]);
    if (nClones > 0 && this.attacks % 3 === 0 && this.clones.length < 2) { this.setState('summon'); this.level.sfx('clone'); return; }
    if (nShock > 0 && this.attacks % 2 === 0) { this.startHop(sec, nShock); return; }
    this.setState('fire');
  }

  /** Sprung auf dem Block, Landung → Schockwellen um den Block (am Gipfelboden). */
  startHop(sec, n) {
    const p = this.perchPos();
    this.hop = { y0: p.y, n };
    this.hops++;
    this.setState('hop');
    this.level.sfx('hop');
    this.hint('shock', 'Spring über die Schockwelle!', { hold: 1.4, color: '#ffe080' });
  }

  hopStep(dt, sec) {
    const p = this.perchPos();
    const T = HOP_UP + HOP_DOWN, t = this.stateT;
    const h = t < HOP_UP ? 2.4 * Math.sin((t / HOP_UP) * Math.PI / 2) : 2.4 * (1 - clamp((t - HOP_UP) / HOP_DOWN, 0, 1) ** 2);
    this.pos.set(p.x, p.y + h, p.z);
    this.checkPowHits();
    if (this.state !== 'hop') return;
    if (t >= T) {
      this.pos.y = p.y;
      this.level.sfx('slam');
      this.level.shake(0.5);
      this.level.effects?.dust(this.pos, 10, 1.6);
      const c = sec.center ?? sec.powPos, S = sec.powSize;
      for (let i = 0; i < this.hop.n; i++) this.waveQueue.push({ t: i * 0.55, x: sec.powPos[0], y: c[1], z: sec.powPos[2], r0: S * 0.6, R: sec.shockR ?? 11, speed: 6.5 - i * 0.6 });
      this.setState('perch');
    }
  }

  stepWaveQueue(dt) {
    for (let i = this.waveQueue.length - 1; i >= 0; i--) {
      const q = this.waveQueue[i];
      q.t -= dt;
      if (q.t > 0) continue;
      this.waveQueue.splice(i, 1);
      const w = this.level.spawn('schockwelle', { pos: [q.x, q.y, q.z], radius: q.R, r0: q.r0, speed: q.speed, color: 'gold', owner: this });
      if (w) { this.waves.push(w); this.wavesN++; }
    }
  }

  /** Stöße am Super-POW-Block (Zähler des Blocks; Signal kommt über onSuperPow). */
  checkPowHits() {
    const hits = this.powHits;
    if (this.lastHits === null) { this.lastHits = hits; return; }
    if (hits > this.lastHits) { this.lastHits = hits; this.applyPowHits(hits); }
  }

  onSuperPow(data) {
    const s = this.gipfel;
    if (!s || (data?.id && data.id !== s.powId)) return;
    const hits = data?.hit ?? this.powHits;
    if (this.state === 'wait' || this.state === 'between') {
      if (this.section !== s) return;
      this.engage();
    }
    if (this.lastHits === null || hits > this.lastHits) { this.lastHits = hits; this.applyPowHits(hits); }
  }

  applyPowHits(hits) {
    if (this.state === 'defeated' || this.state === 'flyaway' || this.state === 'gone' || this.section?.type !== 'gipfel') return;
    const hp = clamp(this.maxHp - hits, 0, this.maxHp);
    while (this.hp > hp) this.takeHit();
  }

  takeHit() {
    if (this.hp <= 0) return;
    this.hp--;
    this.hits++;
    this.superHits++;
    this.hitLog.push({ t: +this.level.time.toFixed(2), hp: this.hp, state: this.state });
    for (const c of this.clones) c.burst('abschnitt');
    this.level.sfx('boss_hit');
    this.level.sfx('victory');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.6, z: this.pos.z }, 22);
    this.level.onBossHit?.(this, 'superpow');
    if (this.hp <= 0) { this.startDefeat(); return; }
    this.launch = { y0: this.powTop() };
    this.setState('launched');
    if (this.hp < this.maxHp) this.banner(this.hp === 1 ? 'Noch ein Stoß!' : `Treffer! Noch ${this.hp} Stöße!`, { hold: 1.2, color: '#ffb0a0' });
  }

  launchStep(dt, sec) {
    const k = clamp(this.stateT / LAUNCH, 0, 1);
    const p = this.perchPos();
    this.pos.set(p.x, p.y + 6 * 4 * k * (1 - k), p.z);
    this.yaw += dt * 7 * (1 - k);
    this.checkPowHits();
    if (this.state !== 'launched') return;
    if (k >= 1) { this.pos.y = p.y; this.setState('stunned'); this.level.sfx('land'); this.level.effects?.dust(this.pos, 8, 1.3); }
  }

  phaseBanner() {
    const ph = this.phase;
    const t = { 2: 'Er wird wütend – Schockwellen!', 3: 'Jetzt mit Doppelgängern!', 4: 'Letzter Stoß – gib alles!' }[ph];
    if (t && !this.hinted['ph' + ph]) { this.hinted['ph' + ph] = true; this.banner(t, { hold: 1.6, size: 14, color: '#ffb040' }); this.level.sfx('gong'); }
  }

  startDefeat() {
    this.defeated = true;
    this.touch = false;
    for (const f of this.fires) if (!f.removed) f.poof?.();
    for (const w of this.waves) if (!w.removed) w.kill();
    this.waveQueue.length = 0;
    this.markers.clear();
    this.level.sfx('powerdown');
    this.level.onBossDefeated?.(this);
    const p = this.perchPos();
    this.defeatFrom = { x: this.pos.x, y: p.y, z: this.pos.z };
    this.setState('defeated');
    // das Glas wackelt, dann zerspringt es (fällt es mit dem Block, landet es erst auf dem Gipfelboden)
    this.glassState.shake = 1;
  }

  defeatStep(dt) {
    const k = clamp(this.stateT / DEFEAT, 0, 1), f = this.defeatFrom;
    this.pos.set(f.x, f.y + 7 * ease(k), f.z);
    this.yaw += dt * 10;
    if (k >= 1) this.startFlee();
  }

  startFlee() {
    const s = this.gipfel ?? {};
    const to = s.flyTo ?? [this.pos.x + 26, this.pos.y + 16, this.pos.z - 30];
    this.flee = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1: to[0], y1: to[1], z1: to[2] };
    this.setState('flyaway');
    this.level.sfx('panic');
    this.banner('„Ojemine – mein Zylinder! Das war noch nicht das letzte Mal!“', { hold: 2.6, size: 12, color: '#ffd0a0' });
  }

  fleeStep(dt) {
    const f = this.flee, k = clamp(this.stateT / FLEE, 0, 1);
    this.pos.set(f.x0 + (f.x1 - f.x0) * k, f.y0 + (f.y1 - f.y0) * k + Math.sin(k * Math.PI) * 4, f.z0 + (f.z1 - f.z0) * k);
    this.yaw += dt * 6;
    if (Math.floor(this.stateT / 0.5) !== Math.floor((this.stateT - dt) / 0.5)) this.level.sfx('hop');
    if (k >= 1) this.win();
  }

  win() {
    if (this.won) return;
    this.won = true;
    this.visible = false;
    this.setState('gone');
    this.done[this.cur] = true;
    const s = this.gipfel ?? {};
    runAction(this.level, s.onWin ?? this.spec.onWin ?? { credits: true }, { pos: s.center ?? [this.pos.x, this.pos.y, this.pos.z], source: this });
    this.level.signal?.('finaleWon', { pos: s.center ?? null, friends: this.glass?.root?.userData?.friends ?? s.friends ?? ['kruemel', 'flocke', 'hoppel', 'kobold'] });
  }

  /** Glas: wackelt, fällt mit dem Block, zerspringt, Freunde jubeln. */
  stepGlass(dt) {
    const g = this.glassState;
    if (!this.gipfel) return;
    if (this.state === 'defeated' || this.state === 'flyaway' || this.state === 'gone') {
      if (!this.glassFall && this.powGone() && g.break < 1) {
        const sec = this.gipfel, c = sec.center ?? sec.powPos;
        this.placeGlass();
        this.glassFall = { t: 0, T: 0.6, x: this.glassPos.x, z: this.glassPos.z, y0: this.glassPos.y, y1: c[1] };
      }
      if (this.glassFall && this.glassFall.t < this.glassFall.T) { this.glassFall.t += dt; if (this.glassFall.t >= this.glassFall.T) { this.level.sfx('land'); this.level.effects?.dust(this.glassPos, 8, 1.2); } }
      const falling = this.glassFall && this.glassFall.t < this.glassFall.T;
      g.timer = (g.timer ?? 0) + dt;
      if (!falling && g.timer > 0.6) {
        if (g.break === 0) { this.level.sfx('brickbreak'); this.level.effects?.sparks(this.glassPos ?? this.pos, 30); this.banner('Die Freunde sind frei!', { hold: 2.4, color: '#7dffa0' }); this.level.signal?.('freundeFrei', {}); }
        g.break = Math.min(1, g.break + dt / 1.1);
        g.shake = 0;
        if (g.break >= 1) g.cheer = 1;
      }
    }
    this.placeGlass();
  }

  // ------------------------------------------------------------------ Treffer

  /** Wurfsichel: er zuckt (Angriff unterbrochen), kein Schaden. */
  flinch() {
    if (!ACTIVE.has(this.state) || this.state === 'perch' || this.flinchT > 0) return;
    this.flinchT = FLINCH;
    this.flinches++;
    this.level.sfx('blockhit');
    this.level.effects?.sparks(this.center(), 10);
    if (this.state === 'fire' && !this.released) this.released = true;
    if (this.state === 'swipe' && !this.released && this.swipeTarget) { this.swipeTarget.cancelWarn(); this.swipeTarget = null; this.setState('climb'); }
    if (this.state === 'slidewarn') this.setState('climb');
    this.attackCool = Math.max(this.attackCool, 1.2);
    this.banner('Kratzer!', { hold: 0.7, size: 13, color: '#ffe066' });
  }

  onSichelHit() { if (this.visible && this.touch) this.flinch(); }

  onHit(kind, source) {
    if (!this.visible || !this.touch) return;
    if (kind === 'sichel' || source?.sichel) { this.flinch(); return; }
    if (kind === 'fire' || kind === 'claw' || kind === 'shell' || kind === 'throw') this.level.effects?.sparks(this.center(), 3);
  }

  onPlayer(player, contact) {
    if (!this.visible || !this.touch || !this.engaged) return 'none';
    if (['thrown', 'leave', 'defeated', 'flyaway', 'intro'].includes(this.state)) return 'none';
    if (contact.fromAbove || contact.pound) { this.bounces++; this.level.sfx('bounce'); return 'stomp'; }
    return 'hurt';
  }

  syncArch() {
    const arch = this.level.archetype;
    if (!arch || arch.boss !== this) return;
    arch.seenPhase = this.phase;
  }

  // ------------------------------------------------------------------ Darstellung

  facePlayer(dt, rate = 6) {
    const p = this.level.nearestPlayer(this.pos);
    if (!p) return;
    this.faceTowardXZ(p.pos.x - this.pos.x, p.pos.z - this.pos.z, dt, rate);
  }

  faceTowardXZ(dx, dz, dt, rate) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-5) return;
    this.yaw += wrapAngle(Math.atan2(-dz, dx) - this.yaw) * Math.min(1, dt * rate);
  }

  modelState() {
    const s = this.state, hp = Math.max(0, this.hp), base = { hp, maxHp: this.maxHp };
    if (this.flinchT > 0) return { ...base, anim: 'hit', progress: 1 - this.flinchT / FLINCH };
    switch (s) {
      case 'fire': return { ...base, anim: 'fire', progress: Math.min(1, this.stateT / FIRE) };
      case 'swipe': return this.stateT < this.swipeWarn ? { ...base, anim: this.onWall ? 'climb' : 'idle', speed: 0 } : { ...base, anim: 'swipe', progress: Math.min(1, (this.stateT - this.swipeWarn) / SWIPE) };
      case 'slidewarn': return { ...base, anim: 'climb', speed: 0 };
      case 'slide': return { ...base, anim: 'slide' };
      case 'slideup': case 'climb':
        if (this.onWall) return { ...base, anim: 'climb', speed: this.moving || s === 'slideup' ? 1.6 : 0 };
        return this.moving ? { ...base, anim: 'walk', speed: 2.4 } : { ...base, anim: 'idle' };
      case 'guard': return this.moving ? { ...base, anim: 'walk', speed: 2.4 } : { ...base, anim: 'idle' };
      case 'eat': return { ...base, anim: 'idle' };
      case 'clone': return { ...base, anim: 'clone', progress: Math.min(1, this.stateT / CLONE) };
      case 'summon': return { ...base, anim: 'idle' };
      case 'thrown': case 'intro': case 'leave': return { ...base, anim: 'fall' };
      case 'hop': return { ...base, anim: this.stateT < HOP_UP ? 'fall' : 'idle' };
      case 'launched': return { ...base, anim: this.stateT < 0.6 ? 'hit' : 'fall', progress: Math.min(1, this.stateT / 0.6) };
      case 'stunned': return { ...base, anim: 'stunned' };
      case 'defeated': return { ...base, anim: 'hit', progress: Math.min(1, this.stateT / 0.6) };
      case 'flyaway': return { ...base, anim: 'fall' };
      default: return { ...base, anim: 'idle' };
    }
  }

  syncModel() {
    if (!this.model) return;
    const r = this.model.root;
    r.position.copy(this.pos);
    r.rotation.y = this.yaw;
    r.visible = this.visible && this.state !== 'gone';
  }

  get shadowVisible() { return this.visible && this.state !== 'gone'; }

  render(dt, t) {
    super.render(dt, t);
    this.markers.render(dt);
    // Flucht: den Zylinder in der rechten Tatze schwenken
    if (this.state === 'flyaway' && this.hatMesh && this.hatBody && this.model?.hand) {
      const w = this.model.hand(new THREE.Vector3(), 'rechts');
      this.hatBody.worldToLocal(w);
      this.hatMesh.position.copy(w).add(new THREE.Vector3(0, 0.25, 0));
      this.hatMesh.rotation.set(0.5 + Math.sin(this.stateT * 9) * 0.4, this.stateT * 5, 2.4);
    }
    const g = this.glass;
    if (g && this.glassPos) {
      g.root.position.copy(this.glassPos);
      const gs = this.glassState;
      const near = activeFigure(this.player) && this.player.pos.distanceTo(this.glassPos) < 9;
      g.update(dt, { anim: gs.cheer ? 'cheer' : gs.shake || near ? 'shake' : 'idle', shake: gs.shake ? 1 : near ? 0.4 : 0, break: gs.break, cheer: gs.cheer ? 1 : 0 });
    }
    for (const e of this.fruitModels) { e.m.root.rotation.y += dt * 2; e.m.update?.(dt, { anim: 'idle' }); }
  }

  dispose() {
    this.clearFight();
    this.hideFruits(null);
    this.offPow?.();
    if (this.glass) { this.level.view?.remove(this.glass.root); this.glass.dispose?.(); this.glass = null; }
    super.dispose();
  }

  info() {
    const sec = this.section;
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, phase: this.phase, section: sec?.id ?? null, type: sec?.type ?? null, cur: this.cur,
      done: this.sections.map((s) => !!this.done[s.index]), s: +this.s.toFixed(2), visible: this.visible,
      fires: this.firesN, fireballs: this.fireballs, swipes: this.swipes, wallsBroken: this.wallsBroken, slides: this.slides, eaten: this.eaten,
      clonesMade: this.clonesMade, clones: this.clones.length, powHit: this.powHit, hops: this.hops, waves: this.wavesN, hits: this.hits,
      superHits: this.superHits, powHits: this.gipfel ? this.powHits : null, bounces: this.bounces, flinches: this.flinches,
      glass: { ...this.glassState }, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2),
    };
  }
}

export const KINDS = {
  baron_krallen: (level, spec) => new BaronKrallen(level, spec),
  baron_klon: (level, spec) => new BaronKlon(level, spec),
  bruchstueck: (level, spec) => new Bruchstueck(level, spec),
  baron_superpow: (level, spec) => new BaronSuperPow(level, spec),
};
