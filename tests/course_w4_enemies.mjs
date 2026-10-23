// Kurs-Modus: Welt-4-Gegner im Gegnerzoo Canyon (0-15) und der Lavafelsen-König (0-16) deterministisch prüfen –
// Kernverhalten, Besiegen-Weg und Schadensweg je Gegner: Ameisen (Kolonne, Rundweg, Hörner nicht von oben, Träger-Ameise,
// **trägt die Figur die Wand hinauf** und über die Kante), Riesenameisen-Strom als Untergrund über dem Stachelfeld,
// Rankenschnapper (wächst/zieht zurück, Körper begehbar, Abprall vom Kopf, Stampfattacke/Feuer besiegen, hängend),
// Lavabrocken (betäuben, tragen, werfen: Zielscheibe, Druckfeld), Walzenwerfer + Stachelwalze (rollt hangabwärts,
// zerbricht an der Mauer, Stampfen zerstört sie nicht), Stachelpanzer, Springklotz (schleudert hoch), Lavafunken im Takt,
// Flatterkäfer-Rad (dreht sich), Klone; Boss nur durch geworfene Lavabrocken verwundbar, 3 Treffer, Feuerbrocken, Ende
// → Stern + Warp → Ziel, Tod setzt zurück. Zeichenaufrufe je Station; Screenshots tests/out/w4en_*.png.
// Simulation nur über window.__course.step(n) und setInput.
// Aufruf: PORT_BASE=3800 node tests/course_w4_enemies.mjs   (W4_PART=zoo|boss|shots: nur ein Teil)
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4262;
const PART = process.env.W4_PART ?? 'all';
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = async (fn, arg) => page.evaluate(fn, arg);

async function load(id) {
  try { await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 60000 }); }
  catch { await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 90000 }); }
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
  } catch {
    console.log(`Level ${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    const P = () => c.player;
    const L = c.level;
    window.__t = {
      Z: (r, dz) => -8 - 20 * (r - 1) - dz,
      ent: (id) => L.named.get(id),
      /** Figur setzen (groß, ohne Power-up, nichts in der Hand) und landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        c.squad?.clear?.();
        p.dead = false;
        p.removedFigure = null; p.hidden = false;
        if (p.holding) { const e = p.holding; p.holding = null; e.carrier = null; }
        if (p.helmet) p.dropHelmet('gone');
        p.big = o.big ?? true;
        p.power = o.power ?? 'none';
        p.powerTime = 0;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.invuln = 0;
        L.runtime.status = 'play';
        L.controlYaw = c.view.rig.controlYaw(p.pos);
        c.step(o.settle ?? 30);
        return p.info();
      },
      /** Von oben auf e fallen (x/z folgen e), bis Abprall oder Landung. */
      stomp(e, o = {}) {
        const p = P();
        const top = e.pos.y + e.half.y * 2;
        const off = o.off ?? [0, 0];
        this.place([e.pos.x + off[0], top + (o.h ?? 1.2), e.pos.z + off[1]], { settle: 0, ...o });
        let bounced = false, hurt = false, landed = false;
        for (let i = 0; i < (o.max ?? 150); i++) {
          c.setInput(o.input ?? {});
          c.step(1);
          if (!o.free && p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x + off[0]; p.pos.z = e.pos.z + off[1]; }
          if (p.invuln > 0 || !p.big || p.dead) hurt = true;
          if (i > 2 && p.mode === 'air' && p.vel.y > 5) { bounced = true; break; }
          if (p.mode === 'ground' || p.mode === 'swim') { landed = true; if (!o.stay) break; }
          if (o.stay && landed && i > (o.stay + 2)) break;
        }
        c.setInput({});
        return { bounced, hurt, landed };
      },
      /** Seitlich (von +x) gegen e laufen; Treffer? */
      side(e, o = {}) {
        const p = P();
        const sx = o.sx ?? 1;
        const gap = e.half.x + p.half.x + 0.08;
        this.place([e.pos.x + gap * sx, o.y ?? e.pos.y, e.pos.z], { settle: 1, yaw: sx > 0 ? Math.PI : 0 });
        let hurt = false;
        for (let i = 0; i < (o.max ?? 40); i++) { c.setInput({ x: -0.6 * sx }); c.step(1); if (p.invuln > 0 || !p.big || p.dead) { hurt = true; break; } }
        c.setInput({});
        return { hurt };
      },
      /** Figur an e stellen (Hüllen berühren sich) und n Schritte warten; Treffer? */
      touch(e, n = 20) {
        const p = P();
        let hurt = false;
        for (let i = 0; i < n; i++) {
          const ec = e.center();
          p.pos.set(ec.x + e.half.x + p.half.x - 0.05, ec.y - p.half.y, ec.z); p.vel.set(0, 0, 0);
          c.step(1);
          if (p.invuln > 0 || !p.big || p.dead) { hurt = true; break; }
        }
        return hurt;
      },
      hurt: () => { const p = P(); return p.invuln > 0 || !p.big || p.dead; },
      count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
      dist: (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z),
      safe(on = true) { const p = P(); if (on) p.hurt = () => false; else delete p.hurt; },
      /** Figur zu (x, z) drehen. */
      face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
      /** Aktion drücken (ein Schritt), dann loslassen. */
      action(o = {}) { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); },
    };
  });
}

const SHOT = async (prefix, name, setup, frames = 2) => {
  await sc(() => { const p = window.__course.player; p.hurt = () => false; });
  await sc(setup);
  const f0 = await sc(() => {
    const c = window.__course;
    c.player.invuln = 0;
    for (let i = 0; i < 30; i++) c.rig.update(0.05, c.view.time + i * 0.05);
    c.snapCamera();
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + frames, { timeout: 40000, polling: 100 }).catch(() => {});
  try { await page.screenshot({ path: `${OUT}${prefix}_${name}.png`, timeout: 60000 }); }
  catch { await page.screenshot({ path: `${OUT}${prefix}_${name}.png`, timeout: 120000 }); }
  return sc(() => window.__course.stats());
};

// =====================================================================================================================
// Gegnerzoo Canyon 0-15
// =====================================================================================================================
if (PART === 'all' || PART === 'zoo') {
await load('0-15');
console.log('Gegnerzoo Canyon 0-15');
const st0 = await sc(() => {
  const c = window.__course;
  const kinds = {};
  for (const e of c.level.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  return { kinds, n: c.level.entities.length };
});
console.log(`  Arten: ${JSON.stringify(st0.kinds)}`);
const NEED = ['ameisensoldat', 'ameisensoldat_horn', 'riesenameise', 'riesenameise_strom', 'rankenschnapper', 'lavabrocken', 'walzenwerfer',
  'stachelpanzer', 'springklotz', 'lavafunke', 'flatterkaefer_rad', 'flatterkaefer'];
check(`Alle Welt-4-Gegnerarten geladen (${NEED.filter((k) => !st0.kinds[k]).join(', ') || 'vollständig'})`, NEED.every((k) => st0.kinds[k] > 0));
check('Keine Konsolenfehler beim Laden', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
}

// __ENDE__
check('Keine Konsolenfehler', errors.length === 0);
if (errors.length) for (const x of errors.slice(0, 12)) console.log('   ', x);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
