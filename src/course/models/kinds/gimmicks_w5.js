// Gimmick-Modelle Welt 5 „Lila Strand-Insel“ (Kurs-Modus). Eigene Gestaltung. Maßstab Meter, Blick/Fahrt nach +X;
// state darf ein String sein ('idle' ≙ { anim: 'idle' }). Die Bausteine in blocks/types/w5_*.js holen diese Modelle über
// hasModel/getModel – Ursprung und Achsen hier passen zu deren Gruppen (in Klammern genannt).
//
// schluesselmuenze  große goldene Schlüsselmünze Ø 0,92 m: dicker Goldrand mit Perlkranz, auf beiden Seiten ein erhabener
//   Schlüssel. Ursprung = Fußpunkt, Münzmitte bei y = 0,48, Flächen zeigen nach ±Z. Taugt als Vorlage für view.pool
//   (nur starre Meshes).  state { anim: 'idle'|'collected' }  idle: dreht sich und wippt; collected: hüpft, dreht schnell,
//   schrumpft (0,4 s), dann unsichtbar.
// trapez            Zirkus-Trapez: zwei gedrehte Seile (weiß-farbig), Stange mit Zuckerstangen-Streifen und Goldkappen,
//   Goldringe oben. **Ursprung = Aufhängung** (Seile hängen nach −Y, Stange bei y = −length entlang X; schwingt um die
//   lokale X-Achse – der Baustein dreht die Elterngruppe selbst).
//   opts  { length (3), width (1,2), color: 'rot' | 'blau' | 'gold' }
//   state { angle (rad; Schwingwinkel um lokal X, Standard 0 – nur setzen, wenn root nicht schon gedreht wird),
//           theta (wird ignoriert: Winkel des Bausteins), rider (bool: Stange biegt sich leicht durch) }
// pendelplattform   Zirkus-Pendelplattform: Trommel-Plattform (gelbe Oberseite mit rotem Stern und weißem Rand, rote Seiten
//   mit weißen Rauten, Goldnieten), vier Seile zu einer Querstange an der Aufhängung. **Ursprung = Mitte der Oberseite**
//   (Gruppe `plat` des Bausteins); Plattform reicht bis y = −thick.
//   opts  { size: [w, d] ([3, 2,2]; w quer zur Schwingebene = lokal X), thick (0,4), length (4; Oberseite → Aufhängung),
//           style: 'zirkus' | 'holz' | 'stein' }
//   state { theta (rad; Pendelwinkel – die Aufhängung liegt lokal bei (0, length·cos θ, length·sin θ), dorthin laufen die Seile) }
// drehbruecke       Drehbrücke: weiß lackierte Holzplanken auf blauen Längsträgern mit Goldbolzen, runde Drehscheibe in der
//   Mitte mit zwei gelben Drehpfeilen, Zahnkranz darunter. **Ursprung = Drehpunkt = Mitte der Oberseite**, Brücke entlang X.
//   Die Drehung setzt der Baustein (root.rotation.y).
//   opts  { length (10), width (2,4), thick (0,4), style: 'holz' | 'stein' | 'zirkus' }
//   state { warn (bool: Pfeile blinken), turning (bool: Zahnkranz dreht) }
// roehrenkanone     Röhrenkanone: glänzende Röhre mit Kanonen-Mündung (dicker Goldwulst, Mündungsring, dunkles Inneres),
//   Eisensockel mit Nieten, Sternplakette. Ursprung = Fuß (Mitte), Öffnung oben bei y = height.
//   opts  { height (2,2), radius (1,0), color: 'gruen' | 'gold' | 'rot' }
//   state { anim: 'idle'|'load'|'fire', k (0..1 Ladung: Röhre bläht sich, Inneres glüht), fire (0..1 Schuss-Fortschritt;
//           Standard: 'fire' spielt 0,5 s ab) }  fire: Rückstoß, Mündungsblitz, Rauchring.
// flipper_feld      Rot-Blau-Feld: Rahmen mit Goldknöpfen, Vorderseite = glasierte Platte in der Feldfarbe mit erhabenem
//   Zeichen (Rot ●, Blau ◆), Rückseite = durchscheinendes Gitter (opts.back 'gitter') bzw. Platte der Gegenfarbe ('farbe').
//   **Ursprung = Mitte des Felds.**  opts  { color: 'rot' | 'blau', size: [w, d] ([1, 1]), thick (1 → Einheitswürfel zum
//   Skalieren wie im Baustein flipper; Level-Felder z. B. 0,35), back: 'gitter' | 'farbe' }
//   state { flip (0..1: 0 Vorderseite oben, 1 umgeklappt; dreht um lokal X) }
//   Viele Felder → createInstanced('flipper_feld', n, opts) (lib/instanced_w5.js).
// schiebekugel      große Bonbon-Kugel für Kugel-Rätsel: glänzende Spiralstreifen, zwei weiße Sterne. Ursprung = Auflagepunkt.
//   opts  { size (Ø, 1,6), color: 'rosa' | 'blau' | 'gold' | 'grau' }  state { roll (rad; Drehung um lokal Z → rollt nach +X), speed }
// suchscheinwerfer  Suchscheinwerfer-Kopf: dunkle Trommel mit Nieten und Kühlrippen, Chromring, leuchtende Linse (+X) mit
//   Ringen, rotes Alarm-Leuchtfeuer oben. **Ursprung = Drehpunkt** (Baustein: lampRoot, den er selbst dreht).
//   opts  { mount: false (true: Gabel + Drehteller bis y = −1,1; dann dreht state.aim), color (Lichtfarbe 0xfff2b0),
//           cone: false (true: eigener Lichtkegel), length (Kegel, 8) }
//   state { aim: [yaw, pitch] (rad; nur mit mount oder ungedrehtem root), alarm (bool | 0..1: Linse rot blinkend,
//           Leuchtfeuer kreist), seen (bool: Linse orange) }
// donut_block       Donut-Block 1 m (auch 'donutblock'): Keks-Sockel mit Zuckerperlen, darauf ein glasierter Donut mit
//   Streuseln. **Ursprung = Mitte der Unterseite**; das erste Mesh trägt den ganzen Look (der Baustein instanziert es).
//   opts  { color: 'rosa' | 'schoko' | 'gelb' }  state { anim: 'idle'|'shake'|'fall' }  shake: zittert und sinkt ein;
//   fall: kippelt (den Fall selbst macht der Motor).  Viele → createInstanced('donut_block', n, opts).
// goldzug_waggon    Goldzug (5-Zug), 3 m breit. **Ursprung = Schienen-Oberkante unter der Wagenmitte**, fährt nach +X.
//   opts  { kind: 'lok' | 'wagen' (Standard 'wagen'), length (lok 8 / wagen 9) }
//     lok: goldene Dampflok mit rotem Führerhaus, Schornstein mit rotem Band, Dampfdom, Laterne, Kuhfänger, roten
//          Treibrädern mit Goldfelgen; wagen: goldener Kastenwagen mit Prägefeldern, randvoll mit Bitcoin-Münzen.
//   state { anim: 'idle'|'drive', speed (m/s, Räder; drive Standard 6) }
//   root.userData.top → begehbare Oberkante (Münzberg bzw. Dach), root.userData.length → Länge.
// (goldener P-Schalter: das Welt-2-Modell 'push_switch_gold' passt und wird wiederverwendet.)

import {
  THREE, TAU, Build, cached, vcol, basic, mesh, joint, makeModel, Clock, damp, clamp, mix, smoothstep, instMesh,
  setInst, glowSprite, sparkleSprite, placed, puffyStarGeo, metal, gold, coinBodyGeo,
} from '../lib/kit.js';
import { Puffs } from '../lib/kit_w3.js';
import {
  W5, ownMat, gradV, puffyGeo, keyShape, roundRectShape, flipperGeo, flipperMats, donutBlockGeo, donutMat, hash1,
} from '../lib/w5Geos.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _s = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

// =============================================================================================
// Schlüsselmünze
// =============================================================================================
const KEY_CY = 0.48;
function keyCoinBodyGeo() {
  return cached('w5:key:body', () => {
    const b = new Build();
    const prof = [[0, 0.05], [0.33, 0.05], [0.37, 0.072], [0.42, 0.078], [0.455, 0.06], [0.465, 0.025], [0.465, -0.025], [0.455, -0.06], [0.42, -0.078], [0.37, -0.072], [0.33, -0.05], [0, -0.05]];
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 56);
    g.rotateX(Math.PI / 2);
    b.add(g, gradV(0xd89a10, 0xfff0a0, 0.5, 0.5));
    // Perlkranz auf beiden Seiten
    for (const s of [1, -1]) for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      b.sphere(0.018, 0xfff2b0, { p: [Math.cos(a) * 0.36, Math.sin(a) * 0.36, s * 0.058] }, 8, 5);
    }
    return b.geometry();
  });
}
function keyReliefGeo() {
  return cached('w5:key:relief', () => {
    const b = new Build();
    for (const s of [1, -1]) {
      const g = puffyGeo(keyShape(), 0.03, 0.018, 10, 3);
      g.scale(0.56, 0.56, 1);
      g.rotateZ(0.6);
      if (s < 0) g.rotateY(Math.PI);
      b.add(g, gradV(0xe0a018, 0xfff6c0, 0.6, 0.5), { p: [0, 0, s * 0.06] });
    }
    return b.geometry();
  });
}
function buildSchluesselmuenze() {
  const root = new THREE.Group();
  const coin = joint([0, KEY_CY, 0]);
  const body = mesh(keyCoinBodyGeo(), metal('w5keycoin', { color: 0xffffff, vertexColors: true, metalness: 0.6, roughness: 0.24, emissive: 0x3a2400 }, 1.1), {}, true);
  const relief = mesh(keyReliefGeo(), metal('w5keyrelief', { color: 0xffffff, vertexColors: true, metalness: 0.5, roughness: 0.2, emissive: 0x4a3000 }, 1.2), {});
  coin.add(body, relief);
  root.add(coin);
  const spark = sparkleSprite(0xfff6c0, 0.42);
  spark.position.set(0.26, KEY_CY + 0.3, 0.1);
  root.add(spark);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t, age = clk.age;
    if (anim === 'collected') {
      const k = clamp(age / 0.4, 0, 1);
      coin.position.y = KEY_CY + Math.sin(k * Math.PI * 0.6) * 1.1;
      coin.rotation.y += dt * 22;
      coin.scale.setScalar(Math.max(0.001, 1 - k * k));
      root.visible = k < 1;
    } else {
      root.visible = true;
      coin.position.y = KEY_CY + Math.sin(t * 2.4) * 0.05;
      coin.rotation.y = t * 1.8;
      coin.scale.setScalar(1);
    }
    const tw = Math.max(0, Math.sin(t * 3.1));
    spark.scale.setScalar(0.12 + tw * 0.32);
    spark.material.rotation = t;
  };
  return makeModel('schluesselmuenze', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Trapez
// =============================================================================================
const TRAPEZ_COL = { rot: [0xff3a4a, 0xffffff, 0xffd23a], blau: [0x3a7aff, 0xffffff, 0xffd23a], gold: [0xffc21a, 0xfff6e0, 0xff5a7a] };
function trapezGeo(L, W, color) {
  const [c1, c2, c3] = TRAPEZ_COL[color] ?? TRAPEZ_COL.rot;
  return cached(`w5:trapez:${L.toFixed(2)}:${W.toFixed(2)}:${color}`, () => {
    const b = new Build();
    const rows = Math.max(6, Math.round(L * 10));
    for (const sx of [1, -1]) {
      // gedrehtes Seil (Streifen schräg um die Achse)
      const g = new THREE.CylinderGeometry(0.03, 0.03, L - 0.12, 8, rows, true);
      b.add(g, (x, y, z) => ((((Math.floor(y * 9 + Math.atan2(z, x) / TAU * 2) % 2) + 2) % 2) ? c2 : c1), { p: [sx * W / 2, -L / 2 + 0.02, 0] });
      // Goldring oben und Schlaufe unten
      b.torus(0.06, 0.018, 0xffd23a, { p: [sx * W / 2, -0.02, 0], r: [0, Math.PI / 2, 0] }, 6, 16);
      b.sphere(0.055, 0xffd23a, { p: [sx * W / 2, -L + 0.06, 0] }, 12, 8);
    }
    // Stange mit Zuckerstangen-Streifen und Goldkappen
    const bar = new THREE.CylinderGeometry(0.055, 0.055, W + 0.16, 16, 24);
    bar.rotateZ(Math.PI / 2);
    b.add(bar, (x, y, z) => ((((Math.floor(x * 7 + Math.atan2(z, y) / TAU * 2) % 2) + 2) % 2) ? c1 : c2), { p: [0, -L, 0] });
    for (const sx of [1, -1]) b.sphere(0.075, gradV(0xc88a10, 0xfff0a0), { p: [sx * (W / 2 + 0.11), -L, 0] }, 14, 10);
    // kleine Sternchen an den Kappen
    for (const sx of [1, -1]) b.add(puffyStarGeo(0.05, 0.022, 0.02, 0.008), c3, { p: [sx * (W / 2 + 0.19), -L, 0], r: [0, Math.PI / 2, 0] });
    return b.geometry();
  });
}
function buildTrapez(opts = {}) {
  const L = Math.max(0.5, opts.length ?? 3), W = Math.max(0.4, opts.width ?? 1.2);
  const color = TRAPEZ_COL[opts.color] ? opts.color : 'rot';
  const root = new THREE.Group();
  const swing = joint();
  const m = mesh(trapezGeo(L, W, color), vcol(0.35), {}, true);
  swing.add(m);
  root.add(swing);
  let bend = 0;
  const update = (dt, st) => {
    swing.rotation.x = st.angle ?? 0;
    bend = damp(bend, st.rider ? 1 : 0, 10, dt);
    m.scale.set(1, 1 + bend * 0.02, 1);
  };
  return makeModel('trapez', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Pendelplattform
// =============================================================================================
const PEND = {
  zirkus: { top: 0xffd84a, topHi: 0xfff2a8, side: 0xe8283e, sideLow: 0x9a1428, rim: 0xffffff, mark: 0xe8283e, deco: 0xffffff, rope: [0xffffff, 0xe8283e] },
  holz: { top: 0xe8b878, topHi: 0xffd8a0, side: 0xa8743e, sideLow: 0x6a4424, rim: 0xf0d8a8, mark: 0x8a5a2e, deco: 0xf0d8a8, rope: [0xf0e0b8, 0xb8905a] },
  stein: { top: 0xe0dce8, topHi: 0xffffff, side: 0x9a96a8, sideLow: 0x5e5a6e, rim: 0xffd23a, mark: 0x7a3ad8, deco: 0xffd23a, rope: [0xd0d4dc, 0x8a8e9a] },
};
function pendPlatGeo(w, d, t, style) {
  const S = PEND[style] ?? PEND.zirkus;
  return cached(`w5:pend:${w}:${d}:${t}:${style}`, () => {
    const b = new Build();
    const r = Math.min(0.14, t * 0.35);
    b.box(w, t, d, { v: (x, y, z, nx, ny) => {
      if (ny > 0.6) {
        const e = Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2));
        return e > 0.86 ? S.rim : mix(S.top, S.topHi, smoothstep(1 - e) * 0.6);
      }
      if (ny < -0.6) return S.sideLow;
      return mix(S.sideLow, S.side, smoothstep((y + t / 2) / t * 1.2));
    } }, { p: [0, -t / 2, 0] }, r, 3);
    // Rauten auf den Seiten
    const n = Math.max(2, Math.round(w / 0.7)), m = Math.max(2, Math.round(d / 0.7));
    const dia = (p, n0) => b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 4), S.deco, placed(new THREE.Vector3(...p), new THREE.Vector3(...n0), new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(1, 1, Math.min(1.4, t * 3.2))));
    for (let i = 0; i < n; i++) for (const sz of [1, -1]) dia([-w / 2 + (i + 0.5) * w / n, -t / 2, sz * (d / 2 + 0.005)], [0, 0, sz]);
    for (let i = 0; i < m; i++) for (const sx of [1, -1]) dia([sx * (w / 2 + 0.005), -t / 2, -d / 2 + (i + 0.5) * d / m], [sx, 0, 0]);
    // Stern oben
    const ss = Math.min(w, d) * 0.28;
    b.add(puffyStarGeo(ss, ss * 0.48, 0.03, 0.015), S.mark, { p: [0, 0.005, 0], r: [-Math.PI / 2, 0, 0] });
    // Goldnieten an den Ecken (Seil-Ösen)
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.sphere(0.07, gradV(0xc88a10, 0xfff0a0), { p: [sx * (w / 2 - 0.15), 0.02, sz * (d / 2 - 0.15)], s: [1, 0.6, 1] }, 12, 8);
    return b.geometry();
  });
}
function buildPendelplattform(opts = {}) {
  const sz = Array.isArray(opts.size) ? opts.size : [3, 2.2];
  const w = Math.max(0.6, sz[0] ?? 3), d = Math.max(0.6, sz.length >= 3 ? sz[2] : (sz[1] ?? 2.2));
  const t = Math.max(0.1, opts.thick ?? 0.4), L = Math.max(0.5, opts.length ?? 4);
  const style = PEND[opts.style] ? opts.style : 'zirkus';
  const S = PEND[style];
  const root = new THREE.Group();
  const plat = mesh(pendPlatGeo(w, d, t, style), vcol(0.38), {}, true);
  plat.receiveShadow = true;
  const ropeGeo = cached(`w5:pend:rope:${style}`, () => {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(1, 1, 1, 8, 40, true), (x, y, z) => ((((Math.floor((y + 0.5) * 40 + Math.atan2(z, x) / TAU * 2) % 2) + 2) % 2) ? S.rope[0] : S.rope[1]));
    return b.geometry();
  });
  const ropes = instMesh(ropeGeo, vcol(0.6), 4, L + 2, L / 2);
  ropes.castShadow = true;
  ropes.frustumCulled = false;
  const barJ = joint();
  const bar = mesh(cached(`w5:pend:bar:${w}:${style}`, () => {
    const b = new Build();
    const g = new THREE.CylinderGeometry(0.08, 0.08, w * 0.92 + 0.3, 16, 12);
    g.rotateZ(Math.PI / 2);
    b.add(g, (x) => ((((Math.floor(x * 4) % 2) + 2) % 2) ? S.rope[0] : S.rope[1]));
    for (const sx of [1, -1]) b.sphere(0.11, gradV(0xc88a10, 0xfff0a0), { p: [sx * (w * 0.46 + 0.17), 0, 0] }, 14, 10);
    return b.geometry();
  }), vcol(0.35), {}, true);
  barJ.add(bar);
  root.add(plat, ropes, barJ);
  const top = new THREE.Vector3(), bot = new THREE.Vector3();
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const update = (dt, st) => {
    const th = st.theta ?? 0;
    top.set(0, L * Math.cos(th), L * Math.sin(th));
    barJ.position.copy(top);
    corners.forEach(([sx, sz2], i) => {
      bot.set(sx * (w / 2 - 0.15), 0.03, sz2 * (d / 2 - 0.15));
      _v.set(sx * w * 0.46, top.y, top.z);
      const dir = _v2.subVectors(_v, bot);
      const len = dir.length();
      _q.setFromUnitVectors(Y, dir.normalize());
      ropes.setMatrixAt(i, _m.compose(_s.addVectors(bot, _v).multiplyScalar(0.5), _q, new THREE.Vector3(0.035, len, 0.035)));
    });
    ropes.instanceMatrix.needsUpdate = true;
  };
  return makeModel('pendelplattform', root, update, [ropes], { initial: 'idle' });
}

// =============================================================================================
// Drehbrücke
// =============================================================================================
const DB = {
  holz: { plank: 0xffffff, plankLow: 0xd8dce8, gap: 0x9aa0b8, rail: 0x2f6ae8, railHi: 0x7aa8ff, bolt: 0xffd23a, hub: 0xb8bcc8, arrow: 0xffd23a },
  stein: { plank: 0xf0e4c8, plankLow: 0xc8b48c, gap: 0x8a7650, rail: 0x8a3ad8, railHi: 0xc08aff, bolt: 0xffd23a, hub: 0xd8ccb0, arrow: 0xffd23a },
  zirkus: { plank: 0xffe07a, plankLow: 0xe8b83a, gap: 0xb8862a, rail: 0xe8283e, railHi: 0xff8a96, bolt: 0xffffff, hub: 0xffffff, arrow: 0xffffff },
};
function bridgeGeo(L, W, t, style) {
  const S = DB[style] ?? DB.holz;
  return cached(`w5:db:${L}:${W}:${t}:${style}`, () => {
    const b = new Build();
    const n = Math.max(4, Math.round(L / 0.5));
    const pw = L / n;
    const deckW = W - 0.36;
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (i + 0.5) * pw;
      const h = hash1(i * 3.3);
      b.box(pw - 0.04, t * 0.45, deckW, { v: (xx, y, z, nx, ny) => (ny > 0.5 ? mix(S.plankLow, S.plank, 0.75 + h * 0.25) : S.plankLow) }, { p: [x, -t * 0.225, 0] }, 0.025, 1);
    }
    // Längsträger (Geländer-Kante) mit Goldbolzen
    for (const sz of [1, -1]) {
      b.box(L + 0.1, t * 0.95, 0.2, gradV(S.rail, S.railHi, 0.6, 0.45), { p: [0, -t * 0.42, sz * (W / 2 - 0.1)] }, 0.06, 2);
      for (let i = 0; i < Math.round(L / 1.2); i++) b.sphere(0.04, S.bolt, { p: [-L / 2 + 0.6 + i * 1.2, -t * 0.3, sz * (W / 2 + 0.003)], s: [1, 1, 0.5] }, 8, 6);
    }
    // Querträger unten
    for (let i = 0; i < Math.max(2, Math.round(L / 2)); i++) b.box(0.18, t * 0.4, deckW, S.gap, { p: [-L / 2 + 1 + i * 2, -t * 0.65, 0] }, 0.04, 1);
    // Drehscheibe in der Mitte
    const R = Math.min(W * 0.42, 1.1);
    b.cyl(R, R, 0.04, gradV(0x8a8e9a, S.hub), { p: [0, 0.012, 0] }, 40);
    b.torus(R, 0.035, S.bolt, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0] }, 6, 40);
    b.sphere(0.12, S.bolt, { p: [0, 0.03, 0], s: [1, 0.4, 1] }, 14, 8);
    return b.geometry();
  });
}
function bridgeArrowGeo(R, style) {
  const S = DB[style] ?? DB.holz;
  return cached(`w5:db:arrows:${R}:${style}`, () => {
    const b = new Build();
    for (const k of [0, 1]) {
      const a0 = k * Math.PI + 0.35, a1 = a0 + Math.PI - 0.9;
      const curve = [];
      for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * (i / 10); curve.push([Math.cos(a) * R * 0.66, 0.045, -Math.sin(a) * R * 0.66]); }
      b.tube(curve, 0.045, S.arrow, null, 20, 6);
      const a = a1 + 0.1;
      const tip = new THREE.ConeGeometry(0.11, 0.24, 10);
      const dir = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
      b.add(tip, S.arrow, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * R * 0.66, 0.045, -Math.sin(a) * R * 0.66), new THREE.Quaternion().setFromUnitVectors(Y, dir), new THREE.Vector3(1, 1, 0.45)));
    }
    return b.geometry();
  });
}
function buildDrehbruecke(opts = {}) {
  const L = Math.max(2, opts.length ?? 10), W = Math.max(0.8, opts.width ?? 2.4), t = Math.max(0.15, opts.thick ?? 0.4);
  const style = DB[opts.style] ? opts.style : 'holz';
  const root = new THREE.Group();
  const own = [];
  const deck = mesh(bridgeGeo(L, W, t, style), vcol(0.42), {}, true);
  deck.receiveShadow = true;
  const R = Math.min(W * 0.42, 1.1);
  const arrowMat = ownMat(vcol(0.3), { emissive: 0x000000 });
  own.push(arrowMat);
  const arrows = mesh(bridgeArrowGeo(R, style), arrowMat, {});
  const gear = mesh(cached('w5:db:gear', () => {
    const b = new Build();
    b.cyl(0.55, 0.55, 0.22, gradV(0x6a6e7a, 0xc8ccd8), {}, 32);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; b.box(0.14, 0.2, 0.16, 0xa8acb8, { p: [Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6], r: [0, -a, 0] }, 0.02, 1); }
    b.cyl(0.18, 0.18, 0.26, 0xffd23a, {}, 16);
    return b.geometry();
  }), vcol(0.35, { metalness: 0.3 }, 'w5gear'), { p: [0, -t - 0.11, 0] }, true);
  root.add(deck, arrows, gear);
  const clk = new Clock();
  let glow = 0;
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t2 = clk.t;
    glow = damp(glow, st.warn ? 0.5 + 0.5 * Math.sin(t2 * 20) : st.turning ? 0.35 : 0, 18, dt);
    arrowMat.emissive.setRGB(glow * 0.8, glow * 0.6, glow * 0.1);
    if (st.turning) gear.rotation.y += dt * 2.5;
  };
  return makeModel('drehbruecke', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Röhrenkanone
// =============================================================================================
const RK = { gruen: [0x2fb83a, 0x8af07a, 0x1a7a2a], gold: [0xf2b82a, 0xfff0a0, 0xb07a10], rot: [0xe8382a, 0xff9a8a, 0x9a1a1a] };
function cannonGeo(h, r, color) {
  const [c, hi, lo] = RK[color] ?? RK.gruen;
  return cached(`w5:rk:${h}:${r}:${color}`, () => {
    const b = new Build();
    const pipeV = { v: (x, y, z, nx, ny, nz) => mix(lo, hi, smoothstep(nx * 0.55 + nz * 0.25 + 0.5)) };
    // Eisensockel mit Nietenkranz
    b.lathe([[0, 0], [r * 1.18, 0], [r * 1.22, 0.08], [r * 1.18, 0.4], [r * 1.06, 0.5], [0, 0.5]], gradV(0x2a2a36, 0x6a6a7c, 0.6, 0.5), null, 40, 1);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; b.sphere(0.05 * r + 0.02, 0xd8c070, { p: [Math.cos(a) * r * 1.2, 0.26, Math.sin(a) * r * 1.2] }, 10, 6); }
    // Röhre
    b.cyl(r * 0.88, r * 0.92, h - 0.85, pipeV, { p: [0, 0.5 + (h - 0.85) / 2, 0] }, 40, true);
    // Kanonen-Ringe (Verstärkungsbänder)
    for (const y of [0.62, h * 0.55]) b.torus(r * 0.91, 0.05 + r * 0.03, gradV(lo, hi), { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }, 10, 40);
    // Mündung: Wulst, Goldring, dicke runde Lippe
    b.lathe([[r * 0.88, h - 0.36], [r * 1.0, h - 0.33], [r * 1.06, h - 0.24], [r * 1.07, h - 0.12], [r * 1.02, h - 0.03], [r * 0.92, h], [r * 0.8, h - 0.02], [r * 0.76, h - 0.1], [r * 0.76, h - 0.6]], pipeV, null, 40, 2);
    b.torus(r * 1.04, 0.035 + r * 0.02, gradV(0xc88a10, 0xfff0a0), { p: [0, h - 0.36, 0], r: [Math.PI / 2, 0, 0] }, 8, 40);
    // dunkles Inneres
    b.cyl(r * 0.76, r * 0.76, 0.04, 0x0a0a12, { p: [0, h - 0.55, 0] }, 32);
    // Sternplakette
    b.add(puffyGeo(roundRectShape(0.5 * r, 0.5 * r, 0.12 * r), 0.03, 0.015, 8, 2), 0xffffff, placed(new THREE.Vector3(r * 0.9, h * 0.38, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
    b.add(puffyStarGeo(0.17 * r, 0.08 * r, 0.03, 0.012), 0xffc21a, placed(new THREE.Vector3(r * 0.93, h * 0.38, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 1)));
    return b.geometry();
  });
}
function buildRoehrenkanone(opts = {}) {
  const h = Math.max(1, opts.height ?? 2.2), r = Math.max(0.4, opts.radius ?? 1.0);
  const color = RK[opts.color] ? opts.color : 'gruen';
  const root = new THREE.Group();
  const own = [];
  const body = joint();
  const pipe = mesh(cannonGeo(h, r, color), vcol(0.22), {}, true);
  pipe.receiveShadow = true;
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, depthWrite: false });
  own.push(glowMat);
  const inner = mesh(cached('w5:rk:inner', () => new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2)), glowMat, { p: [0, h - 0.5, 0], s: r * 0.75 });
  body.add(pipe, inner);
  const flash = glowSprite(0xffd890, 2.5 * r, 0.0);
  flash.material = flash.material.clone(); own.push(flash.material);
  flash.position.y = h + 0.4;
  const smoke = new Puffs(14, 0xf0ece8, { opacity: 0.9, radius: 4, cy: h });
  own.push(smoke);
  root.add(body, flash, smoke.mesh);
  const clk = new Clock();
  let k = 0, fired = false;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    if (clk.entered) fired = false;
    k = damp(k, anim === 'load' ? clamp(st.k ?? clamp(clk.age / 0.55, 0, 1), 0, 1) : 0, 14, dt);
    let f = 0;
    if (anim === 'fire') f = st.fire !== undefined ? clamp(st.fire, 0, 1) : clamp(clk.age / 0.5, 0, 1);
    else if (st.fire !== undefined) f = clamp(st.fire, 0, 1);
    const kick = f > 0 && f < 1 ? Math.sin(Math.min(1, f / 0.5) * Math.PI) : 0;
    const pulse = k > 0 ? Math.sin(t * 30) * 0.02 * k : 0;
    body.scale.set(1 + k * 0.06 + pulse - kick * 0.04, 1 - k * 0.05 + kick * 0.08, 1 + k * 0.06 + pulse - kick * 0.04);
    glowMat.opacity = clamp(k * 0.9 + kick, 0, 1);
    glowMat.color.setRGB(1, 0.55 + k * 0.3, 0.2 + kick * 0.6);
    flash.material.opacity = f > 0 && f < 1 ? (1 - f) * 0.9 : 0;
    flash.scale.setScalar(r * (1.5 + f * 2.5));
    if (f > 0 && !fired) { fired = true; smoke.burst([0, h + 0.2, 0], { count: 12, speed: 2.4 * r, up: 3, size: 0.32 * r, life: 0.9, spread: r * 0.6 }); }
    if (k > 0.3 && Math.random() < dt * 8) smoke.burst([0, h, 0], { count: 1, speed: 0.4, up: 1.2, size: 0.15 * r, life: 0.6, spread: r * 0.4 });
    smoke.step(dt);
  };
  return makeModel('roehrenkanone', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Flipper-Feld
// =============================================================================================
function buildFlipperFeld(opts = {}) {
  const color = opts.color === 'blau' || opts.color === 'b' ? 'blau' : 'rot';
  const sz = Array.isArray(opts.size) ? opts.size : [1, 1];
  const w = Math.max(0.2, sz[0] ?? 1), d = Math.max(0.2, sz.length >= 3 ? sz[2] : (sz[1] ?? 1));
  const t = Math.max(0.05, opts.thick ?? 1);
  const back = opts.back === 'farbe' ? 'farbe' : 'gitter';
  const M = flipperMats();
  const root = new THREE.Group();
  const flip = joint();
  const solid = mesh(flipperGeo('solid', color, w, d, t), M.solid, {}, true);
  const plate = mesh(flipperGeo('plate', color, w, d, t), M.plate, {}, true);
  const rear = back === 'farbe' ? mesh(flipperGeo('back', color, w, d, t), M.plate, {}, true) : mesh(flipperGeo('grid', color, w, d, t), M.grid, {});
  solid.receiveShadow = plate.receiveShadow = true;
  if (back !== 'farbe') rear.renderOrder = 2;
  flip.add(solid, plate, rear);
  root.add(flip);
  let a = 0;
  const update = (dt, st) => {
    const f = clamp(Number(st.flip ?? (st.anim === 'flipped' ? 1 : 0)), 0, 1);
    a = f * Math.PI;
    flip.rotation.x = a;
    const up = Math.cos(a) > 0;
    plate.visible = up || back === 'farbe';
    rear.visible = !up || back === 'farbe';
  };
  return makeModel('flipper_feld', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Schiebekugel
// =============================================================================================
const KUGEL = {
  rosa: [0xff6ab8, 0xfff0f6, 0xffd23a], blau: [0x3a8aff, 0xf0f6ff, 0xffd23a], gold: [0xffb81a, 0xfff6d8, 0xff4a6a], grau: [0x8a8ea0, 0xf4f4f8, 0x4ac8ff],
};
function kugelGeo(color) {
  const [c1, c2, c3] = KUGEL[color] ?? KUGEL.rosa;
  return cached(`w5:kugel:${color}`, () => {
    const b = new Build();
    b.sphere(1, { v: (x, y, z) => {
      const a = Math.atan2(z, x), s = Math.sin(a * 3 + y * 4.2);
      return mix(c1, c2, smoothstep((s - 0.05) / 0.25));
    } }, {}, 64, 44);
    for (const sz of [1, -1]) {
      b.add(puffyStarGeo(0.36, 0.17, 0.05, 0.03), c3, placed(new THREE.Vector3(0, 0, sz * 0.985), new THREE.Vector3(0, 0, sz), new THREE.Vector3(1, 1, 1)));
      b.torus(0.46, 0.035, c3, { p: [0, 0, sz * 0.885], s: [1, 1, 0.6] }, 8, 40);
    }
    return b.geometry();
  });
}
function buildSchiebekugel(opts = {}) {
  const size = Math.max(0.3, opts.size ?? 1.6);
  const color = KUGEL[opts.color] ? opts.color : 'rosa';
  const root = new THREE.Group();
  const ball = joint([0, size / 2, 0]);
  const m = mesh(kugelGeo(color), vcol(0.16), { s: size / 2 }, true);
  ball.add(m);
  const shine = sparkleSprite(0xffffff, size * 0.25);
  shine.position.set(size * 0.2, size * 0.88, size * 0.22);
  root.add(ball, shine);
  const clk = new Clock();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    ball.rotation.z = -(st.roll ?? 0);
    const tw = Math.max(0, Math.sin(clk.t * 1.7));
    shine.scale.setScalar(size * (0.08 + tw * 0.18));
  };
  return makeModel('schiebekugel', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Suchscheinwerfer
// =============================================================================================
const SW = { body: 0x3a3a52, bodyHi: 0x7a7a98, bodyLow: 0x1e1e2c, chrome: 0xe8ecf4, rivet: 0xffc21a, fork: 0x4a4a62 };
function swHeadGeo() {
  return cached('w5:sw:head', () => {
    const b = new Build();
    const bodyV = gradV(SW.bodyLow, SW.bodyHi, 0.55, 0.5);
    // Trommel entlang X
    const drum = new THREE.LatheGeometry([[0, -0.42], [0.3, -0.42], [0.36, -0.38], [0.4, -0.25], [0.42, 0.1], [0.44, 0.3], [0.44, 0.36], [0, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 36);
    drum.rotateZ(-Math.PI / 2);
    b.add(drum, bodyV);
    // Kühlrippen hinten
    for (let i = 0; i < 5; i++) b.torus(0.36 - i * 0.01, 0.025, SW.bodyHi, { p: [-0.18 - i * 0.05, 0, 0], r: [0, Math.PI / 2, 0] }, 6, 32);
    // Nieten-Kranz und Chromring vorn
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; b.sphere(0.022, SW.rivet, { p: [0.16, Math.cos(a) * 0.425, Math.sin(a) * 0.425] }, 8, 6); }
    b.torus(0.43, 0.05, gradV(0x8a90a0, 0xffffff), { p: [0.37, 0, 0], r: [0, Math.PI / 2, 0] }, 10, 40);
    // Drehzapfen an den Seiten, Griff oben
    for (const s of [1, -1]) { b.cyl(0.09, 0.09, 0.1, SW.chrome, { p: [0, 0, s * 0.46], r: [Math.PI / 2, 0, 0] }, 16); b.sphere(0.05, SW.rivet, { p: [0, 0, s * 0.52] }, 10, 6); }
    b.torus(0.16, 0.025, SW.chrome, { p: [-0.17, 0.4, 0], r: [0, 0, 0] }, 6, 20, Math.PI);
    return b.geometry();
  });
}
const swLensGeo = () => cached('w5:sw:lens', () => {
  const g = new THREE.CircleGeometry(0.38, 40, 0, TAU);
  g.rotateY(Math.PI / 2);
  const P = g.attributes.position, c = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const r = Math.hypot(P.getY(i), P.getZ(i)) / 0.38;
    const ring = Math.abs(Math.sin(r * 14)) > 0.85 ? 0.82 : 1;
    const k = (1 - r * 0.25) * ring;
    c[i * 3] = k; c[i * 3 + 1] = k; c[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
});
function swForkGeo() {
  return cached('w5:sw:fork', () => {
    const b = new Build();
    const v = gradV(0x2a2a3a, 0x6a6a84, 0.6, 0.5);
    for (const s of [1, -1]) b.box(0.1, 0.62, 0.12, v, { p: [0, -0.26, s * 0.58] }, 0.04, 2);
    b.box(0.22, 0.12, 1.3, v, { p: [0, -0.6, 0] }, 0.05, 2);
    b.cyl(0.1, 0.12, 0.28, v, { p: [0, -0.78, 0] }, 16);
    return b.geometry();
  });
}
function swBaseGeo() {
  return cached('w5:sw:base', () => {
    const b = new Build();
    b.cyl(0.42, 0.55, 0.22, gradV(0x2a2a3a, 0x6a6a84, 0.6, 0.5), { p: [0, -1.0, 0] }, 32);
    b.torus(0.5, 0.03, SW.rivet, { p: [0, -1.02, 0], r: [Math.PI / 2, 0, 0] }, 6, 32);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; b.sphere(0.05, SW.rivet, { p: [Math.cos(a) * 0.44, -0.9, Math.sin(a) * 0.44] }, 8, 6); }
    return b.geometry();
  });
}
function buildSuchscheinwerfer(opts = {}) {
  const lightC = new THREE.Color(opts.color ?? 0xfff2b0);
  const root = new THREE.Group();
  const own = [];
  const yawJ = joint();
  const head = joint();
  const headM = mesh(swHeadGeo(), vcol(0.3, { metalness: 0.2 }, 'w5sw'), {}, true);
  const lensMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: lightC.clone() });
  const beaconMat = ownMat(vcol(0.2), { emissive: 0x000000 });
  own.push(lensMat, beaconMat);
  const lens = mesh(swLensGeo(), lensMat, { p: [0.37, 0, 0] });
  const beacon = mesh(cached('w5:sw:beacon', () => {
    const b = new Build();
    b.cyl(0.1, 0.12, 0.06, 0x2a2a3a, { p: [0.18, 0.44, 0] }, 16);
    b.dome(0.1, 0xff3a3a, { p: [0.18, 0.47, 0], s: [1, 1.3, 1] }, Math.PI / 2, 16, 8);
    return b.geometry();
  }), beaconMat, {});
  const glow = glowSprite(lightC.getHex(), 1.3, 0.55);
  glow.material = glow.material.clone(); own.push(glow.material);
  glow.position.x = 0.5;
  head.add(headM, lens, beacon, glow);
  let cone = null, coneMat = null;
  if (opts.cone) {
    const len = opts.length ?? 8;
    coneMat = new THREE.MeshBasicMaterial({ color: lightC.clone(), transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    own.push(coneMat);
    const g = cached(`w5:sw:cone:${len}`, () => new THREE.ConeGeometry(len * 0.3, len, 28, 1, true).translate(0, -len / 2, 0).rotateZ(Math.PI / 2));
    cone = mesh(g, coneMat, { p: [0.4, 0, 0] });
    cone.renderOrder = 4;
    head.add(cone);
  }
  yawJ.add(head);
  if (opts.mount) yawJ.add(mesh(swForkGeo(), vcol(0.4), {}, true));
  root.add(yawJ);
  if (opts.mount) root.add(mesh(swBaseGeo(), vcol(0.4), {}, true));
  const clk = new Clock();
  const red = new THREE.Color(0xff3a2a), orange = new THREE.Color(0xffa040), tmp = new THREE.Color();
  const update = (dt, st) => {
    clk.tick(dt, 'idle');
    const t = clk.t;
    const aim = Array.isArray(st.aim) ? st.aim : st.aim ? [st.aim.yaw ?? 0, st.aim.pitch ?? 0] : null;
    if (aim) { yawJ.rotation.y = aim[0]; head.rotation.z = aim[1]; }
    const alarm = typeof st.alarm === 'number' ? st.alarm : st.alarm ? 1 : 0;
    const blink = alarm > 0 ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
    tmp.copy(lightC).lerp(orange, st.seen ? 0.5 : 0).lerp(red, alarm * (0.6 + 0.4 * blink));
    lensMat.color.copy(tmp);
    glow.material.color.copy(tmp);
    glow.material.opacity = 0.45 + alarm * 0.3 * blink;
    if (coneMat) coneMat.color.copy(tmp);
    const bk = alarm > 0 ? (Math.sin(t * 12) > 0 ? 1 : 0.2) : 0;
    beaconMat.emissive.setRGB(bk * 1.0, bk * 0.1, bk * 0.05);
  };
  return makeModel('suchscheinwerfer', root, update, own, { initial: 'idle' });
}

// =============================================================================================
// Donut-Block
// =============================================================================================
function buildDonutBlock(opts = {}) {
  const color = ['rosa', 'schoko', 'gelb'].includes(opts.color) ? opts.color : 'rosa';
  const root = new THREE.Group();
  const m = mesh(donutBlockGeo(color), donutMat(), {}, true);
  m.receiveShadow = true;
  root.add(m);
  const clk = new Clock();
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    if (anim === 'shake') {
      const k = clamp(clk.age / 0.5, 0, 1);
      m.position.set(Math.sin(t * 47) * 0.03 * k, -0.06 * k, Math.cos(t * 41) * 0.03 * k);
      m.scale.set(1 + 0.03 * k, 1 - 0.04 * k, 1 + 0.03 * k);
      m.rotation.set(0, 0, 0);
    } else if (anim === 'fall') {
      m.position.set(0, 0, 0);
      m.rotation.set(Math.sin(t * 9) * 0.06, 0, Math.cos(t * 7) * 0.06);
      m.scale.set(0.97, 1.04, 0.97);
    } else { m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); }
  };
  return makeModel('donut_block', root, update, [], { initial: 'idle' });
}

// =============================================================================================
// Goldzug
// =============================================================================================
const GZ = { red: 0xe8283a, redHi: 0xff7a8a, redLow: 0x8a1020, frame: 0x3a2a3a, wheel: 0xe8283a, rim: 0xffc21a, coin: 0xf7931a, coinHi: 0xffd080, window: 0xfff2b0 };
const RAIL_Y = 0;
const WHEEL_R = 0.55;
function zugWheelGeo(big) {
  return cached(`w5:gz:wheel:${big}`, () => {
    const b = new Build();
    const R = big ? 0.85 : WHEEL_R;
    b.cyl(R, R, 0.16, gradV(GZ.redLow, GZ.red, 0.4, 0.5), { r: [Math.PI / 2, 0, 0] }, 28);
    b.torus(R * 0.98, 0.06, gradV(0xc88a10, 0xfff0a0), { p: [0, 0, 0.06], r: [0, 0, 0] }, 8, 32);
    for (let i = 0; i < 6; i++) b.box(R * 1.6, 0.07, 0.05, 0xffd23a, { p: [0, 0, 0.09], r: [0, 0, (i / 6) * Math.PI] }, 0.02, 1);
    b.cyl(0.14, 0.14, 0.22, 0xffd23a, { r: [Math.PI / 2, 0, 0] }, 14);
    return b.geometry();
  });
}
function coinHeapGeo(L, W, y0) {
  return cached(`w5:gz:heap:${L}:${W}:${y0}`, () => {
    const b = new Build();
    // Münzberg: flach gewölbter, buckliger Goldhaufen, dicht bedeckt mit schräg liegenden Münzen (Bitcoin-Orange und Gold)
    const hx = L / 2 - 0.15, hz = W / 2 - 0.15, H = 0.75;
    const g = new THREE.SphereGeometry(1, 48, 12, 0, TAU, 0, Math.PI / 2);
    b.add(g, { v: (x, y, z, nx, ny) => mix(0xd88a10, 0xffe070, smoothstep(ny * 0.6 + 0.3)) }, { p: [0, y0, 0], s: [hx, H, hz] });
    const n = Math.round(L * W * 4.2);
    for (let i = 0; i < n; i++) {
      // gleichmäßig über die Ellipse (Wurzel-Radius), leicht verrauscht
      const r = Math.sqrt((i + 0.5) / n) * 0.97, a = i * 2.39996 + hash1(i) * 0.4;
      const u = Math.cos(a) * r, v = Math.sin(a) * r;
      const hy = Math.sqrt(Math.max(0, 1 - u * u - v * v)) * H;
      const nrm = new THREE.Vector3(u / hx, Math.max(0.05, hy / (H * H)), v / hz).normalize();
      const tilt = nrm.clone().add(new THREE.Vector3((hash1(i * 3.1) - 0.5) * 0.9, 0, (hash1(i + 9) - 0.5) * 0.9)).normalize();
      const orange = hash1(i * 7.3) > 0.45;
      const coin = new THREE.CylinderGeometry(0.21, 0.21, 0.06, 16);
      b.add(coin, { v: (xx, yy, zz) => { const rr = Math.hypot(xx, zz); if (yy > 0 && rr < 0.13) return orange ? 0xffe0a0 : 0xfff6c8; return orange ? (rr > 0.18 ? 0xe07a0a : GZ.coin) : (rr > 0.18 ? 0xd8a010 : 0xffd23a); } },
        new THREE.Matrix4().compose(new THREE.Vector3(u * hx, y0 + hy - 0.01, v * hz), new THREE.Quaternion().setFromUnitVectors(Y, tilt), new THREE.Vector3(1, 1, 1)));
    }
    return b.geometry();
  });
}
const ZUG_GEOS = new Map();
function zugBodyGeo(kind, L) {
  const key = `${kind}:${L}`;
  if (ZUG_GEOS.has(key)) return ZUG_GEOS.get(key);
  const make = () => {
    const gold = new Build(), red = new Build();
    const W = 3;
    // Fahrgestell (dunkel) und Puffer
    red.box(L - 0.3, 0.32, W - 0.6, GZ.frame, { p: [0, 0.95, 0] }, 0.06, 1);
    for (const sx of [1, -1]) for (const sz of [1, -1]) red.cyl(0.12, 0.12, 0.3, 0x8a8e9a, { p: [sx * (L / 2 - 0.05), 0.95, sz * 0.8], r: [0, 0, Math.PI / 2] }, 12);
    if (kind === 'wagen') {
      // goldener Kasten mit Prägefeldern, roter Oberkante
      gold.box(L - 0.4, 1.3, W, gradV(0xc8880a, 0xfff0a0, 0.5, 0.5), { p: [0, 1.75, 0] }, 0.12, 2);
      const n = Math.max(2, Math.round((L - 0.4) / 1.6));
      for (let i = 0; i < n; i++) for (const sz of [1, -1]) {
        const x = -(L - 0.4) / 2 + (i + 0.5) * (L - 0.4) / n;
        gold.add(puffyGeo(roundRectShape((L - 0.4) / n - 0.3, 0.8, 0.12), 0.04, 0.03, 6, 2), gradV(0xd8960a, 0xffe880), placed(new THREE.Vector3(x, 1.75, sz * (W / 2 + 0.01)), new THREE.Vector3(0, 0, sz), new THREE.Vector3(1, 1, 1)));
        gold.add(puffyStarGeo(0.18, 0.085, 0.03, 0.012), 0xffffff, placed(new THREE.Vector3(x, 1.75, sz * (W / 2 + 0.05)), new THREE.Vector3(0, 0, sz), new THREE.Vector3(1, 1, 1)));
      }
      red.box(L - 0.3, 0.16, W + 0.1, gradV(GZ.redLow, GZ.redHi), { p: [0, 2.42, 0] }, 0.06, 2);
    } else {
      // Dampflok: Kessel, Rauchkammer, Schornstein, Dom, Führerhaus, Kuhfänger, Laterne
      const boilerL = L * 0.6, bx = L * 0.12;
      const boiler = new THREE.CylinderGeometry(1.0, 1.0, boilerL, 36, 1);
      boiler.rotateZ(Math.PI / 2);
      gold.add(boiler, gradV(0xc8880a, 0xfff0a0, 0.55, 0.45), { p: [bx, 2.05, 0] });
      for (let i = 0; i < 3; i++) red.torus(1.02, 0.06, GZ.red, { p: [bx - boilerL / 2 + 0.4 + i * (boilerL - 0.8) / 2, 2.05, 0], r: [0, Math.PI / 2, 0] }, 8, 36);
      gold.cyl(1.04, 1.04, 0.25, 0xffe070, { p: [bx + boilerL / 2 + 0.1, 2.05, 0], r: [0, 0, Math.PI / 2] }, 36);
      gold.sphere(0.5, gradV(0xc8880a, 0xfff0a0), { p: [bx + boilerL / 2 + 0.25, 2.05, 0], s: [0.35, 1.6, 1.6] }, 24, 16);
      // Schornstein
      gold.lathe([[0.3, 0], [0.32, 0.5], [0.42, 0.9], [0.5, 1.05], [0.4, 1.1], [0.3, 1.0], [0.28, 0.2], [0, 0.2]], gradV(0xc8880a, 0xfff0a0), { p: [bx + boilerL / 2 - 0.5, 2.85, 0] }, 28, 1);
      red.torus(0.36, 0.06, GZ.red, { p: [bx + boilerL / 2 - 0.5, 3.45, 0], r: [Math.PI / 2, 0, 0] }, 8, 28);
      gold.dome(0.45, gradV(0xc8880a, 0xfff0a0), { p: [bx - 0.3, 2.95, 0], s: [1, 1.1, 1] }, Math.PI / 2, 24, 8);
      // Führerhaus (rot, goldene Fensterrahmen, Dach)
      const cx = -L / 2 + 1.25;
      red.box(2.1, 2.2, W - 0.2, gradV(GZ.redLow, GZ.redHi, 0.5, 0.5), { p: [cx, 2.2, 0] }, 0.12, 2);
      for (const sz of [1, -1]) red.add(puffyGeo(roundRectShape(1.2, 0.8, 0.2), 0.05, 0.03, 8, 2), GZ.window, placed(new THREE.Vector3(cx, 2.55, sz * ((W - 0.2) / 2 + 0.02)), new THREE.Vector3(0, 0, sz), new THREE.Vector3(1, 1, 1)));
      gold.box(2.5, 0.2, W + 0.2, gradV(0xc8880a, 0xfff0a0), { p: [cx, 3.4, 0] }, 0.1, 2);
      // Kuhfänger
      for (let i = 0; i < 5; i++) red.box(0.12, 0.7, 0.12, GZ.red, { p: [L / 2 + 0.05, 0.7, (i - 2) * 0.5], r: [0, 0, 0.6] }, 0.03, 1);
      red.box(0.2, 0.15, W - 0.6, GZ.red, { p: [L / 2 - 0.1, 1.0, 0] }, 0.04, 1);
      // Laterne
      gold.cyl(0.28, 0.32, 0.4, 0xffe070, { p: [bx + boilerL / 2 + 0.2, 3.0, 0], r: [0, 0, Math.PI / 2] }, 20);
    }
    return { gold: gold.geometry(), red: red.geometry() };
  };
  const g = make();
  ZUG_GEOS.set(key, g);
  return g;
}
function buildGoldzug(opts = {}) {
  const kind = opts.kind === 'lok' ? 'lok' : 'wagen';
  const L = Math.max(4, opts.length ?? (kind === 'lok' ? 8 : 9));
  const W = 3;
  const root = new THREE.Group();
  const own = [];
  const geos = zugBodyGeo(kind, L);
  const goldM = mesh(geos.gold, metal('w5goldtrain', { color: 0xffffff, vertexColors: true, metalness: 0.55, roughness: 0.28, emissive: 0x2a1800 }, 1.0), {}, true);
  const redM = mesh(geos.red, vcol(0.3), {}, true);
  goldM.receiveShadow = true; redM.receiveShadow = true;
  root.add(goldM, redM);
  let top = 2.5;
  if (kind === 'wagen') {
    const heap = mesh(coinHeapGeo(L - 0.6, W - 0.3, 2.35), metal('w5coins', { color: 0xffffff, vertexColors: true, metalness: 0.5, roughness: 0.3, emissive: 0x2a1200 }, 1.0), {}, true);
    root.add(heap);
    top = 2.35 + 0.8;
  } else top = 3.5;
  // Räder: Wagen 4 Achsen à 2, Lok 3 große Treibachsen + 1 Laufachse
  const axles = kind === 'lok' ? [[L / 2 - 1.0, false], [0.6, true], [-1.2, true], [-3.0 + (L - 8) * 0, true]] : [[L / 2 - 1.1, false], [L / 2 - 2.3, false], [-L / 2 + 2.3, false], [-L / 2 + 1.1, false]];
  const small = instMesh(zugWheelGeo(false), vcol(0.35), 8, L, 0.6);
  const big = instMesh(zugWheelGeo(true), vcol(0.35), 6, L, 0.9);
  small.castShadow = big.castShadow = true;
  root.add(small, big);
  // Dampf (Lok) und Funkeln
  const steam = new Puffs(12, 0xffffff, { opacity: 0.85, radius: 6, cy: 3 });
  own.push(steam);
  root.add(steam.mesh);
  const lamp = glowSprite(0xfff2b0, kind === 'lok' ? 1.6 : 0.01, kind === 'lok' ? 0.7 : 0);
  lamp.position.set(L * 0.12 + L * 0.3 + 0.45, 3.0, 0);
  root.add(lamp);
  const spark = sparkleSprite(0xfff6c0, 0.5);
  spark.position.set(0, top + 0.3, 0.5);
  root.add(spark);
  root.userData.top = top;
  root.userData.length = L;
  const clk = new Clock();
  let roll = 0, emit = 0;
  const update = (dt, st) => {
    const anim = st.anim ?? 'idle';
    clk.tick(dt, anim);
    const t = clk.t;
    const speed = anim === 'drive' ? (st.speed ?? 6) : 0;
    roll += dt * speed;
    let si = 0, bi = 0;
    for (const [x, isBig] of axles) {
      const R = isBig ? 0.85 : WHEEL_R;
      for (const sz of [1, -1]) {
        const target = isBig ? big : small;
        _q.setFromAxisAngle(_v.set(0, 0, 1), -roll / R);
        if (sz < 0) _q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI));
        target.setMatrixAt(isBig ? bi++ : si++, _m.compose(_v2.set(x, RAIL_Y + R, sz * (W / 2 - 0.35)), _q, _s.setScalar(1)));
      }
    }
    small.count = si; big.count = bi;
    small.instanceMatrix.needsUpdate = true; big.instanceMatrix.needsUpdate = true;
    emit -= dt;
    if (kind === 'lok' && emit <= 0) { emit = anim === 'drive' ? 0.12 : 0.45; steam.burst([L * 0.12 + L * 0.3 - 0.5, 4.0, 0], { count: 1, speed: 0.6, up: 1.8, size: 0.45, life: 1.0, spread: 0.2 }); }
    steam.step(dt);
    const tw = Math.max(0, Math.sin(t * 2.3));
    spark.scale.setScalar(0.15 + tw * 0.45);
    spark.position.x = Math.sin(t * 0.37) * L * 0.3;
  };
  return makeModel('goldzug_waggon', root, update, [...own, small, big], { initial: 'idle' });
}

export const MODELS = {
  schluesselmuenze: buildSchluesselmuenze,
  trapez: buildTrapez,
  pendelplattform: buildPendelplattform,
  drehbruecke: buildDrehbruecke,
  roehrenkanone: buildRoehrenkanone,
  flipper_feld: buildFlipperFeld,
  schiebekugel: buildSchiebekugel,
  suchscheinwerfer: buildSuchscheinwerfer,
  donut_block: buildDonutBlock,
  donutblock: (opts) => { const m = buildDonutBlock(opts); m.root.name = 'modell:donutblock'; m.root.userData.modelName = 'donutblock'; return m; },
  goldzug_waggon: buildGoldzug,
};
