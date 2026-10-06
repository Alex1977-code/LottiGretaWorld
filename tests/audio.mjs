// Audio-Test: Kontext wird bei Nutzergeste freigeschaltet, Themen wechseln, Trommeln beim Reiten,
// Stummschaltung wird gespeichert, keine Fehler.
import { startServer, launchBrowser, loadGame, makeChecker } from './helpers.mjs';

const PORT = 4184;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop, 'test');
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const audio = () => sc(() => { const a = window.__audio; return { ctx: a.engine.ctx ? a.engine.ctx.state : 'none', ready: a.engine.ready, theme: a.music.current, drums: a.music.drums, muted: a.engine.muted, pending: a.music.pending ?? null }; });

let a = await audio();
console.log('vor Geste:', JSON.stringify(a));
check('Vor der ersten Geste kein AudioContext', a.ctx === 'none' && a.pending === 'world1');

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
a = await audio();
console.log('nach Geste:', JSON.stringify(a));
check('Geste schaltet Audio frei', a.ctx === 'running' && a.ready);
check('Welt-Thema läuft', a.theme === 'world1');
check('Ohne Pflaume keine Trommeln', a.drums === false);

// Effekte auslösen: Sprung, Gleiten
await page.keyboard.down('Space'); await page.waitForTimeout(700); await page.keyboard.up('Space');

// Aufsteigen → Trommeln an
await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; s.pip.body.reset(m.x, m.y - 24); });
await page.waitForTimeout(600);
a = await audio();
check('Auf Pflaume kommt die Trommelspur dazu', a.drums === true);

// Stummschalten (M) und speichern
await page.keyboard.press('m');
await page.waitForTimeout(100);
a = await audio();
check('M schaltet stumm', a.muted === true && (await sc(() => localStorage.getItem('pip-pflaume-muted'))) === '1');
await page.keyboard.press('m');
await page.waitForTimeout(100);
check('M schaltet wieder an', (await audio()).muted === false);

// Zur Weltkarte: Karten-Thema
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await sc(() => window.__game.scene.getScene('Pause').toMap());
await page.waitForTimeout(500);
a = await audio();
check('Weltkarte spielt das Karten-Thema', a.theme === 'map' && a.drums === false);

// Sequencer läuft weiter ohne Fehler
await page.waitForTimeout(1500);
check('Keine Audio-Fehler in der Konsole', errors.length === 0);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
