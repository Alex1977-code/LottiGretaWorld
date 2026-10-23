// Welt-3-Kostüme und -Posen der Heldinnen im Kurs (Schneegarten 0-9, CourseScene mit HeroRig): Gleitblatt-Kostüm
// (Blatt-Ohren, Ringel-Schweif) mit 'tailswipe' | 'glide' | 'statue', Schlittschuhe ('skate' + speed + skates, Kurvenneigung
// aus der Gierrate), Kettenzaun ('fence' + fenceMove, Faustschlag über fencePunch bzw. attack), Unterwasser ('swimUnder',
// Bläschen, treibende Zöpfe). Teil 1 setzt proxy.course direkt (HeroRig.update abgeschaltet, Simulation steht) und zeichnet
// Nahaufnahmen und Bilder aus der Kurs-Kamera (45°, 13 m, 38°) unter tests/out/cp3_*.png, dazu Übersichtsbögen
// tests/out/cp3_sheet_*.png; Klone (HeroRig `lite`) über level.addClone. Teil 2 („motor“) spielt dieselben Zustände mit dem
// echten Motor durch (Eingaben, HeroRig füllt proxy.course) und prüft Pose, Kufen am Boden und Hände an der Zaunebene.
// Messungen: Zeichenaufrufe (sichtbare Meshes + Schattenwerfer) und Dreiecke je Pose für Lotti/Greta, groß/klein und Klon;
// Kufen auf dem Boden, Hände am Zaun, Faust durch den Zaun, Statue auf dem Sockel und ganz aus Stein (und zurück),
// Drehung beim Schweifhieb, Zöpfe wehen beim Gleiten hoch und treiben unter Wasser, Bläschen nur bei voller Darstellung,
// unbekannter Zustand → idle, Kurs-Modus aus → Stiefel/Schweif/Stein zurück; keine Konsolenfehler.
// Aufruf: npm run build && PORT_BASE=3300 node tests/coursepose3d_w3.mjs   (Port 4203; Teilmengen: CP3_PARTS, CP3_HEROES)
import { writeFileSync, readFileSync } from 'node:fs';
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4203;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SHOTS = process.env.CP3_SHOTS !== '0';

await page.goto(`http://localhost:${port}/?course=0-9&scale=2&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
} catch {
  console.log('Kurs startet nicht. Konsole:');
  for (const x of errors) console.log('  ', x);
  stop(); process.exit(1);
}
await page.waitForTimeout(400);

// ---------------------------------------------------------------- Prüfstand im Browser
await sc(() => {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  // HUD ausblenden (ruhige Bilder)
  try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
  const V3 = c.view.camera.position.constructor;
  const H = window.__w3 = { t: 0, dt: 1 / 60, rigs: [], focus: null, cam: { mode: 'close', rel: -0.55, el: 0.18, dist: 3.4, fov: 30, h: 0.5 }, V: (x = 0, y = 0, z = 0) => new V3(x, y, z) };
  H.base = c.player.pos.clone();
  /** HeroRig festhalten: kein Füllen aus der Simulation mehr; Hülle an (dx, dz) neben dem Start, Gier, Größe. */
  H.hold = (rig) => { rig.update = () => {}; if (!H.rigs.includes(rig)) H.rigs.push(rig); return rig; };
  H.place = (rig, dx = 0, dz = 0, yaw = Math.PI / 2, big = true, dy = 0) => {
    rig.hull.position.set(H.base.x + dx, H.base.y + dy, H.base.z + dz);
    rig.hull.rotation.y = yaw; rig.yaw = yaw;
    rig.hull.scale.setScalar((big ? 1 : 0.7) / 1.5);
    rig.hull.visible = true;
    rig.big = big;
  };
  H.main = H.hold(c.rig);
  H.place(H.main);
  H.focus = H.main;
  /** n Bilder Kurs-Animation mit Zustand cc für die Figuren rigs (Standard: alle festgehaltenen); turn = Gierrate rad/s. */
  H.pose = (cc, n = 30, o = {}) => {
    const rigs = o.rigs ?? H.rigs;
    for (let i = 0; i < n; i++) {
      H.t += H.dt;
      for (const r of rigs) {
        const av = r.avatar;
        if (o.turn) { r.hull.rotation.y += o.turn * H.dt; r.yaw = r.hull.rotation.y; }
        av.obj.course = { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: r.big ?? true, holding: false, climbing: false, ...cc };
        av.animate(H.dt, H.t);
        if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004;   // wie HeroRig.update
      }
    }
  };
  // Kamera: Nahaufnahme relativ zur Blickrichtung der Figur oder Kurs-Kamera (45°, 13 m, 38°, Ziel 1 m über dem Fuß)
  c.view.rig.custom = () => {
    if (H.motor) return false;
    const cam = c.view.camera, k = H.cam, r = H.focus, s = r.hull.scale.y * 1.5;
    const tg = H.V().copy(r.hull.position);
    let az;
    if (k.mode === 'course') { tg.y += 1.0; az = k.az ?? 0; } else { tg.y += k.h * s; az = r.hull.rotation.y + Math.PI / 2 + k.rel; }
    const d = k.mode === 'course' ? 13 : k.dist * (0.55 + 0.45 * s);
    cam.position.set(tg.x + d * Math.cos(k.el) * Math.sin(az), tg.y + d * Math.sin(k.el), tg.z + d * Math.cos(k.el) * Math.cos(az));
    cam.lookAt(tg);
    const fov = k.mode === 'course' ? 38 : k.fov;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    c.view.rig.target.copy(tg);
    return true;
  };
  /** Zeichenaufrufe dieses Avatars: sichtbare Meshes (+ Schattenwerfer) und Dreiecke (Schattenpass doppelt). */
  H.calls = (av) => {
    let meshes = 0, shadow = 0, tris = 0;
    av.root.traverseVisible((o) => {
      if (!(o.isMesh || o.isLine || o.isSprite)) return;
      meshes++;
      const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      tris += n;
      if (o.castShadow) { shadow++; tris += n; }
    });
    return { meshes, shadow, total: meshes + shadow, tris: Math.round(tris) };
  };
  /** Ausdehnung (root-System, Hülle ohne Drehung angenommen → in Avatar-Einheiten über root.worldToLocal). */
  H.extent = (av, filter = () => true) => {
    av.root.updateMatrixWorld(true);
    const lo = H.V(1e9, 1e9, 1e9), hi = H.V(-1e9, -1e9, -1e9), w = H.V();
    av.root.traverseVisible((o) => {
      if (!o.isMesh || o.isInstancedMesh || !filter(o)) return;
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) { o.getVertexPosition(i, w); w.applyMatrix4(o.matrixWorld); av.root.worldToLocal(w); lo.min(w); hi.max(w); }
    });
    return { lo: [lo.x, lo.y, lo.z], hi: [hi.x, hi.y, hi.z] };
  };
  /** Tiefster Weltpunkt (y) der Meshes eines Avatars (mit Filter). */
  H.worldMinY = (av, filter = () => true) => {
    av.root.updateMatrixWorld(true);
    let lo = 1e9; const w = H.V();
    av.root.traverseVisible((o) => {
      if (!o.isMesh || o.isInstancedMesh || !filter(o)) return;
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) { o.getVertexPosition(i, w); w.applyMatrix4(o.matrixWorld); lo = Math.min(lo, w.y); }
    });
    return lo;
  };
  H.isArm = (av, o) => o === av.armN.carm || o === av.armF.carm;
  H.isBraid = (av, o) => !!av.braids?.some((b) => b.links.some((l) => l.children.includes(o)));
  /** Zopf-/Haarspitzen relativ zu den Ansätzen als Anteil der Kettenlänge (Welt-y): −1 hängt senkrecht, 0 waagerecht, +1 steht hoch. */
  H.braidLift = (av) => {
    av.root.updateMatrixWorld(true);
    const out = [], len = (ch) => ch.lengths.reduce((x, y) => x + y, 0);
    if (av.braids) for (const b of av.braids) { const a = b.anchor.getWorldPosition(H.V()); out.push((b.chain.pos[b.chain.n - 1].y - a.y) / len(b.chain)); }
    if (av.maneChain) { const a = av.mane.getWorldPosition(H.V()); out.push((av.maneChain.pos[0].y - a.y) / len(av.maneChain)); }
    return out;
  };
  // Hilfsfläche Kettenzaun: Gitter aus dünnen Stäben (ein Mesh) in der Zaunebene vor der Figur (+X der Figur, 0,3 m)
  H.props = [];
  const av0 = H.main.avatar;
  const G = av0.hairMesh.geometry.constructor, A = av0.hairMesh.geometry.attributes.position.constructor, M = av0.hairMesh.constructor;
  H.fenceProp = (r) => {
    const d = r.avatar.constructor.courseAnchors(true).fence, yaw = r.hull.rotation.y;
    const fx = Math.cos(yaw), fz = -Math.sin(yaw), sx = Math.sin(yaw), sz = Math.cos(yaw);   // vorn, rechts (Welt)
    const o = H.V(r.hull.position.x + fx * d, H.base.y - 0.2, r.hull.position.z + fz * d);
    const pos = [];
    const P = (a, b) => [o.x + sx * a, o.y + b, o.z + sz * a];
    const bar = (a0, b0, a1, b1, t) => {   // Stab von (seitlich a0, hoch b0) nach (a1, b1), Dicke t, in der Zaunebene
      const ux = a1 - a0, uy = b1 - b0, l = Math.hypot(ux, uy), nx = (-uy / l) * t, ny = (ux / l) * t;
      const q = [P(a0 + nx, b0 + ny), P(a1 + nx, b1 + ny), P(a1 - nx, b1 - ny), P(a0 - nx, b0 - ny)];
      pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    };
    const W = 1.4, Hh = 2.6, step = 0.16;
    // Rautengeflecht: zwei Scharen schräger Drähte, zugeschnitten auf das Feld
    for (let a = -W - Hh; a <= W; a += step) {
      const a0 = Math.max(-W, a), b0 = a0 - a, a1 = Math.min(W, a + Hh), b1 = a1 - a;
      if (b0 < Hh && a1 > a0) bar(a0, b0, a1, b1, 0.008);
      const c0 = Math.min(W, -a), d0 = -a - c0, c1 = Math.max(-W, -a - Hh), d1 = -a - c1;
      if (d0 < Hh && c0 > c1) bar(c0, d0, c1, d1, 0.008);
    }
    bar(-W, 0, -W, Hh, 0.035); bar(W, 0, W, Hh, 0.035); bar(-W, Hh, W, Hh, 0.03); bar(-W, 0.02, W, 0.02, 0.03);
    const g = new G(); g.setAttribute('position', new A(new Float32Array(pos), 3)); g.computeVertexNormals();
    const m = av0.armN.armMesh.material.clone(); m.color.set('#9aa3ab'); m.side = 2; m.metalness = 0.3; m.roughness = 0.5;
    const me = new M(g, m); me.castShadow = false;
    c.view.three.add(me); H.props.push(me);
  };
  H.clearProps = () => { for (const p of H.props) { c.view.three.remove(p); p.geometry.dispose(); p.material.dispose(); } H.props.length = 0; };
  /** Bildschirmlage (CSS-Pixel) eines Punkts über dem Fuß der Figur. */
  H.screen = (r, up = 0.5) => {
    const v = H.V().copy(r.hull.position); v.y += up * r.hull.scale.y * 1.5;
    v.project(c.view.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  };
});

const frames = async (n = 3) => {
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction(([f, n]) => window.__course.view.frame >= f + n, [f0, n], { timeout: 90000, polling: 50 }).catch(() => {});
};
const VIEWS = {
  front: { mode: 'close', rel: -0.55, el: 0.16, dist: 3.4, fov: 30, h: 0.5 },
  side: { mode: 'close', rel: -Math.PI / 2, el: 0.1, dist: 3.6, fov: 30, h: 0.5 },
  rear: { mode: 'close', rel: Math.PI - 0.45, el: 0.42, dist: 3.6, fov: 30, h: 0.5 },
  back: { mode: 'close', rel: Math.PI - 0.2, el: 0.2, dist: 3.6, fov: 30, h: 0.55 },
  course: { mode: 'course', el: Math.PI / 4, az: 0 },
};
const shotList = [];
/** Bild: Nahaufnahme (Mitte) oder Kurs-Kamera (Ausschnitt um die Figur). */
async function shot(name, view, group = 'misc') {
  if (!SHOTS) return;
  await sc((v) => Object.assign(window.__w3.cam, v), VIEWS[view]);
  await frames(3);
  let clip = { x: 280, y: 40, width: 400, height: 460 };
  if (view === 'course') {
    const p = await sc(() => window.__w3.screen(window.__w3.focus, 0.5));
    clip = { x: Math.round(Math.max(0, Math.min(960 - 300, p.x - 150))), y: Math.round(Math.max(0, Math.min(540 - 220, p.y - 110))), width: 300, height: 220 };
  }
  const path = `${OUT}cp3_${name}.png`;
  try { await page.screenshot({ path, clip, timeout: 120000 }); shotList.push({ name, path, group, view }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
}
const pose = (cc, n = 30, o = {}) => sc(([cc, n, o]) => window.__w3.pose(cc, n, o), [cc, n, o]);
const calls = (who = 'main') => sc((who) => { const H = window.__w3; return H.calls((who === 'main' ? H.main : H.rigs[who]).avatar); }, who);
const label = () => sc(() => window.__w3.main.avatar.blender.state);
const metrics = [];
const measure = async (name, extra = {}) => { const m = await calls(); metrics.push({ name, ...m, ...extra }); return m; };

// ---------------------------------------------------------------- Grundwerte
await pose({ state: 'idle' }, 40);
const base = await measure('lotti idle');
console.log('  Lotti Stand (Kurs):', JSON.stringify(base));
check('Kurs-Modus aktiv, Ellbogen-Arme', await sc(() => { const av = window.__w3.main.avatar; return !!av.courseMode && av.armN.carm.visible; }));

// ---------------------------------------------------------------- je Heldin: alle Welt-3-Posen
// Teilmengen fürs Nachbessern: CP3_PARTS=leaf,swipe,glide,statue,skate,fence,swim,small,combo,clones,motor  CP3_HEROES=lotti,greta
const PARTS = (process.env.CP3_PARTS ?? '').split(',').filter(Boolean);
const on = (part) => !PARTS.length || PARTS.includes(part);
const HEROES = (process.env.CP3_HEROES ?? 'lotti,greta').split(',').filter(Boolean);
const anchors = await sc(() => window.__w3.main.avatar.constructor.courseAnchors(true));
const handsX = () => sc(() => { const H = window.__w3, av = H.main.avatar; return Math.max(H.extent(av, (o) => o === av.armN.carm).hi[0], H.extent(av, (o) => o === av.armF.carm).hi[0]); });
const stoneCount = () => sc(() => { let all = 0, stone = 0; window.__w3.main.avatar.model.traverse((o) => { if (o.isMesh && !o.userData.fx && o.material?.isMeshStandardMaterial) { all++; if (o.material.userData.stone) stone++; } }); return { all, stone }; });
const settleIdle = async () => { await pose({ state: 'idle', power: 'none' }, 140); };   // Effekte (Bläschen/Staub) laufen aus
const place = (o = {}) => sc((o) => { const H = window.__w3; H.place(H.main, 0, 0, o.yaw ?? Math.PI / 2, o.big ?? true, o.dy ?? 0); if (o.fence) H.fenceProp(H.main); if (o.clear) H.clearProps(); }, o);

async function heroine(key) {
  const P = key;
  await sc(() => { const H = window.__w3; H.focus = H.main; });
  await place();
  await settleIdle();
  const B = (await calls()).total;
  const T = (name, ok) => check(`${key}: ${name}`, ok);
  const lim = (m, extra, name) => T(`${name}: ${m.total} Zeichenaufrufe (Grund ${B}, erlaubt +${extra})`, m.total - B <= extra);
  if (on('leaf')) {
    await pose({ state: 'idle', power: 'gleitblatt' }, 40);
    const m = await measure(`${key} gleitblatt idle`);
    T(`Gleitblatt-Kostüm +${m.total - B} Zeichenaufrufe (höchstens +2)`, m.total - B <= 2 && m.total - B >= 1);
    await shot(`${P}_leaf_front`, 'front', 'leaf'); await shot(`${P}_leaf_rear`, 'rear', 'leaf'); await shot(`${P}_leaf_side`, 'side', 'leaf');
    await shot(`${P}_leaf_course`, 'course', 'leaf');
    await pose({ state: 'run', speed: 8, power: 'gleitblatt' }, 40); await shot(`${P}_leaf_run`, 'side', 'leaf'); await shot(`${P}_leaf_run_course`, 'course', 'leaf');
    await pose({ state: 'jump', vy: 4, grounded: false, power: 'gleitblatt' }, 20); await shot(`${P}_leaf_jump`, 'rear', 'leaf');
  }
  if (on('swipe')) {
    // Schweifhieb nach Zeit (0,35 s, ohne phase): eine volle Drehung
    await pose({ state: 'idle', power: 'gleitblatt' }, 10);
    const spin = await sc(() => {
      const H = window.__w3, av = H.main.avatar;
      let prev = null, acc = 0;
      for (let i = 0; i < 26; i++) {
        H.pose({ state: 'tailswipe', power: 'gleitblatt' }, 1);
        const q = av.fig.quaternion, yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x));
        if (prev !== null) { let d = yaw - prev; d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); acc += d; }
        prev = yaw;
      }
      return acc;
    });
    console.log(`  ${key} Schweifhieb: Drehung ${((spin / Math.PI) * 180).toFixed(0)}° in 26 Bildern (0,43 s)`);
    T('Schweifhieb dreht einmal ganz herum (Zeitsteuerung)', Math.abs(Math.abs(spin) - 2 * Math.PI) < 0.35);
    for (const [ph, nm, v] of [[0.18, '20', 'front'], [0.42, '45', 'rear'], [0.7, '70', 'front']]) {
      await pose({ state: 'idle', power: 'gleitblatt' }, 4);
      await pose({ state: 'tailswipe', power: 'gleitblatt', phase: 0.01 }, 1);
      await pose({ state: 'tailswipe', power: 'gleitblatt', phase: ph }, 4);
      await shot(`${P}_swipe_${nm}`, v, 'swipe');
      if (nm === '45') await shot(`${P}_swipe_course`, 'course', 'swipe');
    }
    lim(await measure(`${key} tailswipe`), 2, 'Schweifhieb');
  }
  if (on('glide')) {
    await place({ dy: 0.8 });
    await pose({ state: 'fall', power: 'gleitblatt', grounded: false, vy: -3 }, 10);
    await pose({ state: 'glide', power: 'gleitblatt', grounded: false, vy: -1.5, speed: 3 }, 70);
    const lift = await sc(() => window.__w3.braidLift(window.__w3.main.avatar));
    console.log(`  ${key} Gleiten: Zopf-/Haarspitzen über dem Ansatz ${lift.map((v) => v.toFixed(2)).join('/')}`);
    if (process.env.CP3_DEBUG) console.log(await sc(() => { const av = window.__w3.main.avatar, ch = av.maneChain ?? av.braids[0].chain; const a = av.mane ? av.mane.getWorldPosition(window.__w3.V()) : ch.anchor; return JSON.stringify({ g: ch.gravity, d: ch.damping, anchor: ch.anchor.toArray(), a: a.toArray(), pos: ch.pos.map((p) => p.toArray()), dirs: ch.dirs.map((p) => p.toArray()), frozen: av.w3.frozen, physics: av.w3.physics }); }));
    // Lottis Zöpfe (zwei Werte) über den Ansatz; Gretas Haar (Pendel 0,42, hängend −0,42) weht bis an die Waagerechte nach hinten
    T('Gleiten – Zöpfe wehen nach oben bzw. Haar weht hoch nach hinten', lift.length === 2 ? lift.every((v) => v > 0.1) : lift[0] > -0.35);
    lim(await measure(`${key} glide`), 2, 'Gleiten');
    await shot(`${P}_glide_front`, 'front', 'glide'); await pose({ state: 'glide', power: 'gleitblatt', grounded: false, vy: -1.5, speed: 3 }, 5); await shot(`${P}_glide_rear`, 'rear', 'glide');
    await shot(`${P}_glide_side`, 'side', 'glide'); await shot(`${P}_glide_course`, 'course', 'glide');
    await place();
  }
  if (on('statue')) {
    // in der Luft verwandeln (Puff), fallen, aufkommen (Staubwolke)
    await place({ dy: 0.6 });
    await pose({ state: 'jump', power: 'gleitblatt', grounded: false, vy: 3 }, 10);
    await pose({ state: 'statue', power: 'gleitblatt', grounded: false, vy: -6 }, 4);
    await shot(`${P}_statue_poof`, 'front', 'statue');
    await pose({ state: 'statue', power: 'gleitblatt', grounded: false, vy: -6 }, 30);
    // Landung wie im Motor (Skript-Modus: grounded bleibt falsch, vy springt von −22 auf −2 m/s)
    await pose({ state: 'statue', power: 'gleitblatt', grounded: false, vy: -22 }, 2);
    await place();
    await pose({ state: 'statue', power: 'gleitblatt', grounded: false, vy: -2 }, 7);
    const dust = await sc(() => { const av = window.__w3.main.avatar; return { fx: av.w3.fx.mesh.visible, n: av.w3.fx.mesh.count }; });
    lim(await measure(`${key} statue + Staub`), 2, 'Statue mit Staubwolke');
    await shot(`${P}_statue_land`, 'front', 'statue');
    T('Staubwolke beim Aufkommen der Statue', dust.fx && dust.n > 0);
    await pose({ state: 'statue', power: 'gleitblatt', grounded: true }, 60);
    lim(await measure(`${key} statue`), 2, 'Statue');
    const st = await stoneCount();
    const g = await sc(() => { const H = window.__w3, av = H.main.avatar; return { minY: H.extent(av).lo[1], eyeHl: av.eyeHl.visible }; });
    console.log(`  ${key} Statue: ${st.stone}/${st.all} Stein, Unterkante ${g.minY.toFixed(3)}`);
    T('Statue ganz aus Stein, ohne Glanzpunkte, Sockel-Unterkante am Boden', st.stone === st.all && !g.eyeHl && Math.abs(g.minY) < 0.02);
    await shot(`${P}_statue_front`, 'front', 'statue'); await shot(`${P}_statue_rear`, 'rear', 'statue'); await shot(`${P}_statue_course`, 'course', 'statue');
    await pose({ state: 'idle', power: 'gleitblatt' }, 4); await shot(`${P}_statue_unpoof`, 'front', 'statue');
    await pose({ state: 'idle', power: 'gleitblatt' }, 30);
    const un = await stoneCount(), hl = await sc(() => window.__w3.main.avatar.eyeHl.visible);
    T('nach der Statue wieder bunt mit Glanzpunkten', un.stone === 0 && hl);
    await pose({ state: 'statue', power: 'stern' }, 20);
    T('Stern + Statue ohne Stein-Haut (Glanz hat Vorrang)', (await stoneCount()).stone === 0);
  }
  if (on('skate')) {
    // wie im Motor: course.skates = true und HeroRig hebt die Hülle um 0,1 m (klein 0,07 m) – die Kufen müssen bis zum Boden reichen
    await settleIdle();
    await place({ dy: 0.1 });
    const SK = { state: 'skate', skates: true };
    const feetW = () => sc(() => { const H = window.__w3, av = H.main.avatar; return H.worldMinY(av, (o) => o.parent === av.legN.ankle || o.parent === av.legF.ankle) - H.base.y; });
    await pose({ ...SK, speed: 0 }, 40);
    lim(await measure(`${key} skate`), 0, 'Schlittschuh (Stand)');
    const feet0 = await feetW();
    await shot(`${P}_skate_stand`, 'front', 'skate');
    await pose({ ...SK, speed: 6 }, 50);
    const feet = await sc(() => {
      const H = window.__w3, av = H.main.avatar, out = [];
      for (let i = 0; i < 40; i++) { H.pose({ state: 'skate', skates: true, speed: 6 }, 1); out.push(H.worldMinY(av, (o) => o.parent === av.legN.ankle || o.parent === av.legF.ankle) - H.base.y); }
      return { min: Math.min(...out), max: Math.max(...out) };
    });
    lim(await measure(`${key} skate 6 m/s`), 0, 'Schlittschuh (Lauf)');
    console.log(`  ${key} Kufen über dem Boden (m, Hülle 0,1 m gehoben): Stand ${feet0.toFixed(3)}, Lauf tiefster Fuß ${feet.min.toFixed(3)}…${feet.max.toFixed(3)}`);
    T('Kufen stehen auf dem Boden (Stand), im Lauf trägt immer ein Fuß', Math.abs(feet0) < 0.012 && Math.abs(feet.min) < 0.012 && feet.max < 0.02);
    await shot(`${P}_skate_a`, 'side', 'skate'); await pose({ ...SK, speed: 6 }, 20); await shot(`${P}_skate_b`, 'front', 'skate');
    await shot(`${P}_skate_rear`, 'rear', 'skate'); await shot(`${P}_skate_course`, 'course', 'skate');
    await pose({ ...SK, speed: 8, power: 'gleitblatt' }, 30, { turn: 1.2 });
    const roll = await sc(() => window.__w3.main.avatar.blender.cur.roll);
    lim(await measure(`${key} skate gleitblatt (Kurve)`), 2, 'Schlittschuh mit Gleitblatt');
    console.log(`  ${key} Kurvenneigung bei 8 m/s, 1,2 rad/s: ${roll.toFixed(2)} rad`);
    T('Kurvenneigung nach innen (Linkskurve → links)', roll < -0.15);
    await shot(`${P}_skate_turn`, 'back', 'skate');
    await place({ dy: 0.1 });
    await pose({ state: 'jump', skates: true, speed: 6, grounded: false, vy: 3 }, 10);
    const keep = await sc(() => window.__w3.main.avatar.w3.skates);
    await shot(`${P}_skate_jump`, 'side', 'skate');
    await place();
    await pose({ state: 'idle' }, 10);
    const offOk = await sc(() => { const av = window.__w3.main.avatar; return !av.w3.skates && av.legN.ankle.children[0].geometry === av.w3.bootGeo; });
    // ohne course.skates (älterer Motor): 'skate' zeigt die Kufen trotzdem, Fußpunkt = Kufen-Unterkante
    await pose({ state: 'skate', speed: 0 }, 30);
    const legacy = await sc(() => { const H = window.__w3, av = H.main.avatar; return { on: av.w3.skates, y: H.worldMinY(av, (o) => o.parent === av.legN.ankle || o.parent === av.legF.ankle) - H.base.y }; });
    await pose({ state: 'idle' }, 10);
    T('Schlittschuhe in der Luft an (course.skates), ohne weg; state skate ohne skates: Kufen am Fußpunkt', keep && offOk && legacy.on && Math.abs(legacy.y) < 0.012);
    T('HeroAvatar.drawsSkates', await sc(() => window.__w3.main.avatar.drawsSkates === true));
  }
  if (on('fence')) {
    // Zaunebene wie im Motor: Hitbox-Halbbreite 0,3 m + Abstand 0,08 m vor root (courseAnchors().fence)
    await settleIdle();
    await place({ dy: 0.5, fence: true });
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 } }, 40);
    lim(await measure(`${key} fence`), 0, 'Zaun');
    const fu = anchors.fence * 1.5;
    const ext = await sc(() => {
      const H = window.__w3, av = H.main.avatar;
      const hands = Math.max(H.extent(av, (o) => o === av.armN.carm).hi[0], H.extent(av, (o) => o === av.armF.carm).hi[0]);
      const body = H.extent(av, (o) => !H.isArm(av, o)).hi[0];
      return { hands, body, figX: av.blender.cur.figX };
    });
    console.log(`  ${key} Zaun bei ${fu.toFixed(3)}: Hände ${ext.hands.toFixed(3)} (Reichweite ohne Versatz ${(ext.hands - ext.figX).toFixed(3)}), Körper ${ext.body.toFixed(3)} (${(ext.body - ext.figX).toFixed(3)})`);
    T('Zaun – Hände greifen am Zaun, Körper davor', Math.abs(ext.hands - fu) < 0.06 && ext.body <= fu + 0.03);
    await shot(`${P}_fence_hang`, 'back', 'fence'); await shot(`${P}_fence_side`, 'side', 'fence'); await shot(`${P}_fence_course`, 'course', 'fence');
    await pose({ state: 'fence', fenceMove: { x: 0, y: 1 } }, 30); await shot(`${P}_fence_up_a`, 'back', 'fence');
    await pose({ state: 'fence', fenceMove: { x: 0, y: 1 } }, 10); await shot(`${P}_fence_up_b`, 'back', 'fence'); await shot(`${P}_fence_up_course`, 'course', 'fence');
    await pose({ state: 'fence', fenceMove: { x: 1, y: 0 } }, 30); await shot(`${P}_fence_right`, 'back', 'fence');
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 } }, 20);
    // Faustschlag wie vom Motor: fencePunch 0..1 über 0,28 s
    const punch = await sc(() => {
      const H = window.__w3; let mx = 0;
      for (let i = 1; i <= 17; i++) {
        H.pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, fencePunch: Math.min(1, i / 17) }, 1);
        const av = H.main.avatar; mx = Math.max(mx, H.extent(av, (o) => o === av.armN.carm).hi[0], H.extent(av, (o) => o === av.armF.carm).hi[0]);
        if (i === 8) H.punchMid = av.blender.state;
      }
      return { mx, label: H.punchMid };
    });
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, fencePunch: 0 }, 20);
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, fencePunch: 0.01 }, 1);
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, fencePunch: 0.45 }, 1);
    await shot(`${P}_fence_punch`, 'side', 'fence');
    console.log(`  ${key} Faustschlag (fencePunch): Hand bis ${punch.mx.toFixed(3)} (Zaun ${fu.toFixed(3)}), Pose ${punch.label}`);
    T('Faustschlag (fencePunch) reicht durch den Zaun', punch.mx > fu + 0.06 && punch.label === 'fencePunch');
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, fencePunch: 0 }, 20);
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, attack: true }, 7); await shot(`${P}_fence_punch2`, 'back', 'fence'); await shot(`${P}_fence_punch_course`, 'course', 'fence');
    await pose({ state: 'fence', fenceMove: { x: 0, y: 0 }, attack: false }, 20);
    await place({ clear: true });
  }
  if (on('swim')) {
    await settleIdle();
    await place({ dy: 0.3 });
    await pose({ state: 'swimUnder', speed: 2.5 }, 120);
    const lift = await sc(() => window.__w3.braidLift(window.__w3.main.avatar));
    const bub = await sc(() => { const H = window.__w3, av = H.main.avatar; let seen = 0, mx = 0; for (let i = 0; i < 200; i++) { H.pose({ state: 'swimUnder', speed: 2.5 }, 1); if (av.w3.fx.mesh.visible) seen++; mx = Math.max(mx, H.calls(av).total); } return { seen, mx }; });
    console.log(`  ${key} Unterwasser: Zopf-/Haarspitzen ${lift.map((v) => v.toFixed(2)).join('/')}, Bläschen in ${bub.seen}/200 Bildern, höchstens ${bub.mx} Zeichenaufrufe`);
    T('Unterwasser – Zöpfe/Haar treiben (nicht senkrecht hängend), Bläschen erscheinen', lift.every((v) => v > -0.6) && bub.seen > 10);
    T(`Unterwasser inkl. Bläschen höchstens ${bub.mx} Zeichenaufrufe (Grund ${B})`, bub.mx <= B);
    metrics.push({ name: `${key} swimUnder (max mit Bläschen)`, total: bub.mx, tris: (await calls()).tris });
    await shot(`${P}_swim_a`, 'side', 'swim'); await pose({ state: 'swimUnder', speed: 2.5 }, 22); await shot(`${P}_swim_b`, 'side', 'swim');
    await pose({ state: 'swimUnder', speed: 2.5 }, 22); await shot(`${P}_swim_c`, 'rear', 'swim');
    await shot(`${P}_swim_course`, 'course', 'swim');
    await pose({ state: 'swimUnder', speed: 0 }, 60); await shot(`${P}_swim_hover`, 'front', 'swim');
    await pose({ state: 'swimUnder', speed: 2, vy: 1.5, power: 'gleitblatt' }, 60); await shot(`${P}_swim_up_leaf`, 'side', 'swim');
    lim(await measure(`${key} swimUnder gleitblatt`), 2, 'Unterwasser mit Gleitblatt');
    await place();
  }
  if (on('small')) {
    await place({ big: false, dy: 0.35, fence: true });
    await pose({ state: 'fence', big: false, fenceMove: { x: 0, y: 0 } }, 40);
    const hs = await handsX(), fus = (anchors.fence * 1.5) / 0.7;
    console.log(`  ${key} klein: Zaun bei ${fus.toFixed(3)}, Hände ${hs.toFixed(3)}`);
    T('Zaun klein – Hände am Zaun', Math.abs(hs - fus) < 0.08);
    await shot(`${P}_small_fence`, 'back', 'small');
    await place({ big: false, clear: true });
    await pose({ state: 'glide', big: false, power: 'gleitblatt', grounded: false, vy: -1.5 }, 40); await shot(`${P}_small_glide`, 'rear', 'small');
    await pose({ state: 'skate', big: false, speed: 5 }, 40); await shot(`${P}_small_skate`, 'side', 'small');
    await pose({ state: 'statue', big: false, power: 'gleitblatt' }, 30); await shot(`${P}_small_statue`, 'front', 'small'); await shot(`${P}_small_statue_course`, 'course', 'small');
    const smin = await sc(() => window.__w3.extent(window.__w3.main.avatar).lo[1]);
    T('Statue klein steht auf dem Sockel', Math.abs(smin) < 0.02);
    await pose({ state: 'idle', big: false }, 30);
    await place();
  }
  if (on('combo')) {
    await place({ dy: 0.5, fence: true });
    await pose({ state: 'fence', power: 'krallen', fenceMove: { x: 0, y: 1 } }, 40); lim(await measure(`${key} fence krallen`), 4, 'Zaun mit Krallen-Anzug'); await shot(`${P}_combo_krallen_fence`, 'back', 'combo');
    await place({ clear: true });
    await pose({ state: 'skate', power: 'funken', speed: 6 }, 40); lim(await measure(`${key} skate funken`), 4, 'Schlittschuh mit Funkenblüte'); await shot(`${P}_combo_funken_skate`, 'front', 'combo');
    await pose({ state: 'glide', power: 'stern', grounded: false, vy: -1.5 }, 40); lim(await measure(`${key} glide stern`), 4, 'Gleiten mit Stern'); await shot(`${P}_combo_stern_glide`, 'rear', 'combo');
    await pose({ state: 'swimUnder', power: 'krallen', speed: 2 }, 40); await shot(`${P}_combo_krallen_swim`, 'side', 'combo');
    await pose({ state: 'tailswipe', power: 'krallen' }, 10); await shot(`${P}_combo_krallen_swipe`, 'front', 'combo');
    await pose({ state: 'skate', power: 'gleitblatt', speed: 4, holding: 'over' }, 40); await shot(`${P}_combo_leaf_skate_hold`, 'side', 'combo');
  }
  await settleIdle();
  const after = await calls();
  T('danach wieder Grundzahl der Zeichenaufrufe', after.total === B);
}

for (const key of HEROES) {
  if (key === 'greta') {
    await sc(() => { const c = window.__course; c.setHero('greta'); });
    // setHero baut den Avatar über HeroRig.update neu – hier direkt (update ist abgeschaltet)
    await sc(() => { const H = window.__w3, r = H.main; r.player.hero = 'greta'; r.build('greta'); H.place(r); });
    check('Greta-Avatar gebaut', await sc(() => window.__w3.main.avatar.variant === 'greta'));
  }
  await heroine(key);
  if (key === 'lotti') {
    await pose({ state: 'gibtsnicht', power: 'gleitblatt' }, 5);
    check('Unbekannter Zustand → idle', (await label()) === 'idle');
  }
}

// ---------------------------------------------------------------- Klone (HeroRig lite)
const cl = !on('clones') ? [] : await sc(() => {
  const c = window.__course, H = window.__w3;
  const out = [];
  for (const dz of [-1.3, 1.3]) {
    const f = c.level.addClone(c.player);
    if (!f) continue;
    const rig = H.hold(c.squad.rigs.get(f));
    H.place(rig, 1.2, dz);
    out.push(H.rigs.indexOf(rig));
  }
  H.place(H.main, 0, 0);
  return out;
});
if (on('clones')) check('Zwei Klone (lite) angelegt', cl.length === 2);
if (cl.length === 2) {
  const cIdx = cl[0];
  await pose({ state: 'idle' }, 30);
  const cBase = await calls(cIdx);
  await pose({ state: 'idle', power: 'gleitblatt' }, 30);
  const cLeaf = await calls(cIdx);
  const liteInfo = await sc((i) => { const av = window.__w3.rigs[i].avatar; return { tailShadow: av.w3.tail.castShadow, lite: av.liteLook, mainLite: window.__w3.main.avatar.liteLook }; }, cIdx);
  await sc(() => { const H = window.__w3; H.focus = H.main; });
  await pose({ state: 'statue', power: 'gleitblatt', grounded: false, vy: -5 }, 10);
  await pose({ state: 'statue', power: 'gleitblatt', grounded: true }, 3);
  const cStatue = await calls(cIdx);
  await shot('clones_statue', 'front', 'clones'); await shot('clones_statue_course', 'course', 'clones');
  await pose({ state: 'idle', power: 'gleitblatt' }, 20);
  await pose({ state: 'skate', speed: 6, power: 'gleitblatt' }, 40); await shot('clones_skate_course', 'course', 'clones');
  const cSkate = await calls(cIdx);
  await pose({ state: 'swimUnder', speed: 2 }, 200);
  const cSwim = await sc((i) => { const H = window.__w3, av = H.rigs[i].avatar; let seen = 0, mx = 0; for (let k = 0; k < 150; k++) { H.pose({ state: 'swimUnder', speed: 2 }, 1); if (av.w3.fx.mesh.visible) seen++; mx = Math.max(mx, H.calls(av).total); } return { seen, mx }; }, cIdx);
  await pose({ state: 'fence', fenceMove: { x: 0, y: 1 }, power: 'krallen' }, 40); await shot('clones_fence', 'back', 'clones'); await shot('clones_fence_course', 'course', 'clones');
  await pose({ state: 'glide', power: 'gleitblatt', grounded: false, vy: -1.5 }, 40); await shot('clones_glide_course', 'course', 'clones');
  await pose({ state: 'tailswipe', power: 'gleitblatt', phase: 0.01 }, 1); await pose({ state: 'tailswipe', power: 'gleitblatt', phase: 0.4 }, 1); await shot('clones_swipe_course', 'course', 'clones');
  console.log('  Klon (Greta, lite):', JSON.stringify({ grund: cBase, gleitblatt: cLeaf, statue: cStatue, skate: cSkate, unterwasser: cSwim, ...liteInfo }));
  check('Klon: lite erkannt (kein Schattenwurf, auch der Schweif nicht), Haupt-Figur voll', liteInfo.lite && !liteInfo.tailShadow && !liteInfo.mainLite);
  check('Klon: Gleitblatt +1 (Schweif ohne Schatten), Statue/Schlittschuh nicht teurer', cLeaf.total - cBase.total === 1 && cStatue.total <= cLeaf.total && cSkate.total <= cLeaf.total);
  check('Klon: keine Bläschen, keine Mehrkosten unter Wasser', cSwim.seen === 0 && cSwim.mx <= cBase.total);
  metrics.push({ name: 'Klon Grund', ...cBase }, { name: 'Klon Gleitblatt', ...cLeaf }, { name: 'Klon Statue', ...cStatue });
  // Szene gesamt (Renderer, scale 2) mit Haupt-Figur + 2 Klonen im Gleitblatt-Kostüm, Kurs-Kamera
  await sc((v) => Object.assign(window.__w3.cam, v), VIEWS.course);
  await pose({ state: 'idle', power: 'gleitblatt' }, 10);
  await frames(4);
  const st = await sc(() => window.__course.stats());
  console.log('  Szene 0-9 Start, 3 Figuren mit Gleitblatt, Kurs-Kamera:', st.calls, 'Zeichenaufrufe,', st.triangles, 'Dreiecke');
  metrics.push({ name: 'Szene (3 Figuren, Gleitblatt)', total: st.calls, tris: st.triangles });
}

// ---------------------------------------------------------------- Kurs-Modus aus → alles zurück
const off = await sc(() => {
  const H = window.__w3, av = H.main.avatar;
  H.pose({ state: 'statue', power: 'gleitblatt' }, 10, { rigs: [H.main] });
  H.pose({ state: 'skate', speed: 3, power: 'gleitblatt' }, 3, { rigs: [H.main] });
  H.pose({ state: 'swimUnder', speed: 2, power: 'gleitblatt' }, 3, { rigs: [H.main] });
  av.setCourseMode(false);
  let stone = 0; av.model.traverse((o) => { if (o.isMesh && o.material?.userData?.stone) stone++; });
  const r = { stone, tail: av.w3.tail.visible, boots: av.legN.ankle.children[0].geometry === av.w3.bootGeo, skirt: av.skirtMesh.geometry === av.cGeo.skirt, fx: av.w3.fx.mesh.visible, shins: av.w3.shins.every((m) => m.castShadow), gravity: av.maneChain ? av.maneChain.gravity : av.braids?.[0].chain.gravity };
  av.setCourseMode(true);
  return r;
});
console.log('  Kurs-Modus aus:', JSON.stringify(off));
check('Kurs-Modus aus: kein Stein, kein Schweif, Stiefel/Rock zurück, keine Effekte, Schatten und Haarphysik wie vorher', off.stone === 0 && !off.tail && off.boots && off.skirt && !off.fx && off.shins && off.gravity === 32);

// ---------------------------------------------------------------- Mit dem echten Motor (Schneegarten 0-9)
// HeroRig füllt proxy.course wieder selbst (Simulation per step, Kurs-Kamera der Schiene); Bilder cp3_motor_*.png
if (on('motor')) {
  await sc(() => {
    const c = window.__course, H = window.__w3;
    c.squad.clear();
    for (const r of H.rigs) delete r.update;            // Prototyp-Methode wieder aktiv
    // proxy.course wieder als Objekt mit allen Feldern, die HeroRig beschreibt (Teil 1 hat es je Bild ersetzt)
    c.rig.proxy.course = { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'none', big: true, holding: null, climbing: false, fenceMove: { x: 0, y: 0 }, fencePunch: 0, skates: false };
    H.rigs.length = 0;
    H.motor = true;                                     // Kamera-Haken aus → Kameraschiene des Levels
    c.setHero('lotti');
    const P = () => c.player, L = () => c.level;
    H.mplace = (pos, o = {}) => {
      const p = P();
      c.setInput(null); c.setInput({});
      c.squad.clear(); p.dropHeld();
      p.dead = false; p.removedFigure = null; p.hidden = false;
      p.big = o.big ?? true; p.power = 'none'; p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      if (o.power) p.setPower(o.power);
      p.invuln = 0; p.updateHalf();
      L().runtime.status = 'play'; L().runtime.save.lives = 99;
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap(p);
      c.step(o.settle ?? 30);
    };
    H.mplay = (segs) => { for (const [inp, n] of segs) { c.setInput(inp); c.step(n); } c.setInput({}); };
    H.mstate = () => {
      for (let i = 0; i < 24; i++) c.rig.update(1 / 60, c.view.time + (i + 1) / 60);   // Avatar mit dem aktuellen Zustand einschwingen
      const k = c.rig.proxy.course, av = c.rig.avatar, p = P();
      return { player: p.state, mode: p.mode, course: k.state, label: av.blender.state, skates: k.skates, fenceMove: { ...k.fenceMove }, fencePunch: +(k.fencePunch ?? 0).toFixed(2), power: k.power, stone: av.w3.statue, tail: av.w3.tail.visible };
    };
    // Kufen-Unterkante über dem Fußpunkt der Simulation (m)
    H.mfeet = () => { const av = c.rig.avatar; return H.worldMinY(av, (o) => o.parent === av.legN.ankle || o.parent === av.legF.ankle) - P().pos.y; };
    H.mhands = () => {
      // Hände relativ zur Zaunebene (m, > 0 = hinter der Ebene von der Figur aus): Ebene aus level.fences der Figur
      const p = P(), fe = p.fence?.obj, av = c.rig.avatar;
      if (!fe?.plane) return null;
      const Pl = fe.plane, s = p.fence.side, w = H.V();
      let best = -9;
      for (const arm of [av.armN.carm, av.armF.carm]) {
        av.root.updateMatrixWorld(true);
        const n = arm.geometry.attributes.position.count;
        for (let i = 0; i < n; i++) { arm.getVertexPosition(i, w); w.applyMatrix4(arm.matrixWorld); best = Math.max(best, -s * ((w.x - Pl.x) * Pl.nx + (w.z - Pl.z) * Pl.nz)); }
      }
      return best;
    };
  });
  const mshot = async (name) => {
    if (!SHOTS) return;
    await sc(() => { window.__course.view.rig.snap(window.__course.player); });
    await frames(4);
    const p = await sc(() => { const c = window.__course, v = c.player.pos.clone(); v.y += 0.5; v.project(c.view.camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; });
    const clip = { x: Math.round(Math.max(0, Math.min(960 - 360, p.x - 180))), y: Math.round(Math.max(0, Math.min(540 - 260, p.y - 130))), width: 360, height: 260 };
    const path = `${OUT}cp3_motor_${name}.png`;
    try { await page.screenshot({ path, clip, timeout: 120000 }); shotList.push({ name: `motor_${name}`, path, group: 'motor' }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
  };
  const M = (fn, arg) => sc(fn, arg);
  const mstate = () => M(() => window.__w3.mstate());
  // Schwanzhieb
  await M(() => window.__w3.mplace([0, 1, 3], { power: 'gleitblatt' }));
  await M(() => window.__w3.mplay([[{ action: true }, 1], [{}, 12]]));
  const sw = await mstate();
  await mshot('tailswipe');
  // Gleiten über der Lücke
  await M(() => window.__w3.mplace([-6, 6, -40], { power: 'gleitblatt', settle: 0 }));
  await M(() => window.__w3.mplay([[{ jump: true }, 70]]));
  const gl = await mstate();
  await sc(() => window.__course.setInput({ jump: true }));
  await mshot('glide');
  await sc(() => window.__course.setInput({}));
  // Statue: in der Luft verwandeln, landen
  await M(() => window.__w3.mplace([-2, 4.5, -20], { power: 'gleitblatt', settle: 0 }));
  await M(() => window.__w3.mplay([[{ crouch: true, action: true }, 1], [{ crouch: true }, 70]]));
  const stt = await mstate();
  await sc(() => window.__course.setInput({ crouch: true }));
  await mshot('statue');
  await sc(() => window.__course.setInput({}));
  await M(() => window.__w3.mplay([[{}, 120]]));
  // Schlittschuh: hineinlaufen, Graspiste
  await M(() => window.__w3.mplace([-6, 1, -62.5], { yaw: Math.PI / 2 }));
  await M(() => window.__w3.mplay([[{ y: 1 }, 110]]));
  const sk = await mstate();
  const skFeet = await M(() => window.__w3.mfeet());
  if (process.env.CP3_DEBUG) console.log(await M(() => { const c = window.__course, av = c.rig.avatar, cur = av.blender.cur, r = (v) => +v.toFixed(3); return JSON.stringify({ hullDy: r(c.rig.hull.position.y - c.player.pos.y), hullSy: r(c.rig.hull.scale.y * 1.5), sx: r(c.rig.hull.scale.x * 1.5), speed: r(c.rig.proxy.course.speed), turn: r(av.w3.turn), bob: r(cur.bob), lean: r(cur.lean), roll: r(cur.roll), figY: r(cur.figY), figZo: r(cur.figZo), pitch: r(cur.pitch), state: av.blender.state, t: r(av.blender.t), modelSy: r(av.model.scale.y) }); }));
  await sc(() => window.__course.setInput({ y: 1 }));
  await mshot('skate');
  await sc(() => window.__course.setInput({}));
  await M(() => window.__w3.mplay([[{ y: 1, jump: true }, 12]]));
  const skAir = await mstate();
  await M(() => window.__w3.mplay([[{}, 120]]));
  // Kettenzaun: anspringen, klettern, seitlich, Faustschlag
  await M(() => window.__w3.mplace([-6, 1, -155.5]));
  await M(() => window.__w3.mplay([[{ y: 1 }, 12], [{ y: 1, jump: true }, 50]]));
  const fe0 = await mstate();
  await M(() => window.__w3.mplay([[{ y: 1 }, 40]]));
  const feUp = await mstate();
  const feHands = await M(() => window.__w3.mhands());
  if (process.env.CP3_DEBUG) console.log(await M(() => { const c = window.__course, p = c.player, av = c.rig.avatar, Pl = p.fence.obj.plane, s = p.fence.side, r = (v) => +v.toFixed(3); const e = av.root.matrixWorld.elements; return JSON.stringify({ rootDist: r(-s * ((e[12] - Pl.x) * Pl.nx + (e[14] - Pl.z) * Pl.nz)), posDist: r(-s * ((p.pos.x - Pl.x) * Pl.nx + (p.pos.z - Pl.z) * Pl.nz)), faceDot: r((e[0] * Pl.nx + e[2] * Pl.nz) / Math.hypot(e[0], e[1], e[2])), side: s, yaw: r(p.yaw), rigYaw: r(c.rig.yaw), figX: r(av.blender.cur.figX), label: av.blender.state, big: p.big }); }));
  await sc(() => window.__course.setInput({ y: 1 }));
  await mshot('fence_up');
  await M(() => window.__w3.mplay([[{ x: 1 }, 30]]));
  await sc(() => window.__course.setInput({ x: 1 }));
  await mshot('fence_side');
  await M(() => window.__w3.mplay([[{}, 10], [{ action: true }, 1], [{}, 12]]));
  const fePunch = await mstate();
  await mshot('fence_punch');
  await M(() => window.__w3.mplay([[{ crouch: true }, 2], [{}, 60]]));
  // Unterwasser: abtauchen und schwimmen
  await M(() => window.__w3.mplace([-4, 2, -214], { settle: 240 }));
  await M(() => window.__w3.mplay([[{ crouch: true }, 180], [{ y: 1 }, 60]]));
  const uw = await mstate();
  await sc(() => window.__course.setInput({ y: 1 }));
  await mshot('swim');
  await sc(() => window.__course.setInput({}));
  const mrows = { tailswipe: sw, glide: gl, statue: stt, skate: sk, skateAir: skAir, fence: fe0, fenceUp: feUp, fencePunch: fePunch, swimUnder: uw };
  for (const [k, v] of Object.entries(mrows)) console.log(`  Motor ${k.padEnd(10)} ${JSON.stringify(v)}`);
  console.log(`  Motor: Kufen über dem Boden ${skFeet.toFixed(3)} m, Hände hinter der Zaunebene ${feHands?.toFixed(3)} m`);
  check('Motor: Schwanzhieb → Pose tailswipe mit Gleitblatt-Kostüm', sw.course === 'tailswipe' && sw.label === 'tailswipe' && sw.tail);
  check('Motor: Gleiten → Pose glide', gl.course === 'glide' && gl.label === 'glide');
  check('Motor: Statue → Stein-Haut', stt.course === 'statue' && stt.label === 'statue' && stt.stone);
  check('Motor: Schlittschuh → Pose skate, Kufen auf dem Boden (±1,5 cm), in der Luft Kufen an', sk.course === 'skate' && sk.label === 'skate' && sk.skates && Math.abs(skFeet) < 0.015 && skAir.skates);
  check('Motor: Zaun → Pose fence, Klettern hoch, Hände an der Zaunebene (±4 cm), Faustschlag', fe0.course === 'fence' && feUp.fenceMove.y > 0.5 && feHands !== null && Math.abs(feHands) < 0.04 && fePunch.label === 'fencePunch');
  check('Motor: getaucht → Pose swimUnder', uw.course === 'swimUnder' && uw.label === 'swimUnder');
}

// ---------------------------------------------------------------- Kennzahlen, Übersichtsbögen
console.log('\n  Kennzahlen (Zeichenaufrufe inkl. Schattenwerfer / Dreiecke inkl. Schattenpass):');
for (const m of metrics) console.log(`    ${m.name.padEnd(34)} ${String(m.total).padStart(4)}  ${String(m.tris).padStart(7)}`);

check('Keine Konsolenfehler', errors.length === 0);

const ok = summary(errors);
// Übersichtsbögen je Gruppe (Nahaufnahmen und Kurs-Kamera nebeneinander) – auf derselben Seite nach dem Spiel
if (SHOTS && shotList.length) {
  try {
    await page.goto('about:blank');
    await page.setViewportSize({ width: 1700, height: 400 });
    for (const g of [...new Set(shotList.map((s) => s.group))]) {
      const list = shotList.filter((s) => s.group === g);
      const imgs = list.map((s) => `<figure><img src="data:image/png;base64,${readFileSync(s.path).toString('base64')}"><figcaption>${s.name}</figcaption></figure>`).join('');
      await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${imgs}</div><style>figure{margin:2px}img{display:block;max-height:300px}</style></body></html>`);
      await page.screenshot({ path: `${OUT}cp3_sheet_${g}.png`, fullPage: true });
    }
    writeFileSync(`${OUT}cp3_list.json`, JSON.stringify(shotList.map((s) => s.name)));
  } catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }
}

await browser.close();
stop();
process.exit(ok ? 0 : 1);
