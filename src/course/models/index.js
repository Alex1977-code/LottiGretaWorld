// Registry der 3D-Modelle des Kurs-Modus. Sammelt alle Module unter ./kinds/ automatisch:
// jedes exportiert `MODELS = { name: (opts) => model }` mit model = { root, update(dt, state), dispose() }.
// Maßstab Meter, Ursprung = Fußpunkt, Blick nach +X. Fehlt ein Name, gibt es einen gut sichtbaren Platzhalter.
import * as THREE from 'three';

const modules = import.meta.glob('./kinds/*.js', { eager: true });
const REGISTRY = {};
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, factory] of Object.entries(mod.MODELS ?? {})) {
    if (REGISTRY[name]) console.warn(`[Modelle] doppelter Name ${name} in ${path}`);
    REGISTRY[name] = factory;
  }
}

/** Platzhalter: magentafarbener Quader mit Pfeil nach +X (fällt auf, wenn ein Modell fehlt). */
function placeholder(name, opts = {}) {
  const s = opts.size ?? [0.8, 0.8, 0.8];
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xff3cc8, roughness: 0.6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), mat);
  box.position.y = s[1] / 2; box.castShadow = true;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(s[1] * 0.18, s[0] * 0.4, 8), mat);
  nose.rotation.z = -Math.PI / 2; nose.position.set(s[0] / 2 + s[0] * 0.2, s[1] / 2, 0);
  root.add(box, nose);
  root.name = `platzhalter:${name}`;
  return { root, placeholder: true, update() {}, dispose() { box.geometry.dispose(); nose.geometry.dispose(); mat.dispose(); } };
}

export function hasModel(name) { return !!REGISTRY[name]; }
export function listModels() { return Object.keys(REGISTRY).sort(); }
export function getModel(name, opts = {}) {
  const f = REGISTRY[name];
  if (!f) return placeholder(name, opts);
  return f(opts);
}
