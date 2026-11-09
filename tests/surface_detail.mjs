// Oberflächen-Detail der Welt-Materialien (src/three/lib/surfaceDetail.js): Körnung, Flecken, feines Relief und Grashalme
// auf Gelände und Stein – ohne zusätzliche Dreiecke oder Zeichenaufrufe.
//
// Je Level dieselbe Stelle mit Detail (Standard) und ohne (?detail=0): Zeichenaufrufe und Dreiecke gleich, das Bild im
// Mittel gleich hell (± 2 %), aber sichtbar strukturiert (mittlere Abweichung je Bildpunkt über der Schwelle), höchstens
// zwei Shader-Programme mehr, Bildzeit im Software-WebGL höchstens +50 % (Median, getrennte Seiten), keine Konsolenfehler.
// Bilder: tests/out/detail_<level>_an.png / _aus.png.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 5065;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const LEVELS = (process.argv[2] ? [process.argv[2]] : ['1-1', '5-1', '4-5', '0-9']);
const relevant = (list) => list.filter((e) => !/GPU stall|Automatic fallback to software WebGL/.test(e));
const all = [];

async function probe(id, on) {
  all.push(...relevant(errors.splice(0)));
  await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0&still=1${on ? '' : '&detail=0'}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 180000 });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const c = window.__course, v = c.view, r = v.renderer, gl = r.getContext();
    const px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (let i = 0; i < 6; i++) c.renderFrame();
    sync();
    const ms = [];
    for (let i = 0; i < 24; i++) { const t0 = performance.now(); c.renderFrame(); sync(); ms.push(performance.now() - t0); }
    ms.sort((a, b) => a - b);
    c.renderFrame();
    const cv = document.createElement('canvas'); cv.width = v.canvas.width; cv.height = v.canvas.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(v.canvas, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    // Helligkeit je Bildpunkt (für Mittel und Vergleich), auf ein Raster von höchstens 240 × 135 verkleinert
    const sx = Math.max(1, Math.floor(cv.width / 240)), sy = Math.max(1, Math.floor(cv.height / 135));
    const lum = [];
    for (let y = 0; y < cv.height; y += sy) for (let x = 0; x < cv.width; x += sx) { const k = (y * cv.width + x) * 4; lum.push(Math.round(d[k] * 0.2126 + d[k + 1] * 0.7152 + d[k + 2] * 0.0722)); }
    const st = c.stats();
    return { calls: st.calls, tris: st.triangles, programs: st.programs, detail: st.detail, ms: ms[ms.length >> 1], lum, png: cv.toDataURL('image/png').split(',')[1] };
  });
}

for (const id of LEVELS) {
  const off = await probe(id, false), on = await probe(id, true);
  writeFileSync(`${OUT}detail_${id}_aus.png`, Buffer.from(off.png, 'base64'));
  writeFileSync(`${OUT}detail_${id}_an.png`, Buffer.from(on.png, 'base64'));
  const mean = (a) => a.reduce((n, v) => n + v, 0) / a.length;
  const mOff = mean(off.lum), mOn = mean(on.lum);
  const diff = mean(on.lum.map((v, i) => Math.abs(v - off.lum[i])));
  const ratio = on.ms / off.ms;
  console.log(`\n${id}: ohne ${off.calls} Aufrufe / ${off.tris} Dreiecke / ${off.programs} Programme / ${off.ms.toFixed(1)} ms · mit ${on.calls} / ${on.tris} / ${on.programs} / ${on.ms.toFixed(1)} ms`);
  check(`${id}: Detail an (Standard) und mit ?detail=0 aus`, on.detail === true && off.detail === false);
  check(`${id}: Zeichenaufrufe (${on.calls}) und Dreiecke (${on.tris}) unverändert`, on.calls === off.calls && on.tris === off.tris);
  check(`${id}: höchstens 2 Shader-Programme mehr (${on.programs - off.programs})`, on.programs - off.programs <= 2);
  check(`${id}: Bild im Mittel gleich hell (${mOff.toFixed(1)} → ${mOn.toFixed(1)}, ${(((mOn - mOff) / mOff) * 100).toFixed(2)} %, ± 2 %)`, Math.abs(mOn - mOff) / mOff < 0.02);
  check(`${id}: Struktur sichtbar (mittlere Abweichung je Bildpunkt ${diff.toFixed(2)} ≥ 0,6 von 255)`, diff >= 0.6);
  check(`${id}: Bildzeit im Software-WebGL höchstens +50 % (×${ratio.toFixed(2)}; dort rechnet die CPU jeden Bildpunkt – auf Grafikchips fällt es kaum ins Gewicht)`, ratio <= 1.5);
}
all.push(...relevant(errors.splice(0)));
check(`keine Konsolenfehler/-warnungen (${all.length})`, all.length === 0);
for (const e of all.slice(0, 8)) console.log('   ', e);

await browser.close();
stop();
process.exit(summary([]) ? 0 : 1);
