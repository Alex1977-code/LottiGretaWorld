// Figurengruppe des Kurs-Modus (Präzisierung Motor Welt 2): Spiegelfrucht-Klone der aktiven Heldin.
//
// Die Spiegelfrucht (Power-up 'spiegel', Bauplan „Doppelkirsche“) erzeugt neben der Figur, die sie einsammelt, einen
// Klon – bis zu MAX_FIGURES Figuren. Alle Figuren sind vollwertige `Player`-Objekte in `level.players` (Index 0 =
// Haupt-Figur = `level.player`): Level.step rechnet jede Figur mit **derselben Eingabe**, Berührungen, Angriffe,
// Sammeln, Auslöser, Checkpoint und Zielmast laufen je Figur. Hier liegt alles, was die Gruppe zusammenhält:
//
//  - addClone(src)       Klon neben src (freie Stelle mit Boden, sonst auf src), gleiche Heldin, Größe, Power-up
//                        (zeitlich begrenzte mit Restzeit); erscheint mit Hüpfer, Glitzern und kurzem Blinken
//  - remove(fig, cause)  Figur mit „Poff“ entfernen (Treffer, Absturz, verloren); war es die Haupt-Figur, wird die
//                        älteste verbleibende Haupt-Figur (Kamera, HUD, scene.player/scene.rig). Die letzte bleibt
//                        immer – ihr Tod ist ein normaler Tod (Player.die).
//  - promote(fig)        Figur wird Haupt-Figur (Röhre, Glasröhre, Kanone, Zielmast lösen das selbst aus)
//  - inputFor(fig, inp)  Eingabe je Figur: alle dieselbe; nach dem Zielmast stehen die Klone (neutrale Eingabe)
//  - afterFigures(dt)    nach dem Figuren-Schritt: Mitreisen (Haupt-Figur in Röhre/Glasröhre → die anderen folgen
//                        unsichtbar und erscheinen am Ausgang um sie herum), Jubeln am Ziel, weiches Abstoßen
//                        (kein hartes Blockieren), „Verloren“-Grenze
//  - render(dt, t)       HeroRig je Klon (gleiche Heldin, ohne Schattenwurf – siehe HeroRig `lite`), Glitzern
//  - gather(), clear()   Gruppe um die Haupt-Figur sammeln (Teleport) bzw. alle Klone entfernen (Zeit um, Neustart)
//
// Verloren: fällt eine Figur in Blickrichtung der Kamera mehr als LOST_BEHIND m hinter die vorderste zurück, steht
// sie seitlich mehr als LOST_SIDE m vom Schwerpunkt ab oder liegt sie LOST_DROP m unter der höchsten stehenden
// Figur – jeweils länger als LOST_TIME s –, geht sie mit „Poff“ verloren (deterministisch im Simulationstakt). Die
// Kamera (CameraRig) rahmt den Schwerpunkt aller Figuren und zoomt bei großer Streuung bis ×1,35 heraus.

import { Player } from './Player.js';
import { HeroRig } from './HeroRig.js';
import { getPower } from './powers.js';
import { MOVE } from './moveset.js';

export const MAX_FIGURES = 5;
export const LOST_BEHIND = 13;   // m hinter der vordersten Figur (Kamerablickrichtung)
export const LOST_SIDE = 11;     // m seitlich vom Schwerpunkt
export const LOST_DROP = 9;      // m unter der höchsten stehenden Figur
export const LOST_TIME = 0.5;    // s so weit weg, bis die Figur verloren geht
const SEP_K = 0.3;               // Anteil der Überlappung, der je Schritt aufgelöst wird (weich)
const SEP_MAX = 0.05;            // m höchstens je Schritt
const SOLID = (s) => s.solid && !s.oneWay && !s.fromBelowOnly && !s.quicksand;

const BLANK = {
  moveX: 0, moveY: 0, mag: 0, run: false, jump: false, jumpPressed: false, jumpReleased: false,
  crouch: false, crouchPressed: false, actionPressed: false, camLeft: false, camRight: false, zoom: false, pause: false, debug: false,
};

export class Squad {
  /** @param {object} scene CourseScene (level, view, player, rig) */
  constructor(scene) {
    this.scene = scene;
    this.level = scene.level;
    this.view = scene.view ?? null;
    this.rigs = new Map();       // Figur → HeroRig (Haupt-Figur: scene.rig)
    this.glitter = [];           // { fig, t } Glitzern nach dem Entstehen
    this.created = 0;
    this.lost = 0;
    this.log = [];               // letzte Ereignisse { what: 'clone'|'remove'|'promote', cause, t } (Tests)
    this._c = { x: 0, y: 0, z: 0 };
    this._push = new Map();
  }

  get figures() { return this.level.players; }
  get count() { return this.level.players.length; }

  /** Haupt-Figur und ihre Darstellung anmelden (CourseScene nach dem Erzeugen). */
  attachMain(player, rig) { if (player && rig) this.rigs.set(player, rig); }

  note(what, cause) { this.log.push({ what, cause, t: +this.level.time.toFixed(3), n: this.count }); if (this.log.length > 40) this.log.shift(); }

  // ------------------------------------------------------------------ Klon erzeugen

  addClone(src) {
    const L = this.level;
    if (!src || src.dead || src.removedFigure || !L.players.includes(src)) src = L.player;
    if (!src) return null;
    if (L.players.length >= MAX_FIGURES) {
      // volle Gruppe: nur Glitzern
      L.effects?.sparks(src.center(), 10);
      L.sfx('powerup');
      return null;
    }
    const spot = this.freeSpot(src);
    const c = new Player(L, { hero: src.hero, pos: [spot.x, spot.y, spot.z], yaw: src.yaw });
    c.clone = true;
    c.cloneId = ++this.created;
    c.big = src.big;
    c.updateHalf();
    if (src.power && src.power !== 'none') {
      c.setPower(src.power);
      if (getPower(src.power).duration) c.powerTime = src.powerTime;
    }
    // mit kleinem Hüpfer heraus, Schwung der Quelle
    c.vel.set(src.vel.x * 0.6, Math.max(src.vel.y, 4.5), src.vel.z * 0.6);
    c.enterAir(null, false);
    c.setState('fall');
    c.airMax = Math.max(c.hSpeed(), MOVE.walk * c.speedMult);
    c.invuln = 0.6;
    L.players.push(c);
    if (this.view) {
      const rig = new HeroRig(this.view, c, { lite: true });
      rig.scale *= 0.12;   // wächst weich auf volle Größe (HeroRig dämpft den Maßstab)
      this.rigs.set(c, rig);
      this.view.shadows.add({ pos: c.pos, radius: 0.5, alive: () => !c.removedFigure, visible: () => !c.hidden && !c.dead });
    }
    this.glitter.push({ fig: c, t: 0.9, k: 0 });
    const cc = c.center();
    L.effects?.sparks(cc, 18);
    L.effects?.sparks(src.center(), 8);
    L.sfx('powerup');
    L.sfx('clone');
    this.note('clone', src.clone ? 'klon' : 'haupt');
    return c;
  }

  /** Freie Stelle neben src (seitlich, dahinter, davor; Boden darunter, keine feste Form, Abstand zu Figuren). */
  freeSpot(src) {
    const w = this.level.world;
    const f = src.facingVec();
    const rx = -f.z, rz = f.x;   // senkrecht zur Blickrichtung
    const dirs = [[rx, rz], [-rx, -rz], [-f.x, -f.z], [f.x, f.z], [rx - f.x, rz - f.z], [-rx - f.x, -rz - f.z]];
    const half = { x: src.half.x * 0.95, y: src.half.y * 0.95, z: src.half.z * 0.95 };
    for (const dist of [0.85, 1.4]) {
      for (const [dx, dz] of dirs) {
        const l = Math.hypot(dx, dz) || 1;
        const x = src.pos.x + (dx / l) * dist, z = src.pos.z + (dz / l) * dist;
        const y = src.pos.y + 0.05;
        if (w.overlapAABB({ x, y: y + src.half.y, z }, half, { filter: SOLID }).length) continue;
        const g = w.raycastDown(x, y + 0.4, z, 3.5);
        if (!g || g.shape.kill) continue;
        if (this.level.players.some((p) => Math.hypot(p.pos.x - x, p.pos.z - z) < 0.5)) continue;
        // freie Sicht von src (keine Wand dazwischen)
        if (w.raycast({ x: src.pos.x, y: y + 0.5, z: src.pos.z }, { x, y: y + 0.5, z }, SOLID)) continue;
        return { x, y, z };
      }
    }
    return { x: src.pos.x, y: src.pos.y + 0.05, z: src.pos.z };
  }

  // ------------------------------------------------------------------ Entfernen / Haupt-Figur

  /** Figur mit „Poff“ entfernen. false, wenn sie fehlt oder die letzte ist. */
  remove(fig, cause = 'hit') {
    const L = this.level;
    const i = L.players.indexOf(fig);
    if (i < 0 || fig.removedFigure || L.players.length <= 1) return false;
    if (cause === 'hit') fig.dropHelmet?.('hit'); else fig.helmet = null;
    fig.dropHeld?.();
    const c = fig.center();
    fig.removedFigure = cause;
    fig.dead = true;
    fig.hidden = true;
    fig.mode = 'script';
    fig.script = { type: 'gone', cause, t: 0 };
    fig.attackInfo = null;
    L.players.splice(i, 1);
    // Poff (bei Absturz ins Nichts nur ein leiser Abgang)
    if (cause !== 'fall') {
      L.effects?.dust({ x: c.x, y: c.y - 0.3, z: c.z }, 12, 1.4);
      L.effects?.sparks(c, 10);
    }
    L.sfx(cause === 'fall' ? 'fall' : 'poff');
    if (cause === 'hit') L.sfx('hurt');
    const rig = this.rigs.get(fig);
    this.rigs.delete(fig);
    if (i === 0) this.adoptMain(L.players[0]);
    rig?.dispose();
    this.glitter = this.glitter.filter((g) => g.fig !== fig);
    if (cause !== 'clear') this.lost++;
    this.note('remove', cause);
    return true;
  }

  /** Neue Haupt-Figur übernimmt Kamera, HUD und die volle Darstellung (scene.rig). */
  adoptMain(fig) {
    const sc = this.scene;
    if (!fig) return;
    sc.player = fig;
    const rig = this.rigs.get(fig);
    if (rig) { rig.setLite(false); sc.rig = rig; }
  }

  /** Figur wird Haupt-Figur (nach vorn in level.players, Darstellung wechselt die Rolle). */
  promote(fig) {
    const L = this.level;
    const i = L.players.indexOf(fig);
    if (i <= 0 || fig.removedFigure) return false;
    const old = L.players[0];
    L.players.splice(i, 1);
    L.players.unshift(fig);
    this.rigs.get(old)?.setLite(true);
    this.adoptMain(fig);
    this.note('promote', fig.clone ? 'klon' : 'haupt');
    return true;
  }

  /** Alle Klone entfernen (Zeit abgelaufen, Neustart). */
  clear() {
    for (const f of this.level.players.slice(1)) this.remove(f, 'clear');
    for (const f of this.level.players) { f.hidden = false; if (f.script?.type === 'follow' || f.script?.type === 'cheer') { f.script = null; f.mode = 'air'; } }
  }

  /** Alle Klone um die Haupt-Figur sammeln (Teleport). */
  gather(lead = this.level.player) {
    const others = this.level.players.filter((f) => f !== lead);
    others.forEach((f, k) => this.placeNear(f, lead, k));
  }

  placeNear(f, lead, k) {
    const a = lead.yaw + Math.PI * 0.5 + k * (Math.PI * 2 / Math.max(4, this.count));
    const w = this.level.world;
    let x = lead.pos.x + Math.cos(a) * 0.8, z = lead.pos.z - Math.sin(a) * 0.8;
    if (w.overlapAABB({ x, y: lead.pos.y + f.half.y + 0.05, z }, f.half, { filter: SOLID }).length || !w.raycastDown(x, lead.pos.y + 0.4, z, 3)) { x = lead.pos.x; z = lead.pos.z; }
    f.script = null;
    f.hidden = false;
    f.pos.set(x, lead.pos.y + 0.02, z);
    f.prevPos.copy(f.pos);
    f.vel.copy(lead.vel);
    f.enterAir(null, false);
    f.setState('fall');
    f.airMax = Math.max(f.hSpeed(), MOVE.walk * f.speedMult);
    f.lostT = 0;
    f.sand = null; f.sandDepth = 0;
  }

  // ------------------------------------------------------------------ je Simulationsschritt

  inputFor(fig, input) {
    if (fig === this.level.players[0]) return input;
    const st = this.level.runtime?.status;
    return st && st !== 'play' ? BLANK : input;
  }

  afterFigures(dt) {
    const L = this.level, figs = L.players;
    if (figs.length <= 1) { const m = figs[0]; if (m?.script?.type === 'follow') { m.script = null; m.mode = 'air'; m.hidden = false; } return; }
    const main = figs[0];
    // 1) Mitreisen: Haupt-Figur in Röhre / gesteuertem Ablauf → die anderen folgen unsichtbar, danach um sie herum
    const travel = main.mode === 'script' && (main.script?.type === 'pipe' || main.script?.type === 'ride');
    let k = 0;
    for (const f of figs) {
      if (f === main || f.dead) continue;
      if (travel) { if (f.script?.type !== 'follow') f.startFollow(main); }
      else if (f.script?.type === 'follow' && main.mode !== 'script') this.placeNear(f, main, k++);
    }
    // 2) Ziel erreicht: die anderen jubeln, sobald sie stehen
    const st = L.runtime?.status;
    if (st === 'goal' || st === 'done') {
      for (const f of figs) if (f !== main && f.mode === 'ground') f.cheer();
      return;
    }
    if (travel) return;
    // 3) Weich abstoßen, 4) Verloren-Grenze
    this.separate();
    this.checkLost(dt);
  }

  /** Weiches Abstoßen sich überlappender Figuren (waagerecht, mit Kollision gegen die Welt). */
  separate() {
    const figs = this.level.players, push = this._push;
    push.clear();
    for (let i = 0; i < figs.length; i++) {
      const a = figs[i];
      if (a.dead || a.mode === 'script') continue;
      for (let j = i + 1; j < figs.length; j++) {
        const b = figs[j];
        if (b.dead || b.mode === 'script') continue;
        if (Math.abs((a.pos.y + a.half.y) - (b.pos.y + b.half.y)) >= a.half.y + b.half.y) continue;
        let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        let d = Math.hypot(dx, dz);
        const min = a.half.x + b.half.x;
        if (d >= min) continue;
        if (d < 1e-4) { const ang = i * 2.399 + j * 1.31; dx = Math.cos(ang); dz = Math.sin(ang); d = 0; } else { dx /= d; dz /= d; }
        const m = Math.min(SEP_MAX, (min - d) * SEP_K) * 0.5;
        const pa = push.get(a) ?? { x: 0, z: 0 }, pb = push.get(b) ?? { x: 0, z: 0 };
        pa.x -= dx * m; pa.z -= dz * m; pb.x += dx * m; pb.z += dz * m;
        push.set(a, pa); push.set(b, pb);
      }
    }
    const w = this.level.world;
    for (const [f, d] of push) {
      const c = f.center();
      w.moveAABB(c, f.half, { x: d.x, y: 0, z: d.z }, { step: f.mode === 'ground' ? 0.3 : 0, ignore: (s) => !!(s.quicksand || s.quicksandFloor) });
      f.pos.set(c.x, c.y - f.half.y, c.z);
    }
  }

  /** Zu weit zurückgefallene/abgedriftete Figuren gehen verloren (Klone zuerst geprüft, höchstens eine je Schritt). */
  checkLost(dt) {
    const L = this.level, figs = L.players;
    if (L.runtime?.status !== 'play') return;
    const act = figs.filter((f) => !f.dead && f.mode !== 'script');
    if (act.length < 2) return;
    const cy = L.controlYaw ?? 0;
    const fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy);
    let lead = -Infinity, top = -Infinity, cx = 0, cz = 0;
    for (const f of act) {
      lead = Math.max(lead, f.pos.x * fx + f.pos.z * fz);
      if (f.mode === 'ground' || f.mode === 'wall' || f.mode === 'swim') top = Math.max(top, f.pos.y);
      cx += f.pos.x; cz += f.pos.z;
    }
    cx /= act.length; cz /= act.length;
    // Klone zuerst (die Haupt-Figur geht nur verloren, wenn sie selbst zurückbleibt)
    const order = act.filter((f) => f !== figs[0]).concat(act.includes(figs[0]) ? [figs[0]] : []);
    for (const f of order) {
      const behind = lead - (f.pos.x * fx + f.pos.z * fz);
      const side = Math.abs((f.pos.x - cx) * rx + (f.pos.z - cz) * rz);
      const drop = top - f.pos.y;
      const far = behind > LOST_BEHIND || side > LOST_SIDE || drop > LOST_DROP;
      f.lostT = far ? (f.lostT ?? 0) + dt : 0;
      if (f.lostT > LOST_TIME && L.players.length > 1) { this.remove(f, 'lost'); return; }
    }
  }

  // ------------------------------------------------------------------ Darstellung

  render(dt, t) {
    const main = this.level.players[0];
    for (const [f, rig] of this.rigs) if (f !== main && rig !== this.scene.rig) rig.update(dt, t);
    const fx = this.level.effects;
    for (const g of this.glitter) {
      g.t -= dt;
      g.k += dt;
      if (fx && g.k >= 0.07) {
        g.k = 0;
        const c = g.fig.center();
        const a = g.t * 17;
        fx.sparks({ x: c.x + Math.cos(a) * 0.45, y: c.y + Math.sin(g.t * 9) * 0.4, z: c.z + Math.sin(a) * 0.45 }, 1);
      }
    }
    if (this.glitter.length) this.glitter = this.glitter.filter((g) => g.t > 0 && !g.fig.removedFigure);
  }

  info() {
    return {
      count: this.count, created: this.created, lost: this.lost,
      figures: this.level.players.map((f, i) => ({ i, clone: !!f.clone, id: f.cloneId ?? 0, x: +f.pos.x.toFixed(2), y: +f.pos.y.toFixed(2), z: +f.pos.z.toFixed(2), mode: f.mode, state: f.state, hidden: !!f.hidden })),
      log: this.log.slice(-8),
    };
  }

  dispose() {
    for (const [f, rig] of this.rigs) if (rig !== this.scene.rig) rig.dispose();
    this.rigs.clear();
    this.glitter.length = 0;
  }
}
