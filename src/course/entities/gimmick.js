// Gemeinsame Hilfen der Sonder-Bausteine (Kurs-Modus). Liegt bewusst außerhalb von kinds/ (die Registry
// sammelt nur kinds/*.js); Bausteine (blocks/types) und Entitäten (entities/kinds) importieren von hier.
//
// 1) Aktionen (Belohnungen/Ereignisse) – ein Format für alle Sonder-Bausteine (onAll, reward, task.reward …):
//    action = {
//      reveal: id | [id …]     benannte Objekte erscheinen (Entität/Baustein mit id und hidden: true, Stern aus
//                              LEVEL.stars mit { pos, hidden: true, id }, erscheinender Weg `appear`, Warp-Box …)
//      hide:   id | [id …]     verschwinden lassen
//      start | path: id        bewegte Plattform startet (mover mit id und idle: true)
//      stop:   id              anhalten
//      drop:   id              fallende Plattform stürzt ab (fallplatform mit id)
//      toggle / open: id       weitere Signale, falls das Ziel sie kennt
//      star:   index | { index, pos }   grüner Stern: versteckter Stern dieses Index erscheint (an pos), sonst
//                              wird er bei pos (Standard: Auslöser + 1 m) neu erzeugt
//      spawn:  { kind, …spec } | [ … ]   Entität erzeugen (pos Standard: Auslöser)
//      power:  Name            Power-up erscheint am Auslöser (wachstumsbeere, krallen, funken, riese, stern, oneup)
//      coins:  n               n Münzen gutschreiben (springen sichtbar heraus)
//      sfx:    Name            Effekt abspielen
//      pos:    [x, y, z]       Ort für star/spawn/power/coins (Standard: Auslöser)
//      fn(level, ctx)          eigene Funktion (nur aus Code)
//    }   – auch als Liste mehrerer Aktionen. Kurzformen (Inhalt von Kiste/Truhe/Baum): 'coin', 'coins:5', 'star:1',
//    Power-up-Name, Zahl (= Münzen).
//
// 2) Gimmick (Basisklasse, erweitert CourseEntity): hidden: true → unsichtbar, keine Kollision, keine Berührung,
//    bis reveal(); hide() versteckt wieder. addSolid(shape) meldet Kollisionsformen an, die mit verschwinden.
//
// 3) countdown(level) – Zeitanzeige über der Figur (Sternenring, Zeitring, Druckschalter): show(owner, s, text),
//    hide(owner).  4) flightCtl(level, from, to, opts) – Flug in hohem Bogen (Kanonen) für player.ride().
//    5) collectNear(level, player) – Münzen bei gesteuerten Abläufen einsammeln (Berührungen ruhen im Skript-Modus).

import * as THREE from 'three';
import { CourseEntity } from './CourseEntity.js';
import { normalizePower } from '../player/powers.js';

export const LIST = (v) => (v === undefined || v === null || v === false ? [] : Array.isArray(v) ? v : [v]);
export const vec = (p, out = new THREE.Vector3()) => (Array.isArray(p) ? out.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0) : out.set(p?.x ?? 0, p?.y ?? 0, p?.z ?? 0));
export const arr = (p) => (Array.isArray(p) ? p.slice(0, 3) : [p.x, p.y, p.z]);

/** Inhalt-Kurzform → Aktion (null = leer). */
export function contentAction(c, fallback = { coins: 1 }) {
  if (c === undefined || c === null) return fallback;
  if (typeof c === 'object') return c;
  if (typeof c === 'number') return { coins: c };
  const s = String(c);
  if (s === 'none' || s === 'empty' || s === '') return null;
  if (s === 'coin') return { coins: 1 };
  let m = /^coins?:(\d+)$/.exec(s);
  if (m) return { coins: +m[1] };
  m = /^star:(\d+)$/.exec(s);
  if (m) return { star: +m[1] };
  return { power: normalizePower(s) };
}

/** Signal an ein benanntes Objekt (level.named) schicken. */
export function signal(level, id, verb) {
  const o = level.named.get(id);
  if (!o) { console.warn(`[Sonder-Baustein] Ziel „${id}“ fehlt (Signal ${verb})`); return false; }
  const fn = o[verb] ?? (verb === 'hide' ? o.conceal : verb === 'path' ? o.start : null);
  if (typeof fn !== 'function') { console.warn(`[Sonder-Baustein] „${id}“ kennt das Signal ${verb} nicht`); return false; }
  fn.call(o);
  return true;
}

/** Grünen Stern geben: versteckten Stern des Index zeigen oder neu erzeugen. */
export function giveStar(level, spec, origin) {
  const index = typeof spec === 'number' ? spec : spec.index ?? 0;
  const pos = typeof spec === 'object' && spec.pos ? spec.pos : null;
  if (level.runtime?.stars?.[index]) return null; // in diesem Lauf schon eingesammelt
  const st = level.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
  if (st) {
    if (st.hidden) st.reveal(pos ?? undefined);
    return st;
  }
  const p = pos ?? [origin.x, origin.y + 1, origin.z];
  const s = level.spawn('star', { pos: p, index });
  level.effects?.sparks({ x: p[0], y: p[1] + 0.7, z: p[2] }, 18);
  level.sfx('powerup_appear');
  return s;
}

/** Aktion ausführen (Format siehe Kopfkommentar). ctx: { pos: [x,y,z] | Vector3 (Auslöser), source }. */
export function runAction(level, action, ctx = {}) {
  if (!action) return;
  if (Array.isArray(action)) { for (const a of action) runAction(level, a, ctx); return; }
  if (typeof action === 'function') { action(level, ctx); return; }
  if (typeof action !== 'object') { runAction(level, contentAction(action, null), ctx); return; }
  const o = vec(action.pos ?? ctx.pos ?? [0, 0, 0]);
  for (const verb of ['reveal', 'hide', 'start', 'stop', 'drop', 'toggle', 'open']) for (const id of LIST(action[verb])) signal(level, id, verb);
  for (const id of LIST(action.path)) signal(level, id, 'start');
  if (action.star !== undefined && action.star !== null) giveStar(level, action.star, o);
  for (const s of LIST(action.spawn)) {
    if (!s?.kind) continue;
    level.spawn(s.kind, { ...s, pos: s.pos ?? [o.x, o.y, o.z] });
  }
  if (action.power) {
    const power = normalizePower(action.power);
    level.spawn('powerup', { pos: [o.x, o.y, o.z], power, dir: action.dir });
    level.sfx('powerup_appear');
  }
  if (action.coins > 0) {
    level.addCoins(action.coins);
    level.sfx('coin');
    for (let i = 0; i < Math.min(5, action.coins); i++) level.effects?.coinPop({ x: o.x + (i - 2) * 0.25, y: o.y, z: o.z });
  }
  if (action.sfx) level.sfx(action.sfx);
  if (typeof action.fn === 'function') action.fn(level, ctx);
}

/** Steht die Figur (am Boden) auf einer Form dieses Besitzers? */
export function playerOn(level, owner) {
  const p = level.player;
  return !!p && !p.dead && p.mode === 'ground' && p.ground?.owner === owner;
}

/** Abstand Figur-Mitte ↔ Punkt (xyz). */
export function playerDist(level, x, y, z) {
  const p = level.player;
  if (!p) return Infinity;
  return Math.hypot(p.pos.x - x, p.pos.y + p.half.y - y, p.pos.z - z);
}

/**
 * Zeitschritt für Darstellungs-Animationen: max(Bild-dt, seit dem letzten Bild vergangene Simulationszeit), höchstens
 * 1 s. So folgen Ploppen/Aufklappen/Ausblenden auch dann dem Spielgeschehen, wenn die Simulation schneller läuft als
 * gezeichnet wird (Tests mit step(n), langsame Geräte; Modelle begrenzen ihr dt selbst auf 0,1 s).
 * holder merkt sich die letzte Simulationszeit (_visT).
 */
export function visDt(level, holder, dt) {
  const t = level.time;
  const sim = holder._visT === undefined ? 0 : t - holder._visT;
  holder._visT = t;
  return Math.min(1, Math.max(dt || 0, sim));
}

// ------------------------------------------------------------------ Basisklasse mit hidden/reveal

export class Gimmick extends CourseEntity {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.hidden = !!spec.hidden;
    this.solids = [];
    this.popT = 0;
    this._visT = level.time;
  }

  /** Kollisionsform (owner = this); bei hidden erst nach reveal() in der Welt. */
  addSolid(shape) {
    shape.owner = this;
    this.solids.push(shape);
    if (!this.hidden) this.shapes.push(this.level.world.add(shape));
    return shape;
  }

  setSolid(on) {
    this.removeShapes();
    if (on) for (const s of this.solids) this.shapes.push(this.level.world.add(s));
  }

  /** Erscheinen (Signal reveal). */
  reveal() {
    if (!this.hidden || this.removed) return;
    this.hidden = false;
    this.setSolid(true);
    this.popT = 0.45;
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.half.y, z: this.pos.z }, 12);
    this.level.sfx('powerup_appear');
    this.onReveal?.();
  }

  /** Verschwinden (Signal hide). */
  hide() {
    if (this.hidden || this.removed) return;
    this.hidden = true;
    this.setSolid(false);
    this.onHide?.();
  }

  // Berührung und Schatten-Blob ruhen, solange versteckt (CourseEntity setzt touch im Konstruktor → Setter)
  get touch() { return this._touch !== false && !this.hidden; }
  set touch(v) { this._touch = v; }
  get shadowVisible() { return !this.hidden; }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (!this.model) return;
    this.syncModel();
    this.model.root.visible = !this.hidden;
    if (this.hidden) return;
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    const s = (this.baseScale ?? 1) * (k < 1 ? Math.max(0.05, Math.sin(k * Math.PI * 0.5) + Math.sin(k * Math.PI) * 0.15) : 1);
    this.model.root.scale.setScalar(s);
    this.model.update?.(dt, this.modelState?.() ?? {});
  }
}

// ------------------------------------------------------------------ Zeitanzeige über der Figur

class CountdownBadge {
  constructor(level) {
    this.level = level;
    this.owner = null;
    this.key = '';
    const view = level.view;
    if (!view) return;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160; this.canvas.height = 112;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false }));
    this.sprite.scale.set(1.25, 0.875, 1);
    this.sprite.renderOrder = 20;
    this.sprite.visible = false;
    view.add(this.sprite, () => {
      const p = level.player;
      if (!p || !this.sprite.visible) return;
      this.sprite.position.set(p.pos.x, p.pos.y + p.half.y * 2 + 1.0, p.pos.z);
    });
  }

  /** Anzeigen: große Sekundenzahl, darunter text (z. B. „3/8“). color = Rand/Schrift-Akzent. */
  show(owner, seconds, text = '', color = '#3ee05a') {
    this.owner = owner;
    if (!this.sprite) return;
    const sec = Math.max(0, Math.ceil(seconds));
    const key = `${sec}|${text}|${color}`;
    if (key !== this.key) {
      this.key = key;
      const g = this.canvas.getContext('2d');
      const W = this.canvas.width, H = this.canvas.height;
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(26,24,48,0.72)';
      g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 26); g.fill();
      g.lineWidth = 6; g.strokeStyle = color; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 58px sans-serif';
      g.lineWidth = 8; g.strokeStyle = '#1a1830'; g.strokeText(String(sec), W / 2, text ? 46 : H / 2 + 2);
      g.fillStyle = sec <= 3 ? '#ffb0a0' : '#ffffff'; g.fillText(String(sec), W / 2, text ? 46 : H / 2 + 2);
      if (text) { g.font = 'bold 28px sans-serif'; g.fillStyle = color; g.fillText(text, W / 2, 88); }
      this.tex.needsUpdate = true;
    }
    this.sprite.visible = true;
  }

  hide(owner) {
    if (owner && this.owner !== owner) return;
    this.owner = null;
    if (this.sprite) this.sprite.visible = false;
  }
}

/** Zeitanzeige des Levels (eine je Level, der zuletzt zeigende Baustein besitzt sie). */
export function countdown(level) {
  if (!level._countdown) level._countdown = new CountdownBadge(level);
  return level._countdown;
}

// ------------------------------------------------------------------ Gesteuerte Abläufe

const RIDE_COLLECT = new Set(['coin', 'bluecoin', 'starcoin']);

/** Münzen (coin, bluecoin, starcoin) im Umkreis r der Figurmitte einsammeln. */
export function collectNear(level, player, r = 0.95) {
  const c = player.center();
  for (const e of level.entities) {
    if (!e.alive || e.hidden || !RIDE_COLLECT.has(e.kind)) continue;
    const ec = e.center();
    if (Math.abs(ec.x - c.x) < r && Math.abs(ec.y - c.y) < r + 0.2 && Math.abs(ec.z - c.z) < r) e.onPlayer?.(player, {});
  }
}

/**
 * Flug in hohem Bogen von from nach to (Fußpunkte, {x,y,z}) für player.ride(): Scheitel arc m über dem höheren
 * Punkt, Schwerkraft g (30). Landet exakt auf to (danach fällt die Figur die letzten Zentimeter). opts: { arc,
 * gravity, onLand(player), collect (Münzen unterwegs, Standard true) }.
 */
export function flightCtl(level, from, to, opts = {}) {
  const g = opts.gravity ?? 30;
  const apex = Math.max(from.y, to.y) + (opts.arc ?? 5);
  const vy0 = Math.sqrt(2 * g * Math.max(0.1, apex - from.y));
  const T = vy0 / g + Math.sqrt(2 * Math.max(0.01, apex - to.y) / g);
  const vx = (to.x - from.x) / T, vz = (to.z - from.z) / T;
  let t = 0;
  return {
    T,
    step(p, dt) {
      t += dt;
      const k = Math.min(t, T);
      p.pos.set(from.x + vx * k, from.y + vy0 * k - 0.5 * g * k * k, from.z + vz * k);
      p.vel.set(vx, vy0 - g * k, vz);
      if (Math.hypot(vx, vz) > 0.3) p.yaw = Math.atan2(-vz, vx);
      p.setState(p.vel.y > 0 ? 'jump' : 'fall');
      if (opts.collect !== false) collectNear(level, p);
      if (t >= T) { p.pos.set(to.x, to.y + 0.02, to.z); return true; }
      return false;
    },
    exit(p) { p.vel.set(0, -2, 0); opts.onLand?.(p); },
  };
}
