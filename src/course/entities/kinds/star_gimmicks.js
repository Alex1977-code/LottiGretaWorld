// Entitäts-Gimmicks der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“). Alle auch als `type` in segments
// erlaubt (blocks/types/star_misc.js) und per level.spawn(kind, spec) zur Laufzeit erzeugbar.
//
// fliegender_zielmast – Zielmast mit Flügeln (Bauplan S-4 „der Zielmast bekommt Flügel und fliegt davon; wartet, wenn man
//   zurückfällt“; P-5 „Zielmast fliegt pendelnd“): fliegt seinen Pfad ab, solange eine Figur nah genug ist (unter `near` m
//   volles Tempo, ab `far` m schwebt er und wartet), am Pfadende landet er. Fangen (Berühren des Masts, jederzeit – auch
//   gleich am Start mit einem getimten Weitsprung) = Ziel: Greifhöhe zählt wie beim Zielmast, er sinkt zu Boden (bzw. auf
//   `land`), die Figur rutscht hinab, Siegespose, Ergebnis. mode 'pendel': fliegt den Pfad hin und her, ohne zu warten.
//   { kind: 'fliegender_zielmast', id, pos: [x, y, z] (Fußpunkt am Start), path: [[x, y, z] …] (Fußpunkte der Flugbahn),
//     height: 9, speed: 6.5, near: 11, far: 24, start: 'nah' (Figur in trigger m) | 'auto' | 'signal' (start()),
//     trigger: 9, mode: 'flucht' | 'pendel', land: [x, y, z] (Landeplatz nach dem Fang; Standard: Boden darunter),
//     bob: 0.35 (m Auf und Ab im Flug), wings: true }
//   Laufzeit: state ('wartet'|'fliegt'|'schwebt'|'gelandet'|'gefangen'), s (Weg), dist (Figur), start(), info();
//   star(level).poles. Modell: Zielmast (Registry 'goal_pole' bzw. Rückfall) + eigene Flügel (Registry 'zielmast_fluegel',
//   sobald es ihn gibt: opts { span }, state { flap 0..1 }).
// scheinziel – sieht aus wie ein Zielmast, ist aber keiner (Bauplan S-4 „Scheinziel am Start“, B-6 „zwei falsche Zielmasten
//   rufen Großspuke“): Berühren → Aktion onTouch (z. B. { spawn: { kind: 'grossspuk', … } } oder { start: 'mast' }), Signal
//   'scheinziel'; danach verpufft er (mode 'poff', Konfetti) oder bekommt Flügel und fliegt davon (mode 'fluegel').
//   { kind: 'scheinziel', id, pos, height: 9, onTouch: Aktion, mast: id (fliegender_zielmast, der dann startet),
//     mode: 'fluegel' | 'poff' }   Laufzeit: touched, info()
// felsblock – großer Felsblock bzw. rissige Felswand (Bauplan S-5 „Felsblock mit Bombe sprengen“, S-9 „rissige Wand mit dem
//   Kanonen-Helm sprengen“, B-7 „Felsblockwände“): fest, Stampfen/Tatze/Feuer prallen ab; Bombe (Laufbombe = kickbombe,
//   attackArea 'bomb'), Kanonenkugel ('cannon') und Riesentrank ('mega') sprengen ihn (by). Danach Inhalt/Aktion.
//   { kind: 'felsblock', id, pos (Mitte Unterseite), size: 2.4 | [w, h, d], look: 'fels' | 'wand' (rissige Felswand) |
//     'eis', by: ['bomb', 'cannon', 'mega'], content: 'star:1' | 'coins:5' | Aktion, onBreak: Aktion, hidden }
//   Laufzeit: broken, by (womit), info(); star(level).rocks.
// riesen_frageturm – Riesen-?-Block, der beim Anschlagen (Kopfstoß von unten; auch Stampfen, Wurfsichel, Panzer, Bombe)
//   nach oben zu einem Turm aus Riesen-?-Blöcken wächst (Bauplan S-5 „Riesen-?-Blöcke, die zu Türmen wachsen“, „?-Turm
//   anschlagen, Wandsprung“); wer oben steht, fährt mit. Jeder neue Block wirft Münzen aus; der oberste den Inhalt.
//   (Gegenstück zum vorhandenen riesenfrageblock aus 6-Panzer, der auf einer Säule angehoben wird.)
//   { kind: 'riesen_frageturm', id, pos (Mitte Unterseite), size: 2, blocks: 4 (wachsen dazu), delay: 0.22 (s je Block),
//     coins: 1 (je Block), content: 'coins:5' | Power-up | 'star:i' | Aktion (oberster Block), onGrow: Aktion (fertig),
//     trigger: ['bump', 'pound', 'throw', 'shell', 'bomb', 'mega', 'cannon'], color: 'gold' | 'orange', hidden }
//   Laufzeit: state ('bereit'|'waechst'|'turm'), grown, top (y der Oberseite), grow(), info(); star(level).towers.
// laufbombe – andere Bezeichnung für die vorhandene Kickbombe (läuft wie ein Pilzling, Lunte, Explosion sprengt Felsblöcke).
//   { kind: 'laufbombe', … } = { kind: 'kickbombe', … } (entities/kinds/kickbombe.js).
// Hüllen: die Stern-Bausteine drehplatte, farbplatten, plattenwand, schienenwalze, walzenraum, waben, draufsicht,
//   nebelplattform, nebelboden, schienenbrett, kanonenkugel_wand, drehdiorama, zeituhren, sternenglanz sind auch als kind
//   erlaubt (level.spawn(kind, spec); level.named.get(id) = Griff des Bausteins).

import * as THREE from 'three';
import { Gimmick, runAction, contentAction, visDt } from '../gimmick.js';
import { goalModel } from '../visuals.js';
import { KINDS as BOMB } from './kickbombe.js';
import { hasModel, getModel } from '../../models/index.js';
import { star, figures, canvasTexture, clamp, TAU, lin, mixc, smooth, colorize, merge, roundedBox, SIDE } from '../../blocks/starkit.js';
import { buildDrehplatte, buildFarbplatten, buildPlattenwand } from '../../blocks/types/star_platten.js';
import { buildSchienenwalze, buildWalzenraum } from '../../blocks/types/star_walze.js';
import { buildZeituhren } from '../../blocks/types/star_zeituhr.js';
import { buildDraufsicht, buildWaben } from '../../blocks/types/star_draufsicht.js';
import { buildNebelplattform, buildNebelboden } from '../../blocks/types/star_nebel.js';
import { buildSchienenbrett, buildKanonenkugelWand } from '../../blocks/types/star_schiene.js';
import { buildDrehdiorama } from '../../blocks/types/star_diorama.js';
import { buildSternenglanz } from '../../blocks/types/star_misc.js';

// ===================================================================== Flügel (Rückfall-Modell)

function wingGeo() {
  const parts = [];
  const W = lin(0xffffff), S = lin(0xd8e0f4);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.SphereGeometry(1, 10, 6);
    g.scale(0.55 - i * 0.08, 0.07, 0.22);
    g.translate(0.45 + i * 0.14, -i * 0.13, 0);
    parts.push(colorize(g.toNonIndexed(), (p, n, o) => mixc(S, W, smooth(-0.4, 0.8, n.y), o)));
  }
  return merge(parts);
}

/** Flügelpaar an einer Gruppe (Ursprung zwischen den Flügeln, Spannweite span) → { root, flap(k) }. */
function makeWings(span = 1.6) {
  if (hasModel('zielmast_fluegel')) {
    const m = getModel('zielmast_fluegel', { span });
    return { root: m.root, flap: (k) => m.update?.(0.016, { flap: k }), dispose: () => m.dispose?.() };
  }
  const root = new THREE.Group();
  const geo = wingGeo();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x202030 });
  const L = new THREE.Group(), R = new THREE.Group();
  const ml = new THREE.Mesh(geo, mat), mr = new THREE.Mesh(geo, mat);
  ml.castShadow = mr.castShadow = true;
  L.add(ml); R.add(mr);
  R.rotation.y = Math.PI;
  const s = span / 1.6;
  root.scale.setScalar(s);
  root.add(L, R);
  return {
    root,
    flap(k) { const a = -0.3 + Math.sin(k * TAU) * 0.65; L.rotation.z = a; R.rotation.z = a; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// ===================================================================== Fliegender Zielmast

class FliegenderZielmast extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'fliegender_zielmast');
    this.H = spec.height ?? 9;
    this.half.set(0.55, this.H / 2 + 0.6, 0.55);
    this.touch = true;
    this.shadow = 0.7;
    const raw = (spec.path ?? []).map((q) => ({ x: q[0], y: q[1], z: q[2] }));
    if (!raw.length || Math.hypot(raw[0].x - this.pos.x, raw[0].y - this.pos.y, raw[0].z - this.pos.z) > 0.01) raw.unshift({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    this.pts = raw;
    let L = 0;
    this.pts[0].s = 0;
    for (let i = 1; i < raw.length; i++) { L += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y, raw[i].z - raw[i - 1].z); raw[i].s = L; }
    this.L = L;
    this.s = 0;
    this.dirS = 1;
    this.mode = spec.mode === 'pendel' ? 'pendel' : 'flucht';
    this.state = spec.start === 'auto' ? 'fliegt' : 'wartet';
    this.speed = spec.speed ?? 6.5;
    this.near = spec.near ?? 11;
    this.far = spec.far ?? 24;
    this.v = 0;
    this.t = 0;
    this.dist = 0;
    this.flag = 1;
    this.base = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);   // Fußpunkt auf der Bahn (ohne Wippen)
    this.landY = null;
    this.goal = null;
    this.flapK = 0;
    star(level).poles.push(this);
    if (level.view) {
      const m = goalModel({ height: this.H });
      this.wings = makeWings(1.9);
      this.wings.root.position.set(0, 1 + this.H * 0.82, 0);
      m.root.add(this.wings.root);
      this.setModel(m);
    }
  }

  get baseTop() { return this.pos.y + 1; }
  center(out = this._c) { return out.set(this.pos.x, this.baseTop + this.H / 2 - 0.3, this.pos.z); }

  start() { if (this.state === 'wartet') { this.state = 'fliegt'; this.level.sfx('swoop'); } }

  at(s, out) {
    const P = this.pts;
    if (P.length < 2) return out.set(P[0].x, P[0].y, P[0].z);
    s = clamp(s, 0, this.L);
    let i = 1;
    while (i < P.length - 1 && P[i].s < s) i++;
    const a = P[i - 1], b = P[i], u = (s - a.s) / Math.max(1e-6, b.s - a.s);
    return out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
  }

  nearestDist() {
    let d = Infinity;
    for (const f of figures(this.level)) d = Math.min(d, Math.hypot(f.pos.x - this.pos.x, f.pos.z - this.pos.z));
    return d;
  }

  update(dt) {
    if (this.hidden) return;
    this.t += dt;
    this.flapK = (this.flapK + dt * (this.state === 'fliegt' ? 2.6 : this.state === 'gefangen' || this.state === 'gelandet' ? 0.4 : 1.3)) % 1;
    this.dist = this.nearestDist();
    if (this.state === 'gefangen') { this.settle(dt); return; }
    if (this.state === 'wartet') {
      if ((this.spec.start ?? 'nah') === 'nah' && this.dist < (this.spec.trigger ?? 9)) this.start();
    } else if (this.state === 'fliegt' || this.state === 'schwebt') {
      let want;
      if (this.mode === 'pendel') want = this.speed;
      else want = this.dist <= this.near ? this.speed : this.dist >= this.far ? 0 : this.speed * (1 - (this.dist - this.near) / Math.max(0.1, this.far - this.near));
      this.v += (want - this.v) * Math.min(1, dt * 3);
      this.s += this.v * dt * this.dirS;
      if (this.mode === 'pendel') { if (this.s >= this.L) { this.s = this.L; this.dirS = -1; } else if (this.s <= 0) { this.s = 0; this.dirS = 1; } }
      else if (this.s >= this.L) { this.s = this.L; this.state = 'gelandet'; this.level.sfx('land'); }
      if (this.state !== 'gelandet') this.state = this.v < 0.4 && this.mode !== 'pendel' ? 'schwebt' : 'fliegt';
    }
    this.at(this.s, this.base);
    const bob = this.state === 'gelandet' || this.state === 'wartet' ? 0 : Math.sin(this.t * 2.2) * (this.spec.bob ?? 0.35);
    this.pos.set(this.base.x, this.base.y + bob, this.base.z);
  }

  /** Nach dem Fang: zu Boden sinken (bzw. auf land), Figur mitnehmen. */
  settle(dt) {
    if (this.landY === null) {
      if (Array.isArray(this.spec.land)) { this.landY = this.spec.land[1]; this.landXZ = [this.spec.land[0], this.spec.land[2]]; }
      else {
        const hit = this.level.world.raycastDown(this.pos.x, this.pos.y + 0.5, this.pos.z, 60);
        this.landY = hit ? hit.y : this.pos.y;
        this.landXZ = null;
      }
    }
    const k = Math.min(1, dt * 3);
    if (this.landXZ) { this.pos.x += (this.landXZ[0] - this.pos.x) * k; this.pos.z += (this.landXZ[1] - this.pos.z) * k; }
    this.pos.y = Math.max(this.landY, this.pos.y - 9 * dt);
    if (this.flag > 0) this.flag = Math.max(0, this.flag - dt * 0.9);
    const g = this.goal;
    if (g) {
      g.poleX = this.pos.x; g.poleZ = this.pos.z; g.baseY = this.baseTop;
      const f = this.catcher;
      if (f && f.script?.goal === g) {
        f.pos.x = this.pos.x - 0.35; f.pos.z = this.pos.z;
        if (f.pos.y < g.baseY || f.script.phase !== 'slide') f.pos.y = Math.max(g.baseY, f.script.phase === 'slide' ? f.pos.y : g.baseY);
      }
    }
  }

  onPlayer(player) {
    if (this.state === 'gefangen' || player.dead || this.hidden) return 'none';
    const frac = (player.pos.y + player.half.y - this.baseTop) / this.H;
    if (frac < -0.15) return 'none';
    if (!this.level.runtime.reachGoal(clamp(frac, 0, 1))) return 'none';
    this.state = 'gefangen';
    this.touch = false;
    this.catcher = player;
    this.goal = { poleX: this.pos.x, poleZ: this.pos.z, baseY: this.baseTop, yaw: 0 };
    player.grabPole(this.goal);
    this.level.effects?.sparks({ x: this.pos.x, y: player.pos.y + 1, z: this.pos.z }, 22);
    this.level.signal?.('zielmast_gefangen', { id: this.spec.id ?? null, s: this.s, frac });
    return 'none';
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.model) return;
    this.model.update?.(dt, { flag: this.flag, grabbed: this.state === 'gefangen' });
    this.wings?.flap(this.flapK);
    const lean = this.state === 'fliegt' ? -0.12 * Math.min(1, this.v / Math.max(1, this.speed)) : 0;
    this.model.root.rotation.z = lean;
  }

  modelState() { return { flag: this.flag, grabbed: this.state === 'gefangen' }; }
  info() { return { state: this.state, s: +this.s.toFixed(2), L: +this.L.toFixed(2), v: +this.v.toFixed(2), dist: +this.dist.toFixed(2), pos: [+this.pos.x.toFixed(2), +this.pos.y.toFixed(2), +this.pos.z.toFixed(2)] }; }
  dispose() { this.wings?.dispose?.(); super.dispose?.(); }
}

// ===================================================================== Scheinziel

class Scheinziel extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'scheinziel');
    this.H = spec.height ?? 9;
    this.half.set(0.55, this.H / 2 + 0.6, 0.55);
    this.shadow = 0.5;
    this.touched = false;
    this.flyT = 0;
    this.baseShape = this.addSolid({ type: 'box', min: [this.pos.x - 0.5, this.pos.y, this.pos.z - 0.5], max: [this.pos.x + 0.5, this.pos.y + 1, this.pos.z + 0.5], tag: 'scheinziel' });
    if (level.view) {
      const m = goalModel({ height: this.H });
      this.wings = makeWings(1.9);
      this.wings.root.position.set(0, 1 + this.H * 0.82, 0);
      this.wings.root.visible = false;
      m.root.add(this.wings.root);
      this.setModel(m);
    }
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + 1 + this.H / 2 - 0.3, this.pos.z); }

  onPlayer(player) {
    if (this.touched || player.dead || this.hidden) return 'none';
    this.touched = true;
    this.touch = false;
    const L = this.level, p = this.pos;
    L.sfx('pfiff');
    L.sfx('swoop');
    L.effects?.sparks({ x: p.x, y: p.y + 3, z: p.z }, 26);
    L.signal?.('scheinziel', { id: this.spec.id ?? null, pos: [p.x, p.y, p.z] });
    runAction(L, this.spec.onTouch, { pos: [p.x, p.y + 1, p.z], source: this });
    if (this.spec.mast) L.named.get(this.spec.mast)?.start?.();
    if ((this.spec.mode ?? 'fluegel') === 'poff') { L.effects?.debris?.({ x: p.x, y: p.y + 2, z: p.z }, 0xffffff, 10); this.kill(); }
    else { this.removeShapes(); if (this.wings) this.wings.root.visible = true; }
    return 'none';
  }

  update(dt) {
    if (!this.touched) return;
    this.flyT += dt;
    this.pos.y += dt * (2 + this.flyT * 6);
    this.pos.z -= dt * this.flyT * 3;
    if (this.flyT > 3.5) this.kill();
  }

  render(dt, t) {
    super.render(dt, t);
    this.wings?.flap((t * 2.4) % 1);
  }

  modelState() { return { flag: 1, grabbed: false }; }
  info() { return { touched: this.touched, flying: this.touched && this.alive }; }
}

// ===================================================================== Felsblock

const ROCK = { fels: [0x9a8a7a, 0x6a5a4e, 0xc8b8a4], wand: [0xa89880, 0x6e6050, 0xffc070], eis: [0xbfe8ff, 0x7ab0d8, 0xffffff] };

function rockGeo(look, w, h, d) {
  const [a, b, hi] = (ROCK[look] ?? ROCK.fels).map(lin);
  if (look === 'wand') {
    const g = roundedBox(w, h, d, 0.18, SIDE.ALL, 0, 2);
    return colorize(g, (p, n, o) => {
      const crack = Math.abs(Math.sin(p.x * 3.1 + Math.sin(p.y * 2.3) * 1.6)) < 0.08 && n.z > 0.5;
      mixc(b, a, smooth(-0.6, 0.9, n.y * 0.5 + n.z * 0.4) * 0.8 + ((Math.floor(p.y * 1.7) + Math.floor(p.x * 1.3)) & 1) * 0.12, o);
      if (crack) mixc(o, hi, 0.85, o);
      o[1] += 0; // Risse glühen leicht orange (Hinweis: sprengbar)
    });
  }
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + Math.sin(x * 5.1 + z * 2.7) * 0.07 + Math.cos(y * 4.3 + x * 3.1) * 0.06;
    pos.setXYZ(i, x * k * w / 2, (y * k + 1) * h / 2, z * k * d / 2);
  }
  g.computeVertexNormals();
  return colorize(g.index ? g.toNonIndexed() : g, (p, n, o) => {
    mixc(b, a, smooth(-0.5, 0.9, n.y * 0.6 + n.z * 0.3), o);
    const crack = Math.abs(Math.sin(p.x * 4 + p.y * 3)) < 0.05;
    if (crack) mixc(o, hi, 0.6, o);
  });
}

class Felsblock extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'felsblock');
    const s = spec.size ?? 2.4;
    const [w, h, d] = Array.isArray(s) ? s : [s, s * 0.85, s];
    this.dim = [w, h, d];
    this.half.set(w / 2, h / 2, d / 2);
    this.touch = false;
    this.shadow = 0;
    this.broken = false;
    this.by = null;
    this.allow = new Set(spec.by ?? ['bomb', 'cannon', 'mega']);
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - w / 2, p.y, p.z - d / 2], max: [p.x + w / 2, p.y + h, p.z + d / 2], breakable: 'bomb', mega: true, tag: 'felsblock' });
    star(level).rocks.push(this);
    if (level.view) {
      const root = new THREE.Group();
      const mesh = new THREE.Mesh(rockGeo(spec.look ?? 'fels', w, h, d), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
      if (spec.look === 'wand') mesh.position.y = h / 2;
      mesh.castShadow = true; mesh.receiveShadow = true;
      root.add(mesh);
      this.setModel({ root, update() {}, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } });
    }
  }

  onHit(kind, source) {
    if (this.broken || this.hidden) return;
    if (!this.allow.has(kind)) { if (kind === 'pound' || kind === 'claw') this.level.sfx('bump'); return; }
    this.broken = true;
    this.by = kind;
    const L = this.level, p = this.pos, [w, h] = this.dim;
    L.sfx('brickbreak'); L.sfx('slam');
    L.shake?.(0.35);
    for (let i = 0; i < 3; i++) L.effects?.debris?.({ x: p.x + (i - 1) * w * 0.3, y: p.y + h * 0.5, z: p.z }, this.spec.look === 'eis' ? 0xbfe8ff : 0x8a7a6a, 8);
    L.effects?.dust?.({ x: p.x, y: p.y, z: p.z }, 12);
    const at = [p.x, p.y + Math.min(1.2, h * 0.5), p.z];
    if (this.spec.content !== undefined) runAction(L, contentAction(this.spec.content, null), { pos: at, source: this });
    runAction(L, this.spec.onBreak, { pos: at, source: this, via: kind });
    L.signal?.('felsblock', { id: this.spec.id ?? null, by: kind, pos: at });
    void source;
    this.kill();
  }

  info() { return { broken: this.broken, by: this.by }; }
}

// ===================================================================== Riesen-?-Turm

let QTEX = null;
function qTexture() {
  if (QTEX) return QTEX;
  QTEX = canvasTexture('star:qblock', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = 'bold 96px Arial Rounded MT Bold, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(140,70,0,0.9)'; ctx.strokeText('?', w / 2 + 3, h / 2 + 8);
    ctx.fillStyle = '#ffffff'; ctx.fillText('?', w / 2, h / 2 + 4);
    ctx.fillStyle = 'rgba(150,80,10,0.8)';
    for (const [x, y] of [[14, 14], [114, 14], [14, 114], [114, 114]]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
  });
  return QTEX;
}

function qBodyGeo(color) {
  const g = roundedBox(0.98, 0.98, 0.98, 0.1, SIDE.ALL, 0, 2);
  const base = lin(color === 'orange' ? 0xff9a2e : 0xffc21a), edge = lin(color === 'orange' ? 0xb8540a : 0xc87a0a);
  const out = colorize(g, (p, n, o) => { const flat = Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)); mixc(edge, base, smooth(0.8, 0.98, flat), o); });
  out.translate(0, 0.5, 0);
  return out;
}

function qDecalGeo() {
  const pos = [], nor = [], uv = [];
  const d = 0.503;
  const add = (rx, ry, x, y, z) => {
    const g = new THREE.PlaneGeometry(0.88, 0.88); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z);
    const n = g.toNonIndexed();
    pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); uv.push(...n.attributes.uv.array);
  };
  add(0, 0, 0, 0.5, d); add(0, Math.PI, 0, 0.5, -d); add(0, Math.PI / 2, d, 0.5, 0); add(0, -Math.PI / 2, -d, 0.5, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

class RiesenFrageturm extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'riesen_frageturm');
    this.S = spec.size ?? 2;
    this.n = Math.max(1, spec.blocks ?? 4);
    this.delay = spec.delay ?? 0.22;
    this.trig = new Set(spec.trigger ?? ['bump', 'pound', 'throw', 'shell', 'bomb', 'mega', 'cannon']);
    this.state = 'bereit';
    this.grown = 0;
    this.k = 0;           // wachsende Höhe in Blöcken (stetig)
    this.t = 0;
    this.touch = false;
    this.shadow = 0;
    this.half.set(this.S / 2, this.S / 2, this.S / 2);
    const p = this.pos, S = this.S;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
    this.shape = this.addSolid({ type: 'box', min: [p.x - S / 2, p.y, p.z - S / 2], max: [p.x + S / 2, p.y + S, p.z + S / 2], mover: this.mover, tag: 'riesen_frageturm' });
    star(level).towers.push(this);
    if (level.view) {
      const body = new THREE.InstancedMesh(qBodyGeo(spec.color), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), this.n + 1);
      const decal = new THREE.InstancedMesh(qDecalGeo(), new THREE.MeshStandardMaterial({ map: qTexture(), transparent: true, alphaTest: 0.2, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), this.n + 1);
      body.castShadow = true; body.receiveShadow = true;
      // Hülle über den ganzen (gewachsenen) Turm, lokal zur Wurzel (Turmfuß)
      const hs = new THREE.Sphere(new THREE.Vector3(0, this.S * (this.n + 1) / 2, 0), this.S * (this.n + 1) / 2 + this.S);
      body.boundingSphere = hs; decal.boundingSphere = hs;
      const root = new THREE.Group();
      root.add(body, decal);
      this.inst = { body, decal };
      this.setModel({ root, update: () => this.place(), dispose() { body.geometry.dispose(); body.material.dispose(); decal.geometry.dispose(); decal.material.dispose(); } });
      this.place();
    }
  }

  get top() { return this.pos.y + this.S * (1 + this.k); }

  place() {
    if (!this.inst) return;
    const m = new THREE.Matrix4(), S = this.S;
    for (let i = 0; i <= this.n; i++) {
      const vis = i === 0 ? 1 : clamp(this.k - (i - 1), 0, 1);
      const sc = vis <= 0 ? 0.0001 : S * (0.6 + 0.4 * vis);
      m.makeScale(sc, sc, sc);
      m.setPosition(0, i === 0 ? 0 : S * (i - 1 + vis) + (S - sc) * 0, 0);
      this.inst.body.setMatrixAt(i, m);
      this.inst.decal.setMatrixAt(i, m);
    }
    this.inst.body.instanceMatrix.needsUpdate = true;
    this.inst.decal.instanceMatrix.needsUpdate = true;
  }

  syncModel() { if (this.model) { this.model.root.position.copy(this.pos); } }

  grow(via = 'bump') {
    if (this.state !== 'bereit' || this.hidden) return false;
    this.state = 'waechst';
    this.via = via;
    this.t = 0;
    this.level.sfx('blockhit');
    this.level.sfx('powerup_appear');
    return true;
  }

  onBump() { if (this.trig.has('bump')) this.grow('bump'); }
  onPound() { if (this.trig.has('pound')) this.grow('pound'); }
  onHit(kind) { if (this.trig.has(kind)) this.grow(kind); }
  onSichelHit() { if (this.trig.has('throw')) this.grow('throw'); }

  update(dt) {
    const m = this.mover;
    m.dx = m.dy = m.dz = m.vx = m.vy = m.vz = 0;
    if (this.state !== 'waechst') return;
    this.t += dt;
    const before = this.k;
    const S = this.S;
    // je Block delay s: wächst 0 → n (stetig, mit kleinem Schwung je Block)
    this.k = Math.min(this.n, this.t / this.delay);
    const whole = Math.floor(this.k + 1e-6);
    while (this.grown < whole) {
      this.grown++;
      const y = this.pos.y + S * this.grown + S * 0.5;
      this.level.sfx('blockhit');
      const coins = this.spec.coins ?? 1;
      if (coins > 0 && this.grown < this.n) runAction(this.level, { coins }, { pos: [this.pos.x, y + S * 0.6, this.pos.z] });
      this.level.effects?.sparks({ x: this.pos.x, y, z: this.pos.z }, 6);
    }
    const sh = this.shape, p = this.pos;
    sh.max = [p.x + S / 2, this.top, p.z + S / 2];
    m.dy = S * (this.k - before);
    m.vy = dt > 0 ? m.dy / dt : 0;
    if (this.shapes.length) this.level.world.update(this.shapes[0]);
    if (this.k >= this.n) {
      this.state = 'turm';
      const at = [p.x, this.top + 0.6, p.z];
      runAction(this.level, contentAction(this.spec.content, null), { pos: at, source: this });
      runAction(this.level, this.spec.onGrow, { pos: at, source: this });
      this.level.signal?.('frageturm', { id: this.spec.id ?? null, via: this.via, top: this.top });
      this.level.shake?.(0.2);
    }
  }

  info() { return { state: this.state, grown: this.grown, top: +this.top.toFixed(2), via: this.via ?? null }; }
}

// ===================================================================== Hüllen (Bausteine als kind)

const BUILD = {
  drehplatte: buildDrehplatte, farbplatten: buildFarbplatten, plattenwand: buildPlattenwand, schienenwalze: buildSchienenwalze,
  walzenraum: buildWalzenraum, zeituhren: buildZeituhren, draufsicht: buildDraufsicht, waben: buildWaben,
  nebelplattform: buildNebelplattform, nebelboden: buildNebelboden, schienenbrett: buildSchienenbrett,
  kanonenkugel_wand: buildKanonenkugelWand, drehdiorama: buildDrehdiorama, sternenglanz: buildSternenglanz,
};

class BlockShell extends Gimmick {
  constructor(level, spec, kind) {
    super(level, { ...spec, hidden: false }, kind);
    this.touch = false;
    this.shadow = 0;
    this.handle = BUILD[kind]?.(level, { ...spec, type: kind }) ?? null;
    if (spec.id && this.handle) queueMicrotask(() => { if (level.named.get(spec.id) === this) level.named.set(spec.id, this.handle); });
  }
  info() { return this.handle?.info?.() ?? null; }
}

export const KINDS = {
  ...Object.fromEntries(Object.keys(BUILD).map((k) => [k, (level, spec) => new BlockShell(level, spec, k)])),
  fliegender_zielmast: (level, spec) => new FliegenderZielmast(level, spec),
  scheinziel: (level, spec) => new Scheinziel(level, spec),
  felsblock: (level, spec) => new Felsblock(level, spec),
  riesen_frageturm: (level, spec) => new RiesenFrageturm(level, spec),
  laufbombe: (level, spec) => BOMB.kickbombe(level, spec),
};
