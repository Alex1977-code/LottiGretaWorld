// Gimmick-Entitäten der Halloween-Welt „Kürbisinsel“ (Präzisierung Motor und Bausteine Halloween). Alle auch als `type`
// in LEVEL.segments erlaubt (blocks/types/hw_misc.js); die Halloween-Bausteine umgekehrt auch als `kind`.
//
// laterne – Handlaterne zum Aufheben (schwebt, leuchtet): Berühren → alle Figuren tragen eine Laterne (Laternenlicht,
//   blocks/hwkit.js hwLight: Geisterplattformen werden im Lichtradius sichtbar und begehbar). Mit LEVEL.lantern.lose
//   erscheint sie wieder, wenn die Laterne beim Tod verloren geht.
//   { kind: 'laterne', pos: [x, y, z] (Fußpunkt, schwebt 0,6 m darüber), radius (setzt den Lichtradius), banner:
//     'Laterne!' ('' = keine Ansage), id, hidden }
// laternenpfahl – feste Laterne auf einem Pfahl (Kürbislaterne oder Eisenlaterne): leuchtet im Radius (Lichtquelle für
//   Geisterplattformen, im Thema mit lanternLight auch als Punktlicht). Kann blinken (mit Vorwarnung: flackert vor dem
//   Ausgehen) und per Aktion geschaltet werden ({ toggle | start (an) | stop (aus): id }). Feuer/Tatze zündet sie an.
//   { kind: 'laternenpfahl', pos (Fußpunkt), radius: 4.5, height: 2.4, on: true, blink: null | [an, aus] (s), phase: 0,
//     warn: 0.6 (s Flackern vor dem Ausgehen), style: 'kuerbis' | 'laterne', yaw, id }
//   Laufzeit: on, toggles, toggle(), start(), stop(), info()
// suessigkeit – Süßigkeit zum Sammeln (zählt wie eine Münze: +1 Bitcoin, eigener Klang 'suessigkeit' bzw. 'berry'),
//   level.hwCandy zählt; HUD „Süßes n“ mit LEVEL.candyHud: true. Mit vel fliegt sie zuerst (aus Türen) und landet.
//   { kind: 'suessigkeit', pos (Fußpunkt), variant: 'bonbon' | 'lolli' | 'zuckermais' | 'schoko' (Standard je Ort),
//     vel: [vx, vy, vz], hidden, id }
//   { kind: 'suessigkeiten', from, to, n | pos, r, n, variant }   Reihe/Kreis (wie coins)
// suessigkeiten_tuer – Haustür (mit Häuschen): Stampfen auf die Schwelle, Antippen (Touch bzw. Aktionstaste in 3,5 m) oder
//   Hinlaufen (vor der Tür stehen und zu ihr schauen) = klingeln → Glocke, die Tür geht auf, heraus kommen Bitcoins,
//   Süßigkeiten oder ein Gegner; dann schließt sie (einmal je Tür, die Türlampe brennt danach). Signal
//   level.signal('klingeln', { id, group, content, n, of, pos, via, source }); Zähler level.hwDoors[group] = { n, of,
//   done } mit HUD „Türen n/N“ und Aktion onAll, wenn alle Türen der Gruppe geklingelt sind.
//   { kind: 'suessigkeiten_tuer', pos (Mitte der Türschwelle am Boden), yaw: −π/2 (Tür zeigt nach +Z; 0 = +X),
//     content: 'muenzen' | 'suesses' | 'kuerbling' | 'nichts' | Gegner-Art | Aktion, n: 5 (Münzen/Süßes), enemy: {…}
//     (Zusatzfelder des Gegners), ring: ['stomp', 'tap', 'walk'], group: 'tueren', onAll: Aktion, of (Standard: Zahl
//     der Türen der Gruppe), hud: true, house: true (Häuschen um die Tür; false = nur Tür im Rahmen), color: 'lila' |
//     'orange' | 'gruen' | 'blau', once: true, id }
//   Laufzeit: state ('idle' | 'ring' | 'open' | 'close' | 'done'), rings, info(); Gegner aus 'kuerbling' (Gegner-Agent;
//   bis dahin Ersatz 'pilzling').
// grabstein_schalter – Druckschalter im Grabstein-Look: Grabplatte mit Lachgesicht vor einem kleinen Grabstein.
//   Draufspringen/Draufstellen (press 'stand') bzw. nur Stampfattacke ('pound') drückt sie: Platte sinkt, die Augen des
//   Grabsteins leuchten, Aktion on (+ signal). time > 0: springt nach time s zurück (Zeitanzeige, Aktion off); toggle:
//   erneutes Drücken schaltet zurück.
//   { kind: 'grabstein_schalter', pos (Fußpunkt der Platte; mit Registry-Modell Fußpunkt des Sockels, der Knopf oben ist
//     die Platte – man springt auf den Schalter), yaw: −π/2 (Grabstein hinten, Gesicht und Platte zur Kamera
//     (+Z); 0 = Gesicht nach +X),
//     on: Aktion, off: Aktion, signal: Name, time: 0, toggle: false, once: false, press: 'stand' | 'pound', id, hidden }
//   Laufzeit: pressed, presses, press(), release(), info()
// riesenkuerbis – rollender Riesenkürbis (Ø size): rollt in dir (bzw. eine Bahn path entlang), bergab schneller; seitliche
//   Berührung verletzt und stößt weg (hurt: false = nur wegstoßen), Draufspringen federt ab, Stampfattacke und Angriffe
//   (Feuer, Tatze, Panzer, Riesentrank, Funkelstern) zerplatzen ihn (drop: Aktion, z. B. { coins: 2 }); an Wänden, in
//   Lava/Glibber/Abgrund und nach life s zerplatzt er.
//   { kind: 'riesenkuerbis', pos (Bodenpunkt), dir: [dx, dz] | yaw, size: 1.8, speed: 3, max: 9, path: [[x, y, z], …]
//     (Bodenpunkte), life: 16, hurt: true, face: true, drop: Aktion, color: 'orange' | 'gelb' | 'weiss', id }
//   Laufzeit: state ('roll' | 'burst'), rolled, speed(), info()
// Bausteine auch als kind: geisterplattform, besen_plattform, hexenkessel, spinnennetz_trampolin, kuerbis_kanone,
//   riesenkuerbis_roll (Hülle wie Welt 5).
// Modelle der Registry, sobald es sie gibt: 'laterne_hand' (Item laterne, × 1,15; state { swing, lit }),
//   'laternenpfahl' ({ height, style }; state { lit (0..1) }) bzw. für style 'kuerbis' 'kuerbislaterne' ({ mount: 'pfahl' }),
//   'suessigkeit' ({ kind: 'bonbon' | 'lolli' | 'mais' (zuckermais) | 'riegel' (schoko), color: Index }; Pool-Vorlage),
//   'suessigkeiten_tuer' ({ width 1,3, height 2,4, color }; Ursprung Schwellenmitte, Tür blickt +X, öffnet nach innen –
//   das Häuschen bekommt dann eine Wandöffnung mit Vorraum; state { open 0..1, ring 0..1, lit }), 'grabstein_schalter'
//   (Ursprung Fußpunkt, Kollision aus dem Hüllquader, Knopf oben = Druckplatte, sinkt 0,35 m; state { pressed 0..1,
//   glow }), 'riesenkuerbis_roll' ({ size, color, face }; state { roll (rad, Strecke / Radius), speed, anim: 'roll' |
//   'burst', progress }); sonst eigene Geometrie.

import * as THREE from 'three';
import { Gimmick, runAction, countdown, visDt, playerOn } from '../gimmick.js';
import { hasModel, getModel } from '../../models/index.js';
import { surfaceNormal } from '../../physics/shapes.js';
import { lin, mixc, smooth, colorize, merge, hex, box, addStatic } from '../../blocks/kit.js';
import { yawBox, rotXZ, snapYaw, banner } from '../../blocks/w3kit.js';
import { tapTargets } from '../tap.js';
import { hwLight, hwHud, hwSfx, modelOr, modelBox, figures, HWC, pumpkinGeo, faceGeo, lanternParts, candyGeo, softTexture, CANDY_VARIANTS } from '../../blocks/hwkit.js';
import { buildGeisterplattform } from '../../blocks/types/hw_light.js';
import { buildBesenPlattform } from '../../blocks/types/hw_broom.js';
import { buildHexenkessel, buildSpinnennetzTrampolin } from '../../blocks/types/hw_cauldron.js';
import { buildKuerbisKanone } from '../../blocks/types/hw_cannon.js';
import { buildRiesenkuerbisRoll } from '../../blocks/types/hw_misc.js';

const C = (h) => lin(hex(h));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const LIST = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

// ============================================================================================ Laterne (Item)

function lanternModel(scale = 1) {
  return modelOr('laterne_hand', { scale }, () => {
    const { body, glass } = lanternParts(scale);
    const r = new THREE.Group();
    const mb = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 }));
    mb.castShadow = true;
    r.add(mb, new THREE.Mesh(glass, new THREE.MeshBasicMaterial({ vertexColors: true })));
    return { root: r };
  });
}

class Laterne extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'laterne');
    this.half.set(0.35, 0.45, 0.35);
    this.shadow = 0.25;
    this.sys = hwLight(level);
    if (spec.radius) this.sys.radius = spec.radius;
    if (this.sys.carried && !spec.hidden) this.hidden = true;
    this.sys.onLose.push(() => { if (!this.removed) this.reveal(); });
    if (level.view) {
      const g = new THREE.Group();
      const m = lanternModel(1.6);
      m.root.position.y = 1.25;
      g.add(m.root);
      if (!hasModel('laterne_hand')) {
        // Ersatz-Optik: eigener Schein (das Registry-Modell hat einen)
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffc860, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.scale.set(1.6, 1.6, 1); glow.position.y = 0.82;
        g.add(glow);
        this.glow = glow;
      } else m.root.scale.setScalar(1.15);
      this.setModel({ root: g, update: (dt, s) => m.update?.(dt, s), dispose() {} });
      this.lm = m;
    }
  }

  onPlayer() {
    if (this.hidden) return 'none';
    this.sys.carry(true);
    hwSfx(this.level, 'laterne', 'light');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.9, z: this.pos.z }, 14);
    if (this.spec.banner !== '') banner(this.level, this.spec.banner ?? 'Laterne!', { hold: 1.4 });
    this.hide();
    return 'collect';
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.model || this.hidden) return;
    this.model.root.position.y = this.pos.y + Math.sin(t * 2.2) * 0.08;
    this.model.root.rotation.y = t * 1.2;
    if (this.glow) this.glow.material.opacity = 0.55 + 0.15 * Math.sin(t * 7);
  }
}

// ============================================================================================ Laternenpfahl

function postGeo(H, style) {
  const parts = [], glow = [];
  const wood = C(HWC.woodLow), woodHi = C(HWC.wood);
  const post = new THREE.CylinderGeometry(0.1, 0.14, H, 7, 3);
  const pp = post.attributes.position;
  for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); pp.setX(i, pp.getX(i) + Math.sin(y * 1.7) * 0.04); }
  post.computeVertexNormals();
  post.translate(0, H / 2, 0);
  parts.push(colorize(ni(post), (p, n, o) => mixc(wood, woodHi, smooth(-0.5, 0.9, n.x * 0.6 + n.y), o)));
  const arm = new THREE.BoxGeometry(0.7, 0.1, 0.1); arm.translate(0.3, H - 0.1, 0);
  parts.push(colorize(ni(arm), (p, n, o) => mixc(wood, woodHi, 0.5, o)));
  if (style === 'laterne') {
    const { body, glass } = lanternParts(1.8);
    body.translate(0.58, H - 0.15, 0); glass.translate(0.58, H - 0.15, 0);
    parts.push(body); glow.push(glass);
  } else {
    const pk = pumpkinGeo({ r: 0.32, color: 'orange', leaf: false });
    const hang = new THREE.CylinderGeometry(0.012, 0.012, 0.25, 4); hang.translate(0.58, H - 0.25, 0);
    parts.push(colorize(ni(hang), (p, n, o) => { o[0] = 0.15; o[1] = 0.13; o[2] = 0.12; }));
    pk.body.translate(0.58, H - 0.92, 0); parts.push(pk.body);
    const f = faceGeo({ r: 0.32, kind: 'lachen' }); f.rotateY(-Math.PI / 2); f.translate(0.58, H - 0.92, 0);
    glow.push(f);
  }
  return { body: merge(parts), glow: merge(glow) };
}

class Laternenpfahl extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'laternenpfahl');
    this.touch = false;
    this.shadow = 0;
    this.H = spec.height ?? 2.4;
    this.half.set(0.3, this.H / 2, 0.3);
    this.yaw = spec.yaw ?? -Math.PI / 2;
    const p = this.pos;
    this.addSolid({ type: 'cyl', x: p.x, z: p.z, r: 0.14, y0: p.y, y1: p.y + this.H, camIgnore: true, tag: 'laternenpfahl' });
    this.sys = hwLight(level);
    const lx = Math.cos(this.yaw) * 0.58, lz = -Math.sin(this.yaw) * 0.58;
    const lampY = p.y + this.H - (spec.style === 'laterne' ? 0.45 : 0.75);
    this.post = this.sys.addPost({ x: p.x + lx, y: lampY, z: p.z + lz, r: spec.radius ?? 4.5, on: false, ground: p.y });
    this.blink = spec.blink ?? null;
    this.t = (spec.phase ?? 0) * (this.blink ? this.blink[0] + this.blink[1] : 1);
    this.toggles = 0;
    this.flick = 0;
    this.spot = null;
    this.setOn(spec.on !== false, true);
    if (level.view) {
      const style = spec.style ?? 'kuerbis';
      let m;
      if (style === 'kuerbis' && hasModel('kuerbislaterne')) m = getModel('kuerbislaterne', { mount: 'pfahl' });
      else m = modelOr('laternenpfahl', { height: this.H, style }, () => {
        const { body, glow } = postGeo(this.H, style);
        const r = new THREE.Group();
        const mb = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
        mb.castShadow = true; mb.receiveShadow = true;
        this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
        r.add(mb, new THREE.Mesh(glow, this.glowMat));
        return { root: r };
      });
      const g = new THREE.Group();
      g.add(m.root);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffb050, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(2.2, 2.2, 1); halo.position.set(0.58, lampY - p.y, 0);
      g.add(halo);
      this.halo = halo;
      this.inner = m;
      this.setModel({ root: g, update: (dt, s) => m.update?.(dt, s), dispose() {} });
    }
  }

  setOn(on, quiet = false) {
    if (this.post.on === on) return;
    this.post.on = on;
    this.toggles++;
    const view = this.level.view;
    if (view?.lanternSpots) {
      if (on) { this.spot = new THREE.Vector3(this.post.x, this.post.y, this.post.z); view.lanternSpots.push(this.spot); }
      else if (this.spot) { const i = view.lanternSpots.indexOf(this.spot); if (i >= 0) view.lanternSpots.splice(i, 1); this.spot = null; }
    }
    if (!quiet) hwSfx(this.level, on ? 'laterne' : 'laterne_aus', on ? 'light' : 'vanish');
  }

  get on() { return this.post.on; }
  toggle() { this.blink = null; this.setOn(!this.post.on); }
  start() { this.blink = null; this.setOn(true); }
  stop() { this.blink = null; this.setOn(false); }
  open() { this.start(); }

  onHit(kind) { if ((kind === 'fire' || kind === 'claw') && !this.post.on && !this.blink) this.setOn(true); }

  update(dt) {
    this.flick = 0;
    if (!this.blink) return;
    const [a, b] = this.blink;
    this.t = (this.t + dt) % (a + b);
    const on = this.t < a;
    if (on && this.t > a - (this.spec.warn ?? 0.6)) this.flick = 1;
    this.setOn(on);
  }

  modelState() { return { lit: this.post.on ? (this.flick ? 0.4 : 1) : 0 }; }

  render(dt, t) {
    super.render(dt, t);
    const on = this.post.on && !(this.flick && Math.floor(t * 14) % 2);
    if (this.halo) { this.halo.visible = on; this.halo.material.opacity = 0.5 + 0.12 * Math.sin(t * 6.3); }
    if (this.glowMat) this.glowMat.color.setScalar(on ? 1 : 0.18);
  }

  info() { return { on: this.post.on, toggles: this.toggles, blink: this.blink, r: this.post.r }; }

  dispose() {
    this.sys.removePost(this.post);
    const spots = this.level.view?.lanternSpots;
    if (spots && this.spot) { const i = spots.indexOf(this.spot); if (i >= 0) spots.splice(i, 1); }
    super.dispose?.();
  }
}

// ============================================================================================ Süßigkeit

// Sorten der Bausteine → Sorten des Registry-Modells 'suessigkeit'
const MODEL_CANDY = { bonbon: 'bonbon', lolli: 'lolli', zuckermais: 'mais', schoko: 'riegel' };
function candyTemplate(variant) {
  return () => {
    if (hasModel('suessigkeit')) return getModel('suessigkeit', { kind: MODEL_CANDY[variant] ?? variant, color: Math.max(0, CANDY_VARIANTS.indexOf(variant)) }).root;
    const i = Math.max(0, CANDY_VARIANTS.indexOf(variant));
    const m = new THREE.Mesh(candyGeo(variant, i), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0x2a1a22 }));
    m.position.y = 0.42;
    m.scale.setScalar(1.45);
    const g = new THREE.Group(); g.add(m);
    return g;
  };
}

class Suessigkeit extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'suessigkeit');
    this.half.set(0.32, 0.36, 0.32);
    const k = Math.abs(Math.floor(this.pos.x * 3.1 + this.pos.z * 1.7));
    this.variant = CANDY_VARIANTS.includes(spec.variant) ? spec.variant : CANDY_VARIANTS[k % CANDY_VARIANTS.length];
    this.phase = (this.pos.x * 1.3 + this.pos.z * 0.7) % 6.28;
    this.flying = Array.isArray(spec.vel);
    if (this.flying) this.vel.set(spec.vel[0], spec.vel[1], spec.vel[2]);
    this.age = 0;
    const name = `suessigkeit:${this.variant}`;
    this.pool = level.view?.pool(name, candyTemplate(this.variant), { castShadow: false, capacity: 16, lod: false }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.render(0, 0);
  }

  update(dt) {
    this.age += dt;
    if (this.flying) {
      this.vel.y = Math.max(this.vel.y - 22 * dt, -20);
      const ny = this.pos.y + this.vel.y * dt;
      const hit = this.vel.y <= 0 ? this.level.world.raycastDown(this.pos.x, this.pos.y + 0.3, this.pos.z, 0.3 - this.vel.y * dt + 0.05) : null;
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      if (hit && ny <= hit.y) { this.pos.y = hit.y; if (this.vel.y < -4) this.vel.y *= -0.35; else { this.flying = false; this.vel.set(0, 0, 0); } this.vel.x *= 0.5; this.vel.z *= 0.5; }
      else this.pos.y = ny;
      if (this.pos.y < this.level.killY) this.kill();
    }
    // Figuren im Skript-Modus (Kanonenflug, Floß-Ritt) sammeln mit
    if (!this.grabbable) return;
    for (const f of this.level.players) {
      if (f.dead || f.hidden || f.mode !== 'script' && f.mode !== 'mount') continue;
      if (Math.abs(f.pos.x - this.pos.x) < 0.9 && Math.abs(f.pos.z - this.pos.z) < 0.9 && Math.abs(f.pos.y + f.half.y - this.pos.y - 0.35) < 1.1) { this.collect(); break; }
    }
  }

  // aus Türen geworfene Süßigkeiten erst nach 0,35 s einsammelbar (sie springen sichtbar heraus)
  get grabbable() { return !this.hidden && (!this.spec.vel || this.age > 0.35); }
  onPlayer() { if (!this.grabbable) return 'none'; this.collect(); return 'collect'; }
  onHit(kind) { if (this.grabbable && (kind === 'claw' || kind === 'mega' || kind === 'fire')) this.collect(); }

  collect() {
    if (!this.alive || this.hidden) return;
    const L = this.level;
    L.addCoins(1);
    L.hwCandy = (L.hwCandy ?? 0) + 1;
    hwSfx(L, 'suessigkeit', 'berry');
    L.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.4, z: this.pos.z }, 7);
    if (L.data?.candyHud) hwHud(L).set('suesses', { text: `Süßes ${L.hwCandy}`, icon: 'bonbon', color: 0xff6aa8 });
    this.kill();
  }

  render(dt, t) {
    if (this.idx < 0) return;
    if (this.hidden) { this.pool.hide(this.idx); return; }
    const bob = this.flying ? 0 : Math.sin(t * 2.4 + this.phase) * 0.06;
    this.pool.set(this.idx, this.pos.x, this.pos.y + bob, this.pos.z, t * 1.8 + this.phase, 1, 0, Math.sin(t * 1.3 + this.phase) * 0.25);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose?.();
  }
}

function spawnCandies(level, spec) {
  const out = [];
  const flags = { hidden: spec.hidden, variant: spec.variant };
  if (spec.from && spec.to) {
    const n = spec.n ?? 5;
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) : 0;
      out.push(level.spawn('suessigkeit', { ...flags, pos: spec.from.map((a, k) => a + (spec.to[k] - a) * u) }));
    }
  } else {
    const n = spec.n ?? 8, r = spec.r ?? 2, p = spec.pos ?? [0, 0, 0];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push(level.spawn('suessigkeit', { ...flags, pos: [p[0] + Math.cos(a) * r, p[1], p[2] + Math.sin(a) * r] })); }
  }
  return out.filter(Boolean);
}

// ============================================================================================ Süßigkeiten-Tür

const HOUSE = {
  lila: { wall: 0xb48ae8, wallLow: 0x7a5ab8, door: 0x7a3ab8, doorHi: 0xb87aff, roof: 0x3a2a5a, roofHi: 0x6a4a9a, trim: 0xffe0a0 },
  orange: { wall: 0xf0a868, wallLow: 0xb86a3a, door: 0x8a3a1a, doorHi: 0xc86a3a, roof: 0x4a2a3a, roofHi: 0x8a4a5a, trim: 0xfff0c8 },
  gruen: { wall: 0x9ad0a0, wallLow: 0x5a9a6a, door: 0x2a6a4a, doorHi: 0x4aaa7a, roof: 0x2a3a4a, roofHi: 0x4a6a7a, trim: 0xfff8d8 },
  blau: { wall: 0x9ab8f0, wallLow: 0x5a7ac0, door: 0x2a4a8a, doorHi: 0x4a7ad8, roof: 0x2a2a4a, roofHi: 0x4a4a7a, trim: 0xfff0d0 },
};
const DOOR_W = 1.1, DOOR_H = 1.95;

/** Häuschen (lokal: Tür-Vorderseite bei lx = 0, Haus nach −lx; lz quer). → { body, glow } in Weltkoordinaten. */
function houseGeo(p, yaw, color, house, reg = false) {
  const P = HOUSE[color] ?? HOUSE.lila;
  const parts = [], glow = [];
  const W = reg ? 4.0 : 3.6, D = 3.0, H = 3.0;
  // Registry-Tür (öffnet nach innen): Wand mit Türöffnung und kleinem Flur dahinter
  const hw = reg ? 0.82 : 0, hh = reg ? 2.62 : 0, back = reg ? 1.45 : 0;
  const winZ = reg ? 1.4 : 1.15;
  const L = (g, lx, ly, lz) => { g.translate(lx, ly, lz); g.rotateY(yaw); g.translate(p.x, p.y, p.z); return g; };
  const wallCol = (q, n, o) => { mixc(C(P.wallLow), C(P.wall), smooth(p.y, p.y + H * 0.7, q.y), o); };
  if (house) {
    if (!reg) parts.push(colorize(L(box(D, H, W, 0, 0, 0, P.wall, { r: 0.08, seg: 1 }), -D / 2, H / 2, 0), wallCol));
    else {
      parts.push(colorize(L(box(D - back, H, W, 0, 0, 0, P.wall, { r: 0.08, seg: 1 }), -back - (D - back) / 2, H / 2, 0), (q, n, o) => {
        // Rückwand des Flurs (hinter der Tür) warm und dunkel
        if (Math.abs(q.y - p.y - 1.2) < 1.4) { wallCol(q, n, o); o[0] *= 0.45; o[1] *= 0.32; o[2] *= 0.3; } else wallCol(q, n, o);
      }));
      const side = (W / 2 - hw) / 2;
      for (const sd of [-1, 1]) {
        parts.push(colorize(L(box(0.26, H, W / 2 - hw, 0, 0, 0, P.wall, { r: 0.04, seg: 1 }), -0.13, H / 2, sd * (hw + side)), wallCol));
        parts.push(colorize(L(box(back - 0.25, H, 0.12, 0, 0, 0, P.wall, { r: 0.02, seg: 1 }), -0.25 - (back - 0.25) / 2, H / 2, sd * (W / 2 - 0.06)), wallCol));
      }
      parts.push(colorize(L(box(0.26, H - hh, hw * 2, 0, 0, 0, P.wall, { r: 0.03, seg: 1 }), -0.13, hh + (H - hh) / 2, 0), wallCol));
      // Flur-Decke
      parts.push(colorize(L(box(back, 0.1, W - 0.2, 0, 0, 0, P.wallLow, { r: 0.01, seg: 1 }), -back / 2, H - 0.05, 0), (q, n, o) => { const c = C(P.wallLow); o[0] = c[0] * 0.5; o[1] = c[1] * 0.4; o[2] = c[2] * 0.4; }));
    }
    // Fachwerk-Balken vorn
    for (const lz of [-W / 2 + 0.12, W / 2 - 0.12]) parts.push(colorize(L(box(0.14, H, 0.18, 0, 0, 0, HWC.woodLow, { r: 0.03, seg: 1 }), 0.02, H / 2, lz), (q, n, o) => mixc(C(HWC.woodLow), C(HWC.wood), 0.4, o)));
    parts.push(colorize(L(box(0.14, 0.18, W, 0, 0, 0, HWC.woodLow, { r: 0.03, seg: 1 }), 0.02, H - 0.1, 0), (q, n, o) => mixc(C(HWC.woodLow), C(HWC.wood), 0.4, o)));
    // Dach (Prisma mit Überstand, krummer First)
    const roof = new THREE.CylinderGeometry(0.01, 1, 1, 3, 1);
    roof.rotateZ(Math.PI / 2); roof.rotateY(Math.PI / 2);
    roof.scale(D * 0.62 + 0.3, 1.7, W + 0.6);
    const rp = roof.attributes.position;
    for (let i = 0; i < rp.count; i++) { const z = rp.getZ(i), y = rp.getY(i); rp.setY(i, y + (y > 0.4 ? Math.sin(z * 0.9) * 0.18 : 0)); }
    roof.computeVertexNormals();
    parts.push(colorize(ni(L(roof, -D / 2, H + 0.75, 0)), (q, n, o) => { const st = Math.sin(q.y * 9) > 0.6; mixc(C(P.roof), C(P.roofHi), smooth(-0.2, 0.9, n.y) * 0.6 + (st ? 0.15 : 0), o); }));
    // Schornstein
    parts.push(colorize(L(box(0.5, 1.2, 0.5, 0, 0, 0, 0x8a5a4a, { r: 0.04, seg: 1 }), -D * 0.7, H + 1.2, W * 0.25), (q, n, o) => mixc(C(0x6a3a2a), C(0xa86a52), smooth(-0.5, 0.9, n.y + n.x * 0.3), o)));
    // Fenster (leuchtend) links und rechts der Tür
    for (const sd of [-1, 1]) {
      const win = box(0.06, 0.8, 0.7, 0, 0, 0, 0xffd27a, { r: 0.02, seg: 1 });
      glow.push(colorize(L(win, 0.03, 1.7, sd * winZ), (q, n, o) => mixc(C(0xff9a2a), C(0xfff0a0), smooth(p.y + 1.3, p.y + 2.1, q.y), o)));
      for (const [h, w, dy, dz] of [[0.86, 0.06, 0, 0], [0.06, 0.76, 0, 0]]) parts.push(colorize(L(box(0.08, h, w, 0, 0, 0, P.trim, { r: 0.01, seg: 1 }), 0.06, 1.7 + dy, sd * winZ + dz), (q, n, o) => { const c = C(P.trim); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }));
      parts.push(colorize(L(box(0.2, 0.08, 0.86, 0, 0, 0, P.trim, { r: 0.02, seg: 1 }), 0.1, 1.26, sd * winZ), (q, n, o) => { const c = C(P.trim); o[0] = c[0] * 0.9; o[1] = c[1] * 0.9; o[2] = c[2] * 0.9; }));
    }
  }
  if (reg) return { body: merge(parts), glow: merge(glow) };   // Rahmen, Schwelle, Matte, Licht bringt das Türmodell mit
  // Türrahmen und Schwelle
  for (const sd of [-1, 1]) parts.push(colorize(L(box(0.18, DOOR_H + 0.15, 0.16, 0, 0, 0, P.trim, { r: 0.03, seg: 1 }), 0.04, (DOOR_H + 0.15) / 2, sd * (DOOR_W / 2 + 0.08)), (q, n, o) => mixc(C(P.trim), C(0xffffff), 0.2, o)));
  parts.push(colorize(L(box(0.18, 0.16, DOOR_W + 0.32, 0, 0, 0, P.trim, { r: 0.03, seg: 1 }), 0.04, DOOR_H + 0.08, 0), (q, n, o) => mixc(C(P.trim), C(0xffffff), 0.2, o)));
  // dunkles Inneres hinter der Tür
  parts.push(colorize(L(box(0.04, DOOR_H, DOOR_W, 0, 0, 0, 0x2a1a20, { r: 0.0, seg: 1 }), -0.06, DOOR_H / 2, 0), (q, n, o) => { o[0] = 0.08; o[1] = 0.05; o[2] = 0.05; }));
  glow.push(colorize(L(box(0.02, DOOR_H * 0.8, DOOR_W * 0.8, 0, 0, 0, 0xffb050, { r: 0, seg: 1 }), -0.05, DOOR_H * 0.45, 0), (q, n, o) => mixc(C(0x8a3a10), C(0xffb050), smooth(p.y, p.y + DOOR_H, q.y) * 0.6, o)));
  // Treppenstufe mit Fußmatte
  parts.push(colorize(L(box(0.8, 0.2, 1.6, 0, 0, 0, 0x9a96a8, { r: 0.05, seg: 1 }), 0.4, 0.1, 0), (q, n, o) => mixc(C(HWC.stoneLow), C(HWC.stoneHi), smooth(-0.4, 1, n.y), o)));
  parts.push(colorize(L(box(0.5, 0.03, 0.9, 0, 0, 0, 0xc84a3a, { r: 0.01, seg: 1 }), 0.45, 0.215, 0), (q, n, o) => { const st = Math.sin(q.x * 18 + q.z * 18) > 0; mixc(C(0xc84a3a), C(0xff8a3a), st ? 0.5 : 0, o); }));
  return { body: merge(parts), glow: merge(glow) };
}

function doorLeafGeo(color) {
  const P = HOUSE[color] ?? HOUSE.lila;
  const parts = [];
  // Angel bei lz = −W/2 (lokal Ursprung), Tür erstreckt sich nach +lz
  const leaf = box(0.1, DOOR_H, DOOR_W, 0.05, DOOR_H / 2, DOOR_W / 2, P.door, { r: 0.04, seg: 1 });
  parts.push(colorize(leaf, (q, n, o) => { mixc(C(P.door), C(P.doorHi), smooth(-0.3, 1, n.x * 0.5 + n.y * 0.5) * 0.6, o); if (Math.abs(q.z - DOOR_W / 2) < 0.03 || Math.abs(q.y - DOOR_H * 0.55) < 0.03) mixc(o, C(P.wallLow), 0.5, o); }));
  // runder Oberteil-Bogen als Fensterchen (Mond)
  const win = new THREE.CircleGeometry(0.17, 14); win.rotateY(Math.PI / 2); win.translate(0.105, DOOR_H * 0.78, DOOR_W / 2);
  parts.push(colorize(ni(win), (q, n, o) => mixc(C(0xffb040), C(0xfff0a0), 0.5, o)));
  const knob = new THREE.SphereGeometry(0.06, 8, 6); knob.translate(0.14, DOOR_H * 0.48, DOOR_W * 0.85);
  parts.push(colorize(ni(knob), (q, n, o) => mixc(C(0xb8862a), C(0xffe08a), smooth(-0.4, 1, n.y), o)));
  // Klingelknopf (Kürbis) neben der Tür → am Rahmen, hier als Türklopfer
  const kl = new THREE.TorusGeometry(0.08, 0.02, 5, 12); kl.rotateY(Math.PI / 2); kl.translate(0.13, DOOR_H * 0.62, DOOR_W / 2);
  parts.push(colorize(ni(kl), (q, n, o) => mixc(C(0xb8862a), C(0xffe08a), 0.5, o)));
  return merge(parts);
}

class SuessigkeitenTuer extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'suessigkeiten_tuer');
    this.touch = false;
    this.shadow = 0;
    this.yaw = snapYaw(spec.yaw ?? -Math.PI / 2);
    this.half.set(0.6, 1, 0.6);
    this.group = spec.group ?? 'tueren';
    this.state = 'idle';
    this.t = 0;
    this.rings = 0;
    this.openK = 0;
    this.ringK = 0;
    this.dwell = new Map();
    this.lit = false;
    this.via = null;
    this.given = false;
    const p = this.pos, yaw = this.yaw;
    const house = spec.house !== false;
    // Registry-Modell 'suessigkeiten_tuer' (Tür mit Rahmen, Lampe, Matte; öffnet nach innen) – sonst eigenes Türblatt
    const reg = this.reg = hasModel('suessigkeiten_tuer');
    const dw = this.dw = reg ? 1.3 : DOOR_W, dh = this.dh = reg ? 2.4 : DOOR_H;
    this.nx = Math.cos(yaw); this.nz = -Math.sin(yaw);   // Blickrichtung der Tür (nach außen)
    const hw = reg ? 2.0 : 1.8;
    if (house) this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -3.0, -0.06, 3.0, -hw, hw, yaw), tag: 'haus' });
    else this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -0.3, -0.02, dh + 0.2, -dw / 2 - 0.2, dw / 2 + 0.2, yaw), tag: 'haus' });
    // Schwelle (Stampfen = klingeln) – nur zur eigenen Optik; die Registry-Tür hat eine flache Matte
    if (!reg) this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -0.02, 0.8, 0.2, -0.8, 0.8, yaw), tag: 'tuerschwelle' });
    const counts = (level.hwDoors ??= {});
    const c = counts[this.group] ??= { n: 0, of: 0, done: false, ids: [] };
    c.of++;
    if (spec.of) c.fixedOf = spec.of;
    if (level.view) {
      const { body, glow } = houseGeo(p, yaw, spec.color ?? 'lila', house, reg);
      addStatic(level, body);
      addStatic(level, glow, { material: 'glow', castShadow: false });
      const g = new THREE.Group();
      const hinge = new THREE.Group();
      const leafRoot = new THREE.Group();
      leafRoot.position.set(0, 0, -DOOR_W / 2);
      leafRoot.add(hinge);
      const m = modelOr('suessigkeiten_tuer', { color: spec.color ?? 'lila', width: dw, height: dh }, () => {
        const mesh = new THREE.Mesh(doorLeafGeo(spec.color ?? 'lila'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
        mesh.receiveShadow = true;
        return { root: mesh };
      });
      if (reg) g.add(m.root);   // ganze Tür im Ursprung (Schwelle), dreht selbst auf
      else { hinge.add(m.root); g.add(leafRoot); }
      // Türlampe (brennt nach dem Klingeln) – mit Registry-Tür als Wandlampe neben der Tür
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xffb040, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      lamp.scale.set(1.2, 1.2, 1); lamp.visible = false;
      if (reg) lamp.position.set(0.3, 2.0, dw / 2 + 0.55); else lamp.position.set(0.25, DOOR_H + 0.45, 0);
      g.add(lamp);
      this.hinge = reg ? null : hinge; this.leafModel = m; this.lamp = lamp;
      this.setModel({ root: g, update: (dt, s) => m.update?.(dt, s), dispose() {} });
    }
    if (LIST(spec.ring ?? ['stomp', 'tap', 'walk']).includes('tap')) {
      const taps = tapTargets(level);
      this.tap = taps.add({
        owner: this,
        box: () => yawBox(p.x, p.y, p.z, -0.1, 0.25, dh, -dw / 2, dw / 2, yaw),
        enabled: () => this.canRing(),
        reach: 3.5,
        hint: true,
        onTap: (via) => this.ring(via === 'touch' ? 'tap' : 'action'),
      });
    }
  }

  canRing() { return this.state === 'idle' && !this.hidden; }

  /** Schwelle gestampft (Motor: Stampfattacke landet auf einer Form mit owner.onPound). */
  onPound() { if (LIST(this.spec.ring ?? ['stomp', 'tap', 'walk']).includes('stomp')) this.ring('stomp'); }

  ring(via = 'code') {
    if (!this.canRing()) return false;
    this.state = 'ring'; this.t = 0; this.via = via; this.rings++;
    hwSfx(this.level, 'klingel', 'key');
    return true;
  }

  /** Vor der Tür: lokale Lage (lx nach außen, lz quer). */
  local(f) { const dx = f.pos.x - this.pos.x, dz = f.pos.z - this.pos.z; return { lx: dx * this.nx + dz * this.nz, lz: -dx * this.nz + dz * this.nx }; }

  give() {
    const L = this.level, spec = this.spec, p = this.pos;
    const front = (d, lat = 0) => [p.x + this.nx * d - this.nz * lat, p.y, p.z + this.nz * d + this.nx * lat];
    const content = spec.content ?? 'suesses';
    const n = spec.n ?? 5;
    let what = content;
    this.out = 0;
    if (content === 'muenzen' || content === 'coins') {
      for (let i = 0; i < n; i++) {
        const lat = (i - (n - 1) / 2) * 0.75, d = 1.7 + (i % 2) * 0.7;
        const q = front(d, lat);
        const ground = L.world.raycastDown(q[0], p.y + 1.5, q[2], 4);
        if (L.spawn('coin', { pos: [q[0], (ground?.y ?? p.y) + 0.15, q[2]] })) this.out++;
        L.effects?.coinPop({ x: q[0], y: p.y + 0.6, z: q[2] });
      }
      hwSfx(L, 'muenzregen', 'coin');
    } else if (content === 'suesses' || content === 'candy') {
      for (let i = 0; i < n; i++) {
        const lat = (i - (n - 1) / 2) * 0.55;
        const q = front(0.5, lat * 0.3);
        if (L.spawn('suessigkeit', { pos: [q[0], p.y + 1.1, q[2]], vel: [this.nx * (2.4 + (i % 3) * 0.6) - this.nz * lat * 1.6, 5.5 + (i % 2), this.nz * (2.4 + (i % 3) * 0.6) + this.nx * lat * 1.6] })) this.out++;
      }
      hwSfx(L, 'suessigkeit', 'berry');
    } else if (content === 'kuerbling' || (typeof content === 'string' && content !== 'nichts' && L.hasKind(content))) {
      const kind = content === 'kuerbling' && !L.hasKind('kuerbling') ? 'pilzling' : content;
      what = kind;
      const q = front(1.1);
      if (L.spawn(kind, { ...(spec.enemy ?? {}), pos: q, yaw: this.yaw, dir: [this.nx, this.nz], fromDoor: this.spec.id ?? true })) this.out++;
      L.effects?.dust({ x: q[0], y: q[1], z: q[2] }, 6, 1);
      hwSfx(L, 'buh', 'ghost');
    } else if (content && typeof content === 'object') runAction(L, content, { pos: front(1.4), source: this });
    return what;
  }

  update(dt) {
    const spec = this.spec;
    const ways = LIST(spec.ring ?? ['stomp', 'tap', 'walk']);
    // Stampfen vor der Tür (Schwelle/Matte): gerade mit einer Stampfattacke gelandet
    if (this.state === 'idle' && ways.includes('stomp')) {
      for (const f of figures(this.level)) {
        if (f.mode !== 'ground' || f.state !== 'land' || !f.poundLanded || (f.stateTime ?? 0) > 0.05) continue;
        const { lx, lz } = this.local(f);
        if (lx > -0.1 && lx < 1.3 && Math.abs(lz) < 0.95) { this.ring('stomp'); break; }
      }
    }
    if (this.state === 'idle' && ways.includes('walk')) {
      for (const f of figures(this.level)) {
        if (f.mode !== 'ground') { this.dwell.delete(f); continue; }
        const { lx, lz } = this.local(f);
        const facing = f.facingVec ? -(f.facingVec().x * this.nx + f.facingVec().z * this.nz) : 0;
        if (lx > 0 && lx < 1.45 && Math.abs(lz) < 0.8 && facing > 0.35) {
          const t = (this.dwell.get(f) ?? 0) + dt;
          this.dwell.set(f, t);
          if (t >= 0.25) { this.ring('walk'); this.dwell.clear(); break; }
        } else this.dwell.delete(f);
      }
    }
    if (this.state === 'idle' || this.state === 'done') return;
    this.t += dt;
    if (this.state === 'ring' && this.t >= 0.55) { this.state = 'open'; this.t = 0; hwSfx(this.level, 'tuer', 'gate'); }
    else if (this.state === 'open' && !this.given && this.t >= 0.35) {
      this.given = true;
      const what = this.give();
      this.lit = true;
      const c = this.level.hwDoors[this.group];
      c.n++;
      const of = c.fixedOf ?? c.of;
      const last = !c.done && c.n >= of;
      if (last) c.done = true;
      const p = this.pos;
      this.level.signal('klingeln', { id: spec.id ?? null, group: this.group, content: what, n: c.n, of, pos: [p.x, p.y, p.z], via: this.via, source: this });
      if (spec.hud !== false && of > 1) hwHud(this.level).set(`tueren:${this.group}`, { text: `Türen ${c.n}/${of}`, icon: 'tuer', done: c.done, color: 0xffb040 });
      if (last) {
        for (const e of this.level.entities) if (e.kind === 'suessigkeiten_tuer' && e.group === this.group && e.spec.onAll) runAction(this.level, e.spec.onAll, { pos: [p.x, p.y + 1, p.z], source: e });
        hwSfx(this.level, 'alle_tueren', 'key');
      }
    } else if (this.state === 'open' && this.t >= 1.9) { this.state = 'close'; this.t = 0; }
    else if (this.state === 'close' && this.t >= 0.4) { this.given = false; this.state = spec.once === false ? 'idle' : 'done'; this.t = 0; }
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.leafModel) return;
    const d = visDt(this.level, this._vh ??= {}, dt);
    const want = this.state === 'open' ? 1 : 0;
    this.openK += (want - this.openK) * Math.min(1, d * 7);
    this.ringK = this.state === 'ring' ? 1 : Math.max(0, this.ringK - d * 3);
    if (this.hinge) this.hinge.rotation.y = this.openK * 1.75 + Math.sin(t * 40) * 0.025 * this.ringK;
    if (this.lamp) { this.lamp.visible = this.lit; this.lamp.material.opacity = 0.75 + 0.1 * Math.sin(t * 5); }
    this.leafModel?.update?.(d, { open: this.openK, ring: this.ringK, lit: this.lit });
  }

  info() { return { state: this.state, rings: this.rings, via: this.via, lit: this.lit, out: this.out ?? 0, group: this.group, count: this.level.hwDoors?.[this.group] ?? null }; }
}

// ============================================================================================ Grabstein-Schalter

function graveGeo(face) {
  const parts = [], glow = [];
  const st = C(HWC.stone), hi = C(HWC.stoneHi), low = C(HWC.stoneLow), moss = C(HWC.moss);
  // Grabplatte (Druckfläche) – getrennt (sinkt), hier nur der Grabstein dahinter
  const head = new THREE.CylinderGeometry(0.55, 0.55, 0.28, 18, 1, false, 0, Math.PI);
  head.rotateX(Math.PI / 2); head.rotateZ(Math.PI / 2); head.rotateY(Math.PI / 2);
  head.translate(0, 1.05, 0);
  const body = new THREE.BoxGeometry(0.28, 1.05, 1.1); body.translate(0, 0.525, 0);
  for (const g of [head, body]) parts.push(colorize(ni(g), (p, n, o) => { mixc(low, st, smooth(-0.6, 0.8, n.x * 0.5 + n.y * 0.5), o); mixc(o, hi, smooth(0.6, 1, n.y) * 0.4, o); if (p.y < 0.25 && Math.sin(p.z * 12) > 0.2) mixc(o, moss, 0.5, o); }));
  const base = new THREE.BoxGeometry(0.5, 0.16, 1.3); base.translate(0, 0.08, 0);
  parts.push(colorize(ni(base), (p, n, o) => mixc(low, st, 0.5, o)));
  if (face) {
    // Lachgesicht: Augen leuchten, wenn gedrückt (Glüh-Teil), Mund geritzt
    for (const sd of [-1, 1]) {
      const e = new THREE.CircleGeometry(0.08, 10); e.scale(1, 1.25, 1); e.rotateY(Math.PI / 2); e.translate(0.145, 0.95, sd * 0.2);
      glow.push(colorize(ni(e), (p, n, o) => { o[0] = 1; o[1] = 0.85; o[2] = 0.4; }));
    }
    const m = new THREE.RingGeometry(0.12, 0.17, 12, 1, Math.PI * 1.1, Math.PI * 0.8); m.rotateY(Math.PI / 2); m.translate(0.145, 0.78, 0);
    parts.push(colorize(ni(m), (p, n, o) => { o[0] = 0.12; o[1] = 0.1; o[2] = 0.14; }));
  }
  return { body: merge(parts), glow: merge(glow) };
}

class GrabsteinSchalter extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'grabstein_schalter');
    this.touch = false;
    this.shadow = 0;
    this.yaw = snapYaw(spec.yaw ?? -Math.PI / 2);
    this.half.set(0.7, 0.2, 0.7);
    this.pressed = false;
    this.presses = 0;
    this.timer = 0;
    this.k = 0;
    this.wasOn = false;
    const p = this.pos, yaw = this.yaw;
    // Registry-Modell 'grabstein_schalter': Grabstein auf Sockel, Knopf oben (sinkt 0,35 m) – man springt oben drauf.
    // Sonst eigene Optik: Grabplatte (Druckfläche) vor dem Stein (lokal lx −0,15..1,25, lz ±0,6), Grabstein bei lx −0,45.
    const reg = hasModel('grabstein_schalter');
    const regModel = reg ? getModel('grabstein_schalter') : null;
    if (regModel) {
      const b = modelBox(regModel);
      this.plateUp = Math.max(0.3, b.max.y); this.plateDown = this.plateUp - 0.35;
      this.plate = this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, b.min.x, b.max.x, this.plateUp, b.min.z, b.max.z, yaw), tag: 'grabstein_schalter' });
    } else {
      this.plateUp = 0.3; this.plateDown = 0.1;
      this.plate = this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -0.15, 1.25, 0.3, -0.6, 0.6, yaw), tag: 'grabstein_schalter' });
      this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -0.62, -0.28, 1.5, -0.62, 0.62, yaw), tag: 'grabstein' });
    }
    this.plateTop = p.y + this.plateUp;
    if (!level.view) regModel?.dispose?.();
    if (level.view) {
      const g = new THREE.Group();
      const stone = regModel ?? modelOr('grabstein_schalter', {}, () => {
        const { body, glow } = graveGeo(spec.face !== false);
        const r = new THREE.Group();
        const mb = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
        mb.castShadow = true; mb.receiveShadow = true;
        mb.position.x = -0.45;
        this.eyeMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x333333 });
        const eg = new THREE.Mesh(glow, this.eyeMat); eg.position.x = -0.45;
        // Platte (sinkt)
        const pl = box(1.35, 0.3, 1.2, 0, 0, 0, HWC.stone, { r: 0.06, seg: 1 });
        const plate = new THREE.Mesh(colorize(pl, (q, n, o) => { mixc(C(HWC.stoneLow), C(HWC.stoneHi), smooth(-0.4, 1, n.y), o); if (n.y > 0.5 && Math.abs(Math.hypot(q.x, q.z) - 0.32) < 0.04) mixc(o, C(0x6a6a7a), 0.6, o); }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
        plate.position.set(0.55, 0.15, 0);
        plate.receiveShadow = true;
        r.add(mb, eg, plate);
        this.plateMesh = plate;
        return { root: r };
      });
      g.add(stone.root);
      this.inner = stone;
      this.setModel({ root: g, update: (dt, s) => stone.update?.(dt, s), dispose() {} });
    }
  }

  press(via = 'code') {
    if (this.hidden) return;
    const spec = this.spec;
    if (this.pressed) { if (spec.toggle) this.release(); return; }
    if (spec.once && this.presses > 0) return;
    this.pressed = true;
    this.presses++;
    this.timer = spec.time ?? 0;
    const p = this.pos;
    this.level.sfx('switch');
    hwSfx(this.level, 'grabstein', 'ghost');
    this.level.effects?.ring({ x: p.x, y: this.plateTop, z: p.z }, 1.2);
    this.level.effects?.sparks({ x: p.x - Math.cos(this.yaw) * 0.45, y: p.y + 1.1, z: p.z + Math.sin(this.yaw) * 0.45 }, 10);
    runAction(this.level, spec.on, { pos: [p.x, p.y + 1, p.z], source: this });
    if (spec.signal) this.level.signal(spec.signal, { pos: [p.x, p.y, p.z], source: this, via, pressed: true });
    this.setPlate(true);
  }

  release() {
    if (!this.pressed) return;
    this.pressed = false;
    const p = this.pos;
    this.level.sfx('switch');
    countdown(this.level).hide(this);
    runAction(this.level, this.spec.off, { pos: [p.x, p.y + 1, p.z], source: this });
    if (this.spec.signal) this.level.signal(this.spec.signal, { pos: [p.x, p.y, p.z], source: this, pressed: false });
    this.setPlate(false);
  }

  setPlate(down) {
    const s = this.plate;
    const top = this.pos.y + (down ? this.plateDown : this.plateUp);
    s.max = [s.max[0], top, s.max[2]];
    const id = this.shapes[0];
    if (id !== undefined) this.level.world.update(id);
  }

  open() { this.press(); }
  toggle() { if (this.pressed) this.release(); else this.press(); }
  start() { this.press(); }
  stop() { this.release(); }

  onPound() { this.press('pound'); }

  update(dt) {
    const on = playerOn(this.level, this);
    if ((this.spec.press ?? 'stand') === 'stand' && on && !this.wasOn) this.press('stand');
    this.wasOn = on;
    if (this.pressed && this.timer > 0) {
      this.timer -= dt;
      countdown(this.level).show(this, this.timer, '', '#b8a8ff');
      if (this.timer <= 0) this.release();
    }
  }

  modelState() { return { pressed: this.k, glow: this.pressed ? 1 : 0 }; }

  render(dt, t) {
    super.render(dt, t);
    const d = visDt(this.level, this._vh ??= {}, dt);
    this.k += ((this.pressed ? 1 : 0) - this.k) * Math.min(1, d * 12);
    if (this.plateMesh) this.plateMesh.position.y = 0.15 - 0.2 * this.k;
    if (this.eyeMat) this.eyeMat.color.setScalar(0.25 + 0.95 * this.k + (this.pressed ? 0.08 * Math.sin(t * 6) : 0));
  }

  info() { return { pressed: this.pressed, presses: this.presses, timer: +this.timer.toFixed(2), top: +this.plate.max[1].toFixed(2) }; }
}

// ============================================================================================ Riesenkürbis

const _n = { x: 0, y: 1, z: 0 };

class Riesenkuerbis extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'riesenkuerbis');
    this.size = spec.size ?? 1.8;
    const R = this.R = this.size / 2;
    this.half.set(R * 0.92, R * 1.02, R * 0.92);
    this.shadow = R * 0.9;
    this.speed0 = spec.speed ?? 3;
    this.vmax = spec.max ?? 9;
    this.life = spec.life ?? 16;
    this.age = 0;
    this.rolled = 0;
    this.roll = 0;
    this.state = 'roll';
    this.stateT = 0;
    this.pushCool = new Map();
    const d = spec.dir ?? (spec.yaw !== undefined ? [Math.cos(spec.yaw), -Math.sin(spec.yaw)] : [0, 1]);
    const l = Math.hypot(d[0], d[1]) || 1;
    this.hv = { x: (d[0] / l) * this.speed0, z: (d[1] / l) * this.speed0 };
    this.yaw = Math.atan2(-this.hv.z, this.hv.x);
    this.path = spec.path ? spec.path.map((q) => ({ x: q[0], y: q[1], z: q[2] })) : null;
    if (this.path) {
      this.segs = [];
      let L = 0;
      for (let i = 0; i < this.path.length - 1; i++) { const a = this.path[i], b = this.path[i + 1]; const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); this.segs.push({ a, b, len, s0: L }); L += len; }
      this.L = L; this.s = 0; this.v = this.speed0;
      this.pos.set(this.path[0].x, this.path[0].y, this.path[0].z);
    }
    if (level.view) {
      const color = spec.color ?? 'orange';
      const m = modelOr('riesenkuerbis_roll', { size: this.size, color, face: spec.faceKind ?? 'staunen' }, () => {
        const pk = pumpkinGeo({ r: R, shape: 'dick', color, ribs: 12, seg: 30 });
        const g = new THREE.Group();
        // liegt auf der Seite: Stielachse quer zur Rollrichtung (lokal ±Z), rollt wie ein Rad
        const spin = new THREE.Group();
        const ry = R * 0.9, rx = R * 1.1;
        spin.position.y = rx * 0.97;
        pk.body.translate(0, -ry * 0.94, 0);
        pk.body.rotateX(Math.PI / 2);
        const mb = new THREE.Mesh(pk.body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: 0x3a1400 }));
        mb.castShadow = true;
        spin.add(mb);
        if (spec.face !== false) {
          const f = faceGeo({ r: R, shape: 'dick', kind: 'grinsen' });
          f.translate(0, -ry * 0.94, 0);
          f.rotateX(Math.PI / 2);
          spin.add(new THREE.Mesh(f, new THREE.MeshBasicMaterial({ vertexColors: true })));
        }
        g.add(spin);
        g.userData.spin = spin;
        return { root: g };
      });
      this.setModel(m);
    }
  }

  speed() { return this.path ? this.v : Math.hypot(this.hv.x, this.hv.z); }

  update(dt) {
    this.stateT += dt;
    this.age += dt;
    if (this.state === 'burst') { if (this.stateT > 0.8) this.kill(); return; }
    if (this.age > this.life) { this.burst(); return; }
    for (const [f, t] of this.pushCool) { if (t <= dt) this.pushCool.delete(f); else this.pushCool.set(f, t - dt); }
    const x0 = this.pos.x, z0 = this.pos.z;
    if (this.path) {
      const sg = this.segs.find((q) => this.s <= q.s0 + q.len) ?? this.segs[this.segs.length - 1];
      const slope = sg.len > 0 ? (sg.b.y - sg.a.y) / sg.len : 0;
      this.v = Math.min(this.vmax, Math.max(this.speed0 * 0.6, this.v - slope * 14 * dt));
      this.s += this.v * dt;
      if (this.s >= this.L) { this.burst(); return; }
      const g = this.segs.find((q) => this.s <= q.s0 + q.len) ?? this.segs[this.segs.length - 1];
      const t = g.len > 0 ? (this.s - g.s0) / g.len : 0;
      this.pos.set(g.a.x + (g.b.x - g.a.x) * t, g.a.y + (g.b.y - g.a.y) * t, g.a.z + (g.b.z - g.a.z) * t);
      this.yaw = Math.atan2(-(g.b.z - g.a.z), g.b.x - g.a.x);
    } else {
      // Hang: bergab beschleunigen und einlenken
      if (this.grounded && this.ground) {
        surfaceNormal(this.ground, _n);
        if (Math.hypot(_n.x, _n.z) > 0.02) { this.hv.x += _n.x * 18 * dt; this.hv.z += _n.z * 18 * dt; }
        else {
          const sp = this.speed();
          if (sp > this.speed0) { const f = Math.max(this.speed0, sp - 1.2 * dt) / sp; this.hv.x *= f; this.hv.z *= f; }
        }
        const sp = this.speed();
        if (sp > this.vmax) { this.hv.x *= this.vmax / sp; this.hv.z *= this.vmax / sp; }
      }
      this.vel.x = this.hv.x; this.vel.z = this.hv.z;
      const res = this.moveWithGravity(dt, { step: 0.35 });
      if (this.removed) return;
      if (res.hitWall && this.stateT > 0.1) { this.burst(); return; }
      const sp = this.speed();
      if (sp > 0.2) this.yaw = Math.atan2(-this.hv.z, this.hv.x);
      for (const s of this.level.world.overlapAABB(this.center(), this.half)) {
        if ((s.kill || s.lava) && this.pos.y < s.top + 0.02) { this.burst(); return; }
      }
    }
    const moved = Math.hypot(this.pos.x - x0, this.pos.z - z0);
    this.rolled += moved;
    this.roll += moved / (this.R * 1.1);
  }

  burst() {
    if (this.state === 'burst') return;
    this.state = 'burst'; this.stateT = 0;
    this.touch = false;
    const c = this.center();
    hwSfx(this.level, 'kuerbis_platzt', 'brickbreak');
    this.level.effects?.debris(c, HWC.pk, 12);
    this.level.effects?.debris(c, HWC.glow, 4);
    this.level.effects?.dust(this.pos, 6, 1.4);
    if (this.spec.drop) runAction(this.level, this.spec.drop, { pos: [this.pos.x, this.pos.y + 0.5, this.pos.z], source: this });
  }

  onPlayer(player, contact) {
    if (this.state === 'burst') return 'none';
    if (contact.star) { this.burst(); return 'none'; }
    if (contact.pound) { this.burst(); return 'stomp'; }
    if (contact.fromAbove) return 'stomp';
    // seitlich: verletzen (und wegstoßen); unverwundbar oder hurt: false → nur wegstoßen
    if (this.spec.hurt !== false && !player.invulnerable) return 'hurt';
    if (!this.pushCool.has(player)) { this.pushCool.set(player, 0.35); player.knockback?.(this); }
    return 'none';
  }

  onHit(kind) {
    if (this.state === 'burst') return;
    if (['fire', 'claw', 'shell', 'pound', 'mega', 'star', 'bomb', 'cannon', 'explosion'].includes(kind)) this.burst();
  }

  render(dt, t) {
    if (!this.model) return;
    this.syncModel();
    const d = visDt(this.level, this, dt);
    const spin = this.model.root.userData.spin;
    if (spin) {
      spin.rotation.z = -this.roll;
      if (this.state === 'burst') { const k = Math.min(1, this.stateT / 0.25); spin.scale.set(1 + k * 0.4, 1 - k * 0.7, 1 + k * 0.4); }
    } else if (this.state === 'burst') {
      // Registry-Modell: kurz aufblähen, dann weg (Trümmer zeigen die Effekte)
      const k = Math.min(1, this.stateT / 0.25);
      this.model.root.scale.set(1 + k * 0.3, 1 - k * 0.6, 1 + k * 0.3);
    }
    if (this.state === 'burst') this.model.root.visible = this.stateT < 0.3;
    // Registry: roll = Strecke / Radius (rollt nach +X), speed für Staub
    this.model.update?.(d, { roll: spin ? this.roll : this.rolled / (this.size / 2), speed: this.speed(), anim: this.state === 'burst' ? 'burst' : 'roll', progress: this.state === 'burst' ? Math.min(1, this.stateT / 0.7) : undefined });
  }

  info() { return { state: this.state, x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), speed: +this.speed().toFixed(2), rolled: +this.rolled.toFixed(2), age: +this.age.toFixed(2) }; }
}

// ============================================================================================ Hüllen: Bausteine als kind

const BUILD = {
  geisterplattform: buildGeisterplattform, besen_plattform: buildBesenPlattform, hexenkessel: buildHexenkessel,
  spinnennetz_trampolin: buildSpinnennetzTrampolin, kuerbis_kanone: buildKuerbisKanone, riesenkuerbis_roll: buildRiesenkuerbisRoll,
};

class BlockShell extends Gimmick {
  constructor(level, spec, kind) {
    super(level, spec, kind);
    this.touch = false;
    this.shadow = 0;
    this.handle = BUILD[kind]?.(level, { ...spec, type: kind }) ?? null;
    if (spec.id && this.handle) queueMicrotask(() => { if (level.named.get(spec.id) === this) level.named.set(spec.id, this.handle); });
  }
  info() { return this.handle?.info?.() ?? null; }
}

const shell = (kind) => (level, spec) => new BlockShell(level, spec, kind);

export const KINDS = {
  laterne: (level, spec) => new Laterne(level, spec),
  laternenpfahl: (level, spec) => new Laternenpfahl(level, spec),
  suessigkeit: (level, spec) => new Suessigkeit(level, spec),
  suessigkeiten: (level, spec) => { spawnCandies(level, spec); return null; },
  suessigkeiten_tuer: (level, spec) => new SuessigkeitenTuer(level, spec),
  grabstein_schalter: (level, spec) => new GrabsteinSchalter(level, spec),
  riesenkuerbis: (level, spec) => new Riesenkuerbis(level, spec),
  geisterplattform: shell('geisterplattform'),
  besen_plattform: shell('besen_plattform'),
  hexenkessel: shell('hexenkessel'),
  spinnennetz_trampolin: shell('spinnennetz_trampolin'),
  kuerbis_kanone: shell('kuerbis_kanone'),
  riesenkuerbis_roll: shell('riesenkuerbis_roll'),
};
