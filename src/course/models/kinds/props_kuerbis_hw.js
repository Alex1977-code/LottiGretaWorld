// Kürbisfeld-Kulisse der Halloween-Welt „Kürbisinsel“ (H-1, H-2, Karte). Eigene Gestaltung. Maßstab Meter, Ursprung =
// Mitte der Unterseite (Ausnahmen genannt), Vorderseite +X; state darf ein String sein. Ohne Kollision.
// Kulisse: schlichte Materialien (kein Spielzeug-Look: kulMat/kulisse()), vertexgefärbt und backbar (bakeModel) –
// Leuchtendes (geschnitzte Gesichter, Kerzen) unbeleuchtet; Schein-Sprites werden beim Backen ausgelassen.
//
// kuerbis            Kürbis in Größen und Formen, mit und ohne Gesicht.
//                    opts { size (Ø in m, 1), shape: 'rund'|'flach'|'hoch'|'dick', color: 'orange'|'gelb'|'weiss'|'gruen'|'rot',
//                           face: false | 'lachen'|'grinsen'|'staunen'|'frech', lit (bool: Gesicht leuchtet; Standard true
//                           mit Gesicht), leaf: true (Blatt am Stiel), seed (Zahl, kleine Abwandlung) }
//                    state { flicker (0..1, Standard 1: Licht flackert) }   Viele → createInstanced('kuerbis', n, opts).
// kuerbislaterne     leuchtende Kürbislaterne (Ø 0,7 m, Gesicht 'lachen') mit Schein.
//                    opts { mount: 'boden' | 'pfahl' (Holzpfahl mit Querholz, Laterne hängt in 1,6 m) | 'haengend' (Ursprung =
//                           Haken oben, hängt an Kette nach −Y), size (Ø, 0,7), face ('lachen'), color }
//                    state { lit (bool | 0..1, Standard true), sway (0..1 Pendeln bei 'haengend'/'pfahl') }
// vogelscheuche      freundliche Vogelscheuche ≈2,2 m: Holzkreuz, Kürbiskopf mit Lachgesicht und Schlapphut, kariertes
//                    Flickenhemd, Strohbüschel an Ärmeln und Kragen, Krähe mit Schleife auf dem Arm.
//                    opts { size (Faktor, 1) }  state { sway (0..1 leichtes Wiegen im Wind) }
// strohballen        Strohballen: opts { kind: 'eckig' (1,2 × 0,6 × 0,7, zwei Schnüre) | 'rund' (Rolle Ø 1,2, liegt auf der
//                    Seite, Achse z), size (Faktor, 1) }  state –
// maisstaude         Büschel Maisstauden ≈2 m: drei bis fünf Stängel, lange gebogene Blätter, Kolben mit Hüllblättern,
//                    Rispen oben (herbstlich gelbgrün).  opts { count (4), height (2) }  state { sway (0..1) }
//                    Viele → createInstanced('maisstaude', n).
// suessigkeiten_haufen  Haufen Süßigkeiten (Ø ≈1,2 m): Bonbons, Lollis, Zuckermais, Schokoriegel auf einem Kegel aus
//                    bunten Bonbonkugeln.  opts { size (Faktor, 1), seed }  state –

import { THREE, TAU, Build, cached, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, glowSprite } from '../lib/kit.js';
import {
  HW, PK, PK_COLORS, pkSurf, pumpkinGeo, stemGeo, leafGeo, tendrilGeo, addFace, glow, kulMat, kulisse, ownMat, noToy,
  candyGeo, CANDY_KINDS, hash1, noise3, gradV, puffyGeo, memo,
} from '../lib/hwGeos.js';

// =============================================================================================
// Kürbis (Einzelmodell und Geometrie für die Instanz-Variante)
// =============================================================================================
/** Kürbis-Geometrien { body, glow|null, h } (Mitte der Unterseite im Ursprung, Ø 1 m). */
export function kuerbisGeos(shape = 'rund', color = 'orange', face = false, lit = true, leaf = true, lo = false, seed = 0) {
  return memo(`hw:kuerbis:${shape}:${color}:${face}:${lit}:${leaf}:${lo}:${seed}`, () => {
    const P0 = PK[shape] ?? PK.rund;
    const P = { ...P0, R: 0.5, Hh: P0.Hh / P0.R * 0.5 };
    const C = PK_COLORS[color] ?? PK_COLORS.orange;
    const b = new Build(), gl = new Build();
    b.parts.push(pumpkinGeo(P, C, lo));
    const surf = pkSurf(P);
    if (face) addFace(b, gl, surf, { kind: face, az: 0, el: 0.0, w: 0.78, h: P.Hh * 1.1 + 0.16, lit, sub: lo ? 1 : 2, flesh: color === 'weiss' ? 0xfff8e8 : HW.pkFlesh });
    const top = surf(0, 1.35).p.y;
    const stem = stemGeo(P.Hh * 0.45 + 0.04, 0.05, lo, 0.4 + hash1(seed) * 0.4).clone();
    stem.rotateY(hash1(seed + 1) * TAU);
    stem.translate(0, top - 0.03, 0);
    b.parts.push(stem);
    if (leaf && !lo) {
      const lf = leafGeo(0.3, false, 0.35).clone();
      lf.rotateZ(-0.35); lf.rotateY(2.2 + hash1(seed + 2));
      lf.translate(0, top + 0.03, 0);
      b.parts.push(lf);
      b.parts.push(tendrilGeo(0.06, 1.5, 0.01).clone().rotateY(hash1(seed + 3) * TAU).translate(0.02, top + 0.04, 0.03));
    }
    const body = b.geometry();
    const lowY = -P.Hh * P.bottom + 0.012;
    body.translate(0, -lowY, 0);
    let g = null;
    if (gl.parts.length) { g = gl.geometry(); g.translate(0, -lowY, 0); }
    body.computeBoundingBox();
    return { body, glow: g, h: body.boundingBox.max.y };
  });
}
function buildKuerbis(opts = {}) {
  const size = clamp(Number(opts.size ?? 1), 0.2, 8);
  const face = opts.face ? (typeof opts.face === 'string' ? opts.face : 'lachen') : false;
  const lit = face ? opts.lit !== false : false;
  const G = kuerbisGeos(opts.shape ?? 'rund', opts.color ?? 'orange', face, lit, opts.leaf !== false, false, (opts.seed ?? 0) % 4);
  const root = new THREE.Group();
  const s = joint(); s.scale.setScalar(size);
  const body = mesh(G.body, kulMat(0.45), {}, true);
  body.receiveShadow = true;
  s.add(body);
  const own = [];
  let glowM = null, halo = null;
  if (G.glow) {
    const gm = noToy(ownMat(glow()));
    own.push(gm);
    glowM = mesh(G.glow, gm);
    halo = glowSprite(0xffa030, 1.5, 0.45); halo.position.set(0.45, G.h * 0.45, 0);
    s.add(glowM, halo);
  }
  root.add(s);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    if (!glowM) return;
    const f = st.flicker ?? 1, t = clk.t;
    const k = 0.9 + (Math.sin(t * 9.1) * 0.05 + Math.sin(t * 14.7) * 0.05) * f;
    glowM.material.color.setScalar(k);
    halo.scale.setScalar(1.4 + (k - 0.9) * 2);
  };
  return makeModel('kuerbis', kulisse(root), update, own);
}

export const MODELS = {
  kuerbis: buildKuerbis,
};
