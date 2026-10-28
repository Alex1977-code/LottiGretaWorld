// Endgegner Welt 8 „Brummbär-Rummelplatz“ (8-Burg, Finale): Baron Brummbär im Krallen-Anzug, der Super-Wumm-Block auf der
// Turmspitze und das Glas mit den gefangenen Freunden. Eigene Gestaltung; grimmig-lustig, nie erschreckend.
// Baron Brummbär wie in bosses_w1/w7 (brauner Bär, schwarzer Zylinder mit rotem Band, goldenes Monokel mit Kette am rechten
// Auge (+Z), gezwirbelter Schnurrbart, rote Fliege) – hier in seinem eigenen Krallen-Anzug: violetter Overall mit
// Flieder-Ringeln, Öhrchen-Kapuze (spitz-runde Katzenöhrchen, Creme-Bündchen um das Gesicht), Tatzen-Handschuhen mit rosa
// Ballen und Elfenbein-Krallen, Ringelschweif mit Creme-Puschel, Creme-Bauchfleck und goldener Brummbär-Medaille – passend zum
// Krallen-Anzug der Heldinnen, aber in Baron-Farben. Maßstab Meter, Blick +X; state darf ein String sein; progress (0..1)
// überschreibt bei Einmal-Animationen die Zeit seit dem Zustandswechsel.
//
// baron_krallen  ≈3,2 m bis zur Hutspitze (Kopf ≈2,6 m), Ø ≈1,4 m  **Ursprung = Fußpunkt** (zwischen den Füßen).
//   opts  { clone: true|false (Standard false) – Spiegelfrucht-Doppelgänger: leicht durchsichtig, magenta leuchtend,
//           Funkeln statt Staub; sonst gleich (Zustände, Schnittstellen) }
//   state { anim: 'idle'|'walk'|'climb'|'slide'|'swipe'|'fire'|'hit'|'stunned'|'fall'|'clone'|'defeated',
//           hp (verbleibende Treffer, Standard = maxHp), maxHp (Standard 4), speed (walk: m/s, Standard 1,6; climb: m/s,
//           Standard 1 – 0 = hängt still), progress? }
//         idle: atmet, Krallen spreizen sich, Schweif schwingt, grimmiger Blick; walk: watschelt (Schrittfrequenz aus speed);
//         climb: klettert eine Wand hinauf – **Wand vor ihm bei x ≈ +0,8 m**, Tatzen greifen abwechselnd nach oben, Füße
//         stemmen sich gegen die Wand; slide: rutscht die Wand hinab (Krallen der hohen Tatze kratzen, Funken);
//         swipe: Doppel-Krallenhieb (0,7 s): ausholen (0–0,35), rechte Tatze schlägt (0,35–0,5), linke (0,55–0,7),
//         drei leuchtende Kratz-Spuren – Treffer im Motor bei progress 0,42 und 0,62 an model.hand(…);
//         fire: holt Luft (0–0,4, plustert sich), speit bei progress 0,45 (Feuerkugel an model.mouth() erzeugen),
//         Flammenstoß bis 0,75 (0,8 s); hit: zurückgeworfen, Zylinder fliegt hoch, Augen zu, Aufblitzen (0,6 s);
//         stunned: Schwindelsterne, schwankt; fall: stürzt (Arme und Beine rudern, Maul auf, Hut hebt ab – der Motor bewegt
//         root); clone: Spiegelfrucht-Zauber – dreht sich einmal (0–0,6 s) in einer Funkelwolke, reißt die Tatzen hoch und
//         lacht (der Motor stellt die Doppelgänger auf); defeated: plumpst auf den Hosenboden, Zylinder schief,
//         Schwindelsterne, Schweif schlaff.
//         hp ≤ maxHp/2: Rußflecken, Flicken mit Kreuzstichen auf dem Bauch; hp ≤ 1: dazu ein abgeknicktes Kapuzen-Öhrchen,
//         Sprung im Monokel, zerzauste Fellbüschel.
//   model.hand(out?, side = 'rechts'|'links') → Weltposition der Tatze (Krallenhieb).  model.mouth(out?) → Weltposition vor
//   dem Maul (Feuerkugel).  root.userData.radius → Körperradius (0,75 m), userData.top → Hutspitze (≈3,2 m),
//   userData.wallX → Wandabstand beim Klettern (0,8 m).
// super_pow_block  Kante size (5 m)  Super-Wumm-Block: riesiger violettblauer Wumm-Block (wie pow_block, eigene Gestaltung)
//   mit goldenen Kantenschienen und Nieten, auf jeder Seite ein großer Knallstern, oben eine Goldplatte mit Stern-Rosette
//   und vier Trefferlampen an den oberen Ecken (leuchten gelb für jeden verbleibenden Treffer). **Ursprung = Mitte der
//   Unterseite**; Oberseite y = size · (1 − 0,16 · hits).
//   opts  { size (Kante, 5) }
//   state { hits (0..4, Standard 0: Treffer bisher – je Treffer niedriger, mehr Risse, eine Lampe aus; 4 = verbraucht:
//           flach, rissig, grau-violett), squash (0..1, überschreibt: momentanes Stauchen beim Anstoßen),
//           anim: 'idle'|'hit', progress? (hit 0..1 in 0,7 s: staucht, blitzt, Druckwelle und Staub am Boden) }
//   root.userData.top → aktuelle Höhe der Oberseite (mit Stauchung).  model.topAt(hits) → Ruhehöhe der Oberseite.
// freunde_glas  ≈2,4 m (size), Ø ≈2 m  großes Einmachglas mit Korkdeckel, Goldrand, Schnur und rotem Wachssiegel mit
//   Brummbär-Wappen; darin die gefangenen Freunde als kleine Figuren aus den vorhandenen Modellen (bunny_small: Krümel
//   karamell, Flocke schneeweiß, Hoppel silbergrau; fairy_spotter: der Fernglas-Kobold). **Ursprung = Mitte der Unterseite.**
//   opts  { size (Höhe bis Korkoberkante, 2,4), friends (Liste aus 'kruemel'|'flocke'|'hoppel'|'kobold', Standard alle vier) }
//   state { anim: 'idle'|'shake'|'cheer', shake (0..1: Glas wackelt, Freunde purzeln aufgeregt), break (0..1: Glas zerspringt –
//           Splitter fliegen, der Korken ploppt hoch und landet daneben; ab 1 stehen die Freunde frei), cheer (bool | 0..1:
//           Freunde hüpfen jubelnd, Funkeln) }
//         idle: Freunde wippen, schauen sich um, klopfen an die Scheibe.
//   model.friend(i, out?) → Weltposition des i-ten Freundes (Fußpunkt).  root.userData.friends → Liste der Namen.

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, eyes, dizzyStars, makeModel, Clock, Blinker, damp, clamp, col, mix,
  smoothstep, lerp, instMesh, setInst, sparkleSprite, puffyStarGeo, starShape, onEllipsoid, placed,
} from '../lib/kit.js';
import {
  W8, prog, num, ZERO, ownMat, fxPuffs, ellSurf, stick, taperTube, cutSphere, bearEmblem, glow8, add8, glassMat8, flameGeo,
  friendFigure, FRIEND_KEYS, hash1, noise3, gradV,
} from '../lib/w8Geos.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _v2 = new THREE.Vector3();

// =============================================================================================
// Baron Brummbär im Krallen-Anzug (Körper-Koordinaten: Ursprung = Hüftpunkt, y = 0 bei HIP über dem Boden)
// =============================================================================================
const HIP = 0.74;
const BELLY = { c: [0, 0.48, 0], r: [0.6, 0.62, 0.66] };
const HC = [0.14, 1.46, 0], HR = [0.45, 0.42, 0.47];
const HOOD = { c: [0.09, 1.5, 0], r: [0.51, 0.49, 0.53], open: 0.3, bottom: -0.5 };
const SHOULDER = [0.04, 0.98, 0.64];
const HIPJ = [0.0, 0.02, 0.3];
const MOUTH_AT = [0.63, 1.22, 0];
const headSurf = ellSurf(HC, HR);
const hoodSurf = ellSurf(HOOD.c, HOOD.r);
const BELLY_SURF = ellSurf(BELLY.c, BELLY.r);
const BEAR_EYES = [1, -1].map((s) => { const h = headSurf(s * 0.36, 0.14); return { p: h.p.toArray(), r: 0.09, sy: 1.1, dir: h.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.35).toArray() }; });
const furV = { v: (x, y, z, nx, ny) => mix(W8.furDark, mix(W8.fur, W8.furHi, smoothstep(ny * 0.6 + nx * 0.3 - 0.1) * 0.5), smoothstep(ny * 0.5 + 0.7)) };
const suitV = { v: (x, y, z, nx, ny) => mix(W8.suitLow, mix(W8.suit, W8.suitHi, smoothstep(ny * 0.55 + nx * 0.35 - 0.15) * 0.55), smoothstep(ny * 0.55 + 0.62)) };
const pastel = mix(W8.suit, W8.cream, 0.62);

/** Rumpf mit Kopf, Kapuze, Gesicht, Fliege, Medaille (Schadensstufe dmg 0..2). */
function baronTorsoGeo(dmg = 0) {
  return cached(`w8:baron:torso:${dmg}`, () => {
    const b = new Build();
    // Overall-Rumpf mit weich abgesetztem Creme-Bauchfleck vorn
    const torsoC = { v: (x, y, z, nx, ny) => {
      const ly = (y - BELLY.c[1]) / BELLY.r[1] + 0.12, lz = z / BELLY.r[2] * 1.05;
      const d = Math.hypot(ly, lz), front = smoothstep((nx - 0.25) / 0.2);
      const k = smoothstep((0.6 - d) / 0.07) * front;
      return mix(suitV.v(x, y, z, nx, ny), mix(0xe8d2b8, W8.cream, smoothstep(nx * 0.8)), k);
    } };
    b.sphere(1, torsoC, { p: BELLY.c, s: BELLY.r }, 40, 28);
    // Flieder-Ringel quer über den Rücken (Bögen hinten)
    for (const y of [0.18, 0.42, 0.66]) {
      const k = Math.sqrt(Math.max(0, 1 - ((y - BELLY.c[1]) / BELLY.r[1]) ** 2));
      const rx = BELLY.r[0] * k + 0.008, rz = BELLY.r[2] * k + 0.008, arc = Math.PI * 1.1;
      const g = new THREE.TorusGeometry(1, 0.045 / ((rx + rz) / 2), 5, 28, arc);
      g.rotateZ(Math.PI - arc / 2); g.rotateX(Math.PI / 2);
      b.add(g, pastel, { p: [BELLY.c[0], y, 0], s: [rx, 1, rz] });
    }
    // Kragen-Bündchen, Hals
    b.torus(0.4, 0.07, W8.cream, { p: [0.02, 1.1, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.08, 1] }, 8, 24);
    b.sphere(1, furV, { p: [0.04, 1.16, 0], s: [0.36, 0.14, 0.42] }, 16, 8);
    // Fliege
    for (const s of [1, -1]) b.sphere(1, W8.bow, { p: [0.44, 1.08, s * 0.12], s: [0.08, 0.09, 0.14], r: [s * 0.25, 0, 0] }, 12, 8);
    b.sphere(0.06, 0xb81a22, { p: [0.49, 1.08, 0] }, 10, 6);
    // goldene Brummbär-Medaille links auf der Brust (−Z), Reißverschluss-Lasche
    const med = BELLY_SURF(-0.42, 0.42);
    const mq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), med.n);
    const me = new THREE.Euler().setFromQuaternion(mq);
    bearEmblem(b, { p: med.p.clone().addScaledVector(med.n, 0.01).toArray(), r: [me.x, me.y, me.z] }, 0.13);
    b.box(0.05, 0.1, 0.04, W8.gold, { p: [0.47, 0.98, 0.0], r: [0, 0, 0.25] }, 0.015, 1);
    // Schaden: Rußflecken, Flicken mit Kreuzstichen
    if (dmg >= 1) {
      for (const [az, el, r] of [[0.95, 0.15, 0.1], [-1.6, -0.2, 0.12], [2.6, 0.35, 0.11], [-0.7, -0.6, 0.08]]) stick(b, BELLY_SURF(az, el), 0x3e3048, [r, r * 0.75, 0.015], 0.45);
      const pt = BELLY_SURF(0.25, -0.18);
      stick(b, pt, 0xff9a3a, [0.12, 0.12, 0.02], 0.2, new THREE.BoxGeometry(2, 2, 1), 0.2);
      // Kreuzstiche an den Rändern des Flickens
      const P0 = placed(pt.p.clone().addScaledVector(pt.n, 0.012), pt.n, new THREE.Vector3(1, 1, 1));
      for (const [u, v] of [[-0.1, 0.06], [-0.1, -0.06], [0.1, 0.06], [0.1, -0.06]]) {
        for (const a of [0.7, -0.7]) b.add(new THREE.BoxGeometry(0.07, 0.014, 0.012), 0x3a1a0a, P0.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(u, v, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.2 + a), new THREE.Vector3(1, 1, 1))));
      }
    }
    // Kopf (Fell), Schnauze, Nase
    b.sphere(1, furV, { p: HC, s: HR }, 26, 18);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(0xd8a87a, W8.muzzle, smoothstep(ny * 0.5 + nx * 0.4 + 0.2)) }, { p: [0.51, 1.33, 0], s: [0.21, 0.18, 0.26] }, 18, 12);
    b.sphere(1, { v: (x, y, z, nx, ny) => mix(W8.nose, 0x5a4a48, smoothstep(ny * 0.7 + nx * 0.2 - 0.1)) }, { p: [0.7, 1.4, 0], s: [0.1, 0.075, 0.12] }, 12, 8);
    for (const s of [1, -1]) {
      // gezwirbelter Schnurrbart
      b.tube([[0.67, 1.3, s * 0.03], [0.7, 1.27, s * 0.16], [0.64, 1.27, s * 0.31], [0.59, 1.36, s * 0.38], [0.62, 1.43, s * 0.34], [0.66, 1.4, s * 0.3]], 0.048, W8.stache, null, 18, 7);
      b.sphere(0.038, W8.stache, { p: [0.66, 1.4, s * 0.3] }, 8, 6);
      // finstere Brauen
      b.box(0.08, 0.065, 0.26, W8.ink, { p: [0.53, 1.66, s * 0.18], r: [-s * 0.45, -s * 0.3, 0], order: 'YXZ' }, 0.028, 1);
      // Bäckchen
      b.sphere(1, 0xe8a888, { p: [0.47, 1.36, s * 0.27], s: [0.08, 0.06, 0.08] }, 10, 6);
    }
    // grimmiger Mund mit zwei Zähnchen
    b.torus(0.085, 0.018, W8.mouth, { p: [0.64, 1.2, 0], r: [0, Math.PI / 2, Math.PI] }, 6, 14, Math.PI);
    for (const s of [1, -1]) b.box(0.03, 0.04, 0.035, W8.tooth, { p: [0.665, 1.215, s * 0.04] }, 0.01, 1);
    // Monokel (rechtes Auge, +Z) mit Kette zur Brust
    const mo = BEAR_EYES[0].p;
    b.torus(0.115, 0.02, W8.gold, { p: [mo[0] + 0.04, mo[1], mo[2]], r: [0, Math.PI / 2 - 0.45, 0] }, 8, 22);
    b.tube([[mo[0] - 0.02, mo[1] - 0.1, mo[2] + 0.08], [0.45, 1.18, 0.36], [0.46, 0.98, 0.42], [0.5, 0.8, 0.36]], 0.012, W8.gold, null, 14, 4);
    if (dmg >= 2) b.box(0.012, 0.15, 0.012, 0x1a1a24, { p: [mo[0] + 0.05, mo[1], mo[2]], r: [0.5, 0, 0.3] }, 0, 1);
    // Kapuze: Schale mit Gesichtsöffnung, Bündchen, Ringel, Katzenöhrchen
    const hood = cutSphere((dx, dy) => dx < HOOD.open && dy > HOOD.bottom, 36, 22);
    hood.scale(HOOD.r[0], HOOD.r[1], HOOD.r[2]); hood.translate(...HOOD.c);
    b.add(hood, suitV);
    // Bündchen um das Gesicht (Kreis bei dx = open, nur oberhalb des Kapuzensaums)
    const rim = [];
    const sr = Math.sqrt(1 - HOOD.open * HOOD.open);
    const a0 = Math.asin(clamp(HOOD.bottom / sr, -1, 1));
    for (let i = 0; i <= 40; i++) {
      const a = lerp(a0, Math.PI - a0, i / 40);  // von unten rechts über oben nach unten links
      rim.push([HOOD.c[0] + HOOD.open * HOOD.r[0] + 0.01, HOOD.c[1] + Math.sin(a) * sr * HOOD.r[1], HOOD.c[2] + Math.cos(a) * sr * HOOD.r[2]]);
    }
    b.tube(rim, 0.055, W8.cream, null, 48, 8);
    // Saum hinten (Kapuzenrand über dem Kragen)
    const hem = [];
    const hb = HOOD.bottom, hr = Math.sqrt(1 - hb * hb);
    for (let i = 0; i <= 24; i++) {
      const a = lerp(0.35, TAU - 0.35, i / 24);  // dx = cos(a)·hr: von vorn rechts über hinten nach vorn links
      const dx = Math.cos(a) * hr; if (dx > HOOD.open) continue;
      hem.push([HOOD.c[0] + dx * HOOD.r[0], HOOD.c[1] + hb * HOOD.r[1], HOOD.c[2] + Math.sin(a) * hr * HOOD.r[2]]);
    }
    if (hem.length > 3) b.tube(hem, 0.04, W8.cream, null, 24, 6);
    // Ringel quer über den Hinterkopf (Ebenen x = konst.)
    for (const d of [-0.12, -0.26, -0.39]) {
      const k = Math.sqrt(1 - (d / HOOD.r[0]) ** 2);
      const g = new THREE.TorusGeometry(1, 0.03, 5, 32, TAU * 0.62);
      g.rotateZ(Math.PI / 2 - TAU * 0.31); g.rotateY(Math.PI / 2);
      b.add(g, pastel, { p: [HOOD.c[0] + d, HOOD.c[1], 0], s: [1, HOOD.r[1] * k + 0.006, HOOD.r[2] * k + 0.006] });
    }
    // Katzenöhrchen (außen violett, innen rosa); dmg 2: rechtes Öhrchen abgeknickt
    for (const s of [1, -1]) {
      const h = hoodSurf(s * 1.42, 0.72);
      const n = h.n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.35).normalize();
      const bent = dmg >= 2 && s > 0;
      const dir = bent ? n.clone().lerp(new THREE.Vector3(0.3, -0.4, 1), 0.7).normalize() : n;
      const base = h.p.clone().addScaledVector(h.n, -0.03);
      const ear = new THREE.ConeGeometry(0.17, 0.34, 14, 3);
      ear.translate(0, 0.17, 0);
      const P = ear.attributes.position;
      for (let i = 0; i < P.count; i++) { const y = P.getY(i); const k = 1 - smoothstep((y - 0.22) / 0.12) * 0.35; P.setX(i, P.getX(i) * 0.5 * k); P.setZ(i, P.getZ(i) * k); }
      ear.computeVertexNormals();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const tw = new THREE.Quaternion().setFromAxisAngle(dir, s * 0.35);
      const M = new THREE.Matrix4().compose(base, tw.multiply(q), new THREE.Vector3(1, 1, 1));
      b.add(ear, suitV, M);
      const inner = new THREE.ConeGeometry(0.1, 0.24, 10, 2);
      inner.translate(0, 0.12, 0); inner.scale(0.3, 1, 1);
      const fwd = new THREE.Vector3(1, 0, -s * 0.3).normalize();
      b.add(inner, W8.pad, new THREE.Matrix4().compose(base.clone().addScaledVector(dir, 0.03).addScaledVector(fwd, 0.045), tw.clone(), new THREE.Vector3(1, 1, 1)));
      b.sphere(0.04, W8.cream, { p: base.clone().addScaledVector(dir, bent ? 0.3 : 0.33).toArray() }, 8, 6);
    }
    // dmg 2: zerzauste Fellbüschel an den Backen
    if (dmg >= 2) for (const s of [1, -1]) for (let i = 0; i < 3; i++) b.cone(0.035, 0.12, W8.furDark, { p: [0.38 - i * 0.05, 1.3 + i * 0.05, s * (0.42 + i * 0.01)], r: [s * (1.3 + i * 0.2), 0, 0.3] }, 6);
    return b.geometry();
  });
}
/** Zylinder (Ursprung = Unterkante der Krempe). */
const baronHatGeo = () => cached('w8:baron:hat', () => {
  const b = new Build();
  const hatV = { v: (x, y, z, nx, ny) => mix(W8.hat, W8.hatHi, smoothstep(nx * 0.4 + ny * 0.3) * 0.6) };
  b.cyl(0.44, 0.44, 0.035, hatV, { p: [0, 0.02, 0], s: [1, 1, 0.92] }, 32);
  b.torus(0.44, 0.026, W8.hat, { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] }, 6, 32);
  b.cyl(0.28, 0.26, 0.58, hatV, { p: [0, 0.33, 0] }, 28);
  b.cyl(0.29, 0.29, 0.03, W8.hatHi, { p: [0, 0.625, 0] }, 28);
  b.cyl(0.27, 0.27, 0.1, W8.band, { p: [0, 0.1, 0], s: [1.03, 1, 1.03] }, 28);
  b.sphere(1, W8.gold, { p: [0.28, 0.1, 0], s: [0.025, 0.05, 0.06] }, 8, 6);
  for (const z of [-0.05, -0.017, 0.017, 0.05]) b.sphere(0.018, W8.gold, { p: [0.28, 0.16, z] }, 6, 4);
  return b.geometry();
});
/** Arm mit Tatzen-Handschuh (Ursprung = Schulter, hängt nach −Y; Ballen und Krallen nach +X). */
const baronArmGeo = () => cached('w8:baron:arm', () => {
  const b = new Build();
  b.capsule(0.16, 0.34, { v: (x, y, z, nx, ny) => (Math.abs(y + 0.3) < 0.04 ? col(pastel) : suitV.v(x, y, z, nx, ny)) }, { p: [0, -0.22, 0] }, 3, 12);
  b.torus(0.15, 0.05, W8.cream, { p: [0, -0.48, 0], r: [Math.PI / 2, 0, 0] }, 6, 14);
  b.sphere(1, suitV, { p: [0.02, -0.66, 0], s: [0.21, 0.22, 0.19] }, 18, 12);
  // Ballen (rosa) und Zehenballen, drei Krallen
  b.sphere(1, W8.pad, { p: [0.19, -0.68, 0], s: [0.05, 0.08, 0.09] }, 10, 8);
  for (const z of [-0.08, 0, 0.08]) {
    b.sphere(1, W8.pad, { p: [0.15, -0.8, z], s: [0.035, 0.035, 0.03] }, 8, 6);
    b.add(new THREE.ConeGeometry(0.03, 0.15, 8), { v: (x, y) => mix(W8.clawLow, W8.claw, smoothstep(-y / 0.15 + 0.5)) }, { p: [0.17, -0.89, z], r: [0, 0, Math.PI + 0.55] });
  }
  return b.geometry();
});
const ARM_HAND = new THREE.Vector3(0.12, -0.82, 0);
/** Bein mit Tatzenfuß (Ursprung = Hüftgelenk, hängt nach −Y). Fußsohle bei y ≈ −HIP. */
const baronLegGeo = () => cached('w8:baron:leg', () => {
  const b = new Build();
  b.capsule(0.21, 0.3, { v: (x, y, z, nx, ny) => (Math.abs(y + 0.32) < 0.04 ? col(pastel) : suitV.v(x, y, z, nx, ny)) }, { p: [0, -0.28, 0] }, 3, 12);
  b.torus(0.17, 0.045, W8.cream, { p: [0.02, -0.52, 0], r: [Math.PI / 2, 0, 0] }, 6, 14);
  b.sphere(1, suitV, { p: [0.1, -0.63, 0], s: [0.3, 0.13, 0.22] }, 18, 10);
  b.sphere(1, W8.pad, { p: [-0.05, -0.72, 0], s: [0.11, 0.04, 0.12] }, 10, 6);
  for (const z of [-0.1, 0, 0.1]) {
    b.sphere(1, W8.pad, { p: [0.3, -0.7, z], s: [0.04, 0.03, 0.04] }, 8, 5);
    b.add(new THREE.ConeGeometry(0.028, 0.11, 7), { v: (x, y) => mix(W8.clawLow, W8.claw, smoothstep(-y / 0.11 + 0.5)) }, { p: [0.39, -0.69, z], r: [0, 0, -Math.PI / 2 - 0.25] });
  }
  return b.geometry();
});
/** Ringelschweif (Ursprung = Ansatz hinten, reicht nach −X und oben, Creme-Puschel). */
const baronTailGeo = () => cached('w8:baron:tail', () => {
  const b = new Build();
  const pts = [[0, 0, 0], [-0.18, -0.02, 0], [-0.34, 0.06, 0], [-0.45, 0.22, 0], [-0.5, 0.4, 0], [-0.46, 0.56, 0]];
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const n = 18;
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / (n - 1));
    b.sphere(0.105 - i * 0.002, Math.floor(i / 3) % 2 ? pastel : suitV, { p: p.toArray() }, 12, 8);
  }
  b.sphere(0.14, { v: (x, y, z, nx, ny) => mix(0xe8d8c8, W8.cream, smoothstep(ny * 0.5 + 0.5)) }, { p: curve.getPointAt(1).add(new THREE.Vector3(0.02, 0.09, 0)).toArray() }, 14, 10);
  return b.geometry();
});
/** Offenes Maul (unbeleuchtet: dunkler Rachen, Zunge) – Ursprung = Mundmitte, Öffnung nach +X. */
const mouthOpenGeo = () => cached('w8:baron:mouthOpen', () => new Build()
  .sphere(1, { v: (x, y, z, nx, ny) => mix(0x2a0610, 0x6a1424, smoothstep(-nx)) }, { s: [0.05, 0.1, 0.13] }, 14, 10)
  .sphere(1, W8.tongue, { p: [0.015, -0.055, 0], s: [0.04, 0.03, 0.08] }, 10, 6)
  .geometry());
/** Flammenstoß (unbeleuchtet), Ursprung = Maul, Strahl nach +X. */
const flameBurstGeo = () => cached('w8:baron:flame', () => {
  const b = new Build();
  const g = new THREE.ConeGeometry(0.32, 1.2, 14, 4, true);
  g.rotateZ(-Math.PI / 2); g.translate(0.6, 0, 0);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i); const k = Math.sin(clamp(x / 1.2, 0, 1) * Math.PI) * 0.6 + 0.4; P.setY(i, P.getY(i) * k); P.setZ(i, P.getZ(i) * k); }
  g.computeVertexNormals();
  b.add(g, { v: (x) => mix(0xfff2b0, 0xff4a10, smoothstep(x / 1.1)) });
  b.add(new THREE.IcosahedronGeometry(0.2, 1), { v: (x, y) => mix(0xffb02a, 0xfff8d0, smoothstep(y * 2 + 0.5)) }, { p: [0.18, 0, 0] });
  return b.geometry();
});
/** Drei leuchtende Kratz-Spuren (Bögen in der Ebene XY, Mitte im Ursprung, ≈1,3 m). */
const swipeTrailGeo = () => cached('w8:baron:trail', () => {
  const b = new Build();
  for (let k = -1; k <= 1; k++) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = lerp(2.3, 0.5, i / 12); pts.push([Math.cos(a) * (0.62 + k * 0.13), Math.sin(a) * (0.62 + k * 0.13) - 0.25, k * 0.04]); }
    b.add(taperTube(pts, (t) => 0.05 * Math.sin(Math.PI * clamp(t * 1.15, 0, 1)) + 0.004, 18, 5), 0xffffff);
  }
  return b.geometry();
});

const BARON_ANIMS = ['idle', 'walk', 'climb', 'slide', 'swipe', 'fire', 'hit', 'stunned', 'fall', 'clone', 'defeated'];
function buildBaronKrallen(opts = {}) {
  const isClone = !!opts.clone;
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.42, {}, 'w8baron'), { emissive: 0x000000 });
  const hatMat = ownMat(vcol(0.35, {}, 'w8hat'), { emissive: 0x000000 });
  own.push(flash, hatMat);
  const bodyJ = joint([0, HIP, 0]);
  const torso = mesh(baronTorsoGeo(0), flash, {}, true);
  const eye = eyes(BEAR_EYES, { key: 'w8:baron', iris: 0x8a2a14, pupil: 0.5, depth: 0.5 });
  const hat = mesh(baronHatGeo(), hatMat, {}, true);
  const arms = instMesh(baronArmGeo(), flash, 2, 3, 1);
  arms.castShadow = true;
  const legs = instMesh(baronLegGeo(), flash, 2, 2, -0.4);
  legs.castShadow = true;
  const tailJ = joint([-0.52, 0.12, 0], mesh(baronTailGeo(), flash, {}, true));
  const mouthJ = joint(MOUTH_AT);
  const mouthO = mesh(mouthOpenGeo(), glow8());
  const flame = mesh(flameBurstGeo(), glow8(), { p: [0.05, 0, 0] });
  mouthJ.add(mouthO, flame);
  const trailMat = new THREE.MeshBasicMaterial({ color: isClone ? 0xff8af0 : 0xf0e0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  own.push(trailMat);
  const trail = mesh(swipeTrailGeo(), trailMat);
  trail.visible = false;
  const dizzy = dizzyStars(0.6, 0.13); dizzy.position.set(0.12, 2.15, 0);
  bodyJ.add(torso, eye, hat, arms, legs, tailJ, mouthJ, trail, dizzy);
  const fx = fxPuffs(14, isClone ? 0xff8af0 : 0xfff2c8, { opacity: 0.9, radius: 5, cy: 1.5, detail: isClone ? 1 : 0, emissive: isClone ? 0x8a2a7a : 0x6a5a20 });
  own.push(fx);
  root.add(bodyJ, fx.mesh);
  if (isClone) {
    for (const m of [flash, hatMat]) { m.transparent = true; m.opacity = 0.66; m.emissive.setHex(0x6a1a6a); }
    const em = eye.userData.eyes, hl = eye.userData.hl;
    em.material = ownMat(em.material, { transparent: true, opacity: 0.75 }); own.push(em.material);
    hl.material = hl.material.clone(); hl.material.transparent = true; hl.material.opacity = 0.75; own.push(hl.material);
  }
  root.userData.radius = 0.75;
  root.userData.top = 3.2;
  root.userData.wallX = 0.8;
  const clk = new Clock(), blink = new Blinker();
  const hatHome = new THREE.Vector3(0.07, 1.96, 0);
  const SH = [new THREE.Vector3(SHOULDER[0], SHOULDER[1], SHOULDER[2]), new THREE.Vector3(SHOULDER[0], SHOULDER[1], -SHOULDER[2])];
  const HP = [new THREE.Vector3(HIPJ[0], HIPJ[1], HIPJ[2]), new THREE.Vector3(HIPJ[0], HIPJ[1], -HIPJ[2])];
  const arm = [{ f: 0.15, o: 0.15 }, { f: 0.15, o: 0.15 }];   // f = vor/hoch (rad um Z), o = seitlich nach außen
  const leg = [{ f: 0, o: 0.05 }, { f: 0, o: 0.05 }];
  let phase = 0, dmgShown = 0, slump = 0, emit = 0, spin = 0, hatLift = 0, open = 0;
  const handLocal = [new THREE.Vector3(), new THREE.Vector3()];
  const update = (dt, st) => {
    let anim = st.anim ?? 'idle';
    if (!BARON_ANIMS.includes(anim)) anim = 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    const maxHp = Math.max(1, num(st.maxHp, 4));
    const hp = clamp(num(st.hp, maxHp), 0, maxHp);
    const dmg = anim === 'defeated' || hp <= 1 ? 2 : hp <= maxHp / 2 ? 1 : 0;
    if (dmg !== dmgShown) { dmgShown = dmg; torso.geometry = baronTorsoGeo(dmg); }
    // Grundpose
    let by = 0, bx = 0, rz = 0, rx = 0, ry = 0, sy = 1;
    const A = [{ f: 0.2, o: 0.18 }, { f: 0.2, o: 0.18 }], Lg = [{ f: 0, o: 0.04 }, { f: 0, o: 0.04 }];
    let tailSwing = Math.sin(t * 2.2) * 0.35, tailLift = 0, mouth = 0, fl = 0, trailOn = 0, trailSide = 1, trailK = 0;
    let bk = blink.update(dt), dizzyOn = false, hatPop = 0, hatTilt = 0;
    const dead = anim === 'defeated';
    if (anim === 'idle') {
      sy = 1 + Math.sin(t * 2.4) * 0.015;
      A[0].f = 0.25 + Math.sin(t * 1.3) * 0.08; A[1].f = 0.25 + Math.sin(t * 1.3 + 1) * 0.08;
      A[0].o = A[1].o = 0.22 + Math.max(0, Math.sin(t * 0.9)) * 0.12;
      ry = Math.sin(t * 0.5) * 0.15;
    } else if (anim === 'walk') {
      const sp = num(st.speed, 1.6);
      phase += dt * TAU * (1.1 + sp * 0.45);
      const s = Math.sin(phase);
      Lg[0].f = s * 0.55; Lg[1].f = -s * 0.55;
      A[0].f = 0.2 - s * 0.45; A[1].f = 0.2 + s * 0.45;
      by = Math.abs(Math.cos(phase)) * 0.06 - 0.03; rx = Math.sin(phase) * 0.06; ry = s * 0.08;
      tailSwing = Math.sin(phase) * 0.5;
    } else if (anim === 'climb') {
      const sp = num(st.speed, 1);
      phase += dt * TAU * sp * 0.8;
      const s = Math.sin(phase);
      bx = 0.12; rz = -0.16; by = s * 0.05;
      A[0].f = 2.35 + s * 0.35; A[1].f = 2.35 - s * 0.35; A[0].o = A[1].o = 0.05;
      Lg[0].f = 0.75 - s * 0.35; Lg[1].f = 0.75 + s * 0.35; Lg[0].o = Lg[1].o = 0.12;
      tailSwing = Math.sin(phase * 0.5) * 0.6; tailLift = -0.3;
    } else if (anim === 'slide') {
      bx = 0.1; rz = -0.05;
      A[0].f = 2.75; A[0].o = -0.02; A[1].f = 1.2; A[1].o = 0.7;
      Lg[0].f = 0.5; Lg[1].f = 0.25; Lg[0].o = Lg[1].o = 0.15;
      tailLift = 0.6; tailSwing = Math.sin(t * 9) * 0.25;
      bk = 0.65;
      emit -= dt;
      if (emit <= 0) {
        bodyJ.updateMatrix();
        _v.copy(handLocal[0]).applyMatrix4(bodyJ.matrix);
        fx.burst([_v.x, _v.y, _v.z], { count: 2, speed: 1.2, up: 0.8, size: 0.06, life: 0.35, spread: 0.06 });
        emit = 0.05;
      }
    } else if (anim === 'swipe') {
      const p = prog(st, clk, 0.7);
      if (p < 0.35) { const k = smoothstep(p / 0.35); A[0].f = lerp(0.2, 2.9, k); A[0].o = lerp(0.18, 0.75, k); A[1].f = lerp(0.2, 2.4, k); A[1].o = lerp(0.18, 0.7, k); ry = -0.3 * k; rz = 0.08 * k; }
      else if (p < 0.55) {
        const k = smoothstep((p - 0.35) / 0.2);
        A[0].f = lerp(2.9, 0.6, k); A[0].o = lerp(0.75, -0.35, k); A[1].f = 2.4; A[1].o = 0.7; ry = lerp(-0.3, 0.35, k); rz = lerp(0.08, -0.12, k);
        trailOn = 1; trailSide = 1; trailK = k;
      } else if (p < 0.75) {
        const k = smoothstep((p - 0.55) / 0.2);
        A[0].f = 0.6; A[0].o = -0.35; A[1].f = lerp(2.4, 0.6, k); A[1].o = lerp(0.7, -0.35, k); ry = lerp(0.35, -0.3, k); rz = -0.12;
        trailOn = 1; trailSide = -1; trailK = k;
      } else { const k = smoothstep((p - 0.75) / 0.25); A[0].f = lerp(0.6, 0.2, k); A[0].o = lerp(-0.35, 0.18, k); A[1].f = lerp(0.6, 0.2, k); A[1].o = lerp(-0.35, 0.18, k); ry = lerp(-0.3, 0, k); rz = lerp(-0.12, 0, k); }
      mouth = p > 0.3 && p < 0.8 ? 0.6 : 0;
      bk = 0.85;
    } else if (anim === 'fire') {
      const p = prog(st, clk, 0.8);
      if (p < 0.4) { const k = smoothstep(p / 0.4); rz = 0.18 * k; sy = 1 + 0.06 * k; A[0].f = A[1].f = lerp(0.2, -0.3, k); A[0].o = A[1].o = 0.45 * k; }
      else if (p < 0.75) { const k = smoothstep((p - 0.4) / 0.1); rz = lerp(0.18, -0.14, k); sy = lerp(1.06, 0.97, k); A[0].f = A[1].f = -0.3 + k * 0.4; A[0].o = A[1].o = 0.45; mouth = 1; fl = p < 0.45 ? (p - 0.4) / 0.05 : 1 - smoothstep((p - 0.6) / 0.15) * 0.9; }
      else { const k = smoothstep((p - 0.75) / 0.25); rz = lerp(-0.14, 0, k); mouth = 1 - k; }
      bk = p < 0.4 ? 0.55 : 1;
    } else if (anim === 'hit') {
      const p = prog(st, clk, 0.6);
      rz = Math.max(0, 0.45 - p * 0.6) * 0.8; bx = -0.15 * Math.sin(p * Math.PI);
      A[0].f = A[1].f = 2.3; A[0].o = A[1].o = 0.8; Lg[0].f = 0.4; Lg[1].f = -0.2;
      hatPop = p; mouth = 0.7; bk = 0.12; tailLift = 0.5;
    } else if (anim === 'stunned') {
      rx = Math.sin(t * 4) * 0.12; rz = Math.sin(t * 3) * 0.06; ry = Math.sin(t * 1.7) * 0.2;
      A[0].f = 0.35 + Math.sin(t * 5) * 0.3; A[1].f = 0.35 + Math.cos(t * 5) * 0.3; A[0].o = A[1].o = 0.4;
      dizzyOn = true; bk = 0.4; mouth = 0.25; tailSwing = Math.sin(t * 1.5) * 0.2; tailLift = -0.4;
    } else if (anim === 'fall') {
      rz = Math.sin(t * 2.2) * 0.35; rx = Math.cos(t * 1.7) * 0.25;
      A[0].f = 2.6 + Math.sin(t * 13) * 0.4; A[1].f = 2.6 + Math.sin(t * 13 + 2) * 0.4; A[0].o = A[1].o = 0.9;
      Lg[0].f = 0.6 + Math.sin(t * 11) * 0.4; Lg[1].f = 0.6 + Math.sin(t * 11 + 2) * 0.4; Lg[0].o = Lg[1].o = 0.35;
      mouth = 1; bk = 1.25; hatLift = damp(hatLift, 0.45, 4, dt); tailLift = 0.8; tailSwing = Math.sin(t * 12) * 0.4;
    } else if (anim === 'clone') {
      const p = clamp(age / 1.0, 0, 1);
      if (p < 0.6) { spin = smoothstep(p / 0.6) * TAU; A[0].f = A[1].f = lerp(0.2, 2.6, smoothstep(p / 0.3)); A[0].o = A[1].o = 0.9; }
      else { spin = TAU; A[0].f = A[1].f = 2.7 + Math.sin(t * 9) * 0.1; A[0].o = A[1].o = 0.95; mouth = 0.8; by = Math.abs(Math.sin(t * 8)) * 0.05; }
      ry = spin;
      emit -= dt;
      if (emit <= 0 && p < 0.9) { fx.burst([Math.cos(t * 7) * 0.9, 1.4 + Math.sin(t * 5) * 0.8, Math.sin(t * 7) * 0.9], { count: 2, speed: 0.6, up: 0.6, size: 0.06, life: 0.6, spread: 0.3 }); emit = 0.05; }
      bk = p > 0.6 ? 0.3 : 1;
    } else if (dead) {
      A[0].f = A[1].f = 0.1; A[0].o = A[1].o = 0.5;
      Lg[0].f = Lg[1].f = 1.45; Lg[0].o = Lg[1].o = 0.3;
      dizzyOn = true; bk = 0.12; mouth = 0.35; hatTilt = 1; tailSwing = 0.1; tailLift = -0.9;
    }
    if (anim !== 'fall') hatLift = damp(hatLift, 0, 6, dt);
    slump = damp(slump, dead ? 1 : 0, 3, dt);
    if (anim !== 'clone') spin = 0;
    // Körper
    bodyJ.position.set(bx, HIP + by - slump * 0.5, 0);
    bodyJ.rotation.set(rx, ry, rz + slump * 0.2, 'YXZ');
    bodyJ.scale.set(1, sy, 1);
    // Arme, Beine
    const fast = anim === 'swipe' || anim === 'fall' ? 30 : 10;
    for (let i = 0; i < 2; i++) {
      const s = i ? -1 : 1;
      arm[i].f = damp(arm[i].f, A[i].f, fast, dt); arm[i].o = damp(arm[i].o, A[i].o, fast, dt);
      leg[i].f = damp(leg[i].f, Lg[i].f, 12, dt); leg[i].o = damp(leg[i].o, Lg[i].o, 12, dt);
      _q.setFromEuler(_e.set(-s * arm[i].o, 0, arm[i].f));
      arms.setMatrixAt(i, _m.compose(SH[i], _q, _s.setScalar(1)));
      handLocal[i].copy(ARM_HAND).applyQuaternion(_q).add(SH[i]);
      _q.setFromEuler(_e.set(-s * leg[i].o, 0, leg[i].f));
      legs.setMatrixAt(i, _m.compose(HP[i], _q, _s.setScalar(1)));
    }
    arms.instanceMatrix.needsUpdate = true; legs.instanceMatrix.needsUpdate = true;
    tailJ.rotation.set(tailSwing, tailSwing * 0.4, tailLift);
    // Maul, Flamme
    open = damp(open, mouth, 16, dt);
    mouthO.visible = open > 0.05;
    mouthO.scale.set(1, Math.max(0.01, open), Math.max(0.01, 0.5 + open * 0.5));
    flame.visible = fl > 0.02;
    flame.scale.set(Math.max(0.01, fl), 0.6 + fl * 0.5 + Math.sin(t * 40) * 0.06, 0.6 + fl * 0.5);
    // Kratz-Spuren
    trail.visible = trailOn > 0 && trailK < 0.99;
    if (trail.visible) {
      trail.position.set(0.75, 0.75, trailSide * 0.15);
      trail.rotation.set(0, trailSide > 0 ? -1.15 : 1.15, trailSide > 0 ? 0 : 0);
      trail.scale.set(trailSide, 1, 1);
      trailMat.opacity = 0.95 * (1 - smoothstep((trailK - 0.4) / 0.6));
    }
    // Hut
    const hy = hatPop > 0 ? Math.sin(hatPop * Math.PI) * 1.0 : 0;
    hat.position.set(hatHome.x - slump * 0.12 + hatTilt * 0.05, hatHome.y + hy + hatLift - slump * 0.04, hatHome.z + slump * 0.2);
    hat.rotation.set(0.06 + slump * 0.45 + Math.sin(t * 9) * hatLift * 0.3, hatPop * TAU, -0.14 - slump * 0.35);
    // Aufblitzen
    const hitK = anim === 'hit' ? Math.max(0, 1 - prog(st, clk, 0.6)) * (Math.sin(age * 40) > 0 ? 1 : 0.2) : 0;
    const glowK = isClone ? 0.35 + Math.sin(t * 4) * 0.1 : 0;
    flash.emissive.setRGB(hitK * 0.8 + glowK * 0.9, hitK * 0.7 + glowK * 0.25, hitK * 0.65 + glowK * 0.85);
    hatMat.emissive.setRGB(hitK * 0.5 + glowK * 0.6, hitK * 0.4 + glowK * 0.15, hitK * 0.4 + glowK * 0.6);
    // Doppelgänger funkelt immer leicht
    if (isClone && anim !== 'clone') {
      emit -= dt;
      if (emit <= 0) { fx.burst([(Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 2, (Math.random() - 0.5) * 1.2], { count: 1, speed: 0.3, up: 0.5, size: 0.045, life: 0.5, spread: 0.1 }); emit = 0.18; }
    }
    fx.step(dt);
    eye.userData.blink(bk);
    eye.scale.setScalar(anim === 'fall' || anim === 'hit' ? 1.12 : 1);
    dizzy.visible = dizzyOn;
    dizzy.rotation.y = t * 3.5;
  };
  const model = makeModel('baron_krallen', root, update, [...own, arms, legs], { initial: 'idle' });
  model.hand = (out = new THREE.Vector3(), side = 'rechts') => { root.updateMatrixWorld(true); return bodyJ.localToWorld(out.copy(handLocal[side === 'links' ? 1 : 0])); };
  model.mouth = (out = new THREE.Vector3()) => { root.updateMatrixWorld(true); return mouthJ.localToWorld(out.set(0.3, 0, 0)); };
  return model;
}

// =============================================================================================
// Super-Wumm-Block
// =============================================================================================
const SP = { blue: 0x4a3ae0, blueHi: 0x7a6aff, blueLow: 0x22128a, grey: 0x5a5280, gold: 0xffc21a, goldHi: 0xfff0a0, goldLow: 0xb87a0a, orange: 0xff8a1a, yellow: 0xffe84a, crack: 0x140a3a };
export const POW_FACTOR = (hits) => 1 - 0.16 * clamp(hits, 0, 4);
/** Block (Kante 1, Ursprung = Mitte der Unterseite) mit Kantenschienen, Knallsternen und Rissen je Trefferzahl. */
function powBlockGeo(hits = 0) {
  return cached(`w8:spow:${hits}`, () => {
    const b = new Build();
    const used = hits >= 4;
    const body = { v: (x, y, z, nx, ny, nz) => {
      const flat = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
      const base = used ? mix(SP.grey, SP.blueLow, 0.4) : mix(SP.blue, SP.blueHi, smoothstep(ny * 0.4 + 0.1) * 0.5);
      return base.clone().lerp(col(SP.blueLow), (1 - flat) * 2);
    } };
    b.add(new THREE.BoxGeometry(1, 1, 1, 4, 4, 4), body, { p: [0, 0.5, 0] });
    // goldene Kantenschienen mit Nieten
    const goldV = { v: (x, y, z, nx, ny) => mix(SP.goldLow, SP.goldHi, smoothstep(ny * 0.5 + 0.45)) };
    const e = 0.07, q = 0.5 - e / 2 + 0.012;
    for (const a of [-1, 1]) for (const c of [-1, 1]) {
      const qy = 0.5 - e / 2;
      b.box(1.0, e, e, goldV, { p: [0, 0.5 + a * qy, c * q] }, 0.02, 1);
      b.box(e, 1.0, e, goldV, { p: [a * q, 0.5, c * q] }, 0.02, 1);
      b.box(e, e, 1.0, goldV, { p: [a * q, 0.5 + c * qy, 0] }, 0.02, 1);
    }
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) b.sphere(0.045, SP.goldHi, { p: [x * q, 0.5 + y * (0.5 - 0.046), z * q] }, 8, 6);
    // Knallsterne auf den vier Seiten (verbraucht: blasser)
    const sides = [[0, 1, Math.PI / 2], [0, -1, -Math.PI / 2], [2, 1, 0], [2, -1, Math.PI]];
    for (const [ax, sg, ry] of sides) {
      const at = (d) => { const p = [0, 0.5, 0]; p[ax] = sg * d; return p; };
      b.extrude(starShape(0.4, 0.21, 10), 0.03, used ? 0xb07a5a : SP.orange, { p: at(0.505), r: [0, ry, 0] }, 0.01, 1, 1);
      b.extrude(starShape(0.32, 0.17, 10), 0.03, used ? 0xc8b878 : SP.yellow, { p: at(0.53), r: [0, ry, 0.15] }, 0.01, 1, 1);
      b.extrude(starShape(0.13, 0.075, 8), 0.02, 0xffffff, { p: at(0.555), r: [0, ry, 0] }, 0.005, 1, 1);
      // Risse (je Treffer mehr): gezackte dunkle Linien von oben bzw. unten her
      const hv = [Math.cos(ry), 0, -Math.sin(ry)];
      for (let k = 0; k < hits; k++) {
        let u = (hash1(k * 7.1 + ax * 3 + sg) - 0.5) * 0.7, v = k % 2 ? 0.47 : -0.47;
        for (let j = 0; j < 5; j++) {
          const u1 = u + (hash1(k * 13 + j + sg * 5 + ax) - 0.5) * 0.2, v1 = v + (k % 2 ? -1 : 1) * 0.08;
          const len = Math.hypot(u1 - u, v1 - v), ang = Math.atan2(v1 - v, u1 - u);
          const p = at(0.508), um = (u + u1) / 2;
          p[0] += hv[0] * um; p[2] += hv[2] * um; p[1] += (v + v1) / 2;
          b.box(len + 0.012, 0.024, 0.012, SP.crack, { p, r: [0, ry, ang] }, 0, 1);
          u = u1; v = v1;
        }
      }
    }
    // Oberseite: Goldplatte mit Stern-Rosette
    b.box(0.72, 0.02, 0.72, goldV, { p: [0, 1.005, 0] }, 0.01, 1);
    b.box(0.64, 0.02, 0.64, used ? SP.grey : SP.blueLow, { p: [0, 1.012, 0] }, 0.01, 1);
    b.extrude(starShape(0.26, 0.13, 8), 0.015, used ? 0xc8b878 : SP.yellow, { p: [0, 1.02, 0], r: [-Math.PI / 2, 0, 0] }, 0.004, 1, 1);
    return b.geometry();
  });
}
const lampGeo = () => cached('w8:spow:lamp', () => new Build().dome(0.075, 0xffffff, {}, Math.PI / 2, 14, 6).cyl(0.085, 0.09, 0.03, 0xffffff, { p: [0, 0.0, 0] }, 14).geometry());
const LAMP_ON = new THREE.Color(0xffe23a), LAMP_OFF = new THREE.Color(0x2a2448);
function buildSuperPow(opts = {}) {
  const S = clamp(num(opts.size, 5), 1, 20);
  const root = new THREE.Group();
  const own = [];
  const flash = ownMat(vcol(0.34, {}, 'w8spow'), { emissive: 0x000000 });
  own.push(flash);
  const squashJ = joint();
  const block = mesh(powBlockGeo(0), flash, { s: S }, true);
  block.receiveShadow = true;
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  own.push(lampMat);
  const lamps = instMesh(lampGeo(), lampMat, 4, S, S * 0.5);
  for (let i = 0; i < 4; i++) lamps.setColorAt(i, LAMP_ON);
  squashJ.add(block, lamps);
  const waveMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  own.push(waveMat);
  const wave = mesh(cached('w8:spow:wave', () => { const g = new THREE.TorusGeometry(1, 0.05, 6, 48); g.rotateX(Math.PI / 2); return g; }), waveMat, { p: [0, 0.08, 0] });
  wave.visible = false;
  const dust = fxPuffs(16, 0xe8e0f0, { opacity: 0.85, radius: S * 3, cy: 0.5 });
  own.push(dust);
  root.add(squashJ, wave, dust.mesh);
  const clk = new Clock();
  let hitsShown = 0, h = 1, lastHitAge = 9;
  const topAt = (hits) => S * POW_FACTOR(hits);
  const update = (dt, st) => {
    const anim = st.anim === 'hit' ? 'hit' : 'idle';
    clk.tick(dt, anim);
    const hits = clamp(Math.round(num(st.hits, 0)), 0, 4);
    if (hits !== hitsShown) { hitsShown = hits; block.geometry = powBlockGeo(hits); }
    h = damp(h, POW_FACTOR(hits), 8, dt);
    let sq = 0, f = 0, waveK = -1;
    if (anim === 'hit') {
      const p = prog(st, clk, 0.7);
      sq = Math.sin(clamp(p * 2.2, 0, 1) * Math.PI) * 0.8;
      f = Math.max(0, 1 - p * 2.2);
      waveK = p;
      if (clk.entered || (st.progress !== undefined && p < 0.05 && lastHitAge > 0.3)) { dust.burst([0, 0.2, 0], { count: 16, speed: S * 0.9, up: 0.6, size: S * 0.09, life: 0.8, spread: S * 0.45, force: true }); lastHitAge = 0; }
    }
    lastHitAge += dt;
    if (st.squash !== undefined) sq = clamp(num(st.squash, 0), 0, 1);
    const sy = h * (1 - 0.35 * sq), sxz = 1 + 0.18 * sq;
    squashJ.scale.set(sxz, Math.max(0.01, sy), sxz);
    // Lampen an den oberen Ecken (Einheitsblock: y = 1)
    for (let i = 0; i < 4; i++) {
      const a = (i + 0.5) * Math.PI / 2;
      setInst(lamps, i, Math.cos(a) * 0.43 * S, S, Math.sin(a) * 0.43 * S, 0, 0, 0, [S * 0.9 / sxz, S * 0.9 / Math.max(0.01, sy), S * 0.9 / sxz]);
      lamps.setColorAt(i, i < 4 - hits ? (Math.sin(clk.t * 3 + i) > -0.6 || hits === 0 ? LAMP_ON : LAMP_OFF) : LAMP_OFF);
    }
    lamps.instanceMatrix.needsUpdate = true; lamps.instanceColor.needsUpdate = true;
    flash.emissive.setRGB(f, f, f * 0.8);
    wave.visible = waveK >= 0 && waveK < 1;
    if (wave.visible) { wave.scale.setScalar(S * (0.6 + waveK * 1.6)); waveMat.opacity = 0.85 * (1 - waveK); }
    dust.step(dt);
    root.userData.top = S * sy;
  };
  const model = makeModel('super_pow_block', root, update, [...own, lamps], { initial: 'idle' });
  model.topAt = topAt;
  root.userData.top = topAt(0);
  return model;
}

// =============================================================================================
// Glas mit den gefangenen Freunden
// =============================================================================================
const JAR = { r: 0.97, body: 1.62, shoulder: 1.84, neckR: 0.62, neckY: 1.96, lipY: 2.1, top: 2.4 };
const JAR_PROFILE = [[0, 0.03], [0.86, 0.03], [0.95, 0.1], [0.97, 0.32], [0.97, 1.5], [0.93, 1.72], [0.78, 1.88], [0.64, 1.95], [0.62, 2.0], [0.62, 2.1]];
const jarGlassGeo = () => cached('w8:jar:glass', () => {
  const g = new THREE.LatheGeometry(JAR_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 44);
  const b = new Build();
  b.add(g, { v: (x, y, z, nx, ny) => mix(0xcfefff, 0xffffff, smoothstep(ny * 0.5 + 0.3)) });
  b.cyl(0.86, 0.86, 0.06, 0xbfe8ff, { p: [0, 0.03, 0] }, 40);
  return b.geometry();
});
/** Korken, Goldrand, Schnur, Wachssiegel mit Wappen, Glanzstreifen (undurchsichtig). Ursprung = Glasboden. */
const jarCapGeo = () => cached('w8:jar:cap', () => {
  const b = new Build();
  const corkV = (x, y, z) => mix(0xb8844a, 0xe0b078, noise3(x * 9, y * 9, z * 9) * 0.8 + 0.1 * Math.sin(y * 40));
  b.lathe([[0, 2.08], [0.58, 2.08], [0.6, 2.14], [0.64, 2.36], [0.6, 2.41], [0, 2.42]], corkV, null, 32);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.18 + hash1(i) * 0.35; b.sphere(0.025, 0x7a4a22, { p: [Math.cos(a) * r, 2.415, Math.sin(a) * r], s: [1, 0.3, 1] }, 6, 4); }
  b.torus(0.64, 0.045, { v: (x, y, z, nx, ny) => mix(W8.goldLow, W8.goldHi, smoothstep(ny * 0.5 + 0.5)) }, { p: [0, 2.1, 0], r: [Math.PI / 2, 0, 0] }, 8, 40);
  b.torus(0.645, 0.022, 0xd8c8a0, { p: [0, 2.02, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
  // Schnur zum Siegel vorn (+X)
  b.tube([[0.64, 2.02, 0.05], [0.72, 1.9, 0.04], [0.78, 1.76, 0.02], [0.8, 1.66, 0]], 0.018, 0xd8c8a0, null, 12, 5);
  b.sphere(1, { v: (x, y, z, nx) => mix(0x9a0e1a, 0xe02a3a, smoothstep(nx * 0.6 + 0.3)) }, { p: [0.84, 1.52, 0], s: [0.06, 0.17, 0.17] }, 16, 12);
  bearEmblem(b, { p: [0.9, 1.52, 0], r: [0, Math.PI / 2, 0] }, 0.11);
  // Glanzstreifen links vorn (knapp außerhalb des Glases)
  for (const [a, y0, y1, w] of [[-0.62, 0.35, 1.45, 0.035], [-0.8, 0.5, 1.15, 0.022]]) {
    const pts = []; for (let i = 0; i <= 8; i++) { const y = lerp(y0, y1, i / 8); pts.push([Math.cos(a) * 0.985, y, Math.sin(a) * 0.985]); }
    b.add(taperTube(pts, (t) => w * Math.sin(Math.PI * clamp(t, 0.02, 0.98)) + 0.002, 10, 5), 0xffffff);
  }
  return b.geometry();
});
/** Glassplitter (gebogenes Dreieck, ≈0,35 m). */
const shardGeo = () => cached('w8:jar:shard', () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.2, 0, -0.14, -0.12, 0.02, 0.16, -0.1, -0.02, 0, 0.2, 0, 0.16, -0.1, -0.02, -0.14, -0.12, 0.02], 3));
  g.computeVertexNormals();
  return g;
});
const FRIEND_SPOTS = [[0.4, 0.34, 0.25, 1.35], [0.34, -0.38, -0.35, 1.3], [-0.34, 0.38, 0.35, 1.3], [-0.3, -0.34, -0.2, 1.0]];   // x, z, yaw, Maßstab
function buildFreundeGlas(opts = {}) {
  const S = clamp(num(opts.size, 2.4), 0.6, 10) / 2.4;
  const keys = (Array.isArray(opts.friends) ? opts.friends : FRIEND_KEYS).filter((k) => FRIEND_KEYS.includes(k)).slice(0, 4);
  const root = new THREE.Group();
  const own = [];
  const jarJ = joint();
  jarJ.scale.setScalar(S);
  const glass = mesh(jarGlassGeo(), glassMat8(), {}, false);
  glass.renderOrder = 2;
  const capJ = joint();
  const cap = mesh(jarCapGeo(), vcol(0.45, {}, 'w8jarcap'), {}, true);
  capJ.add(cap);
  const friends = keys.map((k, i) => {
    const f = friendFigure(k);
    const [x, z, yaw, sc] = FRIEND_SPOTS[i];
    const j = joint([x, 0.06, z], f);
    j.rotation.y = yaw; j.scale.setScalar(sc * (k === 'kobold' ? 0.82 : 1));
    j.userData = { x, z, yaw, sc: j.scale.x, ph: i * 1.7 };
    return j;
  });
  const shards = instMesh(shardGeo(), glassMat8(), 18, 6, 1);
  shards.visible = false;
  const sparkle = sparkleSprite(0xfff2a0, 0.6); sparkle.position.set(0, 1.4, 0); sparkle.visible = false;
  jarJ.add(glass, capJ, ...friends, shards, sparkle);
  root.add(jarJ);
  root.userData.friends = keys;
  const SH = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * TAU + hash1(i) * 0.3, y = 0.2 + hash1(i + 7) * 1.6;
    return { p: new THREE.Vector3(Math.cos(a) * 0.95, y, Math.sin(a) * 0.95), v: new THREE.Vector3(Math.cos(a) * (2 + hash1(i + 3) * 2), 1.5 + hash1(i + 5) * 3, Math.sin(a) * (2 + hash1(i + 3) * 2)), r: [hash1(i + 1) * 6, hash1(i + 2) * 6, hash1(i + 9) * 6] };
  });
  const clk = new Clock();
  let wob = 0;
  const update = (dt, st) => {
    const anim = ['shake', 'cheer'].includes(st.anim) ? st.anim : 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const shake = clamp(num(st.shake, anim === 'shake' ? 1 : 0), 0, 1);
    const br = clamp(num(st.break, 0), 0, 1);
    const cheer = typeof st.cheer === 'boolean' ? (st.cheer ? 1 : 0) : clamp(num(st.cheer, anim === 'cheer' ? 1 : 0), 0, 1);
    wob = damp(wob, shake, 8, dt);
    // Glas wackelt
    const broken = br > 0.06;
    jarJ.rotation.set(Math.sin(t * 17) * 0.05 * wob * (1 - br), 0, Math.sin(t * 13) * 0.06 * wob * (1 - br));
    jarJ.position.y = Math.abs(Math.sin(t * 17)) * 0.04 * wob * (1 - br);
    glass.visible = !broken;
    // Splitter
    shards.visible = broken && br < 0.999;
    if (shards.visible) {
      const tt = (br - 0.06) * 1.3;
      SH.forEach((s, i) => {
        const y = s.p.y + s.v.y * tt - 4.9 * tt * tt;
        if (y < 0.02) { setInst(shards, i, s.p.x + s.v.x * tt, 0.02, s.p.z + s.v.z * tt, Math.PI / 2, 0, s.r[2], 1 - smoothstep((br - 0.7) / 0.3)); return; }
        setInst(shards, i, s.p.x + s.v.x * tt, y, s.p.z + s.v.z * tt, s.r[0] + tt * 8, s.r[1] + tt * 6, s.r[2], 1 - smoothstep((br - 0.75) / 0.25));
      });
      shards.instanceMatrix.needsUpdate = true;
    }
    // Korken ploppt hoch und landet daneben
    if (br > 0) {
      const k = clamp(br / 0.7, 0, 1);
      capJ.position.set(k * 1.6, Math.sin(k * Math.PI) * 1.8 - k * 1.95, k * 0.6);
      capJ.rotation.set(k * 0.6, k * 3, k * (Math.PI / 2 - 0.15));
    } else { capJ.position.set(0, 0, 0); capJ.rotation.set(0, 0, 0); }
    // Freunde
    friends.forEach((f, i) => {
      const u = f.userData, ph = u.ph;
      let y = 0.06, rz = 0, ry = u.yaw, rx = 0, sx = 1;
      if (cheer > 0.01) {
        const p = ((t * 2.2 + ph * 0.3) % 1);
        y += Math.sin(p * Math.PI) * 0.45 * cheer; rz = Math.sin(p * TAU) * 0.15 * cheer; ry += Math.sin(t * 2 + ph) * 0.5 * cheer;
        sx = 1 + Math.pow(Math.max(0, Math.cos(p * TAU)), 6) * 0.08;
      } else if (wob > 0.02) {
        y += Math.abs(Math.sin(t * 15 + ph)) * 0.18 * wob; rz = Math.sin(t * 11 + ph) * 0.3 * wob; rx = Math.cos(t * 9 + ph) * 0.2 * wob;
      } else {
        // wippen, umschauen, an die Scheibe klopfen
        y += Math.max(0, Math.sin(t * 2.4 + ph)) * 0.04;
        ry += Math.sin(t * 0.6 + ph) * 0.35;
        rz = ((t + ph) % 4) < 0.5 ? Math.sin(t * 25) * 0.06 : 0;
      }
      const out = broken ? smoothstep((br - 0.3) / 0.7) : 0;
      f.position.set(u.x * (1 + out * 0.8), y, u.z * (1 + out * 0.8));
      f.rotation.set(rx, ry, rz);
      f.scale.set(u.sc * sx, u.sc / sx, u.sc * sx);
    });
    const tw = cheer * Math.pow(Math.max(0, Math.sin(t * 5)), 3);
    sparkle.visible = tw > 0.03;
    sparkle.scale.setScalar(Math.max(0.001, tw * 0.9));
    sparkle.position.set(Math.sin(t * 1.3) * 0.5, 1.2 + Math.sin(t * 2.1) * 0.3, Math.cos(t * 1.3) * 0.5);
  };
  const model = makeModel('freunde_glas', root, update, [...own, shards], { initial: 'idle' });
  model.friend = (i, out = new THREE.Vector3()) => { root.updateMatrixWorld(true); const f = friends[clamp(i | 0, 0, friends.length - 1)]; return f ? f.getWorldPosition(out) : out.set(0, 0, 0); };
  return model;
}

export const MODELS = {
  baron_krallen: buildBaronKrallen,
  super_pow_block: buildSuperPow,
  freunde_glas: buildFreundeGlas,
};
