// Schatten-Stellvertreter (Präzisierung „Leistung und Level-Haken 2“): Figuren aus vielen starren Teilen (Heldin ≈ 14
// schattenwerfende Meshes, Pflaume, Krümel …) werfen ihren Sonnenschatten mit **einem** Zeichenaufruf statt einem je
// Teil. Ein SkinnedMesh (ein „Knochen“ je Teil, Geometrie der Teile in ihren eigenen Koordinaten) übernimmt je Bild
// die Weltmatrizen der Teile; unsichtbare oder nicht werfende Teile bekommen die Matrix 0. Der Stellvertreter wird nur
// im Schattenpass gezeichnet (im Hauptpass nie), die echten Teile nur im Hauptpass (view/Culling.js: shadowProxied).
// Das Schattenbild bleibt gleich (Tiefe der gleichen Dreiecke; Seite je Material wie im Schattenpass üblich).
//
// Ausgenommen (zeichnen ihren Schatten weiter selbst): Teile mit Alpha-Test/Alpha-Karte, eigenem Tiefenmaterial,
// Morph-Zielen, Skinning, Instanzen, Material-Listen oder frustumCulled = false.
//
// Nutzung: view.shadowProxy(root) (einmal; root = Hülle der Figur) – Heldin, Ritt und Pflaume (Objekte „heldin“,
// „ritt“, „pflaume“) bekommen ihn automatisch. Ändert sich der Aufbau (Kostüm, Figurwechsel, castShadow eines Teils),
// wird der Stellvertreter neu gebaut; Sichtbarkeit wechselt ohne Neubau (Matrix 0).
//
// Figur-Bündel (Hauptpass): Teile derselben Figur mit gleichem Material (und Schattenempfang) zeichnen gemeinsam als ein
// SkinnedMesh mit dem Material der Teile (Heldin: 18 Teile → 8 Aufrufe). Nur Teile, deren Weltmatrix eine Ähnlichkeits-
// abbildung ist (Drehung, gleichmäßiger Maßstab – dann rechnet das Skinning die Normalen wie das Einzel-Mesh); sonst
// (z. B. Blinzeln, Stauchen) zeichnet das Teil in diesem Bild selbst. Nicht gebündelt: durchsichtige Teile, Material-
// Listen, Skinning (Ellbogen-Arme), eigene Render-Haken.

import * as THREE from 'three';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const IDENT = new THREE.Matrix4();

function proxiable(m) {
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || !m.frustumCulled) return false;
  const mat = m.material;
  if (!mat || Array.isArray(mat)) return false;
  if (m.customDepthMaterial || mat.alphaTest > 0 || mat.alphaMap || mat.clippingPlanes?.length || mat.displacementMap) return false;
  if (mat.visible === false || mat.wireframe) return false;
  const g = m.geometry;
  if (!g?.attributes?.position || g.morphAttributes?.position?.length) return false;
  return true;
}

/** Schattenseite wie WebGLShadowMap (PCF): Front → Rückseite, Rückseite → Front, beidseitig bleibt. */
const SIDE = (mat) => (mat.shadowSide !== null && mat.shadowSide !== undefined ? `s${mat.shadowSide}` : `m${mat.side}`);

class Proxy {
  constructor(view, root) {
    this.view = view;
    this.root = root;
    this.sig = '';
    this.parts = [];         // { mesh, group }
    this.groups = [];        // { mesh: SkinnedMesh, bones, skeleton, parts: [] }
    this.dead = false;
  }

  /** Kandidaten der Figur in Traversierungs-Reihenfolge. */
  scan() {
    const list = [];
    this.root.traverse((o) => { if (o.castShadow && proxiable(o)) list.push(o); });
    return list;
  }

  rebuild(list, sig) {
    this.clear();
    this.sig = sig;
    const byside = new Map();
    for (const m of list) {
      const k = SIDE(m.material);
      if (!byside.has(k)) byside.set(k, []);
      byside.get(k).push(m);
    }
    for (const [k, ms] of byside) {
      let nv = 0, ni = 0;
      for (const m of ms) { const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const pos = new Float32Array(nv * 3), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      ms.forEach((m, b) => {
        const g = m.geometry, P = g.attributes.position, n = P.count;
        for (let i = 0; i < n; i++) { pos[(vo + i) * 3] = P.getX(i); pos[(vo + i) * 3 + 1] = P.getY(i); pos[(vo + i) * 3 + 2] = P.getZ(i); si[(vo + i) * 4] = b; sw[(vo + i) * 4] = 1; }
        if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo; io += I.count; }
        else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
        vo += n;
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const ref = ms[0].material;
      const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
      if (k.startsWith('s')) mat.shadowSide = ref.shadowSide; else mat.side = ref.side;
      const bones = ms.map(() => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });
      const sk = new THREE.Skeleton(bones, ms.map(() => new THREE.Matrix4()));
      const sm = new THREE.SkinnedMesh(geo, mat);
      sm.name = 'schatten-stellvertreter';
      sm.bind(sk, IDENT);
      sm.castShadow = true;
      sm.receiveShadow = false;
      sm.matrixAutoUpdate = false;
      sm.frustumCulled = true;
      const view = this.view;
      sm.intersectsFrustum = (f) => !!view.optimize && f === view.culling.sunFrustum && this.any;
      sm.userData.owned = true;
      view.three.add(sm);
      this.groups.push({ mesh: sm, bones, skeleton: sk, parts: ms });
    }
    this.parts = list;
  }

  clear() {
    for (const p of this.parts) p.shadowProxied = false;
    for (const g of this.groups) { g.mesh.parent?.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); g.skeleton.dispose(); }
    this.groups.length = 0;
    this.parts = [];
  }

  /** Je Bild vor dem Zeichnen. */
  update() {
    const root = this.root;
    if (!root.parent) { this.dead = true; this.clear(); return; }
    const list = this.scan();
    const sig = list.map((m) => `${m.geometry.id}:${SIDE(m.material)}`).join(',');
    if (sig !== this.sig) this.rebuild(list, sig);
    // Sichtbarkeit der Kette bis zur Szene (unsichtbare Vorfahren → kein Schatten)
    let vis = true;
    for (let q = root; q; q = q.parent) if (!q.visible) { vis = false; break; }
    root.updateWorldMatrix(true, true);
    let any = false;
    for (const g of this.groups) {
      g.parts.forEach((m, b) => {
        let on = vis;
        if (on) for (let q = m; q && q !== root; q = q.parent) if (!q.visible) { on = false; break; }
        m.shadowProxied = on;
        g.bones[b].matrixWorld.copy(on ? m.matrixWorld : ZERO);
        if (on) any = true;
      });
    }
    this.any = any;
  }

  /** Sparmaßnahmen aus: echte Teile werfen wieder selbst. */
  off() { for (const p of this.parts) p.shadowProxied = false; this.any = false; }
}

const DEFAULT_HOOK = THREE.Object3D.prototype.onBeforeRender;

function mergeable(m) {
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || !m.frustumCulled || m.renderOrder !== 0) return false;
  const mat = m.material;
  if (!mat || Array.isArray(mat) || mat.transparent || mat.visible === false) return false;
  if (m.onBeforeRender !== DEFAULT_HOOK) return false;
  const g = m.geometry;
  if (!g?.attributes?.position || !g.attributes.normal || g.morphAttributes?.position?.length) return false;
  return true;
}

/** Ähnlichkeitsabbildung (Drehung · gleichmäßiger Maßstab, ohne Spiegelung)? */
function similar(e) {
  const ax = e[0], ay = e[1], az = e[2], bx = e[4], by = e[5], bz = e[6], cx = e[8], cy = e[9], cz = e[10];
  const la = ax * ax + ay * ay + az * az, lb = bx * bx + by * by + bz * bz, lc = cx * cx + cy * cy + cz * cz;
  const eps = 1e-5;
  if (Math.abs(la - lb) > eps * la || Math.abs(la - lc) > eps * la) return false;
  if (Math.abs(ax * bx + ay * by + az * bz) > eps * la || Math.abs(ax * cx + ay * cy + az * cz) > eps * la || Math.abs(bx * cx + by * cy + bz * cz) > eps * la) return false;
  return ax * (by * cz - bz * cy) - bx * (ay * cz - az * cy) + cx * (ay * bz - az * by) > 0;
}

const ATTRS = ['position', 'normal', 'color', 'uv'];
const normMax = (arr) => (arr instanceof Uint8Array ? 255 : arr instanceof Uint16Array ? 65535 : arr instanceof Int8Array ? 127 : arr instanceof Int16Array ? 32767 : 1);

/** Figur-Bündel des Hauptpasses (siehe Kopf). */
class Bundle {
  constructor(view, root) {
    this.view = view;
    this.root = root;
    this.sig = '';
    this.groups = [];        // { mesh, bones, skeleton, parts, on, any }
    this.dead = false;
  }

  scan() {
    const list = [];
    this.root.traverse((o) => { if (mergeable(o)) list.push(o); });
    return list;
  }

  keyOf(m) {
    const a = m.geometry.attributes;
    return `${m.material.id}|${m.receiveShadow ? 1 : 0}|${ATTRS.filter((n) => a[n]).map((n) => `${n}${a[n].itemSize}`).join('.')}`;
  }

  rebuild(list, sig) {
    this.clear();
    this.sig = sig;
    const byKey = new Map();
    for (const m of list) {
      const k = this.keyOf(m);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(m);
    }
    for (const ms of byKey.values()) {
      if (ms.length < 2) continue;
      const names = ATTRS.filter((n) => ms[0].geometry.attributes[n]);
      let nv = 0, ni = 0;
      for (const m of ms) { const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const arrs = {};
      for (const n of names) arrs[n] = new Float32Array(nv * ms[0].geometry.attributes[n].itemSize);
      const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      ms.forEach((m, b) => {
        const g = m.geometry, n = g.attributes.position.count;
        for (const name of names) {
          const A = g.attributes[name], k = A.itemSize, out = arrs[name];
          const f = A.normalized ? 1 / normMax(A.array) : 1;
          for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) out[(vo + i) * k + c] = A.getComponent(i, c) * f;
        }
        for (let i = 0; i < n; i++) { si[(vo + i) * 4] = b; sw[(vo + i) * 4] = 1; }
        if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo; io += I.count; }
        else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
        vo += n;
      });
      const geo = new THREE.BufferGeometry();
      for (const n of names) geo.setAttribute(n, new THREE.BufferAttribute(arrs[n], ms[0].geometry.attributes[n].itemSize));
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const bones = ms.map(() => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });
      const sk = new THREE.Skeleton(bones, ms.map(() => new THREE.Matrix4()));
      const sm = new THREE.SkinnedMesh(geo, ms[0].material);
      sm.name = 'figur-buendel';
      sm.bind(sk, IDENT);
      sm.castShadow = false;
      sm.receiveShadow = ms[0].receiveShadow;
      sm.matrixAutoUpdate = false;
      sm.frustumCulled = true;
      const view = this.view, G = { mesh: sm, bones, skeleton: sk, parts: ms, on: ms.map(() => false), any: false };
      sm.intersectsFrustum = (f) => !!view.optimize && f !== view.culling.sunFrustum && G.any;
      sm.userData.owned = false;          // Material gehört der Figur; Geometrie gibt clear() frei
      view.three.add(sm);
      this.groups.push(G);
    }
  }

  clear() {
    for (const g of this.groups) { g.mesh.parent?.remove(g.mesh); g.mesh.geometry.dispose(); g.skeleton.dispose(); }
    this.groups.length = 0;
  }

  update() {
    const root = this.root;
    if (!root.parent) { this.dead = true; this.clear(); return; }
    const list = this.scan();
    const sig = list.map((m) => `${m.geometry.id}:${this.keyOf(m)}`).join(',');
    if (sig !== this.sig) this.rebuild(list, sig);
    let vis = true;
    for (let q = root; q; q = q.parent) if (!q.visible) { vis = false; break; }
    root.updateWorldMatrix(true, true);
    const token = this.view.frame, fr = this.view.culling.camFrustum;
    for (const g of this.groups) {
      let n = 0;
      g.parts.forEach((m, b) => {
        let on = vis;
        if (on) for (let q = m; q && q !== root; q = q.parent) if (!q.visible) { on = false; break; }
        if (on && !similar(m.matrixWorld.elements)) on = false;     // zeichnet in diesem Bild selbst
        if (on && !fr.intersectsObject(m)) on = false;              // außerhalb des Bildes: fiele ohnehin weg
        g.on[b] = on;
        if (on) n++;
      });
      g.any = n >= 2;                                               // ein einzelnes Teil zeichnet selbst
      g.parts.forEach((m, b) => {
        const on = g.any && g.on[b];
        g.bones[b].matrixWorld.copy(on ? m.matrixWorld : ZERO);
        if (on) m.__merged = token;
      });
    }
  }
}

export class ShadowProxies {
  constructor(view) {
    this.view = view;
    this.list = [];
    this.bundles = [];
    this.auto = new Set(['heldin', 'ritt', 'pflaume']);   // Heldin, Ritt (Heldin auf Pflaume mit Floß), Pflaume
  }

  add(root) {
    if (!this.list.some((p) => p.root === root)) this.list.push(new Proxy(this.view, root));
    if (!this.bundles.some((p) => p.root === root)) this.bundles.push(new Bundle(this.view, root));
  }

  update() {
    const v = this.view;
    if (!v.optimize) { for (const p of this.list) p.off(); return; }
    for (const o of v.three.children) if (this.auto.has(o.name) || o.userData.shadowProxy) this.add(o);
    if (v.sun.castShadow) for (const p of this.list) p.update();
    for (const b of this.bundles) b.update();
    if (this.list.some((p) => p.dead)) this.list = this.list.filter((p) => !p.dead);
    if (this.bundles.some((p) => p.dead)) this.bundles = this.bundles.filter((p) => !p.dead);
  }

  stats() {
    return {
      proxies: this.list.length, parts: this.list.reduce((n, p) => n + p.parts.length, 0),
      bundles: this.bundles.reduce((n, b) => n + b.groups.length, 0),
      bundled: this.bundles.reduce((n, b) => n + b.groups.reduce((k, g) => k + g.parts.length, 0), 0),
    };
  }

  dispose() {
    for (const p of this.list) p.clear();
    for (const b of this.bundles) b.clear();
    this.list.length = 0; this.bundles.length = 0;
  }
}
