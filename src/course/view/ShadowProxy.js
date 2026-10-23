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
// „ritt“, „pflaume“) bekommen ihn automatisch. Ändert sich der Aufbau (Kostüm, Figurwechsel, castShadow eines Teils), wird der Stellvertreter neu
// gebaut; Sichtbarkeit wechselt ohne Neubau (Matrix 0).

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

export class ShadowProxies {
  constructor(view) {
    this.view = view;
    this.list = [];
    this.auto = new Set(['heldin', 'ritt', 'pflaume']);   // Heldin, Ritt (Heldin auf Pflaume mit Floß), Pflaume
  }

  add(root) {
    if (this.list.some((p) => p.root === root)) return;
    this.list.push(new Proxy(this.view, root));
  }

  update() {
    const v = this.view;
    if (!v.sun.castShadow) return;
    if (!v.optimize) { for (const p of this.list) p.off(); return; }
    for (const o of v.three.children) if (this.auto.has(o.name) || o.userData.shadowProxy) this.add(o);
    for (const p of this.list) p.update();
    if (this.list.some((p) => p.dead)) this.list = this.list.filter((p) => !p.dead);
  }

  stats() { return { proxies: this.list.length, parts: this.list.reduce((n, p) => n + p.parts.length, 0) }; }

  dispose() { for (const p of this.list) p.clear(); this.list.length = 0; }
}
