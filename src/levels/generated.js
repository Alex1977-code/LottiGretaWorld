// Prozedural erzeugte Levels (seed-basiert) für die Weltkarten-Punkte 2–4.
// Bauen auf denselben Bausteinen wie Level 1 auf; später durch handgebaute Levels ersetzbar.
import Phaser from 'phaser';
import { Grid } from './grid.js';
import { asciiToTiled } from './tiled.js';

/**
 * @param {string} seed
 * @param {object} o  { name, width, pits (0..1), platforms (0..1), enemies (0..1), secret (bool) }
 */
export function buildGeneratedLevel(seed, o = {}) {
  const rnd = new Phaser.Math.RandomDataGenerator([seed]);
  const W = o.width ?? 260, H = 26, FLOOR = 22;
  const g = new Grid(W, H);
  const pitChance = o.pits ?? 0.4, platChance = o.platforms ?? 0.5, enemyChance = o.enemies ?? 0.5;

  g.rect(0, FLOOR, W - 1, H - 1, '#');
  g.set(3, FLOOR - 1, 'P');

  let x = 10;
  let level = 0;              // aktuelle Bodenhöhe (Tiles über FLOOR)
  let coinsLeft = 5;
  let segment = 0;
  const coinSpots = [];
  const flatSpots = [];
  const mid = Math.floor(W / 2);
  let checkpointSet = false;
  let pflaumeSet = false;
  let afterPit = false;

  while (x < W - 24) {
    const len = rnd.between(6, 12);
    const kind = rnd.frac();
    if (kind < pitChance * 0.5 && segment > 0 && !afterPit) {
      // Lücke (2–4 Tiles; springbar, mit Gleiten bequem)
      const w = rnd.between(2, 4);
      g.rect(x, FLOOR - level, x + w - 1, H - 1, '.');
      if (level > 0) g.rect(x, FLOOR, x + w - 1, H - 1, '.');
      x += w;
      afterPit = true;
      continue;
    }
    // Bodenhöhe ändern: max. 3 Tiles rauf (nach einer Lücke höchstens 1), beliebig runter
    const delta = rnd.between(-2, afterPit ? 1 : 3);
    afterPit = false;
    level = Phaser.Math.Clamp(level + delta, 0, 6);
    if (level > 0) g.rect(x, FLOOR - level, x + len - 1, FLOOR - 1, '#');
    flatSpots.push({ x: x + Math.floor(len / 2), top: FLOOR - level });

    // Plattformen über dem Abschnitt
    if (rnd.frac() < platChance && len >= 6) {
      const px = x + rnd.between(1, len - 4);
      const prow = FLOOR - level - rnd.between(2, 3);
      g.hline(px, px + 2, prow, '=');
      coinSpots.push({ x: px + 1, row: prow - 1 });
      if (rnd.frac() < 0.4) {
        const prow2 = prow - 3;
        g.hline(px + 3, px + 5, prow2, '=');
        coinSpots.push({ x: px + 4, row: prow2 - 1 });
      }
    }
    // Gegner
    if (rnd.frac() < enemyChance && len >= 5) {
      g.set(x + rnd.between(2, len - 2), FLOOR - level - 1, rnd.frac() < 0.6 ? 'k' : 'm');
    }
    // Dornen (selten, kurz)
    if (rnd.frac() < 0.15 && len >= 8) {
      const tx = x + rnd.between(2, len - 4);
      g.hline(tx, tx + 1, FLOOR - level - 1, '^');
    }
    // Checkpoint in der Mitte
    if (!checkpointSet && x >= mid) {
      g.set(x + 1, FLOOR - level - 1, 'C');
      checkpointSet = true;
    }
    // Pflaume + Beere im ersten Drittel
    if (!pflaumeSet && x > W * 0.15 && len >= 8) {
      g.set(x + 2, FLOOR - level - 1, 'F');
      g.set(x + 5, FLOOR - level - 2, rnd.pick(['R', 'U', 'Y']));
      pflaumeSet = true;
    }
    x += len;
    segment++;
  }

  // Münzen auf Plattformen verteilen (von vorne nach hinten)
  rnd.shuffle(coinSpots);
  for (const c of coinSpots.sort((a, b) => a.x - b.x).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 5)) === 0)) {
    if (coinsLeft <= 0) break;
    g.set(c.x, c.row, 'o');
    coinsLeft--;
  }
  // Restliche Münzen auf freie Flächen
  for (const f of flatSpots) {
    if (coinsLeft <= 0) break;
    if (g.rows[f.top - 1][f.x] === '.') { g.set(f.x, f.top - 3, 'o'); coinsLeft--; }
  }

  // Ziel
  g.rect(W - 24, FLOOR, W - 1, H - 1, '#');
  g.rect(W - 24, FLOOR - 6, W - 1, FLOOR - 1, '.');
  g.set(W - 6, FLOOR - 1, 'X');
  g.rect(W - 2, FLOOR - 8, W - 1, FLOOR - 1, 'B');

  // Geheimer Ausgang: Schlüssel auf hoher Plattform, Tor vor dem Ziel
  if (o.secret) {
    const kx = Math.floor(W * 0.6);
    // lokale Bodenhöhe unter kx ermitteln
    let top = FLOOR;
    while (top > 0 && g.rows[top - 1][kx] === '#') top--;
    g.rect(kx - 6, top - 3, kx - 5, top - 3, '=');
    g.rect(kx - 3, top - 6, kx - 2, top - 6, '=');
    g.rect(kx, top - 9, kx + 2, top - 9, '=');
    g.set(kx + 1, top - 10, 'K');
    g.rect(W - 14, FLOOR - 3, W - 11, FLOOR - 1, '#');
    g.set(W - 12, FLOOR - 4, 'G');
  }

  return asciiToTiled(g.toRows(), { name: o.name ?? 'Level' });
}
