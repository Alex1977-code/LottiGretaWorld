// Gimmick-Entitäten Welt 2 (Kurs-Modus). Alle auch als `type` in LEVEL.segments verwendbar (blocks/types/w2_misc.js).
// Aktionen (onBreak, reward, onFall, last …) im Format von entities/gimmick.js ({ reveal, spawn, star, power, coins … }).
//
// kristallwand – zerbrechliche Kristallwand (2-2): Stampfattacke von oben, Kanonenkugel (onHit 'cannon'), Bombe,
//   Riesentrank zerbrechen sie; dahinter ein Geheimnis (onBreak). Kollision mit Flag breakable (= Modus).
//   { kind: 'kristallwand', pos: [x, y, z] (Mitte der Unterseite), size: [w, h, d] ([3, 3, 1]),
//     breakable: 'pound' (Standard: Stampfen, Kanone, Bombe, Riesentrank) | 'cannon' (nur Kanonenkugel, Bombe,
//     Riesentrank), hits: 1, climbable: false (true → Krallen-Kletterwand), color: 'cyan'|'violet'|'pink'|'gold',
//     onBreak: Aktion, id, hidden }
//   Schnittstelle für die Kanonenkugel (Motor): onHit('cannon', kugel) an der Entität bzw. shape.owner.onHit('cannon',
//   kugel, shape) für Formen mit breakable.  Laufzeit: broken (true nach dem Zerbrechen), hp.
//
// antipp_block – Block, den man antippt (Touch: Bildschirm; sonst Aktionstaste in Reichweite): zerbricht und gibt
//   seinen Inhalt. Auch Stampfen/Tatzenhieb/Bombe/Riesentrank zerbrechen ihn.
//   { kind: 'antipp_block', pos (Mitte der Unterseite, 1-m-Würfel), content: 'coin' (Standard) | 'coins:3' |
//     'star:1' | Power-up-Name | Aktion, look: 'crystal' (Standard) | 'brick' | 'sand' | 'question', reach: 4.5, id }
// antipp_muenze – schwebende Münze, die man auch aus der Ferne antippen kann (fliegt zur Figur).
//   { kind: 'antipp_muenze', pos, reach: 0 (nur Touch) }
//
// wachs_block – wachsender ?-Block (2-5): Kopfstoß von unten (oder Stampfen von oben) lässt ihn um `step` m wachsen –
//   der ?-Block steigt auf einer Säule aus Blöcken und trägt, wer obendrauf steht (Treppe/Aufzug). Je Wachsen
//   `coins` Münzen; ganz oben einmal `last` (Inhalt/Aktion), danach leer.
//   { kind: 'wachs_block', pos: [x, y, z] (Unterkante der Säule = Unterkante des Blocks am Anfang; schwebend, damit
//     man ihn von unten trifft), height: 4 (Endhöhe der Blockunterkante über pos.y), step: 1, coins: 1,
//     last: 'coins:5' (z. B. 'star:2' | Power-up | Aktion), pound: true, speed: 5 (m/s Wachsen), id }
//   Laufzeit: grow (0..1), cur (m), used.
//
// roter_ring – roter Ring (2-4, 2-5, 2-Panzer): Durchlaufen → acht rote Münzen für `time` s (Zeitanzeige über der
//   Figur); alle eingesammelt → Belohnung. Zeit um → Münzen weg; mit retry erneut startbar.
//   { kind: 'roter_ring', pos: [x, y, z] (Fußpunkt; Ring-Mitte bei y + 1,15), yaw: π/2 (Durchlaufrichtung entlang Z),
//     coins: [[x, y, z], …] | { from, to, n } | { pos, r, n } (Standard: Kreis r 3 um pos, 8 Münzen), time: 10,
//     reward: Aktion (Standard { power: 'oneup' }) | star: Index, retry: true, id, hidden }
//   Laufzeit: state ('idle'|'active'|'done'), got, timeLeft.
// rote_muenze – rote Münze (meist vom Ring erzeugt; einzeln: { kind: 'rote_muenze', pos, hidden }), zählt als Münze.
//
// tuer – Tür mit Rahmen (2-3, 2-Haus): öffnet sich bei Annäherung (auto) oder per Signal { open: id } (verschlossen
//   bis dahin), schließt per { hide/close }. Mit target führt sie woandershin: hineingehen → Figur läuft hinein,
//   kommt an der Zieltür (oder am Punkt) wieder heraus.
//   { kind: 'tuer', id, pos: [x, y, z] (Mitte der Schwelle), yaw: −π/2 (Vorderseite zur Kamera +Z; Durchgang entlang
//     der Blickrichtung), width: 1.6, height: 2.4, style: 'holz' | 'stein', locked: false, open: false (beginnt offen),
//     auto: true, autoClose: true, target: Id einer Tür | [x, y, z] (Absetzpunkt), onEnter: Aktion,
//     key: Id | [Ids] (Schlüssel: sind diese benannten Objekte eingesammelt/besiegt, öffnet sich die verschlossene Tür) }
//   Laufzeit: openK (0..1), locked, open(), close(). Hinweis: der Flügel schwingt zur Vorderseite (Modell 'tuer').
//
// holz_silhouette – Sperrholz-Aufsteller mit der Silhouette von Baron Brummbär (2-3): Tatzenhieb, Feuerball, Panzer,
//   Bombe, Riesentrank, Stampfwelle daneben oder Hineinrennen (≥ 6,5 m/s) werfen ihn nach hinten um; dahinter z. B.
//   Münzen/Weg/verängstigter Krümel → onFall.
//   { kind: 'holz_silhouette', pos (Fußpunkt), yaw: −π/2 (Vorderseite zur Kamera, fällt von ihr weg), onFall: Aktion,
//     push: true (Hineinrennen wirft um), id }
//   Laufzeit: state ('stand'|'falling'|'down').
//
// goldschalter – goldener Druckschalter (Goldröhren-Raum 2-1): Draufspringen/Stampfen → Münzregen im Bereich.
//   { kind: 'goldschalter', pos, area: { pos: [x, y, z] (Boden-Mitte), size: [w, d] } | { pos, r } (Standard: r 5 um
//     den Schalter), time: 8 (s Regen), rate: 7 (Münzen/s), height: 9 (Fallhöhe), life: 7 (s, bis liegende Münzen
//     verschwinden), id }
// fallmuenze – fallende Münze (Münzregen): { kind: 'fallmuenze', pos, vel: [vx, vy, vz], life: 7 }

import * as THREE from 'three';
import { Gimmick, runAction, contentAction, countdown, playerOn, visDt } from '../gimmick.js';
import { getModel } from '../../models/index.js';
import { coinTemplate, blockTemplate } from '../visuals.js';
import { tapTargets } from '../tap.js';
import { box, merge, lin, mixc } from '../../blocks/kit.js';
import { figures } from '../../blocks/w2kit.js';

const sz3 = (a, d) => (Array.isArray(a) ? { x: a[0] ?? d[0], y: a[1] ?? d[1], z: a[2] ?? d[2] } : { x: d[0], y: d[1], z: d[2] });

/** Achsenparalleler Umriss eines lokal (lx, ly, lz) großen Quaders um (x, y-unten, z), gedreht um yaw. */
function yawBox(x, y, z, lx0, lx1, ly, lz0, lz1, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const xs = [], zs = [];
  for (const a of [lx0, lx1]) for (const b of [lz0, lz1]) { xs.push(x + a * c + b * s); zs.push(z - a * s + b * c); }
  return { min: [Math.min(...xs), y, Math.min(...zs)], max: [Math.max(...xs), y + ly, Math.max(...zs)] };
}

// =============================================================================================
// Kristallwand
// =============================================================================================
const CRYSTAL = { cyan: [0xbff8ff, 0x52d8f0, 0x1f86b8], violet: [0xead6ff, 0xa865ff, 0x5a2aa8], pink: [0xffd8ef, 0xff7ac0, 0xa83a7a], gold: [0xfff2b8, 0xffcf3a, 0xb0801a] };
const BREAK_POUND = new Set(['pound', 'cannon', 'bomb', 'mega']);
const BREAK_CANNON = new Set(['cannon', 'bomb', 'mega']);

function crystalGeo(s, colors) {
  const [hi, mid, lo] = colors.map((c) => lin(c));
  const parts = [];
  const nx = Math.max(1, Math.round(s.x)), ny = Math.max(1, Math.round(s.y)), nz = Math.max(1, Math.round(s.z));
  const cx = s.x / nx, cy = s.y / ny, cz = s.z / nz;
  const facet = (g, x, y, z) => {
    const pos = g.attributes.position, nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      // Licht von oben links vorn: helle Facetten oben, dunklere unten
      const k = Math.max(0, Math.min(1, 0.5 + nor.getY(v) * 0.45 - nor.getX(v) * 0.25 + nor.getZ(v) * 0.2));
      const o = mixc(mid, hi, k, [0, 0, 0]);
      col[v * 3] = o[0]; col[v * 3 + 1] = o[1]; col[v * 3 + 2] = o[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    g.translate(x, y, z);
    return g;
  };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    const x = -s.x / 2 + (i + 0.5) * cx, y = (j + 0.5) * cy, z = -s.z / 2 + (k + 0.5) * cz;
    const g = box(cx - 0.05, cy - 0.05, cz - 0.05, x, y, z, 0xffffff, { r: 0.07, seg: 1 });
    const pos = g.attributes.position, col = g.attributes.color, nor = g.attributes.normal;
    for (let v = 0; v < pos.count; v++) {
      const ly = (pos.getY(v) - y) / cy + 0.5;              // 0 unten … 1 oben
      const o = [0, 0, 0];
      mixc(lo, mid, Math.min(1, ly * 1.2), o);
      if (nor.getY(v) > 0.6) mixc(o, hi, 0.35, o);
      col.setXYZ(v, o[0], o[1], o[2]);
    }
    parts.push(g);
    // geschliffene Facetten (flacher Oktaeder) vorn, hinten und oben je Zelle
    const r = Math.min(cx, cy) * 0.36;
    for (const sz of [1, -1]) {
      if ((sz > 0 && k === nz - 1) || (sz < 0 && k === 0)) {
        const o = new THREE.OctahedronGeometry(r, 0);
        o.scale(1, 1, 0.32);
        parts.push(facet(o, x, y, z + sz * (cz / 2 - 0.01)));
      }
    }
    if (j === ny - 1) {
      const o = new THREE.OctahedronGeometry(Math.min(cx, cz) * 0.34, 0);
      o.scale(1, 0.3, 1);
      parts.push(facet(o, x, y + cy / 2 - 0.01, z));
    }
  }
  return merge(parts);
}

class Kristallwand extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'kristallwand');
    const s = sz3(spec.size, [3, 3, 1]);
    this.size = s;
    this.half.set(s.x / 2, s.y / 2, s.z / 2);
    this.touch = false;
    this.mode = spec.breakable === 'cannon' ? 'cannon' : 'pound';
    this.hp = spec.hits ?? 1;
    this.broken = false;
    const p = this.pos;
    // Form-Flag: true = Stampfen bricht (Player.land ruft onHit('pound')); 'cannon' = Stampfen prallt ab, die Kanonenkugel
    // (Präzisierung Motor Welt 2) ruft owner.onHit('cannon', kugel, form); Bombe und Riesentrank rufen onHit für beide
    this.addSolid({ type: 'box', min: [p.x - s.x / 2, p.y, p.z - s.z / 2], max: [p.x + s.x / 2, p.y + s.y, p.z + s.z / 2], breakable: this.mode === 'cannon' ? 'cannon' : true, climbable: !!spec.climbable, tag: 'kristallwand' });
    this.colors = CRYSTAL[spec.color ?? 'cyan'] ?? CRYSTAL.cyan;
    if (level.view) {
      const mesh = new THREE.Mesh(crystalGeo(s, this.colors), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.1, emissive: new THREE.Color(this.colors[2]).multiplyScalar(0.25) }));
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.setModel({ root: mesh, update() {}, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } });
    }
  }

  /** Treffer: kind ∈ pound | cannon | bomb | mega (je nach Modus); Stampfen zählt nur von oben. */
  onHit(kind, source) {
    if (this.broken || this.hidden) return;
    const ok = this.mode === 'cannon' ? BREAK_CANNON.has(kind) : BREAK_POUND.has(kind);
    if (!ok) { if (kind === 'pound' || kind === 'claw') this.level.sfx('blockhit'); return; }
    if (kind === 'pound' && source?.pos) {
      const s = this.size, p = this.pos, q = source.pos;
      const above = q.y >= p.y + s.y - 0.35 && Math.abs(q.x - p.x) < s.x / 2 + 0.35 && Math.abs(q.z - p.z) < s.z / 2 + 0.35;
      if (!above) return;
    }
    this.hp--;
    this.level.shake?.(0.2);
    if (this.hp > 0) { this.level.sfx('blockhit'); this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.size.y, z: this.pos.z }, 6); return; }
    this.shatter();
  }

  onPound(player) { this.onHit('pound', player); }

  shatter() {
    if (this.broken) return;
    this.broken = true;
    const s = this.size, p = this.pos;
    const n = Math.min(10, Math.max(1, Math.round(s.x) * Math.round(s.y)));
    for (let i = 0; i < n; i++) {
      const x = p.x + ((i % Math.max(1, Math.round(s.x))) + 0.5 - s.x / 2), y = p.y + (Math.floor(i / Math.max(1, Math.round(s.x))) + 0.5);
      this.level.effects?.debris({ x, y, z: p.z }, this.colors[1], 5);
    }
    this.level.sfx('brickbreak');
    this.hide();
    runAction(this.level, this.spec.onBreak, { pos: [p.x, p.y + 0.2, p.z], source: this });
  }
}

// =============================================================================================
// Antipp-Block und Antipp-Münze
// =============================================================================================
const BLOCK_BREAK = new Set(['pound', 'claw', 'bomb', 'mega', 'shell', 'cannon', 'fire']);

class AntippBlock extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'antipp_block');
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    this.content = contentAction(spec.content, { coins: 1 });
    this.look = spec.look ?? 'crystal';
    this.broken = false;
    this.crumble = -1;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], breakable: true, tag: 'antipp_block' });
    this.tap = tapTargets(level).add({
      owner: this, reach: spec.reach ?? 4.5,
      box: () => ({ min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5] }),
      enabled: () => !this.broken && !this.hidden && this.alive,
      onTap: (via) => this.smash(via),
    });
    if (level.view) {
      if (this.look === 'sand') this.setModel(getModel('sandblock'));
      else {
        this.pool = level.view.pool(`block:${this.look}`, () => blockTemplate(this.look), { castShadow: true, capacity: 32 });
        this.idx = this.pool.alloc();
      }
    }
  }

  onHit(kind) { if (BLOCK_BREAK.has(kind)) this.smash('hit'); }
  onBump() { this.level.sfx('blockhit'); }

  smash(via) {
    if (this.broken) return;
    this.broken = true;
    this.removeShapes();
    const p = this.pos;
    const col = this.look === 'sand' ? 0xf0c878 : this.look === 'brick' ? 0xd8743a : this.look === 'question' ? 0xffc21a : 0x9fe8ff;
    this.level.effects?.debris({ x: p.x, y: p.y + 0.4, z: p.z }, col, 8);
    this.level.sfx(this.look === 'sand' ? 'sand_crumble' : 'brickbreak');
    runAction(this.level, this.content, { pos: [p.x, p.y + 1, p.z], source: this, via });
    if (this.look === 'sand') this.crumble = 0; else this.kill();
  }

  update(dt) {
    if (this.crumble >= 0) { this.crumble += dt; if (this.crumble > 0.8) this.kill(); }
  }

  render(dt, t) {
    if (this.pool) {
      if (this.hidden || this.broken) this.pool.hide(this.idx);
      else this.pool.set(this.idx, this.pos.x, this.pos.y, this.pos.z, 0, 1);
      return;
    }
    super.render(dt, t);
  }

  modelState() { return this.crumble >= 0 ? { anim: 'crumble' } : { anim: 'idle' }; }

  dispose() {
    tapTargets(this.level).remove(this.tap);
    if (this.pool && this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

class AntippMuenze extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'antipp_muenze');
    this.half.set(0.38, 0.42, 0.38);
    this.fly = null;
    this.pool = level.view?.pool('coin', coinTemplate, { castShadow: false, capacity: 64 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.tap = tapTargets(level).add({
      owner: this, reach: spec.reach ?? 0, hint: spec.hint ?? false,
      box: () => ({ min: [this.pos.x - 0.4, this.pos.y, this.pos.z - 0.4], max: [this.pos.x + 0.4, this.pos.y + 0.85, this.pos.z + 0.4] }),
      enabled: () => this.alive && !this.hidden && !this.fly,
      onTap: () => { this.fly = 0; this.touch = false; this.level.sfx('select'); },
    });
  }

  update(dt) {
    if (this.fly === null) return;
    this.fly += dt;
    const p = this.level.player;
    if (!p) return;
    const c = p.center();
    const k = Math.min(1, dt * 9);
    this.pos.x += (c.x - this.pos.x) * k; this.pos.y += (c.y - 0.4 - this.pos.y) * k; this.pos.z += (c.z - this.pos.z) * k;
    if (this.fly > 0.3) this.collect();
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'fire' || kind === 'mega') this.collect(); }

  collect() {
    if (!this.alive) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 6);
    this.kill();
  }

  render(dt, t) {
    if (this.idx < 0) return;
    if (this.hidden) { this.pool.hide(this.idx); return; }
    this.pool.set(this.idx, this.pos.x, this.pos.y + Math.sin(t * 2.6) * 0.05, this.pos.z, t * (this.fly !== null ? 14 : 2.6));
  }

  dispose() {
    tapTargets(this.level).remove(this.tap);
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

// =============================================================================================
// Wachsender ?-Block
// =============================================================================================
class WachsBlock extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'wachs_block');
    this.half.set(0.5, 0.5, 0.5);
    this.touch = false;
    this.height = Math.max(1, spec.height ?? 4);
    this.stepH = spec.step ?? 1;
    this.speed = spec.speed ?? 5;
    this.cur = 0; this.target = 0;
    this.n = 0; this.anim = 'idle';
    this.used = false;
    const p = this.pos;
    this.mover = { dx: 0, dy: 0, dz: 0, vx: 0, vy: 0, vz: 0, dyaw: 0, cx: p.x, cz: p.z };
    this.shape = this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 1, p.z + 0.5], mover: this.mover, tag: 'wachs_block' });
    if (level.view) this.setModel(getModel('wachs_block', { height: this.height }));
  }

  get grow() { return this.cur / this.height; }

  onBump() { this.grow1(); }
  onPound() { if (this.spec.pound !== false) this.grow1(); }

  grow1() {
    this.n++;
    this.anim = 'bump';
    if (this.used || this.hidden) { this.level.sfx('blockhit'); return; }
    const top = { x: this.pos.x, y: this.pos.y + this.target + 1, z: this.pos.z };
    this.target = Math.min(this.height, this.target + this.stepH);
    const coins = this.spec.coins ?? 1;
    if (coins > 0) runAction(this.level, { coins }, { pos: [top.x, top.y + this.stepH, top.z], source: this });
    this.level.sfx('blockhit');
    if (this.target >= this.height - 1e-6) {
      this.used = true;
      const last = contentAction(this.spec.last ?? 'coins:5', null);
      const pos = [top.x, this.pos.y + this.height + 1, top.z];
      if (last?.power) { this.level.spawn('powerup', { pos, power: last.power, emerge: true }); this.level.sfx('powerup_appear'); }
      else runAction(this.level, last, { pos, source: this });
    }
  }

  update(dt) {
    const m = this.mover;
    const d = this.target - this.cur;
    const step = Math.sign(d) * Math.min(Math.abs(d), this.speed * dt);
    this.cur += step;
    m.dy = step; m.vy = step / dt;
    if (step) {
      const s = this.shape, p = this.pos;
      s.max = [p.x + 0.5, p.y + this.cur + 1, p.z + 0.5]; s.min = [p.x - 0.5, p.y, p.z - 0.5];
      if (s.id) this.level.world.update(s.id);
    }
  }

  modelState() { return { grow: this.grow, anim: this.used ? 'idle' : this.anim, n: this.n }; }
}

// =============================================================================================
// Roter Ring und rote Münzen
// =============================================================================================
class RoteMuenze extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'rote_muenze');
    this.owner = spec.owner ?? null;
    this.half.set(0.38, 0.45, 0.38);
    this.pool = level.view?.pool('rote_muenze', () => getModel('rote_muenze').root, { castShadow: false, capacity: 16 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.phase = (this.pos.x * 1.3 + this.pos.z * 0.7) % 6.28;
    this.render(0, 0);
  }

  render(dt, t) {
    dt = visDt(this.level, this, dt);
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (this.idx < 0) return;
    if (this.hidden) { this.pool.hide(this.idx); return; }
    const k = this.popT > 0 ? 1 - this.popT / 0.45 : 1;
    const blink = this.owner?.state === 'active' && this.owner.timeLeft < 3 && Math.floor(t * 8) % 2 === 0;
    if (blink) { this.pool.hide(this.idx); return; }
    this.pool.set(this.idx, this.pos.x, this.pos.y + Math.sin(t * 2.6 + this.phase) * 0.05, this.pos.z, t * 3 + this.phase, Math.min(1, 0.2 + k));
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'mega' || kind === 'fire') this.collect(); }

  collect() {
    if (!this.alive || this.hidden) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 10);
    this.kill();
    this.owner?.onCoin?.(this);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

function coinSpots(spec, pos, n0 = 8) {
  const c = spec.coins;
  if (Array.isArray(c) && Array.isArray(c[0])) return c;
  if (c?.from && c?.to) {
    const n = c.n ?? n0, out = [];
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); out.push(c.from.map((a, k) => a + (c.to[k] - a) * t)); }
    return out;
  }
  const p = c?.pos ?? [pos.x, pos.y + 0.4, pos.z], r = c?.r ?? 3, n = c?.n ?? n0;
  return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [p[0] + Math.cos(a) * r, p[1], p[2] + Math.sin(a) * r]; });
}

class RoterRing extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'roter_ring');
    this.time = spec.time ?? 10;
    this.retry = spec.retry !== false;
    this.spots = coinSpots(spec, this.pos);
    this.reward = spec.reward ?? (spec.star !== undefined ? { star: spec.star } : { power: 'oneup' });
    this.state = 'idle';
    this.timeLeft = 0;
    this.got = 0;
    this.coins = [];
    this.rearm = 0;
    this.yaw = spec.yaw ?? Math.PI / 2;
    const ax = Math.abs(Math.cos(this.yaw)), az = Math.abs(Math.sin(this.yaw));
    this.half.set(ax * 0.45 + az * 1.1, 1.15, az * 0.45 + ax * 1.1);
    if (level.view) this.setModel(getModel('roter_ring'));
  }

  center(out = this._c) { return out.set(this.pos.x, this.pos.y + 1.15, this.pos.z); }

  onPlayer() {
    if (this.state === 'idle' && this.rearm <= 0) this.begin();
    return 'none';
  }

  begin() {
    if (this.state !== 'idle' || this.hidden) return;
    this.state = 'active';
    this.timeLeft = this.time;
    this.got = 0;
    for (const c of this.coins) if (c.alive) c.kill();
    this.coins = this.spots.map((p) => this.level.spawn('rote_muenze', { pos: p, owner: this })).filter(Boolean);
    for (const c of this.coins) c.popT = 0.45;
    this.level.sfx('switch');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1.15, z: this.pos.z }, 16);
  }

  onCoin(coin) {
    if (this.state !== 'active') return;
    this.got++;
    this.lastCoin = coin;
    if (this.got >= this.coins.length) this.succeed();
  }

  succeed() {
    this.state = 'done';
    countdown(this.level).hide(this);
    this.level.sfx('key');
    const r = this.reward;
    const c = this.lastCoin?.pos ?? this.pos;
    const rp = r && !Array.isArray(r) && r.pos ? r.pos : [c.x, c.y + 0.3, c.z];
    runAction(this.level, r, { pos: rp, source: this });
  }

  fail() {
    for (const c of this.coins) if (c.alive) c.kill();
    this.coins = [];
    countdown(this.level).hide(this);
    this.level.sfx('vanish');
    this.state = this.retry ? 'idle' : 'done';
    this.rearm = 1.0;
  }

  update(dt) {
    if (this.rearm > 0) this.rearm -= dt;
    if (this.state !== 'active') return;
    this.timeLeft -= dt;
    countdown(this.level).show(this, this.timeLeft, `${this.got}/${this.coins.length}`, '#ff5a4a');
    if (this.timeLeft <= 0) this.fail();
  }

  modelState() { return { anim: this.state }; }

  dispose() {
    countdown(this.level).hide(this);
    super.dispose();
  }
}

// =============================================================================================
// Tür
// =============================================================================================
class Tuer extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'tuer');
    this.w = spec.width ?? 1.6;
    this.h = spec.height ?? 2.4;
    this.yaw = spec.yaw ?? -Math.PI / 2;
    this.locked = !!spec.locked;
    this.want = spec.open ? 1 : 0;
    this.openK = this.want;
    this.touch = false;
    this.cool = 0;
    this.half.set(0.5, this.h / 2, 0.5);
    const p = this.pos, W = this.w, H = this.h;
    // Rahmen-Pfosten (fest), Türblatt (fest, solange zu)
    for (const s of [-1, 1]) {
      const b = yawBox(p.x, p.y, p.z, -0.22, 0.22, H + 0.3, s > 0 ? W / 2 : -W / 2 - 0.3, s > 0 ? W / 2 + 0.3 : -W / 2, this.yaw);
      this.addSolid({ type: 'box', ...b, tag: 'tuer:rahmen' });
    }
    const lb = yawBox(p.x, p.y, p.z, -0.1, 0.1, H, -W / 2, W / 2, this.yaw);
    this.leaf = { type: 'box', ...lb, owner: this, tag: 'tuer:blatt' };
    this.leafId = null;
    this.setLeaf(this.openK < 0.6);
    if (level.view) this.setModel(getModel('tuer', { width: W, height: H, style: spec.style ?? 'holz' }));
  }

  setLeaf(on) {
    if (on && !this.leafId && !this.hidden) this.leafId = this.level.world.add(this.leaf);
    else if (!on && this.leafId) { this.level.world.remove(this.leafId); this.leafId = null; }
  }

  /** Vorderseite (lokal +X) als Weltrichtung. */
  get front() { return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) }; }

  open() { this.locked = false; this.want = 1; this.level.sfx('switch'); }
  close() { this.want = 0; }
  hide() { this.close(); }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    // Schlüssel: alle genannten Objekte eingesammelt/besiegt (nicht mehr da) → Tür geht auf
    if (this.locked && this.spec.key && this.want === 0) {
      const ids = Array.isArray(this.spec.key) ? this.spec.key : [this.spec.key];
      if (ids.every((id) => { const o = this.level.named.get(id); return !o || o.alive === false || o.removed; })) this.open();
    }
    const f = this.front;
    let near = false;
    const rel = (pl) => {
      const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z;
      return { front: dx * f.x + dz * f.z, along: Math.abs(-dx * f.z + dz * f.x) };   // + vor der Tür / seitlich
    };
    for (const pl of figures(this.level)) {
      const r = rel(pl);
      if (Math.abs(r.front) < 2.4 && r.along < this.w / 2 + 0.9 && Math.abs(pl.pos.y - this.pos.y) < 1.6) near = true;
    }
    if (!this.locked && this.spec.auto !== false) {
      if (near) this.want = 1;
      else if (this.spec.autoClose !== false && this.openK > 0 && !this.spec.open) this.want = 0;
    }
    const k0 = this.openK;
    if (this.want > this.openK) this.openK = Math.min(this.want, this.openK + dt * 2.6);
    else if (this.want < this.openK) this.openK = Math.max(this.want, this.openK - dt * 2.2);
    if (k0 < 0.05 && this.openK >= 0.05) this.level.sfx('step');
    this.setLeaf(this.openK < 0.6);
    // Durchgang mit Ziel: vor der Tür auf sie zu laufen (jede Figur; Klone reisen mit der Haupt-Figur mit)
    if (this.spec.target !== undefined && this.openK > 0.8 && this.cool <= 0) {
      for (const pl of figures(this.level)) {
        if (pl.mode !== 'ground') continue;
        const r = rel(pl), into = -(pl.vel.x * f.x + pl.vel.z * f.z);
        if (r.front > 0 && r.front < 0.75 && r.along < this.w / 2 - 0.2 && into > 0.8) { this.enter(pl); break; }
      }
    }
  }

  /** Ziel: { pos, yaw, door } */
  exitInfo() {
    const t = this.spec.target;
    if (typeof t === 'string') {
      const o = this.level.named.get(t);
      if (!o?.pos) { console.warn(`[Tür] Ziel ${t} fehlt`); return null; }
      const f = o.front ?? { x: 0, z: 1 };
      return { pos: [o.pos.x + f.x * 1.1, o.pos.y + 0.02, o.pos.z + f.z * 1.1], yaw: Math.atan2(-f.z, f.x), door: o };
    }
    if (Array.isArray(t)) return { pos: t, yaw: -this.yaw, door: null };
    return null;
  }

  enter(player) {
    const ex = this.exitInfo();
    if (!ex) return;
    const f = this.front;
    const level = this.level;
    this.cool = 1.5;
    runAction(level, this.spec.onEnter, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    level.sfx('pipe');
    const door = this;
    let phase = 'in', t = 0;
    player.ride({
      step(p, dt) {
        t += dt;
        if (phase === 'in') {
          p.pos.x -= f.x * 2.2 * dt; p.pos.z -= f.z * 2.2 * dt;
          p.vel.set(-f.x * 2.2, 0, -f.z * 2.2);
          p.yaw = Math.atan2(f.z, -f.x);
          if (t > 0.45) {
            phase = 'out'; t = 0;
            if (ex.door) { ex.door.want = 1; ex.door.openK = 1; ex.door.setLeaf?.(false); ex.door.cool = 1.5; }
            const ef = ex.door?.front ?? { x: Math.cos(ex.yaw), z: -Math.sin(ex.yaw) };
            p.pos.set(ex.pos[0] - ef.x * 0.9, ex.pos[1], ex.pos[2] - ef.z * 0.9);
            p.yaw = ex.yaw;
            level.onTeleport?.();
            door.want = 0;
          }
        } else {
          const ef = ex.door?.front ?? { x: Math.cos(ex.yaw), z: -Math.sin(ex.yaw) };
          p.pos.x += ef.x * 2 * dt; p.pos.z += ef.z * 2 * dt;
          p.vel.set(ef.x * 2, 0, ef.z * 2);
          if (t > 0.45) return true;
        }
        return false;
      },
      exit(p) { p.vel.set(0, -1, 0); },
    }, { state: 'walk', kind: 'tuer' });
  }

  modelState() { return { open: this.openK }; }

  dispose() { this.setLeaf(false); super.dispose(); }
}

// =============================================================================================
// Holz-Silhouette
// =============================================================================================
const FELLERS = new Set(['claw', 'fire', 'shell', 'bomb', 'mega', 'pound', 'throw', 'cannon', 'star', 'bump']);

class HolzSilhouette extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'holz_silhouette');
    this.yaw = spec.yaw ?? -Math.PI / 2;
    this.state = 'stand';
    this.fall = 0;
    this.wobble = 0;
    this.half.set(0.75, 1.4, 0.75);
    const p = this.pos;
    this.board = this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -0.12, 0.12, 2.8, -0.72, 0.72, this.yaw), tag: 'holz_silhouette' });
    if (level.view) this.setModel(getModel('holz_silhouette'));
  }

  onPlayer(player, contact) {
    if (this.state !== 'stand') return 'none';
    if (this.spec.push !== false && contact.speed >= 6.5) { this.topple(); return 'none'; }
    if (this.wobble <= 0) { this.wobble = 1.2; this.level.sfx('step'); }
    return 'none';
  }

  onHit(kind) { if (FELLERS.has(kind)) this.topple(); }

  topple() {
    if (this.state !== 'stand') return;
    this.state = 'falling';
    this.fall = 0;
    this.level.sfx('claw');
    this.removeShapes();
    this.solids.length = 0;
  }

  update(dt) {
    if (this.wobble > 0) this.wobble -= dt;
    if (this.state !== 'falling') return;
    this.fall = Math.min(1, this.fall + dt * 1.8);
    if (this.fall >= 1) {
      this.state = 'down';
      const p = this.pos;
      // umgefallenes Brett: flache, begehbare Platte hinter den Fußbrettern
      this.addSolid({ type: 'box', ...yawBox(p.x, p.y, p.z, -0.45 - 2.7, -0.45, 0.14, -0.72, 0.72, this.yaw), tag: 'holz_silhouette:liegt' });
      const f = { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
      this.level.effects?.dust({ x: p.x - f.x * 1.8, y: p.y, z: p.z - f.z * 1.8 }, 10, 1.4);
      this.level.shake?.(0.25);
      this.level.sfx('slam');
      runAction(this.level, this.spec.onFall, { pos: [p.x - f.x * 1.5, p.y + 0.4, p.z - f.z * 1.5], source: this });
    }
  }

  modelState() { return { anim: this.wobble > 0 && this.state === 'stand' ? 'wobble' : 'idle', fall: this.state === 'stand' ? 0 : this.fall }; }
}

// =============================================================================================
// Goldschalter (Münzregen) und fallende Münze
// =============================================================================================
class Goldschalter extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'goldschalter');
    this.half.set(0.5, 0.28, 0.5);
    this.touch = false;
    const p = this.pos;
    this.btn = this.addSolid({ type: 'box', min: [p.x - 0.5, p.y, p.z - 0.5], max: [p.x + 0.5, p.y + 0.55, p.z + 0.5], tag: 'goldschalter' });
    this.state = 'idle';
    this.t = 0; this.acc = 0; this.wasOn = false;
    this.time = spec.time ?? 8;
    this.rate = spec.rate ?? 7;
    const a = spec.area ?? { pos: [p.x, p.y, p.z], r: 5 };
    this.area = { c: a.pos ?? [p.x, p.y, p.z], size: a.size ?? null, r: a.r ?? 5 };
    this.rnd = level.rnd;
    if (level.view) this.setModel(getModel('push_switch_gold'));
  }

  onPound() { this.press(); }

  press() {
    if (this.state !== 'idle' || this.hidden) return;
    this.state = 'rain';
    this.t = 0;
    this.level.sfx('slam');
    this.level.sfx('key');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }, 18);
    const s = this.btn; s.max = [s.x1, this.pos.y + 0.2, s.z1]; s.min = [s.x0, this.pos.y, s.z0];
    if (s.id) this.level.world.update(s.id);
  }

  update(dt) {
    if (this.state === 'idle') {
      // eine Figur (auch ein Klon) landet mit Schwung auf dem Knopf
      const on = playerOn(this.level, this);
      const hard = figures(this.level).some((p) => p.mode === 'ground' && p.ground?.owner === this && p.lastLandVy < -2 && p.stateTime < 0.1);
      if (hard) this.press();
      this.wasOn = on;
      return;
    }
    if (this.state !== 'rain') return;
    this.t += dt;
    countdown(this.level).show(this, this.time - this.t, 'Münzregen!', '#ffc21a');
    this.acc += dt * this.rate;
    while (this.acc >= 1) {
      this.acc -= 1;
      const A = this.area, r = this.rnd;
      let x, z;
      if (A.size) { x = A.c[0] + r.real(-A.size[0] / 2, A.size[0] / 2); z = A.c[2] + r.real(-A.size[1] / 2, A.size[1] / 2); }
      else { const a = r.real(0, Math.PI * 2), d = Math.sqrt(r.frac()) * A.r; x = A.c[0] + Math.cos(a) * d; z = A.c[2] + Math.sin(a) * d; }
      this.level.spawn('fallmuenze', { pos: [x, A.c[1] + (this.spec.height ?? 9), z], vel: [0, -2, 0], life: this.spec.life ?? 7 });
    }
    if (this.t >= this.time) { this.state = 'done'; countdown(this.level).hide(this); }
  }

  modelState() { return { anim: this.state === 'idle' ? 'idle' : 'pressed' }; }

  dispose() { countdown(this.level).hide(this); super.dispose(); }
}

class FallMuenze extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'fallmuenze');
    this.half.set(0.36, 0.4, 0.36);
    const v = spec.vel ?? [0, 0, 0];
    this.vel.set(v[0], v[1], v[2]);
    this.life = spec.life ?? 7;
    this.age = 0;
    this.bounced = false;
    this.pool = level.view?.pool('coin', coinTemplate, { castShadow: false, capacity: 64 }) ?? null;
    this.idx = this.pool ? this.pool.alloc() : -1;
    this.spin = (this.pos.x * 3.1 + this.pos.z * 1.7) % 6.28;
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) { this.kill(); return; }
    const wasGround = this.grounded;
    const res = this.moveWithGravity(dt, { gravity: 30 });
    if (res.grounded && !wasGround && !this.bounced) { this.bounced = true; this.vel.y = 3.2; this.grounded = false; }
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind === 'claw' || kind === 'fire' || kind === 'mega') this.collect(); }

  collect() {
    if (!this.alive) return;
    this.level.addCoins(1);
    this.level.sfx('coin');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.45, z: this.pos.z }, 4);
    this.kill();
  }

  render(dt, t) {
    if (this.idx < 0) return;
    if (this.life - this.age < 1.5 && Math.floor(t * 10) % 2 === 0) { this.pool.hide(this.idx); return; }
    this.pool.set(this.idx, this.pos.x, this.pos.y, this.pos.z, t * 5 + this.spin);
  }

  dispose() {
    if (this.idx >= 0) this.pool.release(this.idx);
    this.idx = -1;
    super.dispose();
  }
}

export const KINDS = {
  kristallwand: (level, spec) => new Kristallwand(level, spec),
  antipp_block: (level, spec) => new AntippBlock(level, spec),
  antipp_muenze: (level, spec) => new AntippMuenze(level, spec),
  wachs_block: (level, spec) => new WachsBlock(level, spec),
  roter_ring: (level, spec) => new RoterRing(level, spec),
  rote_muenze: (level, spec) => new RoteMuenze(level, spec),
  tuer: (level, spec) => new Tuer(level, spec),
  holz_silhouette: (level, spec) => new HolzSilhouette(level, spec),
  goldschalter: (level, spec) => new Goldschalter(level, spec),
  fallmuenze: (level, spec) => new FallMuenze(level, spec),
};
