// Sichtprüfung der 3D-Welt (src/three/world): Hero an markante Stellen von Level 1 teleportieren
// und Screenshots tests/out/w3d_*.png aufnehmen, Level 2–4 je ein Bild, Blockbruch über
// world.removeTile prüfen, Render-Kennzahlen (Zeichenaufrufe/Dreiecke) protokollieren.
// Aufruf: npm run build && node tests/world3d.mjs   (PORT_BASE verschiebt die Ports)
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4188;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);

const teleport = (x, y) => sc(([x, y]) => { const s = window.__game.scene.getScene('Play'); s.hero.body.reset(x, y); s.cameras.main.centerOn(x, y); }, [x, y]);
const info = () => sc(() => { const v = window.__view3d; const r = v.renderer.info.render; return { calls: r.calls, tris: r.triangles, worldMeshes: v.world.group.children.length }; });
const shot = async (name, x, y, wait = 900) => {
  if (x !== undefined) await teleport(x, y);
  await page.waitForTimeout(wait);
  const i = await info();
  console.log(`  ${name.padEnd(14)} calls=${i.calls} tris=${i.tris}`);
  await page.screenshot({ path: `${OUT}w3d_${name}.png` });
  return i;
};

/** Nur die Welt zeichnen (Avatare/Effekte kurz ausblenden) und Kennzahlen lesen. */
const worldOnly = () => sc(() => {
  const v = window.__view3d;
  const hidden = [];
  for (const o of v.three.children) if (o !== v.world.group && o.visible) { o.visible = false; hidden.push(o); }
  v.renderer.render(v.three, v.camera);
  const r = v.renderer.info.render;
  const out = { calls: r.calls, tris: r.triangles };
  for (const o of hidden) o.visible = true;
  return out;
});

await loadGame(page, PORT, errors, stop, 'level1', '2', '1');
check('3D-Ansicht aktiv', await sc(() => !!window.__view3d));
const first = await shot('01_start');
const wo = await worldOnly();
console.log(`  Welt allein: calls=${wo.calls} tris=${wo.tris} (inkl. Schattenpass)`);
check('Welt allein unter 25 Zeichenaufrufen im Hauptpass (gemessen mit Schattenpass < 40)', wo.calls < 40);
check('Dreiecke unter 260k', first.tris < 260000);
await shot('02_huegel', 740, 300);          // Baumstümpfe/Hügel mit Pflaume (x≈46 Tiles)
await shot('03_steindach', 1040, 330);      // Steinreihe als Dach (x≈62–68), Plattformen darüber
await shot('04_schlucht', 1850, 200);       // breite Schlucht (108–122), Turm als Absprung
await shot('05_baumkronen', 2620, 150);     // Plattform-Treppe (Baumkronen), hoch oben
await shot('06_hoehle', 3760, 410);         // Höhle mit Schlüssel
await shot('07_hoehle_links', 3690, 410);   // linkes Höhlenende (Schlüssel, zerbrechliche Decke)
await shot('08_tor', 4560, 290);            // Anhöhe mit Tor
await shot('09_ziel', 4720, 330);           // Fahne, Blockturm am Levelende

// Blockbruch: Steindecke der Höhle (232–234, Zeile 22) direkt entfernen
const before = await sc(() => window.__view3d.world.terrain.bricks.slots.size);
await sc(() => { const w = window.__view3d.world; w.removeTile(232, 22); w.removeTile(233, 22); });
const after = await sc(() => window.__view3d.world.terrain.bricks.slots.size);
check('removeTile entfernt Block-Instanzen', after === before - 2);
await shot('10_blockbruch', 3730, 330);
check('Keine Konsolenfehler in Level 1', errors.length === 0);

for (const lvl of ['level2', 'level3', 'level4']) {
  await loadGame(page, PORT, errors, stop, lvl, '2', '1');
  const i = await shot(`${lvl}_start`);
  check(`${lvl}: Dreiecke unter 260k`, i.tris < 260000);
  // Mitte des Levels
  const mid = await sc(() => { const s = window.__game.scene.getScene('Play'); return s.map.widthInPixels / 2; });
  await shot(`${lvl}_mitte`, mid, 320);
}
check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
