// Hilfen für die Blumen-Remix-Level B-5 „Hasenhatz im Morgenrot“, B-6 „Grauspuk in der Mondscheinvilla“, B-7
// „Kanonenhelm-Tauchgang im Leuchtturmriff“ und B-8 „Turbo-Piep über dem Neonsteg“ (kein Level: exportiert kein LEVEL,
// die Level-Registry überspringt dieses Modul). Nur für diese vier Level – andere Remix-Level haben eigene Hilfsdateien;
// Basislevel und gemeinsame Dateien bleiben unverändert. Alles Level-Lokale hängt sich über die Remix-Haken
// (prebuild/build/setup, level.onStep) an.
//
//   line, ring, arc, isl        Münzen (Reihe, Ring, Bogen) bzw. Insel mit Oberkante top
//   sternHier(index, dy)        Belohnung (Aktion { fn }): versteckter Stern index erscheint dort, wo die Aktion ausgelöst wurde
//                               (B-5: der Riesenhase lässt Stern 0 an seiner Fangstelle zurück)
//   leeresGemaelde(level, id)   B-6: das Spuk-Gemälde der Basis zeigt nur noch Rahmen und dunkle Leinwand (Nische und
//                               Warp-Box dahinter bleiben)
//   geisterwolken(level, list)  B-6: unsichtbare Einweg-Wolken, die erst beim Betreten erscheinen (Entität 'geisterwolke')

import * as THREE from 'three';
import { CourseEntity } from '../../entities/CourseEntity.js';
import { cloudGeo } from '../../blocks/types/cloud.js';

/** Münzen in einer Reihe. */
export const line = (from, to, n) => ({ kind: 'coins', from, to, n });
/** Münzring um pos. */
export const ring = (pos, r, n) => ({ kind: 'coins', pos, r, n });
/** Münzbogen von a nach b mit Scheitel h über der Verbindungslinie. */
export function arc(a, b, n, h = 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push({ kind: 'coin', pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t] });
  }
  return out;
}
/** Insel über ihre Grundfläche x0..x1, zA..zB, Oberseite top, Höhe h. */
export function isl(x0, x1, zA, zB, top, h = 3, o = {}) {
  const z0 = Math.max(zA, zB), z1 = Math.min(zA, zB);
  return { type: 'island', pos: [(x0 + x1) / 2, top - h, (z0 + z1) / 2], size: [x1 - x0, h, z0 - z1], under: 0, ...o };
}

// =====================================================================================================================
// B-5: Stern an der Fangstelle
// =====================================================================================================================

/**
 * Aktion für Belohnungen (bunny reward, Kampfraum onClear …): der (versteckte) Stern index erscheint dy m über der Stelle,
 * an der die Aktion ausgelöst wurde (ctx.pos). Gibt es ihn noch nicht als Entität, entsteht er dort.
 */
export function sternHier(index, dy = 1) {
  return {
    fn(level, ctx) {
      if (level.runtime?.stars?.[index]) return;
      const p = ctx?.pos ? (Array.isArray(ctx.pos) ? ctx.pos : [ctx.pos.x, ctx.pos.y, ctx.pos.z]) : null;
      const at = p ? [p[0], p[1] + dy, p[2]] : null;
      const st = level.entities.find((e) => e.kind === 'star' && e.index === index && !e.removed);
      if (st) { if (st.hidden) st.reveal(at ?? undefined); else if (at) st.pos.set(at[0], at[1], at[2]); return; }
      level.spawn('star', { pos: at ?? [0, 0, 0], index });
      level.sfx?.('powerup_appear');
    },
  };
}

// =====================================================================================================================
// B-6: leeres Gemälde, unsichtbare Wolken
// =====================================================================================================================

/**
 * Leeres Gemälde: das Spuk-Gemälde id (Entität bilderrahmen der Basis) zeigt nur noch den Goldrahmen vor dunkler Leinwand –
 * Motiv und Augen verschwinden (nur Darstellung; Nische, Aufklappen und Warp-Box bleiben). → true, wenn gefunden.
 */
export function leeresGemaelde(level, id, color = 0x1c1626) {
  const e = level.entities.find((x) => x.kind === 'bilderrahmen' && x.spec?.id === id && !x.removed);
  if (!e) return false;
  e.leer = true;
  e.inner?.root?.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m?.map) { const c = m.clone(); c.map = null; c.color?.setHex(color); c.needsUpdate = true; o.material = c; o.userData.leer = true; }
    else if (!m?.vertexColors) o.visible = false;   // Augen
  });
  return true;
}

/**
 * Unsichtbare Wolke (B-6): Einweg-Wolke (von unten durchspringbar), fest von Anfang an, aber fast durchsichtig (Schimmer
 * opacity hint 0,07); steht eine Figur darauf, blendet sie ein (0,35 s) und bleibt sichtbar.
 * Daten: { pos: [x, y, z] (Mitte unten), size: [w, h, d] (2,8 × 0,6 × 2,8), hint, id }. Laufzeit: shown, k, info().
 */
class Geisterwolke extends CourseEntity {
  constructor(level, spec) {
    super(level, spec, 'geisterwolke');
    this.touch = false;
    const [w, h, d] = spec.size ?? [2.8, 0.6, 2.8];
    this.size = [w, h, d];
    this.half.set(w / 2, h / 2, d / 2);
    this.hint = spec.hint ?? 0.07;
    this.shown = false;
    this.k = 0;
    const p = this.pos;
    this.shapeId = this.addShape({ type: 'box', min: [p.x - w / 2, p.y, p.z - d / 2], max: [p.x + w / 2, p.y + h, p.z + d / 2], oneWay: true, camIgnore: true, tag: 'geisterwolke' });
    if (level.view) {
      const g = cloudGeo({ x: w, y: h, z: d }, Math.floor(p.x * 7 + p.z * 3) >>> 0);
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, transparent: true, opacity: this.hint, depthWrite: false });
      const mesh = new THREE.Mesh(g, mat);
      this.mesh = mesh;
      this.setModel({ root: mesh, update: () => {}, dispose() { g.dispose(); mat.dispose(); } });
    }
  }

  update(dt) {
    if (!this.shown) {
      for (const f of this.level.players ?? [this.level.player]) {
        if (f && !f.dead && f.mode === 'ground' && f.ground?.id === this.shapeId) { this.shown = true; this.level.sfx('powerup_appear'); this.level.effects?.sparks(this.center(), 10); break; }
      }
    }
    if (this.shown) this.k = Math.min(1, this.k + dt / 0.35);
  }

  render(dt, t) {
    super.render(dt, t);
    if (!this.mesh) return;
    const op = this.hint + (0.95 - this.hint) * this.k + (this.k < 1 ? 0.03 * Math.sin(t * 2.1 + this.pos.x) : 0);
    this.mesh.material.opacity = op;
    this.mesh.material.depthWrite = this.k >= 1;
    this.mesh.castShadow = this.k >= 1;
  }

  info() { return { shown: this.shown, k: +this.k.toFixed(2) }; }
}

/** Unsichtbare Wolken anlegen (Liste wie Geisterwolke). → Entitäten (benannte auch über level.named). */
export function geisterwolken(level, list) {
  return list.map((q) => {
    const e = new Geisterwolke(level, q);
    level.entities.push(e);
    if (q.id) level.named.set(q.id, e);
    return e;
  });
}
