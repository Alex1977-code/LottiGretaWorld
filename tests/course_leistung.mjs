// Motor-Leistung und Level-Haken (Präzisierung „Leistung und Level-Haken 2“) im Testlevel 0-L „Leistungsprobe“:
//   Aufbau-Haken LEVEL.prebuild/LEVEL.build (Reihenfolge, Verschmelzen, Umriss), segments shadow: false, Wolken je Level,
//   Sicht-/Schattenprüfung (view/Culling.js), Instanz-Pools (nur sichtbare Münzen/Blöcke, Detailstufe), EntityInstancer
//   (Pilzling-Gruppe als Instanzen, Käfer-Detailstufe in der Ferne), Schatten-Stellvertreter der Heldin, Fern-Ausblendung
//   (farHide), Bild mit und ohne Sparmaßnahmen (view.optimize) gleich, weniger Zeichenaufrufe/Dreiecke.
// Aufruf (nach npm run build): PORT_BASE=3200 node tests/course_leistung.mjs   (Port 4963 + PORT_BASE)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { writeFileSync } from 'node:fs';

const PORT = 4963;
const stop = await startServer(PORT);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);

await page.goto(`http://localhost:${port}/?course=0-L&scale=2&adapt=0&still=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
await page.waitForTimeout(400);
check('0-L lädt ohne Konsolenfehler', errors.filter((e) => !/GPU stall/.test(e)).length === 0);
for (const e of errors.slice(0, 5)) console.log('   ', e);

await sc(() => {
  const c = window.__course, v = c.view, r = v.renderer;
  // Bild der 3D-Leinwand sofort nach dem Zeichnen (Pixel und Kennzahlen)
  window.__lp = {
    grab() {
      c.renderFrame();
      const gl = r.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { px, w, h, calls: r.info.render.calls, tris: r.info.render.triangles };
    },
    compare() {
      const A = this.grab();
      v.optimize = false;
      const B = this.grab();
      v.optimize = true;
      let n = 0;
      for (let i = 0; i < A.px.length; i += 4) {
        const d = Math.max(Math.abs(A.px[i] - B.px[i]), Math.abs(A.px[i + 1] - B.px[i + 1]), Math.abs(A.px[i + 2] - B.px[i + 2]));
        if (d > 40) n++;
      }
      return { frac: n / (A.px.length / 4), on: [A.calls, A.tris], off: [B.calls, B.tris] };
    },
    go(x, y, z) { c.teleport(x, y, z); c.snapCamera(); },
  };
});
const frames = async (k = 3) => { const f0 = await sc(() => window.__course.view.frame); await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + k, { timeout: 60000 }); };

// ------------------------------------------------ Aufbau-Haken, Bausteine ohne Schatten, Wolken
{
  const r = await sc(() => {
    const c = window.__course, L = c.level, v = c.view;
    const sb = v.static;
    const cells = sb.meshes.filter((m) => m.parent).map((m) => ({ key: m.userData.cell, cast: m.castShadow, box: m.geometry.boundingBox ? [m.geometry.boundingBox.min.x, m.geometry.boundingBox.max.x, m.geometry.boundingBox.min.z, m.geometry.boundingBox.max.z] : null }));
    return {
      order: L._order, saw: L._buildSaw, hook: L._buildHook, minY: L.bounds.min.y, pending: sb.pending,
      cells, clouds: v.sky.cloudData.length, cullBox: sb.meshes.every((m) => m.cullBox),
    };
  });
  console.log(`  Haken: Reihenfolge ${JSON.stringify(r.order)}, im build gesehen ${JSON.stringify(r.saw)}, Umriss min y ${r.minY}`);
  check('LEVEL.prebuild vor, LEVEL.build nach den Bausteinen (Gegner schon da, Münzen noch nicht)', r.order?.join() === 'prebuild,build' && r.saw.enemies === 14 && r.saw.coins === 0);
  check('Kollision aus LEVEL.build zählt für den Level-Umriss', r.minY <= -9);
  const plate = r.cells.filter((m) => m.box && m.box[0] <= 6.5 && m.box[1] >= 9.5 && m.box[2] <= -7.5 && m.box[3] >= -4.5);
  check('statische Zier aus LEVEL.build liegt in einem Abschnitts-Mesh (kein eigenes Mesh)', plate.length >= 1 && !r.pending && r.cells.length <= 12);
  check('statische Abschnitte prüfen mit Quadern (cullBox)', r.cullBox);
  const sec4 = r.cells.filter((m) => /^4\|/.test(m.key));
  console.log(`  Abschnitt 4 (Insel ohne Schatten): ${JSON.stringify(sec4.map((m) => [m.key, m.cast]))}`);
  check('segments shadow: false / castShadow: false → eigene Meshes ohne Schattenwurf', sec4.some((m) => !m.cast && /world\|0\|/.test(m.key)));
  check('LEVEL.sky.clouds: 5 Wolken', r.clouds === 5);
}

// ------------------------------------------------ Start: Pilzling-Gruppe, Münzen, Heldin
{
  await sc(() => window.__lp.go(0, 1, 2));
  await frames(4);
  const r = await sc(() => {
    const v = window.__course.view;
    const cmp = window.__lp.compare();
    window.__lp.grab();               // Kennzahlen der Sparmaßnahmen (compare endet mit dem Bild ohne)
    const coin = v.pools.get('coin');
    return { cmp, inst: { ...v.instancer.stats }, coin: coin ? { drawn: coin.drawn, count: coin.count, levels: coin.levels.length } : null, proxies: v.proxies.stats() };
  });
  console.log(`  Start: mit Sparen ${r.cmp.on[0]} Aufrufe / ${Math.round(r.cmp.on[1] / 1000)} k, ohne ${r.cmp.off[0]} / ${Math.round(r.cmp.off[1] / 1000)} k; Bild ${(r.cmp.frac * 100).toFixed(3)} % abweichend; Instanzen ${JSON.stringify(r.inst)}; Münzen ${JSON.stringify(r.coin)}; Stellvertreter ${JSON.stringify(r.proxies)}`);
  check('Sparmaßnahmen: weniger Zeichenaufrufe und Dreiecke', r.cmp.on[0] < r.cmp.off[0] && r.cmp.on[1] < r.cmp.off[1]);
  check('Sparmaßnahmen: Bild (fast) gleich (< 0,1 % Pixel abweichend, nur Detailstufen)', r.cmp.frac < 0.001);
  check('EntityInstancer: Pilzling-Gruppe als Instanzen', r.inst.groups >= 1 && r.inst.instanced >= 8);
  check('Münz-Pool: nur ein Teil der Münzen gezeichnet, Detailstufe vorhanden', r.coin && r.coin.drawn < r.coin.count && r.coin.levels === 2);
  check('Schatten-Stellvertreter der Heldin', r.proxies.proxies >= 1 && r.proxies.parts >= 8);
  try { writeFileSync(`${OUT}leistung_start.png`, await page.screenshot()); } catch { /* weiter */ }
}

// ------------------------------------------------ Käfer in der Ferne (Detailstufe), Fern-Ausblendung
{
  await sc(() => window.__lp.go(0, 1, -12));
  await frames(4);
  const far = await sc(() => {
    const v = window.__course.view, L = window.__course.level;
    window.__lp.grab();
    const fern = L.named.get('fern');
    return { lod: v.instancer.stats.lod, fernVisible: fern?.model?.root.visible, dist: Math.hypot(fern.pos.x - L.player.pos.x, fern.pos.z - L.player.pos.z) };
  });
  console.log(`  Ferne: Käfer in der Detailstufe ${far.lod}; Pilzling „fern“ (${far.dist.toFixed(1)} m) sichtbar ${far.fernVisible}`);
  check('Käfer weiter als 22 m von der Kamera zeichnen die sparsame Detailstufe', far.lod >= 3);
  check('farHide: Pilzling weiter als 15 m nicht gezeichnet', far.fernVisible === false && far.dist > 15);
  await sc(() => window.__lp.go(6, 1, -24));
  await frames(4);
  const near = await sc(() => { const L = window.__course.level; window.__lp.grab(); return L.named.get('fern').model.root.visible; });
  check('farHide: in der Nähe wieder gezeichnet', near === true);
}

// ------------------------------------------------ Insel ohne Schatten: Bild gleich
{
  await sc(() => window.__lp.go(0, 1, -128));
  await frames(4);
  const r = await sc(() => window.__lp.compare());
  console.log(`  Insel ohne Schatten: ${r.on[0]} / ${Math.round(r.on[1] / 1000)} k (ohne Sparen ${r.off[0]} / ${Math.round(r.off[1] / 1000)} k), Bild ${(r.frac * 100).toFixed(3)} %`);
  check('Sparmaßnahmen an der zweiten Insel: Bild gleich', r.frac < 0.001);
}

await browser.close();
stop();
// readPixels meldet im Software-Renderer „GPU stall“ (nur Leistungshinweis des Treibers)
const real = errors.filter((e) => !/GPU stall due to ReadPixels/.test(e));
process.exit(summary(real) ? 0 : 1);
