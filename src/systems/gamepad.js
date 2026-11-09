// Controller (Gamepad-API; Bluetooth- und USB-Controller, auch über Spiele-Streaming weitergereichte): macht das ganze
// Spiel ohne Tastatur und Touch bedienbar. Je Bild wird der erste Controller gelesen (navigator.getGamepads()):
//
//   - Knöpfe werden zu Tasten (künstliche keydown/keyup-Ereignisse auf window – alle vorhandenen Tastenwege der Szenen
//     gelten unverändert), je nach oberster Szene:
//       Kurs-Level      A Sprung (Leertaste) · B Ducken/Stampfen (C) · X/Y/RT Rennen + Aktion (Shift) · LT Ducken ·
//                       LB/RB Kamera drehen (Q/E) · R3 Zoom (Z) · Start Pause (Esc) · Steuerkreuz Pfeiltasten
//       Kurs-Weltkarte  A/Start Level betreten (Enter) · B Sprung · X Figur wechseln (Tab) · Y Kostüm (K) · Back Ton (M) ·
//                       RT Rennen · LB/RB Kamera
//       Klassik         A Sprung · B Sturzflug (Pfeil runter) · X/Y Aktion · Start Pause; Karte: A Start, X Figur
//       Menüs           (Pause, Ergebnis, Abfragen …) Steuerkreuz/Stick wählt einen Knopf (heller Rahmen), A drückt ihn,
//                       B/Start = Esc (zurück/weiter), Back Ton
//   - Der linke Stick steuert die Figur stufenlos: CourseInput liest stick() (wie den Touch-Stick; ganz gekippt = rennen).
//     Ohne CourseInput (Klassik) wird er zu Pfeiltasten. Der rechte Stick dreht die Kamera (Q/E je Kipp).
//   - Wechselt die oberste Szene, werden alle gehaltenen Tasten losgelassen (nichts bleibt hängen).
//
// Schnittstelle: installGamepad(game) (einmal, main.js) · gamepad.stick() → { x, y, mag } (y > 0 = nach vorn) ·
// gamepad.connected · gamepad.anyButton() · gamepad.info() (Tests) · gamepad.claimAnalog()/releaseAnalog() (CourseInput).

import Phaser from 'phaser';
import { GAME } from '../config.js';

const K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, ENTER: 13, ESC: 27, TAB: 9, SHIFT: 16, C: 67, X: 88, Q: 81, E: 69, Z: 90, M: 77, K: 75 };
const NAME = { 37: ['ArrowLeft', 'ArrowLeft'], 38: ['ArrowUp', 'ArrowUp'], 39: ['ArrowRight', 'ArrowRight'], 40: ['ArrowDown', 'ArrowDown'], 32: [' ', 'Space'], 13: ['Enter', 'Enter'], 27: ['Escape', 'Escape'], 9: ['Tab', 'Tab'], 16: ['Shift', 'ShiftLeft'], 67: ['c', 'KeyC'], 88: ['x', 'KeyX'], 81: ['q', 'KeyQ'], 69: ['e', 'KeyE'], 90: ['z', 'KeyZ'], 77: ['m', 'KeyM'], 75: ['k', 'KeyK'] };
// Standard-Belegung: 0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 Back · 9 Start · 10 L3 · 11 R3 · 12–15 Steuerkreuz
const DPAD = { 12: K.UP, 13: K.DOWN, 14: K.LEFT, 15: K.RIGHT };
const MAPS = {
  play: { 0: K.SPACE, 1: K.C, 2: K.SHIFT, 3: K.SHIFT, 4: K.Q, 5: K.E, 6: K.C, 7: K.SHIFT, 9: K.ESC, 11: K.Z, ...DPAD },
  map: { 0: K.ENTER, 1: K.SPACE, 2: K.TAB, 3: K.K, 4: K.Q, 5: K.E, 7: K.SHIFT, 8: K.M, 9: K.ENTER, 11: K.Z, ...DPAD },
  classic: { 0: K.SPACE, 1: K.DOWN, 2: K.X, 3: K.X, 8: K.M, 9: K.ESC, ...DPAD },
  classicmap: { 0: K.ENTER, 2: K.TAB, 8: K.M, 9: K.ENTER, ...DPAD },
  menu: { 1: K.ESC, 8: K.M, 9: K.ESC },
};
const DEAD = 0.22, DIGITAL = 0.55, FLICK = 0.6;
const REPEAT_FIRST = 0.34, REPEAT_NEXT = 0.15;

const state = {
  game: null, connected: false, id: '', ctx: '', scene: null, scope: null,
  lx: 0, ly: 0, mag: 0, rx: 0,
  buttons: [], held: new Map(), keyOfButton: new Map(), stickKeys: new Set(),
  analogUsers: 0, flick: 0, nav: { dir: null, t: 0 }, focus: null, ring: null, ringScene: null, last: 0, toast: null,
};

function keyEvent(type, code) {
  const [key, phys] = NAME[code] ?? ['', ''];
  const ev = new KeyboardEvent(type, { key, code: phys, bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'keyCode', { get: () => code });
  Object.defineProperty(ev, 'which', { get: () => code });
  window.dispatchEvent(ev);
}
/** Taste halten (mehrere Knöpfe dürfen dieselbe Taste halten: erst der letzte lässt sie los). */
function hold(code) {
  const n = state.held.get(code) ?? 0;
  state.held.set(code, n + 1);
  if (n === 0) keyEvent('keydown', code);
}
function release(code) {
  const n = state.held.get(code) ?? 0;
  if (n <= 0) return;
  if (n === 1) { state.held.delete(code); keyEvent('keyup', code); } else state.held.set(code, n - 1);
}
function tap(code) { keyEvent('keydown', code); keyEvent('keyup', code); }
function releaseAll() {
  for (const code of [...state.held.keys()]) { state.held.delete(code); keyEvent('keyup', code); }
  state.keyOfButton.clear();
  state.stickKeys.clear();
}

// ------------------------------------------------------------------ Zusammenhang (oberste Szene)

function context() {
  const g = state.game;
  const scenes = g.scene.getScenes(true);
  for (let i = scenes.length - 1; i >= 0; i--) {
    const s = scenes[i], key = s.scene.key;
    if (key === 'CourseUI' || key === 'UI') continue;
    if (key === 'Course') return { ctx: 'play', scene: s, scope: null };
    if (key === 'CourseMap') {
      const c = s.hud?.confirm?.c ?? null;
      return c ? { ctx: 'menu', scene: s, scope: c } : { ctx: 'map', scene: s, scope: null };
    }
    if (key === 'Play') return { ctx: 'classic', scene: s, scope: null };
    if (key === 'WorldMap') return { ctx: 'classicmap', scene: s, scope: null };
    return { ctx: 'menu', scene: s, scope: null };
  }
  return { ctx: 'menu', scene: null, scope: null };
}

// ------------------------------------------------------------------ Menü-Auswahl (Knöpfe der obersten Szene)

function shown(o) {
  for (let q = o; q; q = q.parentContainer) if (!q.visible || q.active === false) return false;
  return true;
}
function inScope(o, scope) {
  if (!scope) return true;
  for (let q = o; q; q = q.parentContainer) if (q === scope) return true;
  return false;
}
function candidates() {
  const s = state.scene;
  const list = s?.input?._list ?? [];
  const out = [];
  for (const o of list) {
    if (!o.input?.enabled || !shown(o) || !inScope(o, state.scope) || typeof o.getBounds !== 'function') continue;
    const b = o.getBounds();
    if (!(b.width > 0 && b.height > 0) || (b.width > GAME.width * 0.8 && b.height > GAME.height * 0.8)) continue;   // keine Flächen-Fänger
    out.push({ o, b, x: b.centerX, y: b.centerY });
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
function moveFocus(dx, dy) {
  const list = candidates();
  if (!list.length) { state.focus = null; return; }
  const cur = list.find((c) => c.o === state.focus);
  if (!cur) { state.focus = list[0].o; return; }
  let best = null, bestD = Infinity;
  for (const c of list) {
    if (c === cur) continue;
    const ex = c.x - cur.x, ey = c.y - cur.y, along = ex * dx + ey * dy;
    if (along <= 1) continue;
    const d = along + Math.abs(ex * dy - ey * dx) * 2.5;   // quer liegende zählen schwerer
    if (d < bestD) { bestD = d; best = c; }
  }
  if (best) state.focus = best.o;
}
function pressFocus() {
  const list = candidates();
  const cur = list.find((c) => c.o === state.focus) ?? list[0];
  if (!cur) { tap(K.ENTER); return; }                       // Szene ohne Knöpfe (Abspann, Klassik-Ziel): Enter
  state.focus = cur.o;
  cur.o.emit(Phaser.Input.Events.POINTER_DOWN, state.scene.input.activePointer, 0, 0, { stopPropagation() {} });
  cur.o.emit(Phaser.Input.Events.POINTER_UP, state.scene.input.activePointer, 0, 0, { stopPropagation() {} });
}
function drawRing(t) {
  const s = state.ctx === 'menu' ? state.scene : null;
  if (state.ring && (state.ringScene !== s || !state.ring.scene)) { try { state.ring.destroy(); } catch { /* Szene endet */ } state.ring = null; state.ringScene = null; }
  if (!s || !state.connected) return;
  const list = candidates();
  let cur = list.find((c) => c.o === state.focus);
  if (!cur && list.length) { cur = list[0]; state.focus = cur.o; }
  if (!cur) { state.ring?.clear(); return; }
  if (!state.ring) {
    state.ring = s.add.graphics().setDepth(100000).setScrollFactor(cur.o.scrollFactorX ?? 1, cur.o.scrollFactorY ?? 1);
    state.ringScene = s;
  }
  const b = cur.b, pad = 3 + Math.sin(t * 6) * 0.8;
  state.ring.clear();
  state.ring.lineStyle(2.4, 0xffffff, 0.95).strokeRoundedRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2, 6);
  state.ring.lineStyle(1.2, 0xffc83a, 1).strokeRoundedRect(b.x - pad - 1.6, b.y - pad - 1.6, b.width + pad * 2 + 3.2, b.height + pad * 2 + 3.2, 7);
}

// ------------------------------------------------------------------ Lesen

function pickPad() {
  let pads = [];
  try { pads = navigator.getGamepads?.() ?? []; } catch { pads = []; }
  for (const p of pads) if (p && p.connected !== false && p.buttons?.length >= 4) return p;
  return null;
}
const pressed = (b) => !!b && (b.pressed || b.value > 0.5);

function read(pad) {
  const ax = pad.axes ?? [];
  let x = ax[0] ?? 0, y = ax[1] ?? 0;
  let mag = Math.hypot(x, y);
  if (mag < DEAD) { x = 0; y = 0; mag = 0; } else { const k = Math.min(1, (mag - DEAD) / (1 - DEAD)) / mag; x *= k; y *= k; mag = Math.min(1, Math.hypot(x, y)); }
  state.lx = x; state.ly = -y; state.mag = mag;
  state.rx = Math.abs(ax[2] ?? 0) > DEAD ? ax[2] : 0;
  const b = pad.buttons.map(pressed);
  // Controller ohne Standard-Belegung: Steuerkreuz oft als Achsenpaar 6/7
  if (pad.mapping !== 'standard' && ax.length >= 8) {
    b[14] = b[14] || ax[6] < -0.5; b[15] = b[15] || ax[6] > 0.5; b[12] = b[12] || ax[7] < -0.5; b[13] = b[13] || ax[7] > 0.5;
  }
  return b;
}

function step(now) {
  const dt = Math.min(0.1, (now - state.last) / 1000 || 0);
  state.last = now;
  const pad = pickPad();
  if (!pad) {
    if (state.connected) { state.connected = false; releaseAll(); state.buttons = []; state.lx = state.ly = state.mag = state.rx = 0; drawRing(0); }
    return;
  }
  if (!state.connected) { state.connected = true; state.id = pad.id; toast('🎮 Controller verbunden'); }
  const c = context();
  if (c.ctx !== state.ctx || c.scene !== state.scene || c.scope !== state.scope) {
    releaseAll();
    Object.assign(state, c);
    state.focus = null; state.nav.dir = null;
    // Knöpfe, die beim Wechsel gehalten sind, zählen erst nach dem Loslassen wieder (A im Menü ≠ Sprung danach)
    state.buttons = read(pad);
    return;
  }
  const b = read(pad), prev = state.buttons, map = MAPS[state.ctx] ?? {};
  const menu = state.ctx === 'menu';
  for (let i = 0; i < b.length; i++) {
    if (b[i] === !!prev[i]) continue;
    if (menu && i === 0) { if (b[i]) pressFocus(); continue; }
    if (menu && DPAD[i]) continue;
    const code = map[i];
    if (!code) continue;
    if (b[i]) { state.keyOfButton.set(i, code); hold(code); } else if (state.keyOfButton.has(i)) { release(state.keyOfButton.get(i)); state.keyOfButton.delete(i); }
  }
  state.buttons = b;
  // Richtung aus Stick und Steuerkreuz
  const dx = (b[15] ? 1 : 0) - (b[14] ? 1 : 0) || (Math.abs(state.lx) > DIGITAL ? Math.sign(state.lx) : 0);
  const dy = (b[13] ? 1 : 0) - (b[12] ? 1 : 0) || (Math.abs(state.ly) > DIGITAL ? -Math.sign(state.ly) : 0);
  if (menu) {
    const dir = dx || dy ? (Math.abs(dx) >= Math.abs(dy) && dx ? `x${dx}` : `y${dy}`) : null;
    const nav = state.nav;
    if (dir !== nav.dir) { nav.dir = dir; nav.t = REPEAT_FIRST; if (dir) moveFocus(dir[0] === 'x' ? +dir.slice(1) : 0, dir[0] === 'y' ? +dir.slice(1) : 0); }
    else if (dir) { nav.t -= dt; if (nav.t <= 0) { nav.t = REPEAT_NEXT; moveFocus(dir[0] === 'x' ? +dir.slice(1) : 0, dir[0] === 'y' ? +dir.slice(1) : 0); } }
  } else if (state.analogUsers <= 0) {
    // ohne stufenlose Abnehmer (Klassik): Stick als Pfeiltasten
    const want = new Set();
    if (Math.abs(state.lx) > DIGITAL) want.add(state.lx < 0 ? K.LEFT : K.RIGHT);
    if (Math.abs(state.ly) > DIGITAL) want.add(state.ly > 0 ? K.UP : K.DOWN);
    for (const code of [...state.stickKeys]) if (!want.has(code)) { state.stickKeys.delete(code); release(code); }
    for (const code of want) if (!state.stickKeys.has(code)) { state.stickKeys.add(code); hold(code); }
  }
  // rechter Stick: Kamera je Kipp eine Stufe drehen
  if (state.ctx === 'play' || state.ctx === 'map') {
    const f = state.rx < -FLICK ? -1 : state.rx > FLICK ? 1 : Math.abs(state.rx) < 0.3 ? 0 : state.flick;
    if (f !== state.flick) { state.flick = f; if (f) tap(f < 0 ? K.Q : K.E); }
  }
  drawRing(now / 1000);
}

function toast(text) {
  try {
    state.toast?.remove();
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = 'position:fixed;left:50%;bottom:8%;transform:translateX(-50%);padding:8px 16px;border-radius:14px;background:rgba(20,20,46,.82);color:#fff;font:600 15px system-ui,sans-serif;z-index:50;pointer-events:none;transition:opacity .5s';
    document.body.appendChild(d);
    state.toast = d;
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 600); }, 2200);
  } catch { /* ohne DOM (Tests) */ }
}

export const gamepad = {
  get connected() { return state.connected; },
  /** Linker Stick, Totzone abgezogen: x nach rechts, y nach vorn (oben), mag 0..1. */
  stick() { return state.connected ? { x: state.lx, y: state.ly, mag: state.mag } : null; },
  /** Irgendein Knopf gedrückt (z. B. zum Überspringen eines Anflugs). */
  anyButton() { return state.connected && state.buttons.some(Boolean); },
  claimAnalog() { state.analogUsers++; },
  releaseAnalog() { state.analogUsers = Math.max(0, state.analogUsers - 1); },
  info() { return { connected: state.connected, id: state.id, ctx: state.ctx, scene: state.scene?.scene?.key ?? null, held: [...state.held.keys()], focus: state.focus ? (state.focus.text ?? state.focus.list?.find?.((q) => q.text)?.text ?? state.focus.type) : null, analogUsers: state.analogUsers }; },
};

let installed = false;
/** Einmal beim Start: liest den Controller je Bild (unabhängig von den Szenen). */
export function installGamepad(game) {
  if (installed || typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return gamepad;
  installed = true;
  state.game = game;
  const loop = (now) => { try { step(now); } catch (e) { console.warn('[Controller]', e); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  return gamepad;
}
