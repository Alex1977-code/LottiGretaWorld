// Endgegner der Halloween-Welt „Kürbisinsel“ (H-Burg): Graf Brummbär – Baron Brummbär (bosses_w1.js: brauner Bär,
// schwarzer Zylinder mit rotem Band, goldenes Monokel mit Kette, gezwirbelter Schnurrbart, violette Weste mit Goldknöpfen,
// rote Fliege; gleiche Farben und Maße, stehend ohne Auto) im Vampirumhang – dazu seine Kürbis-Bomben und der
// Fledermaus-Schwarm, in den er sich verwandelt. Lustig, nicht gruselig: Plastik-Vampirzähnchen, freche Brauen.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X; state darf ein String sein ('idle' ≙ { anim: 'idle' }).
//
// graf_brummbaer   ≈3,0 m (mit Zylinder)  Graf Brummbär: Bär mit Weste, Hemdbrust, Fliege, Monokel, Zylinder (Fledermaus-
//   Spange am Band), schwarzem Umhang mit rotem Futter und hohem, spitzem Stehkragen, Goldkette mit Medaillon, zwei
//   Plastik-Vampirzähnchen unter dem Schnurrbart, Lackschuhe mit Gamaschen.
//   state { anim: 'idle'|'walk'|'throw'|'hit'|'stunned'|'bats'|'defeated', hp (3..0, Standard 3), speed (walk m/s, 1,6),
//           progress? (throw 0..1 in 1,0 s; hit 0..1 in 0,6 s; bats 0..1 in 0,9 s; defeated 0..1 in 1,6 s) }
//         idle: wiegt sich, Umhang weht, zwirbelt den Bart; walk: stapft, Umhang flattert nach hinten;
//         throw: holt mit einer Kürbis-Bombe in der rechten Tatze aus (0–0,45), wirft bei progress 0,5 – ab da die
//                Bombe im Motor erzeugen (Position: model.hand()); hit: Zylinder fliegt hoch, Augen zu, blitzt (0,6 s);
//         stunned: Schwindelsterne, wankt; bats: wickelt sich in den Umhang (0–0,4) und verpufft in lila Rauch mit
//                Fledermäusen (0,4–1) – progress 1 = weg (root.userData.hidden), rückwärts abspielen = Wiederkehr; den
//                Schwarm selbst zeigt 'fledermaus_schwarm'; defeated: setzt sich auf den Boden, Zylinder schief,
//                Schwindelsterne, kleine Fledermäuse flattern aus dem Umhang davon.
//         hp: ≤ 2 Monokel fällt heraus und baumelt an der Kette; ≤ 1 Zylinder verbeult und schief, Brauen besorgt.
//   model.hand(out?: Vector3) → Weltposition der Bombe in der Wurf-Tatze.
//   root.userData.hidden → true, solange er als Schwarm unterwegs ist (bats ≥ 0,98).
// kuerbis_bombe    ≈0,62 m  Kürbis-Bombe: dunkelorange Kürbis mit genieteter Eisenkappe, geschnitztem Grinsegesicht
//   (glimmt, leuchtet beim Brennen auf) und Zündschnur aus dem Stiel.
//   state { anim: 'idle'|'lit'|'carried'|'thrown'|'explode', fuse (0..1 Rest der Zündschnur; Standard 1), speed (thrown:
//           Drehung, Standard 8), progress? (explode: 0..1 in 0,6 s) }
//         lit: Funke sprüht, Gesicht pulsiert (schneller je kürzer fuse), unter 0,3 blinkt sie rot-weiß und zittert;
//         carried: wie lit, ohne Wackeln; thrown: dreht sich vorwärts; explode: bläht sich auf, lila-oranger
//         Puff mit Sternen und Druckring (≈ Radius 1,5 m), danach unsichtbar.
// fledermaus_schwarm  Schwarm kleiner Lila-Fledermäuse um den Ursprung (Mitte des Schwarms), der Anführer (größer) trägt
//   den Zylinder des Grafen.
//   opts  { count (12, höchstens 40), spread (Radius in m, 2), leader: true }
//   state { anim: 'fly'|'gather'|'scatter', count? (sichtbare Zahl ≤ opts.count), spread? (überschreibt opts.spread),
//           progress? (scatter: 0..1 in 1,2 s) }
//         fly: wirbelnder Schwarm (Kugelschale mit Radius spread); gather: eng zusammen (≈ 0,35·spread);
//         scatter: fliegen in alle Richtungen nach oben davon und werden kleiner (danach unsichtbar).

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, makeModel, Clock, Blinker, damp, clamp, mix, smoothstep,
  instMesh, dizzyStars, placed, glowSprite, puffyStarGeo,
} from '../lib/kit.js';
import { Puffs, stick } from '../lib/kit_w3.js';
import {
  HW, PK_COLORS, pkPoint, pkSurf, pumpkinGeo, stemGeo, leafGeo, addFace, glow, ownMat, puffyGeo, ellSurf, hash1,
  batWingGeo, memo, add,
} from '../lib/hwGeos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const prog = (st, clk, dur) => (st.progress !== undefined ? clamp(Number(st.progress) || 0, 0, 1) : clamp(clk.age / dur, 0, 1));

// =============================================================================================
// Kürbis-Bombe
// =============================================================================================
const KBB_P = { R: 0.31, Hh: 0.25, ribs: 8, depth: 0.12, dimple: 0.2, bottom: 0.86 };
const KBB_CY = KBB_P.Hh * KBB_P.bottom - 0.01;
const KBB_COL = [0xf0701a, 0xffa040, 0xb8480a, 0x8a3008];
function bombGeos() {
  return memo('hw:kbb:geos', () => {
    const b = new Build(), gl = new Build();
    b.parts.push(pumpkinGeo(KBB_P, KBB_COL));
    const surf = pkSurf(KBB_P);
    addFace(b, gl, surf, { kind: 'grinsen', az: 0, el: 0.02, w: 0.5, h: 0.38 });
    // Metallkappe oben mit Nietenkranz (Zündschnur-Halter)
    const top = surf(0, 1.35).p.y;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.014, 0xd8d4e8, { p: [Math.cos(a) * 0.09, top + 0.0, Math.sin(a) * 0.09] }, 8, 6); }
    b.cyl(0.07, 0.085, 0.06, { v: (x, y, z, nx, ny) => mix(0x4a4460, 0xa8a4c8, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, top + 0.01, 0] }, 16);
    b.torus(0.075, 0.014, 0xc8c4d8, { p: [0, top + 0.04, 0], r: [Math.PI / 2, 0, 0] }, 6, 16);
    const body = b.geometry(), face = gl.geometry();
    body.translate(0, KBB_CY, 0); face.translate(0, KBB_CY, 0);
    return { body, face, top: top + KBB_CY + 0.05 };
  });
}
/** Zündschnur: gedrehte Schnur (Fuß im Ursprung, Länge 1 entlang einer Kurve nach oben-hinten; skaliert = Restlänge). */
const fuseGeo = () => cached('hw:kbb:fuse', () => {
  const b = new Build();
  b.tube([[0, 0, 0], [0.0, 0.06, 0], [-0.03, 0.12, 0.01], [-0.08, 0.15, 0.02], [-0.12, 0.13, 0.02]], 0.017, (x, y) => (Math.floor((x - y) * 70) % 2 ? 0xe8c88a : 0x8a6034), null, 24, 6);
  return b.geometry();
});
const FUSE_TIP = new THREE.Vector3(-0.12, 0.13, 0.02);
const sparkGeo = () => cached('hw:kbb:spark', () => {
  const b = new Build();
  b.add(puffyStarGeo(0.06, 0.024, 0.024, 0.01, 6), 0xfff6a0, {});
  b.add(puffyStarGeo(0.045, 0.018, 0.018, 0.008, 6), 0xff8a2a, { r: [0, Math.PI / 2, 0.4] });
  return b.geometry();
});
const burstStarGeo = () => cached('hw:kbb:star', () => new Build().add(puffyStarGeo(0.12, 0.055, 0.05, 0.03), { v: (x, y) => mix(0xffb020, 0xfff2a0, smoothstep(y / 0.12 + 0.5)) }, {}).geometry());
const ringGeo = () => cached('hw:kbb:ring', () => { const g = new THREE.TorusGeometry(1, 0.08, 6, 40); g.rotateX(Math.PI / 2); return g; });

function buildKuerbisBombe() {
  const G = bombGeos();
  const root = new THREE.Group();
  const own = [];
  const bodyMat = ownMat(vcol(0.3), { emissive: new THREE.Color(0, 0, 0) });
  const faceMat = ownMat(glow(), { color: new THREE.Color(1, 1, 1) });
  const ringMat = ownMat(add('kbbRing', 0xffc860, 0.8));
  own.push(bodyMat, faceMat, ringMat);
  const spin = joint([0, KBB_CY, 0]);
  const inner = joint([0, -KBB_CY, 0]);
  const body = mesh(G.body, bodyMat, {}, true);
  const face = mesh(G.face, faceMat);
  const fuseJ = joint([0, G.top, 0], mesh(fuseGeo(), vcol(0.6), {}, true));
  const spark = mesh(sparkGeo(), basic('hwSpark', { vertexColors: true, toneMapped: false }), { p: FUSE_TIP.toArray() });
  const sparkGlow = glowSprite(0xffb030, 0.4, 0.85); sparkGlow.position.copy(FUSE_TIP);
  fuseJ.add(spark, sparkGlow);
  inner.add(body, face, fuseJ);
  spin.add(inner);
  const puffs = new Puffs(10, 0xb07aff, { opacity: 0.9, radius: 3, cy: 0.5 });
  own.push(puffs);
  const stars = instMesh(burstStarGeo(), vcol(0.3, { emissive: 0x6a4000 }, 'hwStarGlow'), 8, 3, 0.5);
  const ring = mesh(ringGeo(), ringMat, { p: [0, 0.15, 0] });
  root.add(spin, puffs.mesh, stars, ring);
  const clk = new Clock();
  let roll = 0, boom = false;
  const dirs = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + 0.2, up: 2.2 + hash1(i) * 1.5, out: 2.2 + hash1(i * 3) }));
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'lit', 'carried', 'thrown', 'explode'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const fuse = clamp(st.fuse ?? 1, 0, 1);
    const burning = anim === 'lit' || anim === 'carried' || anim === 'thrown';
    // Zündschnur kürzer, Funke an der Spitze
    fuseJ.scale.setScalar(0.25 + fuse * 0.75);
    spark.visible = sparkGlow.visible = burning;
    if (burning) { spark.rotation.set(t * 9, t * 7, 0); spark.scale.setScalar(0.8 + Math.abs(Math.sin(t * 31)) * 0.6); }
    // Gesicht glimmt; beim Brennen pulsiert es schneller, kurz vor Schluss Rot-Weiß-Blinken
    const rate = burning ? 4 + (1 - fuse) * 14 : 1.5;
    const pulse = 0.5 + 0.5 * Math.sin(t * rate * TAU * 0.5);
    faceMat.color.setScalar(burning ? 0.85 + pulse * 0.4 : 0.6 + Math.sin(t * 3) * 0.05);
    const warn = burning && fuse < 0.3 && Math.sin(t * 40) > 0;
    bodyMat.emissive.setRGB(warn ? 0.7 : burning ? pulse * 0.18 : 0, warn ? 0.15 : burning ? pulse * 0.06 : 0, warn ? 0.1 : 0);
    // Haltung
    let sx = 1, sy = 1, wob = 0;
    if (anim === 'idle') { wob = Math.sin(t * 2.2) * 0.06; sy = 1 + Math.sin(t * 4.4) * 0.015; }
    if (anim === 'lit') { wob = Math.sin(t * (fuse < 0.3 ? 30 : 9)) * (fuse < 0.3 ? 0.08 : 0.05); sy = 1 + pulse * 0.04 * (1 - fuse); sx = 1 + pulse * 0.03 * (1 - fuse); }
    if (anim === 'thrown') roll -= dt * (st.speed ?? 8); else roll = damp(roll, 0, 10, dt);
    spin.rotation.set(wob * 0.5, 0, roll + wob);
    // Explosion
    const ex = anim === 'explode';
    const p = ex ? prog(st, clk, 0.6) : 0;
    if (ex && !boom) puffs.burst([0, 0.35, 0], { count: 10, speed: 2.4, up: 1.2, size: 0.35, life: 0.6, spread: 0.3 });
    boom = ex;
    const inflate = ex ? 1 + smoothstep(p / 0.25) * 0.35 : 1;
    spin.scale.set(sx * inflate, sy * inflate, sx * inflate);
    spin.visible = !ex || p < 0.25;
    if (ex && p < 0.25) bodyMat.emissive.setRGB(0.8 * p * 4, 0.4 * p * 4, 0.1);
    const after = ex && p >= 0.2;
    stars.visible = after && p < 1;
    ring.visible = after && p < 0.85;
    if (after) {
      const q = (p - 0.2) / 0.8, tt = q * 0.6;
      for (let i = 0; i < 8; i++) {
        const d = dirs[i];
        _v.set(Math.cos(d.a) * d.out * tt, 0.35 + d.up * tt - 4 * tt * tt, Math.sin(d.a) * d.out * tt);
        stars.setMatrixAt(i, _m.compose(_v, _q.setFromEuler(_e.set(0, d.a + q * 6, 0)), _s.setScalar(1 - smoothstep((q - 0.6) / 0.4))));
      }
      stars.instanceMatrix.needsUpdate = true;
      ring.scale.setScalar(0.3 + smoothstep(q / 0.7) * 1.3);
      ringMat.opacity = 0.85 * (1 - smoothstep(q / 0.8));
    }
    puffs.step(dt);
  };
  return makeModel('kuerbis_bombe', root, update, [...own, stars], { initial: 'idle' });
}

// =============================================================================================
// Fledermaus-Schwarm
// =============================================================================================
const BAT = { fur: 0x6a3ac8, furHi: 0xa47aff, furLow: 0x3a1a7a, ear: 0xff9ac8 };
/** kleine Fledermaus (Körper Ø 0,18 m, Mitte im Ursprung, Blick +X) mit eingebauten Augen. */
const smallBatGeo = () => cached('hw:bat:small', () => {
  const b = new Build();
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(BAT.furLow, BAT.fur, smoothstep(ny * 0.6 + 0.55)) }, { s: [0.095, 0.09, 0.09] }, 16, 10);
  for (const s of [1, -1]) {
    b.cone(0.035, 0.09, BAT.fur, { p: [-0.01, 0.1, s * 0.045], r: [s * 0.35, 0, 0] }, 8);
    b.sphere(1, 0xffffff, { p: [0.072, 0.02, s * 0.035], s: [0.025, 0.032, 0.026] }, 10, 8);
    b.sphere(1, 0x1a0a20, { p: [0.09, 0.018, s * 0.035], s: [0.012, 0.02, 0.016] }, 8, 6);
    b.sphere(0.006, 0xffffff, { p: [0.1, 0.03, s * 0.03] }, 6, 4);
    b.cone(0.007, 0.02, 0xffffff, { p: [0.088, -0.045, s * 0.015], r: [Math.PI, 0, 0] }, 4);
  }
  return b.geometry();
});
const smallWingGeo = () => batWingGeo(0.24, BAT.fur, BAT.furLow, true, 'small');
/** Mini-Zylinder des Grafen (für den Anführer), Ursprung = Krempe unten. */
const miniHatGeo = () => cached('hw:bat:hat', () => {
  const b = new Build();
  b.cyl(0.075, 0.075, 0.012, 0x1e1a26, {}, 16);
  b.cyl(0.045, 0.042, 0.1, 0x1e1a26, { p: [0, 0.055, 0] }, 16);
  b.cyl(0.046, 0.046, 0.022, 0xe0262a, { p: [0, 0.02, 0] }, 16);
  return b.geometry();
});
/** Schwarm-Fledermäuse in drei InstancedMeshes: Körper (n), Flügel (2n), optional Hut des Anführers. */
class BatFlock {
  constructor(n, radius = 4) {
    this.n = n;
    this.bodies = instMesh(smallBatGeo(), vcol(0.42), n, radius, 0);
    this.wings = instMesh(smallWingGeo(), vcol(0.45, { side: THREE.DoubleSide }, 'hwwing'), n * 2, radius, 0);
    this.bodies.castShadow = this.wings.castShadow = true;
    for (let i = 0; i < n; i++) { this.bodies.setMatrixAt(i, ZERO); this.wings.setMatrixAt(i * 2, ZERO); this.wings.setMatrixAt(i * 2 + 1, ZERO); }
  }
  /** Fledermaus i an p (Vector3) mit Gier yaw, Flügelphase ph, Größe sc (0 = aus). */
  set(i, p, yaw, ph, sc, bank = 0) {
    if (sc <= 0.001) { this.bodies.setMatrixAt(i, ZERO); this.wings.setMatrixAt(i * 2, ZERO); this.wings.setMatrixAt(i * 2 + 1, ZERO); return; }
    _q.setFromEuler(_e.set(bank, yaw, 0, 'YXZ'));
    _m.compose(p, _q, _s.setScalar(sc));
    this.bodies.setMatrixAt(i, _m);
    const flap = Math.sin(ph) * 0.9;
    for (let k = 0; k < 2; k++) {
      const s = k ? 1 : -1;
      // Flügel: Ansatz an der Seite, Spannweite seitlich (±Z), Schlag um die Längsachse
      const wq = new THREE.Quaternion().setFromEuler(_e.set(s * flap, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0, 'YXZ'));
      const w = new THREE.Matrix4().compose(_v.set(0, 0.01, s * 0.05), wq, _s.set(1, 1, 1));
      this.wings.setMatrixAt(i * 2 + k, new THREE.Matrix4().multiplyMatrices(_m, w));
    }
  }
  flush() { this.bodies.instanceMatrix.needsUpdate = true; this.wings.instanceMatrix.needsUpdate = true; }
}
function buildFledermausSchwarm(opts = {}) {
  const n = clamp(Math.round(opts.count ?? 12), 1, 40);
  const spread0 = Math.max(0.3, Number(opts.spread ?? 2));
  const leader = opts.leader !== false;
  const root = new THREE.Group();
  const flock = new BatFlock(n, spread0 * 2.5 + 3);
  const hat = mesh(miniHatGeo(), vcol(0.35), {}, true);
  hat.visible = leader;
  root.add(flock.bodies, flock.wings, hat);
  const bats = Array.from({ length: n }, (_, i) => ({
    a: (i / n) * TAU, b: hash1(i * 2.3) * TAU, sp: 0.7 + hash1(i * 4.1) * 0.6, dir: hash1(i * 7.7) > 0.3 ? 1 : -1,
    tilt: (hash1(i * 9.1) - 0.5) * 1.2, r: 0.75 + hash1(i * 5.3) * 0.35, fl: 9 + hash1(i * 3.7) * 5, p: new THREE.Vector3(), up: 0.8 + hash1(i) * 0.8,
  }));
  const clk = new Clock();
  let spread = spread0, gatherK = 0;
  const pos = new THREE.Vector3(), nxt = new THREE.Vector3();
  const update = (dt, st) => {
    let anim = st.anim ?? 'fly';
    if (!['fly', 'gather', 'scatter'].includes(anim)) anim = 'fly';
    clk.tick(dt, anim);
    const t = clk.t;
    const vis = clamp(Math.round(st.count ?? n), 0, n);
    spread = damp(spread, Number(st.spread ?? spread0), 4, dt);
    gatherK = damp(gatherK, anim === 'gather' ? 1 : 0, 5, dt);
    const sc = anim === 'scatter' ? prog(st, clk, 1.2) : 0;
    const R = spread * (1 - gatherK * 0.65);
    const orbit = (it, tt, out) => {
      const a = it.a + tt * it.sp * it.dir * (1.2 + gatherK);
      const b = it.b + tt * it.sp * 0.7;
      out.set(Math.cos(a) * R * it.r, Math.sin(b) * R * 0.35 + Math.sin(a * 2 + it.tilt) * R * 0.15, Math.sin(a) * R * it.r);
      out.applyAxisAngle(_v.set(1, 0, 0), it.tilt * 0.4);
      return out;
    };
    for (let i = 0; i < n; i++) {
      const it = bats[i];
      if (i >= vis) { flock.set(i, pos, 0, 0, 0); continue; }
      orbit(it, t, pos); orbit(it, t + 0.05, nxt);
      if (sc > 0) { pos.addScaledVector(_v.copy(pos).setY(0).normalize(), sc * 6 * it.r); pos.y += sc * sc * 5 * it.up; }
      const dx = nxt.x - pos.x, dz = nxt.z - pos.z;
      const yaw = Math.atan2(-dz, dx);
      const size = (i === 0 && leader ? 1.6 : 1) * (1 - smoothstep((sc - 0.6) / 0.4));
      flock.set(i, pos, yaw, t * it.fl + i, size, -it.dir * 0.3);
      if (i === 0) {
        hat.visible = leader && size > 0.01;
        hat.position.copy(pos).add(_v.set(0, 0.1 * size, 0));
        hat.rotation.set(0.15, yaw, -0.2);
        hat.scale.setScalar(size);
      }
    }
    flock.flush();
  };
  return makeModel('fledermaus_schwarm', root, update, [flock.bodies, flock.wings], { initial: 'fly' });
}

// =============================================================================================
// Graf Brummbär
// =============================================================================================
const GB = {
  fur: 0x8a5230, furHi: 0xb8784a, furDark: 0x5a3218, muzzle: 0xf0caa0, nose: 0x1a1210, stache: 0x2e1a0e, vest: 0x5a2a86, vestHi: 0x8a4ac0,
  shirt: 0xfff8ee, bow: 0xe0262a, button: 0xffc21a, hat: 0x1e1a26, hatHi: 0x4a4458, band: 0xe0262a, gold: 0xffc21a, glass: 0xcfefff, ink: 0x1a0e08,
  cape: 0x1c1428, capeHi: 0x4a3a66, lining: 0xd81e2a, liningHi: 0xff5a5a, shoe: 0x14101c, spat: 0xf4f0f8, fang: 0xffffff, mouth: 0x5a1020, tongue: 0xff7a9a,
};
const GB_HIP = 0.55;            // Hüfthöhe (Rumpf-Ursprung)
const GB_HC = [0.13, 1.5, 0], GB_HR = [0.45, 0.42, 0.47];   // Kopf (relativ zum Rumpf)
const furV = { v: (x, y, z, nx, ny) => mix(GB.furDark, mix(GB.fur, GB.furHi, smoothstep(ny * 0.6 + nx * 0.3 - 0.1) * 0.5), smoothstep(ny * 0.5 + 0.7)) };
/** Rumpf + Kopf + Stehkragen (Ursprung = Hüfte). */
function gbTorsoGeo() {
  return cached('hw:gb:torso', () => {
    const b = new Build();
    // Weste (violett) mit Hemdbrust-V vorn, Bauch rund
    const vestV = { v: (x, y, z, nx, ny) => {
      const front = nx > 0.2 && Math.abs(z) < 0.3 * (y - 0.2) + 0.05;
      if (front) return GB.shirt;
      if (ny > 0.8) return GB.fur;
      return mix(GB.vest, GB.vestHi, smoothstep(ny * 0.4 + nx * 0.4));
    } };
    b.sphere(1, vestV, { p: [0, 0.62, 0], s: [0.56, 0.66, 0.62] }, 40, 28);
    b.sphere(1, furV, { p: [0, 1.16, 0], s: [0.38, 0.2, 0.46] }, 22, 12);
    // Fliege und Goldknöpfe
    for (const s of [1, -1]) b.sphere(1, GB.bow, { p: [0.44, 1.1, s * 0.11], s: [0.08, 0.085, 0.13], r: [s * 0.2, 0, 0] }, 14, 10);
    b.sphere(0.055, GB.bow, { p: [0.48, 1.1, 0] }, 10, 8);
    const vs = ellSurf([0, 0.62, 0], [0.56, 0.66, 0.62]);
    for (let i = 0; i < 3; i++) stick(b, vs(0.42, -0.02 - i * 0.24), GB.button, [0.045, 0.045, 0.03], 0.3);
    // Kopf
    b.sphere(1, furV, { p: GB_HC, s: GB_HR }, 40, 28);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xd8a87a, GB.muzzle, smoothstep(ny * 0.5 + nx * 0.4 + 0.2)) }, { p: [0.5, 1.37, 0], s: [0.21, 0.18, 0.26] }, 26, 16);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(GB.nose, 0x5a4a48, smoothstep(ny * 0.7 + nx * 0.2 - 0.1)) }, { p: [0.69, 1.44, 0], s: [0.1, 0.075, 0.12] }, 18, 12);
    for (const s of [1, -1]) {
      // Ohren mit hellem Innenohr
      b.sphere(1, furV, { p: [0.0, 1.85, s * 0.37], s: [0.13, 0.15, 0.14] }, 18, 12);
      b.sphere(1, GB.muzzle, { p: [0.08, 1.85, s * 0.375], s: [0.05, 0.095, 0.095] }, 14, 10);
      // gezwirbelter Schnurrbart (Spitzen rollen sich nach oben ein)
      b.tube([[0.66, 1.34, s * 0.03], [0.69, 1.31, s * 0.16], [0.63, 1.31, s * 0.31], [0.58, 1.4, s * 0.38], [0.61, 1.47, s * 0.34], [0.65, 1.44, s * 0.3]], 0.048, GB.stache, null, 28, 10);
      b.sphere(0.038, GB.stache, { p: [0.65, 1.44, s * 0.3] }, 10, 8);
      // Wangenrot
      stick(b, ellSurf(GB_HC, GB_HR)(s * 0.62, -0.18), 0xff8a8a, [0.07, 0.045, 0.02], 0.3);
    }
    // Brauen: links keck hochgezogen, rechts (Monokel-Seite) tiefer
    b.box(0.08, 0.06, 0.25, GB.ink, { p: [0.52, 1.74, 0.18], r: [-0.45, -0.3, 0.1], order: 'YXZ' }, 0.028, 2);
    b.box(0.08, 0.06, 0.25, GB.ink, { p: [0.53, 1.69, -0.18], r: [-0.15, 0.3, 0], order: 'YXZ' }, 0.028, 2);
    // Mund: verschmitztes Lächeln, Zunge, zwei Plastik-Vampirzähnchen
    b.torus(0.085, 0.018, GB.mouth, { p: [0.63, 1.25, 0], r: [0, Math.PI / 2, Math.PI * 0.05] }, 6, 16, Math.PI);
    b.sphere(1, GB.tongue, { p: [0.64, 1.205, 0.02], s: [0.025, 0.02, 0.04] }, 10, 6);
    for (const s of [1, -1]) b.cone(0.022, 0.07, GB.fang, { p: [0.665, 1.225, s * 0.055], r: [Math.PI, 0, s * 0.08] }, 10);
    // Stehkragen: hoch, spitz, außen schwarz, innen rot (zwei Lagen), hinten um den Hals
    const collar = (inner) => {
      const pts = [[0.42, 1.04], [0.46, 1.18], [0.56, 1.36], [0.66, 1.56], [0.7, 1.66]];
      const pp = inner ? pts.map(([r, y]) => [r - 0.025, y]).reverse() : pts;
      const g = new THREE.LatheGeometry(pp.map(([r, y]) => new THREE.Vector2(r, y)), 24, Math.PI / 2 + 0.95, TAU - 1.9);
      // Zacken oben
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > 1.6) { const a = Math.atan2(P.getX(i), P.getZ(i)); P.setY(i, y + Math.max(0, Math.cos(a * 4)) * 0.12); } }
      g.computeVertexNormals();
      return g;
    };
    b.add(collar(false), { v: (x, y) => mix(GB.cape, GB.capeHi, smoothstep((y - 1.2) / 0.5) * 0.5) }, { p: [-0.06, 0, 0] });
    b.add(collar(true), { v: (x, y) => mix(GB.lining, GB.liningHi, smoothstep((y - 1.1) / 0.6)) }, { p: [-0.06, 0, 0] });
    // Goldkette mit Medaillon (Fledermaus) unter dem Kragen
    b.tube([[0.25, 1.08, 0.38], [0.42, 1.0, 0.18], [0.47, 0.97, 0], [0.42, 1.0, -0.18], [0.25, 1.08, -0.38]], 0.018, GB.gold, null, 24, 6);
    b.cyl(0.07, 0.07, 0.025, GB.gold, { p: [0.5, 0.93, 0], r: [0, 0, Math.PI / 2 - 0.2] }, 20);
    b.cyl(0.05, 0.05, 0.01, GB.bow, { p: [0.513, 0.935, 0], r: [0, 0, Math.PI / 2 - 0.2] }, 16);
    return b.geometry();
  });
}
/** Monokel (Goldring + Glas) mit Kette; Ursprung = Ringmitte, Ring in der YZ-Ebene. */
const gbMonocleGeo = () => cached('hw:gb:monocle', () => {
  const b = new Build();
  b.torus(0.11, 0.02, GB.gold, { r: [0, Math.PI / 2, 0] }, 8, 26);
  b.cyl(0.1, 0.1, 0.008, 0xd8f4ff, { r: [0, 0, Math.PI / 2] }, 22);
  b.sphere(0.022, GB.gold, { p: [0, -0.125, 0.0] }, 8, 6);
  return b.geometry();
});
/** Zylinder mit rotem Band und goldener Fledermaus-Spange; Ursprung = Krempe unten. */
const gbHatGeo = () => cached('hw:gb:hat', () => {
  const b = new Build();
  const hatV = { v: (x, y, z, nx, ny) => mix(GB.hat, GB.hatHi, smoothstep(nx * 0.4 + ny * 0.3) * 0.6) };
  b.cyl(0.5, 0.5, 0.035, hatV, { p: [0, 0.02, 0], s: [1, 1, 0.92] }, 36);
  b.torus(0.5, 0.028, GB.hat, { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] }, 8, 40);
  b.cyl(0.31, 0.29, 0.62, hatV, { p: [0, 0.35, 0] }, 32);
  b.cyl(0.32, 0.32, 0.03, GB.hatHi, { p: [0, 0.665, 0] }, 32);
  b.cyl(0.3, 0.3, 0.11, GB.band, { p: [0, 0.11, 0], s: [1.03, 1, 1.03] }, 32);
  // Fledermaus-Spange vorn
  const w = new THREE.Shape();
  w.moveTo(0, 0.25); w.quadraticCurveTo(0.35, 0.55, 1, 0.35); w.quadraticCurveTo(0.8, 0.1, 0.75, -0.1); w.quadraticCurveTo(0.6, 0.05, 0.45, -0.15); w.quadraticCurveTo(0.3, 0.0, 0, -0.25);
  w.quadraticCurveTo(-0.3, 0.0, -0.45, -0.15); w.quadraticCurveTo(-0.6, 0.05, -0.75, -0.1); w.quadraticCurveTo(-0.8, 0.1, -1, 0.35); w.quadraticCurveTo(-0.35, 0.55, 0, 0.25);
  b.add(puffyGeo(w, 0.15, 0.08, 6, 2), GB.gold, { p: [0.315, 0.11, 0], r: [0, Math.PI / 2, 0], s: 0.1 });
  return b.geometry();
});
/** Arm (Ursprung = Schulter, hängt nach −Y): violetter Ärmel, Rüschen-Manschette, Tatze mit Ballen. */
const gbArmGeo = () => cached('hw:gb:arm', () => {
  const b = new Build();
  b.capsule(0.15, 0.36, { v: (x, y, z, nx, ny) => mix(GB.vest, GB.vestHi, smoothstep(nx * 0.4 + 0.3)) }, { p: [0, -0.22, 0] }, 4, 16);
  b.torus(0.14, 0.04, GB.shirt, { p: [0, -0.48, 0], r: [Math.PI / 2, 0, 0] }, 8, 18);
  b.sphere(0.18, furV, { p: [0.02, -0.62, 0] }, 22, 16);
  b.sphere(1, GB.muzzle, { p: [0.13, -0.66, 0], s: [0.07, 0.09, 0.11] }, 14, 10);
  for (let i = -1; i <= 1; i++) b.sphere(0.035, GB.furDark, { p: [0.13, -0.77, i * 0.07] }, 8, 6);
  return b.geometry();
});
/** Bein (Ursprung = Hüfte): Fellbein, Gamasche, Lackschuh. */
const gbLegGeo = () => cached('hw:gb:leg', () => {
  const b = new Build();
  b.capsule(0.2, 0.22, furV, { p: [0, -0.2, 0] }, 4, 16);
  b.cyl(0.17, 0.19, 0.14, GB.spat, { p: [0.0, -0.42, 0] }, 18);
  b.sphere(1, { v: (x, y, z, nx, ny) => mix(GB.shoe, 0x5a5468, smoothstep(ny * 0.7 + nx * 0.2 - 0.1)) }, { p: [0.09, -0.48, 0], s: [0.27, 0.1, 0.19] }, 22, 12);
  b.cyl(0.2, 0.22, 0.03, 0x2a2430, { p: [0.08, -0.535, 0], s: [1.3, 1, 0.9] }, 18);
  return b.geometry();
});
/** Umhang: zwei Lagen (außen schwarz, innen rot), hinten offen nach vorn; indiziert, damit er per Ecke wehen kann. */
function capeGeo() {
  const seg = 28, prof = [[0.98, -0.32], [0.9, 0.0], [0.8, 0.35], [0.7, 0.7], [0.62, 0.95], [0.55, 1.12]];
  const make = (inner) => {
    const pp = inner ? prof.map(([r, y]) => [r - 0.03, y]).reverse() : prof;
    return new THREE.LatheGeometry(pp.map(([r, y]) => new THREE.Vector2(r, y)), seg, Math.PI / 2 + 0.75, TAU - 1.5);
  };
  const a = make(false), c = make(true);
  const paint = (g, lo, hi) => {
    const P = g.attributes.position, arr = new Float32Array(P.count * 3), cl = new THREE.Color(), ch = new THREE.Color(lo), ch2 = new THREE.Color(hi);
    for (let i = 0; i < P.count; i++) { cl.copy(ch).lerp(ch2, smoothstep((P.getY(i) + 0.3) / 1.4) * 0.6); arr[i * 3] = cl.r; arr[i * 3 + 1] = cl.g; arr[i * 3 + 2] = cl.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
  };
  paint(a, GB.cape, GB.capeHi); paint(c, GB.lining, GB.liningHi);
  const idx = [], pos = [], colA = [];
  let off = 0;
  for (const g of [a, c]) {
    const P = g.attributes.position.array, C = g.attributes.color.array, I = g.index.array;
    for (let i = 0; i < P.length; i++) { pos.push(P[i]); colA.push(C[i]); }
    for (let i = 0; i < I.length; i++) idx.push(I[i] + off);
    off += g.attributes.position.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const GB_EYES = [1, -1].map((s) => { const h = ellSurf(GB_HC, GB_HR)(s * 0.36, 0.13); return { p: h.p.toArray(), r: 0.092, sy: 1.15, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.35).toArray() }; });
const MONO_EYE = new THREE.Vector3(GB_EYES[1].p[0] + 0.035, GB_EYES[1].p[1], GB_EYES[1].p[2]);   // rechtes Auge (−Z)

function buildGrafBrummbaer() {
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.42), { emissive: new THREE.Color(0, 0, 0) });
  own.push(flash);
  const all = joint();                     // Verwandlung (Schrumpfen) und Hinsetzen
  const hip = joint([0, GB_HIP, 0]);
  const body = joint();
  const torso = mesh(gbTorsoGeo(), flash, {}, true);
  const eye = eyes(GB_EYES, { key: 'hw:gb', iris: 0x8a2a14, pupil: 0.55, depth: 0.5 });
  const hatJ = joint([0.08, 1.86, 0]);
  const hat = mesh(gbHatGeo(), vcol(0.3), {}, true);
  hatJ.add(hat);
  const mono = mesh(gbMonocleGeo(), metalMat(), {}, false);
  // Arme (Instanzen) über zwei Gelenke; Bombe hängt am rechten
  const arms = instMesh(gbArmGeo(), flash, 2, 3, 1);
  arms.castShadow = true;
  const shL = joint([0.02, 1.08, 0.58]), shR = joint([0.02, 1.08, -0.58]);
  const pawR = joint([0.06, -0.85, 0]);
  shR.add(pawR);
  const bomb = mesh(bombGeos().body, vcol(0.3), { p: [0, -KBB_CY, 0], s: 0.9 });
  const bombFace = mesh(bombGeos().face, glow(), { p: [0, -KBB_CY, 0], s: 0.9 });
  const bombJ = joint([0, 0, 0], bomb, bombFace);
  pawR.add(bombJ);
  // Umhang (eigene Geometrie, weht)
  const capeG = capeGeo(); own.push(capeG);
  const cape = mesh(capeG, vcol(0.55, {}, 'hwcape'), { p: [-0.06, 0, 0] }, true);
  const base = capeG.attributes.position.array.slice();
  const dizzy = dizzyStars(0.6, 0.13); dizzy.position.set(0.1, 2.2, 0);
  body.add(torso, eye, hatJ, mono, arms, shL, shR, cape, dizzy);
  hip.add(body);
  const legs = instMesh(gbLegGeo(), flash, 2, 2, 0.3);
  legs.castShadow = true;
  all.add(hip, legs);
  const puffs = new Puffs(12, 0x9a6ae8, { opacity: 0.9, radius: 4, cy: 1.5 });
  own.push(puffs);
  const flock = new BatFlock(8, 6);
  root.add(all, puffs.mesh, flock.bodies, flock.wings);
  const clk = new Clock(), blink = new Blinker();
  let slump = 0, hatPop = 0, wrap = 0, puffed = false, monoK = 0, dent = 0, dz = 0;
  const hatHome = new THREE.Vector3(0.08, 1.86, 0);
  const bat0 = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + hash1(i) * 0.4, up: 1.2 + hash1(i * 3) * 1.2, out: 1 + hash1(i * 7) * 1.4, fl: 10 + hash1(i * 5) * 6 }));
  const tmpQ = new THREE.Quaternion();
  const setArm = (i, j) => { j.updateMatrix(); arms.setMatrixAt(i, j.matrix); };
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!['idle', 'walk', 'throw', 'hit', 'stunned', 'bats', 'defeated'].includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const hp = clamp(Math.round(st.hp ?? 3), 0, 3);
    const defeated = anim === 'defeated';
    const walk = anim === 'walk';
    const speed = st.speed ?? 1.6;
    // Beine und Körper
    const ph = t * (2.4 + speed * 0.9);
    const sw = walk ? Math.sin(ph) * 0.45 : 0;
    const bob = walk ? Math.abs(Math.cos(ph)) * 0.06 : Math.sin(t * 1.8) * 0.012;
    slump = damp(slump, defeated ? 1 : 0, 3, dt);
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      const sit = slump;
      _q.setFromEuler(_e.set(0, 0, (i ? -sw : sw) + sit * 1.45, 'XYZ'));
      legs.setMatrixAt(i, _m.compose(_v.set(-sit * 0.05, GB_HIP + bob - sit * 0.45, s * 0.27), _q, _s.setScalar(1)));
    }
    legs.instanceMatrix.needsUpdate = true;
    hip.position.y = GB_HIP + bob - slump * 0.45;
    const hitAge = anim === 'hit' ? prog(st, clk, 0.6) * 0.6 : 1;
    body.rotation.z = slump * -0.25 + (anim === 'hit' ? Math.max(0, 0.4 - hitAge) * 0.8 : 0) + (walk ? -0.05 : 0);
    body.rotation.x = anim === 'stunned' ? Math.sin(t * 4) * 0.12 : walk ? Math.sin(ph) * 0.05 : Math.sin(t * 1.1) * 0.02;
    body.rotation.y = walk ? Math.sin(ph) * 0.06 : 0;
    // Arme
    let rz = 0.25, lz = 0.25, rx = -0.25, lx = 0.25;
    let bombOn = false;
    if (anim === 'throw') {
      const p = prog(st, clk, 1.0);
      if (p < 0.45) { const k = smoothstep(p / 0.45); rz = 0.25 + k * 2.6; rx = -0.25 - k * 0.35; bombOn = true; }
      else if (p < 0.6) { const k = smoothstep((p - 0.45) / 0.15); rz = 2.85 - k * 4.2; rx = -0.6 + k * 0.3; bombOn = p < 0.5; }
      else { const k = smoothstep((p - 0.6) / 0.4); rz = -1.35 + k * 1.6; rx = -0.3 + k * 0.05; }
      lz = 0.6; lx = 0.4;
    } else if (anim === 'hit') { rz = -0.6; lz = -0.6; rx = -1.2; lx = 1.2; }
    else if (anim === 'stunned') { rz = 0.3 + Math.sin(t * 5) * 0.3; lz = 0.3 + Math.cos(t * 5) * 0.3; rx = -0.6; lx = 0.6; }
    else if (defeated) { rz = 0.1; lz = 0.1; rx = -0.5; lx = 0.5; }
    else if (walk) { rz = -sw * 0.8 + 0.2; lz = sw * 0.8 + 0.2; }
    else { // idle: rechte Tatze zwirbelt am Bart, linke in die Hüfte
      rz = -1.9 + Math.sin(t * 3) * 0.12; rx = 0.25; lz = 0.35; lx = 0.6;
    }
    // hp ≤ 1: besorgte Haltung, Tatzen höher
    shR.rotation.set(damp(shR.rotation.x, rx, 12, dt), 0, damp(shR.rotation.z, rz, anim === 'throw' ? 30 : 10, dt));
    shL.rotation.set(damp(shL.rotation.x, lx, 12, dt), 0, damp(shL.rotation.z, lz, 10, dt));
    setArm(0, shL); setArm(1, shR);
    arms.instanceMatrix.needsUpdate = true;
    bombJ.visible = bombOn;
    // Zylinder: fliegt bei Treffer hoch; bei Niederlage und hp ≤ 1 schief und verbeult
    dent = damp(dent, hp <= 1 || defeated ? 1 : 0, 6, dt);
    hatPop = anim === 'hit' ? clamp(hitAge / 0.6, 0, 1) : 0;
    const hy = anim === 'hit' ? Math.sin(hatPop * Math.PI) * 1.0 : 0;
    hatJ.position.set(hatHome.x - slump * 0.1, hatHome.y + hy - dent * 0.06, hatHome.z + slump * 0.15 + dent * 0.05);
    hatJ.rotation.set(0.06 + dent * 0.3, anim === 'hit' ? hatPop * TAU : 0, -0.12 - dent * 0.25 - slump * 0.2);
    hat.scale.set(1 + dent * 0.06, 1 - dent * 0.16, 1 + dent * 0.04);
    // Monokel: im Auge bzw. baumelnd an der Kette (hp ≤ 2)
    monoK = damp(monoK, hp <= 2 || defeated ? 1 : 0, 5, dt);
    dz = damp(dz, Math.sin(t * 3.1) * 0.35, 4, dt);
    mono.position.set(MONO_EYE.x + monoK * 0.05, MONO_EYE.y - monoK * 0.42, MONO_EYE.z - monoK * 0.05);
    mono.rotation.set(monoK * dz, 0, monoK * 0.3);
    // Umhang weht (Ecken-Animation): unten mehr, beim Gehen nach hinten, beim Verwandeln eingewickelt
    const bp = anim === 'bats' ? prog(st, clk, 0.9) : 0;
    wrap = anim === 'bats' ? smoothstep(bp / 0.4) : damp(wrap, 0, 6, dt);
    const P = capeG.attributes.position, A = P.array;
    const wind = walk ? 0.22 : 0.08;
    for (let i = 0; i < P.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const low = clamp((1.12 - y) / 1.44, 0, 1);
      const a = Math.atan2(z, x);
      const w = Math.sin(t * (walk ? 6 : 2.2) + a * 2.5 + y * 2) * low * wind;
      let nx = x - low * low * (walk ? 0.35 : 0.05) + w * Math.cos(a) * 0.5, nz = z + w * Math.sin(a);
      if (wrap > 0) { const k = wrap * low; nx = nx + (0.55 - nx) * k * 0.0 + Math.abs(nz) * k * 0.9 * 0.5; nz = nz * (1 - k * 0.55); }
      A[i * 3] = nx; A[i * 3 + 1] = y + (defeated ? -slump * low * 0.2 : 0); A[i * 3 + 2] = nz;
    }
    P.needsUpdate = true;
    capeG.computeVertexNormals();
    // Verwandlung: schrumpft im Rauch, Fledermäuse flattern heraus
    const vanish = smoothstep((bp - 0.35) / 0.4);
    all.scale.setScalar(Math.max(0.001, 1 - vanish));
    all.visible = vanish < 0.999;
    if (anim === 'bats' && bp > 0.35 && !puffed) { puffs.burst([0, 1.5, 0], { count: 12, speed: 2.4, up: 1, size: 0.6, life: 0.8, spread: 0.6 }); puffed = true; }
    if (anim !== 'bats' || bp < 0.3) puffed = false;
    root.userData.hidden = anim === 'bats' && bp >= 0.98;
    // Fledermäuse: bei der Verwandlung und bei der Niederlage
    const showBats = (anim === 'bats' && bp > 0.35) || (defeated && age > 0.6);
    for (let i = 0; i < 8; i++) {
      const it = bat0[i];
      if (!showBats) { flock.set(i, _v, 0, 0, 0); continue; }
      const k = anim === 'bats' ? (bp - 0.35) / 0.65 : clamp((age - 0.6 - i * 0.12) / 1.6, 0, 1);
      if (k <= 0) { flock.set(i, _v, 0, 0, 0); continue; }
      const pp = new THREE.Vector3(Math.cos(it.a) * it.out * k, 1.4 + it.up * k * 2, Math.sin(it.a) * it.out * k);
      flock.set(i, pp, -it.a + Math.PI / 2, t * it.fl, 1.4 * (1 - smoothstep((k - 0.75) / 0.25)));
    }
    flock.flush();
    puffs.step(dt);
    // Gesicht, Aufblitzen
    const hitK = anim === 'hit' ? Math.max(0, 1 - hitAge / 0.6) * (Math.sin(hitAge * 40) > 0 ? 1 : 0.25) : 0;
    flash.emissive.setRGB(hitK, hitK * 0.85, hitK * 0.8);
    let bk = blink.update(dt);
    if (anim === 'hit' || defeated) bk = 0.12; else if (anim === 'stunned') bk = 0.4; else if (anim === 'throw') bk = 0.85; else if (anim === 'bats') bk = 1 - wrap * 0.6;
    eye.userData.blink(bk);
    dizzy.visible = anim === 'stunned' || (defeated && age > 0.4);
    dizzy.rotation.y = t * 3.5;
    tmpQ.identity();
  };
  const model = makeModel('graf_brummbaer', root, update, [...own, arms, legs, flock.bodies, flock.wings], { initial: 'idle' });
  model.hand = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return bombJ.getWorldPosition(out); };
  return model;
}
function metalMat() { return vcol(0.25, { metalness: 0.5 }, 'hwmono'); }

export const MODELS = {
  graf_brummbaer: buildGrafBrummbaer,
  kuerbis_bombe: buildKuerbisBombe,
  fledermaus_schwarm: buildFledermausSchwarm,
};
