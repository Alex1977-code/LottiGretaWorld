// Unterwasser-Ansicht (Präzisierung Motor Welt 3; Bauplan 3-5 „Lagune … Schwimmen“, 3-Kapitän „unten unter Wasser“).
// Klein und abgegrenzt: nutzt nur, was die Ansicht schon anbietet (view.onFrame, view.add, view.three.fog/background,
// view.camera) – src/three und src/course/view bleiben unverändert. CourseScene ruft installUnderwaterView(scene) einmal.
//
// Je Bild (nach der Kamera, vor dem Zeichnen): Stärke k → 1, wenn die Kamera in einer Wasserform steckt, → 0,6, wenn die
// Haupt-Figur getaucht ist (state 'swimUnder'), sonst → 0 (weich, ~0,2 s). Mit k > 0: Nebel dicht und wasserfarben
// (near/far → 2/30 m), Hintergrund wasserfarben, eine halbdurchsichtige Tönung vor der Kamera (ein Zeichenaufruf, nur
// sichtbar, solange k > 0). Bei k = 0 sind Nebel und Hintergrund genau wie vorher. Keine Luftanzeige (wie im Vorbild).
//
// Farbe: LEVEL.underwater = { color: 0x1f78b4, near: 2, far: 30, tint: 0.22 } (optional), sonst view.theme.waterDeep.

import * as THREE from 'three';

export function installUnderwaterView(scene) {
  const view = scene.view, level = scene.level;
  const three = view?.three;
  if (!three || !view.onFrame) return null;
  const cfg = level?.data?.underwater ?? {};
  const water = new THREE.Color(cfg.color ?? view.theme?.waterDeep ?? 0x1c6fd1);
  const near = cfg.near ?? 2, far = cfg.far ?? 30, tintMax = cfg.tint ?? 0.22;
  const base = {
    fog: three.fog ? { color: three.fog.color.clone(), near: three.fog.near, far: three.fog.far } : null,
    bg: three.background?.isColor ? three.background.clone() : null,
  };
  // Tönung: Fläche direkt vor der Kamera (ohne Tiefentest, zuletzt gezeichnet)
  const mat = new THREE.MeshBasicMaterial({ color: water, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
  tint.name = 'unterwasser';
  tint.renderOrder = 999;
  tint.frustumCulled = false;
  tint.visible = false;
  view.add(tint);
  const fwd = new THREE.Vector3();
  const st = { k: 0, camUnder: false, target: 0 };
  const restore = () => {
    if (base.fog && three.fog) { three.fog.color.copy(base.fog.color); three.fog.near = base.fog.near; three.fog.far = base.fog.far; }
    if (base.bg && three.background?.isColor) three.background.copy(base.bg);
  };
  const off = view.onFrame((dt) => {
    const cam = view.camera.position;
    st.camUnder = !!level.waterAt?.(cam.x, cam.y, cam.z);
    const p = level.player;
    st.target = st.camUnder ? 1 : (p && !p.dead && p.mode === 'swim' && p.state === 'swimUnder') ? 0.6 : 0;
    st.k += (st.target - st.k) * (1 - Math.exp(-12 * Math.min(dt, 0.1)));
    if (Math.abs(st.k - st.target) < 0.002) st.k = st.target;
    const k = st.k;
    if (k <= 0) { if (tint.visible) { tint.visible = false; restore(); } return; }
    if (base.fog && three.fog) {
      three.fog.color.copy(base.fog.color).lerp(water, k);
      three.fog.near = base.fog.near + (near - base.fog.near) * k;
      three.fog.far = base.fog.far + (far - base.fog.far) * k;
    }
    if (base.bg && three.background?.isColor) three.background.copy(base.bg).lerp(water, k);
    tint.visible = true;
    mat.opacity = tintMax * k;
    view.camera.getWorldDirection(fwd);
    tint.position.copy(cam).addScaledVector(fwd, view.camera.near + 0.05);
    tint.quaternion.copy(view.camera.quaternion);
  });
  return {
    state: st,
    info: () => ({ k: +st.k.toFixed(3), cameraUnder: st.camUnder, target: st.target, fogFar: three.fog ? +three.fog.far.toFixed(1) : null }),
    dispose() { off(); restore(); view.remove(tint); tint.geometry.dispose(); mat.dispose(); },
  };
}
