// Hilfen für die Remix-Level B-9, B-10, B-11 und den Boss-Marathon B-12 der Welt Blume (kein Level: exportiert kein LEVEL,
// die Level-Registry überspringt dieses Modul). Nur für diese vier Level – B-1 … B-8 haben eigene Hilfsdateien.
//
//   Daten        line, ring, arc, column (Bitcoin-Reihen)
//   B-9          uhrenZurueck (Zeit-Uhren nach jedem Neustart wieder da), strandfackeln (Entität `strandfackel`: Bambusfackel,
//                nur Feuer zündet sie; alle einer Gruppe an → Aktion), schlafturm (schlafender Pilzlingsturm: steht still,
//                stapelt sich nach dem Draufspringen wieder auf, fällt nie ganz um; „Zzz“ über dem Kopf)
// Statische Teile gehen über addStatic in die Abschnitts-Meshes, belebte Kleinigkeiten sind je ein Mesh bzw. eine Punktwolke
// (je 1 Zeichenaufruf) ohne Sonnenschatten.

import * as THREE from 'three';
import { lin, hex, colorize, merge, mixc, smooth, addObject } from '../../blocks/kit.js';
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
  const n = 3, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3), alpha = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ size: 0.55, map: zzzTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
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
      alpha[i] = u;
    }
    mat.size = 0.42 + 0.25 * ((k * 3) % 1) * 0;
    geo.attributes.position.needsUpdate = true;
  });
  return st;
}
