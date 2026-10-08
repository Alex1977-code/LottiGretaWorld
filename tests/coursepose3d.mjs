// Kurs-Modus der Figuren-Avatare (HeroAvatar Lotti/Greta, PflaumeAvatar): Im 3D-Level des Klassik-Spiels
// werden die Avatare per setCourseMode(true) umgeschaltet und – ohne Motor – direkt über obj.course in alle
// Zustände des 3D-Bewegungssets gebracht (Saltos schrittweise über phase). Nahaufnahmen landen unter
// tests/out/cp_*.png (Sichtprüfung); für Wand, Ranke und Wasser blendet der Test Hilfsflächen ein.
// Messungen: keine Konsolenfehler; Kurs-Modus aus → Klassik-Pose und -Aufbau exakt wie vorher; Zeichenaufrufe
// (sichtbare Meshes) im Kurs-Modus wie im Klassik-Modus, Kostüme höchstens +4; Zöpfe bleiben in Saltos
// heil (keine Neuablage, Knickwinkel begrenzt, Enden außerhalb des Kopfes); Hände/Sohle an der Wand ohne
// Durchdringung; beim Schwimmen Kopf über, Becken unter der Wasserlinie; Floß und Lampe nur bei Bedarf.
// Aufruf: npm run build && PORT_BASE=1100 node tests/coursepose3d.mjs
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4196;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const CLIP = { x: 270, y: 40, width: 420, height: 460 };

await loadGame(page, PORT, errors, stop, 'level1', '2', '1');
await sc(() => { const s = window.__game.scene.getScene('Play'); [...s.enemies.getChildren()].forEach((e) => e.destroy()); });
await page.waitForFunction(() => { const h = window.__game.scene.getScene('Play').hero; return h.onGround && Math.abs(h.body.velocity.x) < 1; }, null, { timeout: 20000 });

// ---------------------------------------------------------------- Prüfstand im Browser
await sc(() => {
  const v = window.__view3d, s = window.__game.scene.getScene('Play');
  const H = window.__cp = { t: 0, dt: 1 / 60, cam: { az: 0, el: 0.12, dist: 5.6, y: 0.75 }, focus: null, props: [] };
  const orig = v.updateCamera.bind(v);
  v.updateCamera = function () {
    if (!H.focus) return orig();
    // Kamera-Ziel ist root + y; die Figur steht im Bild etwas unter der Mitte
    const p = H.focus.root.position, c = H.cam;
    this.target.set(p.x, p.y + c.y, p.z);
    this.camera.position.set(this.target.x + c.dist * Math.cos(c.el) * Math.sin(c.az), this.target.y + c.dist * Math.sin(c.el), this.target.z + c.dist * Math.cos(c.el) * Math.cos(c.az));
    this.camera.lookAt(this.target);
  };
  const Vec = v.camera.position.constructor;
  H.V = (x = 0, y = 0, z = 0) => new Vec(x, y, z);
  H.hero = () => v.avatars.get(s.hero);
  H.rabbit = () => { const m = s.mounts.getChildren()[0]; return m ? v.avatars.get(m) : null; };
  // Boden unter der Heldin (Klassik-Fußpunkt) als Bühne
  const h = s.hero, av0 = H.hero();
  H.stage = av0.root.position.clone();
  /** Avatar übernehmen: Kurs-Modus an, manuelle Steuerung (View3D ruft sync() → nichts). */
  H.take = (av, at) => {
    av.sync = () => {};
    av.setCourseMode(true);
    av.root.position.copy(at ?? H.stage);
    av.root.rotation.set(0, 0, 0);
    av.root.visible = true;
    return av;
  };
  /** n Bilder Kurs-Animation mit Zustand c (wird in obj.course gelegt). */
  H.pose = (av, c, n = 30, dt = H.dt) => {
    av.obj.course = { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: false, climbing: false, ...c };
    for (let i = 0; i < n; i++) { H.t += dt; av.animate(dt, H.t); }
  };
  // Sichtbare Meshes (inkl. Vorfahren) und Schattenwerfer = Zeichenaufrufe dieses Avatars
  H.calls = (av) => {
    let meshes = 0, shadow = 0;
    av.root.traverseVisible((o) => { if (o.isMesh || o.isLine || o.isSprite) { meshes++; if (o.castShadow) shadow++; } });
    return { meshes, shadow, total: meshes + shadow };
  };
  // Hilfsflächen: Quader aus 8 Ecken (BufferGeometry aus vorhandenen Konstruktoren), halbtransparent
  const G = av0.hairMesh.geometry.constructor, A = av0.hairMesh.geometry.attributes.position.constructor, M = av0.hairMesh.constructor;
  H.box = (x0, x1, y0, y1, z0, z1, color, opacity = 0.55) => {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
    const pos = [];
    for (const tri of f) for (const k of tri) pos.push(...p[k]);
    const g = new G(); g.setAttribute('position', new A(new Float32Array(pos), 3)); g.computeVertexNormals();
    const m = av0.armN.armMesh.material.clone(); m.color.set(color); m.transparent = opacity < 1; m.opacity = opacity; m.side = 2;
    const me = new M(g, m); me.renderOrder = 5;
    v.three.add(me); H.props.push(me);
    return me;
  };
  H.clearProps = () => { for (const p of H.props) { v.three.remove(p); p.geometry.dispose(); p.material.dispose(); } H.props.length = 0; };
  // Ausdehnung von Meshes (mit Skinning) im root-System (root ohne Drehung)
  H.extent = (av, filter = () => true) => {
    av.root.updateMatrixWorld(true);
    const lo = H.V(1e9, 1e9, 1e9), hi = H.V(-1e9, -1e9, -1e9), w = H.V(), r = av.root.position;
    av.root.traverseVisible((o) => {
      if (!o.isMesh || !filter(o)) return;
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) { o.getVertexPosition(i, w); w.applyMatrix4(o.matrixWorld).sub(r); lo.min(w); hi.max(w); }
    });
    return { lo: [lo.x, lo.y, lo.z], hi: [hi.x, hi.y, hi.z] };
  };
  // Alle Vertices einer Gruppe als Liste (root-System) – für Abstandsprüfungen
  H.points = (obj, av) => {
    av.root.updateMatrixWorld(true);
    const out = [], w = H.V(), r = av.root.position;
    obj.traverseVisible((o) => {
      if (!o.isMesh) return;
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i += 2) { o.getVertexPosition(i, w); w.applyMatrix4(o.matrixWorld).sub(r); out.push([w.x, w.y, w.z]); }
    });
    return out;
  };
  // Zopf-Zustand: Neuablagen, größter Knick, größter Winkel des ersten Glieds zur Kopf-„unten“-Richtung, kleinster Abstand Ende–Kopf
  H.braidState = (av) => {
    if (!av.braids) return null;
    const head = av.braidColliders.head.c, out = { resets: 0, bend: 0, root: 0, tipHead: 9, finite: true };
    const q = av.root.quaternion.clone(), down = H.V(0, -1, 0);
    for (const b of av.braids) {
      const ch = b.chain;
      out.resets += ch.resets ?? 0;
      b.anchor.getWorldQuaternion(q);
      const d = down.clone().applyQuaternion(q);
      out.root = Math.max(out.root, Math.acos(Math.max(-1, Math.min(1, ch.dirs[0].dot(d)))));
      for (let i = 1; i < ch.n; i++) out.bend = Math.max(out.bend, Math.acos(Math.max(-1, Math.min(1, ch.dirs[i].dot(ch.dirs[i - 1])))));
      for (let i = 1; i < ch.n; i++) out.tipHead = Math.min(out.tipHead, ch.pos[i].distanceTo(head));
      for (const p of ch.pos) if (!Number.isFinite(p.x + p.y + p.z)) out.finite = false;
    }
    return out;
  };
  // Schnappschuss aller Transformationen (Pfad = Kindindizes; Zöpfe und Möhren-Pendel ausgenommen: Physik)
  H.snapshot = (av) => {
    const out = {};
    const skip = new Set();
    for (const b of av.braids ?? []) for (const l of b.links) skip.add(l);
    skip.add(av.pendulum);
    const walk = (o, path) => {
      if (skip.has(o)) return;
      const r = (x) => Math.round(x * 1e5) / 1e5;
      out[path] = [o.visible, ...o.position.toArray().map(r), ...o.quaternion.toArray().map(r), ...o.scale.toArray().map(r), o.geometry?.uuid ?? '', o.material?.uuid ?? ''].join('|');
      o.children.forEach((c, i) => walk(c, `${path}/${i}`));
    };
    walk(av.root, 'r');
    return out;
  };
  /** Klassik-Animation deterministisch (feste Zeit, kein Blinzeln) über HeroAvatar.prototype.sync. */
  H.classic = (av, n = 60) => {
    av.blinker.update = () => 1;
    const sync = Object.getPrototypeOf(av).sync;
    for (let i = 0; i < n; i++) sync.call(av, 1 / 60, 5.0);
  };
});

const frames = async (n = 2) => {
  const f0 = await sc(() => window.__view3d.frame);
  await page.waitForFunction((f) => window.__view3d.frame >= f, f0 + n, { timeout: 30000, polling: 50 });
};
const cam = (o) => sc((o) => Object.assign(window.__cp.cam, o), o);
const VIEWS = {
  side: { az: 0.45, el: 0.14, dist: 6.0, y: 0.85 },
  profile: { az: 0, el: 0.1, dist: 6.0, y: 0.85 },
  rear: { az: -Math.PI / 2 + 0.6, el: 0.5, dist: 6.2, y: 0.7 },
  front: { az: 0.75, el: 0.15, dist: 5.4, y: 0.8 },
  back: { az: -Math.PI / 2 + 0.25, el: 0.2, dist: 5.6, y: 0.8 },
};
const shot = async (name, view) => {
  if (view) await cam(VIEWS[view]);
  await frames(2);
  await page.screenshot({ path: `${OUT}cp_${name}.png`, clip: CLIP });
};
/** Zustand setzen und n Bilder animieren (im Browser). */
const pose = (who, c, n = 30) => sc(([who, c, n]) => { const H = window.__cp; H.pose(who === 'rabbit' ? H.rabbit() : H.hero(), c, n); }, [who, c, n]);
const take = (who) => sc((who) => { const H = window.__cp; const av = who === 'rabbit' ? H.rabbit() : H.hero(); H.take(av); H.focus = av; return true; }, who);

// ---------------------------------------------------------------- Klassik-Ausgangslage (Schnappschuss)
const classicBefore = await sc(() => {
  const H = window.__cp, av = H.hero();
  av.sync = () => {};
  H.classic(av, 90);
  return { snap: H.snapshot(av), calls: H.calls(av) };
});
console.log('  Klassik: Zeichenaufrufe der Heldin', JSON.stringify(classicBefore.calls));
check('Avatare haben setCourseMode', await sc(() => typeof window.__cp.hero().setCourseMode === 'function' && typeof window.__cp.rabbit()?.setCourseMode === 'function'));

// ---------------------------------------------------------------- Lotti im Kurs-Modus
await take('hero');
await pose('hero', { state: 'idle' }, 40);
const courseCalls = await sc(() => { const H = window.__cp, av = H.hero(); return { calls: H.calls(av), yaw: av.model.rotation.y, scale: av.model.scale.toArray(), carm: av.armN.carm.visible && !av.armN.armMesh.visible }; });
console.log('  Kurs (Stand): Zeichenaufrufe', JSON.stringify(courseCalls.calls), 'Modell-Gier', courseCalls.yaw.toFixed(3));
check('Kurs-Modus: Modell blickt nach +X (keine eigene Gier/Neigung)', Math.abs(courseCalls.yaw) < 1e-9);
check('Kurs-Modus: Ellbogen-Arme statt starrer Arme', courseCalls.carm);
check('Kurs-Modus: Zeichenaufrufe wie im Klassik-Modus (ohne Kostüm)', courseCalls.calls.total === classicBefore.calls.total && courseCalls.calls.meshes === classicBefore.calls.meshes);
// flipX darf nichts ändern
const flipOk = await sc(() => { const H = window.__cp, av = H.hero(); av.obj.flipX = true; H.pose(av, { state: 'idle' }, 5); const y = av.model.rotation.y; av.obj.flipX = false; return Math.abs(y) < 1e-9; });
check('Kurs-Modus ignoriert flipX', flipOk);

await shot('lotti_idle_side', 'side'); await shot('lotti_idle_front', 'front'); await shot('lotti_idle_rear', 'rear');
for (const [st, sp] of [['walk', 6], ['run', 10]]) {
  await pose('hero', { state: st, speed: sp }, 40);
  await shot(`lotti_${st}_a`, 'side'); await pose('hero', { state: st, speed: sp }, 7); await shot(`lotti_${st}_b`, 'side');
  await pose('hero', { state: st, speed: sp }, 5); await shot(`lotti_${st}_rear`, 'rear');
}
await pose('hero', { state: 'skid', speed: 8 }, 20); await shot('lotti_skid', 'side'); await shot('lotti_skid_front', 'front');
await pose('hero', { state: 'jump', vy: 6, grounded: false }, 20); await shot('lotti_jump_up', 'side'); await shot('lotti_jump_up_rear', 'rear');
await pose('hero', { state: 'jump', vy: -4, grounded: false }, 20); await shot('lotti_jump_down', 'side');
await pose('hero', { state: 'jump2', vy: 6, grounded: false }, 20); await shot('lotti_jump2', 'side'); await shot('lotti_jump2_rear', 'rear');

/** Salto-Folge: phase 0 → 1 in kleinen Schritten, Bilder bei 0/0,25/0,5/0,75/1, Zopf-Zustand bei jedem Schritt. */
async function flip(who, state, name, view, extra = {}, steps = 40) {
  await pose(who, { state, phase: 0, grounded: false, vy: 5, ...extra }, 6);
  const worst = { resets0: null, resets: 0, bend: 0, root: 0, tipHead: 9, finite: true };
  for (let k = 0; k <= 4; k++) {
    const res = await sc(([who, state, extra, k, steps]) => {
      const H = window.__cp, av = who === 'rabbit' ? H.rabbit() : H.hero();
      const from = k === 0 ? 0 : ((k - 1) * steps) / 4, to = (k * steps) / 4, list = [];
      for (let i = from; i <= to; i++) {
        H.pose(av, { state, phase: i / steps, grounded: false, vy: 5 - (10 * i) / steps, ...extra }, 1);
        list.push(H.braidState(av));
      }
      return list;
    }, [who, state, extra, k, steps]);
    for (const b of res) {
      if (!b) continue;
      if (worst.resets0 === null) worst.resets0 = b.resets;
      worst.resets = b.resets; worst.bend = Math.max(worst.bend, b.bend); worst.root = Math.max(worst.root, b.root);
      worst.tipHead = Math.min(worst.tipHead, b.tipHead); worst.finite &&= b.finite;
    }
    await shot(`${name}_${k * 25}`, view);
  }
  return worst;
}
const braidChecks = [];
for (const [state, view] of [['jump3', 'side'], ['backflip', 'side'], ['sideflip', 'back']]) {
  const w = await flip('hero', state, `lotti_${state}`, view);
  braidChecks.push([state, w]);
  if (state === 'jump3') await shot('lotti_jump3_tada_rear', 'rear');
  console.log(`  Zöpfe ${state}:`, JSON.stringify({ neu: w.resets - w.resets0, knick: +w.bend.toFixed(2), wurzel: +w.root.toFixed(2), endeKopf: +w.tipHead.toFixed(3) }));
}
await pose('hero', { state: 'fall', grounded: false, vy: -6 }, 20);
await pose('hero', { state: 'longjump', grounded: false, vy: 2, speed: 9 }, 25); await shot('lotti_longjump', 'side'); await shot('lotti_longjump_rear', 'rear');
await pose('hero', { state: 'longjump', grounded: false, vy: -6, speed: 9 }, 10); await shot('lotti_longjump_down', 'side');
await pose('hero', { state: 'fall', grounded: false, vy: -8 }, 20); await shot('lotti_fall', 'side');
await pose('hero', { state: 'land' }, 3); await shot('lotti_land', 'side');
await pose('hero', { state: 'crouch' }, 25); await shot('lotti_crouch', 'side');
await pose('hero', { state: 'slide', speed: 8 }, 25); await shot('lotti_slide', 'side'); await shot('lotti_slide_rear', 'rear');
// Stampfattacke: Einrollen (phase < 0,3), Sturz, Aufprall
{
  for (const [ph, n, name] of [[0.0, 4, 'gp_00'], [0.1, 1, 'gp_10'], [0.2, 1, 'gp_20'], [0.5, 12, 'gp_drop']]) {
    await sc(([ph, n]) => { const H = window.__cp, av = H.hero(); for (let i = 0; i < n; i++) H.pose(av, { state: 'groundpound', phase: ph, grounded: false, vy: -2 }, 1); }, [ph, n]);
    await shot(`lotti_${name}`, 'side');
  }
  await pose('hero', { state: 'groundpound', phase: 1, grounded: true }, 2); await shot('lotti_gp_impact', 'side');
  await pose('hero', { state: 'groundpound', phase: 1, grounded: true }, 20);
}

// ---------------------------------------------------------------- Wand, Ranke, Wasser (mit Hilfsflächen)
const anchors = await sc(() => window.__cp.hero().constructor.courseAnchors(true));
console.log('  Kurs-Anker (m)', JSON.stringify(anchors));
const U = 1.5; // Einheiten je Meter (groß)
const stageWall = (side) => sc(([side, w]) => { const H = window.__cp, p = H.stage; return !!(side < 0 ? H.box(p.x - w - 0.4, p.x - w, p.y - 0.2, p.y + 3, p.z - 1.2, p.z + 1.2, '#c9a77a') : H.box(p.x + w, p.x + w + 0.4, p.y - 0.2, p.y + 3, p.z - 1.2, p.z + 1.2, '#c9a77a')); }, [side, anchors.wall * U]);
const figureExtent = (filter) => sc((filter) => {
  const H = window.__cp, av = H.hero();
  const f = filter === 'body' ? (o) => !av.braids?.some((b) => b.links.some((l) => l.children.includes(o)))
    : filter === 'handN' ? (o) => o === av.armN.carm : filter === 'handF' ? (o) => o === av.armF.carm : () => true;
  return H.extent(av, f);
}, filter);
await stageWall(-1);
await pose('hero', { state: 'wallslide', vy: -2, grounded: false }, 40);
const ws = await figureExtent('body'), wsHand = await figureExtent('handN');
console.log('  Wandrutschen: Figur x', ws.lo[0].toFixed(3), '… Hand x', wsHand.lo[0].toFixed(3), 'Wand bei', (-anchors.wall * U).toFixed(3));
check('Wandrutschen: nichts steckt in der Wand (−X)', ws.lo[0] >= -anchors.wall * U - 0.03);
check('Wandrutschen: nahe Hand berührt die Wand', Math.abs(wsHand.lo[0] + anchors.wall * U) < 0.05);
await shot('lotti_wallslide_side', 'side'); await shot('lotti_wallslide_front', 'front');
await pose('hero', { state: 'walljump', grounded: false, vy: 5 }, 12); await shot('lotti_walljump', 'side');
await sc(() => window.__cp.clearProps());
await stageWall(1);
await pose('hero', { state: 'climb', vy: 3, grounded: false, power: 'krallen' }, 40);
const cl = await figureExtent('body'), clHandN = await figureExtent('handN'), clHandF = await figureExtent('handF');
console.log('  Klettern: Figur x bis', cl.hi[0].toFixed(3), 'Hände', clHandN.hi[0].toFixed(3), clHandF.hi[0].toFixed(3), 'Wand bei', (anchors.wall * U).toFixed(3));
check('Klettern: nichts steckt in der Wand (+X)', cl.hi[0] <= anchors.wall * U + 0.03);
check('Klettern: eine Hand an der Wand', Math.max(clHandN.hi[0], clHandF.hi[0]) > anchors.wall * U - 0.05);
await shot('lotti_climb_a', 'profile'); await pose('hero', { state: 'climb', vy: 3, grounded: false, power: 'krallen' }, 6); await shot('lotti_climb_b', 'profile'); await shot('lotti_climb_rear', 'rear');
await sc(() => window.__cp.clearProps());
await sc(([vx, vr]) => { const H = window.__cp, p = H.stage; H.box(p.x + vx - vr, p.x + vx + vr, p.y - 0.2, p.y + 3.2, p.z - vr, p.z + vr, '#4caf3a', 0.9); }, [anchors.vine * U, anchors.vineRadius * U]);
await pose('hero', { state: 'beanstalk', vy: 2, grounded: false }, 40);
// Abstand zur Rankenachse: Körper (ohne Hände, Zöpfe) nicht in der Ranke, Hände greifen an ihrer Oberfläche
const vine = await sc(([vx, vr]) => {
  const H = window.__cp, av = H.hero();
  const braid = (o) => av.braids?.some((b) => b.links.some((l) => l.children.includes(o)));
  const dist = (pts) => Math.min(...pts.map(([x, , z]) => Math.hypot(x - vx, z)));
  const body = [];
  av.root.updateMatrixWorld(true);
  av.root.traverseVisible((o) => { if (o.isMesh && o !== av.armN.carm && o !== av.armF.carm && !braid(o)) body.push(...H.points(o, av)); });
  return { body: dist(body) - vr, hands: Math.min(dist(H.points(av.armN.carm, av)), dist(H.points(av.armF.carm, av))) - vr };
}, [anchors.vine * U, anchors.vineRadius * U]);
console.log('  Ranke: Abstand Körper', vine.body.toFixed(3), 'Hände', vine.hands.toFixed(3), '(zur Oberfläche)');
check('Ranke: Körper höchstens 2 cm in der Ranke, Hände an ihr', vine.body > -0.03 && vine.hands < 0.06 && vine.hands > -0.08);
await shot('lotti_beanstalk_side', 'profile'); await shot('lotti_beanstalk_rear', 'rear');
await sc(() => window.__cp.clearProps());
await sc((wl) => { const H = window.__cp, p = H.stage; H.box(p.x - 3, p.x + 3, p.y - 1, p.y + wl, p.z - 3, p.z + 3, '#3aa0e8', 0.5); }, anchors.waterLine * U);
for (const [name, sp, n] of [['tread', 0, 40], ['stroke_a', 3, 40], ['stroke_b', 3, 25]]) {
  await pose('hero', { state: 'swim', speed: sp }, n);
  const sw = await sc(() => { const H = window.__cp, av = H.hero(); av.root.updateMatrixWorld(true); const w = H.V(); av.head.getWorldPosition(w); const hy = w.y - av.root.position.y; av.pelvis.getWorldPosition(w); return { neck: hy, pelvis: w.y - av.root.position.y }; });
  if (name !== 'stroke_b') check(`Schwimmen (${name}): Hals über, Becken unter der Wasserlinie`, sw.neck > anchors.waterLine * U - 0.05 && sw.pelvis < anchors.waterLine * U);
  await shot(`lotti_swim_${name}`, name === 'tread' ? 'front' : 'side');
}
await sc(() => window.__cp.clearProps());

// ---------------------------------------------------------------- weitere Zustände
await pose('hero', { state: 'pipe' }, 20); await shot('lotti_pipe', 'side');
await pose('hero', { state: 'hurt', grounded: false }, 8); await shot('lotti_hurt', 'side');
await pose('hero', { state: 'dead', grounded: false }, 20); await shot('lotti_dead_a', 'front'); await pose('hero', { state: 'dead' }, 9); await shot('lotti_dead_b', 'front');
await pose('hero', { state: 'victory' }, 12); await shot('lotti_victory_a', 'front'); await pose('hero', { state: 'victory' }, 40); await shot('lotti_victory_b', 'front'); await shot('lotti_victory_rear', 'rear');
for (const [st, view] of [['throw', 'side'], ['claw', 'front']]) {
  for (const ph of [0.2, 0.45, 0.8]) { await pose('hero', { state: st, phase: ph }, 3); await shot(`lotti_${st}_${Math.round(ph * 100)}`, view); }
}
await pose('hero', { state: 'run', speed: 10, holding: true }, 30); await shot('lotti_hold_front', 'side');
await pose('hero', { state: 'idle', holding: 'over' }, 30); await shot('lotti_hold_over', 'side');

// ---------------------------------------------------------------- Kostüme (Lotti)
const costume = async (power, prefix, extra = []) => {
  await pose('hero', { state: 'idle', power }, 30);
  const calls = await sc(() => window.__cp.calls(window.__cp.hero()));
  await shot(`${prefix}_${power}_front`, 'front'); await shot(`${prefix}_${power}_rear`, 'rear');
  for (const [st, c, view] of extra) { await pose('hero', { state: st, power, ...c }, 30); await shot(`${prefix}_${power}_${st}`, view); }
  return calls;
};
const kr = await costume('krallen', 'lotti', [['claw', { phase: 0.45 }, 'front'], ['run', { speed: 10 }, 'side']]);
const fu = await costume('funken', 'lotti', [['throw', { phase: 0.45 }, 'side']]);
const stc = await costume('stern', 'lotti', [['run', { speed: 10 }, 'side']]);
console.log('  Zeichenaufrufe Kostüme: krallen', kr.total, 'funken', fu.total, 'stern', stc.total, '(ohne', courseCalls.calls.total, ')');
check('Kostüme: höchstens 4 zusätzliche Zeichenaufrufe', [kr, fu, stc].every((c) => c.total - courseCalls.calls.total <= 4));
await pose('hero', { state: 'idle', power: 'none' }, 30);
check('Kostüm aus: Zeichenaufrufe wieder wie ohne Kostüm', (await sc(() => window.__cp.calls(window.__cp.hero()))).total === courseCalls.calls.total);

// Zöpfe: alle Saltos heil
for (const [state, w] of braidChecks) {
  check(`Zöpfe ${state}: keine Neuablage, Knick ≤ 45°, Ansatz im Kegel, Enden außerhalb des Kopfes`, w.finite && w.resets === w.resets0 && w.bend <= 0.78 && w.root <= 1.9 && w.tipHead >= 0.3);
}

// ---------------------------------------------------------------- Kurs-Modus aus → Klassik exakt wie vorher
const classicAfter = await sc(() => {
  const H = window.__cp, av = H.hero();
  av.setCourseMode(false);
  delete av.obj.course;
  H.classic(av, 90);
  return { snap: H.snapshot(av), calls: H.calls(av) };
});
const diff = Object.keys(classicBefore.snap).filter((k) => classicBefore.snap[k] !== classicAfter.snap[k]);
if (diff.length) console.log('  Abweichungen nach Kurs-Modus:', diff.slice(0, 6).map((k) => `${k}: ${classicBefore.snap[k]} → ${classicAfter.snap[k]}`).join('\n    '));
check('Kurs-Modus aus: Klassik-Pose und -Aufbau unverändert', diff.length === 0);
check('Kurs-Modus aus: Zeichenaufrufe wie vorher', classicAfter.calls.total === classicBefore.calls.total);
await sc(() => { window.__cp.focus = window.__cp.hero(); });
await shot('lotti_classic_after', 'side');

// ---------------------------------------------------------------- Pflaume und Reiten
const rabbitInfo = await sc(() => {
  const H = window.__cp, r = H.rabbit();
  if (!r) return null;
  const base = H.calls(r);
  r.sync = () => {};
  H.take(r, H.stage.clone());
  H.hero().root.visible = false;
  H.focus = r;
  return { base };
});
check('Pflaume im Level', !!rabbitInfo);
if (rabbitInfo) {
  await cam({ ...VIEWS.side, y: 0.55, dist: 5 });
  await pose('rabbit', { state: 'idle' }, 30);
  const rc = await sc(() => window.__cp.calls(window.__cp.rabbit()));
  check('Pflaume Kurs-Modus: Zeichenaufrufe wie Klassik', rc.total === rabbitInfo.base.total);
  await shot('pflaume_idle', 'side'); await shot('pflaume_idle_front', 'front');
  await pose('rabbit', { state: 'walk', speed: 3 }, 30); await shot('pflaume_walk', 'side');
  await pose('rabbit', { state: 'run', speed: 8 }, 30); await shot('pflaume_run', 'side');
  await pose('rabbit', { state: 'jump', vy: 5, grounded: false }, 20); await shot('pflaume_jump', 'side');
  await sc((wl) => { const H = window.__cp, p = H.stage; H.box(p.x - 4, p.x + 4, p.y - 1.2, p.y - 0.01, p.z - 4, p.z + 4, '#3aa0e8', 0.6); }, 0);
  await pose('rabbit', { state: 'paddle', speed: 1 }, 30);
  const pc = await sc(() => { const H = window.__cp, r = H.rabbit(); return { calls: H.calls(r), raft: r.raft?.visible }; });
  await shot('pflaume_paddle_a', 'front'); await pose('rabbit', { state: 'paddle', speed: 1 }, 35); await shot('pflaume_paddle_b', 'rear'); await shot('pflaume_paddle_side', 'side');
  await sc(() => window.__cp.clearProps());
  check('Pflaume paddelt auf dem Blatt-Floß (sichtbar, ≤ 4 zusätzliche Zeichenaufrufe)', pc.raft && pc.calls.total - rc.total <= 4);
  await pose('rabbit', { state: 'dig' }, 30); await shot('pflaume_dig_a', 'side'); await pose('rabbit', { state: 'dig' }, 3); await shot('pflaume_dig_b', 'front');
  await pose('rabbit', { state: 'victory' }, 14); await shot('pflaume_victory_a', 'front'); await pose('rabbit', { state: 'victory' }, 60); await shot('pflaume_victory_b', 'side');
  await pose('rabbit', { state: 'idle', gear: 'lamp' }, 30);
  const gc = await sc(() => { const H = window.__cp, r = H.rabbit(); return { calls: H.calls(r), raft: r.raft?.visible ?? false }; });
  check('Pflaume mit Stirnlampe und Rucksack: ≤ 4 zusätzliche Zeichenaufrufe, Floß weg', gc.calls.total - rc.total <= 4 && !gc.raft);
  await shot('pflaume_lamp_front', 'front'); await shot('pflaume_lamp_rear', 'rear');
  await pose('rabbit', { state: 'walk', speed: 2.5, gear: 'lamp' }, 30); await shot('pflaume_lamp_walk', 'side');
  await pose('rabbit', { state: 'dig', gear: 'lamp' }, 30); await shot('pflaume_lamp_dig', 'front');
  await pose('rabbit', { state: 'idle', power: 'red' }, 10);
  // Reiten: Heldin auf Pflaume (root + Reithöhe), Takt von der Reiterin
  await sc(() => {
    const H = window.__cp, r = H.rabbit(), h = H.hero();
    h.setCourseMode(true);
    h.root.visible = true;
    h.root.position.copy(r.root.position).add(H.V(0, h.constructor.courseAnchors(true).rideHeight * 1.5, 0));
    H.focus = r;
  });
  for (let i = 0; i < 30; i++) {
    await sc(() => { const H = window.__cp, r = H.rabbit(), h = H.hero(); H.pose(h, { state: 'ride', speed: 6 }, 1); r.obj.course = { state: 'ride', speed: 6, rider: h, power: 'red' }; H.t -= H.dt; r.animate(H.dt, H.t += H.dt); });
  }
  await cam({ ...VIEWS.side, y: 1.0, dist: 6 }); await shot('ride_side');
  await cam({ ...VIEWS.rear, y: 1.0, dist: 6.5 }); await shot('ride_rear');
  const rideSync = await sc(() => { const H = window.__cp; return Math.abs(H.rabbit().hopPhase - H.hero().ridePhase) < 1e-9 && H.hero().rod.visible; });
  check('Reiten: Takt synchron, Angel sichtbar', rideSync);
  // Pflaume aus dem Kurs-Modus: Klassik-Aufbau (Floß/Lampe unsichtbar)
  const rOff = await sc(() => { const H = window.__cp, r = H.rabbit(); r.setCourseMode(false); delete r.obj.course; const n = H.calls(r).total; r.root.visible = false; return n; });
  check('Pflaume Kurs-Modus aus: Zeichenaufrufe wie Klassik', rOff === rabbitInfo.base.total);
}

// ---------------------------------------------------------------- Greta
await sc(() => { const H = window.__cp, h = H.hero(); h.setCourseMode(false); window.__game.scene.getScene('Play').hero.setHeroKey('greta'); });
await page.waitForFunction(() => window.__cp.hero()?.variant === 'greta', null, { timeout: 20000 });
await take('hero');
await pose('hero', { state: 'idle' }, 40);
await shot('greta_idle_front', 'front'); await shot('greta_idle_rear', 'rear');
await pose('hero', { state: 'run', speed: 10 }, 40); await shot('greta_run', 'side');
await flip('hero', 'jump3', 'greta_jump3', 'side');
await flip('hero', 'backflip', 'greta_backflip', 'side');
await pose('hero', { state: 'longjump', grounded: false, vy: 1, speed: 9 }, 25); await shot('greta_longjump', 'side');
await stageWall(-1); await pose('hero', { state: 'wallslide', vy: -2, grounded: false }, 40); await shot('greta_wallslide', 'side'); await sc(() => window.__cp.clearProps());
await pose('hero', { state: 'victory' }, 50); await shot('greta_victory', 'front');
await pose('hero', { state: 'idle', power: 'krallen' }, 30); await shot('greta_krallen_front', 'front'); await shot('greta_krallen_rear', 'rear');
await pose('hero', { state: 'idle', power: 'funken' }, 30); await shot('greta_funken_front', 'front');
await pose('hero', { state: 'idle', power: 'stern' }, 30); await shot('greta_stern_front', 'front');
await pose('hero', { state: 'idle', power: 'none', big: false }, 10);
const gretaOff = await sc(() => { const H = window.__cp, av = H.hero(); av.setCourseMode(false); delete av.obj.course; H.classic(av, 30); return { yaw: av.model.rotation.y, carm: av.armN.carm.visible }; });
check('Greta Kurs-Modus aus: wieder Klassik-Blickrichtung, starre Arme', Math.abs(gretaOff.yaw) > 0.1 && !gretaOff.carm);

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
