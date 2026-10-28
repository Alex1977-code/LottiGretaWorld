// Trage-Helme der Spielfigur (Präzisierung Motor Welt 2; Bauplan „Kanonenbox / Propellerbox / Lichtbox“).
//
// Ein Helm sitzt unabhängig vom Power-up auf dem Kopf (`player.helmet` = 'kanone' | 'propeller' | 'licht' | null).
// Aufheben: Entität `helm_kanone` / `helm_propeller` / `helm_licht` berühren (entities/kinds/helme.js). Ab: Treffer
// (der Helm fängt den Treffer ab – Figur bleibt heil, 1,5 s unverwundbar, der Helm fliegt davon und kann wieder
// aufgehoben werden) oder Ducken + Aktion (vor sich absetzen). Tod/Absturz: weg.
//
// def (alle Felder optional):  label, icon (HUD-Farbe), model (Modellname für getModel),
//   onWear(player)                  beim Aufsetzen (player.helmetFx = eigener Zustand)
//   onRemove(player)                beim Abnehmen/Verlieren
//   update(player, dt, input)       je Simulationsschritt (vor der Bewegung)
//   onAction(player, input) → true  Aktion (Y / X / Shift) – vor Aufheben/Power-up-Aktion; true = verbraucht
//   state(player) → Modell-Zustand  für model.update(dt, state) (HeroRig)
//
// Helme:
//   kanone     feuert alle 0,6 s (und sofort mit Aktion, ≥ 0,2 s Abstand) eine Kanonenkugel (Entität
//              `kanonenkugel`, entities/kinds/helme.js) in Blickrichtung; höchstens 3 je Figur unterwegs.
//              Modell-Zustand { anim: 'idle'|'fire', progress: 0..1, fire: 0..1 } (Rückstoß, 1 = gerade gefeuert).
//   propeller  Aktion → steiler Aufstieg ≈ 8 m (einmal je Bodenkontakt), danach – solange Aktion/Rennen (Shift,
//              Y-Knopf) oder Sprung gehalten – langsames Sinken (≤ 2,6 m/s), volle Luftsteuerung.
//              Modell-Zustand { anim: 'idle'|'spin'|'fly', spin: rad/s } (fly = Aufstieg, spin = gehaltenes Sinken).
//   licht      Lichtkegel nach vorn (7 m, ±30°, leicht abwärts; feste Wände schatten ab): jede Entität mit
//              `onLight(dt, player)` im Kegel bekommt den Aufruf je Schritt (Geister lösen sich auf – Welt 3;
//              Teststub `testgeist`). Modell-Zustand { on: true }. HeroRig zeichnet den Kegel.
//
// Welt 6 (additiv): weitere Helme trägt ihr Modul in HELMETS ein (HELMETS.maske = Pilz-Maske, entities/kinds/w6_gimmicks.js);
// def.model (Registry-Name) und def.fallbackModel(opts) liefern deren Optik.
//
// Modelle: getModel('helm_kanone' | 'helm_propeller' | 'helm_licht') aus der Registry, sonst die Rückfall-Optik
// hier (helmetModel). Maßstab Meter, Ursprung = Mitte der Unterseite, Blick nach +X; Helm ≈ 0,5 m breit, sitzt
// auf dem Kopf (HeroRig hängt ihn an den Kopf des Avatars).

import * as THREE from 'three';
import { hasModel, getModel } from '../models/index.js';
import { MOVE, vFor } from './moveset.js';

export const CANNON = { interval: 0.6, cool: 0.2, maxBalls: 3, speed: 11 };
export const PROPELLER = { rise: 8, sink: 2.2 };
export const LIGHT = { range: 7, tan: Math.tan((30 * Math.PI) / 180), pitch: (12 * Math.PI) / 180 };

const LIGHT_BLOCK = (s) => s.solid && !s.oneWay && !s.fromBelowOnly && !s.quicksand && !s.trigger;

/** Kopfhöhe (Mitte des Helms) über dem Fußpunkt. */
export function helmetY(p) { return p.pos.y + p.half.y * 2 * (p.crouching ? 1 : 0.92); }

/** Kanonenkugel abfeuern (true = gefeuert). */
export function fireCannon(p) {
  const L = p.level;
  if (!L.hasKind?.('kanonenkugel') || p.dead || p.hidden) return false;
  if (p.mode !== 'ground' && p.mode !== 'air' && p.mode !== 'swim') return false;
  if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt') return false;
  let n = 0;
  for (const e of L.entities) if (e.kind === 'kanonenkugel' && !e.removed && e.owner === p) n++;
  if (n >= CANNON.maxBalls) return false;
  const f = p.facingVec();
  const y = helmetY(p) - 0.2;
  L.spawn('kanonenkugel', { pos: [p.pos.x + f.x * 0.42, y, p.pos.z + f.z * 0.42], dir: [f.x, f.z], owner: p, speed: CANNON.speed });
  const s = p.helmetFx;
  if (s) { s.cool = CANNON.cool; s.recoil = 1; }
  L.effects?.dust({ x: p.pos.x + f.x * 0.7, y: y - 0.05, z: p.pos.z + f.z * 0.7 }, 3, 0.6);
  L.sfx('cannon');
  return true;
}

/** Lichtkegel: onLight(dt, player) für Entitäten im Kegel (ohne verdeckende Wand). Liefert die Zahl. */
export function shineLight(p, dt) {
  const L = p.level;
  if (p.dead || p.hidden) return 0;
  const f = p.facingVec();
  const hx = p.pos.x, hy = helmetY(p), hz = p.pos.z;
  let n = 0;
  for (const e of L.entities) {
    if (typeof e.onLight !== 'function' || !e.alive || e.removed || e.hidden) continue;
    const c = e.center();
    const dx = c.x - hx, dy = c.y - hy, dz = c.z - hz;
    const along = dx * f.x + dz * f.z;
    if (along <= 0.05 || along > LIGHT.range + e.half.x) continue;
    const lat = Math.hypot(dx - f.x * along, dz - f.z * along);
    if (lat > along * LIGHT.tan + e.half.x + 0.3) continue;
    // senkrecht: Kegelachse leicht abwärts geneigt
    const axisY = -along * Math.tan(LIGHT.pitch);
    if (Math.abs(dy - axisY) > along * LIGHT.tan + e.half.y + 0.4) continue;
    if (L.world.raycast({ x: hx, y: hy, z: hz }, c, LIGHT_BLOCK)) continue;
    e.onLight(dt, p);
    n++;
  }
  p.helmetFx && (p.helmetFx.lit = n);
  return n;
}

export const HELMETS = {
  kanone: {
    label: 'Kanonen-Helm',
    icon: 0xe0383a,
    model: 'helm_kanone',
    onWear(p) { p.helmetFx = { t: 0.3, cool: 0, recoil: 0 }; },
    update(p, dt) {
      const s = p.helmetFx;
      s.cool = Math.max(0, s.cool - dt);
      s.recoil = Math.max(0, s.recoil - dt * 5);
      s.t -= dt;
      if (s.t <= 0) { s.t = CANNON.interval; fireCannon(p); }
    },
    onAction(p) {
      const s = p.helmetFx;
      if (s.cool <= 0 && fireCannon(p)) s.t = CANNON.interval;
      return true;
    },
    // Modell helm_kanone: { anim: 'idle'|'fire', progress } (Rückfall liest fire)
    state(p) { const r = p.helmetFx?.recoil ?? 0; return { anim: r > 0 ? 'fire' : 'idle', progress: 1 - r, fire: r }; },
  },
  propeller: {
    label: 'Propeller-Helm',
    icon: 0x3a8bff,
    model: 'helm_propeller',
    onWear(p) { p.helmetFx = { used: false, flying: false, spin: 3 }; },
    update(p, dt, input) {
      const s = p.helmetFx;
      if (p.mode !== 'air') { s.used = false; s.flying = false; s.spin += (3 - s.spin) * Math.min(1, dt * 4); return; }
      if (!s.flying) { s.spin += (6 - s.spin) * Math.min(1, dt * 4); return; }
      if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt') { s.flying = false; return; }
      if (p.vel.y > 0) { s.spin = 42; return; }
      const hold = !!(input.run || input.jump);
      if (hold) {
        p.vel.y = Math.max(p.vel.y, -PROPELLER.sink);
        p.airMax = Math.max(p.airMax, MOVE.walk * p.speedMult);
        s.spin = 30;
      } else s.spin += (12 - s.spin) * Math.min(1, dt * 4);
    },
    onAction(p) {
      const s = p.helmetFx;
      if (s.used) return true;   // schon geflogen – erst nach der Landung wieder
      if (p.dead || p.hidden || !(p.mode === 'ground' || p.mode === 'air' || p.mode === 'wall')) return false;
      if (p.state === 'groundpound' || p.state === 'dive' || p.state === 'hurt') return false;
      s.used = true; s.flying = true; s.spin = 42;
      p.setCrouch(false);
      p.ground = null; p.coyote = 0; p.buffer = 0; p.wallCoyote = 0;
      p.vel.set(p.vel.x * 0.6, vFor(PROPELLER.rise), p.vel.z * 0.6);
      p.enterAir('jump', false);
      p.jumpKind = 'propeller';
      p.airMax = Math.max(p.hSpeed(), MOVE.walk * p.speedMult);
      p.level.effects?.dust(p.pos, 6, 1.2);
      p.level.sfx('propeller');
      return true;
    },
    // Modell helm_propeller: { anim: 'idle'|'spin'|'fly', spin }
    state(p) {
      const s = p.helmetFx;
      return { anim: s?.flying && p.mode === 'air' ? (p.vel.y > 0 ? 'fly' : 'spin') : 'idle', spin: s?.spin ?? 3 };
    },
  },
  licht: {
    label: 'Licht-Helm',
    icon: 0xffd23d,
    model: 'helm_licht',
    onWear(p) { p.helmetFx = { on: true, lit: 0 }; },
    update(p, dt) { shineLight(p, dt); },
    state() { return { on: true }; },
  },
};

const ALIASES = { kanone: 'kanone', cannon: 'kanone', kanonenhelm: 'kanone', propeller: 'propeller', licht: 'licht', light: 'licht', lichthelm: 'licht' };

/** 'helm_kanone' | 'kanone' | … → 'kanone' (null, wenn unbekannt). */
export function normalizeHelmet(name) {
  if (!name) return null;
  const k = String(name).toLowerCase().replace(/^helm_/, '');
  return ALIASES[k] ?? (HELMETS[k] ? k : null);
}
export function getHelmet(name) { const k = normalizeHelmet(name); return k ? HELMETS[k] : null; }
export function listHelmets() { return Object.keys(HELMETS); }

// ------------------------------------------------------------------ Modelle (Registry oder Rückfall)

const geoCache = new Map();
const g = (key, make) => { let v = geoCache.get(key); if (!v) { v = make(); geoCache.set(key, v); } return v; };

function part(root, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = true;
  root.add(m);
  return m;
}

/** Rückfall-Optik der Helme (eigene, runde Kastenformen). */
function fallbackHelmet(kind) {
  const root = new THREE.Group();
  const mats = [];
  const mat = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.45, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000 }); mats.push(m); return m; };
  const shell = g('helm:shell', () => new THREE.BoxGeometry(0.5, 0.34, 0.5, 1, 1, 1));
  const band = g('helm:band', () => new THREE.BoxGeometry(0.52, 0.07, 0.52));
  let update = () => {};
  if (kind === 'kanone') {
    part(root, shell, mat(0x4a4f63, { metal: 0.3, rough: 0.4 }), 0, 0.17, 0);
    part(root, band, mat(0xe8463a), 0, 0.07, 0);
    const barrel = new THREE.Group();
    barrel.position.set(0.18, 0.2, 0);
    root.add(barrel);
    part(barrel, g('helm:barrel', () => new THREE.CylinderGeometry(0.11, 0.12, 0.34, 14)), mat(0x2a2d3a, { metal: 0.5, rough: 0.3 }), 0.17, 0, 0, { rz: -Math.PI / 2 });
    part(barrel, g('helm:muzzle', () => new THREE.TorusGeometry(0.11, 0.035, 8, 16)), mat(0xffc83a, { metal: 0.4 }), 0.34, 0, 0, { rz: 0 }).rotation.y = Math.PI / 2;
    update = (dt, st) => { barrel.position.x = 0.18 - 0.08 * (st?.fire ?? 0); };
  } else if (kind === 'propeller') {
    part(root, shell, mat(0x3a8bff), 0, 0.17, 0);
    part(root, band, mat(0xffd23d), 0, 0.07, 0);
    part(root, g('helm:mast', () => new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8)), mat(0xf6f4ef), 0, 0.42, 0);
    const rotor = new THREE.Group();
    rotor.position.set(0, 0.5, 0);
    root.add(rotor);
    const blade = g('helm:blade', () => new THREE.BoxGeometry(0.62, 0.025, 0.11));
    const bm = mat(0xffd23d);
    part(rotor, blade, bm, 0, 0, 0).rotation.y = 0.25;
    part(rotor, blade, bm, 0, 0, 0).rotation.y = 0.25 + Math.PI / 2;
    part(rotor, g('helm:hub', () => new THREE.SphereGeometry(0.06, 10, 8)), mat(0xe8463a), 0, 0.02, 0);
    update = (dt, st) => { rotor.rotation.y += (st?.spin ?? 3) * Math.min(dt, 0.1); };
  } else {
    part(root, shell, mat(0x5fcf6a), 0, 0.17, 0);
    part(root, band, mat(0xf6f4ef), 0, 0.07, 0);
    part(root, g('helm:lamp', () => new THREE.CylinderGeometry(0.12, 0.09, 0.14, 14)), mat(0xf6f4ef), 0.29, 0.2, 0, { rz: -Math.PI / 2 });
    const lens = part(root, g('helm:lens', () => new THREE.CircleGeometry(0.105, 16)), mat(0xfff6b0, { emissive: 0xffe680 }), 0.365, 0.2, 0);
    lens.rotation.y = Math.PI / 2;
    lens.castShadow = false;
    update = (dt, st) => { lens.material.emissiveIntensity = st?.on === false ? 0.1 : 1.2; };
  }
  return { root, update, dispose() { for (const m of mats) m.dispose(); } };
}

/** Modell eines Helms (Registry 'helm_<name>' oder Rückfall). name: 'kanone' | 'propeller' | 'licht'. */
export function helmetModel(name, opts = {}) {
  const k = normalizeHelmet(name) ?? 'kanone';
  const model = `helm_${k}`;
  if (hasModel(model)) return getModel(model, opts);
  // Welt 6: von außen eingetragene Helme (z. B. Pilz-Maske) bringen eigenes Modell bzw. eigene Rückfall-Optik mit
  const def = HELMETS[k];
  if (def?.model && def.model !== model && hasModel(def.model)) return getModel(def.model, opts);
  if (typeof def?.fallbackModel === 'function') return def.fallbackModel(opts);
  return fallbackHelmet(k);
}
