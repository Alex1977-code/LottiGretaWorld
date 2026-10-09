// Eingänge der Kurs-Weltkarte: rundes Podest mit Nummernscheibe (frei = farbig mit Leuchtring, gesperrt = grau mit
// schwebendem Schloss, geschafft = Fahne), dazu je Art eine Kulisse (Wiesentor, Höhlenmaul, Arena-Gitter, Bohnenranke,
// Diorama-Vitrine, Blatt-Floß und Wasserfall, Zirkuszelt, Festung mit Baron-Flagge, Glasröhre).
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (view.addStatic), bewegte sind eigene Objekte.
//
// Weltdaten je Eingang: { id, kind, pos, exit?, decor?: [x, y, z] (Lage der Kulisse), cage?: [[x0, z0, x1, z1], …],
//   waterfall?: { x0, x1, z, top, bottom }, pipe?: [[dx, dy, dz], …] (Röhrenverlauf relativ zu decor), label? }

import * as THREE from 'three';
import { getModel } from '../models/index.js';
import {
  ENTRANCE_COLORS, LOCKED_COLOR, podiumGeo, numberTexture, glowRing, lockGeo, caveMouthGeo, tentGeo, fortressGeo,
  baronFlagTexture, dioramaGeo, glassBoxMesh, leafRaftGeo, cageGeo, signGeo, signTextMesh, vcol, std,
} from './props.js';
import { Build, mix, cached } from '../models/lib/kit.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { PODIUM_R } from './layout.js';

const TAU = Math.PI * 2;

/** Geometrie in Weltkoordinaten kopieren (gedreht um yaw, verschoben). */
function placed(geo, x, y, z, yaw = 0) {
  const g = geo.clone();
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

export class EntranceView {
  /**
   * @param {object} level Level der Karte (view, world)
   * @param {object} def Eingang aus den Weltdaten
   * @param {{ label: string }} info
   */
  constructor(level, def, info) {
    this.level = level;
    this.view = level.view;
    this.def = def;
    this.id = def.id;
    this.kind = def.kind ?? 'meadow';
    this.color = ENTRANCE_COLORS[this.kind] ?? 0x4fc24a;
    this.label = info.label;
    this.pos = new THREE.Vector3(...def.pos);
    this.state = null;
    this.hopT = 0;
    this.group = new THREE.Group();
    this.group.name = `eingang:${def.id}`;
    this.group.position.copy(this.pos);
    this.updaters = [];
    this.own = [];
    this.anchorY = def.labelY ?? 2.6;
    // Podest (nicht bei der wandernden Gegnergruppe, solange sie unterwegs ist – siehe setVisible)
    this.podium = new THREE.Mesh(podiumGeo(this.color, PODIUM_R), vcol(0.45));
    this.podium.castShadow = true; this.podium.receiveShadow = true;
    this.topMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 });
    this.own.push(this.topMat);
    this.top = new THREE.Mesh(cached('map:podiumtop', () => new THREE.CircleGeometry(PODIUM_R - 0.12, 40).rotateX(-Math.PI / 2)), this.topMat);
    this.top.position.y = 0.305;
    this.top.receiveShadow = true;
    this.ring = glowRing(PODIUM_R);
    this.own.push(this.ring.material);
    this.ring.position.y = 0.03;
    this.lock = new THREE.Mesh(lockGeo(), vcol(0.35));
    this.lock.castShadow = true;
    this.lock.position.y = 1.6;
    this.flag = null;
    this.podiumGroup = new THREE.Group();
    this.podiumGroup.add(this.podium, this.top, this.ring, this.lock);
    this.group.add(this.podiumGroup);
    this.view.add(this.group);
    // solid: Podest ist begehbar (flacher Zylinder, 0,34 m – wird ohne Sprung erstiegen)
    this.shapeId = null;
    this.setPodiumVisible(true);
    this.decorate();
  }

  /** Zustand setzen: { locked, soon, enterable, done }. */
  setState(st) {
    const key = `${st.locked}|${st.soon}|${st.enterable}|${st.done}`;
    if (key === this.stateKey) return;
    this.stateKey = key;
    this.state = { ...st };
    const locked = !!st.locked;
    this.podium.geometry = podiumGeo(locked ? LOCKED_COLOR : this.color, PODIUM_R);
    this.topMat.map = numberTexture(this.label, this.color, locked);
    this.topMat.color.set(st.soon && !locked ? 0xd8d8d8 : 0xffffff);
    this.topMat.needsUpdate = true;
    this.lock.visible = locked;
    this.ring.visible = !!st.enterable;
    if (st.done && !this.flag) {
      this.flag = getModel('checkpoint_flag');
      this.flag.root.position.set(PODIUM_R * 0.62, 0.3, -PODIUM_R * 0.55);
      this.flag.root.scale.setScalar(0.85);
      this.podiumGroup.add(this.flag.root);
    }
    if (this.flag) this.flag.root.visible = !!st.done;
  }

  /** Freude-Hüpfer (neu frei geworden). */
  hop() { this.hopT = 0.0001; }

  /** Podest zeigen/verbergen (wandernde Gegnergruppe: erst nach dem Sieg ein Podest) – inkl. Kollision. */
  setPodiumVisible(v) {
    this.podiumGroup.visible = v;
    if (v && this.shapeId === null) {
      this.shapeId = this.level.world.add({ type: 'cyl', x: this.pos.x, z: this.pos.z, r: PODIUM_R, y0: this.pos.y - 0.5, y1: this.pos.y + 0.28, tag: 'podium', camIgnore: true });
    } else if (!v && this.shapeId !== null) { this.level.world.remove(this.shapeId); this.shapeId = null; }
  }

  update(dt, t) {
    if (this.lock.visible) {
      this.lock.rotation.y = Math.sin(t * 1.3) * 0.5;
      this.lock.position.y = 1.55 + Math.sin(t * 2.1) * 0.08;
    }
    if (this.ring.visible) this.ring.material.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3.2));
    if (this.flag?.root.visible) this.flag.update(dt, { anim: 'on' });
    if (this.hopT > 0) {
      this.hopT += dt;
      const k = this.hopT / 0.9;
      this.podiumGroup.position.y = k < 1 ? Math.abs(Math.sin(k * Math.PI * 2)) * 0.5 * (1 - k) : 0;
      if (k >= 1) this.hopT = 0;
    }
    for (const u of this.updaters) u(dt, t);
  }

  /** Ankerpunkt der Beschriftung (Welt). */
  anchor(out = new THREE.Vector3()) { return out.set(this.pos.x, this.pos.y + this.anchorY + this.podiumGroup.position.y, this.pos.z); }

  // ------------------------------------------------------------------ Kulissen

  addStatic(geo, opts) { this.view.addStatic(geo, opts); }

  decorate() {
    const d = this.def;
    const [x, y, z] = d.decor ?? [this.pos.x, this.pos.y, this.pos.z - 3.2];
    const W = this.level.world;
    switch (this.kind) {
      case 'meadow':
        this.addStatic(meadowGateGeo(x, y, z));
        for (const sx of [-1, 1]) W.add({ type: 'box', min: [x + sx * 2.4 - 0.45, y, z - 0.45], max: [x + sx * 2.4 + 0.45, y + 3.2, z + 0.45], tag: 'deko' });
        break;
      case 'cave': this.addStatic(placed(caveMouthGeo(), x, y, z)); break;
      case 'arena':
        for (const [x0, z0, x1, z1] of d.cage ?? []) {
          const len = Math.hypot(x1 - x0, z1 - z0);
          this.addStatic(placed(cageGeo(len), (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0)));
        }
        break;
      case 'beanstalk': {
        const m = getModel('beanstalk', { height: 10 });
        m.root.position.set(x, y, z);
        this.view.add(m.root);
        this.updaters.push((dt) => m.update(dt, { anim: 'idle' }));
        this.own.push(m);
        break;
      }
      case 'diorama': {
        this.addStatic(placed(dioramaGeo(), x, y, z));
        W.add({ type: 'box', min: [x - 1.3, y, z - 1.3], max: [x + 1.3, y + 2.3, z + 1.3], tag: 'deko' });
        W.add({ type: 'box', min: [x + 1.4, y, z + 0.5], max: [x + 2.3, y + 0.7, z + 1.1], tag: 'deko' });
        const glass = glassBoxMesh();
        glass.position.add(new THREE.Vector3(x, y, z));
        this.view.add(glass);
        break;
      }
      case 'river': this.decorateRiver(x, y, z); break;
      case 'circus':
        this.addStatic(placed(tentGeo(), x, y, z));
        W.add({ type: 'cyl', x, z, r: 3.45, y0: y, y1: y + 4.4, tag: 'deko' });
        break;
      case 'castle': this.decorateCastle(x, y, z); break;
      case 'pipe': this.decoratePipe(x, y, z); break;
      default: break;
    }
  }

  decorateRiver(x, y, z) {
    const leaf = new THREE.Mesh(leafRaftGeo(), vcol(0.5));
    leaf.castShadow = true;
    leaf.position.set(x, y, z);
    this.view.add(leaf);
    this.updaters.push((dt, t) => { leaf.position.y = y + Math.sin(t * 1.8) * 0.05; leaf.rotation.y = 0.5 + Math.sin(t * 0.7) * 0.12; leaf.rotation.z = Math.sin(t * 1.3) * 0.03; });
    const wf = this.def.waterfall;
    if (wf) this.buildWaterfall(wf);
  }

  buildWaterfall(wf) {
    const w = wf.x1 - wf.x0, h = wf.top - (wf.bottom ?? 0);
    const tex = canvasTexture('map:waterfall', 64, 256, (ctx, cw, ch) => {
      ctx.fillStyle = '#5fd0f5'; ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 26; i++) {
        const xx = (i * 37) % cw, yy = (i * 71) % ch, len = 30 + (i * 13) % 60;
        ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(200,240,255,0.9)';
        ctx.fillRect(xx, yy, 3 + (i % 3), len);
        ctx.fillRect(xx, yy - ch, 3 + (i % 3), len);
      }
    }, { repeat: true });
    const t2 = tex.clone();
    t2.needsUpdate = true;
    t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
    t2.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(1, h / 4));
    this.own.push(t2);
    const mat = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: 0.92, fog: true });
    this.own.push(mat);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    this.own.push(plane.geometry);
    plane.position.set((wf.x0 + wf.x1) / 2, (wf.bottom ?? 0) + h / 2, wf.z + 0.05);
    this.view.add(plane);
    // Gischt am Fuß
    const foamGeo = cached('map:wffoam', () => {
      const b = new Build();
      for (let i = 0; i < 9; i++) b.sphere(0.5 + (i % 3) * 0.15, 0xffffff, { p: [(i - 4) * 0.7, 0.1, (i % 2) * 0.4], s: [1, 0.5, 1] }, 8, 6);
      return b.geometry();
    });
    const foam = new THREE.Mesh(foamGeo, std('map:wffoam', { color: 0xffffff, transparent: true, opacity: 0.85, roughness: 0.9 }));
    foam.position.set((wf.x0 + wf.x1) / 2, wf.bottom ?? 0, wf.z + 0.6);
    foam.scale.set(w / 6, 1, 1);
    this.view.add(foam);
    this.updaters.push((dt, t) => {
      t2.offset.y = (t * 0.9) % 1;
      foam.scale.y = 1 + Math.sin(t * 6) * 0.15;
    });
  }

  decorateCastle(x, y, z) {
    this.addStatic(placed(fortressGeo(), x, y, z));
    const W = this.level.world;
    W.add({ type: 'box', min: [x - 3.2, y, z - 2.2], max: [x + 3.2, y + 4.8, z + 2.2], tag: 'deko' });
    for (const sx of [-1, 1]) W.add({ type: 'cyl', x: x + sx * 3.4, z: z + 0.9, r: 1.35, y0: y, y1: y + 6, tag: 'deko' });
    // Flagge (Stoff weht)
    const fw = 1.7, fh = 1.05;
    const g = new THREE.PlaneGeometry(fw, fh, 10, 5);
    g.translate(fw / 2, 0, 0);
    const base = Float32Array.from(g.attributes.position.array);
    this.own.push(g);
    const mat = new THREE.MeshStandardMaterial({ map: baronFlagTexture(), side: THREE.DoubleSide, roughness: 0.7 });
    this.own.push(mat);
    const flag = new THREE.Mesh(g, mat);
    flag.castShadow = true;
    flag.position.set(x + 0.06, y + 7.65, z - 0.6);
    this.view.add(flag);
    this.updaters.push((dt, t) => {
      const pos = g.attributes.position, a = pos.array;
      for (let i = 0; i < pos.count; i++) {
        const px = base[i * 3], f = px / fw;
        a[i * 3 + 2] = Math.sin(f * 5 - t * 5) * 0.14 * f;
        a[i * 3 + 1] = base[i * 3 + 1] - Math.sin(f * 4 - t * 4) * 0.03 * f;
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    });
  }

  decoratePipe(x, y, z) {
    const pts = (this.def.pipe ?? [[0, 0, 0], [0, 4, 0], [0, 6.2, -2.4], [0, 7, -10], [0, 6.5, -30], [0, 5, -60]]).map(([a, b, c]) => new THREE.Vector3(x + a, y + b, z + c));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.TubeGeometry(curve, 120, 1.15, 24, false);
    this.own.push(tube);
    this.level.world.add({ type: 'cyl', x, z, r: 1.2, y0: y, y1: y + 4, tag: 'deko' });
    const glass = std('map:pipeglass', { color: 0xa8e4ff, transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: 0x16506a });
    const m = new THREE.Mesh(tube, glass);
    m.renderOrder = 3;
    this.view.add(m);
    // weiße Ringe entlang der Röhre
    const b = new Build();
    const len = curve.getLength();
    for (let s = 0; s <= len; s += 3.5) {
      const p = curve.getPointAt(Math.min(1, s / len)), tan = curve.getTangentAt(Math.min(1, s / len));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
      const e = new THREE.Euler().setFromQuaternion(q);
      b.torus(1.2, 0.13, 0xffffff, { p: [p.x, p.y, p.z], r: [e.x, e.y, e.z] }, 6, 28);
    }
    this.addStatic(b.geometry(), { castShadow: false });
    // Schild „Welt 2 – bald“
    const sign = new THREE.Group();
    sign.add(new THREE.Mesh(signGeo(), vcol(0.6)), signTextMesh('Welt 2\nbald!', 'w2'));
    sign.position.set(this.pos.x + 2.6, this.pos.y, this.pos.z + 0.6);
    sign.rotation.y = -0.35;
    sign.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.view.add(sign);
  }

  dispose() {
    for (const o of this.own) o.dispose?.();
    this.own.length = 0;
    this.group.parent?.remove(this.group);
  }
}

/** Wiesentor: zwei grüne Säulen mit Blumenbogen (hinter dem Podest von 1-1). */
function meadowGateGeo(x, y, z) {
  const b = new Build();
  for (const s of [-1, 1]) {
    b.box(0.8, 2.6, 0.8, { v: (px, py) => mix(0x2f9a34, 0x5fd04a, (py + 1.3) / 2.6) }, { p: [x + s * 2.4, y + 1.3, z] }, 0.18);
    b.sphere(0.5, 0x6fdc52, { p: [x + s * 2.4, y + 2.75, z] }, 12, 8);
  }
  b.torus(2.4, 0.26, 0x4fc24a, { p: [x, y + 2.7, z] }, 8, 32, Math.PI);
  const cols = [0xff5a4a, 0xffd43a, 0xffffff, 0xff8ccc];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    b.sphere(0.2, cols[i % 4], { p: [x + Math.cos(a) * 2.4, y + 2.7 + Math.sin(a) * 2.4, z + 0.22] }, 8, 6);
  }
  return b.geometry();
}

export { TAU };
