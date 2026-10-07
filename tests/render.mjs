// Render-Test (volle Auflösung, scale=2): Szenen laden, Screenshots für die Sichtprüfung, keine Konsolenfehler.
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4186;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);

await loadGame(page, PORT, errors, stop, 'level1', '2');
check('Render-Skalierung 2 aktiv', (await sc(() => window.__game.registry.get('renderScale'))) === 2);
check('Canvas 960x540', (await sc(() => [window.__game.canvas.width, window.__game.canvas.height])).join('x') === '960x540');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}r01_level_start.png` });
// Gleiten mit Schirm
await page.keyboard.down('ArrowRight'); await page.keyboard.down('Space');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}r02_glide.png` });
await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
// Höhle
await sc(() => { const s = window.__game.scene.getScene('Play'); s.hero.body.reset(3760, 410); });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}r03_cave.png` });
// Debug-Overlay
await page.keyboard.press('d'); await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}r04_debug.png` });
await page.keyboard.press('d');
// Pause
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}r05_pause.png` });
await sc(() => window.__game.scene.getScene('Pause').toMap());
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}r06_map.png` });
check('Weltkarte aktiv', await sc(() => window.__game.scene.isActive('WorldMap')));
check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
