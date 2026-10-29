// Boss-Marathon B-12 „Boss Blitz“ (Bonuswelt Blume, Präzisierung Gegner Bonuswelten): wiederverwendbare Bausteine, damit das Level
// nur Daten braucht. Zusammen mit dem Boss-Archetyp (LEVEL.bosses: je Kampf ein Eintrag mit trigger) und dem Baustein
// 'weltraum_arena' (blocks/types/bossblitz_bonus.js).
//
// bossblitz_hub – Hub-Schlüssel-Logik. Legt je Kampf eine Hub-Warp-Box an (Entität 'bossblitz_box', Plakette mit dem Bild des
//   Endgegners), führt per Warp-Box in den Arena-Raum (Ankunft `to`, der Checkpoint wandert mit), beobachtet die Endgegner und
//   gibt nach jedem Sieg einen **Schlüssel** (Entität 'bossblitz_schluessel' steigt in der Arena auf). Mit dem Schlüssel erscheint
//   die Rück-Warp-Box (`ret`), die zurück in den Hub führt – die Figur steigt aus der Box ihres Kampfs, die Box wird „erledigt“
//   (Deckel zu, grüner Haken; nicht mehr betretbar). Sind alle Schlüssel da (keys, Standard: Zahl der Kämpfe ohne final), springt
//   das Schloss der letzten Box auf, sobald die Figur im Hub ist (radius) – dahinter der letzte Kampf (Würfelblase). Nach dem
//   letzten Sieg: Rück-Warp-Box zu `back` (z. B. Zielplatz), Signal 'bossblitzSieg', Aktion onWin. HUD „Schlüssel n/N“ (keyHud).
//   Die Endgegner bekommen die Nacht-Weltraum-Fassung: Sternenstaub-Kranz (Modell 'sternenstaub'; aura: false = ohne).
//   { kind: 'bossblitz_hub', id: 'hub', pos: [x, y, z] (Hub-Mitte), radius: 12 (Hub-Bereich für Ankunft/Aufschließen),
//     start?: [x, y, z] (Neustart-Punkt im Hub; Standard pos + 4 m nach +Z),
//     fights: [{ boss: 'kq' (Id des Endgegners bzw. der boss_gruppe), box: [x, y, z] (Hub-Warp-Box, Mitte Unterseite),
//                to: [x, y, z] (Ankunft im Arena-Raum), ret: [x, y, z] (Rück-Warp-Box im Arena-Raum), key?: [x, y, z]
//                (Schlüssel; Standard: Arenamitte des Endgegners bzw. ret + 3 m), icon?: 'kippquader' | 'schatten' | 'lavafelsen'
//                | 'wirbel' | 'schlangen' | 'blase' (Bild; Standard nach der Art des Endgegners), final?: true (verschlossen bis
//                alle Schlüssel da sind; gibt keinen Schlüssel), back?: [x, y, z] (nur final: Ziel der Rück-Warp-Box; Standard
//                Hub-Start), yaw?: Blick bei der Ankunft (Standard: zur Arenamitte), id?: Id der Hub-Box (Standard
//                `${hub}_${boss}`) }, …],
//     keys?: 5, aura?: true, banners?: true, onKey?: Aktion, onOpen?: Aktion, onWin?: Aktion }
//   Laufzeit: keys, need, open, won (Ids), done (Ids erledigter Boxen), fights (je Kampf { boss, won, key, keyGot, done }),
//   inHub(), info(). Signale: 'bossSchluessel' { boss, n, of, pos }, 'bossblitzOffen' { n }, 'bossblitzSieg' { boss, pos }.
//
// bossblitz_box – Hub-Warp-Box (1,6 × 1,2 × 1,6 m wie 'warpbox', Modell 'warp_box' + 'bossblitz_box_deko'): Landen auf der Öffnung
//   zieht die Figur hinein (zu target); verschlossen (locked: Vorhängeschloss, Deckel) bzw. erledigt (Deckel, Haken) ist sie zu
//   (Hinweis-Ansage). Als Röhren-Ziel nutzbar (x, z, top, disarm) – die Rück-Warp-Box der Arena zielt auf sie.
//   { kind: 'bossblitz_box', id, pos, target: [x, y, z] | Id, icon?, locked?: false, hub?, fight? }
//   Methoden: unlock() (Schloss springt auf), markDone(); Laufzeit: locked, done, entered, info().
//
// bossblitz_schluessel – Boss-Schlüssel: steigt aus dem Boden (0,8 s, unberührbar), schwebt; Berühren (auch Angriffe) sammelt ihn.
//   { kind: 'bossblitz_schluessel', pos, hub?, fight?, onCollect?: Aktion }   Laufzeit: collected.
//
// boss_gruppe – mehrere Endgegner als **ein** Kampf des Boss-Archetyps (B-12: beide Schlangenkönige zugleich). Die Mitglieder
//   (Ids, beliebige Endgegner mit Boss-Schnittstelle) warten auf begin() wie Endgegner aus LEVEL.bosses (w6help.js bossManaged),
//   beginnen gemeinsam, werden gemeinsam zurückgesetzt; die Lebensleiste zeigt die Summe (hp, maxHp). Treffer und Siege der
//   Mitglieder meldet die Gruppe an den Archetyp weiter (level.onBossHit(gruppe, …)); besiegt ist sie, wenn alle besiegt sind
//   („Noch einer!“), weg, wenn alle verschwunden sind – dann erscheint ihr Stern.
//   { kind: 'boss_gruppe', id, members: ['sk_gruen', 'sk_rosa'], pos?: [x, y, z] (Mitte; Standard: Mitte der Mitglieder),
//     star?: { pos, index } | [x, y, z], banner?: 'Noch einer!' }   (Mitglieder ohne eigenen star)
//   Laufzeit: state ('wait' | 'intro' | 'fight' | 'defeated' | 'gone'), hp, maxHp, down (besiegte Mitglieder), hits, hitLog, info().

import * as THREE from 'three';
import { CourseEntity } from '../CourseEntity.js';
import { Gimmick, playerOn, runAction } from '../gimmick.js';
import { getModel, hasModel } from '../../models/index.js';
import { keyHud } from '../../blocks/w5kit.js';
import { aura, bannerOf, archOf, figures, activeFigure, P3, clamp } from '../bonushelp.js';

const W = 1.6, H = 1.2;
const ICON_OF = {
  kippquader_koenig: 'kippquader', schattenlaeuferin: 'schatten', lavafelsen_koenig: 'lavafelsen', wirbelbrocken: 'wirbel',
  schlangenkoenig: 'schlangen', boss_gruppe: 'schlangen', wuerfelblase: 'blase',
};

// =====================================================================================================================
// Hub-Warp-Box
// =====================================================================================================================
class BlitzBox extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'bossblitz_box');
    this.half.set(W / 2, H / 2, W / 2);
    this.touch = false;
    this.top = this.pos.y + H;
    this.target = spec.target ?? null;
    this.locked = !!spec.locked;
    this.done = false;
    this.openT = this.locked ? 0 : 1;
    this.entered = 0;
    this.hub = spec.hub ?? null;
    this.fight = spec.fight ?? null;
    const p = this.pos;
    this.addSolid({ type: 'box', min: [p.x - W / 2, p.y, p.z - W / 2], max: [p.x + W / 2, this.top, p.z + W / 2], tag: 'warpbox' });
    this.armed = true;
    this.armT = 0;
    this.suckT = 0;
    this.hintT = 0;
    this.pipe = true;
    if (level.view) {
      const box = getModel('warp_box', { style: 'warp' });
      const deco = hasModel('bossblitz_box_deko') ? getModel('bossblitz_box_deko', { icon: spec.icon }) : null;
      const root = new THREE.Group();
      root.add(box.root);
      if (deco) root.add(deco.root);
      this.setModel({
        root,
        update: (dt, st) => { box.update(dt, st.box); deco?.update(dt, st.deco); },
        dispose: () => { box.dispose(); deco?.dispose(); },
      });
    }
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }
  get open() { return !this.locked && !this.done; }

  disarm() { this.armed = false; this.armT = 0; }

  unlock() {
    if (!this.locked) return;
    this.locked = false;
    this.openT = 0;
    this.level.sfx('gate'); this.level.sfx('key');
    this.level.effects?.sparks({ x: this.pos.x, y: this.top + 0.4, z: this.pos.z }, 26);
    this.level.effects?.ring({ x: this.pos.x, y: this.pos.y + 0.05, z: this.pos.z }, 2);
  }

  markDone() {
    if (this.done) return;
    this.done = true;
    this.level.sfx('room_clear');
    this.level.effects?.sparks({ x: this.pos.x, y: this.top + 0.6, z: this.pos.z }, 20);
  }

  update(dt) {
    if (this.suckT > 0) this.suckT -= dt;
    if (this.hintT > 0) this.hintT -= dt;
    if (this.openT < 1 && !this.locked) this.openT = Math.min(1, this.openT + dt / 1.2);
    if (this.hidden) return;
    const pl = this.level.player;
    const sc = pl?.script;
    if (sc?.type === 'pipe' && sc.exit && Math.abs(sc.exit.x - this.pos.x) < 0.01 && Math.abs(sc.exit.z - this.pos.z) < 0.01) this.disarm();
    const on = playerOn(this.level, this);
    if (!this.armed) {
      if (!on) { this.armT += dt; if (this.armT > 0.25) this.armed = true; } else this.armT = 0;
      return;
    }
    if (!on) return;
    if (!this.open || this.openT < 0.9) {
      if (this.hintT <= 0) {
        this.hintT = 3;
        if (this.locked) { bannerOf(this.level, `Sammle erst alle Schlüssel!`, { color: '#ffd84a' }); this.level.sfx('bump'); }
        else if (this.done) bannerOf(this.level, 'Hier hast du schon gewonnen!', { color: '#a8ffb0' });
      }
      return;
    }
    this.enter(pl);
  }

  exitInfo() {
    const t = this.target;
    if (t === null || t === undefined) return null;
    if (typeof t === 'string') {
      const o = this.level.named.get(t);
      if (!o) return null;
      if (o.pipe) return { exit: { pipe: true, x: o.x, z: o.z, top: o.top }, target: o };
      if (o.pos) return { exit: { pos: [o.pos.x, o.pos.y + 0.1, o.pos.z] }, target: o };
      return null;
    }
    return { exit: { pos: t }, target: null };
  }

  enter(player) {
    const info = this.exitInfo();
    if (!info || !player || player.dead || player.mode === 'script') return;
    this.suckT = 0.8;
    this.entered++;
    this.hub?.onEnter?.(this.fight, this);
    player.enterPipe({
      x: this.pos.x, z: this.pos.z, top: this.top, exit: info.exit,
      onWarp: () => { info.target?.disarm?.(); if (info.target) info.target.suckT = 0.8; this.hub?.onWarped?.(this.fight, this); },
    });
  }

  modelState() {
    const near = this.open && this.level.player && Math.hypot(this.level.player.pos.x - this.pos.x, this.level.player.pos.z - this.pos.z) < 6;
    return {
      box: { anim: this.suckT > 0 ? 'suck' : 'idle' },
      deco: { locked: this.locked ? 1 : 0, open: this.openT, done: this.done ? 1 : 0, glow: this.open ? (near ? 1 : 0.55) : 0 },
    };
  }

  info() { return { locked: this.locked, done: this.done, open: this.open, entered: this.entered, openT: +this.openT.toFixed(2) }; }
}

// =====================================================================================================================
// Boss-Schlüssel
// =====================================================================================================================
const RISE = 0.8, COLLECT = 0.6;
class BlitzKey extends Gimmick {
  constructor(level, spec) {
    super(level, spec, 'bossblitz_schluessel');
    this.half.set(0.55, 0.9, 0.55);
    this.shadow = 0.5;
    this.state = 'rise';
    this.stateT = 0;
    this.collected = false;
    this.hub = spec.hub ?? null;
    this.fight = spec.fight ?? null;
    this.touch = false;
    if (level.view) this.setModel(getModel('bossblitz_schluessel'));
    level.sfx('powerup_appear');
    level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 0.8, z: this.pos.z }, 24);
  }

  update(dt) {
    this.stateT += dt;
    if (this.state === 'rise' && this.stateT >= RISE) { this.state = 'idle'; this.stateT = 0; this.touch = true; }
    if (this.state === 'collect' && this.stateT >= COLLECT) this.kill();
  }

  collect() {
    if (this.collected || this.state === 'rise') return;
    this.collected = true;
    this.state = 'collect';
    this.stateT = 0;
    this.touch = false;
    this.level.sfx('key');
    this.level.sfx('star');
    this.level.effects?.sparks({ x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }, 30);
    runAction(this.level, this.spec.onCollect, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    this.hub?.keyCollected?.(this.fight, this);
  }

  onPlayer() { this.collect(); return 'collect'; }
  onHit(kind) { if (kind !== 'bump' && kind !== 'pound') this.collect(); }

  modelState() {
    if (this.state === 'rise') return { anim: 'rise', progress: clamp(this.stateT / RISE, 0, 1) };
    if (this.state === 'collect') return { anim: 'collect', progress: clamp(this.stateT / COLLECT, 0, 1) };
    return { anim: 'idle' };
  }

  render(dt, t) {
    // Gimmick.render skaliert beim Erscheinen; der Schlüssel hat eigene Aufstiegs-Animation
    this.syncModel();
    if (this.model) { this.model.root.visible = !this.hidden; this.model.update(dt, this.modelState()); }
    void t;
  }

  info() { return { state: this.state, collected: this.collected }; }
}

// =====================================================================================================================
// Boss-Gruppe (mehrere Endgegner zugleich)
// =====================================================================================================================
class BossGruppe extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'boss_gruppe');
    this.enemy = false;
    this.boss = true;
    this.touch = false;
    this.shadow = 0;
    this.half.set(0.8, 0.8, 0.8);
    this.ids = (spec.members ?? []).slice();
    level.bossMembers ??= new Set();
    for (const id of this.ids) level.bossMembers.add(id);
    this.members = [];
    this.home = this.pos.clone();
    this.fixedHome = !!spec.pos;
    this.state = 'wait';
    this.stateT = 0;
    this.visible = true;
    this.carHits = 0;
    this.hits = 0;
    this.hitLog = [];
    this.down = new Set();
    this.hooked = false;
    this.starDone = false;
    this.name = spec.name ?? null;
  }

  resolve() {
    if (this.members.length === this.ids.length) return this.members;
    this.members = this.ids.map((id) => this.level.named.get(id)).filter(Boolean);
    if (!this.fixedHome && this.members.length) {
      let x = 0, y = 0, z = 0;
      for (const m of this.members) { const h = m.home ?? m.pos; x += h.x; y += h.y; z += h.z; }
      const n = this.members.length;
      this.home.set(x / n, y / n, z / n);
      this.pos.copy(this.home);
    }
    return this.members;
  }

  /** Treffer/Siege der Mitglieder als Gruppe an den Archetyp melden (einmal, nach dessen setup()). */
  hook() {
    if (this.hooked) return;
    this.hooked = true;
    const L = this.level;
    const prevHit = L.onBossHit, prevDef = L.onBossDefeated;
    L.onBossHit = (b, where) => {
      if (this.members.includes(b)) { this.hits++; this.hitLog.push({ who: b.spec?.id ?? b.kind, where, hp: this.hp }); prevHit?.(this, where); }
      else prevHit?.(b, where);
    };
    L.onBossDefeated = (b) => {
      if (!this.members.includes(b)) { prevDef?.(b); return; }
      this.down.add(b);
      if (this.down.size >= this.members.length) { this.setState('defeated'); prevDef?.(this); }
      else if (this.spec.banner !== '') bannerOf(L, this.spec.banner ?? 'Einer geschafft – noch einer!', { color: '#a8ffb0' });
    };
  }

  setState(s) { this.state = s; this.stateT = 0; }

  get hp() { let n = 0; for (const m of this.resolve()) n += Math.max(0, m.hp ?? 0); return n; }
  get maxHp() { let n = 0; for (const m of this.resolve()) n += m.maxHp ?? 0; return n; }
  get phase() { return 1; }   // Mitglieder melden ihre Phasen selbst; keine Standard-Ansagen des Archetyps
  get vulnerable() { return this.resolve().some((m) => m.vulnerable); }

  begin() {
    if (this.state !== 'wait') return;
    this.hook();
    for (const m of this.resolve()) m.begin?.();
    this.setState('intro');
  }

  reset() {
    for (const m of this.resolve()) m.reset?.();
    this.down.clear();
    this.setState('wait');
    this.visible = true;
  }

  update(dt) {
    this.stateT += dt;
    this.resolve();
    if (!this.hooked && this.level.archetype && this.level.time > 0) this.hook();
    if (this.state === 'intro' && this.stateT >= 2.0) this.setState('fight');
    if ((this.state === 'fight' || this.state === 'intro') && this.members.length && this.members.every((m) => (m.hp ?? 1) <= 0)) this.setState('defeated');
    if (this.state === 'defeated' && this.members.every((m) => m.state === 'gone' || m.removed)) this.vanish();
  }

  vanish() {
    this.setState('gone');
    this.visible = false;
    const st = this.spec.star;
    if (st && !this.starDone) {
      this.starDone = true;
      const pos = Array.isArray(st) ? st : st.pos;
      this.level.spawn('star', { pos, index: Array.isArray(st) ? 0 : (st.index ?? 0) });
      this.level.effects?.sparks({ x: pos[0], y: pos[1] + 0.6, z: pos[2] }, 24);
      this.level.sfx('powerup_appear');
    }
  }

  info() {
    return {
      state: this.state, hp: this.hp, maxHp: this.maxHp, down: this.down.size, members: this.members.map((m) => ({ id: m.spec?.id, state: m.state, hp: m.hp })),
      hits: this.hits, managed: !!archOf(this.level, this),
    };
  }
}

// =====================================================================================================================
// Hub-Schlüssel-Logik
// =====================================================================================================================
class BlitzHub extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'bossblitz_hub');
    this.touch = false;
    this.shadow = 0;
    this.radius = spec.radius ?? 12;
    this.startPos = P3(spec.start ?? [this.pos.x, this.pos.y, this.pos.z + 4]);
    this.keys = 0;
    this.open = false;
    this.auras = [];
    this.auraDone = false;
    this.fights = (spec.fights ?? []).map((f, i) => {
      const id = f.id ?? `${spec.id ?? 'hub'}_${f.boss}`;
      return { ...f, index: i, boxId: id, boxPos: f.box, box: null, won: false, key: null, keyGot: false, done: false, ret: f.ret ?? null, retBox: null, final: !!f.final };
    });
    this.need = spec.keys ?? this.fights.filter((f) => !f.final).length;
    for (const f of this.fights) {
      const boss = level.named.get(f.boss);
      const icon = f.icon ?? ICON_OF[boss?.kind] ?? 'stern';
      f.box = level.spawn('bossblitz_box', { id: f.boxId, pos: f.boxPos, target: f.to, icon, locked: f.final, hub: this, fight: f.index });
    }
    if (level.view && this.need > 0) queueMicrotask(() => { if (!this.removed) keyHud(level).set('bossblitz', this.keys, this.need, false); });
  }

  /** Steht die (Haupt-)Figur im Hub? */
  inHub() {
    const p = this.level.player;
    return !!p && !p.dead && p.mode !== 'script' && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) <= this.radius && Math.abs(p.pos.y - this.pos.y) < 6;
  }

  bossOf(f) { return this.level.named.get(f.boss) ?? null; }

  /** Mittelpunkt der Arena eines Kampfs (Endgegner: arena/home). */
  arenaOf(f) {
    const b = this.bossOf(f);
    if (b?.arena) return { x: b.arena.x ?? b.arena.center?.[0] ?? b.home.x, y: b.arena.y ?? b.home.y, z: b.arena.z ?? b.arena.center?.[2] ?? b.home.z };
    if (b?.home) return { x: b.home.x, y: b.home.y, z: b.home.z };
    const r = P3(f.ret ?? f.to);
    return { x: r.x, y: r.y, z: r.z - 3 };
  }

  onEnter(i) {
    const f = this.fights[i];
    if (!f) return;
    // Neustart nach Tod: am Eingang des Arena-Raums (der Kampf beginnt dort von vorn)
    const to = P3(f.to), a = this.arenaOf(f);
    const yaw = f.yaw ?? Math.atan2(-(a.z - to.z), a.x - to.x);
    this.level.runtime.checkpoint = { pos: [to.x, to.y, to.z], yaw };
  }

  onWarped() {}

  update(dt) {
    if (!this.auraDone) { this.auraDone = true; this.makeAuras(); }
    for (const f of this.fights) {
      const b = this.bossOf(f);
      if (!f.won && b && b.state === 'gone') this.onWin(f);
      if (f.keyGot && !f.done && this.inHub()) {
        f.done = true;
        f.box?.markDone();
        this.level.runtime.checkpoint = { pos: [this.startPos.x, this.startPos.y, this.startPos.z], yaw: Math.PI / 2 };
      }
    }
    if (!this.open && this.need > 0 && this.keys >= this.need && this.inHub()) this.openFinal();
    void dt;
  }

  makeAuras() {
    if (this.spec.aura === false || !this.level.view) return;
    for (const f of this.fights) {
      const b = this.bossOf(f);
      if (!b) continue;
      const list = b.kind === 'boss_gruppe' ? b.resolve() : [b];
      for (const m of list) {
        const snake = m.kind === 'schlangenkoenig';
        const r = snake ? 3.1 : clamp((m.half?.x ?? 0.6) * 1.6 + 0.9, 1.2, 3.2);
        this.auras.push(aura(this.level, m, { radius: r, height: snake ? 5.2 : clamp((m.half?.y ?? 0.8) * 2.4 + 0.6, 1.6, 4.4), count: snake ? 30 : 22, at: snake ? () => m.home : null }));
      }
    }
  }

  onWin(f) {
    f.won = true;
    const L = this.level;
    if (f.final) {
      const back = P3(f.back ?? [this.startPos.x, this.startPos.y, this.startPos.z]);
      this.spawnReturn(f, [back.x, back.y, back.z]);
      L.signal('bossblitzSieg', { boss: f.boss, pos: f.ret ?? f.to });
      runAction(L, this.spec.onWin, { pos: f.ret ?? f.to, source: this });
      if (this.spec.banners !== false) bannerOf(L, 'Alle Bosse besiegt!', { color: '#7dffa0', hold: 2.4 });
      return;
    }
    const a = this.arenaOf(f);
    const kp = f.key ? P3(f.key) : { x: a.x, y: a.y, z: a.z };
    f.key = L.spawn('bossblitz_schluessel', { pos: [kp.x, kp.y, kp.z], hub: this, fight: f.index });
  }

  keyCollected(i) {
    const f = this.fights[i];
    if (!f || f.keyGot) return;
    f.keyGot = true;
    this.keys++;
    const L = this.level;
    if (L.view) keyHud(L).set('bossblitz', this.keys, this.need, this.keys >= this.need);
    L.signal('bossSchluessel', { boss: f.boss, n: this.keys, of: this.need, pos: f.key ? [f.key.pos.x, f.key.pos.y, f.key.pos.z] : null });
    runAction(L, this.spec.onKey, { pos: f.ret ?? f.to, source: this });
    if (this.spec.banners !== false) bannerOf(L, this.keys >= this.need ? 'Alle Schlüssel! Zurück in den Hub!' : `Schlüssel ${this.keys}/${this.need}!`, { color: '#ffd84a', hold: 2 });
    this.spawnReturn(f, f.boxId);
  }

  /** Rück-Warp-Box im Arena-Raum (erscheint mit Glitzern). */
  spawnReturn(f, target) {
    if (f.retBox || !f.ret) return;
    const r = P3(f.ret);
    f.retBox = this.level.spawn('warpbox', { id: `${f.boxId}_zurueck`, pos: [r.x, r.y, r.z], target, hidden: true });
    f.retBox?.reveal?.();
  }

  openFinal() {
    this.open = true;
    for (const f of this.fights) if (f.final) f.box?.unlock();
    this.level.signal('bossblitzOffen', { n: this.keys });
    runAction(this.level, this.spec.onOpen, { pos: [this.pos.x, this.pos.y, this.pos.z], source: this });
    if (this.spec.banners !== false) bannerOf(this.level, 'Die letzte Box ist offen!', { color: '#ffd84a', hold: 2.2 });
  }

  dispose() {
    for (const a of this.auras) a.dispose();
    this.auras.length = 0;
    super.dispose();
  }

  info() {
    return {
      keys: this.keys, need: this.need, open: this.open, inHub: this.inHub(),
      won: this.fights.filter((f) => f.won).map((f) => f.boss), done: this.fights.filter((f) => f.done).map((f) => f.boss),
      fights: this.fights.map((f) => ({ boss: f.boss, won: f.won, key: !!f.key, keyGot: f.keyGot, done: f.done, final: f.final, box: f.box?.info?.() ?? null, ret: !!f.retBox })),
      auras: this.auras.length,
    };
  }
}

export const KINDS = {
  bossblitz_hub: (level, spec) => new BlitzHub(level, spec),
  bossblitz_box: (level, spec) => new BlitzBox(level, spec),
  bossblitz_schluessel: (level, spec) => new BlitzKey(level, spec),
  boss_gruppe: (level, spec) => new BossGruppe(level, spec),
};

void figures; void activeFigure;
