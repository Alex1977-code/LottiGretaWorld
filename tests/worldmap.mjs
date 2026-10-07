// Weltkarten-Test: Start, Freischaltung, Laufen, Levelstart, Geheimpfad, Pause, Zurücksetzen.
// Aufruf: npm run build && node tests/worldmap.mjs
import { startServer, launchBrowser, loadGame, makeChecker, renderOverview, OUT } from './helpers.mjs';

const PORT = 4183;
const URL_BASE = `http://localhost:${PORT + Number(process.env.PORT_BASE ?? 0)}/?scale=${process.env.RENDER_SCALE ?? '1'}&r3d=${process.env.RENDER_3D ?? '0'}`;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser({ hasTouch: true });
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const active = (k) => sc((k) => window.__game.scene.isActive(k), k);
const mapState = () => sc(() => { const m = window.__game.scene.getScene('WorldMap'); return { current: m.current, moving: m.moving, heroX: m.hero.x, unlocked: m.world.nodes.map((n) => n.key).filter((k) => m.nodeSprites[k] && window.__game.registry) }; });
const unlockedNodes = () => sc(() => { const m = window.__game.scene.getScene('WorldMap'); return m.world.nodes.map((n) => n.key).filter((k) => m.nodeSprites[k].getData('unlocked')); });

// 1) Ohne ?level → Weltkarte
await page.goto(URL_BASE, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
try { await page.waitForFunction(() => window.__game && window.__game.scene.isActive('WorldMap'), null, { timeout: 40000 }); }
catch { console.log('Weltkarte startet nicht:', errors); stop(); process.exit(1); }
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}w01_map.png` });
check('Start auf der Weltkarte', await active('WorldMap'));
let un = await unlockedNodes();
console.log('frei:', un.join(','));
check('Nur Level 1 frei', un.length === 1 && un[0] === 'level1');

// Rechts drücken → kein Weg frei → bleibt
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
check('Gesperrter Pfad: Hero bleibt stehen', (await mapState()).current === 'level1');

// 1a) Touch-Tipps (echte DOM-TouchEvents) auf Ton-Knopf und Greta-Porträt
await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  window.__tap = (wx, wy) => {
    const r = canvas.getBoundingClientRect();
    const x = r.left + wx * (r.width / 480), y = r.top + wy * (r.height / 270);
    const mk = () => new Touch({ identifier: 9, target: canvas, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 8, radiusY: 8, force: 1 });
    canvas.dispatchEvent(new TouchEvent('touchstart', { touches: [mk()], targetTouches: [mk()], changedTouches: [mk()], bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [mk()], bubbles: true, cancelable: true }));
  };
});
const mutedBefore = await sc(() => window.__audio.engine.muted);
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); window.__tap(m.muteBtn.x, m.muteBtn.y); });
await page.waitForTimeout(200);
check('Touch auf Ton-Knopf schaltet um', (await sc(() => window.__audio.engine.muted)) === !mutedBefore);
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); window.__tap(m.muteBtn.x, m.muteBtn.y); });
await page.waitForTimeout(200);
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); const c = m.heroPicker.greta.c; window.__tap(c.x, c.y); });
await page.waitForTimeout(200);
check('Touch auf Greta-Porträt wählt Greta', (await sc(() => window.__game.scene.getScene('WorldMap').heroKey)) === 'greta');
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); const c = m.heroPicker.lotti.c; window.__tap(c.x, c.y); });
await page.waitForTimeout(200);
check('Touch auf Lotti-Porträt wählt Lotti', (await sc(() => window.__game.scene.getScene('WorldMap').heroKey)) === 'lotti');

// 1b) Figur wechseln: Tab → Greta, gespeichert, im Level verwendet
const heroBefore = await sc(() => window.__game.scene.getScene('WorldMap').heroKey);
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
const heroAfter = await sc(() => ({ key: window.__game.scene.getScene('WorldMap').heroKey, tex: window.__game.scene.getScene('WorldMap').hero.texture.key, saved: JSON.parse(localStorage.getItem('lotti-greta-save-v1')).hero }));
check('Tab wechselt die Figur (Lotti → Greta)', heroBefore === 'lotti' && heroAfter.key === 'greta' && heroAfter.tex === 'greta' && heroAfter.saved === 'greta');
await page.screenshot({ path: `${OUT}w01b_greta.png` });

// 2) Level 1 starten
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('Play'), null, { timeout: 5000 });
await page.waitForTimeout(500);
check('Leertaste startet Level 1', await active('Play') && (await sc(() => window.__game.scene.getScene('Play').levelKey)) === 'level1');
check('Level nutzt die gewählte Figur (Greta)', (await sc(() => window.__game.scene.getScene('Play').hero.texture.key)) === 'greta');

// Zur Fahne teleportieren und abschließen
await sc(() => { const s = window.__game.scene.getScene('Play'); const f = s.flags.getChildren()[0]; s.hero.body.reset(f.x - 20, f.y); });
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(1900);
check('Level geschafft', await active('LevelComplete'));
await page.waitForTimeout(800); // Ergebnis-Szene nimmt erst nach 600 ms Eingaben an
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('WorldMap'), null, { timeout: 5000 });
await page.waitForTimeout(1200);
un = await unlockedNodes();
check('Zurück auf der Karte, Level 2 frei', un.includes('level2') && !un.includes('level3'));
await page.screenshot({ path: `${OUT}w02_unlocked.png` });

// 3) Punkt 2 antippen (Handy) → läuft den ganzen Weg
await sc(() => window.__game.scene.getScene('WorldMap').onNodeTap('level2'));
await page.waitForTimeout(300);
check('Hero läuft los', (await mapState()).moving);
for (let i = 0; i < 60; i++) { await page.waitForTimeout(100); if (!(await mapState()).moving) break; }
let ms = await mapState();
check('Hero steht auf Level 2', ms.current === 'level2');
check('Position gespeichert', (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-save-v1')).current)) === 'level2');
await page.screenshot({ path: `${OUT}w03_level2.png` });

// 4) Level 2–4 laden (generierte Levels) und Übersicht zeichnen
for (const key of ['level2', 'level3', 'level4']) {
  await loadGame(page, PORT, errors, stop, key);
  const info = await sc(() => { const s = window.__game.scene.getScene('Play'); return { coins: s.coins.getLength(), flags: s.flags.getLength(), cps: s.checkpoints.getLength(), mounts: s.mounts.getLength(), keys: s.keys.getLength(), gates: s.gates.getLength(), w: s.map.widthInPixels }; });
  console.log(key, JSON.stringify(info));
  check(`${key}: 5 Münzen, Fahne, Checkpoint, Pflaume`, info.coins === 5 && info.flags === 1 && info.cps === 1 && info.mounts === 1);
  if (key === 'level3') check('level3: Schlüssel und Tor (Geheimpfad)', info.keys === 1 && info.gates === 1);
  await renderOverview(page, key);
}

// 5) Geheimpfad: Level 1 mit geheimem Ausgang im Speicherstand → Pfad 1→3 frei
await sc(() => { const d = JSON.parse(localStorage.getItem('lotti-greta-save-v1')); d.levels.level1.secret = true; d.current = 'level1'; localStorage.setItem('lotti-greta-save-v1', JSON.stringify(d)); });
await page.goto(URL_BASE, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('WorldMap'), null, { timeout: 40000 });
await page.waitForTimeout(500);
un = await unlockedNodes();
check('Geheimer Ausgang schaltet Level 3 frei', un.includes('level3'));
await page.keyboard.press('ArrowDown'); // Geheimpfad führt unten entlang
await page.waitForTimeout(300);
for (let i = 0; i < 80; i++) { await page.waitForTimeout(100); if (!(await mapState()).moving) break; }
ms = await mapState();
check('Über den Geheimpfad zu Level 3 gelaufen', ms.current === 'level3');
await page.screenshot({ path: `${OUT}w04_secret_path.png` });

// 6) Pause im Level
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('Play'), null, { timeout: 5000 });
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('Esc pausiert', await active('Pause') && (await sc(() => window.__game.scene.isPaused('Play'))));
const heroInLevel = await sc(() => window.__game.scene.getScene('Play').hero.texture.key);
await sc(() => window.__game.scene.getScene('Pause').switchHero());
await page.waitForTimeout(100);
const other = heroInLevel === 'lotti' ? 'greta' : 'lotti';
check('Pause-Menü wechselt die Figur im Level', (await sc(() => window.__game.scene.getScene('Play').hero.texture.key)) === other && (await sc(() => JSON.parse(localStorage.getItem('lotti-greta-save-v1')).hero)) === other);
await page.screenshot({ path: `${OUT}w05_pause.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('Esc setzt fort', !(await active('Pause')) && (await active('Play')));
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await sc(() => window.__game.scene.getScene('Pause').toMap());
await page.waitForTimeout(400);
check('„Zur Weltkarte“ verlässt das Level', await active('WorldMap') && !(await active('Play')));

// 7) Spielstand löschen (zweimal tippen)
await sc(() => { const m = window.__game.scene.getScene('WorldMap'); m.onResetTap(); m.onResetTap(); });
await page.waitForTimeout(500);
const cleared = await sc(() => JSON.parse(localStorage.getItem('lotti-greta-save-v1')));
check('Spielstand gelöscht', cleared.current === 'level1' && Object.keys(cleared.levels).length === 0);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
