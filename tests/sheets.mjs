// Exportiert alle Sprite-Sheets vergrößert nach tests/out/ (Sichtkontrolle der Pixel-Art).
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, OUT } from './helpers.mjs';
const PORT = 4185;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop, 'test');
for (const key of (process.argv[2] ?? 'lotti,greta,pflaume,leaf').split(',')) {
  const dataUrl = await page.evaluate((k) => {
    const src = window.__game.textures.get(k).getSourceImage();
    const z = 6, c = document.createElement('canvas');
    c.width = src.width * z; c.height = src.height * z;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#3a3a5a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }, key);
  writeFileSync(`${OUT}sheet_${key}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
}
// Szene mit Hero auf Pflaume
await page.evaluate(() => { const s = window.__game.scene.getScene('Play'); s.enemies.clear(true, true); const m = s.mounts.getChildren()[0]; s.hero.body.reset(m.x, m.y - 24); });
await page.waitForTimeout(700);
await page.evaluate(() => { const s = window.__game.scene.getScene('Play'); s.cameras.main.setZoom(3); });
await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}ride_closeup.png` });
console.log('Sheets exportiert', errors);
await browser.close(); stop();
