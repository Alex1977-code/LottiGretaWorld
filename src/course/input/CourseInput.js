// Kurs-Eingabe: vereinheitlicht Tastatur, Touch (CourseTouch schreibt in `touch`) und Testeingaben
// (`setOverride`, von window.__course.setInput genutzt). Die Simulation liest je Schritt `sample()`:
//
//   moveX, moveY   Stick -1..1 (moveY > 0 = nach vorn/oben im Bild), mag = Länge 0..1
//   run            Rennen gehalten (Shift / Y-Knopf / Touch-Stick ≥ 85 %)
//   jump, jumpPressed, jumpReleased        Sprung (Leertaste / A)
//   crouch, crouchPressed                  Ducken (Strg / C / B)
//   actionPressed                          Aktion (Shift-Druck, X / Y-Knopf)
//   camLeft, camRight, zoom, pause, debug  Einmal-Flanken
//
// Flanken aus Tastatur-Ereignissen werden bis zum nächsten Schritt vorgemerkt, damit kurze Tipps
// zwischen zwei Simulationsschritten nicht verloren gehen.

import Phaser from 'phaser';

const RUN_STICK = 0.85;

export class CourseInput {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.override = null;
    this.prev = { jump: false, crouch: false, action: false };
    this.pending = { jump: false, jumpUp: false, crouch: false, action: false, camLeft: false, camRight: false, zoom: false, pause: false, debug: false };
    // Touch-Zustand (CourseTouch): x/y Stick, gehaltene Knöpfe und Flanken
    this.touch = { x: 0, y: 0, active: false, jump: false, crouch: false, run: false, jumpPressed: false, crouchPressed: false, actionPressed: false, camLeft: false, camRight: false, zoom: false };
    this.state = this.blank();

    const kb = scene.input.keyboard;
    this.kb = kb;
    if (kb) {
      const KC = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({
        left: KC.LEFT, right: KC.RIGHT, up: KC.UP, down: KC.DOWN,
        a: KC.A, d: KC.D, w: KC.W, s: KC.S,
        space: KC.SPACE, j: KC.J, shift: KC.SHIFT, ctrl: KC.CTRL, c: KC.C, x: KC.X,
      });
      kb.addCapture([KC.LEFT, KC.RIGHT, KC.UP, KC.DOWN, KC.SPACE]);
      const press = (flag) => (ev) => { if (!ev.repeat) this.pending[flag] = true; };
      this.handlers = [
        ['keydown-SPACE', press('jump')], ['keydown-J', press('jump')],
        ['keyup-SPACE', press('jumpUp')], ['keyup-J', press('jumpUp')],
        ['keydown-CTRL', press('crouch')], ['keydown-C', press('crouch')],
        ['keydown-SHIFT', press('action')], ['keydown-X', press('action')],
        ['keydown-Q', press('camLeft')], ['keydown-E', press('camRight')], ['keydown-Z', press('zoom')],
        ['keydown-ESC', press('pause')], ['keydown-P', press('pause')], ['keydown-F2', press('debug')],
      ];
      for (const [ev, fn] of this.handlers) kb.on(ev, fn);
    }
  }

  blank() {
    return {
      moveX: 0, moveY: 0, mag: 0, run: false,
      jump: false, jumpPressed: false, jumpReleased: false,
      crouch: false, crouchPressed: false, actionPressed: false,
      camLeft: false, camRight: false, zoom: false, pause: false, debug: false,
    };
  }

  /** Testeingabe setzen ({ x, y, jump, crouch, run, action }) oder mit null zurück auf Tastatur/Touch. */
  setOverride(o) {
    this.override = o ? { x: 0, y: 0, jump: false, crouch: false, run: false, action: false, ...o } : null;
  }

  /** Einmal je Simulationsschritt: Zustand inkl. Flanken berechnen. */
  sample() {
    const st = this.state;
    const p = this.pending, t = this.touch;
    let x = 0, y = 0, jump = false, crouch = false, run = false, action = false, analog = false;
    if (this.override) {
      const o = this.override;
      x = o.x; y = o.y; jump = !!o.jump; crouch = !!o.crouch; run = !!o.run; action = !!o.action;
      st.camLeft = st.camRight = st.zoom = st.pause = st.debug = false;
    } else {
      const k = this.keys;
      if (k) {
        if (k.left.isDown || k.a.isDown) x -= 1;
        if (k.right.isDown || k.d.isDown) x += 1;
        if (k.up.isDown || k.w.isDown) y += 1;
        if (k.down.isDown || k.s.isDown) y -= 1;
        jump = k.space.isDown || k.j.isDown;
        crouch = k.ctrl.isDown || k.c.isDown;
        run = k.shift.isDown;
      }
      if (x === 0 && y === 0 && (t.x || t.y)) { x = t.x; y = t.y; analog = true; }
      jump = jump || t.jump || p.jump;
      crouch = crouch || t.crouch;
      run = run || t.run;
      action = p.action || t.actionPressed;
      st.camLeft = p.camLeft || t.camLeft;
      st.camRight = p.camRight || t.camRight;
      st.zoom = p.zoom || t.zoom;
      st.pause = p.pause;
      st.debug = p.debug;
    }
    let mag = Math.hypot(x, y);
    if (mag > 1) { x /= mag; y /= mag; mag = 1; }
    if (analog && mag >= RUN_STICK) run = true;
    st.moveX = x; st.moveY = y; st.mag = mag; st.run = run;
    // Flanken: gehaltener Zustand gegenüber dem letzten Schritt plus vorgemerkte Tastenereignisse
    st.jumpPressed = (jump && !this.prev.jump) || (!this.override && (p.jump || t.jumpPressed));
    st.jumpReleased = (!jump && this.prev.jump) || (!this.override && p.jumpUp);
    st.jump = jump && !(p.jumpUp && !this.keyJumpDown());
    st.crouch = crouch;
    st.crouchPressed = (crouch && !this.prev.crouch) || (!this.override && (p.crouch || t.crouchPressed));
    st.actionPressed = this.override ? (action && !this.prev.action) : action;
    this.prev.jump = st.jump; this.prev.crouch = crouch; this.prev.action = action;
    for (const key of Object.keys(p)) p[key] = false;
    t.jumpPressed = false; t.crouchPressed = false; t.actionPressed = false; t.camLeft = false; t.camRight = false; t.zoom = false;
    return st;
  }

  keyJumpDown() { const k = this.keys; return !!k && (k.space.isDown || k.j.isDown || this.touch.jump); }

  destroy() {
    if (this.kb && this.handlers) for (const [ev, fn] of this.handlers) this.kb.off(ev, fn);
  }
}
