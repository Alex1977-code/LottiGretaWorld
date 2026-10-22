// Glückshaus der Kurs-Karte (Bauplan Kartenelemente: „Glückshaus (Münz-Spielautomat)“): ein kleines Haus mit
// gestreifter Markise, Kleeblatt und Lichterkette; davor ein Spielautomat mit drei Walzen, Hebel und Münzschale.
//
// Spielen: auf die Matte vor dem Automaten stellen, A / Leertaste / Enter (Touch: „Los!“) zieht den Hebel.
//   Einsatz 10 Bitcoins (ohne 10 Bitcoins: kein Spiel, Hinweis). Drei Walzen drehen sich und halten nacheinander.
//   Gewinne:  3 × Bitcoin → 30 Bitcoins     3 × Herz → 1 Leben (+ 10 Bitcoins)
//             3 × Funkenblüte / Krallen-Anzug / Funkelstern → dieses Power-up fürs nächste Level (wie Beerenhaus)
//             2 gleiche (außer Baron) → Einsatz zurück (10 Bitcoins)      3 × Baron Brummbär / nichts → leer
// Das Ergebnis ist deterministisch: Zufall aus der Nummer der Drehung (courseSave.nextSlotSpin()); Tests können das
// nächste Ergebnis festlegen (force). Ablauf im Simulationstakt (step), Darstellung je Bild (render).
//
// Weltdaten: houses: [{ kind: 'glueck', pos: [x, y, z] (Haus), yaw, machine: [x, y, z], pad: [x, y, z], stake: 10 }]

import * as THREE from 'three';
import { mix, TAU, cached, vcol, basic, canvasTexture, starShape } from '../models/lib/kit.js';
import { Rnd } from '../../three/world/geometry.js';
import { LowBuild as Build, place } from './desert.js';

export const SLOT_SYMBOLS = ['coin', 'oneup', 'funken', 'krallen', 'stern', 'baron'];
export const SLOT_STAKE = 10;
const WEIGHTS = [0.3, 0.14, 0.14, 0.14, 0.1, 0.18];
const STOP_AT = [1.15, 1.65, 2.15];      // s: Walzen halten nacheinander
const PAY_AT = 2.5;                       // s: Gewinn auszahlen
const DONE_AT = 3.1;                      // s: wieder spielbar
export const PAD_R = 1.15;

function pick(rnd) {
  let u = rnd.frac();
  for (let i = 0; i < WEIGHTS.length; i++) { u -= WEIGHTS[i]; if (u <= 0) return SLOT_SYMBOLS[i]; }
  return SLOT_SYMBOLS[0];
}

/** Ergebnis der Drehung Nr. spin (deterministisch, kinderfreundlich: oft Paare, manchmal Drillinge). */
export function slotResult(spin) {
  const rnd = new Rnd(0x51075 + spin * 7919);
  const a = pick(rnd);
  const b = rnd.frac() < 0.5 ? a : pick(rnd);
  const c = b === a ? (rnd.frac() < 0.42 ? a : pick(rnd)) : (rnd.frac() < 0.3 ? a : pick(rnd));
  return [a, b, c];
}

/** Gewinn zu einem Ergebnis. */
export function slotPrize([a, b, c]) {
  if (a === b && b === c) {
    if (a === 'coin') return { kind: 'coins', n: 30, text: '3 × Bitcoin – 30 Bitcoins!' };
    if (a === 'oneup') return { kind: 'life', n: 1, coins: 10, text: '3 × Herz – ein Extraleben!' };
    if (a === 'baron') return { kind: 'none', text: 'Baron Brummbär grinst – leider nichts!' };
    return { kind: 'power', power: a, text: null };
  }
  if ((a === b && a !== 'baron') || (b === c && b !== 'baron') || (a === c && a !== 'baron')) return { kind: 'coins', n: 10, text: 'Zwei gleiche – Einsatz zurück!' };
  return { kind: 'none', text: 'Schade – nochmal?' };
}

// ------------------------------------------------------------------ Darstellung

/** Walzen-Textur: 6 Bildchen nebeneinander (u = um die Walze), jedes um 90° gedreht (siehe Walzen-UV). */
function reelTexture() {
  return canvasTexture('map:slotreel', 768, 128, (ctx, w, h) => {
    const cell = 128;
    SLOT_SYMBOLS.forEach((sym, i) => {
      ctx.save();
      ctx.translate(i * cell + cell / 2, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = i % 2 ? '#fff8ec' : '#ffffff';
      ctx.fillRect(-cell / 2, -cell / 2, cell, cell);
      ctx.fillStyle = '#e8dcc8'; ctx.fillRect(-cell / 2, cell / 2 - 4, cell, 4);
      drawSymbol(ctx, sym);
      ctx.restore();
    });
  });
}

function drawSymbol(ctx, sym) {
  ctx.lineJoin = 'round';
  if (sym === 'coin') {
    ctx.fillStyle = '#f7931a'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = '900 46px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('₿', 0, 3);
  } else if (sym === 'oneup') {
    ctx.fillStyle = '#ff4a6a';
    ctx.beginPath(); ctx.moveTo(0, 36); ctx.bezierCurveTo(-60, -6, -26, -50, 0, -18); ctx.bezierCurveTo(26, -50, 60, -6, 0, 36); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '900 26px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+1', 0, -2);
  } else if (sym === 'funken') {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2;
      ctx.fillStyle = k % 2 ? '#ff5a2a' : '#ff7a3a';
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * 22, Math.sin(a) * 22, 19, 13, a, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(-5, -2, 2.5, 0, TAU); ctx.arc(5, -2, 2.5, 0, TAU); ctx.fill();
  } else if (sym === 'krallen') {
    ctx.fillStyle = '#ffb52e';
    ctx.beginPath(); ctx.ellipse(0, 12, 24, 20, 0, 0, TAU); ctx.fill();
    for (const [x, y] of [[-26, -14], [-9, -28], [9, -28], [26, -14]]) { ctx.beginPath(); ctx.ellipse(x, y, 9, 12, x * 0.02, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.ellipse(0, 14, 13, 10, 0, 0, TAU); ctx.fill();
  } else if (sym === 'stern') {
    ctx.fillStyle = '#ffd21a'; ctx.strokeStyle = '#e09a00'; ctx.lineWidth = 5;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 18 : 42; if (!k) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-9, -8, 5, 12); ctx.fillRect(4, -8, 5, 12);
  } else if (sym === 'baron') {
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath(); ctx.arc(-24, -10, 11, 0, TAU); ctx.arc(24, -10, 11, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 8, 32, 28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e2b585'; ctx.beginPath(); ctx.ellipse(0, 18, 15, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.ellipse(0, 13, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-12, 2, 4, 0, TAU); ctx.arc(12, 2, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16121c'; ctx.fillRect(-26, -26, 52, 6); ctx.fillRect(-16, -52, 32, 28);
    ctx.fillStyle = '#c4304e'; ctx.fillRect(-16, -32, 32, 5);
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffc21a'; ctx.beginPath(); ctx.arc(12, 2, 8, 0, TAU); ctx.stroke();
  }
}

/** Glückshaus (Vorderseite +Z): cremefarbene Wände, goldene Kuppel mit Kleeblatt, gestreifte Markise. */
export function luckyHouseGeo() {
  return cached('map:luckyhouse', () => {
    const b = new Build();
    b.box(6.0, 3.4, 4.6, { v: (x, y) => mix(0xf6e6c4, 0xfff6e0, (y + 1.7) / 3.4) }, { p: [0, 1.7, 0] }, 0.14);
    b.box(6.3, 0.35, 4.9, 0xd8a83a, { p: [0, 3.5, 0] }, 0.08);
    b.box(6.2, 0.3, 4.8, 0xc84a3a, { p: [0, 0.15, 0] }, 0.06);
    // goldene Kuppel mit Kleeblatt
    b.dome(2.1, { v: (x, y, z, nx, ny) => mix(0xd89a1a, 0xffd84a, ny) }, { p: [0, 3.65, -0.2] }, Math.PI / 2, 24, 8);
    b.cyl(0.08, 0.08, 0.7, 0x3a8a2a, { p: [0, 6.05, -0.2] }, 6);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      b.sphere(0.34, 0x4fc24a, { p: [Math.cos(a) * 0.3, 6.5 + Math.sin(a) * 0.3, -0.2], s: [1, 1, 0.35] }, 10, 6);
    }
    // Markise (rot/weiß gestreift) über der Front
    b.add(new THREE.BoxGeometry(6.4, 0.12, 1.6, 16, 1, 1), (x) => (Math.floor((x + 3.2) / 0.4) % 2 ? 0xffffff : 0xe0452a), { p: [0, 3.0, 2.95], r: [0.32, 0, 0] });
    for (let i = 0; i < 16; i++) b.cone(0.2, 0.26, i % 2 ? 0xffffff : 0xe0452a, { p: [-3.0 + i * 0.4, 2.62, 3.72], r: [Math.PI, 0, 0] }, 3);
    // Tür und Fenster
    const door = new THREE.Shape();
    door.moveTo(-0.7, 0); door.lineTo(-0.7, 1.6); door.absarc(0, 1.6, 0.7, Math.PI, 0, true); door.lineTo(0.7, 0); door.lineTo(-0.7, 0);
    b.extrude(door, 0.12, 0x8a2a3a, { p: [0, 0.02, 2.33] }, 0.03, 10);
    b.sphere(0.07, 0xffc21a, { p: [0.4, 1.1, 2.42] }, 8, 6);
    for (const sx of [-2.1, 2.1]) {
      b.box(1.0, 1.0, 0.08, 0x8ad8ff, { p: [sx, 1.9, 2.32] }, 0.04);
      b.box(1.16, 0.12, 0.14, 0xd8a83a, { p: [sx, 1.34, 2.36] }, 0.03);
    }
    // goldene Münze über der Tür
    b.cyl(0.42, 0.42, 0.1, 0xf7931a, { p: [0, 3.0, 2.45], r: [Math.PI / 2, 0, 0] }, 20);
    b.cyl(0.3, 0.3, 0.12, 0xffc04a, { p: [0, 3.0, 2.46], r: [Math.PI / 2, 0, 0] }, 20);
    return b.geometry();
  });
}

/** Gehäuse des Spielautomaten (Vorderseite +Z; Walzen, Hebel und Lichter sind eigene Objekte). */
function cabinetGeo() {
  return cached('map:slotcab', () => {
    const b = new Build();
    b.box(2.5, 2.2, 1.2, { v: (x, y, z, nx, ny) => mix(0xb8102a, 0xe8304a, Math.max(0, ny) * 0.4 + (y + 1.1) / 2.2 * 0.6) }, { p: [0, 1.1, 0] }, 0.14);
    b.box(2.7, 0.18, 1.4, 0xffc21a, { p: [0, 2.25, 0] }, 0.06);
    b.box(2.7, 0.18, 1.4, 0xffc21a, { p: [0, 0.09, 0] }, 0.06);
    // Walzen-Fenster: dunkler Rahmen, Trennstege, Blenden oben/unten
    b.box(2.1, 0.12, 0.5, 0xffc21a, { p: [0, 1.95, 0.72] }, 0.04);
    b.box(2.1, 0.12, 0.5, 0xffc21a, { p: [0, 1.17, 0.72] }, 0.04);
    for (const sx of [-1.02, -0.34, 0.34, 1.02]) b.box(0.08, 0.86, 0.5, 0xffc21a, { p: [sx, 1.56, 0.72] }, 0.02);
    b.box(2.0, 0.78, 0.06, 0x2a1020, { p: [0, 1.56, 0.42] }, 0);
    // Münzschale und Münzschlitz
    b.box(1.2, 0.3, 0.5, 0xd8a83a, { p: [0, 0.42, 0.75] }, 0.08);
    b.box(1.0, 0.12, 0.36, 0x6a3a10, { p: [0, 0.55, 0.78] }, 0.02);
    b.box(0.36, 0.08, 0.04, 0x2a1020, { p: [0.75, 0.95, 0.61] }, 0);
    // Aufsatz mit Stern
    b.box(2.2, 0.8, 0.9, 0xfff0d0, { p: [0, 2.75, 0] }, 0.25);
    b.extrude(starShape(0.34, 0.15), 0.12, 0xffd21a, { p: [0, 2.78, 0.46] }, 0.03, 1);
    // Hebel-Lager rechts
    b.box(0.24, 0.5, 0.5, 0xffc21a, { p: [1.37, 1.5, 0] }, 0.06);
    return b.geometry();
  });
}

/** Matte vor dem Automaten. */
function padGeo() {
  return cached('map:slotpad', () => {
    const b = new Build();
    b.cyl(PAD_R, PAD_R + 0.05, 0.08, (x, y, z) => (Math.floor(((Math.atan2(z, x) / TAU) + 1) * 16) % 2 ? 0xe0452a : 0xffc21a), { p: [0, 0.04, 0] }, 32);
    b.cyl(PAD_R * 0.55, PAD_R * 0.55, 0.1, 0xfff0c0, { p: [0, 0.05, 0] }, 24);
    b.cyl(0.3, 0.3, 0.12, 0xf7931a, { p: [0, 0.06, 0] }, 16);
    return b.geometry();
  });
}

export class SlotMachine {
  /**
   * @param {object} level Level der Karte
   * @param {object} def Haus aus den Weltdaten (kind 'glueck')
   */
  constructor(level, def) {
    this.level = level;
    this.def = def;
    this.stake = def.stake ?? SLOT_STAKE;
    this.pos = new THREE.Vector3(...def.machine);
    this.pad = new THREE.Vector3(...(def.pad ?? [def.machine[0], def.machine[1], def.machine[2] + 2.4]));
    this.state = 'idle';            // idle | spin
    this.t = 0;
    this.result = null;
    this.prize = null;
    this.forced = null;
    this.spins = 0;
    this.angles = [0.5, 2.6, 4.7];
    this.speed = [0, 0, 0];
    this.onPrize = null;
    this.own = [];
    const view = level.view;
    const W = level.world;
    const [hx, hy, hz] = def.pos;
    // Haus und Automat (statisch), Kollision
    if (view) {
      const hg = luckyHouseGeo().clone();
      if (def.yaw) hg.rotateY(def.yaw + Math.PI / 2);
      view.addStatic(place(hg, hx, hy, hz), { castShadow: true });
      view.addStatic(place(cabinetGeo().clone(), this.pos.x, this.pos.y, this.pos.z), { castShadow: true });
      view.addStatic(place(padGeo().clone(), this.pad.x, this.pad.y, this.pad.z), { castShadow: false });
    }
    W.add({ type: 'box', min: [hx - 3.1, hy, hz - 2.4], max: [hx + 3.1, hy + 4.0, hz + 2.4], tag: 'glueckshaus' });
    W.add({ type: 'box', min: [this.pos.x - 1.4, this.pos.y, this.pos.z - 0.65], max: [this.pos.x + 1.55, this.pos.y + 3.1, this.pos.z + 0.95], tag: 'automat' });
    if (!view) return;
    // Walzen
    const tex = reelTexture();
    const reelMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
    this.own.push(reelMat);
    const reelGeo = cached('map:slotreelgeo', () => new THREE.CylinderGeometry(0.4, 0.4, 0.6, 24, 1, false).rotateZ(Math.PI / 2));
    this.reels = [-0.68, 0, 0.68].map((dx) => {
      const m = new THREE.Mesh(reelGeo, reelMat);
      m.position.set(this.pos.x + dx, this.pos.y + 1.56, this.pos.z + 0.42);
      view.add(m);
      return m;
    });
    // Hebel
    this.lever = new THREE.Group();
    const arm = new THREE.Mesh(cached('map:slotlever', () => {
      const b = new Build();
      b.cyl(0.06, 0.06, 1.0, 0xd9dce6, { p: [0, 0.5, 0] }, 8);
      b.sphere(0.2, 0xe0203a, { p: [0, 1.05, 0] }, 12, 8);
      return b.geometry();
    }), vcol(0.3));
    arm.castShadow = true;
    this.lever.add(arm);
    this.lever.position.set(this.pos.x + 1.5, this.pos.y + 1.5, this.pos.z);
    view.add(this.lever);
    // Lichterkette um den Aufsatz (blinkt)
    this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, fog: true });
    this.own.push(this.bulbMat);
    const bulbs = new THREE.Mesh(cached('map:slotbulbs', () => {
      const b = new Build();
      for (let i = 0; i < 9; i++) b.sphere(0.07, 0xffffff, { p: [-1.0 + i * 0.25, 3.18, 0.46] }, 6, 4);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) b.sphere(0.07, 0xffffff, { p: [s * 1.12, 2.45 + i * 0.22, 0.46] }, 6, 4);
      return b.geometry();
    }), this.bulbMat);
    bulbs.position.copy(this.pos);
    view.add(bulbs);
    this.objs = [...this.reels, this.lever, bulbs];
  }

  get busy() { return this.state !== 'idle'; }

  /** Nächstes Ergebnis festlegen (Tests). */
  force(symbols) { this.forced = symbols?.slice() ?? null; }

  /** Steht die Figur auf der Matte? */
  onPad(player) {
    const dx = player.pos.x - this.pad.x, dz = player.pos.z - this.pad.z;
    return player.mode === 'ground' && !player.dead && dx * dx + dz * dz < PAD_R * PAD_R && Math.abs(player.pos.y - this.pad.y) < 0.8;
  }

  near(player, r = 5) {
    const dx = player.pos.x - this.pad.x, dz = player.pos.z - this.pad.z;
    return dx * dx + dz * dz < r * r && Math.abs(player.pos.y - this.pad.y) < 3;
  }

  /** Hebel ziehen: 'spin' (Einsatz bezahlt), 'poor' (zu wenig Bitcoins), 'busy'. */
  pull(save) {
    if (this.busy) return 'busy';
    if (!save.spendCoins(this.stake)) { this.level.sfx('bump'); return 'poor'; }
    const n = save.nextSlotSpin();
    this.result = this.forced ?? slotResult(n);
    this.forced = null;
    this.prize = null;
    this.state = 'spin';
    this.t = 0;
    this.spins++;
    this.speed = [15, 16.5, 18];
    this.level.sfx('switch');
    this.level.sfx('coin');
    return 'spin';
  }

  /** Simulationsschritt: Walzen drehen, nacheinander halten, Gewinn auszahlen. */
  step(dt) {
    if (this.state !== 'spin') return;
    const prev = this.t;
    this.t += dt;
    for (let i = 0; i < 3; i++) {
      const stop = STOP_AT[i];
      const target = ((SLOT_SYMBOLS.indexOf(this.result[i]) + 0.5) / SLOT_SYMBOLS.length) * TAU;
      if (this.t < stop - 0.35) this.angles[i] += this.speed[i] * dt;
      else if (this.t < stop) {
        // auf das Zielbild einbremsen (eine volle Runde Anlauf, kleines Nachfedern)
        if (!this.brake) this.brake = [];
        if (!this.brake[i]) {
          const base = Math.ceil((this.angles[i] - target) / TAU) * TAU + target + TAU;
          this.brake[i] = { from: this.angles[i], to: base, t0: this.t };
        }
        const k = Math.min(1, (this.t - this.brake[i].t0) / Math.max(1e-3, stop - this.brake[i].t0));
        const e = 1 - (1 - k) ** 3;
        this.angles[i] = this.brake[i].from + (this.brake[i].to - this.brake[i].from) * e;
      } else if (prev < stop) {
        this.angles[i] = this.brake?.[i]?.to ?? target;
        this.level.sfx('blockhit');
      }
    }
    if (prev < PAY_AT && this.t >= PAY_AT) {
      this.prize = slotPrize(this.result);
      this.onPrize?.(this.prize, this.result);
    }
    if (this.t >= DONE_AT) { this.state = 'idle'; this.brake = null; }
  }

  render(dt, t) {
    if (!this.reels) return;
    this.reels.forEach((r, i) => { r.rotation.x = this.angles[i]; });
    // Hebel: beim Ziehen nach vorn/unten, federt zurück
    const k = this.state === 'spin' ? Math.max(0, 1 - this.t / 0.5) : 0;
    this.lever.rotation.x = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 1.0;
    const fast = this.state === 'spin';
    const on = Math.sin(t * (fast ? 16 : 4)) > 0;
    this.bulbMat.color.setHex(on ? 0xfff2a0 : 0xff8a4a);
  }

  info() {
    return { state: this.state, t: +this.t.toFixed(2), result: this.result?.slice() ?? null, prize: this.prize ? { ...this.prize } : null, spins: this.spins, stake: this.stake };
  }

  dispose() {
    for (const o of this.objs ?? []) o.parent?.remove(o);
    for (const o of this.own) o.dispose?.();
    this.own.length = 0;
  }
}
