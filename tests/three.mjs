// 3D-Ansicht (Three.js): Szene laden, Screenshots für die Sichtprüfung, Kennzahlen, keine Konsolenfehler.
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4187;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);

await loadGame(page, PORT, errors, stop, 'level1', '2', '1');
check('3D-Ansicht aktiv', await sc(() => !!window.__view3d && window.__game.registry.get('render3d') === true));
const info = await sc(() => { const v = window.__view3d; return { calls: v.renderer.info.render.calls, tris: v.renderer.info.render.triangles, avatars: v.avatars.size, canvas: [v.canvas.width, v.canvas.height], css: [v.canvas.style.width, v.canvas.style.height, v.canvas.style.left, v.canvas.style.top] }; });
console.log('  Render-Info', JSON.stringify(info));
check('Zeichenaufrufe unter 60', info.calls > 0 && info.calls < 60);
check('Avatare vorhanden', info.avatars >= 10);
check('3D-Leinwand hat Größe', info.canvas[0] > 0 && info.canvas[1] > 0);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}t01_level_start.png` });
// Lauf und Sprung
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.down('Space');
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}t02_jump.png` });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}t03_glide.png` });
await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
// Auf Pflaume
await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; s.hero.body.reset(m.x, m.y - 24); });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}t04_ride.png` });
check('Reitet', await sc(() => !!window.__game.scene.getScene('Play').hero.mount));
// Höhle
await sc(() => { const s = window.__game.scene.getScene('Play'); s.hero.body.reset(3760, 410); });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}t05_cave.png` });
// Pause und zurück zur Karte: 3D-Leinwand muss verschwinden
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}t06_pause.png` });
await sc(() => window.__game.scene.getScene('Pause').toMap());
await page.waitForTimeout(800);
check('3D-Leinwand auf der Karte versteckt', await sc(() => document.getElementById('gl3d').style.display === 'none' && !window.__view3d));
await page.screenshot({ path: `${OUT}t07_map.png` });
// Level erneut starten: Renderer wird wiederverwendet
await sc(() => window.__game.scene.getScene('WorldMap').startLevel());
await page.waitForFunction(() => window.__game.scene.isActive('Play') && window.__view3d, null, { timeout: 15000 });
await page.waitForTimeout(600);
check('3D-Ansicht nach Neustart aktiv', await sc(() => !!window.__view3d && document.getElementById('gl3d').style.display !== 'none'));
await page.screenshot({ path: `${OUT}t08_restart.png` });
check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
