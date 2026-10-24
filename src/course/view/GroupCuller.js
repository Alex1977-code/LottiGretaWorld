// Instanz-Gruppen auswählen (Präzisierung „Leistung und Level-Haken 2“): Gemeinsame InstancedMeshes vieler Exemplare
// (EnemyW2: sharedSlot – z. B. Ameisensoldaten –, modelInstances/sharedModelSlot – z. B. Riesenameisen) liegen übers
// ganze Level verteilt (frustumCulled = false) und zeichneten jedes Bild alle Plätze, auch im Schattenpass. Der Motor
// schreibt je Bild nur die Exemplare in zwei Spiegel-InstancedMeshes, die im Bild liegen (Hauptpass) bzw. ihren
// Schatten ins Bild werfen (nur Schattenpass); die Quelle bleibt Datenquelle (Spiel-/Modell-Code schreibt weiter
// hinein) und wird beim Zeichnen übergangen. Begrenzung je Exemplar: Begrenzungskugel der Geometrie × Instanzmatrix.
//
// Regeln je Gruppe (Name wie bei createInstanced/getModel, z. B. 'ameisensoldat', 'riesenameise') aus
// `LEVEL.instances[name]` bzw. `view.instanceRule(name, rule)`:
//   farHide: m      weiter als m (waagerecht) von der Haupt-Figur: nicht gezeichnet (Gegner laufen weiter)
//   shadowDist: m   weiter als m: kein Sonnenschatten
//   shadow: false   nie Sonnenschatten
// Dieselben Regeln gelten für Instanz-Pools (view.pool, z. B. 'coin'). Mit Regeln wirken sie auch bei ?optimize=0
// (gewollte Darstellung); die Sicht-/Schattenauswahl selbst nur mit view.optimize.
// Nicht übernommen (zeichnen wie bisher): Geometrien mit eigenen Instanz-Attributen, Morph-Instanzen, Material-Listen,
// Materialien mit eigenem onBeforeCompile.
//
// Anmelden: view.groupCull(instancedMesh, name) (EnemyW2 meldet seine Gruppen selbst an).

import * as THREE from 'three';
import { isToyOnly } from '../../three/lib/toyLook.js';

const _c = new THREE.Vector3();

export class GroupCuller {
  constructor(view) {
    this.view = view;
    this.list = [];
    this.stats = { groups: 0, total: 0, drawn: 0, shadow: 0 };
  }

  /** InstancedMesh einer Gruppe anmelden (einmal). */
  add(src, name) {
    if (!src?.isInstancedMesh || this.list.some((r) => r.src === src)) return null;
    const mat = src.material, geo = src.geometry;
    // eigenes onBeforeCompile: nicht übernehmen – außer dem reinen Spielzeug-Look (three/lib/toyLook.js, spiegelbar)
    if (Array.isArray(mat) || (Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile') && !isToyOnly(mat)) || src.morphTexture) return null;
    if (Object.values(geo.attributes).some((a) => a.isInstancedBufferAttribute)) return null;
    const r = { src, name: name ?? src.name ?? src.parent?.name ?? '', main: null, shadow: null, cap: 0, active: false };
    src.frustumCulled = true;
    src.intersectsFrustum = () => !r.active;              // aktiv: zeichnen die Spiegel
    this.list.push(r);
    return r;
  }

  mirror(r, shadow) {
    const src = r.src;
    const im = new THREE.InstancedMesh(src.geometry, src.material, src.instanceMatrix.count);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (src.instanceColor) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(src.instanceMatrix.count * 3), 3);
    im.name = src.name || src.parent?.name || `instanzen:${r.name}`;
    im.renderOrder = src.renderOrder;
    im.receiveShadow = src.receiveShadow;
    im.count = 0;
    im.frustumCulled = true;
    im.userData.owned = false;                            // Geometrie und Material gehören der Gruppe
    const culling = this.view.culling;
    if (shadow) { im.castShadow = true; im.intersectsFrustum = (f) => f === culling.sunFrustum && im.count > 0; }
    else { im.castShadow = false; im.intersectsFrustum = () => im.count > 0; }
    this.view.three.add(im);
    return im;
  }

  drop(r) {
    for (const k of ['main', 'shadow']) if (r[k]) { r[k].removeFromParent(); r[k].dispose(); r[k] = null; }
  }

  /**
   * Vor dem Zeichnen (nach culling.begin()).
   * @param {import('./Culling.js').ViewCulling} culling
   * @param {THREE.Vector3|null} focus Haupt-Figur (farHide/shadowDist)
   */
  update(culling, focus) {
    const view = this.view, opt = !!view.optimize, rules = view.instanceRules;
    const st = this.stats;
    st.groups = 0; st.total = 0; st.drawn = 0; st.shadow = 0;
    let dead = false;
    for (const r of this.list) {
      const src = r.src;
      if (!src.parent) { this.drop(r); r.dead = dead = true; continue; }
      const rule = rules[r.name];
      r.active = opt || !!rule;
      if (!r.active) { if (r.main) r.main.count = 0; if (r.shadow) r.shadow.count = 0; continue; }
      const cap = src.instanceMatrix.count;
      if (r.cap !== cap || r.main?.geometry !== src.geometry || r.main?.material !== src.material) {
        this.drop(r);
        r.cap = cap;
        r.main = this.mirror(r, false);
        r.shadow = this.mirror(r, true);
      }
      st.groups++;
      let vis = true;
      for (let q = src; q; q = q.parent) if (!q.visible) { vis = false; break; }
      let n = 0, ns = 0;
      if (vis) {
        const geo = src.geometry;
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        const sc = geo.boundingSphere.center, sr = geo.boundingSphere.radius;
        const W = src.matrixWorld.elements, ident = src.matrixWorld.equals(IDENT), ws = ident ? 1 : src.matrixWorld.getMaxScaleOnAxis();
        const a = src.instanceMatrix.array, bm = r.main.instanceMatrix.array, bs = r.shadow.instanceMatrix.array;
        const ca = src.instanceColor?.array, cm = r.main.instanceColor?.array, cs = r.shadow.instanceColor?.array;
        const far = rule?.farHide ?? 0, sd = rule?.shadowDist ?? 0;
        const cast = src.castShadow && rule?.shadow !== false;
        for (let i = 0; i < src.count; i++) {
          const o = i * 16;
          const s2 = Math.max(a[o] * a[o] + a[o + 1] * a[o + 1] + a[o + 2] * a[o + 2], a[o + 4] * a[o + 4] + a[o + 5] * a[o + 5] + a[o + 6] * a[o + 6], a[o + 8] * a[o + 8] + a[o + 9] * a[o + 9] + a[o + 10] * a[o + 10]);
          if (s2 === 0) continue;                          // freier Platz (Nullmatrix)
          st.total++;
          _c.set(a[o] * sc.x + a[o + 4] * sc.y + a[o + 8] * sc.z + a[o + 12], a[o + 1] * sc.x + a[o + 5] * sc.y + a[o + 9] * sc.z + a[o + 13], a[o + 2] * sc.x + a[o + 6] * sc.y + a[o + 10] * sc.z + a[o + 14]);
          if (!ident) _c.set(W[0] * _c.x + W[4] * _c.y + W[8] * _c.z + W[12], W[1] * _c.x + W[5] * _c.y + W[9] * _c.z + W[13], W[2] * _c.x + W[6] * _c.y + W[10] * _c.z + W[14]);
          const rad = sr * Math.sqrt(s2) * ws;
          const d = focus && (far || sd) ? Math.hypot(_c.x - focus.x, _c.z - focus.z) : 0;
          if (far && d > far) continue;
          const inCam = !opt || culling.sphereVisible(_c.x, _c.y, _c.z, rad, false);
          const inSh = cast && (!sd || d <= sd) && (!opt || culling.shadowVisible(_c.x, _c.y, _c.z, rad));
          if (inCam) {
            for (let k = 0; k < 16; k++) bm[n * 16 + k] = a[o + k];
            if (ca && cm) { cm[n * 3] = ca[i * 3]; cm[n * 3 + 1] = ca[i * 3 + 1]; cm[n * 3 + 2] = ca[i * 3 + 2]; }
            n++;
          }
          if (inSh) {
            for (let k = 0; k < 16; k++) bs[ns * 16 + k] = a[o + k];
            if (ca && cs) { cs[ns * 3] = ca[i * 3]; cs[ns * 3 + 1] = ca[i * 3 + 1]; cs[ns * 3 + 2] = ca[i * 3 + 2]; }
            ns++;
          }
        }
      }
      // Weltlage der Quelle übernehmen (Gruppen-Hülle meist im Ursprung)
      for (const m of [r.main, r.shadow]) {
        if (!src.matrixWorld.equals(m.matrixWorld)) { m.matrixAutoUpdate = false; m.matrix.copy(src.matrixWorld); m.matrixWorld.copy(src.matrixWorld); }
      }
      r.main.count = n; r.main.instanceMatrix.needsUpdate = true;
      r.shadow.count = ns; r.shadow.instanceMatrix.needsUpdate = true;
      if (r.main.instanceColor) r.main.instanceColor.needsUpdate = true;
      if (r.shadow.instanceColor) r.shadow.instanceColor.needsUpdate = true;
      st.drawn += n; st.shadow += ns;
    }
    if (dead) this.list = this.list.filter((r) => !r.dead);
  }

  dispose() {
    for (const r of this.list) this.drop(r);
    this.list.length = 0;
  }
}

const IDENT = new THREE.Matrix4();
