// Prüft alle Sprite-Module: Pflicht-Frames vorhanden; bei Pixel-Sheets Frame-Maße und Palette,
// bei Vektor-Sheets (draw) nur, dass jede Funktion existiert und ohne Fehler zeichnet.
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const REQUIRED = {
  lotti: ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'glide', 'ride', 'dive'],
  greta: ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'glide', 'ride', 'dive'],
  pflaume: ['idle0', 'idle1', 'walk0', 'walk1', 'panic', 'fly'],
  leaf: ['leaf0', 'leaf1'],
  walker: ['walk0', 'walk1', 'squashed'],
  hopper: ['idle', 'squat', 'jump', 'squashed'],
  coin: ['coin0', 'coin1', 'coin2', 'coin3'], coin_hud: ['full', 'empty'], key: ['key'],
  gate: ['closed', 'open'], flag: ['flag0', 'flag1', 'flag2'], thorns: ['thorns'],
  checkpoint: ['off', 'on'], heart: ['full', 'empty'], berry: ['berry'], fireball: ['fire0', 'fire1'],
};
const SIZES = { lotti: [24, 24], greta: [24, 24], pflaume: [24, 20], leaf: [22, 12], walker: [16, 16], hopper: [16, 16], coin: [12, 12], coin_hud: [8, 8], key: [12, 12], gate: [16, 32], flag: [16, 32], thorns: [16, 8], checkpoint: [16, 32], heart: [8, 8], berry: [8, 8], fireball: [8, 8] };

const dir = resolve('src/gfx/sprites');
let errors = 0;
const seen = new Set();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
  const mod = await import(pathToFileURL(resolve(dir, f)).href);
  for (const sheet of mod.SHEETS ?? []) {
    seen.add(sheet.key);
    const [w, h] = SIZES[sheet.key] ?? [sheet.frameWidth, sheet.frameHeight];
    if (sheet.frameWidth !== w || sheet.frameHeight !== h) { console.log(`✗ ${sheet.key}: Größe ${sheet.frameWidth}x${sheet.frameHeight}, erwartet ${w}x${h}`); errors++; }
    const defined = sheet.draw ?? sheet.frames ?? {};
    for (const name of REQUIRED[sheet.key] ?? []) if (!defined[name]) { console.log(`✗ ${sheet.key}: Frame "${name}" fehlt`); errors++; }
    if (sheet.draw) {
      // Vektor-Sheet: jede Zeichenfunktion mit einem Attrappen-Kontext aufrufen
      const stub = new Proxy({}, { get: (t, p) => (p === 'canvas' ? {} : typeof p === 'string' ? (() => stub) : undefined), set: () => true });
      for (const [name, fn] of Object.entries(sheet.draw)) {
        if (typeof fn !== 'function') { console.log(`✗ ${sheet.key}.${name}: keine Funktion`); errors++; continue; }
        try { fn({ ctx: stub, w: sheet.frameWidth, h: sheet.frameHeight, S: 2, colors: {} }); }
        catch (e) { console.log(`✗ ${sheet.key}.${name}: Zeichenfehler ${e.message}`); errors++; }
      }
      continue;
    }
    for (const [name, rows] of Object.entries(sheet.frames)) {
      if (rows.length !== sheet.frameHeight) { console.log(`✗ ${sheet.key}.${name}: ${rows.length} Zeilen statt ${sheet.frameHeight}`); errors++; }
      rows.forEach((r, i) => {
        if (r.length !== sheet.frameWidth) { console.log(`✗ ${sheet.key}.${name} Zeile ${i}: ${r.length} Zeichen statt ${sheet.frameWidth}`); errors++; }
        for (const ch of r) if (!(ch in sheet.palette)) { console.log(`✗ ${sheet.key}.${name} Zeile ${i}: Zeichen "${ch}" nicht in Palette`); errors++; }
      });
    }
  }
}
for (const k of Object.keys(REQUIRED)) if (!seen.has(k)) { console.log(`✗ Sheet "${k}" fehlt`); errors++; }
console.log(errors ? `${errors} Problem(e)` : 'Alle Sprite-Module in Ordnung');
process.exit(errors ? 1 : 0);
