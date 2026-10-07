// Level-1-Test: lädt „Herbstwald“, zeichnet eine Übersicht, prüft Münzen, Schlüssel, Tor, Fahne, Speicherstand.
// Aufruf: npm run build && node tests/level1.mjs
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, heroState, logState, makeChecker, renderOverview, OUT } from './helpers.mjs';

const PORT = 4182;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop, 'level1');
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const teleport = (x, y) => sc(([x, y]) => { const p = window.__game.scene.getScene('Play').hero; p.body.reset(x, y); }, [x, y]);
const reg = (k) => sc((k) => window.__game.registry.get(k), k);

await renderOverview(page, 'level1');

const counts = await sc(() => { const s = window.__game.scene.getScene('Play'); return { coins: s.coins.getLength(), keys: s.keys.getLength(), gates: s.gates.getLength(), flags: s.flags.getLength(), thorns: s.thorns.getLength(), enemies: s.enemies.getLength(), mounts: s.mounts.getLength(), berries: s.berries.getLength(), width: s.map.widthInPixels } });
console.log('Objekte:', JSON.stringify(counts));
check('5 Münzen, 1 Schlüssel, 1 Tor, 1 Fahne', counts.coins === 5 && counts.keys === 1 && counts.gates === 1 && counts.flags === 1);
check('Level ist lang (≥ 4500 px)', counts.width >= 4500);
await page.screenshot({ path: `${OUT}l1_start.png` });

// Münze 1 einsammeln (Position aus Objekten)
const objs = await sc(() => window.__game.scene.getScene('Play').map.getObjectLayer('objects').objects.map((o) => ({ type: o.type, name: o.name, x: o.x + 8, y: o.y })));
const coin1 = objs.filter((o) => o.type === 'coin')[0];
await teleport(coin1.x, coin1.y - 30);
await page.waitForTimeout(400);
let coins = await reg('coins');
check('Münze 1 eingesammelt (HUD/Registry)', coins[0] === true && coins.filter(Boolean).length === 1);

// Dornen verletzen
const th = objs.find((o) => o.type === 'thorns');
const h0 = await reg('hearts');
await teleport(th.x, th.y - 20);
await page.waitForTimeout(500);
check('Dornen kosten ein Herz', (await reg('hearts')) === h0 - 1);
await page.waitForTimeout(1600);

// Schlüssel holen, Tor öffnen → geheimer Ausgang
const key = objs.find((o) => o.type === 'key');
await teleport(key.x, key.y - 10);
await page.waitForTimeout(300);
check('Schlüssel eingesammelt', (await reg('hasKey')) === true);
await page.screenshot({ path: `${OUT}l1_key.png` });
const gate = objs.find((o) => o.type === 'gate');
await teleport(gate.x - 30, gate.y - 10);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
const gateOpen = await sc(() => window.__game.scene.getScene('Play').gates.getChildren()[0].opened);
check('Tor öffnet sich mit Schlüssel', gateOpen);
await page.waitForTimeout(1900);
const lc = await sc(() => ({ active: window.__game.scene.isActive('LevelComplete'), paused: window.__game.scene.isPaused('Play') }));
check('Ergebnis-Szene erscheint, Spiel pausiert', lc.active && lc.paused);
await page.screenshot({ path: `${OUT}l1_complete_secret.png` });
const save = await sc(() => JSON.parse(localStorage.getItem('lotti-greta-save-v1')));
console.log('Speicherstand:', JSON.stringify(save));
check('Speicherstand: Level geschafft, geheimer Ausgang, Münze 1', save?.levels?.level1?.done === true && save.levels.level1.secret === true && save.levels.level1.coins[0] === true);

// Weiter → Weltkarte, von dort Level erneut starten: gespeicherte Münze erscheint halbtransparent
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('WorldMap'), null, { timeout: 5000 });
check('Nach dem Level zurück auf der Weltkarte', true);
await page.waitForTimeout(600);
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('Play') && window.__game.scene.getScene('Play').coins, null, { timeout: 5000 });
await page.waitForTimeout(500);
const restarted = await sc(() => { const s = window.__game.scene.getScene('Play'); return { active: window.__game.scene.isActive('Play'), level: s.levelKey, coin0alpha: s.coins.getChildren().find((c) => c.index === 0)?.alpha, hearts: window.__game.registry.get('hearts') }; });
check('Neustart: Level 1 läuft, gespeicherte Münze halbtransparent', restarted.active && restarted.level === 'level1' && restarted.coin0alpha < 1 && restarted.hearts === 3);

// Fahne → normaler Ausgang
const flag = objs.find((o) => o.type === 'flag');
await teleport(flag.x - 30, flag.y - 10);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(1900);
const lc2 = await sc(() => window.__game.scene.isActive('LevelComplete'));
check('Fahne beendet das Level', lc2);
await page.screenshot({ path: `${OUT}l1_complete_flag.png` });

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
