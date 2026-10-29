// Kulissen der Eingänge der Bonuswelt Krone (Kurs-Karte „Kronen-Gipfel“, Welt 12, eigene Gestaltung), aufgerufen aus
// EntranceView.decorate() über bonuskit.decorateBonus; in Klammern die Registry-Modelle (mit Dreiecks-Obergrenze, sonst eigene
// Geometrie an gleicher Stelle):
//   lavadiorama    K-Kapitän  Lavaturm-Diorama auf einem Marmorsockel: Felsturm im Lavabecken, die Lava steigt und sinkt (je zwei
//                             Takte), rote Plattform, zwei Propellerplattformen ('propellerplattform') drehen, Donut-Brücke
//                             ('donut_block'), Wolke mit Loch, Krümel ('kruemel') jubelt oben; Scheibe „K-K“
//   marathonhouse  K-Haus     Marathon-Haus der 30 Räume: großes Prüfungs-Haus mit Goldkuppel und goldenem Fragezeichen, 30 Fenster
//                             leuchten je Zählzeit der Reihe nach auf, Stoppuhr-Schild „30“
//   championarch   K-1        Startbogen der Champion-Strecke ('start_bogen') am Nordrand des Siegerplatzes, dahinter führt eine
//                             goldene Bahn in den Himmel; solange die Sammlung unvollständig ist, hängt eine Goldkette mit Schloss
//                             im Bogen; Fortschritts-Tafel (Sterne und Stempel aller anderen Welten, aus unlock.collection).
//                             Auf dem Siegerplatz: Siegerpodest mit Krone ('krone_podest'), großer Pokal ('pokal_gross'),
//                             Zuschauer-Tribüne mit allen Freunden (Krümel 'kruemel', Flocke, Hoppel, Fernglas-Kobold, Pflaume –
//                             w8Geos.friendGeo), die im Takt hüpfen und winken
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (Registry-Modelle in die Kachel 'w12:<Id>' mit
// Fern-Ausblendung), bewegte sind eigene Objekte (ev.updaters) mit Sichtprüfung.

import * as THREE from 'three';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { courseSave } from '../level/CourseSave.js';
import { friendGeo, recolor } from '../models/lib/w8Geos.js';
import * as unlock from './unlock.js';
import {
  registerKit, BONUS_KITS, Build, place, mix, TAU, cached, vcol, PI, FRONT, hash1, cullByView, instanced, setInst, addGeo, mover,
  addInfo, solidBox, solidCyl, haloSprite, inView,
} from './bonuskit.js';
import { BEAT12, MK12, GLOW_TILE12 } from './krone12.js';

const MK = MK12;
const beatAt = (t) => BEAT12.at(t);
const glow = (ev, key, make, x, y, z, yaw = 0) => addGeo(ev, key, make, x, y, z, yaw, false, 'glow', GLOW_TILE12);
const pulse = (ev, key, make, x, y, z, yaw = 0) => addGeo(ev, key, make, x, y, z, yaw, false, 'bglow', GLOW_TILE12);
const modelsInfo = (ev) => addInfo(ev, () => MK.info());
const _c = new THREE.Color();

export function decorateKrone(ev, kind, x, y, z) {
  switch (kind) {
    case 'lavadiorama': lavaDiorama(ev, x, y, z); return true;
    case 'marathonhouse': marathonHouse(ev, x, y, z); return true;
    case 'championarch': championArch(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ K-Kapitän Lavaturm-Diorama

function lavaDiorama(ev, x, y, z) {
  // Marmorsockel mit Goldkante, darauf das Lavabecken
  addGeo(ev, 'w12m:dioramabase', () => {
    const b = new Build();
    b.box(8, 0.8, 8, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xf4ece0 : 0xe0d4c4) }, { p: [0, 0.4, 0] }, 0.08);
    b.box(8.2, 0.12, 8.2, 0xffc830, { p: [0, 0.82, 0] }, 0.02);
    b.box(7, 0.5, 7, 0x3a2a2a, { p: [0, 1.05, 0] }, 0.05);
    // Beckenrand: dunkle Basaltwände mit Goldkante (die Lava bleibt im Becken)
    for (const [w, d, px, pz] of [[7.4, 0.35, 0, 3.52], [7.4, 0.35, 0, -3.52], [0.35, 6.7, 3.52, 0], [0.35, 6.7, -3.52, 0]]) {
      b.box(w, 1.5, d, { v: (px2, py, pz2, nx, ny) => (ny > 0.5 ? 0x5a4446 : mix(0x2a2024, 0x4a3a3e, py + 0.75)) }, { p: [px, 2.05, pz] }, 0.04);
      b.box(w + 0.1, 0.12, d + 0.1, 0xffc830, { p: [px, 2.84, pz] }, 0.02);
    }
    // Felsturm (gestapelte Basaltblöcke) mit Nische
    for (let i = 0; i < 6; i++) b.box(2.2 - i * 0.12, 1, 2.2 - i * 0.12, { v: (px, py, pz, nx, ny) => mix(0x4a3a3a, 0x8a6a5a, ny * 0.4 + 0.4 + (i % 2) * 0.1) }, { p: [0.6, 1.8 + i, -0.6], r: [0, i * 0.3, 0] }, 0.1);
    // rote Plattform und Donut-Steg-Halter
    b.box(1.8, 0.3, 1.8, 0xe8302a, { p: [-2.2, 2.6, 1.6] }, 0.06);
    b.cyl(0.12, 0.12, 1.4, 0x6a5a5a, { p: [-2.2, 1.9, 1.6] }, 6);
    // Wolke mit Loch ganz oben
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.55, { v: (px, py, pz, nx, ny) => mix(0xd8e0f4, 0xffffff, ny * 0.5 + 0.5) }, { p: [0.6 + Math.cos(a) * 1.2, 8.3, -0.6 + Math.sin(a) * 1.2], s: [1, 0.7, 1] }, 7, 5); }
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 4, y, z - 4, x + 4, y + 2.9, z + 4, 'sockel');
  solidBox(ev, x - 0.6, y, z - 1.8, x + 1.8, y + 8, z + 0.6, 'turm');
  // Lava im Becken: steigt und sinkt (je zwei Takte), glüht im Takt
  const tex = lavaTexture12().clone();
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  ev.own.push(tex);
  const lavaM = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, fog: true });
  ev.own.push(lavaM);
  const lava = new THREE.Mesh(cached('w12m:lavaplane', () => new THREE.PlaneGeometry(6.7, 6.7).rotateX(-PI / 2)), lavaM);
  lava.position.set(x, y + 1.35, z);
  lava.name = 'w12:diorama-lava';
  ev.view.add(lava);
  const halo = haloSprite(ev, 0xff7a2a, 9, 0.35);
  halo.position.set(x, y + 2.2, z);
  halo.name = 'w12:lavaschein';
  ev.view.add(halo);
  let level = 0;
  ev.updaters.push((dt, t) => {
    const bt = beatAt(t);
    const u = ((bt.beat % 8) + 8) % 8 / 8;
    level = 0.5 - 0.5 * Math.cos(u * TAU);
    lava.position.y = y + 1.36 + level * 1.2;
    tex.offset.set(t * 0.03, t * 0.05);
    lavaM.color.setScalar(0.85 + 0.25 * bt.k);
  });
  cullByView(ev, lava, x, y + 2, z, 5, 70);
  // Propellerplattformen drehen, Donut-Brücke
  const props = [];
  for (const [px, py, pz] of [[x + 2.6, y + 4.2, z + 2.2], [x - 2.4, y + 5.6, z - 2.2]]) {
    const m = MK.live(ev, 'propellerplattform', { size: 1.4, thick: 0.3 }, [px, py, pz], 0, 1, { spin: 14 }, true, 3000, 60);
    if (m) props.push({ m, py });
  }
  ev.updaters.push((dt, t) => props.forEach((p, i) => { p.m.root.position.y = p.py + Math.sin(t * 1.2 + i * 2) * 0.35; }));
  let donuts = 0;
  for (let i = 0; i < 3; i++) if (MK.bake(ev, 'donut_block', {}, [x - 1.4 + i * 1.05, y + 3.6, z + 2.4], FRONT, 0.9, null, true, 5000)) donuts++;
  // Krümel jubelt oben auf der Wolke
  const kru = MK.live(ev, 'kruemel', {}, [x + 0.6, y + 8.65, z - 0.6], FRONT + 0.4, 1.3, (dt, t) => ({ anim: beatAt(t).frac < 0.5 ? 'cheer' : 'idle' }), true, 6000, 65);
  addInfo(ev, () => ({ lavadiorama: { lava: +level.toFixed(3), propellers: props.length, donuts, kruemel: !!kru } }));
  modelsInfo(ev);
}

/** Fließende Lava (Glutadern auf Orange), wiederholbar. */
function lavaTexture12() {
  return canvasTexture('w12:lava', 128, 128, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const u = (i / w) * TAU, v = (j / h) * TAU;
        const f = Math.sin(u * 2 + Math.sin(v * 3) * 1.2) * 0.5 + Math.sin(v * 2 - Math.sin(u) * 1.6) * 0.5;
        const vein = Math.max(0, 1 - Math.abs(f) * 4);
        const o = (j * w + i) * 4;
        img.data[o] = 235 + 20 * vein; img.data[o + 1] = 80 + 150 * vein; img.data[o + 2] = 20 + 90 * vein * vein; img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: true });
}

// ------------------------------------------------------------------ K-Haus Marathon-Haus der 30 Räume

const MARATHON_WINS = (() => { const out = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) { const x = -4.5 + c; if (r === 0 && Math.abs(x) < 1.2) continue; out.push([x, 1.3 + r * 1.35]); } return out; })();

function marathonHouse(ev, x, y, z) {
  addGeo(ev, 'w12m:marathonhouse', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx) => mix(0x6a3aa8, 0x9a6ad8, (py + 2.6) / 5.2 * 0.6 + Math.abs(nx) * -0.1 + 0.3) };
    b.box(11.4, 5.2, 4.6, wall, { p: [0, 2.6, 0] }, 0.12);
    b.box(11.8, 0.3, 5, 0xffc830, { p: [0, 5.3, 0] }, 0.04);
    b.dome(3, { v: (px, py, pz, nx, ny) => mix(0xd8a02a, 0xffe07a, ny * 0.5 + 0.5) }, { p: [0, 5.4, 0] }, PI / 2, 18, 6);
    for (const s of [-1, 1]) { b.cyl(0.9, 1, 6.2, wall, { p: [s * 5.9, 3.1, 0] }, 10); b.cone(1.2, 2, 0xffc830, { p: [s * 5.9, 7.2, 0] }, 10); }
    const door = new THREE.Shape(); door.moveTo(-0.8, 0); door.lineTo(-0.8, 1.7); door.absarc(0, 1.7, 0.8, PI, 0, true); door.lineTo(0.8, 0); door.lineTo(-0.8, 0);
    b.extrude(door, 0.12, 0x2a1630, { p: [0, 0, 2.32] }, 0.03, 10);
    b.box(2.6, 0.24, 0.9, 0xf4ece0, { p: [0, 0.12, 2.75] }, 0.04);
    for (const [wx, wy] of MARATHON_WINS) b.box(0.74, 0.86, 0.06, 0x2a1a4a, { p: [wx, wy, 2.3] }, 0.02);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 6.9, y, z - 2.5, x + 6.9, y + 6.5, z + 2.5, 'haus');
  // 30 Fenster (Räume) leuchten je Zählzeit der Reihe nach auf
  const wins = MARATHON_WINS.map(([wx, wy]) => [x + wx, y + wy, z + 2.36]);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, toneMapped: false });
  ev.own.push(winMat);
  const wm = new THREE.InstancedMesh(cached('w12m:winquad', () => new THREE.PlaneGeometry(0.62, 0.74)), winMat, wins.length);
  wm.frustumCulled = false;
  wm.name = 'w12:marathon-fenster';
  wins.forEach(([wx, wy, wz], i) => setInst(wm, i, wx, wy, wz, 0, 1));
  wm.instanceMatrix.needsUpdate = true;
  ev.view.add(wm); ev.own.push(wm);
  const cA = new THREE.Color(0x4a2a6a), cB = new THREE.Color(0xffe07a);
  let room = 0;
  ev.updaters.push((dt, t) => {
    if (!(wm.visible = inView(ev.view, x, y + 3, z, 8, 65))) return;
    const bt = beatAt(t);
    room = ((bt.whole % 30) + 30) % 30;
    // Fenster gegen den Uhrzeigersinn von unten links: unten (8), Mitte (10), oben (10)
    for (let i = 0; i < wins.length; i++) wm.setColorAt(i, _c.copy(cA).lerp(cB, i === room ? bt.k : i < room ? 0.5 : 0));
    if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
  });
  // goldenes Fragezeichen über der Kuppel
  const q = mover(ev, cached('w12m:qmark', () => {
    const b = new Build();
    b.torus(0.6, 0.2, 0xffd23a, { p: [0, 1.0, 0], r: [0, 0, -0.5] }, 8, 20, PI * 1.4);
    b.cyl(0.2, 0.2, 0.5, 0xffd23a, { p: [0.02, 0.35, 0] }, 10);
    b.sphere(0.22, 0xffd23a, { p: [0.02, -0.28, 0] }, 10, 8);
    return b.geometry();
  }), x, y + 9.6, z, 'w12:fragezeichen', true, vcol(0.3, { emissive: 0x6a4a00 }, 'w12qmark'));
  ev.updaters.push((dt, t) => { q.rotation.y = t * 0.9; q.position.y = y + 9.6 + Math.sin(t * 2) * 0.2; });
  cullByView(ev, q, x, y + 9.6, z, 1.6, 75);
  // Stoppuhr-Schild „30“
  const tex = canvasTexture('w12:sign30', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, TAU); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#d8a02a'; ctx.stroke();
    ctx.fillStyle = '#6a3aa8'; ctx.font = '900 64px Nunito, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('30', w / 2, h / 2 + 4);
  });
  const signM = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true });
  ev.own.push(signM);
  const sign = new THREE.Mesh(cached('w12m:signdisc', () => new THREE.CircleGeometry(0.9, 24)), signM);
  sign.position.set(x + 4.2, y + 2.6, z + 2.38);
  sign.name = 'w12:schild30';
  ev.view.add(sign);
  addInfo(ev, () => ({ marathonhouse: { windows: wins.length, room } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ K-1 Startbogen der Champion-Strecke, Siegerplatz

/** Fortschritts-Tafel der Sammlung (Canvas): Sterne und Stempel aller anderen Welten. */
function boardTexture(c, key) {
  return canvasTexture(key, 512, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a2a7a'); g.addColorStop(1, '#1e1648');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 14; ctx.strokeStyle = '#ffc830'; ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = '#ffe07a'; ctx.font = '900 46px Nunito, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Champion-Strecke', w / 2, 52);
    const bar = (yy, label, v, max, col) => {
      ctx.fillStyle = '#ffffff'; ctx.font = '800 32px Nunito, Arial, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, 36, yy - 22);
      ctx.textAlign = 'right'; ctx.fillText(`${v} / ${max}`, w - 36, yy - 22);
      ctx.fillStyle = '#0e0a28'; ctx.fillRect(36, yy, w - 72, 26);
      ctx.fillStyle = col; ctx.fillRect(36, yy, Math.round((w - 72) * (max ? Math.min(1, v / max) : 0)), 26);
    };
    bar(140, '★ Sterne', c.stars, c.starsMax, '#ffd23a');
    bar(222, 'Stempel', c.stamps, c.stampsMax, '#5ad8ff');
    ctx.fillStyle = c.complete ? '#7aff8a' : '#ffb8c8'; ctx.font = '800 28px Nunito, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(c.complete ? 'Alles gesammelt – der Weg ist frei!' : 'Alle Sterne und Stempel aller Welten sammeln!', w / 2, 284);
  });
}

function championArch(ev, x, y, z) {
  const c = unlock.collection(unlock.mapSource(), courseSave, 12);
  const open = c.complete;
  // Startbogen (Durchfahrt nach Norden) und goldene Bahn in den Himmel
  const archOk = MK.bake(ev, 'start_bogen', { width: 7 }, [x, y, z], PI / 2, 1.1, { anim: open ? 'go' : 'idle' }, true, 5000);
  if (!archOk) addGeo(ev, 'w12m:arch', () => { const b = new Build(); for (const s of [-1, 1]) b.box(0.8, 6, 0.8, 0xf4ece0, { p: [s * 4, 3, 0] }, 0.06); b.box(9, 1, 0.8, 0xd8283a, { p: [0, 6.2, 0] }, 0.06); return b.geometry(); }, x, y, z);
  for (const s of [-1, 1]) solidCyl(ev, x + s * 4.1, z, 0.6, y, y + 6.4, 'bogen');
  addGeo(ev, 'w12m:championroad', () => {
    const b = new Build();
    const n = 18;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const zz = -1.5 - (u0 + u1) * 0.5 * 60, yy = Math.pow((u0 + u1) * 0.5, 1.6) * 26;
      b.box(5, 0.3, 60 / n + 0.05, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? (Math.abs(px) > 2.2 ? (Math.floor(pz * 1.3) & 1 ? 0xffffff : 0xd8283a) : 0xffd860) : 0xd8a02a) }, { p: [0, yy, zz], r: [Math.atan2(26 * 1.6 * Math.pow((u0 + u1) * 0.5, 0.6) / 60, 1), 0, 0] }, 0);
    }
    return b.geometry();
  }, x, y + 0.05, z, 0, false);
  // Goldkette mit Schloss im Bogen (solange die Sammlung unvollständig ist), sonst goldener Schein
  if (!open) {
    addGeo(ev, 'w12m:archchain', () => {
      const b = new Build();
      for (let i = 0; i < 14; i++) { const u = i / 13; b.torus(0.18, 0.05, 0xffc830, { p: [-3.6 + u * 7.2, 1.6 - Math.sin(u * PI) * 0.6, 0], r: [0, i % 2 ? PI / 2 : 0, 0] }, 4, 8); }
      b.box(0.7, 0.6, 0.3, 0xd8a02a, { p: [0, 0.75, 0.05] }, 0.08);
      b.torus(0.22, 0.07, 0xb88a2a, { p: [0, 1.15, 0.05] }, 4, 10, PI);
      return b.geometry();
    }, x, y, z);
  } else {
    const shine = haloSprite(ev, 0xffe07a, 9, 0.5);
    shine.position.set(x, y + 3, z - 0.5);
    shine.name = 'w12:bogenschein';
    ev.view.add(shine);
  }
  // Fortschritts-Tafel neben dem Bogen
  const tex = boardTexture(c, `w12:board:${c.stars}:${c.starsMax}:${c.stamps}:${c.stampsMax}`);
  const boardM = new THREE.MeshBasicMaterial({ map: tex, fog: true });
  ev.own.push(boardM);
  const [bx, bz] = ev.def.board ?? [x - 6.5, z + 1.6];
  addGeo(ev, 'w12m:boardpost', () => { const b = new Build(); for (const s of [-1, 1]) b.cyl(0.1, 0.12, 2.4, 0xffc830, { p: [s * 1.4, 1.2, -0.05] }, 6); b.box(3.4, 2.2, 0.12, 0xd8a02a, { p: [0, 2.5, -0.1] }, 0.04); return b.geometry(); }, bx, y, bz, 0.25);
  const board = new THREE.Mesh(cached('w12m:boardplane', () => new THREE.PlaneGeometry(3.2, 2.0)), boardM);
  board.position.set(bx, y + 2.5, bz);
  board.rotation.y = 0.25;
  board.name = 'w12:sammeltafel';
  ev.view.add(board);
  solidBox(ev, bx - 1.6, y, bz - 0.3, bx + 1.6, y + 3.6, bz + 0.2, 'tafel');
  // Siegerpodest mit Krone und großer Pokal
  const [px, pz] = ev.def.podest ?? [x + 6, z + 6];
  const podOk = MK.bake(ev, 'krone_podest', { size: 1 }, [px, y, pz], -PI / 2, 1, { sparkle: false }, true, 11000);
  if (!podOk) addGeo(ev, 'w12m:podest', () => { const b = new Build(); b.box(1.8, 1.6, 1.8, 0xffc830, { p: [0, 0.8, 0] }, 0.08); b.box(1.8, 1.1, 1.8, 0xe8b830, { p: [-1.85, 0.55, 0] }, 0.08); b.box(1.8, 0.75, 1.8, 0xd8a02a, { p: [1.85, 0.38, 0] }, 0.08); return b.geometry(); }, px, y, pz);
  solidBox(ev, px - 3.2, y, pz - 1.8, px + 3.2, y + 2, pz + 1.8, 'podest');
  const crown = haloSprite(ev, 0xfff0a0, 3.2, 0.55);
  crown.position.set(px, y + 3.4, pz);
  crown.name = 'w12:kronenfunkeln';
  ev.view.add(crown);
  const [tx, tz] = ev.def.pokal ?? [x + 11, z + 4];
  if (!MK.bake(ev, 'pokal_gross', { size: 3 }, [tx, y, tz], -PI / 2, 1, { sparkle: false }, true, 7000)) addGeo(ev, 'w12m:cup', () => { const b = new Build(); b.lathe([[0.5, 0], [0.6, 0.3], [0.2, 0.5], [0.15, 1.2], [0.9, 1.9], [1.0, 2.8]], 0xffc830, null, 14); return b.geometry(); }, tx, y, tz);
  solidCyl(ev, tx, tz, 0.8, y, y + 3.2, 'pokal');
  // Zuschauer-Tribüne mit allen Freunden (hüpfen und winken im Takt)
  const [gx, gz] = ev.def.tribune ?? [x - 10, z + 8];
  addGeo(ev, 'w12m:tribune', () => {
    const b = new Build();
    for (let r = 0; r < 3; r++) {
      b.box(6.4, 0.5, 1.2, { v: (px2, py, pz2, nx, ny) => (ny > 0.5 ? [0xd8283a, 0x3a6ae8, 0xffc830][r] : 0xf4ece0) }, { p: [0, 0.25 + r * 0.5, -r * 1.1] }, 0.05);
      b.box(6.4, 0.5 + r * 0.5, 0.12, 0xe0d4c4, { p: [0, (0.5 + r * 0.5) / 2, -r * 1.1 + 0.55] }, 0);
    }
    for (const s of [-1, 1]) b.cyl(0.08, 0.08, 3.4, 0xffc830, { p: [s * 3.2, 1.7, -1.2] }, 6);
    b.box(6.8, 0.12, 0.12, 0xffc830, { p: [0, 3.4, -1.2] }, 0);
    return b.geometry();
  }, gx, y, gz);
  solidBox(ev, gx - 3.3, y, gz - 2.9, gx + 3.3, y + 1.6, gz + 0.65, 'tribuene');
  const friends = [];
  const seat = (i) => [gx - 2.4 + (i % 5) * 1.2, y + 0.5 + Math.floor(i / 5) * 0.5 + (i % 2) * 0.5, gz - (i % 2) * 1.1];
  // Krümel (Registry) jubelt vorn
  const kpos = seat(0);
  const kru = MK.live(ev, 'kruemel', {}, kpos, 0, 1.6, (dt, t) => ({ anim: beatAt(t).frac < 0.55 ? 'cheer' : 'hop' }), true, 6000, 60);
  if (kru) friends.push({ m: kru.root, base: kpos, ph: 0, reg: true });
  const keys = ['flocke', 'hoppel', 'kobold', 'pflaume'];
  keys.forEach((key, i) => {
    let g = null;
    try {
      g = key === 'pflaume'
        ? cached('w12m:pflaume', () => recolor(friendGeo('kruemel').lit, (cc, hsl) => { const hue = hsl.h * 360; if (hue > 15 && hue < 56 && hsl.s > 0.2) return mix(0x2a2232, 0x5a4a6a, Math.max(0, (hsl.l - 0.3) / 0.6)); return null; }))
        : friendGeo(key).lit;
      MK.used.add('bunny_small');
    } catch { g = null; }
    if (!g) g = cached('w12m:friendlo', () => new Build().sphere(0.3, 0xd8a060, { p: [0, 0.3, 0] }, 8, 6).geometry());
    const p = seat(i + 1);
    const m = new THREE.Mesh(g, vcol(0.5, {}, 'w12friend'));
    m.position.set(p[0], p[1], p[2]);
    m.scale.setScalar(key === 'kobold' ? 1.4 : key === 'pflaume' ? 2.3 : 1.9);
    m.rotation.y = -PI / 2;
    m.castShadow = true;
    m.name = `w12:freund:${key}`;
    ev.view.add(m);
    friends.push({ m, base: p, ph: (i + 1) * 0.7, reg: false });
  });
  let hop = 0;
  ev.updaters.push((dt, t) => {
    const vis = inView(ev.view, gx, y + 1.5, gz - 1, 5, 65);
    const bt = beatAt(t);
    friends.forEach((f, i) => {
      if (!f.reg) f.m.visible = vis;
      if (!vis) return;
      const mine = (i + bt.whole) % 2 === 0;
      const u = mine ? Math.sin(Math.min(1, bt.frac / 0.5) * PI) : 0;
      if (i === 0) hop = u;
      f.m.position.y = f.base[1] + u * 0.5;
      if (!f.reg) { f.m.rotation.y = -PI / 2 + Math.sin(t * 2.5 + f.ph) * 0.4; f.m.rotation.z = Math.sin(t * 7 + f.ph) * 0.1; }
    });
  });
  addInfo(ev, () => ({ champion: { open, stars: c.stars, starsMax: c.starsMax, stamps: c.stamps, stampsMax: c.stampsMax, arch: archOk, podest: podOk, friends: friends.length, hop: +hop.toFixed(3) } }));
  modelsInfo(ev);
}

// Anmeldung: die Kulissen hängen am Kit 'krone' (krone12.js meldet es an)
if (BONUS_KITS.krone) BONUS_KITS.krone.decorate = decorateKrone;
else registerKit('krone', { name: 'krone', decorate: decorateKrone });
void place; void hash1; void instanced; void pulse; void glow;
