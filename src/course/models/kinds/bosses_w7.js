// Endgegner Welt 7 „Lava-Festung“ (7-Burg): Baron Brummbär im Kampfwagen und Teile seiner Boss-Straße. Eigene Gestaltung.
// Baron Brummbär wie in bosses_w1.js (brauner Bär, schwarzer Zylinder mit rotem Band, goldenes Monokel mit Kette am rechten
// Auge (+Z), gezwirbelter Schnurrbart, violette Weste mit Goldknöpfen, rote Fliege) – hier grimmiger und mit Kampfwagen:
// die gepanzerte Weiterentwicklung seines roten Sportwagens. Maßstab Meter, Blick/Fahrtrichtung +X; state darf ein String sein.
// progress (0..1) überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
//
// baron_kampfwagen ≈5,4 × 2,7 m, Hutspitze ≈3,8 m  Kampfwagen: roter Panzerwagen mit genieteten Eisenplatten, Ramm-Pflug mit
//   fünf Elfenbein-Stacheln, Kotflügeln, Brummbär-Wappen an den Seiten, Scheinwerfern, Kanonenturm mit schwarzem Rohr und
//   Goldringen auf der Haube, zwei Auspuff-Schloten hinten (Rauch), großen Stollenreifen mit Stachel-Naben. Darin sitzt der
//   Baron am Lenkrad. **Ursprung = Mitte der Bodenfläche des Wagens.**
//   state { anim: 'idle'|'drive'|'throw'|'fire'|'hit'|'stunned'|'defeated', hp (9..0, Standard 9), speed (m/s, Räder; drive
//           Standard 8), steer (-1..1), progress? (throw 0..1 in 1,0 s; fire 0..1 in 0,8 s; hit 0..1 in 0,6 s) }
//         idle: Motor tuckert (Wagen bebt), Schlote paffen, der Baron trommelt aufs Lenkrad; drive: Räder drehen, Wagen federt,
//         Rauch, Lenken mit steer; throw: holt mit einer Kickbombe in der rechten Tatze aus (0–0,45), wirft bei progress 0,5 –
//         ab da die Kickbombe im Motor an model.hand() erzeugen; fire: Kanone lädt (0–0,4: Rohr zittert, Mündung glüht), feuert
//         bei progress 0,45 (Feuerstoß, Rückstoß, Rauch) – Feuerkugel an model.muzzle() erzeugen; hit: Zylinder fliegt hoch,
//         Augen zu, Aufblitzen, der Wagen ruckt (0,6 s); stunned: Schwindelsterne, Qualm aus der Haube, wankt; defeated: Wagen
//         sackt schief ab und qualmt dicht, Räder stehen, der Baron sackt zusammen, Zylinder schief.
//         hp: ≤ 6 Rußflecken, ein Stachel abgebrochen, leichter Rauch; ≤ 3 Haubenplatte abgerissen (offener, glühender Motor),
//         verbogener Schlot, Risse, dunkler Qualm.
//   model.hand(out?) → Weltposition der Kickbombe in der Wurf-Tatze.  model.muzzle(out?) → Weltposition vor der Mündung.
//   root.userData.radius → Kollisionsradius (≈2,4 m um die Wagenmitte), userData.top → Höhe der Hutspitze (≈3,8 m).
// kampfwagen_strasse  Teile der Boss-Straße (Basalt-Fahrbahn über Lava). Fahrtrichtung entlang X.
//   opts  { kind: 'fahrbahn' (Standard) | 'stachelfalle' | 'kante' | 'luecke' }
//     fahrbahn:     Fahrbahn-Platte length (X, 8) × width (Z, 6) × thick (0,5): dunkler Asphalt, gestrichelte goldene
//                   Mittellinie, rot-weiße Randsteine. **Ursprung = Mitte der Oberseite** (Oberseite y = 0).
//     stachelfalle: Stahlplatte size [x, z] ([2, 4]) mit Lochraster und Warnstreifen; Stacheln fahren heraus.
//                   **Ursprung = Mitte der Oberseite** (y = 0).  state { up (0..1: Stacheln draußen, 0,6 m), warn (bool:
//                   Warnlampen blinken, Stacheln zucken in den Löchern) }
//     kante:        Bruchkante einer Lavalücke: Fahrbahn-Ende (reicht nach −X) mit gezackter Abbruchkante bei x = 0, Warnwinkeln
//                   und glühenden Rissen, Lava tropft herab.  opts { width (Z, 6), depth (X, 1,5) }  **Ursprung = Mitte der
//                   Kante oben** (y = 0).
//     luecke:       Lavalücke: zwei Kanten im Abstand width (X, 3) über glühender Lava (1,2 m tiefer), Schein.
//                   opts { width (X, 3), length (Z, 6) }  **Ursprung = Mitte der Lücke auf Fahrbahnhöhe**.
//   state { anim: 'idle', up, warn } (nur Stachelfalle)

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, col, mix,
  smoothstep, lerp, instMesh, setInst, glowSprite, placed, onEllipsoid, puffyStarGeo,
} from '../lib/kit.js';
import {
  W7, LAVA7, prog, num, ZERO, gradV, ownMat, flameGeo, stick, Puffs, hash1, spikeCone, spikeV, glow7, ellSurf, taperTube,
  displace, noise3, memo,
} from '../lib/w7Geos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

// =============================================================================================
// Baron Brummbär (Ursprung = Sitz-/Hüftpunkt)
// =============================================================================================
const BB = {
  fur: 0x8a5230, furHi: 0xb8784a, furDark: 0x5a3218, muzzle: 0xf0caa0, nose: 0x1a1210, stache: 0x2e1a0e, vest: 0x5a2a86, vestHi: 0x8a4ac0,
  shirt: 0xfff8ee, bow: 0xe0262a, button: 0xffc21a, hat: 0x1e1a26, hatHi: 0x4a4458, band: 0xe0262a, gold: 0xffc21a, ink: 0x1a0e08, mouth: 0x5a1020, tooth: 0xffffff,
};
const HC = [0.13, 1.5, 0], HR = [0.45, 0.42, 0.47];
const furV = { v: (x, y, z, nx, ny) => mix(BB.furDark, mix(BB.fur, BB.furHi, smoothstep(ny * 0.6 + nx * 0.3 - 0.1) * 0.5), smoothstep(ny * 0.5 + 0.7)) };
const bearSurf = ellSurf(HC, HR);
const BEAR_EYES = [1, -1].map((s) => { const h = bearSurf(s * 0.36, 0.13); return { p: h.p.toArray(), r: 0.09, sy: 1.1, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.35).toArray() }; });
function bearTorsoGeo() {
  return cached('w7:bear:torso', () => {
    const b = new Build();
    const vestV = { v: (x, y, z, nx, ny) => {
      if (nx > 0.2 && Math.abs(z) < 0.3 * (y - 0.2) + 0.05) return BB.shirt;
      if (ny > 0.8) return BB.fur;
      return mix(BB.vest, BB.vestHi, smoothstep(ny * 0.4 + nx * 0.4));
    } };
    b.sphere(1, vestV, { p: [0, 0.62, 0], s: [0.56, 0.66, 0.62] }, 26, 18);
    b.sphere(1, furV, { p: [0, 1.16, 0], s: [0.38, 0.2, 0.46] }, 16, 8);
    // Fliege, Goldknöpfe, Uhrkette
    for (const s of [1, -1]) b.sphere(1, BB.bow, { p: [0.44, 1.1, s * 0.11], s: [0.08, 0.085, 0.13], r: [s * 0.2, 0, 0] }, 10, 8);
    b.sphere(0.055, BB.bow, { p: [0.48, 1.1, 0] }, 8, 6);
    const vs = ellSurf([0, 0.62, 0], [0.56, 0.66, 0.62]);
    for (let i = 0; i < 3; i++) stick(b, vs(0.42, -0.02 - i * 0.24), BB.button, [0.045, 0.045, 0.03], 0.3);
    // Kopf mit Schnauze, Nase, Ohren
    b.sphere(1, furV, { p: HC, s: HR }, 26, 18);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xd8a87a, BB.muzzle, smoothstep(ny * 0.5 + nx * 0.4 + 0.2)) }, { p: [0.5, 1.37, 0], s: [0.21, 0.18, 0.26] }, 18, 12);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(BB.nose, 0x5a4a48, smoothstep(ny * 0.7 + nx * 0.2 - 0.1)) }, { p: [0.69, 1.44, 0], s: [0.1, 0.075, 0.12] }, 12, 8);
    for (const s of [1, -1]) {
      b.sphere(1, furV, { p: [0.0, 1.85, s * 0.37], s: [0.13, 0.15, 0.14] }, 12, 8);
      b.sphere(1, BB.muzzle, { p: [0.08, 1.85, s * 0.375], s: [0.05, 0.095, 0.095] }, 8, 6);
      // gezwirbelter Schnurrbart
      b.tube([[0.66, 1.34, s * 0.03], [0.69, 1.31, s * 0.16], [0.63, 1.31, s * 0.31], [0.58, 1.4, s * 0.38], [0.61, 1.47, s * 0.34], [0.65, 1.44, s * 0.3]], 0.048, BB.stache, null, 18, 7);
      b.sphere(0.038, BB.stache, { p: [0.65, 1.44, s * 0.3] }, 8, 6);
      // finstere Brauen (tief, schräg nach innen)
      b.box(0.08, 0.065, 0.26, BB.ink, { p: [0.53, 1.7, s * 0.18], r: [-s * 0.45, -s * 0.3, 0], order: 'YXZ' }, 0.028, 1);
    }
    // grimmiger Mund mit zwei Zähnchen unter dem Bart
    b.torus(0.085, 0.018, BB.mouth, { p: [0.63, 1.24, 0], r: [0, Math.PI / 2, Math.PI] }, 6, 14, Math.PI);
    for (const s of [1, -1]) b.box(0.03, 0.04, 0.035, BB.tooth, { p: [0.655, 1.255, s * 0.04] }, 0.01, 1);
    // Monokel am rechten Auge (+Z) mit Kette zur Weste
    const me = BEAR_EYES[0].p;
    b.torus(0.115, 0.02, BB.gold, { p: [me[0] + 0.04, me[1], me[2]], r: [0, Math.PI / 2 - 0.45, 0] }, 8, 22);
    b.tube([[me[0] - 0.02, me[1] - 0.1, me[2] + 0.08], [0.45, 1.22, 0.36], [0.42, 1.0, 0.4], [0.4, 0.82, 0.36]], 0.012, BB.gold, null, 14, 4);
    return b.geometry();
  });
}
const bearHatGeo = () => cached('w7:bear:hat', () => {
  const b = new Build();
  const hatV = { v: (x, y, z, nx, ny) => mix(BB.hat, BB.hatHi, smoothstep(nx * 0.4 + ny * 0.3) * 0.6) };
  b.cyl(0.5, 0.5, 0.035, hatV, { p: [0, 0.02, 0], s: [1, 1, 0.92] }, 32);
  b.torus(0.5, 0.028, BB.hat, { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] }, 6, 32);
  b.cyl(0.31, 0.29, 0.62, hatV, { p: [0, 0.35, 0] }, 28);
  b.cyl(0.32, 0.32, 0.03, BB.hatHi, { p: [0, 0.665, 0] }, 28);
  b.cyl(0.3, 0.3, 0.11, BB.band, { p: [0, 0.11, 0], s: [1.03, 1, 1.03] }, 28);
  // goldene Tatzen-Spange vorn
  b.sphere(1, BB.gold, { p: [0.31, 0.11, 0], s: [0.025, 0.05, 0.06] }, 8, 6);
  for (const z of [-0.05, -0.017, 0.017, 0.05]) b.sphere(0.018, BB.gold, { p: [0.31, 0.17, z] }, 6, 4);
  return b.geometry();
});
/** Arm (Ursprung = Schulter, hängt nach −Y): violetter Ärmel, Manschette, Tatze. */
const bearArmGeo = () => cached('w7:bear:arm', () => {
  const b = new Build();
  b.capsule(0.15, 0.34, { v: (x, y, z, nx) => mix(BB.vest, BB.vestHi, smoothstep(nx * 0.4 + 0.3)) }, { p: [0, -0.22, 0] }, 3, 10);
  b.torus(0.14, 0.04, BB.shirt, { p: [0, -0.47, 0], r: [Math.PI / 2, 0, 0] }, 6, 12);
  b.sphere(0.18, furV, { p: [0.02, -0.61, 0] }, 14, 10);
  b.sphere(1, BB.muzzle, { p: [0.13, -0.65, 0], s: [0.07, 0.09, 0.11] }, 8, 6);
  return b.geometry();
});
const ARM_HAND = new THREE.Vector3(0.03, -0.66, 0);
/** Kickbombe (vereinfacht, wie bosses_w1): indigoblaue Kugel, Goldgürtel, Kragen, Lunte mit Funke, Augen. Mitte im Ursprung. */
const bombGeo = () => cached('w7:bomb', () => {
  const b = new Build();
  b.sphere(0.3, { v: (x, y, z, nx, ny) => mix(0x1c2058, 0x4a54b0, smoothstep(ny * 0.5 + nx * 0.3 + 0.3)) }, {}, 20, 14);
  b.torus(0.3, 0.035, BB.gold, { r: [Math.PI / 2, 0, 0] }, 6, 28);
  b.cyl(0.11, 0.13, 0.08, 0xb8c0d8, { p: [0, 0.31, 0] }, 12);
  b.tube([[0, 0.32, 0], [0.01, 0.42, 0], [-0.04, 0.5, 0.02], [-0.02, 0.56, 0.04]], 0.022, 0xc89a5a, null, 10, 5);
  b.add(puffyStarGeo(0.07, 0.03, 0.03, 0.01, 6), 0xfff070, { p: [-0.02, 0.58, 0.04] });
  for (const s of [1, -1]) {
    b.sphere(1, 0xffffff, { p: [0.24, 0.07, s * 0.085], s: [0.05, 0.07, 0.05] }, 8, 6);
    b.sphere(1, 0x15102a, { p: [0.285, 0.07, s * 0.085], s: [0.02, 0.045, 0.03] }, 6, 4);
  }
  return b.geometry();
});

// =============================================================================================
// Kampfwagen (Ursprung = Mitte der Bodenfläche)
// =============================================================================================
const KW = {
  red: 0xe8202a, redHi: 0xff6a5a, redLow: 0x8a0e18, iron: 0x3c3c4e, ironHi: 0x7a7a94, ironLow: 0x1c1c28, gold: 0xffc21a, goldHi: 0xfff0a0,
  spike: 0xf4ead0, tire: 0x1e1e26, tireHi: 0x3a3a48, seat: 0x6a1a1a, chrome: 0xe6eaf2, lamp: 0xfff6c8, soot: 0x2a2224, crack: 0x140c0c,
};
const WHEELS = [[1.62, 0.62, 1.12], [1.62, 0.62, -1.12], [-1.45, 0.62, 1.12], [-1.45, 0.62, -1.12]];
const redV = { v: (x, y, z, nx, ny) => mix(KW.redLow, mix(KW.red, KW.redHi, smoothstep(ny * 0.7 + nx * 0.2 - 0.2) * 0.45), smoothstep(ny * 0.6 + 0.55)) };
const ironV = { v: (x, y, z, nx, ny) => mix(KW.ironLow, KW.ironHi, smoothstep(ny * 0.5 + nx * 0.2 + 0.35)) };
function rivets(b, list, r = 0.035) { for (const p of list) b.sphere(r, KW.gold, { p, s: [1, 1, 1] }, 6, 4); }
/** Wagenkörper je Schadensstufe (0 heil, 1 angeschlagen, 2 schwer beschädigt). */
function carGeo(dmg = 0) {
  return cached(`w7:kw:car:${dmg}`, () => {
    const b = new Build();
    // Wanne und Seitenschürzen
    b.box(4.3, 0.78, 2.0, redV, { p: [0.05, 0.92, 0] }, 0.24, 2);
    b.box(4.0, 0.22, 1.7, ironV, { p: [0.05, 0.48, 0] }, 0.08, 1);
    for (const s of [1, -1]) {
      b.box(1.5, 0.5, 0.08, ironV, { p: [0.08, 0.86, s * 1.02] }, 0.04, 1);
      rivets(b, [-0.55, -0.2, 0.15, 0.5, 0.75].map((x) => [x + 0.08, 1.06, s * 1.065]), 0.03);
      rivets(b, [-0.55, 0.7].map((x) => [x + 0.08, 0.66, s * 1.065]), 0.03);
      // Brummbär-Wappen: goldener Rand, schwarzer Schild, goldener Bärenkopf mit Zylinder
      b.cyl(0.3, 0.3, 0.05, KW.gold, { p: [0.08, 0.86, s * 1.07], r: [Math.PI / 2, 0, 0] }, 18);
      b.cyl(0.25, 0.25, 0.04, 0x1a1418, { p: [0.08, 0.86, s * 1.09], r: [Math.PI / 2, 0, 0] }, 18);
      b.sphere(1, KW.gold, { p: [0.08, 0.82, s * 1.11], s: [0.14, 0.12, 0.03] }, 12, 6);
      for (const e of [1, -1]) b.sphere(0.05, KW.gold, { p: [0.08 + e * 0.11, 0.92, s * 1.11], s: [1, 1, 0.5] }, 8, 4);
      b.box(0.14, 0.1, 0.03, KW.gold, { p: [0.08, 0.98, s * 1.11] }, 0.01, 1);
      b.box(0.22, 0.025, 0.03, KW.gold, { p: [0.08, 0.93, s * 1.11] }, 0.01, 1);
    }
    // Kotflügel über den Rädern (rot mit Eisenkante)
    for (const [x, , z] of WHEELS) {
      const g = new THREE.CylinderGeometry(0.78, 0.78, 0.5, 16, 1, true, 0, Math.PI);
      b.add(g, redV, { p: [x, 0.68, z], r: [Math.PI / 2, 0, Math.PI / 2], order: 'ZYX' });
      b.torus(0.78, 0.045, ironV, { p: [x, 0.68, z + Math.sign(z) * 0.25], r: [0, 0, 0] }, 5, 16, Math.PI);
    }
    // Haube (schräg) mit Panzerplatte und Nieten
    b.box(1.6, 0.42, 1.76, redV, { p: [1.45, 1.42, 0], r: [0, 0, -0.08] }, 0.16, 2);
    if (dmg < 2) {
      b.box(1.2, 0.07, 1.3, ironV, { p: [1.5, 1.66, 0], r: [0, 0, -0.08] }, 0.03, 1);
      rivets(b, [[1.0, 1.7, 0.55], [1.0, 1.7, -0.55], [2.02, 1.62, 0.55], [2.02, 1.62, -0.55], [1.5, 1.68, 0.6], [1.5, 1.68, -0.6]]);
    } else {
      // Panzerplatte abgerissen: offener Motor mit glühenden Zylindern, Platte hängt schief an einer Ecke
      b.box(0.9, 0.22, 1.0, ironV, { p: [1.5, 1.66, 0] }, 0.05, 1);
      for (let i = 0; i < 3; i++) b.cyl(0.13, 0.13, 0.22, { v: (x, y) => mix(0xd8320a, 0xffb02a, smoothstep(y / 0.22 + 0.5)) }, { p: [1.2 + i * 0.3, 1.82, 0.22] }, 10);
      for (let i = 0; i < 3; i++) b.cyl(0.13, 0.13, 0.22, ironV, { p: [1.2 + i * 0.3, 1.82, -0.22] }, 10);
      b.box(1.2, 0.07, 1.3, ironV, { p: [1.62, 1.42, 1.18], r: [1.25, 0.15, -0.1] }, 0.03, 1);
    }
    // Ramm-Pflug mit fünf Stacheln
    b.box(0.32, 0.86, 2.06, ironV, { p: [2.32, 0.88, 0], r: [0, 0, 0.12] }, 0.08, 1);
    b.box(0.08, 0.1, 2.1, KW.gold, { p: [2.4, 1.3, 0], r: [0, 0, 0.12] }, 0.03, 1);
    [-0.8, -0.4, 0, 0.4, 0.8].forEach((z, i) => {
      const y = i % 2 ? 0.98 : 0.74;
      const broken = dmg >= 1 && i === 3;
      const len = broken ? 0.16 : 0.5;
      b.add(spikeCone(0.13, len, 8), spikeV(len, 0xd8c8a8, KW.spike), placed(new THREE.Vector3(2.44, y, z), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
    });
    // Scheinwerfer
    for (const s of [1, -1]) {
      b.cyl(0.15, 0.13, 0.14, KW.chrome, { p: [2.16, 1.52, s * 0.74], r: [0, 0, Math.PI / 2] }, 14);
      b.cyl(0.115, 0.115, 0.02, KW.lamp, { p: [2.235, 1.52, s * 0.74], r: [0, 0, Math.PI / 2] }, 14);
    }
    // Kanonenturm auf der Haube (Sockel, Goldring)
    b.cyl(0.42, 0.5, 0.3, ironV, { p: [1.1, 1.82, 0] }, 20);
    b.torus(0.46, 0.04, KW.gold, { p: [1.1, 1.92, 0], r: [Math.PI / 2, 0, 0] }, 5, 20);
    b.sphere(1, ironV, { p: [1.1, 1.98, 0], s: [0.36, 0.26, 0.36] }, 16, 8);
    // Sitz, Lenkrad, Rückenpanzer
    b.box(0.9, 0.2, 1.5, KW.seat, { p: [-0.55, 1.28, 0] }, 0.08, 1);
    b.box(0.32, 0.9, 1.6, redV, { p: [-1.22, 1.62, 0], r: [0, 0, 0.12] }, 0.14, 2);
    b.box(0.08, 0.84, 1.3, ironV, { p: [-1.38, 1.62, 0], r: [0, 0, 0.12] }, 0.03, 1);
    rivets(b, [[-1.42, 1.95, 0.5], [-1.42, 1.95, -0.5], [-1.36, 1.3, 0.5], [-1.36, 1.3, -0.5]]);
    b.torus(0.22, 0.035, 0x2a2a2a, { p: [0.32, 1.86, 0], r: [0, Math.PI / 2, 0], s: [1, 1, 1] }, 6, 18);
    b.cyl(0.035, 0.035, 0.5, 0x2a2a2a, { p: [0.44, 1.7, 0], r: [0, 0, 0.9] }, 6);
    // Heck mit Auspuff-Schloten (Goldtrichter)
    b.box(0.5, 0.6, 1.9, redV, { p: [-1.95, 1.2, 0] }, 0.16, 2);
    for (const s of [1, -1]) {
      const bend = dmg >= 2 && s > 0 ? 0.35 : 0;
      b.cyl(0.13, 0.15, 1.2, ironV, { p: [-2.05 - bend * 0.25, 1.95, s * 0.62], r: [bend, 0, 0.18] }, 12);
      b.cyl(0.24, 0.14, 0.24, KW.gold, { p: [-2.17 - bend * 0.5, 2.6, s * (0.62 + bend * 0.2)], r: [bend, 0, 0.18] }, 12, true);
    }
    // Schaden: Rußflecken, Risse
    if (dmg >= 1) {
      for (const [x, y, z, r] of [[1.6, 1.66, 0.3, 0.28], [0.6, 1.2, 1.0, 0.22], [-1.0, 1.2, -1.0, 0.2]]) b.sphere(1, KW.soot, { p: [x, y, z], s: [r, 0.04, r] }, 10, 4);
    }
    if (dmg >= 2) {
      for (const [x, y, z, r] of [[1.2, 1.4, -0.92, 0.25], [-0.5, 1.0, 1.03, 0.25], [2.0, 1.5, 0.6, 0.2]]) b.sphere(1, KW.soot, { p: [x, y, z], s: [r, r * 0.8, 0.04] }, 10, 4);
      b.tube([[0.9, 1.3, 1.01], [1.1, 1.15, 1.02], [1.05, 1.0, 1.02], [1.25, 0.85, 1.01]], 0.02, KW.crack, null, 10, 4);
      b.tube([[-0.2, 1.25, -1.01], [-0.05, 1.1, -1.02], [-0.2, 0.95, -1.02]], 0.02, KW.crack, null, 8, 4);
    }
    return b.geometry();
  });
}
function wheelGeo() {
  return cached('w7:kw:wheel', () => {
    const b = new Build();
    b.cyl(0.62, 0.62, 0.44, { v: (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.5 ? KW.tireHi : KW.tire) }, { r: [Math.PI / 2, 0, 0] }, 24);
    // Stollen
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      b.box(0.16, 0.08, 0.46, KW.tire, { p: [Math.cos(a) * 0.63, Math.sin(a) * 0.63, 0], r: [0, 0, a + Math.PI / 2] }, 0, 1);
    }
    for (const s of [1, -1]) {
      b.cyl(0.36, 0.36, 0.03, ironV, { p: [0, 0, s * 0.225], r: [Math.PI / 2, 0, 0] }, 18);
      b.cyl(0.22, 0.24, 0.06, KW.gold, { p: [0, 0, s * 0.25], r: [Math.PI / 2, 0, 0] }, 14);
      // Stachel-Nabe
      b.add(spikeCone(0.08, 0.26, 8), spikeV(0.26, 0xd8c8a8, KW.spike), placed(new THREE.Vector3(0, 0, s * 0.27), new THREE.Vector3(0, 0, s), new THREE.Vector3(1, 1, 1)));
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; b.sphere(0.03, KW.goldHi, { p: [Math.cos(a) * 0.29, Math.sin(a) * 0.29, s * 0.245] }, 6, 4); }
    }
    return b.geometry();
  });
}
/** Kanonenrohr (Ursprung = Drehachse im Turm, Rohr nach +X): schwarzes Eisen, Goldringe, Mündungstrichter. */
const barrelGeo = () => cached('w7:kw:barrel', () => {
  const b = new Build();
  const blackV = { v: (x, y, z, nx, ny) => mix(0x14141c, 0x5a5a70, smoothstep(ny * 0.5 + 0.4)) };
  b.lathe([[0, 0], [0.2, 0], [0.2, 0.1], [0.17, 0.4], [0.15, 0.9], [0.19, 1.0], [0.25, 1.12], [0.22, 1.16], [0.12, 1.12], [0, 1.1]], blackV, { r: [0, 0, -Math.PI / 2] }, 18);
  for (const x of [0.12, 0.55, 0.96]) b.torus(0.18, 0.03, KW.gold, { p: [x, 0, 0], r: [0, Math.PI / 2, 0] }, 5, 16);
  b.cyl(0.1, 0.1, 0.02, 0xff6a1a, { p: [1.14, 0, 0], r: [0, 0, Math.PI / 2] }, 12);
  return b.geometry();
});
const BARREL_AT = new THREE.Vector3(1.1, 2.0, 0);

function buildKampfwagen() {
  const root = new THREE.Group();
  const own = [];
  const carMat = ownMat(vcol(0.3, { metalness: 0.12 }, 'w7car'), { emissive: 0x000000 });
  const bearMat = ownMat(vcol(0.48, {}, 'w7bear'), { emissive: 0x000000 });
  own.push(carMat, bearMat);
  const car = joint();
  const body = mesh(carGeo(0), carMat, {}, true);
  const wheels = instMesh(wheelGeo(), vcol(0.55, {}, 'w7tire'), 4, 4, 0.8);
  wheels.castShadow = true;
  const barrelJ = joint(BARREL_AT.toArray());
  const barrel = mesh(barrelGeo(), vcol(0.3, { metalness: 0.3 }, 'w7barrel'), {}, true);
  const flame = mesh(flameGeo('rot', 12), glow7(), { p: [1.12, 0, 0], r: [0, 0, -Math.PI / 2], s: [0.55, 0.9, 0.55] });
  flame.visible = false;
  barrelJ.add(barrel, flame);
  car.add(body, wheels, barrelJ);
  // Bär
  const bear = joint([-0.55, 1.32, 0]);
  const bodyJ = joint();
  const torso = mesh(bearTorsoGeo(), bearMat, {}, true);
  const eye = eyes(BEAR_EYES, { key: 'w7:bear', iris: 0x8a2a14, pupil: 0.5, depth: 0.5 });
  const hat = mesh(bearHatGeo(), vcol(0.35, {}, 'w7hat'), { p: [0.06, 1.86, 0] }, true);
  const arms = instMesh(bearArmGeo(), bearMat, 2, 2.5, 1);
  arms.castShadow = true;
  const bomb = mesh(bombGeo(), vcol(0.28, {}, 'w7bomb'), { s: 0.85 }, true);
  const dizzy = dizzyStars(0.6, 0.13); dizzy.position.set(0.1, 2.2, 0);
  bodyJ.add(torso, eye, hat, arms, bomb, dizzy);
  bear.add(bodyJ);
  car.add(bear);
  const smoke = new Puffs(14, 0x8a8490, { opacity: 0.62, radius: 6, cy: 2 });
  own.push(smoke);
  root.add(car, smoke.mesh);
  root.userData.radius = 2.4;
  root.userData.top = 3.8;
  const clk = new Clock(), blink = new Blinker();
  let spinA = 0, slump = 0, steer = 0, recoil = 0, emit = 0, dmgShown = 0, tilt = 0, hatSpin = 0;
  const hatHome = new THREE.Vector3(0.06, 1.86, 0);
  const SH = [new THREE.Vector3(0.06, 1.0, 0.64), new THREE.Vector3(0.06, 1.0, -0.64)];
  const armA = [{ z: 1, x: 0.15 }, { z: 1, x: -0.15 }];
  const lightSmoke = new THREE.Color(0xd8d2dc), darkSmoke = new THREE.Color(0x4a444c);
  const update = (dt, st) => {
    let anim = st.anim ?? 'drive';
    if (!['idle', 'drive', 'throw', 'fire', 'hit', 'stunned', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const hp = clamp(Math.round(num(st.hp, 9)), 0, 9);
    const dmg = anim === 'defeated' || hp <= 3 ? 2 : hp <= 6 ? 1 : 0;
    if (dmg !== dmgShown) { dmgShown = dmg; body.geometry = carGeo(dmg); }
    const dead = anim === 'defeated';
    const speed = dead ? 0 : num(st.speed, anim === 'drive' || anim === 'throw' || anim === 'fire' ? 8 : 0);
    // Wagen: Räder, Federn, Lenken, Beben
    spinA -= dt * speed / 0.62;
    steer = damp(steer, clamp(num(st.steer, 0), -1, 1) * 0.4, 6, dt);
    WHEELS.forEach(([x, y, z], i) => setInst(wheels, i, x, y - (dead && i % 2 === 0 ? 0.12 : 0), z, dead && i === 0 ? 0.25 : 0, i < 2 ? steer : 0, spinA));
    wheels.instanceMatrix.needsUpdate = true;
    const hitP = anim === 'hit' ? prog(st, clk, 0.6) : 1;
    tilt = damp(tilt, dead ? 0.09 : 0, 3, dt);
    const rumble = speed > 0.5 ? Math.abs(Math.sin(t * 9)) * 0.04 : anim === 'idle' || anim === 'stunned' ? Math.abs(Math.sin(t * 23)) * 0.012 : 0;
    car.position.y = rumble;
    car.rotation.x = (speed > 0.5 ? Math.sin(t * 7) * 0.012 - steer * 0.05 : 0) + tilt + (anim === 'hit' ? Math.sin(hitP * Math.PI * 3) * 0.04 * (1 - hitP) : 0);
    car.rotation.z = (anim === 'hit' ? Math.sin(hitP * Math.PI) * 0.06 : 0) + (dead ? -0.04 : 0) + (anim === 'fire' ? -recoil * 0.06 : 0);
    // Kanone: laden, feuern, Rückstoß
    let fireOn = false, charge = 0;
    if (anim === 'fire') {
      const p = prog(st, clk, 0.8);
      if (p < 0.4) charge = smoothstep(p / 0.4);
      else if (p < 0.72) { fireOn = true; recoil = damp(recoil, p < 0.5 ? 1 : 0, 20, dt); }
      else recoil = damp(recoil, 0, 6, dt);
      if (p >= 0.45 && emit <= 0 && p < 0.6) { const mz = BARREL_AT.clone().add(_v.set(1.3, 0, 0)); smoke.burst(mz.toArray(), { count: 4, speed: 1.5, up: 0.8, size: 0.35, life: 0.7, spread: 0.2 }); emit = 0.3; }
    } else recoil = damp(recoil, 0, 8, dt);
    barrelJ.position.set(BARREL_AT.x - recoil * 0.3 + (charge > 0 ? Math.sin(t * 60) * 0.015 * charge : 0), BARREL_AT.y, 0);
    barrelJ.rotation.z = 0.08 + (dead ? -0.25 : 0) + charge * 0.04;
    flame.visible = fireOn || charge > 0.3;
    flame.scale.set(0.55 * (fireOn ? 1 : 0.35 + charge * 0.2), (fireOn ? 1.0 + Math.sin(t * 40) * 0.15 : 0.25 + charge * 0.2), 0.55 * (fireOn ? 1 : 0.35 + charge * 0.2));
    flame.position.x = fireOn ? 1.12 : 1.0;
    // Bär: Haltung
    slump = damp(slump, dead ? 1 : 0, 3, dt);
    bodyJ.rotation.z = slump * -0.4 + (anim === 'hit' ? Math.max(0, 0.4 - hitP * 0.6) * 0.9 : 0) + (anim === 'throw' ? 0.06 : 0);
    bodyJ.rotation.x = anim === 'stunned' ? Math.sin(t * 4) * 0.12 : speed > 0.5 ? Math.sin(t * 7) * 0.03 : 0;
    bodyJ.rotation.y = anim === 'idle' ? Math.sin(t * 0.8) * 0.18 : anim === 'drive' ? Math.sin(t * 0.7) * 0.1 : 0;
    bodyJ.position.y = -slump * 0.25 + (speed > 0.5 ? Math.abs(Math.sin(t * 9 + 0.5)) * 0.02 : 0);
    // Arme: Lenkrad, trommeln, werfen, Knopf drücken
    let rz = 1.0, lz = 1.0, rx = 0.15, lx = -0.15, bombOn = false;
    if (anim === 'idle') { rz = 1.0 + Math.max(0, Math.sin(t * 9)) * 0.15; lz = 1.0 + Math.max(0, Math.sin(t * 9 + 1.5)) * 0.15; }
    else if (anim === 'drive') { rz += Math.sin(t * 2.4) * 0.08 + steer * 0.4; lz += -Math.sin(t * 2.4) * 0.08 - steer * 0.4; }
    else if (anim === 'throw') {
      const p = prog(st, clk, 1.0);
      if (p < 0.45) { const k = smoothstep(p / 0.45); rz = 1.0 - k * 3.6; rx = 0.15 + k * 0.4; bombOn = true; }
      else if (p < 0.6) { const k = smoothstep((p - 0.45) / 0.15); rz = -2.6 + k * 4.4; rx = 0.55 - k * 0.3; bombOn = p < 0.5; }
      else { const k = smoothstep((p - 0.6) / 0.4); rz = 1.8 - k * 0.8; rx = 0.25 - k * 0.1; }
    } else if (anim === 'fire') { const p = prog(st, clk, 0.8); lz = p < 0.45 ? 1.4 : 0.9; lx = -0.05; rz = 1.0; }
    else if (anim === 'hit') { rz = 2.4; lz = 2.4; rx = 0.8; lx = -0.8; }
    else if (anim === 'stunned') { rz = 0.4 + Math.sin(t * 5) * 0.3; lz = 0.4 + Math.cos(t * 5) * 0.3; rx = 0.4; lx = -0.4; }
    else if (dead) { rz = 0.5; lz = 0.5; rx = 0.25; lx = -0.25; }
    armA[0].z = damp(armA[0].z, rz, anim === 'throw' ? 30 : 10, dt); armA[0].x = damp(armA[0].x, rx, 12, dt);
    armA[1].z = damp(armA[1].z, lz, 10, dt); armA[1].x = damp(armA[1].x, lx, 12, dt);
    for (let i = 0; i < 2; i++) {
      _e.set(armA[i].x, 0, armA[i].z);
      _q.setFromEuler(_e);
      arms.setMatrixAt(i, _m.compose(SH[i], _q, _s.setScalar(1)));
      if (i === 0) {
        // Bombe in der rechten Tatze
        bomb.position.copy(ARM_HAND).add(_v.set(0.05, -0.2, 0)).applyQuaternion(_q).add(SH[0]);
      }
    }
    arms.instanceMatrix.needsUpdate = true;
    bomb.visible = bombOn;
    bomb.rotation.y = t * 2;
    // Zylinder: fliegt bei Treffer hoch, schief bei Niederlage
    const hy = anim === 'hit' ? Math.sin(hitP * Math.PI) * 1.0 : 0;
    hatSpin = anim === 'hit' ? hitP * TAU : 0;
    hat.position.set(hatHome.x - slump * 0.1, hatHome.y + hy - slump * 0.05, hatHome.z + slump * 0.18);
    hat.rotation.set(0.06 + slump * 0.45, hatSpin, -0.12 - slump * 0.35);
    // Aufblitzen
    const hitK = anim === 'hit' ? Math.max(0, 1 - hitP) * (Math.sin(clk.age * 40) > 0 ? 1 : 0.2) : 0;
    bearMat.emissive.setRGB(hitK * 0.8, hitK * 0.68, hitK * 0.64);
    carMat.emissive.setRGB(hitK * 0.32 + charge * 0.08, hitK * 0.2, hitK * 0.18);
    // Rauch: Schlote, Schaden, Niederlage
    emit -= dt;
    if (emit <= 0) {
      const heavy = dead || anim === 'stunned' || dmg >= 2;
      if (dead || anim === 'stunned') { smoke.burst([1.4, 1.8, (Math.random() - 0.5)], { count: 2, speed: 0.6, up: 1.6, size: 0.4, life: 1.1, spread: 0.3 }); emit = 0.12; }
      else if (dmg >= 1 && (t % 1.2) < 0.4) { smoke.burst([1.5, 1.75, 0.3], { count: 1, speed: 0.4, up: 1.4, size: heavy ? 0.32 : 0.22, life: 0.9, spread: 0.2 }); emit = 0.2; }
      else { for (const s of [1, -1]) smoke.burst([-2.25, 2.75, s * 0.62], { count: 1, speed: 0.5, up: 2.2, size: speed > 0.5 ? 0.15 : 0.11, life: 0.7, spread: 0.05 }); emit = speed > 0.5 ? 0.16 : 0.4; }
    }
    smoke.mat.color.copy(dmg >= 2 || anim === 'stunned' ? darkSmoke : lightSmoke);
    smoke.step(dt);
    let bk = blink.update(dt);
    if (anim === 'hit' || dead) bk = 0.12; else if (anim === 'stunned') bk = 0.4; else if (anim === 'throw' || anim === 'fire') bk = 0.75;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned';
    dizzy.rotation.y = t * 3.5;
  };
  const model = makeModel('baron_kampfwagen', root, update, [...own, wheels, arms], { initial: 'drive' });
  model.hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return bomb.getWorldPosition(out); };
  model.muzzle = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return barrelJ.localToWorld(out.set(1.3, 0, 0)); };
  return model;
}

// =============================================================================================
// Boss-Straße: Fahrbahn, Stachelfalle, Lavalücke
// =============================================================================================
const ST = { asphalt: 0x3a3442, asphaltHi: 0x5a5266, asphaltLow: 0x1e1a24, line: 0xffc21a, curbR: 0xe8283a, curbW: 0xfff6ee, steel: 0x6a7084, steelHi: 0xc8d0e0, steelLow: 0x2a2e3a, hazard: 0xffc21a, black: 0x1a1a20 };
const asphaltV = { v: (x, y, z, nx, ny) => (ny > 0.7 ? mix(ST.asphalt, ST.asphaltHi, (noise3(x * 2.1, 0, z * 2.1) - 0.3) * 0.6) : mix(W7.rockLow, W7.rock, smoothstep(y + 0.4))) };
function roadGeo(L, W, T) {
  return cached(`w7:road:${L}:${W}:${T}`, () => {
    const b = new Build();
    b.add(new THREE.BoxGeometry(L, T, W, Math.max(1, Math.round(L * 1.5)), 1, Math.max(1, Math.round(W * 1.5))), asphaltV, { p: [0, -T / 2, 0] });
    // gestrichelte Mittellinie
    for (let x = -L / 2 + 0.5; x < L / 2 - 0.4; x += 1.5) b.box(0.9, 0.03, 0.16, ST.line, { p: [x + 0.45, 0.012, 0] }, 0, 1);
    // rot-weiße Randsteine
    const n = Math.max(2, Math.round(L / 0.6));
    for (const s of [1, -1]) for (let i = 0; i < n; i++) b.box(L / n - 0.02, 0.14, 0.3, i % 2 ? ST.curbW : ST.curbR, { p: [-L / 2 + (i + 0.5) * L / n, 0.05, s * (W / 2 - 0.15)] }, 0.03, 1);
    return b.geometry();
  });
}
/** Stachelfalle: Platte (Lochraster, Warnstreifen) – Stacheln separat (Instanzen). */
function trapPlateGeo(X, Z) {
  return cached(`w7:trap:${X}:${Z}`, () => {
    const b = new Build();
    const steelV = { v: (x, y, z, nx, ny) => mix(ST.steelLow, ST.steelHi, smoothstep(ny * 0.5 + 0.2)) };
    b.box(X, 0.12, Z, steelV, { p: [0, -0.06, 0] }, 0.03, 1);
    // Warnstreifen-Rahmen
    const stripes = (x, y, z) => ((Math.floor((x + z) * 3.2) % 2 + 2) % 2 ? col(ST.hazard) : col(ST.black));
    for (const s of [1, -1]) {
      b.box(X, 0.03, 0.16, stripes, { p: [0, 0.01, s * (Z / 2 - 0.08)] }, 0, 1);
      b.box(0.16, 0.03, Z - 0.32, stripes, { p: [s * (X / 2 - 0.08), 0.01, 0] }, 0, 1);
    }
    for (const [x, z] of trapHoles(X, Z)) b.cyl(0.11, 0.11, 0.02, 0x0a0a10, { p: [x, 0.005, z] }, 10);
    return b.geometry();
  });
}
function trapHoles(X, Z) {
  const out = [];
  const nx = Math.max(1, Math.floor((X - 0.3) / 0.5)), nz = Math.max(1, Math.floor((Z - 0.3) / 0.5));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([-(nx - 1) * 0.25 + i * 0.5 + (j % 2) * 0.12, -(nz - 1) * 0.25 + j * 0.5]);
  return out;
}
const trapSpikeGeo = () => cached('w7:trap:spike', () => new Build().add(spikeCone(0.1, 0.6, 8), spikeV(0.6, 0xc8ccd8, 0xffffff), { r: [-Math.PI / 2, 0, 0] }).cyl(0.1, 0.1, 0.5, ST.steelLow, { p: [0, -0.25, 0] }, 8).geometry());
/** Bruchkante (Fahrbahn reicht nach −X bis depth, Abbruch bei x = 0 gezackt) mit Warnwinkeln und glühenden Rissen. */
function edgeGeo(W, D) {
  return memo(`w7:edge:${W}:${D}`, () => {
    const b = new Build(), gl = new Build();
    const T = 0.6;
    const g = new THREE.BoxGeometry(D, T, W, Math.max(2, Math.round(D * 3)), 2, Math.max(4, Math.round(W * 4)));
    g.translate(-D / 2, -T / 2, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), y = P.getY(i);
      if (x > -0.01) P.setX(i, x - (Math.sin(z * 5.3) * 0.5 + 0.5) * 0.22 - hash1(Math.round(z * 4) + 3) * 0.08 + (y < -T * 0.6 ? -0.15 : 0));
    }
    g.computeVertexNormals();
    b.add(g, asphaltV);
    // Warnwinkel an der Kante
    for (let z = -W / 2 + 0.4; z < W / 2 - 0.2; z += 0.8) {
      const sh = new THREE.Shape([[0, 0.18], [0.22, 0], [0, -0.18], [0.07, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
      b.extrude(sh, 0.025, ST.hazard, { p: [-0.6, 0.012, z], r: [-Math.PI / 2, 0, 0] }, 0, 1, 1);
    }
    b.box(0.12, 0.03, W - 0.3, ST.black, { p: [-0.32, 0.012, 0] }, 0, 1);
    // glühende Risse und Lavatropfen
    gl.tube([[-0.25, 0.005, -W * 0.2], [-0.5, 0.005, -W * 0.15], [-0.7, 0.005, -W * 0.22], [-0.95, 0.005, -W * 0.18]], 0.035, LAVA7.rot.hot, null, 12, 4);
    gl.tube([[-0.2, 0.005, W * 0.25], [-0.45, 0.005, W * 0.3], [-0.62, 0.005, W * 0.24]], 0.03, LAVA7.rot.hot, null, 10, 4);
    for (const z of [-W * 0.3, -0.2, W * 0.2]) gl.capsule(0.06, 0.35, { v: (x, y) => mix(LAVA7.rot.white, LAVA7.rot.hot, smoothstep(-y * 2)) }, { p: [-0.12, -0.45, z] }, 3, 8);
    return { body: b.geometry(), glow: gl.geometry() };
  });
}
function lavaStripGeo(Wx, Lz) {
  return cached(`w7:lavastrip:${Wx}:${Lz}`, () => {
    const g = new THREE.PlaneGeometry(Wx + 0.8, Lz, Math.max(2, Math.round(Wx * 2)), Math.max(2, Math.round(Lz * 2)));
    g.rotateX(-Math.PI / 2);
    return new Build().add(g, (x, y, z) => mix(LAVA7.rot.deep, LAVA7.rot.hotter, noise3(x * 1.3 + 2, 0, z * 1.3))).geometry();
  });
}
function buildStrasse(opts = {}) {
  const kind = ['stachelfalle', 'kante', 'luecke'].includes(opts.kind) ? opts.kind : 'fahrbahn';
  const root = new THREE.Group();
  const own = [];
  const roadMat = vcol(0.82, {}, 'w7road');
  const clk = new Clock();
  let update = () => {};
  if (kind === 'fahrbahn') {
    const L = Math.max(1, num(opts.length, 8)), W = Math.max(1, num(opts.width, 6)), T = Math.max(0.1, num(opts.thick, 0.5));
    root.add(mesh(roadGeo(L, W, T), roadMat, {}, false));
    root.children[0].receiveShadow = true;
  } else if (kind === 'stachelfalle') {
    const sz = Array.isArray(opts.size) ? opts.size : [2, 4];
    const X = Math.max(0.6, num(sz[0], 2)), Z = Math.max(0.6, num(sz[1], 4));
    const plate = mesh(trapPlateGeo(X, Z), vcol(0.35, { metalness: 0.3 }, 'w7trap'), {}, false);
    plate.receiveShadow = true;
    const holes = trapHoles(X, Z);
    const spikes = instMesh(trapSpikeGeo(), vcol(0.25, { metalness: 0.35 }, 'w7spikes'), holes.length, Math.max(X, Z), 0.3);
    spikes.castShadow = true;
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
    own.push(lampMat);
    const lamps = instMesh(cached('w7:trap:lamp', () => new Build().dome(0.09, 0xffffff, {}, Math.PI / 2, 12, 5).geometry()), lampMat, 4, Math.max(X, Z), 0.1);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, c], i) => setInst(lamps, i, a * (X / 2 - 0.08), 0.02, c * (Z / 2 - 0.08)));
    lamps.instanceMatrix.needsUpdate = true;
    root.add(plate, spikes, lamps);
    let up = 0;
    update = (dt, st) => {
      clk.tick(dt, st.anim ?? 'idle');
      const t = clk.t;
      const target = clamp(num(st.up, 0), 0, 1);
      up = damp(up, target, 18, dt);
      const warn = !!st.warn;
      holes.forEach(([x, z], i) => {
        const jig = warn ? Math.max(0, Math.sin(t * 30 + i * 1.7)) * 0.06 : 0;
        const y = lerp(-0.66, 0, up) + jig;
        setInst(spikes, i, x, y, z, 0, i * 0.7, 0, y < -0.64 ? 0.001 : 1);
      });
      spikes.instanceMatrix.needsUpdate = true;
      const on = warn ? Math.sin(t * 14) > 0 : up > 0.5;
      lampMat.color.setHex(on ? 0xff4a1a : 0x5a1a14);
    };
  } else {
    const isGap = kind === 'luecke';
    const Wz = Math.max(1, num(isGap ? opts.length : opts.width, 6));
    const D = Math.max(0.5, num(opts.depth, 1.5));
    const gap = Math.max(0.5, num(opts.width, 3));
    const eg = edgeGeo(Wz, D);
    const sides = isGap ? [[-gap / 2, 0], [gap / 2, Math.PI]] : [[0, 0]];
    for (const [x, yaw] of sides) {
      const j = joint([x, 0, 0], mesh(eg.body, roadMat, {}, true), mesh(eg.glow, glow7()));
      j.rotation.y = yaw;
      root.add(j);
    }
    if (isGap) {
      const lava = mesh(lavaStripGeo(gap, Wz), glow7(), { p: [0, -1.2, 0] });
      const halo = glowSprite(0xff6a1a, gap * 1.8, 0.45);
      halo.position.y = -0.8;
      root.add(lava, halo);
      const lavaMesh = lava;
      update = (dt, st) => { clk.tick(dt, st.anim ?? 'idle'); lavaMesh.position.y = -1.2 + Math.sin(clk.t * 1.5) * 0.03; };
    }
  }
  const model = makeModel('kampfwagen_strasse', root, (dt, st) => update(dt, st), own, { initial: 'idle' });
  return model;
}

export const MODELS = {
  baron_kampfwagen: buildKampfwagen,
  kampfwagen_strasse: buildStrasse,
};
