// Hilfen für die Remix-Level B-9, B-10, B-11 und den Boss-Marathon B-12 der Welt Blume (kein Level: exportiert kein LEVEL,
// die Level-Registry überspringt dieses Modul). Nur für diese vier Level – B-1 … B-8 haben eigene Hilfsdateien.
//
//   Daten        line, ring, arc, column (Bitcoin-Reihen)
//   B-9          uhrenZurueck (Zeit-Uhren nach jedem Neustart wieder da), strandfackeln (Entität `strandfackel`: Bambusfackel,
//                nur Feuer zündet sie; alle einer Gruppe an → Aktion), schlafturm (schlafender Pilzlingsturm: steht still,
//                stapelt sich nach dem Draufspringen wieder auf, fällt nie ganz um; „Zzz“ über dem Kopf),
//                reiterPlattformDurchlaessig (Feuerbälle fliegen durch die Plattform des Reiters auf einem Feuerturm)
//   B-10         wabenUmmalen, wabenListe (Waben-Felder als Daten Zelle für Zelle neu bemalen – Remix-Regel change)
//   B-11         suchlichtFallen (Stachelfallen unter Suchscheinwerfern: im Licht draußen, „Entdeckt“ → alle draußen),
//                blaueStege (blauer Belag auf den Stachelstegen), orangeBloecke (Stachelblöcke orange einfärben)
//   B-12         braucht keine eigenen Hilfen (nur Daten: weltraum_arena, bossblitz_hub, boss_gruppe)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes, belebte Kleinigkeiten sind je ein Mesh bzw. eine Punktwolke
// (je 1 Zeichenaufruf) ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, colorize, merge, mixc, smooth, addObject, addStatic, box } from '../../blocks/kit.js';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { runAction, visDt } from '../../entities/gimmick.js';

const TAU = Math.PI * 2;
const C = (c) => lin(hex(c));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const fill = (g, c) => { const col = C(c); return colorize(ni(g), (p, n, o) => { o[0] = col[0]; o[1] = col[1]; o[2] = col[2]; }); };
const shadeY = (g, lo, hi, a = -0.6, b = 0.9) => { const A = C(lo), B = C(hi); return colorize(ni(g), (p, n, o) => mixc(A, B, smooth(a, b, n.y), o)); };

// =====================================================================================================================
// Daten-Helfer
// =====================================================================================================================

/** Bitcoin-Reihe von a nach b (n Münzen). */
export const line = (a, b, n) => ({ kind: 'coins', from: a, to: b, n });
/** Bitcoin-Ring (waagerecht) um c mit Radius r. */
export const ring = (c, r, n) => ({ kind: 'coins', pos: c, r, n });
/** Bitcoin-Bogen von a nach b mit Scheitel h über der Verbindungslinie (n Münzen, Enden eingeschlossen). */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Bitcoin-Säule bei (x, z) von y0 bis y1. */
export function column(x, z, y0, y1, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'coin', pos: [x, y0 + (y1 - y0) * (n === 1 ? 0 : i / (n - 1)), z] });
  return out;
}

// =====================================================================================================================
// B-9: Zeit-Uhren nach jedem Neustart wieder hinlegen
// =====================================================================================================================

/**
 * Zeit-Uhren (Baustein zeituhren, Remix-Regel clocks) erscheinen nach jedem Neustart wieder: B-9 hat keinen Kontrollpunkt
 * und 100 s – der Motor füllt die Uhr beim Neustart wieder auf, die eingesammelten Uhren blieben aber weg. So zählen sie in
 * jedem Versuch. (LEVEL.setup)
 */
export function uhrenZurueck(level, id) {
  const rt = level.runtime, h = level.named.get(id);
  if (!rt || !h || rt._uhrenZurueckBC) return;
  rt._uhrenZurueckBC = true;
  const orig = rt.respawn.bind(rt);
  h.resets = 0;
  rt.respawn = () => {
    for (const it of h.items) { it.taken = false; it.pop = 0; }
    h.resets++;
    return orig();
  };
}

// =====================================================================================================================
// B-9: Strandfackeln (nur Feuer zündet sie)
// =====================================================================================================================

/** Bambusfackel (Ursprung Fußpunkt): Bambusstange mit Ringen, geflochtene Schale, Bastrock; Flamme getrennt. */
function fackelGeo(H) {
  const parts = [];
  const pole = new THREE.CylinderGeometry(0.075, 0.095, H, 8, 1);
  pole.translate(0, H / 2, 0);
  parts.push(shadeY(pole, 0xa87a34, 0xf0d080, -0.9, 0.9));
  for (let i = 0; i < 4; i++) {
    const r = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8, 1);
    r.translate(0, 0.25 + i * (H - 0.4) / 3.2, 0);
    parts.push(fill(r, 0x7a5420));
  }
  // Bastrock unter der Schale
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const s = new THREE.ConeGeometry(0.06, 0.34, 3, 1);
    s.rotateX(Math.PI);
    s.translate(Math.cos(a) * 0.17, H - 0.12, Math.sin(a) * 0.17);
    parts.push(fill(s, i % 2 ? 0xd8b25a : 0xc49a44));
  }
  const bowl = new THREE.CylinderGeometry(0.27, 0.15, 0.3, 12, 1, true);
  bowl.translate(0, H + 0.12, 0);
  parts.push(shadeY(bowl, 0x5a3416, 0x9a6a34));
  const inner = new THREE.CircleGeometry(0.25, 12);
  inner.rotateX(-Math.PI / 2);
  inner.translate(0, H + 0.2, 0);
  parts.push(fill(inner, 0x2a1a10));
  const rim = new THREE.TorusGeometry(0.265, 0.035, 5, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, H + 0.27, 0);
  parts.push(fill(rim, 0x6a4018));
  // Fuß: kleiner Sandhügel
  const foot = new THREE.CylinderGeometry(0.2, 0.32, 0.14, 10, 1);
  foot.translate(0, 0.07, 0);
  parts.push(fill(foot, 0xe2c08a));
  return merge(parts);
}

const FLAME_GEO = (() => {
  let g = null;
  return () => {
    if (g) return g;
    const parts = [];
    for (const [r, h, c] of [[0.24, 0.85, 0xff5a1e], [0.16, 0.66, 0xffa83a], [0.08, 0.42, 0xfff2b0]]) {
      const k = new THREE.ConeGeometry(r, h, 8, 1);
      k.translate(0, h / 2, 0);
      parts.push(fill(k, c));
    }
    g = merge(parts);
    return g;
  };
})();

/**
 * Strandfackel (B-9 „links 4 Fackeln anzünden“): Bambusfackel mit geflochtener Schale; nur ein Feuerball der Funkenblüte
 * zündet sie (er prallt an der Stange: feste Form mit owner = Fackel). Brennt dann mit Flamme und warmem Licht. Gruppe:
 * sind alle Fackeln gleicher group an, läuft onAll (einmal; z. B. { reveal: 'stern_fackeln' }).
 *   { pos: [x, y, z] (Fußpunkt), group: 'fackeln', onAll: Aktion, h: 1.5 (Höhe bis zur Schale), id }
 * Laufzeit: lit, hits; level.named.get(id); Signal 'strandfackel' { id, lit, of }. Ein Neustart löscht sie nicht.
 */
class Strandfackel extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'strandfackel');
    this.touch = false;
    this.lit = false;
    this.hits = 0;
    this.group = spec.group ?? 'fackeln';
    this.H = spec.h ?? 1.5;
    this.half.set(0.3, (this.H + 0.3) / 2, 0.3);
    const p = this.pos;
    this.addShape({ type: 'box', min: [p.x - 0.22, p.y, p.z - 0.22], max: [p.x + 0.22, p.y + this.H + 0.3, p.z + 0.22], tag: 'strandfackel' });
    if (level.view) this.buildLook();
  }

  buildLook() {
    const root = new THREE.Group();
    const body = new THREE.Mesh(fackelGeo(this.H), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    body.castShadow = true;
    root.add(body);
    const fl = new THREE.Mesh(FLAME_GEO(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending }));
    fl.position.y = this.H + 0.22;
    fl.visible = false;
    root.add(fl);
    // kalter Schimmer über der Schale: hier gehört Feuer hinein
    const hint = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 6, 22), new THREE.MeshBasicMaterial({ color: 0x8adfff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    hint.rotation.x = Math.PI / 2;
    hint.position.y = this.H + 0.42;
    root.add(hint);
    this.fl = fl; this.hint = hint;
    this.setModel({ root, update: () => {}, dispose() { body.geometry.dispose(); body.material.dispose(); fl.material.dispose(); hint.geometry.dispose(); hint.material.dispose(); } });
  }

  onHit(kind) {
    if (kind !== 'fire' || this.lit) return;
    this.hits++;
    this.light();
  }

  light() {
    if (this.lit) return;
    this.lit = true;
    const L = this.level;
    L.sfx('burn');
    L.effects?.sparks({ x: this.pos.x, y: this.pos.y + this.H + 0.6, z: this.pos.z }, 18);
    L.view?.addLantern?.(this.pos.x, this.pos.y + this.H + 0.9, this.pos.z);
    const all = L.entities.filter((e) => e.kind === 'strandfackel' && e.group === this.group);
    const n = all.filter((e) => e.lit).length;
    L.signal?.('strandfackel', { id: this.spec.id ?? null, lit: n, of: all.length });
    if (n === all.length && !L['_strandfackel_' + this.group]) {
      L['_strandfackel_' + this.group] = true;
      L.sfx('key');
      runAction(L, this.spec.onAll ?? all.find((e) => e.spec.onAll)?.spec.onAll, { pos: [this.pos.x, this.pos.y + 1, this.pos.z], source: this });
    }
  }

  render(dt, t) {
    super.render?.(dt, t);
    if (!this.fl) return;
    this.fl.visible = this.lit;
    this.hint.visible = !this.lit;
    if (this.lit) {
      const k = 1 + 0.14 * Math.sin(t * 12 + this.pos.x) + 0.07 * Math.sin(t * 21 + this.pos.z);
      this.fl.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
      this.fl.rotation.y = t * 1.6;
    } else this.hint.material.opacity = 0.3 + 0.25 * Math.sin(t * 3 + this.pos.z);
  }

  info() { return { lit: this.lit, hits: this.hits, group: this.group }; }
}

/** Strandfackeln anlegen (LEVEL.build oder setup): list [{ pos, id? }], o { group, onAll, h }. → Entitäten. */
export function strandfackeln(level, list, o = {}) {
  const out = [];
  for (const q of list) {
    const e = new Strandfackel(level, { ...o, ...q, group: o.group ?? q.group ?? 'fackeln', onAll: o.onAll });
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    level.view?.shadows?.add({ pos: e.pos, radius: 0.35, alive: () => !e.removed, visible: () => true });
    out.push(e);
  }
  return out;
}

// =====================================================================================================================
// B-9: schlafender Dreierturm
// =====================================================================================================================

const TURM_STEP = 0.62;
const turmHoehe = (n) => (n <= 0 ? 0 : (n - 1) * TURM_STEP + 0.84);

let ZZZ_TEX = null;
function zzzTexture() {
  if (ZZZ_TEX) return ZZZ_TEX;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 52px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 7; g.strokeStyle = '#3a2a6a';
  g.strokeText('Z', 32, 34);
  g.fillStyle = '#ffffff';
  g.fillText('Z', 32, 34);
  ZZZ_TEX = new THREE.CanvasTexture(c);
  ZZZ_TEX.colorSpace = THREE.SRGBColorSpace;
  return ZZZ_TEX;
}

/**
 * Schlafender Pilzlingsturm (B-9 Stern 3 „rechts über einem schlafenden Dreierturm“): der Turm (Daten: pilzlingsturm mit
 * wake: 0 – er wacht nie auf und läuft nicht) dient als Sprungbrett. Draufspringen nimmt wie immer die oberste Stufe ab
 * (Abprall), aber die unterste bleibt stehen (er fällt nie ganz um) und nach regrow s ohne Treffer klettert ein Pilzling
 * wieder hinauf – der Turm ist bald wieder ein Dreierturm. Über dem Kopf steigen „Z“ auf (Punktwolke, 1 Zeichenaufruf).
 * (LEVEL.setup)  o: { regrow: 2.4, min: 1 } → { tower, regrown, info() }
 */
export function schlafturm(level, id, o = {}) {
  const e = level.named.get(id);
  if (!e || typeof e.popTop !== 'function') return null;
  const st = { tower: e, regrown: 0, info: () => ({ count: e.count, max: e.max, regrown: st.regrown, state: e.state }) };
  const orig = e.popTop.bind(e);
  const min = o.min ?? 1;
  e.popTop = (src) => {
    if (e.count > min) { orig(src); return; }
    e.hitCool = 0.25;
    level.sfx('bump');
  };
  let since = 0;
  level.onStep((dt) => {
    if (e.removed || e.defeated) return;
    if (e.hitCool > 0) { since = 0; return; }
    if (e.count < e.max) {
      since += dt;
      if (since > (o.regrow ?? 2.4)) {
        since = 0;
        e.count++;
        e.half.y = Math.max(0.2, turmHoehe(e.count) / 2);
        st.regrown++;
        level.sfx('hop');
      }
    } else since = 0;
  });
  if (!level.view) return st;
  const n = 3, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ size: 1.5, map: zzzTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const holder = {};
  let k = 0;
  addObject(level, pts, (dt) => {
    const d = visDt(level, holder, dt);
    pts.visible = !e.removed && !e.defeated;
    if (!pts.visible) return;
    k += d * 0.45;
    const top = e.pos.y + turmHoehe(e.count) + 0.35;
    for (let i = 0; i < n; i++) {
      const u = (k + i / n) % 1;
      arr[i * 3] = e.pos.x + 0.25 + u * 0.7 + Math.sin(u * 7 + i) * 0.12;
      arr[i * 3 + 1] = top + u * 1.6;
      arr[i * 3 + 2] = e.pos.z + 0.15;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return st;
}

// =====================================================================================================================
// B-9: Feuertürme – Feuerbälle durch die Reiter-Plattform
// =====================================================================================================================

/**
 * Der Feuer-Werfer auf einem Pilzlingsturm steht auf einer unsichtbaren Plattform (Kollisionsform des Turms, 1 × 1 m, fährt
 * mit der Turmspitze). Ist der Turm nur noch ein, zwei Pilzlinge hoch, liegt sie in Hüpfhöhe der Feuerbälle der Funkenblüte –
 * sie prallten an ihr ab, statt den Turm zu treffen. Hier wird sie für Geschosse durchlässig (ballPass, fest bleibt sie für
 * den Reiter). (LEVEL.setup) ids: Turm-Ids. → Zahl der Plattformen.
 */
export function reiterPlattformDurchlaessig(level, ids) {
  let n = 0;
  for (const id of ids) {
    const e = level.named.get(id);
    const s = e && e.topSid !== null && e.topSid !== undefined ? level.world.get(e.topSid) : null;
    if (s) { s.ballPass = true; n++; }
  }
  return n;
}

// =====================================================================================================================
// B-10: Waben-Felder neu bemalen (Daten)
// =====================================================================================================================

/**
 * Waben-Feld (Baustein waben, Daten-Eintrag mit pos, size, gap, map) Zelle für Zelle neu bemalen: fn(x, z, zeichen) → neues
 * Zeichen ('n', 'l', 'i', 'h', ' ') oder undefined (bleibt). Die Lage folgt dem Baustein (Spalten nach +X im Abstand 2·ri + gap,
 * ungerade Zeilen um eine halbe Spalte versetzt, Zeilen nach −Z im Abstand 1,5·R + 0,87·gap). Für die Remix-Regel change
 * ({ match: { type: 'waben' }, fn: (seg) => wabenUmmalen(seg, …) }). → der Eintrag.
 */
export function wabenUmmalen(seg, fn) {
  const R = seg.size ?? 1.6, gap = seg.gap ?? 0.06;
  const ri = (Math.sqrt(3) / 2) * R, colW = 2 * ri + gap, rowD = 1.5 * R + gap * 0.87;
  seg.map = seg.map.map((row, r) => {
    let out = '';
    for (let q = 0; q < row.length; q++) {
      const x = seg.pos[0] + q * colW + (r % 2 ? colW / 2 : 0), z = seg.pos[2] - r * rowD;
      const ch = fn(x, z, row[q]);
      out += typeof ch === 'string' && ch.length === 1 ? ch : row[q];
    }
    return out;
  });
  return seg;
}

/** Zellen-Liste [[x, z, zeichen] …] als Malfunktion für wabenUmmalen (Treffer, wenn die Zellmitte näher als tol liegt). */
export const wabenListe = (list, tol = 0.45) => (x, z, ch) => {
  if (ch === ' ' || ch === '.') return undefined;
  for (const [cx, cz, nch] of list) if (Math.abs(cx - x) < tol && Math.abs(cz - z) < tol) return nch;
  return undefined;
};

// =====================================================================================================================
// B-11: Suchscheinwerfer über den Stachelstegen
// =====================================================================================================================

/**
 * Stachelfallen unter Suchscheinwerfern (B-11 „im Licht fahren Stacheln aus und bleiben draußen“). Je Gruppe ein Scheinwerfer
 * (Baustein suchscheinwerfer, 5-7) und die Stachelfallen seines Stegs (Entität stachelfalle der Basis 8-1):
 *   - Liegt der Lichtfleck auf einer Falle (Abstand Fleckmitte–Fallenmitte < radius + reach), fährt sie nach kurzer Vorwarnung
 *     (warn s) aus und **bleibt draußen**, solange das Licht auf ihr liegt und noch hold s danach – der feste Takt der Basis
 *     ruht so lange (er läuft im Hintergrund weiter).
 *   - Entdeckt der Scheinwerfer eine Figur („Entdeckt!“), fahren alle Fallen seines Stegs aus und bleiben alarm s draußen.
 *   - Neustart: alle Fallen wieder im Takt.
 * Der Scheinwerfer folgt der Figur nicht (track: false in den Daten) – er fährt seine Bahn weiter. (LEVEL.setup)
 *   groups: [{ light: Id, traps: [Ids], reach: 0.9, hold: 2, alarm: 4, warn: 0.45 }]
 * → { groups, lit (Zahl der Fallen im Licht), alarms, stuck(id), info() }
 */
export function suchlichtFallen(level, groups) {
  const st = { groups: [], lit: 0, alarms: 0, forced: 0 };
  const now = () => level.time;
  for (const g of groups) {
    const light = level.named.get(g.light);
    const traps = g.traps.map((id) => level.named.get(id) ?? level.entities.find((e) => e.spec?.id === id)).filter(Boolean);
    if (!light || !traps.length) continue;
    const G = { light, traps, reach: g.reach ?? 0.9, hold: g.hold ?? 2, alarm: g.alarm ?? 4, warn: g.warn ?? 0.45, alarms: 0 };
    st.groups.push(G);
    for (const t of traps) {
      t._litUntil = 0; t._forceT = 0; t.litCount = 0;
      const orig = t.update.bind(t);
      t.update = (dt) => {
        if (now() >= t._litUntil) { t._forceT = 0; return orig(dt); }
        // gezwungen draußen: Takt läuft im Hintergrund weiter, Zustand nach eigener Regel
        if (!t.ctrl) t.clock += dt;
        const wasUp = t._forceT > 0 || t.state === 'up';
        t._forceT += dt;
        const s = wasUp && t.state === 'up' ? 'up' : t._forceT >= G.warn ? 'up' : 'warn';
        if (s !== t.state) {
          if (s === 'warn') level.sfx('switch');
          if (s === 'up') { t.cycles++; level.sfx('slam'); }
          t.state = s;
        }
        t.upK = s === 'up' ? Math.min(1, t.upK + dt / 0.12) : Math.max(0, t.upK - dt / 0.25);
        if (t.upK > 0.5) t.hurtFigures();
      };
    }
    light.onDetect?.(() => {
      G.alarms++; st.alarms++;
      for (const t of traps) t._litUntil = Math.max(t._litUntil, now() + G.alarm);
    });
  }
  level.onStep(() => {
    let lit = 0;
    for (const G of st.groups) {
      const sp = G.light.spot, r = G.light.radius ?? 2.2;
      if (!sp) continue;
      for (const t of G.traps) {
        if (t.removed) continue;
        const half = Math.max(t.sx ?? 2, t.sz ?? 2) / 2;
        if (Math.hypot(sp.x - t.pos.x, sp.z - t.pos.z) < r + Math.min(half, G.reach)) {
          if (now() >= t._litUntil) t.litCount++;
          t._litUntil = Math.max(t._litUntil, now() + G.hold);
          lit++;
        }
      }
    }
    st.lit = lit;
  });
  const rt = level.runtime;
  if (rt && !rt._suchlichtBC) {
    rt._suchlichtBC = true;
    const orig = rt.respawn.bind(rt);
    rt.respawn = () => { for (const G of st.groups) for (const t of G.traps) { t._litUntil = 0; t._forceT = 0; } return orig(); };
  }
  st.stuck = (id) => { for (const G of st.groups) for (const t of G.traps) if (t.spec?.id === id) return now() < t._litUntil; return false; };
  st.info = () => ({ groups: st.groups.length, traps: st.groups.reduce((a, G) => a + G.traps.length, 0), lit: st.lit, alarms: st.alarms,
    out: st.groups.flatMap((G) => G.traps.filter((t) => now() < t._litUntil).map((t) => t.spec?.id)) });
  level.named.set('suchlichtFallen', st);
  return st;
}

/**
 * Blaue Stachelstege (B-11 „Suchscheinwerfer über den blauen Brücken“; nur Darstellung): ein blauer Plattenbelag mit hellem Rand
 * auf jedem Steg (über den Bodenplatten der Regenfestung, ohne Kollision; statisch verschmolzen – keine zusätzlichen
 * Zeichenaufrufe).
 * list: [[x0, x1, zA, zB] …], y = Laufhöhe. (LEVEL.build)
 */
export function blaueStege(level, list, y) {
  if (!level.view) return;
  for (const [x0, x1, zA, zB] of list) {
    const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB), w = x1 - x0, d = z0 - z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    addStatic(level, box(w - 0.2, 0.05, d - 0.1, cx, y + 0.02, cz, 0x9ac4ff, { r: 0.02 }));
    addStatic(level, box(w - 0.5, 0.06, d - 0.4, cx, y + 0.03, cz, 0x2f62d8, { r: 0.02, topColor: 0x3a74ee }));
  }
}

// =====================================================================================================================
// B-11: orange Schwebebrücken (nur Darstellung)
// =====================================================================================================================

const _hsl = { h: 0, s: 0, l: 0 };
/**
 * Stachelblöcke (Baustein stachelblock: Modelle blau/rot) orange einfärben – B-11 „orange Brücken fahren schneller“. Beim ersten
 * Bild werden die Darstellungen der Blöcke gesucht (Objekt-Name des Bausteins, Lage = Block), ihre Geometrien und Materialien
 * kopiert und alle Farben auf den Orange-Farbton gedreht (Helligkeit und Sättigung bleiben, Grau bleibt grau). (LEVEL.setup)
 * Dazu ein leichtes oranges Eigenleuchten (glow), damit sie auch nachts orange wirken. ids: Block-Ids, hue 0.06, glow 0.12.
 * → { tinted }
 */
export function orangeBloecke(level, ids, hue = 0.06, glow = 0.12) {
  const st = { tinted: 0 };
  if (!level.view) return st;
  const blocks = ids.map((id) => level.named.get(id)).filter((h) => h?.mb);
  const tone = (c) => { c.getHSL(_hsl); if (_hsl.s > 0.18) c.setHSL(hue, Math.min(1, _hsl.s * 1.1), Math.min(0.66, _hsl.l * 1.35 + 0.06)); };
  const tint = (root) => {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const col = o.geometry?.getAttribute?.('color');
      if (col) {
        o.geometry = o.geometry.clone();
        const a = o.geometry.getAttribute('color'), c = new THREE.Color();
        for (let i = 0; i < a.count; i++) { c.setRGB(a.getX(i), a.getY(i), a.getZ(i)); tone(c); a.setXYZ(i, c.r, c.g, c.b); }
        a.needsUpdate = true;
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const out = mats.map((m) => {
        const n = m.clone();
        if (n.color) tone(n.color);
        // nachts gut sichtbar: leichtes oranges Eigenleuchten
        if (n.emissive) { n.emissive.setHSL(hue, 1, 0.5); n.emissiveIntensity = Math.max(n.emissiveIntensity ?? 0, glow); }
        return n;
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });
  };
  let done = false;
  const off = level.view.onFrame(() => {
    if (done) return;
    done = true;
    const roots = level.view.frameFns.map((f) => f.obj).filter((o) => o?.name === 'stachelblock');
    for (const h of blocks) {
      const r = roots.find((o) => Math.hypot(o.position.x - h.mb.pos.x, o.position.z - h.mb.pos.z) < 0.6 && Math.abs(o.position.y - h.mb.pos.y) < 0.6);
      if (r && !r.userData.orange) { r.userData.orange = true; tint(r); st.tinted++; }
    }
    setTimeout(() => off?.(), 0);
  });
  return st;
}
