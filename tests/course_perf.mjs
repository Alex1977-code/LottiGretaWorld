// Leistungs-Messung der Kurs-Level: Zeichenaufrufe (inkl. Schattenpass) und Dreiecke je Level an festen Kamerapunkten.
// Punkte je Level (aus den Level-Daten, deterministisch): Start, 25/50/75 % der Strecke Start → Zielmast, Checkpoint(s),
// Sterne, Stempel, Zielmast. Autoscroller: sechs Lagen des Bildfensters entlang der Fahrt (Simulation läuft schrittweise,
// die Figur wird im Fenster gehalten und kann nicht sterben – nur für die Messung). Die Simulation steht sonst still
// (setManual), damit Gegner nicht weiterlaufen.
//
// Aufruf (nach npm run build):  PORT_BASE=3200 node tests/course_perf.mjs [w1|w2|w3|all|<Id> …]
//   PERF_LABEL=<Name>     Ergebnis nach tests/out/perf_<Name>.json (Standard: aktuell)
//   PERF_BASE=<Name>      Vergleich mit tests/out/perf_<Name>.json (vorher/nachher je Level)
//   DETAIL=1              je Punkt die größten Posten (Objektname → Aufrufe/Dreiecke, Haupt- und Schattenpass „S:“);
//                         DETAIL=json: nur in die JSON-Datei
//   SHOTS=1               Bildschirmfoto je Punkt: tests/out/perf_<Name>_<Id>_<Punkt>.png
//   COMPARE=1             Bildvergleich je Punkt: Bild mit und ohne Sparmaßnahmen (view.optimize, ?optimize=0) bei
//                         angehaltener Darstellungszeit; Anteil abweichender Pixel (Kanal > 40) und Aufrufe/Dreiecke ohne;
//                         stark abweichende Paare als tests/out/perf_cmp_<Id>_<Punkt>_{an,aus}.png
// Ohne Prüfungen (reine Messung); Budget-Hinweise (≥ 120 Aufrufe, ≥ 300 k Dreiecke) werden markiert.
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { startServer, launchBrowser, OUT } from './helpers.mjs';

const PORT = 4960;
const LABEL = process.env.PERF_LABEL ?? 'aktuell';
const BASE = process.env.PERF_BASE ?? null;
const DETAIL = !!process.env.DETAIL;
const SHOTS = !!process.env.SHOTS;
const COMPARE = !!process.env.COMPARE;

const LV = new URL('../src/course/levels/', import.meta.url).pathname;
const byWorld = (w) => readdirSync(`${LV}w${w}`).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => f.slice(0, -3));
const ORDER = { 1: ['1-1', '1-2', '1-A', '1-3', '1-Schatz', '1-4', '1-5', '1-Burg'] };
const sortIds = (w) => { const ids = byWorld(w); const o = ORDER[w]; return o ? o.filter((x) => ids.includes(x)).concat(ids.filter((x) => !o.includes(x))) : ids.sort(); };
const args = process.argv.slice(2);
let LEVELS = [];
for (const a of args.length ? args : ['all']) {
  if (a === 'all') LEVELS.push(...sortIds(1), ...sortIds(2), ...sortIds(3));
  else if (/^w\d$/.test(a)) LEVELS.push(...sortIds(+a[1]));
  else LEVELS.push(a);
}
LEVELS = [...new Set(LEVELS)];

const stop = await startServer(PORT);
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const { browser, page, errors } = await launchBrowser();
const sc = (fn, arg) => page.evaluate(fn, arg);
// gleiche Zufallsfolge bei jedem Laden (Modelle wählen Phasen mit Math.random) → Bilder vergleichbar
await page.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });

// ------------------------------------------------------------------ im Browser: Punkte, Messung, Aufschlüsselung
function install() {
  const c = window.__course;
  c.setManual(true);
  const v = c.view, r = v.renderer;
  const P = {};
  const asPos = (x) => (Array.isArray(x) && typeof x[0] === 'number' ? x : x?.pos ?? null);
  const list = (x) => (x == null ? [] : !Array.isArray(x) ? [x] : typeof x[0] === 'number' ? [x] : x);
  P.points = () => {
    const d = c.level.data, pts = [];
    const start = d.start?.pos ?? [0, 1, 0];
    if (d.archetype === 'autoscroller' && c.level.scroll) {
      for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) pts.push({ name: `fahrt${Math.round(f * 100)}`, ride: f });
      return pts;
    }
    pts.push({ name: 'start', pos: start, still: true });
    const goal = asPos(d.goal);
    if (goal) for (const f of [0.25, 0.5, 0.75]) pts.push({ name: `weg${f * 100}`, pos: start.map((s, i) => s + (goal[i] - s) * f) });
    list(d.checkpoint).forEach((cp, i) => { const p = asPos(cp); if (p) pts.push({ name: `cp${i}`, pos: p }); });
    (d.stars ?? []).forEach((s, i) => { const p = asPos(s); if (p) pts.push({ name: `stern${i}`, pos: p }); });
    if (d.stamp) pts.push({ name: 'stempel', pos: asPos(d.stamp) });
    if (goal) pts.push({ name: 'ziel', pos: goal });
    return pts;
  };
  // Figur kann für die Messung nicht sterben
  P.immortal = () => { for (const f of c.level.players) { f.die = () => {}; f.hurt = () => {}; } };
  P.goto = (pt) => {
    if (pt.ride !== undefined) {
      const w = c.level.scroll;
      const target = w.s0 + (w.s1 - w.s0) * pt.ride;
      P.immortal();
      let guard = 0;
      while (w.s < target - 1e-3 && w.state !== 'done' && guard++ < 120 * 600) {
        c.step(30);
        const p = c.player, cc = w.center;
        if (Math.hypot(p.pos.x - cc.x, p.pos.z - cc.z) > 3 || p.pos.y < cc.y - 2) { p.reset([cc.x, cc.y + 1.2, cc.z], p.yaw); p.vel?.set?.(0, 0, 0); }
      }
      c.snapCamera();
      return { s: +w.s.toFixed(1) };
    }
    if (!pt.still) c.teleport(pt.pos[0], pt.pos[1] + 0.05, pt.pos[2]);
    c.snapCamera();
    return null;
  };
  // Aufschlüsselung eines Bildes: je Objekt (Name der nächsten benannten Hülle, Gegner-Art) Aufrufe und Dreiecke
  const tag = () => {
    for (const e of c.level.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
  };
  const label = (o) => {
    if (o.userData.__perf) return o.userData.__perf;
    for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, '');
    return o.type;
  };
  P.detail = () => new Promise((res) => {
    tag();
    const acc = new Map();
    const orig = r.renderBufferDirect;
    r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      const t0 = r.info.render.triangles;
      orig.call(this, camera, scene, geometry, material, object, group);
      const key = `${scene ? '' : 'S:'}${label(object)}`;
      const a = acc.get(key) ?? { calls: 0, tris: 0 };
      a.calls++; a.tris += r.info.render.triangles - t0;
      acc.set(key, a);
    };
    const f0 = v.frame;
    const wait = () => {
      if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; }
      r.renderBufferDirect = orig;
      res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[2] - x[2]));
    };
    acc.clear();
    requestAnimationFrame(wait);
  });
  // Bildvergleich zweier PNG (Base64): Anteil der Pixel mit einer Kanal-Abweichung > lim
  P.diff = async (a, b, lim = 40) => {
    const img = async (d) => { const r = await fetch(`data:image/png;base64,${d}`); return createImageBitmap(await r.blob()); };
    const [A, B] = await Promise.all([img(a), img(b)]);
    const cv = document.createElement('canvas'); cv.width = A.width; cv.height = A.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, A.width, A.height).data;
    g.clearRect(0, 0, A.width, A.height); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, A.width, A.height).data;
    let n = 0, max = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > max) max = d;
      if (d > lim) n++;
    }
    return { frac: n / (da.length / 4), max };
  };
  P.frames = (k) => new Promise((res) => { const f0 = v.frame; const w = () => (v.frame >= f0 + k ? res(v.frame) : requestAnimationFrame(w)); requestAnimationFrame(w); });
  window.__perf = P;
}

async function load(id) {
  errors.length = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0&still=1`, { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
      await sc(install);
      return true;
    } catch (err) {
      if (attempt === 1) { console.log(`  ${id} startet nicht: ${err.message}`); for (const x of errors) console.log('   ', x); }
    }
  }
  return false;
}

async function measure(id, pt) {
  const extra = await sc((p) => window.__perf.goto(p), pt);
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 });
  await page.waitForTimeout(150);
  const s = await sc(() => window.__course.stats());
  let detail = null;
  if (DETAIL) detail = await sc(() => window.__perf.detail());
  if (SHOTS) await page.screenshot({ path: `${OUT}perf_${LABEL}_${id}_${pt.name}.png` });
  let cmp = null;
  if (COMPARE) {
    await sc(() => { window.__course.scene.pause(); });
    await sc(() => window.__perf.frames(2));
    const on = await page.screenshot();
    const sOn = await sc(() => window.__course.stats());
    await sc(() => { window.__course.view.optimize = false; });
    await sc(() => window.__perf.frames(2));
    const off = await page.screenshot();
    const sOff = await sc(() => window.__course.stats());
    await sc(() => { window.__course.view.optimize = true; window.__course.scene.resume(); });
    const d = await sc(([a, b]) => window.__perf.diff(a, b), [on.toString('base64'), off.toString('base64')]);
    cmp = { frac: d.frac, max: d.max, offCalls: sOff.calls, offTris: sOff.triangles, onCalls: sOn.calls, onTris: sOn.triangles };
    if (d.frac > 0.0005) {
      const { writeFileSync: w } = await import('node:fs');
      w(`${OUT}perf_cmp_${id}_${pt.name}_an.png`, on); w(`${OUT}perf_cmp_${id}_${pt.name}_aus.png`, off);
    }
  }
  return { name: pt.name, calls: s.calls, tris: s.triangles, extra, detail, cmp };
}

const result = existsSync(`${OUT}perf_${LABEL}.json`) ? JSON.parse(readFileSync(`${OUT}perf_${LABEL}.json`, 'utf8')) : {};
const base = BASE && existsSync(`${OUT}perf_${BASE}.json`) ? JSON.parse(readFileSync(`${OUT}perf_${BASE}.json`, 'utf8')) : null;
const k = (t) => `${Math.round(t / 1000)}k`;
const t0 = Date.now();
for (const id of LEVELS) {
  if (!(await load(id))) continue;
  const pts = await sc(() => window.__perf.points());
  const rows = [];
  for (const pt of pts) rows.push(await measure(id, pt));
  const calls = rows.map((r) => r.calls), tris = rows.map((r) => r.tris);
  const sum = { max: Math.max(...calls), avg: +(calls.reduce((a, b) => a + b, 0) / calls.length).toFixed(1), tmax: Math.max(...tris), tavg: Math.round(tris.reduce((a, b) => a + b, 0) / tris.length) };
  result[id] = { ...sum, rows: rows.map(({ name, calls: c, tris: t, extra, detail }) => ({ name, calls: c, tris: t, extra, ...(detail ? { detail } : {}) })) };
  const b = base?.[id];
  const cmp = b ? `   vorher ${String(b.avg).padStart(5)} / ${String(b.max).padStart(3)} Aufrufe, ${k(b.tavg).padStart(5)} / ${k(b.tmax).padStart(5)} Dreiecke` : '';
  const warn = sum.max >= 120 || sum.tmax >= 300000 ? '  ⚠ Budget' : '';
  console.log(`${id.padEnd(10)} Ø ${String(sum.avg).padStart(5)} / max ${String(sum.max).padStart(3)} Aufrufe, Ø ${k(sum.tavg).padStart(5)} / max ${k(sum.tmax).padStart(5)} Dreiecke${cmp}${warn}`);
  for (const r of rows) {
    const br = b?.rows?.find((x) => x.name === r.name);
    const d = br ? `  (${br.calls} / ${k(br.tris)})` : '';
    const cm = r.cmp ? `  Bild ${(r.cmp.frac * 100).toFixed(3)} % abweichend (max ${r.cmp.max}), ohne Sparen ${r.cmp.offCalls} / ${k(r.cmp.offTris)}${r.cmp.frac > 0.0005 ? '  ⚠' : ''}` : '';
    console.log(`    ${r.name.padEnd(9)} ${String(r.calls).padStart(4)} Aufrufe ${k(r.tris).padStart(6)} Dreiecke${d}${r.extra ? '  ' + JSON.stringify(r.extra) : ''}${cm}`);
    if (r.detail && process.env.DETAIL !== 'json') for (const [n, c, t] of r.detail.slice(0, 14)) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${k(t).padStart(6)}`);
  }
  if (errors.length) { console.log(`    Konsole (${errors.length}):`); for (const e of errors.slice(0, 5)) console.log('     ', e.slice(0, 200)); }
}
writeFileSync(`${OUT}perf_${LABEL}.json`, JSON.stringify(result, null, 1));
if (base) {
  let c0 = 0, c1 = 0, t0s = 0, t1s = 0, n = 0;
  for (const id of LEVELS) { const a = base[id], b = result[id]; if (!a || !b) continue; c0 += a.avg; c1 += b.avg; t0s += a.tavg; t1s += b.tavg; n++; }
  if (n) console.log(`\nGesamt (${n} Level, Mittel der Mittelwerte): Aufrufe ${(c0 / n).toFixed(1)} → ${(c1 / n).toFixed(1)} (${((c1 / c0 - 1) * 100).toFixed(1)} %), Dreiecke ${k(t0s / n)} → ${k(t1s / n)} (${((t1s / t0s - 1) * 100).toFixed(1)} %)`);
}
console.log(`\n${LEVELS.length} Level in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${OUT}perf_${LABEL}.json`);
await browser.close();
stop();
process.exit(0);
