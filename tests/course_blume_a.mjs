// Welt Blume (Remix-Welt 2), Remix-Level B-1 „Funkentanz in der Kippfeld-Manege“ (Basis 1-5), B-2 „Wasserwürfel im
// Glitzerschacht“ (Basis 6-7), B-3 „Fackelnacht am Lila Nebelmoor“ (Basis 4-2) und B-4 „Uhrenhatz durch die Werferburg“
// (Basis 7-1): Laden ohne Konsolenfehler/-warnungen, Remix-Daten (Platzhalter, Basis, Thema/Licht, Musik-Variante, Zeit,
// Sterne, kein Stempel, Gegnertausch), Gegenprobe „Basislevel unverändert“ (Rohdaten der Basis und die Basis selbst geladen),
// Remix-Regeln wirksam (je Level mit Gegenprobe), Routen-Bot Lotti und Greta von Start bis Zielmast (deterministisch über
// __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne und Geheimnisse mit der echten Mechanik
// samt Gegenproben, Kennzahlen entlang der Route (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus
// der Spielkamera (tests/out/blume_a_*.png).
// Aufruf (nach npm run build): node tests/course_blume_a.mjs [B-1|B-2|B-3|B-4]
//   PARTS=load,rules,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min, z. B. PARTS=load,rules,route und
//   PARTS=targets,extra getrennt) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras/Regeln mit diesem Namensteil) ·
//   VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe je Objekt) · PORT_BASE
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar, wo es um Treffer geht.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], y (Mindesthöhe beim Landen), jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow,
//   max, land, autoJump, edgeJump, swimJump, stopIf } · { wait } · { hop } · { crouch } (Röhre) · { star: i } · { chaseKind,
//   ids } · { expect } · { until } (Name aus COND oder Ausdruck '=…') · { acts: [...] } (Aktionen wie course_w1b: go/jump/
//   waitfor/wallclimb/input/wait, track = mitfahren auf einer Plattform) · { tiles: [[x, z] …] } · { pipe: [x, z] } ·
//   { warp: [x, z] } · { stompAll: Id-Anfang } · { pound: [x, z], above } · { bounce: [x, z], at: [x, z], y } (Sprungfeld/Pilz-
//   Trampolin) · { crusher: id } · { cloud: id, … } (fahrende Wolke im Autoscroller) · { plat: id, when, until } (Plattform
//   abwarten, aufspringen, mitfahren) · { ride: id, board, exit, to } · { leap: [x, z], from, over } (aus dem Wasser springen) ·
//   { dive: [x, z], y } · { swimOut: [x, z] } · { fire: Ziel } (Feuerbälle) · { torch: i } (Fackel anzünden) · { throwAt: [x, z] }
//   (Wurfsichel) · { ball: id, throwTo: [x, z] } (Wurfball aufheben und werfen) · { grab: [x, z] } (Power-up aus ?-Block) ·
//   { climb: [x, z], top } (Krallen-Anzug) · { long: [x, z] } (Weitsprung) · { die } · { upOnto: [x, z, top] }
const Y = 1;
const PI = Math.PI;
const U = 5, SH = 7.2, GOAL_B3 = 8.5;   // B-3: Oberland, Sims über dem Giftbecken, Zielinsel
const ROUTES = {
  // ================================================================================================ B-1 (Basis 1-5)
  'B-1': {
    base: '1-5',
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'circus@nacht', music: 'course_circus', variant: null, archetype: 'parcours', title: 'Funkentanz in der Kippfeld-Manege' },
    enemies: { funkenflaemmchen: 5, feuer_werfer: 2, krabbelkaefer: 8, brummer: 8, flatterkaefer: 6, zauberkroete: 1 },
    baseEnemies: { funkenflaemmchen: 0, feuer_werfer: 0, krabbelkaefer: 8, brummer: 8, flatterkaefer: 6, zauberkroete: 1, stamp: 1 },
    main: [
      { name: 'Schalter-Feld 1 (Funkenflämmchen wandern über die Felder)', tiles: [[-5, -1], [0, -1], [5, -1], [5, -7], [0, -7], [-5, -7]], group: 'feld1' },
      { until: 'steg1', max: 400 },
      { name: 'Steg', acts: [
        { go: [-1, -13.4], run: true }, { jump: [-1, -16.5], run: false }, { go: [-0.3, -17.6], tol: 0.3 }, { jump: [0, -20], run: false },
        { go: [0.6, -21.1], tol: 0.3 }, { jump: [1, -23.5], run: false }, { go: [1, -24.6], tol: 0.3 }, { jump: [0.5, -28.5], run: false },
      ] },
      { name: 'Schalter-Feld 2: fahrende Plattformen', acts: [
        { go: [0, -33] }, { waitfor: 'Math.abs(bot.mover("lift1").x - p.pos.x) < 1.2 && bot.mover("lift1").sh.mover.vx * (p.pos.x - bot.mover("lift1").x) <= 0', max: 2000 },
        { go: [0, -34.6], tol: 0.3 }, { jump: [0, 0], track: 'lift1', run: false },
        { go: [0, 1.2], track: 'lift1', tol: 0.3 }, { waitfor: 'Math.abs(bot.mover("lift2").x - p.pos.x) < 1.6', max: 2000 },
        { go: [0, -1.2], track: 'lift1', tol: 0.3 }, { jump: [0, 0], track: 'lift2', run: false },
        { go: [0, 1.2], track: 'lift2', tol: 0.3 }, { waitfor: 'Math.abs(bot.mover("lift2").x) < 0.6', max: 2000 },
        { go: [0, -1.2], track: 'lift2', tol: 0.3 }, { jump: [0, -52], run: false },
      ] },
      { expect: '=at(-5, 5, 1.2, -50, -57)' },
      { name: 'Checkpoint-Trommel (am Sternring vorbei)', acts: [{ go: [-0.6, -55.4] }, { jump: [-0.6, -61], run: false }, { go: [-2.4, -63.2] }, { wait: 10 }] },
      { name: 'Flatterkäfer-Zone (an den Pilz-Trampolinen vorbei)', acts: [
        { go: [-2.6, -67.2], tol: 0.3 }, { jump: [-2.4, -72.6], run: false }, { go: [-1.6, -75.1], tol: 0.3 }, { jump: [1.4, -79.4], run: false },
        { go: [1.4, -82.1], tol: 0.3 }, { jump: [-1, -86.5], run: false }, { go: [-2, -91.4] },
      ] },
      { name: 'Krabbelkäfer-Gang', acts: [{ go: [0, -91.6], tol: 0.3 }, { jump: [0, -97], run: false }, { go: [0, -122.4], run: true }, { go: [0, -124.2], tol: 0.25 }, { wait: 30 }] },
      { name: 'Wechselschalter-Fähre: alle sechs Felder (öffnet die Kanone)', acts: [
        { waitfor: 'bot.mover("faehre").z > -132.6', max: 3000 }, { jump: [0, 4.4], track: 'faehre', run: false }, { wait: 10 },
        { go: [-3.5, 3.5], track: 'faehre', tol: 0.35 }, { go: [-4.2, 0], track: 'faehre', tol: 0.35 }, { go: [-3.5, -3.5], track: 'faehre', tol: 0.35 },
        { go: [3.5, -3.5], track: 'faehre', tol: 0.35 }, { go: [4.2, 0], track: 'faehre', tol: 0.35 }, { go: [3.5, 3.5], track: 'faehre', tol: 0.35 },
        { go: [0, -3.6], track: 'faehre', tol: 0.35 },
        { waitfor: 'bot.mover("faehre").z < -151.6', max: 3000 }, { go: [0, -157.2], tol: 0.3 }, { jump: [0, -161], run: false },
      ] },
      { expect: 'sperreOffen' },
      { to: [3.5, -160.4], within: 0.25, run: false },
      { name: 'Glasrohr-Kanone → Zielbühne', pipe: [3.5, -163.5] },
      { expect: '=at(-5, 5, 9.5, -184, -196)' },
      { name: 'Zielmast', to: [0, -191.4], within: 0.2, run: false },
    ],
    routeChecks: [
      { name: 'Kanone erst nach allen Wechselfeldern offen, eine Kanonenfahrt', ok: (r) => r.mech.pipes >= 1 && r.log.some((l) => l[0] === 'erwartet' && l[1] === 'sperreOffen' && l[2]) },
    ],
    targets: [
      { name: 'Stern 0: Rätselbox hinter dem Start → Wandschalter-Kammer, Wandsprung-Kette an allen vier Wand-Schaltfeldern vorbei', star: 0, from: [2.6, 0, 4.4],
        legs: [{ warp: [3.2, 6.4] }, { until: '=P().pos.x < -50 && P().mode === \'ground\'', max: 900 }, { to: [-60.6, -4.3], within: 0.3, run: false },
          { to: [-60.6, -6.6], within: 0.15, run: false, slow: 0.5 }, { wait: 20 },
          { acts: [{ wallclimb: { dir: -1, until: 10.6, z: -6.6, stop: 'c.level.runtime.stars[0]' } }, { wait: 40 }] }],
        shot: 'stern0', mech: (r) => r.mech.wand === '1111', mechText: (r) => `Wandfelder ${r.mech.wand}` },
      { name: 'Stern 0 nicht ohne die Wandfelder (Rückwärtssalto im Schacht: nur unten)', star: 0, expectNot: true, from: [-60, 0, -6.6], heroes: ['lotti'],
        legs: [{ backflip: [0, 1] }, { wait: 40 }], mech: (r) => r.mech.wand !== '1111', mechText: (r) => `Wandfelder ${r.mech.wand}` },
      { name: 'Stern 1: Sternring auf der Trommel, Pilz-Trampoline zu den Hochbühnen der Hammer-Werfer, acht Sternmünzen', star: 1, from: [2.4, 2.5, -62.6],
        legs: [{ to: [2.4, -66.4], within: 0.4, run: false }, { expect: 'ringAn' },
          { to: [-1.8, -66.6], within: 0.4, run: false }, { to: [-2.6, -72.6], jump: 24, within: 0.5, run: false },
          { bounce: [-10.2, -77.2], at: [-5.6, -74.4], y: 8.5 }, { to: [-11.2, -78.8], within: 0.4, run: false },
          { to: [-9.0, -77.0], within: 0.3, run: false }, { to: [-3.4, -72.8], jump: 30, within: 0.6, run: true }, { to: [-1.6, -75.1], within: 0.3, run: false }, { to: [1.6, -79.2], jump: 24, within: 0.5, run: false },
          { bounce: [8.2, -83.6], at: [4.6, -81.2], y: 9 }, { to: [9.4, -85.0], within: 0.4, run: false },
          { to: [10.0, -84.8], within: 0.3, run: false }, { to: [-2.2, -87.4], jump: 40, jumpAt: 9.6, edgeJump: true, within: 0.6, run: true }, { until: 'stern1da', max: 240 }, { star: 1 }],
        shot: 'stern1', mech: (r) => r.mech.bounces >= 2, mechText: (r) => `Pilz-Trampoline ${r.mech.bounces}×, Sternmünzen ${r.mech.ring}${r.mech.ringLeft?.length ? ` (übrig ${JSON.stringify(r.mech.ringLeft)})` : ''}` },
      { name: 'Stern 2: Wurfball vom Sims trifft die Zielscheibe der Wurfbude – der Stern fliegt auf den Sims', star: 2, from: [7.4, 10, -188.4],
        legs: [{ ball: 'b1_ball', throwTo: [13.7, -189] }, { until: '=ent(\'b1_bude\').won && !ent(\'b1_bude\').flying', max: 300 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 mit der Wurfsichel vom Sims', star: 2, from: [8.4, 10, -189], place: { power: 'sichel' },
        legs: [{ throwAt: [13.7, -189] }, { until: '=ent(\'b1_bude\').won && !ent(\'b1_bude\').flying', max: 300 }, { star: 2 }] },
      { name: 'Stern 2 nicht mit einem Sprung zur Wurfbude (geschlossen; auf dem Dach nichts zu holen, Scheibe zählt nur Würfe)', star: 2, expectNot: true, from: [6, 10, -189], heroes: ['lotti', 'greta'],
        legs: [{ to: [13.7, -189], jump: 40, jumpAt: 4.2, within: 0.3, run: true, max: 300, autoJump: false }, { wait: 120 }] },
    ],
    extra: [
      { name: 'Kanone ohne alle Wechselfelder verschlossen (Gitterkäfig vor der Öffnung, auch von der Seite und von oben)', from: [3.5, 4, -159.4], heroes: ['lotti'], allowFail: true,
        legs: [{ to: [3.5, -164], within: 0.3, run: false, max: 240 }, { wait: 30 }, { to: [6.2, -161.8], within: 0.3, run: false, max: 300 }, { to: [3.5, -162.2], within: 0.3, run: false, max: 240 },
          { to: [3.5, -159.6], within: 0.3, run: false, max: 300 }, { to: [3.5, -162.2], jump: 40, within: 0.3, run: false, max: 240 }, { wait: 30 }, { expect: 'sperreZu' }],
        mech: (r) => r.mech.pipes === 0 && r.pos[2] > -162.6 && r.pos[1] < 10, mechText: (r) => `Röhrenfahrten ${r.mech.pipes}, Ende ${r.pos.map((v) => v.toFixed(1)).join('/')}` },
      { name: 'Funkenflämmchen auf Feld 1 verletzt bei Berührung', from: [-5, 0, 2], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ until: '=Math.hypot(ent(\'b1_funke1\').pos.x - P().pos.x, ent(\'b1_funke1\').pos.z - P().pos.z) < 2.2', max: 3000 },
          { chaseKind: 'funkenflaemmchen', ids: ['b1_funke1'], max: 240, jump: false }, { wait: 60 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
      { name: 'Hammer-Werfer auf der Hochbühne wirft Hämmer auf den Weg darunter', from: [-2.6, 3, -72.6], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ wait: 120 * 8 }], mech: (r) => r.mech.hammers >= 2, mechText: (r) => `Hämmer ${r.mech.hammers}, Treffer ${r.mech.hurts}` },
      { name: 'Pilz-Trampolin federt auf die Hochbühne, Hammer-Werfer von oben besiegt', from: [-3.2, 3, -73.2], heroes: ['lotti'],
        legs: [{ bounce: [-10.5, -78], at: [-5.6, -74.4], y: 8.5 }, { stompAll: 'b1_hammer1' }],
        mech: (r) => r.mech.stomped.includes('b1_hammer1'), mechText: (r) => `besiegt ${r.mech.stomped.join(' ')}` },
      { name: 'Wurfsichel aus dem ?-Block an der Landebühne', from: [-2, 4, -161.8], heroes: ['lotti'],
        legs: [{ grab: [-2, -164] }, { expect: 'sichel' }] },
      { name: 'Extraleben: Sternkiste im Kistenraum (Stampfattacke)', from: [53.2, 0, -90.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ acts: [{ jump: [53.2, -91.6], run: false }, { go: [53.2, -92.8], tol: 0.15, max: 200 }, { wait: 20 }, { input: { jump: true }, n: 16 }, { input: { crouch: true }, n: 4 }, { wait: 90 }] },
          { chaseKind: 'powerup', max: 900 }] },
      { name: 'Hochbühne ohne Pilz-Trampolin nicht erreichbar (Sprung von Bühne A)', from: [-6.4, 3, -73.2], heroes: ['lotti', 'greta'], allowFail: true,
        legs: [{ to: [-10.5, -78], jump: 40, within: 0.4, run: true, max: 260, autoJump: false }, { wait: 60 }],
        mech: (r) => r.pos[1] < 8 && r.mech.bounces === 0, mechText: (r) => `Ende y ${r.pos[1].toFixed(1)}${r.dead ? ' (abgestürzt)' : ''}` },
    ],
    rules: [
      { name: 'Licht: Abendvorstellung im Zelt (Thema circus@nacht mit Mond und Figurenlicht), Basis-Thema circus',
        fn: () => { const c = window.__course, th = c.view.theme; return { theme: c.level.data.theme, light: th.light, pl: !!th.playerLight, moon: !!c.view.sky.lightMoon, hemi: th.hemi?.intensity }; },
        ok: (r) => r.theme === 'circus@nacht' && r.light === 'nacht' && r.pl, text: (r) => `${r.theme}, Himmelslicht ${r.hemi}, Figurenlicht ${r.pl}` },
      { name: 'Funkenflämmchen wandern über die Schaltfelder (in 40 s besucht jedes der sechs Felder von Feld 1 ein Flämmchen, Feld 2 und die grüne Bühne ebenso)',
        fn: () => {
          const c = window.__course, L = c.level, W = window.__ba;
          W.place([0, 0, 4], { settle: 2 });
          const groups = { feld1: ['b1_funke1', 'b1_funke2'], feld2: ['b1_funke3', 'b1_funke4'] };
          const out = {};
          for (const [g, ids] of Object.entries(groups)) {
            const tiles = L.named.get(g).tiles;
            const best = tiles.map(() => 99);
            const fl = ids.map((id) => L.named.get(id));
            W.place(g === 'feld1' ? [0, 0, 4] : [0, 0, -34], { settle: 2 });
            for (let i = 0; i < 120 * 40; i++) {
              c.player.invuln = 9;
              c.step(1);
              if (i % 6) continue;
              tiles.forEach((t, k) => { for (const f of fl) best[k] = Math.min(best[k], Math.hypot(f.pos.x - t.x, f.pos.z - t.z) + Math.abs(f.pos.y - t.y) * 0.3); });
            }
            out[g] = best.map((v) => +v.toFixed(2));
          }
          return out;
        },
        ok: (r) => r.feld1.every((d) => d < 0.6) && r.feld2.every((d) => d < 0.6), text: (r) => `Abstände Feld 1 ${r.feld1.join('/')} · Feld 2 ${r.feld2.join('/')}` },
      { name: 'Hammer-Werfer stehen bei den Pilz-Trampolinen (je einer ≤ 6,5 m neben jedem Trampolin, auf der Hochbühne darüber)',
        fn: () => {
          const L = window.__course.level;
          const pilze = L.data.segments.filter((s) => s.type === 'pilztrampolin').map((s) => s.pos);
          const werfer = L.entities.filter((e) => e.kind === 'feuer_werfer' && e.weapon === 'hammer').map((e) => [e.pos.x, e.pos.y, e.pos.z]);
          return { pilze: pilze.length, werfer: werfer.length, d: pilze.map((p) => +Math.min(...werfer.map((w) => Math.hypot(w[0] - p[0], w[2] - p[2]))).toFixed(1)), up: pilze.map((p) => +Math.min(...werfer.map((w) => w[1] - p[1])).toFixed(1)) };
        },
        ok: (r) => r.pilze === 2 && r.werfer === 2 && r.d.every((d) => d <= 6.5) && r.up.every((u) => u > 4), text: (r) => `${r.pilze} Pilz-Trampoline, ${r.werfer} Hammer-Werfer, Abstand ${r.d.join('/')} m, ${r.up.join('/')} m höher` },
      { name: 'Daten-Regeln: Fähren-Felder öffnen die Kanone (statt Stern), ?-Block → Wurfsichel, Sternkiste → Extraleben; Gegenprobe Basis 1-5 (Stern 2 der Fähre, Krallen, Stern in der Kiste)',
        fn: () => {
          const L = window.__course.level, CL = window.__courseLevels, base = CL.raw('1-5');
          const f = (d) => d.segments.find((s) => s.id === 'wechsel')?.onAll;
          const q = (d) => d.blocks.find((b) => b.kind === 'question' && b.pos[2] === -164)?.content;
          const k = (d) => d.items.find((i) => i.id === 'sternkiste')?.content;
          return { r: [JSON.stringify(f(L.data)), q(L.data), k(L.data)], b: [JSON.stringify(f(base)), q(base), k(base)], open: L.named.get('b1_sperre')?.opened };
        },
        ok: (r) => r.r[0].includes('b1_sperre') && !r.r[0].includes('star') && r.r[1] === 'sichel' && r.r[2] === 'oneup' && r.b[0].includes('"star":2') && r.b[1] === 'krallenAnzug' && r.b[2] === 'star:1' && r.open === false,
        text: (r) => `Remix ${r.r.join(' | ')} · Basis ${r.b.join(' | ')}` },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['feld1', [-5, 0, 2], 90],
      ['raetsel', [3.2, 0, 4.4], 0, null, PI / 2],
      ['kammer', [-60, 0, 1]],
      ['schacht', [-60, 6, -6.6], 1],
      ['feld2', [0, 0, -28]],
      ['trommel', [0, 2.5, -61]],
      ['pilze', [-2.6, 3, -71]],
      ['hochbuehne', [-10.5, 8.5, -77]],
      ['hochbuehne2', [8.6, 9, -83]],
      ['faehre', [0, 4, -124]],
      ['sperre', [3, 4, -159.4]],
      ['zielbuehne', [0, 10, -186.5]],
      ['wurfbude', [7.6, 10, -188.4]],
    ],
  },
  // ================================================================================================ B-2 (Basis 6-7)
  'B-2': {
    base: '6-7',
    start: [0.5, 0, -1],
    drive: { run: false, vmax: 8 },
    sweepScroll: true,
    meta: { stars: 3, time: 400, theme: 'fuzzymine', music: 'course_fuzzymine', variant: null, archetype: 'autoscroller', title: 'Wasserwürfel im Glitzerschacht' },
    enemies: { wuschel_horde: 2, wuschel: 4 },
    baseEnemies: { wuschel_horde: 2, wuschel: 4, stamp: 1 },
    main: [
      // ---- senkrechte Fahrt wie die Basis (Route wie course_w6d); die Fahrt beginnt erst über dem ersten Brett
      { name: 'Sprungfeld auf der Sohle', bounce: [5.6, -1], at: [4.4, -1], y: 4.4 },
      { expect: 'scrollWaits' },
      { name: 'Bretter L2', to: [0, -1], y: 7, jump: 30, jumpAt: 2.8 },
      { expect: 'scrollRuns' },
      { name: 'Wolke c3', to: [3.2, -1], y: 9.6, jump: 30, jumpAt: 2.2 },
      { name: 'Bretter R4', to: [4.3, -1], y: 12.2, jump: 30, jumpAt: 3 },
      { name: 'Bretter L5', to: [-0.6, -1], y: 14.8, jump: 30, jumpAt: 4.4 },
      { name: 'Puffwolke 1', to: [-5.6, -1], y: 17.4, jump: 30, jumpAt: 2.4 },
      { name: 'Puffwolke 2', to: [-2.2, -1], y: 20.0, jump: 30, jumpAt: 3.0, win: 22.8 },
      { name: 'Puffwolke 3', to: [1.6, -1], y: 22.6, jump: 30, jumpAt: 3.4 },
      { name: 'Mittelstation', to: [2.6, -1], y: 25.2, jump: 30 },
      { name: 'Kontrollpunkt 1', to: [-5.4, -2.0], within: 0.5 },
      { to: [4.8, -1], within: 0.4 },
      { name: 'Sprungfeld Mittelstation → R6', bounce: [5.4, -1], at: [6.2, -1], y: 30.8 },
      { name: 'Sprungfeld R6 → L8', bounce: [3.6, -1], at: [6.6, -1], y: 35.2 },
      { name: 'Wolke c9', to: [-1.6, -1], y: 37.8, jump: 30, jumpAt: 3.4 },
      { name: 'Bretter R10', to: [2.6, -1], y: 40.4, jump: 30, jumpAt: 3.2 },
      { name: 'Sprungfeld R10 → L11', bounce: [3.4, -1], at: [4.2, -1], y: 44.8 },
      { name: 'Goldwolke', cloud: 'goldwolke', on: 'right', stand: [3.2, -1], off: [-5.6, -1], y: 50.0, rideUntil: 'goldLeft' },
      { name: 'Puffwolke c13', to: [-1.4, -1], y: 52.6, jump: 30, jumpAt: 3.0 },
      { name: 'Puffwolke c14', to: [0.6, -1], y: 55.2, jump: 30, jumpAt: 3.0, win: 58 },
      { name: 'Felssims', to: [3.8, -1], y: 57.8, jump: 36, jumpAt: 4 },
      { crusher: 'q6' },
      { name: 'Sprungfeld am Felssims → R16', bounce: [5.6, -1], at: [7.3, -1], y: 63.6, keepX: 6.9 },
      { name: 'Wolke c17', to: [0.6, -1], y: 66.2, jump: 30, jumpAt: 2.9 },
      { name: 'Bretter L18', to: [-3.4, -1], y: 68.8, jump: 30, jumpAt: 3.4 },
      { name: 'schwebende Wolke', cloud: 'c_fahrt', on: 'low', stand: [-3.0, -1], at: [0.2, -1], off: [3.6, -1], y: 75.2, rideUntil: 'cloudHigh' },
      { name: 'Schachtkrone', to: [2.2, -1], y: 77.8, jump: 30 },
      { until: 'scrollDone', max: 2400 },
      // ---- Galerie: Wasserwürfel statt Wippen
      { name: 'Kontrollpunkt 2', to: [0, -9.4], within: 0.5 },
      { expect: 'hordeWaits' },
      { to: [0, -12.1], within: 0.3 },
      { name: 'in Würfel 1', to: [0, -15.6], jump: 24, jumpAt: 4, within: 1.2, land: false },
      { name: 'Würfel 1 → Fels 1', leap: [0, -23.0] },
      { to: [0, -24.1], within: 0.3, y: 77.8 },
      { name: 'in Würfel 2', to: [0, -27.0], jump: 24, jumpAt: 4, within: 1.0, land: false },
      { name: 'Würfel 2 → Würfel 3', leap: [0, -31.2] },
      { name: 'Würfel 3 → Fels 2', leap: [0, -34.2] },
      { expect: 'hordeWaits' },
      { crusher: 'q7' },
      { to: [0, -38.2], within: 0.4 },
      { name: 'in Würfel 4', to: [0, -41.6], jump: 24, jumpAt: 4, within: 1.0, land: false },
      { name: 'Würfel 4 → Würfel 5', leap: [1.4, -46.4] },
      { name: 'Würfel 5 → Fels 3', leap: [0, -50.8] },
      { name: 'zweite Horde rollt los', until: 'hordeRolls', max: 240 },
      { name: 'Wolkenbrücke', to: [0, -55], within: 0.6, run: true },
      { to: [0, -61], within: 0.6, run: true },
      { name: 'Grubentor', to: [0, -66.5], within: 0.6 },
      { name: 'Zielmast', to: [0, -74], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Fahrt beendet, Horde folgte dem Bild (keine Absturz-Tode), Grubentor offen', ok: (r) => r.mech.scrollDone && !r.mech.died && r.mech.gate },
      { name: 'Galerie: fünf Wasserwürfel durchschwommen', ok: (r) => r.mech.waters.length === 5, text: (r) => `${r.mech.waters.length} Wasserkörper ${r.mech.waters.join(' ')}` },
      { name: 'zweite Horde startete erst auf dem letzten Felspfeiler und blieb hinter der Heldin', ok: (r) => r.mech.hordeStart !== null && r.mech.hordeStart < -49 && r.mech.hordeGap > 0.5,
        text: (r) => `Start bei z ${r.mech.hordeStart?.toFixed(1)}, kleinster Abstand ${r.mech.hordeGap?.toFixed(1)} m` },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug aus dem ?-Block am Sprungfeld, in der Kletterkammer den Felspfeiler hinauf', star: 0, from: [0.5, 0, -1],
        legs: [{ to: [2.6, 0.9], within: 0.3 }, { to: [6.4, 0.7], within: 0.3 }, { grab: [6.4, -0.2], back: [6.4, -2.4], hold: 80 }, { expect: 'krallen' }, { expect: 'scrollWaits' },
          { to: [9.0, 0.6], within: 0.3 }, { to: [9.0, -1.7], within: 0.3 }, { climb: [10.7, -1.7], top: 7.8, jumpAt: 1.8, then: [10.7, -1.7] }, { wait: 30 }, { expect: 'scrollWaits' }],
        shot: 'stern0', mech: (r) => r.mech.climbs > 20, mechText: (r) => `Kletterschritte ${r.mech.climbs}` },
      { name: 'Stern 0 nicht ohne Krallen (Pfeiler zu hoch, Trennwand ohne Wandsprung)', star: 0, expectNot: true, from: [9.0, 0, 0.4],
        legs: [{ to: [9.0, -1.7], within: 0.3 }, { climb: [10.7, -1.7], top: 7.8, jumpAt: 1.8, allowFail: true }, { to: [9.0, 0.6], within: 0.3 }, { acts: [{ wallclimb: { dir: 1, until: 7.6, z: -1.6 } }, { wait: 60 }] }, { wait: 60 }],
        mechText: (r) => `höchster Punkt y ${r.mech.maxY.toFixed(2)}` },
      { name: 'Stern 1: Stampfattacke auf einen Riesenziegel an der Mittelstation, dahinter auf der Wolke', star: 1, from: [3.0, 25.4, -1.2], place: { scroll: 22.4 },
        legs: [{ to: [3.0, -2.9], y: 27.3, jump: 30, jumpAt: 2.4, within: 0.3 }, { wait: 20 }, { pound: [3.0, -2.9] }, { expect: 'ziegelKaputt' }, { to: [3.0, -5.3], within: 0.3 }, { star: 1 }, { wait: 20 }],
        shot: 'stern1', mech: (r) => r.mech.ziegel >= 1 && !r.dead, mechText: (r) => `Ziegel zerbrochen ${r.mech.ziegel}` },
      { name: 'Stern 1 nicht ohne Stampfen (Anlauf gegen die Ziegel, Sprung darauf und dagegen)', star: 1, expectNot: true, from: [4.0, 25.4, -1.2], place: { scroll: 22.4 },
        legs: [{ to: [4.0, -5.5], within: 0.3, max: 200, autoJump: false }, { hop: 30 }, { to: [3.0, -3.4], jump: 30, jumpAt: 2, within: 0.3, max: 240 }, { wait: 20 }, { to: [3.0, -5.5], within: 0.3, max: 200, autoJump: false }, { wait: 30 }],
        mech: (r) => r.mech.ziegel === 0, mechText: (r) => `Ziegel zerbrochen ${r.mech.ziegel}` },
      { name: 'Stern 2: Sternring am Torplatz – acht grüne Sternmünzen rund ums Deck in 14 s', star: 2, from: [0, 78, -60.6], place: { scroll: 77 },
        legs: [{ to: [0, -64.0], within: 0.5, run: true }, { expect: 'ringAn2' },
          { to: [-4.4, -66.8], within: 0.5, run: true }, { to: [-5.4, -70.4], within: 0.5, run: true }, { to: [-5.4, -74.4], jump: 20, jumpAt: 1.8, within: 0.7, run: true },
          { to: [-4.0, -78.6], within: 0.5, run: true }, { to: [4.0, -78.6], within: 0.5, run: true }, { to: [5.4, -74.4], jump: 20, jumpAt: 1.8, within: 0.7, run: true },
          { to: [5.4, -70.4], within: 0.5, run: true }, { to: [4.4, -66.8], within: 0.5, run: true }, { until: 'stern2da', max: 240 }, { star: 2 }],
        mech: (r) => r.status === 'play',
        shot: 'stern2', mechText: (r) => `Sternmünzen ${r.mech.ring}${r.mech.ringLeft?.length ? ` (übrig ${JSON.stringify(r.mech.ringLeft)})` : ''}` },
      { name: 'Stern 2 nicht ohne den Sternring (hinter dem Tor direkt zur Stelle des Sterns)', star: 2, expectNot: true, from: [-3.6, 78, -66.4], place: { scroll: 77 }, heroes: ['lotti'],
        legs: [{ to: [-5.0, -66.2], within: 0.3 }, { wait: 120 }] },
      { name: 'Stern 2 nicht, wenn die Zeit des Sternrings abläuft (gemächlich gegangen)', star: 2, expectNot: true, from: [0, 78, -60.6], place: { scroll: 77 }, heroes: ['lotti'],
        legs: [{ to: [0, -64.0], within: 0.5 }, { expect: 'ringAn2' }, { wait: 120 * 15 }, { to: [-4.4, -66.8], within: 0.5 }, { to: [-5.0, -66.2], within: 0.3 }, { wait: 60 }] },
    ],
    extra: [
      { name: 'Wer unten aus einem Wasserwürfel taucht, fällt in den Abgrund', from: [0, 77.4, -17], place: { scroll: 77 }, heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ acts: [{ input: { crouch: true }, n: 900 }] }], mech: (r) => r.mech.died && r.mech.deathCause === 'fall' && r.mech.waters.length >= 1, mechText: (r) => `Tod ${r.mech.deathCause}, Wasser ${r.mech.waters.length}` },
      { name: 'Wer seitlich aus einem Wasserwürfel schwimmt, fällt', from: [0, 78.4, -17], place: { scroll: 77 }, heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ to: [4.6, -17], within: 0.3, max: 900, autoJump: false, swimJump: false }, { wait: 600 }], mech: (r) => r.mech.died && r.mech.deathCause === 'fall', mechText: (r) => `Tod ${r.mech.deathCause}` },
      { name: 'Fahrt wartet auf der Sohle, auf dem ?-Block und auf dem ersten Brett; erst der Sprung darüber startet sie', from: [0.5, 0, -1], heroes: ['lotti'],
        legs: [{ wait: 600 }, { expect: 'scrollWaits' }, { to: [2.6, 0.9], within: 0.3 }, { to: [6.4, 0.7], within: 0.3 }, { grab: [6.4, -0.2], back: [6.4, -2.4], hold: 80 },
          { to: [6.4, -0.2], jump: 80, jumpAt: 3, within: 0.4, y: 3.4 }, { wait: 240 }, { expect: 'scrollWaits' }, { to: [6.4, -2.4], within: 0.3 },
          { bounce: [5.6, -1], at: [4.4, -1], y: 4.4 }, { wait: 240 }, { expect: 'scrollWaits' }, { to: [0, -1], y: 7, jump: 30, jumpAt: 2.8 }, { wait: 60 }, { expect: 'scrollRuns' }] },
      { name: 'Kontrollpunkt Galerie: nach einem Absturz wartet die zweite Horde wieder', from: [0, 78, -51.0], place: { scroll: 77 }, heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ until: 'hordeRolls', max: 240 }, { wait: 240 }, { die: 'fall' }, { expect: 'hordeWaits' }, { expect: '=Math.abs(ent(\'horde_galerie\').info().front + 40) < 0.1' }],
        mech: (r) => r.log.filter((l) => l[0] === 'erwartet' && l[2]).length === 2 },
      { name: 'Krallen-Anzug: an der Trennwand zum Schacht kein Halt (kein Klettern, kein Wandrutschen) – nur der Felspfeiler', from: [9.1, 4.4, -1.7], heroes: ['lotti', 'greta'], place: { power: 'krallen', settle: 1 }, allowFail: true,
        legs: [{ to: [7.6, -1.7], max: 160, autoJump: false }],
        mech: (r) => r.mech.walls === 0 && r.mech.climbs === 0, mechText: (r) => `Wand-Schritte ${r.mech.walls}, Kletterschritte ${r.mech.climbs}, Ende y ${r.pos[1].toFixed(2)}` },
    ],
    rules: [
      { name: 'Wippen der Galerie ersetzt: fünf schwebende Wasserwürfel wippen sanft (±0,35 m), Gegenprobe Basis mit drei Wippen',
        fn: () => {
          const c = window.__course, L = c.level, W = window.__ba, CL = window.__courseLevels;
          W.place([0, 78, -9.4], { settle: 2, scroll: 77 });
          const h = L.named.get('b2_wuerfel'), lo = h.cubes.map(() => 99), hi = h.cubes.map(() => -99);
          for (let i = 0; i < 120 * 5; i++) { c.step(1); h.cubes.forEach((q, k) => { lo[k] = Math.min(lo[k], q.box.y0); hi[k] = Math.max(hi[k], q.box.y0); }); }
          const base = CL.raw('6-7');
          return { wippen: L.data.segments.filter((s) => s.type === 'wippe').length, baseWippen: base.segments.filter((s) => s.type === 'wippe').length,
            cubes: h.cubes.length, amp: h.cubes.map((q, k) => +((hi[k] - lo[k]) / 2).toFixed(2)), water: [...c.world.shapes.values()].filter((s) => s.water && s.tag === 'wasserkoerper').length };
        },
        ok: (r) => r.wippen === 0 && r.baseWippen === 3 && r.cubes === 5 && r.water === 5 && r.amp.every((a) => a > 0.25 && a < 0.4), text: (r) => `Wippen ${r.wippen} (Basis ${r.baseWippen}), Würfel ${r.cubes}, Hub ${r.amp.join('/')} m` },
      { name: 'Zweite Wuschel-Horde kurz vor dem Ende: wartet bis zum letzten Felspfeiler, rollt dann schnell, hält vor dem Torplatz; Gegenprobe Basis (rollt ab Kontrollpunkt langsam)',
        fn: () => {
          const c = window.__course, L = c.level, W = window.__ba, CL = window.__courseLevels;
          const h = L.named.get('horde_galerie');
          W.place([0, 78, -38.2], { settle: 2, scroll: 77 });
          for (let i = 0; i < 600; i++) { c.player.invuln = 9; c.step(1); }
          const s1 = h.state;
          W.place([0, 78, -51.2], { settle: 2, scroll: 77 });
          for (let i = 0; i < 120; i++) { c.player.invuln = 9; c.step(1); }
          const f0 = h.info().front;
          for (let i = 0; i < 240; i++) { c.player.invuln = 9; c.step(1); }
          const f1 = h.info().front, s2 = h.state;
          W.place([0, 78, -63.2], { settle: 2, scroll: 77 });
          for (let i = 0; i < 120 * 12; i++) { c.player.invuln = 9; c.step(1); }
          const b = CL.raw('6-7').enemies.find((e) => e.id === 'horde_galerie');
          return { s1, s2, v: +((f0 - f1) / 2).toFixed(2), end: h.info().front, s3: h.state, base: { z: b.pos[2], speed: b.speed } };
        },
        ok: (r) => r.s1 === 'wait' && r.s2 === 'run' && Math.abs(r.v - 2.4) < 0.1 && Math.abs(r.end + 60.4) < 0.05 && r.base.speed === 1.1 && r.base.z === -2,
        text: (r) => `vor Pfeiler 3 ${r.s1}, dann ${r.s2} mit ${r.v} m/s, Ende z ${r.end} (${r.s3}); Basis z ${r.base.z}, ${r.base.speed} m/s` },
      { name: 'Daten-Regeln: Kletterkammer (Pfeiler kletterbar, Trennwand ohne Wandrutschen), Riesenziegel vor der Nische, Fahrt-Auslöser über dem ersten Brett, Galerie-Schild; Gegenprobe Basis',
        fn: () => {
          const c = window.__course, L = c.level, CL = window.__courseLevels, base = CL.raw('6-7');
          const sh = [...c.world.shapes.values()];
          return { climb: sh.filter((s) => s.climbable).length, wand: sh.filter((s) => s.tag === 'kammerwand' && s.noWallSlide).length, ziegel: L.named.get('b2_ziegel')?.blocks.length,
            trig: L.data.scroll.trigger.min[1], baseTrig: base.scroll.trigger.min[1], sign: L.data.segments.some((s) => s.type === 'sign' && /Wasser/.test(s.text)), baseSign: base.segments.some((s) => s.type === 'sign' && /Wippen/.test(s.text)),
            q8: !!L.named.get('q8'), krallen: L.data.blocks.some((b) => b.content === 'krallenAnzug') };
        },
        ok: (r) => r.climb >= 1 && r.wand === 1 && r.ziegel === 2 && r.trig === 6.9 && r.baseTrig === 4.2 && r.sign && r.baseSign && !r.q8 && r.krallen,
        text: (r) => JSON.stringify(r) },
    ],
    shots: [
      ['start', [0.5, 0, -1]],
      ['kammer', [9.2, 0, 0.4]],
      ['pfeiler', [10.7, 7.8, -1.7]],
      ['ziegel', [3.4, 25.4, -1.2], 0, null, PI / 2, 22.4],
      ['galerie', [0, 78, -9.4], 0, null, PI / 2, 77],
      ['wuerfel1', [0, 78, -12.2], 0, null, PI / 2, 77],
      ['wuerfelpaar', [0, 78, -24.0], 0, null, PI / 2, 77],
      ['wuerfel45', [0, 78, -38.2], 0, null, PI / 2, 77],
      ['pfeiler3', [0, 78, -51.2], 0, null, PI / 2, 77],
      ['tor', [0, 78, -61], 0, null, PI / 2, 77],
      ['deck', [0, 78, -69], 0, null, PI / 2, 77],
    ],
  },
  // ================================================================================================ B-3 (Basis 4-2)
  'B-3': {
    base: '4-2',
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'poison@nacht', music: 'course_poison', variant: 'nacht', archetype: 'parcours', title: 'Fackelnacht am Lila Nebelmoor' },
    enemies: { rankenschnapper: 18, brummer: 3 },
    baseEnemies: { rankenschnapper: 26, brummer: 3, stamp: 1 },
    main: [
      { name: 'Start', to: [0, -5] },
      { name: 'Giftpfad', to: [0, -15.6] },
      { to: [-7.4, -17.6] },
      { to: [-7.4, -33] },
      { to: [3, -34.2] },
      { to: [3, -45.4] },
      { to: [0, -50] },
      { name: 'Schlucht (offen, Nacht)', to: [-3, -62] },
      { to: [-3, -98] },
      { name: 'Checkpoint', to: [0, -104.4] },
      { name: 'warten, bis die große Ranke zurück ist', until: 'grossWeg', max: 1200 },
      { name: 'Brücke', to: [0, -125] },
      { name: 'Insel 1', to: [0, -134], jump: 24, jumpAt: 3.6 },
      { to: [-1.4, -135.4], within: 0.4 },
      { name: 'Insel 2', to: [-4.6, -141.8], jump: 34, jumpAt: 5.4 },
      { to: [-3.4, -143.8], within: 0.4 },
      { name: 'Insel 3', to: [2.8, -150.2], jump: 34, jumpAt: 6.6 },
      { to: [1.6, -152.4], within: 0.4 },
      { name: 'Insel 4', to: [-3.4, -159.2], jump: 34, jumpAt: 6.6 },
      { to: [-2.2, -161.4], within: 0.4 },
      { name: 'Insel 5', to: [0.4, -168.6], jump: 34, jumpAt: 6.2 },
      { name: 'Röhre hinauf', to: [2, -175.4], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Oberland', to: [0, -190.6], within: 0.3, run: false },
      { to: [0, -191.5], within: 0.25, run: false },
      { name: 'Plattform 1 (schneller, kleiner)', plat: 'mp1', fresh: true, when: { axis: 'z', gt: -196 }, until: { axis: 'z', lt: -203.1 } },
      { name: 'Plattform 2', plat: 'mp2', when: { axis: 'x', lt: 0.4 }, until: { axis: 'x', gt: 6.3 }, run: false },
      { name: 'Rastinsel', to: [7.4, -212], jump: 24, within: 0.5, run: false },
      { to: [6.6, -213.8], within: 0.3, run: false },
      { name: 'Plattform 3', plat: 'mp3', fresh: true, when: { axis: 'x', gt: 6.1 }, until: { axis: 'x', lt: -2.3 }, run: false },
      { name: 'Plattform 4', plat: 'mp4', when: { axis: 'z', gt: -221 }, until: { axis: 'z', lt: -227.1 }, run: false },
      { name: 'Sternring-Insel', to: [-4.4, -231.2], jump: 24, within: 0.6, run: false },
      { name: 'Zielröhre', to: [3, -235.6], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Zielmast', to: [0, -259.8], within: 0.2 },
    ],
    routeChecks: [
      { name: 'vier Schiebeplattformen gefahren, zwei Röhren', ok: (r) => r.mech.plats === 4 && r.mech.pipes >= 2, text: (r) => `Plattformen ${r.mech.plats}, Röhren ${r.mech.pipes}` },
    ],
    targets: [
      { name: 'Stern 0: alle 8 Fackeln im Giftpfad mit Feuerbällen der Funkenblüte (?-Block am Start)', star: 0, from: [0, Y, 6],
        legs: [{ grab: [0, -2.4], hold: 80 }, { expect: 'funken' },
          { torch: 1, from: [-2.0, 0.4] }, { torch: 0, from: [1.6, -3.6] }, { to: [0, -10], within: 0.5 }, { torch: 2, from: [-2.0, -19.4] }, { torch: 3, from: [-7.4, -18.8] },
          { to: [-7.4, -30], within: 0.5 }, { torch: 5, from: [1.0, -33.6] }, { torch: 4, from: [-5.0, -34.6] }, { to: [3, -38], within: 0.5 }, { to: [3, -45.0], within: 0.5 },
          { torch: 6, from: [-1.0, -46.0] }, { to: [5.6, -47.6], within: 0.4 }, { to: [9.4, -47.2], jump: 24, jumpAt: 3.6, within: 0.5, y: 0.9 }, { torch: 7, from: [9.4, -46.4] },
          { to: [5.4, -48.4], jump: 24, jumpAt: 3.6, within: 0.6, y: 0.9 }, { until: 'stern0da', max: 240 }, { star: 0 }],
        shot: 'stern0', mech: (r) => r.mech.torches === 8, mechText: (r) => `Fackeln ${JSON.stringify(r.mech.fackeln?.groups)}` },
      { name: 'Stern 1: alle 12 Fackeln in Schlucht (auch oben auf dem Sims), Rückkehr und Moorsee', star: 1, from: [0, Y, -58.4],
        legs: [{ grab: [3.0, -61.2], hold: 80 }, { expect: 'funken' },
          { torch: 8, from: [-3.0, -66.0] }, { torch: 9, from: [5.6, -63.4] }, { to: [-1.0, -66.6], within: 0.5 }, { torch: 10, from: [-3.0, -80.6] },
          { to: [-1.0, -73], within: 0.4 }, { to: [0.2, -73], within: 0.2, run: false }, { wait: 30 }, { to: [3.4, -74.4], jump: 24, within: 0.3, run: false }, { wait: 10 }, { to: [3.6, -76.5], jump: 30, within: 0.3, run: false }, { wait: 10 },
          { to: [3.8, -78.6], jump: 30, within: 0.3, run: false }, { wait: 10 }, { to: [4, -80.7], jump: 30, within: 0.3, run: false }, { wait: 10 },
          { to: [4.4, -83.6], jump: 30, within: 0.4, run: false }, { torch: 11, from: [6.4, -85.6] }, { to: [5.0, -91.0], within: 0.5, run: false },
          { torch: 12, from: [6.4, -96.0] }, { torch: 14, from: [-3.0, -91.0] }, { torch: 13, from: [-3.0, -96.0] }, { torch: 15, from: [2.0, -102.0] },
          { to: [0, -104.4] }, { until: 'grossWeg', max: 1200 }, { to: [0, -125] }, { torch: 16, from: [-2.0, -127.6] },
          { to: [0, -127.6], within: 0.4 }, { to: [0, -134], jump: 24, jumpAt: 3.6 }, { to: [-1.4, -135.4], within: 0.4 }, { to: [-4.6, -141.8], jump: 34, jumpAt: 5.4 },
          { torch: 17, from: [-4.2, -141.6] }, { to: [-3.4, -143.8], within: 0.4 }, { to: [2.8, -150.2], jump: 34, jumpAt: 6.6 }, { torch: 18, from: [2.2, -151.0] },
          { to: [1.6, -152.4], within: 0.4 }, { to: [-3.4, -159.2], jump: 34, jumpAt: 6.6 }, { torch: 19, from: [-2.6, -160.0] }, { to: [-2.2, -161.4], within: 0.4 },
          { to: [0.4, -168.6], jump: 34, jumpAt: 6.2 }, { until: '=starVisible(1)', max: 240 }, { star: 1 }],
        shot: 'stern1', mech: (r) => r.mech.torches === 12, mechText: (r) => `Fackeln ${JSON.stringify(r.mech.fackeln?.groups)}` },
      { name: 'Stern 2: alle 3 Fackeln im Oberland, auf der Rastinsel und der Zielröhren-Insel (Funkenblüte im Oberland)', star: 2, from: [3, U, -187],
        legs: [{ grab: [1.0, -188.8], hold: 80 }, { expect: 'funken' }, { torch: 20, from: [5.0, -186.0] }, { to: [0, -190.6], within: 0.3, run: false }, { to: [0, -191.5], within: 0.25, run: false },
          { plat: 'mp1', fresh: true, when: { axis: 'z', gt: -196 }, until: { axis: 'z', lt: -203.1 } }, { plat: 'mp2', when: { axis: 'x', lt: 0.4 }, until: { axis: 'x', gt: 6.3 }, run: false },
          { to: [7.4, -212], jump: 24, within: 0.5, run: false }, { torch: 21, from: [6.6, -212.4] }, { to: [6.6, -213.8], within: 0.3, run: false },
          { plat: 'mp3', fresh: true, when: { axis: 'x', gt: 6.1 }, until: { axis: 'x', lt: -2.3 }, run: false }, { plat: 'mp4', when: { axis: 'z', gt: -221 }, until: { axis: 'z', lt: -227.1 }, run: false },
          { to: [-4.4, -231.2], jump: 24, within: 0.6, run: false }, { torch: 22, from: [-6.0, -231.0] }, { until: '=starVisible(2)', max: 240 }, { star: 2 }],
        shot: 'stern2', mech: (r) => r.mech.torches === 3, mechText: (r) => `Fackeln ${JSON.stringify(r.mech.fackeln?.groups)}` },
      { name: 'Stern 0 nicht ohne Funkenblüte (Fackeln anspringen, Stampfattacke darauf, dagegen laufen)', star: 0, expectNot: true, from: [1.6, Y, -3.6], heroes: ['lotti'],
        legs: [{ to: [4.6, -3.6], jump: 30, jumpAt: 2.6, within: 0.3 }, { pound: [4.6, -3.6] }, { wait: 30 }, { to: [1.6, -3.6], within: 0.3 }, { to: [4.6, -3.6], within: 0.2, max: 120, autoJump: false }, { wait: 60 }],
        mech: (r) => r.mech.fackeln?.lit === 0, mechText: (r) => `angezündet ${r.mech.fackeln?.lit}` },
    ],
    extra: [
      { name: 'Geheimgarten: vom Sims über drei unsichtbare Wolken auf die rechte Schluchtwand – Extraleben', from: [5.0, SH, -85.4], heroes: ['lotti', 'greta'], expectLives: 1,
        legs: [{ expect: '=!ent(\'b3_wolke1\').shown' }, { to: [7.4, -85.6], y: 9.2, jump: 30, jumpAt: 2.2, within: 0.5 }, { wait: 20 }, { expect: '=ent(\'b3_wolke1\').shown' },
          { to: [9.4, -82.4], y: 11.0, jump: 34, jumpAt: 2.6, within: 0.5 }, { to: [8.0, -79.0], y: 12.8, jump: 34, jumpAt: 2.6, within: 0.5 },
          { to: [12.4, -78.8], y: 13.0, jump: 34, jumpAt: 3.6, within: 0.6 }, { chaseKind: 'powerup', max: 600 }],
        shot: 'garten', mech: (r) => r.pos[1] > 12.9, mechText: (r) => `Ende y ${r.pos[1].toFixed(2)}` },
      { name: 'Geheimgarten nicht ohne die Wolken (Sprung vom Sims an die Wand)', from: [9.4, SH, -87.0], heroes: ['lotti', 'greta'], allowFail: true,
        legs: [{ to: [12.4, -87.0], jump: 60, jumpAt: 5, within: 0.5, max: 300, y: 13, autoJump: false }, { wait: 60 }, { to: [12.4, -87.0], jump: 60, jumpAt: 5, within: 0.5, max: 300, y: 13, autoJump: false }, { wait: 60 }],
        mech: (r) => r.mech.maxY < 12.5, mechText: (r) => `höchster Punkt y ${r.mech.maxY.toFixed(2)}` },
      { name: 'Fackeln bleiben nach einem Neustart am Kontrollpunkt an', from: [2.0, Y, -102.0], heroes: ['lotti'], place: { power: 'funken' }, invuln: false, expectAlive: true,
        legs: [{ torch: 15, from: [2.0, -102.0] }, { die: 'fall' }, { expect: '=ent(\'fackeln\').torches[15].lit && !P().dead' }] },
    ],
    rules: [
      { name: 'Licht: Nacht über dem Moor (Thema poison@nacht, Mond, Figurenlicht), Musik-Variante nacht; Gegenprobe Basis poison ohne Variante',
        fn: () => { const c = window.__course, th = c.view.theme, base = window.__courseLevels.raw('4-2'); return { theme: c.level.data.theme, light: th.light, pl: !!th.playerLight, moon: !!c.view.sky.lightMoon, variant: c.level.data.musicVariant, baseTheme: base.theme, baseVariant: base.musicVariant ?? null }; },
        ok: (r) => r.theme === 'poison@nacht' && r.light === 'nacht' && r.pl && r.variant === 'nacht' && r.baseTheme === 'poison' && r.baseVariant === null, text: (r) => JSON.stringify(r) },
      { name: 'Kein Untergrund-Teil: Schlucht offen (keine Decke über dem Weg, keine Höhlen-Stimmung), keine hängenden Ranken, keine Warp-Box/Sternkammer/Moorkeller; Gegenprobe Basis',
        fn: () => {
          const c = window.__course, L = c.level, W = window.__ba, base = window.__courseLevels.raw('4-2');
          W.place([-3, 1, -80], { settle: 30 });
          for (let i = 0; i < 240; i++) c.step(1);
          const up = [];
          let seen = 0;
          for (const sh of c.world.shapes.values()) {
            const y0 = sh.y0 ?? sh.bottom ?? sh.min?.[1];
            if (y0 === undefined || sh.x0 === undefined) continue;
            if (sh.x1 > -7 && sh.x0 < 10.5 && sh.z1 > -100 && sh.z0 < -58) seen++;
            const tag = String(sh.tag ?? sh.owner?.kind ?? '?');
            if (/fackel|wolkenlift|ranken/.test(tag) || sh.owner?.kind === 'rankenschnapper') continue;
            if (sh.x1 > -7 && sh.x0 < 10.5 && sh.z1 > -100 && sh.z0 < -58 && y0 > 4 && sh.solid !== false && !sh.water && !sh.kill) up.push(tag);
          }
          const inG = (q) => q.pos[0] > -8 && q.pos[0] < 11 && q.pos[2] < -58 && q.pos[2] > -100;
          return { up: up.length, seen, walls: L.data.segments.filter((q) => q.type === 'wall' && inG(q)).length, baseWalls: base.segments.filter((q) => q.type === 'wall' && inG(q)).length, upTags: [...new Set(up)].slice(0, 6), mood: c.view.mood?.moodName ?? null, moodNow: L.moodNow ?? null,
            hang: L.entities.filter((e) => e.kind === 'rankenschnapper' && e.spec?.hang).length, warp: L.entities.filter((e) => e.kind === 'warpbox').length,
            far: L.data.segments.filter((s) => s.pos && s.pos[0] > 55).length, keller: !!L.named.get('p_keller_ein'),
            baseHang: base.enemies.filter((e) => e.hang).length, baseWarp: base.items.filter((i) => i.kind === 'warpbox').length, baseFar: base.segments.filter((s) => s.pos && s.pos[0] > 55).length };
        },
        ok: (r) => r.up === 0 && r.seen > 5 && r.walls === 0 && r.baseWalls === 6 && !r.mood && r.hang === 0 && r.warp === 0 && r.far === 0 && !r.keller && r.baseHang === 7 && r.baseWarp === 2 && r.baseFar > 4,
        text: (r) => `Formen über der Schlucht ${r.up} ${JSON.stringify(r.upTags)} (von ${r.seen}), Überhänge ${r.walls} (Basis ${r.baseWalls}), Stimmung ${r.mood}, hängend ${r.hang} (Basis ${r.baseHang}), Warp-Boxen ${r.warp} (Basis ${r.baseWarp}), Räume ${r.far} (Basis ${r.baseFar})` },
      { name: '23 Fackeln in drei Bereichen (8/12/3), alle unangezündet; Stern erst mit der letzten Fackel eines Bereichs (7/8 → kein Stern, 8/8 → Stern)',
        fn: () => {
          const c = window.__course, L = c.level, F = L.named.get('fackeln');
          const g = Object.fromEntries(Object.entries(F.groups).map(([k, v]) => [k, v.of]));
          const lit0 = F.torches.filter((t) => t.lit).length;
          const vis = (i) => L.entities.some((e) => e.kind === 'star' && e.index === i && !e.hidden && e.alive);
          for (let i = 0; i < 7; i++) F.light(i);
          c.step(10);
          const seven = vis(0);
          F.light(7); c.step(10);
          return { g, lit0, seven, eight: vis(0), other: vis(1) || vis(2) };
        },
        ok: (r) => r.g.giftpfad === 8 && r.g.schlucht === 12 && r.g.oberland === 3 && r.lit0 === 0 && !r.seven && r.eight && !r.other, text: (r) => JSON.stringify(r) },
      { name: 'Schiebeplattformen schneller (mp1/mp3 1,35×), kleiner (2,3 statt 3 m) und 0,5–1 m weiter auseinander, Paare im selben Takt; Gegenprobe Basis',
        fn: () => {
          const L = window.__course.level, base = window.__courseLevels.raw('4-2');
          const get = (d, id) => d.segments.find((s) => s.id === id);
          const len = (q) => { let l = 0; for (let i = 1; i < q.path.length; i++) l += Math.hypot(...q.path[i].map((v, k) => v - q.path[i - 1][k])); return l; };
          // Lücken (Kante zu Kante) an den sechs Anschlüssen: Oberland→mp1, mp1→mp2, mp2→Rastinsel, Rastinsel→mp3, mp3→mp4 (Ecke), mp4→Zielröhren-Insel
          const gaps = (d) => {
            const m = (id) => get(d, id), h = (id) => m(id).size[0] / 2;
            const p1 = m('mp1').path, p2 = m('mp2').path, p3 = m('mp3').path, p4 = m('mp4').path;
            return [
              -p1[0][2] - h('mp1') - 192, -p2[1][2] - h('mp2') - (-p1[1][2] + h('mp1')), 209.6 - (-p2[0][2] + h('mp2')), -p3[0][2] - h('mp3') - 214.4,
              Math.hypot(Math.max(0, -p4[1][0] - h('mp4') - (-p3[1][0] + h('mp3'))), Math.max(0, -p4[1][2] - h('mp4') - (-p3[1][2] + h('mp3')))), 229 - (-p4[0][2] + h('mp4')),
            ].map((v) => +v.toFixed(2));
          };
          const g = gaps(L.data), gb = gaps(base);
          const per = ['mp1', 'mp2', 'mp3', 'mp4'].map((id) => +(len(get(L.data, id)) / get(L.data, id).speed).toFixed(3));
          return { g, gb, d: g.map((v, i) => +(v - gb[i]).toFixed(2)), k: [+(get(L.data, 'mp1').speed / get(base, 'mp1').speed).toFixed(3), +(get(L.data, 'mp3').speed / get(base, 'mp3').speed).toFixed(3)], size: get(L.data, 'mp1').size[0], per };
        },
        ok: (r) => r.d.every((v) => v >= 0.5 && v <= 1.0) && r.k.every((k) => Math.abs(k - 1.35) < 0.001) && r.size === 2.3 && Math.abs(r.per[0] - r.per[1]) < 0.01 && Math.abs(r.per[2] - r.per[3]) < 0.01,
        text: (r) => `Lücken ${r.g.join('/')} m (Basis ${r.gb.join('/')}, +${r.d.join('/')}), Tempo ×${r.k.join('/')}, Fahrzeit je Weg ${r.per.join('/')} s` },
      { name: 'Geheimröhre ersetzt: keine Moorkeller-Röhre, drei unsichtbare Wolken (vor dem Betreten unsichtbar), Extraleben im Geheimgarten; Welt-Warp entfällt',
        fn: () => {
          const L = window.__course.level;
          const w = [1, 2, 3].map((i) => L.named.get(`b3_wolke${i}`));
          return { roehre: !!L.named.get('p_keller_ein'), wolken: w.filter(Boolean).length, hidden: w.every((x) => x && !x.shown), oneup: L.entities.filter((e) => e.kind === 'powerup' && e.power === 'oneup' && e.pos.y > 12).length,
            warp: L.data.segments.some((s) => s.warpWorld), baseWarp: window.__courseLevels.raw('4-2').segments.some((s) => s.warpWorld) };
        },
        ok: (r) => !r.roehre && r.wolken === 3 && r.hidden && r.oneup === 1 && !r.warp && r.baseWarp, text: (r) => JSON.stringify(r) },
    ],
    shots: [
      ['start', [0, Y, 6]],
      ['giftpfad', [-7.4, Y, -24]],
      ['schlucht', [-3, Y, -64]],
      ['stufen', [0.2, Y, -73]],
      ['sims', [5.0, SH, -85.4]],
      ['rueckkehr', [0, Y, -106]],
      ['see', [0, 0.6, -133.4]],
      ['hinauf', [0.4, 0.6, -170]],
      ['oberland', [0, U, -188]],
      ['plattformen', [0, U, -192]],
      ['final', [-2, U, -231]],
      ['ziel', [0, GOAL_B3, -256]],
    ],
  },
  // ================================================================================================ B-4 (Basis 7-1)
  'B-4': {
    base: '7-1',
    start: [0, Y, 5],
    meta: { stars: 3, time: 30, theme: 'bluelava', music: 'course_fortfire', variant: 'schnell', archetype: 'parcours', title: 'Uhrenhatz durch die Werferburg' },
    enemies: { feuer_werfer: 6, lavablase: 22, pilzlingsturm: 3, werferturm: 1, stampfstein: 3, marschblock: 12 },
    baseEnemies: { feuer_werfer: 6, lavablase: 22, pilzlingsturm: 3, werferturm: 1, stampfstein: 3, marschblock: 12, stamp: 1 },
    main: [
      { name: 'Uhr am Start', to: [0, -1], within: 0.5 },
      { name: 'Uhr am Burghof', to: [-3.5, -8], within: 0.6 },
      { to: [-3.5, -12.5], within: 0.5 },
      { name: 'H-Röhre (geradeaus)', pipe: [-3.5, -15.6] },
      { expect: 'hof' },
      { name: 'Uhr im Werfer-Hof', to: [0, -37], within: 0.6 },
      { to: [0, -40.8], within: 0.5 },
      { name: 'Röhrengabel (Weiche rechts)', pipe: [0, -43.2] },
      { expect: 'insel' },
      { name: 'Uhr auf der Werfer-Insel', to: [7, -64.5], within: 0.6 },
      { to: [7, -67.6], within: 0.5 },
      { name: 'Röhrenstern zur Hubinsel', pipe: [7, -69.2] },
      { expect: 'hub' },
      { name: 'Uhr auf der Hubinsel', to: [0, -84.4], within: 0.6 },
      { to: [0, -91], within: 0.5 },
      { to: [0, -97.4], within: 0.4, run: false },
      { name: 'Feuerstab 1 (Uhr)', to: [-3.8, -97.8], within: 0.4, run: false },
      { to: [-3.8, -105.4], within: 0.4, run: false },
      { to: [0, -106.6], within: 0.4, run: false },
      { to: [0, -110.4], within: 0.4, run: false },
      { name: 'Feuerstab 2 (Uhr)', to: [-3.8, -110.8], within: 0.4, run: false },
      { to: [-3.8, -118.4], within: 0.4, run: false },
      { to: [0, -118.6], within: 0.4, run: false },
      { name: 'Trittstein', to: [0, -121.6], jump: 20, within: 0.6, run: false },
      { name: 'Werferturm-Platz', to: [0, -125.6], jump: 20, within: 0.6, run: false },
      { expect: 'turmplatz' },
      { name: 'Uhr am Werferturm', to: [0, -129], within: 0.6 },
      { name: 'Werfer auf dem Pilzlingsturm', stompAll: 'werfer4' },
      { until: 'warpOffen', max: 300 },
      { name: 'Warp-Box über den Glutsee', warp: [0, -138.2] },
      { expect: 'cp' },
      { name: 'Uhr am Kontrollpunkt', to: [1.8, -160], within: 0.6 },
      { name: 'Kontrollpunkt', to: [0, -161.5], within: 0.6 },
      { name: 'Pilzlingsturm im Gang', stompAll: 'turm3' },
      { to: [2.6, -168.5], within: 0.5 },
      { name: 'an Stampfstein 1 vorbei (Uhr)', to: [2.6, -177.6], within: 0.5 },
      { to: [-2.6, -184.5], within: 0.5 },
      { name: 'an Stampfstein 2 vorbei (Uhr)', to: [-2.6, -189.6], within: 0.5 },
      { to: [3, -196], within: 0.5 },
      { name: 'an Stampfstein 3 vorbei (Uhr)', to: [3, -201.4], within: 0.5 },
      { name: 'Feuer-Werfer 5', stompAll: 'werfer5' },
      { to: [0, -213], within: 0.6 },
      { name: 'Uhr am Torplatz', to: [0, -215], within: 0.6 },
      { name: 'letzter Feuer-Werfer', stompAll: 'werfer6' },
      { until: 'torOffen', max: 600 },
      { name: 'Zugbrücke', to: [0, -229], within: 0.6 },
      { expect: 'zielinsel' },
      { name: 'Zielmast', to: [0, -240.4], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Ziel vor Ablauf der Zeit (nur mit Zeit-Uhren), kein Zeit-Tod, alle 13 Uhren der Ideallinie', ok: (r) => !r.mech.died && r.mech.uhren >= 13 && r.mech.minTime > 0,
        text: (r) => `Uhren ${r.mech.uhren}, knappste Restzeit ${r.mech.minTime?.toFixed(1)} s, Spielzeit ${r.time.toFixed(1)} s` },
    ],
    targets: [
      { name: 'Stern 2: oben auf dem Dreier-Pilzlingsturm im Burghof (alle drei Pilzlinge abtragen)', star: 2, from: [0, Y, 5],
        legs: [{ stompAll: 'turm1' }, { star: 2 }], shot: 'stern2', mech: (r) => r.mech.stomped.includes('turm1'), mechText: (r) => `besiegt ${r.mech.stomped.join(' ')}` },
      { name: 'Stern 1: beleuchtete Bodenstelle auf der Hubinsel mit der Stampfattacke öffnen', star: 1, from: [2.0, Y, -86.6],
        legs: [{ to: [4.6, -89.4], within: 0.2, run: false }, { wait: 20 }, { pound: [4.6, -89.4] }, { until: '=starVisible(1) || L.runtime.stars[1]', max: 240 }, { star: 1 }], shot: 'stern1', mech: (r) => r.mech.fleck, mechText: (r) => `Bodenstelle offen ${r.mech.fleck}` },
      { name: 'Stern 1 nicht ohne Stampfen (darauf laufen und springen)', star: 1, expectNot: true, from: [2.0, Y, -86.6], heroes: ['lotti'],
        legs: [{ to: [4.6, -89.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { hop: 30 }, { wait: 60 }], mech: (r) => !r.mech.fleck },
      { name: 'Stern 0: Stampfstein 1 hochfahren (auf den gefallenen Stein springen, mitfahren), links auf den Mauer-Erker', star: 0, from: [-1.8, Y, -170.4],
        legs: [{ to: [-1.8, -173.5], within: 0.2, run: false }, { until: '=ent(\'stampf1\').state === \'land\'', max: 400 }, { wait: 10 },
          { to: [-1.8, -175.5], y: 2.9, jump: 30, jumpAt: 2.5, within: 0.4, run: false }, { until: '=ent(\'stampf1\').state === \'wait\' && P().pos.y > 7', max: 900 },
          { to: [-3.8, -175.5], y: 9.1, jump: 50, jumpAt: 3, within: 0.5, run: false }, { wait: 30 }],
        shot: 'stern0', mech: (r) => r.pos[1] > 9.1 && !r.dead, mechText: (r) => `steht auf dem Erker in y ${r.pos[1].toFixed(2)}` },
      { name: 'Stern 0 nicht vom Gang aus (Sprünge unter dem Erker)', star: 0, expectNot: true, from: [-3.0, Y, -172.6], heroes: ['lotti', 'greta'],
        legs: [{ to: [-3.4, -175.5], jump: 60, jumpAt: 4, within: 0.4, max: 200, autoJump: false }, { wait: 30 }, { hop: 60 }, { wait: 60 }] },
      { name: 'Stern 0 nicht von der Zinnenmauer (voller Sprung zum Erker)', star: 0, expectNot: true, from: [-4.15, Y + 3.3, -172.4], heroes: ['lotti', 'greta'], allowFail: true,
        legs: [{ to: [-4.0, -175.0], jump: 70, jumpAt: 4, within: 0.4, max: 200, autoJump: false }, { wait: 60 }], mechText: (r) => `höchster Punkt y ${r.mech.maxY.toFixed(2)}` },
    ],
    extra: [
      { name: 'Geheimnis: zwei unsichtbare längliche ?-Blöcke links vom ersten Stampfstein (von unten anstoßen → Münzen)', from: [-2.6, Y, -169.8], heroes: ['lotti'], expectCoins: 10,
        legs: [{ to: [-2.6, -171.6], within: 0.2, run: false }, { hop: 30 }, { wait: 40 }, { expect: '=ent(\'b4_geheim1\').shown' }, { chaseKind: 'coin', max: 300 },
          { to: [-3.4, -179.4], within: 0.2, run: false }, { hop: 30 }, { wait: 40 }, { expect: '=ent(\'b4_geheim2\').shown' }, { chaseKind: 'coin', max: 300 }],
        mech: (r) => r.log.filter((l) => l[0] === 'erwartet' && l[2]).length === 2 },
      { name: 'Ohne Uhren läuft die Zeit ab (30 s am Start)', from: [0, Y, 5], heroes: ['lotti'], expectAlive: false, allowFail: true,
        legs: [{ wait: 120 * 31 }], mech: (r) => r.mech.died && r.mech.deathCause === 'time', mechText: (r) => `Tod ${r.mech.deathCause}` },
      { name: 'Neustart am Kontrollpunkt mit 30 s; eingesammelte Uhren bleiben weg, dahinter liegen noch fünf (vier auf der Ideallinie, eine am Erker)', from: [1.8, Y, -158.8], heroes: ['lotti'], invuln: false, allowFail: true,
        legs: [{ to: [1.8, -160], within: 0.4 }, { expect: '=ent(\'b4_uhren\').info().got === 1' }, { to: [0, -161.5], within: 0.5 }, { wait: 30 }, { die: 'fall' },
          { expect: '=L.runtime.timeLeft > 29 && L.runtime.timeLeft <= 30 && !P().dead' }, { expect: '=ent(\'b4_uhren\').items.filter((u) => !u.taken && u.z < -161).length === 5' }],
        mech: (r) => r.log.filter((l) => l[0] === 'erwartet' && l[2]).length === 3 },
      { name: 'Zugbrücke bleibt oben, solange der letzte Werfer steht', from: [0, Y, -215], heroes: ['lotti'],
        legs: [{ to: [0, -219.2], within: 0.4, run: false, max: 400 }, { hop: 40 }, { wait: 30 }],
        mech: (r) => r.pos[2] > -221 && !r.dead, mechText: (r) => `z ${r.pos[2].toFixed(1)}` },
    ],
    rules: [
      { name: 'Zeit: 30 s am Start (Basis 400 s), jede Zeit-Uhr +10 s, 16 Uhren; Musik-Variante schnell; kein Sternenring und kein Geheimgang der Basis',
        fn: () => {
          const c = window.__course, L = c.level, W = window.__ba, base = window.__courseLevels.raw('7-1');
          const U = L.named.get('b4_uhren');
          W.place([0, 1, 1.4], { settle: 2 });
          const t0 = L.runtime.timeLeft;
          const u = U.items[0];
          W.place([u.x, u.y - 1, u.z], { settle: 2 });
          const t1 = L.runtime.timeLeft;
          return { limit: L.runtime.timeLimit, t0: +t0.toFixed(2), gain: +(t1 - t0).toFixed(2), n: U.items.length, sec: U.sec, got: U.info().got, variant: L.data.musicVariant,
            ring: !!L.named.get('sternring'), chain: !!L.named.get('geheim'), pipe: !!L.named.get('saal_hin'), baseTime: base.timeLimit, baseRing: base.items.some((i) => i.kind === 'sternring') };
        },
        ok: (r) => r.limit === 30 && r.n === 16 && r.sec === 10 && r.got === 1 && r.gain > 9.5 && r.gain < 10.1 && r.variant === 'schnell' && !r.ring && !r.chain && !r.pipe && r.baseTime === 400 && r.baseRing,
        text: (r) => JSON.stringify(r) },
      { name: 'Sterne an neuen Stellen: Pilzlingsturm trägt Stern 2, Erker über Stampfstein 1, Bodenstelle verschlossen; Gegenprobe Basis (Stern im Rohr, Kugelsaal, Sternenring)',
        fn: () => {
          const L = window.__course.level, base = window.__courseLevels.raw('7-1');
          const t = L.entities.find((e) => e.kind === 'pilzlingsturm' && e.spec?.id === 'turm1');
          return { carry: t?.carry?.star, stars: L.data.stars.map((s) => (Array.isArray(s) ? s : s.pos).map((v) => +v.toFixed(1))), fleck: L.named.get('b4_fleck')?.open, base: base.stars.map((s) => (Array.isArray(s) ? s : s.pos).map((v) => +v.toFixed(1))) };
        },
        ok: (r) => r.carry === 2 && r.stars.length === 2 && r.fleck === false && r.stars.every((s) => r.base.every((b) => Math.hypot(b[0] - s[0], b[2] - s[2]) > 5)),
        text: (r) => JSON.stringify(r) },
    ],
    shots: [
      ['start', [0, Y, 5]],
      ['burghof', [1.5, Y, -4]],
      ['hof', [0, Y, -36]],
      ['insel', [7, Y, -63]],
      ['hub', [2, Y, -86]],
      ['stab1', [0, Y, -95]],
      ['turm', [0, Y, -127]],
      ['cp', [0, Y, -159]],
      ['gang', [0, Y, -170]],
      ['stampfstein', [-1.8, Y + 6.4, -175.5], 2],
      ['marsch', [0, Y, -190]],
      ['tor', [0, Y, -214]],
      ['ziel', [0, Y, -232]],
    ],
  },
};

const PORT = 5005;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,rules,route,sweep,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

// Musik-Aufrufe mitschneiden (music.play(name, opts)): window.__audio wird in main.js gesetzt → Setter umhüllt play
await page.addInitScript(() => {
  let a;
  Object.defineProperty(window, '__audio', {
    configurable: true,
    get() { return a; },
    set(v) {
      a = v;
      const m = v?.music;
      if (m && !m.__spy) { const orig = m.play.bind(m); m.__calls = []; m.play = (n, o) => { m.__calls.push([n, o ?? null]); return orig(n, o); }; m.__spy = true; }
    },
  });
});

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const PI = Math.PI;
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? (src?.spikes ? 'stacheln' : String(src)); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const starVisible = (i) => L.entities.some((e) => e.kind === 'star' && e.index === i && !e.hidden && e.alive && !e.removed);
  const COND = {
    // B-1
    steg1: () => { const h = L.named.get('steg1'); return !!h && h.parts?.every?.((q) => q.shown); },
    sperreOffen: () => !!L.named.get('b1_sperre')?.opened,
    sperreZu: () => !L.named.get('b1_sperre')?.opened,
    ringAn: () => ent('b1_ring')?.state === 'active',
    stern1da: () => starVisible(1),
    sichel: () => P().power === 'sichel',
    krallen: () => P().power === 'krallen',
    funken: () => P().power === 'funken',
    // B-2 (Autoscroller wie 6-7)
    scrollRuns: () => !!L.scroll && L.scroll.state !== 'wait',
    scrollWaits: () => L.scroll?.state === 'wait',
    scrollDone: () => L.scroll?.state === 'done',
    goldLeft: () => { const m = L.named.get('goldwolke'); return !!m && m.mb.pos.x < -2.6; },
    cloudHigh: () => { const w = L.named.get('c_fahrt'); return !!w && w.mb.pos.y > 71.9; },
    gateOpen: () => !!L.named.get('grubentor')?.open,
    hordeWaits: () => L.named.get('horde_galerie')?.state === 'wait',
    hordeRolls: () => ['run', 'done'].includes(L.named.get('horde_galerie')?.state),
    ziegelKaputt: () => (L.named.get('b2_ziegel')?.broken ?? 0) >= 1,
    ringAn2: () => ent('b2_ring')?.state === 'active',
    stern2da: () => starVisible(2),
    // B-3 (wie course_w4a)
    // B-4 (wie course_w7a)
    hof: () => at(-9, 9, 0.5, -31.5, -44),
    insel: () => at(-11, 11, 0.5, -59.5, -70),
    hub: () => at(-9, 9, 0.5, -79.8, -92),
    turmplatz: () => at(-8, 8, 0.5, -124, -140),
    cp: () => at(-8, 8, 0.5, -156, -166),
    zielinsel: () => at(-9, 9, 0.5, -228.4, -248),
    warpOffen: () => !L.named.get('warp_cp')?.hidden,
    torOffen: () => L.named.get('tor')?.state === 'unten',
    grossDa: () => { const e = L.named.get('rs_gross'); return !!e && !e.defeated && e.grow > 0.98 && e.state !== 'hit'; },
    grossWeg: () => { const e = L.named.get('rs_gross'); return !e || e.defeated || e.grow < 0.2; },
    stern0da: () => starVisible(0),
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at, starVisible). */
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', 'starVisible', 'Y', `return (${k.slice(1)});`)(P, L, ent, at, starVisible, 1) : COND[k]());
  const movers = () => [...c.world.shapes.values()].filter((sh) => sh.mover);
  /** Mitte/Oberseite einer bewegten Plattform (benannt bzw. nächste zu z0). */
  const mover = (z0, x0) => {
    if (typeof z0 === 'string') {
      const n = L.named.get(z0), sh = n?.shape;
      if (!sh) return null;
      const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
      return { x: cx, y: sh.top, z: cz, sh };
    }
    let best = null, bd = Infinity;
    for (const sh of movers()) {
      const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
      const d = Math.abs(cz - z0) + (x0 === undefined ? 0 : Math.abs(cx - x0));
      if (d < bd) { bd = d; best = { x: cx, y: sh.top, z: cz, sh }; }
    }
    return best;
  };
  const bot = { mover, named: (id) => L.named.get(id) ?? null, star: (i) => { const e = L.entities.find((x) => x.kind === 'star' && x.index === i && x.alive && !x.hidden); return e ? [e.pos.x, e.pos.z, e.pos.y] : null; } };
  const W = {
    place(pos, o = {}) {
      const p = P();
      if (typeof pos === 'string') pos = L.data.marks[pos];
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L.runtime.status = 'play';
      if (o.scroll !== undefined && L.scroll) {
        // Bildfenster auf Pfadlänge s (laufend), damit die Figur im Bild steht
        L.scroll.restore({ s: o.scroll, speed: 0, clock: 10, waitT: 9, triggered: true, state: o.scroll >= L.scroll.s1 ? 'done' : 'run' });
        if (L.archetype?.onRespawn && o.scroll >= L.scroll.s1) { L.archetype.ended = true; L.archetype.camK = 0; }
      }
      L.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    /** Lenkung in der Luft: Wunschgeschwindigkeit zum Ziel (tx, tz) plus Mitbewegung (vx, vz). */
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, bounces: 0, waits: 0, stomped: [], hurtList: [], scrollDone: false, maxY: -99, hammers: 0, swims: 0, gate: false, hordeStart: null, hordeGap: 99, climbs: 0, walls: 0, minTime: 999 };
      const RUN = o.run ?? true, VMAX = o.vmax ?? 11;
      const waters = new Set();
      const horde = L.data.id === 'B-2' ? L.named.get('horde_galerie') : null;
      let hordeSt = horde?.state;
      const track = [];
      let lastJump = false;
      const hammerSeen = new Set();
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        lastJump = !!inp?.jump;
        c.setInput(inp); c.step(1); steps++;
        mech.maxY = Math.max(mech.maxY, p.pos.y);
        if (L.scroll?.state === 'done') mech.scrollDone = true;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (steps % 10 === 0) for (const e of L.entities) if (e.kind === 'wurf_hammer') hammerSeen.add(e);
        if (p.mode === 'swim') { mech.swims++; if (p.water) waters.add(p.water.waterId ?? p.water.tag ?? '?'); }
        if (p.mode === 'wall') { mech.walls++; if (p.state === 'climb') mech.climbs++; }
        if (L.named.get('grubentor')?.open) mech.gate = true;
        if (L.runtime.status === 'play') mech.minTime = Math.min(mech.minTime, L.runtime.timeLeft);
        if (horde) {
          if (hordeSt === 'wait' && horde.state !== 'wait') mech.hordeStart = p.pos.z;
          hordeSt = horde.state;
          if (horde.state === 'run' && !p.dead) mech.hordeGap = Math.min(mech.hordeGap, horde.info().front - p.pos.z);
        }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.y - t[1], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +(L.scroll?.s ?? 0).toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; mech.died = true; mech.deathCause = p.deathCause; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasnetz' || kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && p.mode !== 'swim' && !p.dead; k++) tick({}); };
      /** Im Autoscroller: warten, bis die vordere Bildgrenze über der Höhe y liegt (Landeplatz). */
      const gate = (y, max = 2400) => {
        const w = L.scroll, arch = L.archetype;
        if (y === undefined || !w || w.state === 'done' || !arch?.frame || w.dir.y < 0.5) return 0;
        let k = 0;
        while (k < max && w.state !== 'done' && y + 0.5 > w.center.y + arch.frame.front) { tick({}); k++; }
        if (k) mech.waits += k;
        return k;
      };
      const goTo = (x, z, r = 0.2, max = 400) => { for (let n = 0; n < max && !p.dead; n++) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz); if (d < r && p.mode === 'ground') return true; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); } return false; };
      // ------------------------------------------------ Aktionen wie course_w1b (go/jump/waitfor/wallclimb/input/wait, track)
      const acts = (actions) => {
        for (let ai = 0; ai < actions.length; ai++) {
          const a = actions[ai];
          const max = a.max ?? 1500;
          let n = 0;
          const dead = () => p.dead || L.runtime.status === 'dying';
          const fnOf = (s, args) => (typeof s === 'string' ? new Function(...args, `return (${s});`) : s);
          const until = a.until ? fnOf(a.until, ['p', 'c']) : null;
          if (a.go) {
            let [tx, tz] = a.go;
            const tol = a.tol ?? 0.45;
            for (; n < max; n++) {
              if (a.track !== undefined) { const m = mover(a.track); if (m) { tx = m.x + a.go[0]; tz = m.z + a.go[1]; } }
              const dx = tx - p.pos.x, dz = tz - p.pos.z;
              if (Math.hypot(dx, dz) < tol) break;
              if (until && until(p, c)) break;
              tick({ ...this.stick(dx, dz, 1), run: !!a.run, jump: !!a.hold });
              if (dead()) break;
            }
          } else if (a.waitfor) {
            const f = fnOf(a.waitfor, ['p', 'c', 'bot']);
            for (; n < max; n++) { if (f(p, c, bot)) break; tick({}); if (dead()) break; }
            if (n >= max) log.push(['FEHLER: Bedingung nicht erreicht', a.waitfor]);
          } else if (a.jump) {
            let [tx, tz] = a.jump;
            const holdN = a.hold ?? 60;
            let air = false;
            for (; n < max; n++) {
              if (a.track !== undefined) { const m = mover(a.track); if (m) { tx = m.x + (a.jump[0] ?? 0); tz = m.z + (a.jump[1] ?? 0); } }
              const dx = tx - p.pos.x, dz = tz - p.pos.z;
              const k = a.gain ?? 2.2, vmax = a.vmax ?? 11;
              let vx = dx * k, vz = dz * k;
              const vl = Math.hypot(vx, vz);
              if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
              const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
              const d = el < 0.3 ? { x: 0, y: 0 } : this.stick(ex, ez, 1);
              if (el < 2) { d.x *= el / 2; d.y *= el / 2; }
              tick({ ...d, run: a.run !== false, jump: n < holdN });
              if (p.mode !== 'ground') air = true;
              if (air && (p.mode === 'ground' || p.mode === 'wall' || p.mode === 'swim')) break;
              if (dead()) break;
            }
          } else if (a.wallclimb) {
            // Wandsprung-Kette zwischen zwei Wänden: erste Wand in Richtung dir (±X), bis Höhe until, dann zum Ziel
            const w = a.wallclimb;
            const stopF = w.stop ? fnOf(w.stop, ['p', 'c']) : null;
            let dir = w.dir, last = false, phase = 'in', top = false;
            const zfix = () => (w.z === undefined ? 0 : -Math.max(-1, Math.min(1, ((w.z - p.pos.z) * 3 - p.vel.z) * 0.5)));
            const dirInp = (x, yv) => { const s = this.stick(x, -yv, Math.min(1, Math.hypot(x, yv))); return s; };
            for (; n < max; n++) {
              if (phase === 'in') {
                const s = dirInp(dir, zfix());
                tick({ ...s, jump: n < 24 });
                last = n < 24;
                if (p.mode === 'wall') phase = 'chain';
              } else if (p.mode === 'wall' && !top) {
                if (last) { tick({ x: 0, y: 0, jump: false }); last = false; }
                else { tick({ x: 0, y: 0, jump: true }); last = true; if (p.mode !== 'wall') dir = -dir; }
              } else {
                top = top || p.pos.y >= w.until;
                let inp = dirInp(dir, zfix());
                if (top && w.then) {
                  const vx = (w.then[0] - p.pos.x) * 2.5 - p.vel.x, vz = (w.then[1] - p.pos.z) * 2.5 - p.vel.z;
                  inp = Math.hypot(vx, vz) < 0.3 ? { x: 0, y: 0 } : this.stick(vx, vz, 1);
                } else if (top) inp = { x: 0, y: 0 };
                tick({ ...inp, jump: !top });
                last = !top;
                if (p.mode === 'ground' && phase === 'chain') break;
              }
              if (w.trace && n % 3 === 0) log.push(['t', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.vel.x.toFixed(1), p.mode, p.state, top]);
              if (dead()) break;
              if (stopF && stopF(p, c)) top = true;
            }
          } else if (a.input) {
            for (; n < (a.n ?? 1); n++) { tick(a.input); if (dead()) break; }
          } else if (a.wait) {
            for (; n < a.wait; n++) { tick({}); if (dead()) break; }
          }
          log.push(['akt', ai, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          if (dead()) { log.push(['FEHLER: tot', p.deathCause]); return false; }
          if (a.go && n >= max) { log.push(['FEHLER: Ziel nicht erreicht', a.go]); return false; }
        }
        return true;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        // gehaltene Sprungtaste vom vorigen Bein loslassen (ein neuer Sprung braucht einen neuen Druck)
        if (lastJump) tick(p.mode === 'air' ? { jump: false } : {});
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until && !Lg.to && !Lg.plat) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.acts) { const ok = acts(Lg.acts); log.push([Lg.name ?? `akt${li}`, ok, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (!ok) break; continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900, walk: Lg.walk, jump: Lg.jump }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.die) {
          p.invuln = 0; p.die(typeof Lg.die === 'string' ? Lg.die : 'hit');
          let k = 0;
          for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Rückwärtssalto: kurz in Blickrichtung tippen, ducken, springen
        if (Lg.backflip) {
          const [fx, fz] = Lg.backflip;
          for (let k = 0; k < 4; k++) tick({ ...this.stick(fx, fz, 0.35) });
          for (let k = 0; k < 20 && Math.hypot(p.vel.x, p.vel.z) > 0.05; k++) tick({});
          for (let k = 0; k < 12; k++) tick({ crouch: true });
          for (let k = 0; k < 36; k++) tick({ crouch: k < 4, jump: true });
          for (let k = 0; k < 300 && p.mode !== 'ground'; k++) tick({});
          log.push(['Rückwärtssalto', p.jumpKind, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +mech.maxY.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Quetschblock: warten, bis er gerade wieder oben ist
        if (Lg.crusher) {
          const q = ent(Lg.crusher);
          let k = 0, seenBack = q.state === 'zurueck' || (Lg.fresh === false);
          for (; k < 1600; k++) {
            if (q.state === 'zurueck') seenBack = true;
            if ((seenBack || Lg.fresh === false) && q.state === 'ruhe') break;
            tick({});
          }
          log.push(['quetschblock', Lg.crusher, k, q.state]);
          continue;
        }
        // ------------------------------------------------ Sprungfeld / Pilz-Trampolin: hinaufspringen, hochfedern, zum Ziel lenken
        if (Lg.bounce) {
          const [ax, az] = Lg.at, [tx, tz] = Lg.bounce;
          gate(Lg.win ?? Lg.y);
          let k = 0, bounced = false, landed = false;
          for (; k < 900; k++) {
            if (p.dead) break;
            if (!bounced) {
              const dx = ax - p.pos.x, dz = az - p.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(ax, az, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz)))), jump: (p.mode === 'ground' && Math.hypot(dx, dz) < 1.6 && (k % 16) < 8) || (p.mode === 'air' && p.vel.y > 0), run: false });
              if (p.jumpKind === 'bounce' && p.mode === 'air') { bounced = true; mech.bounces++; }
              continue;
            }
            const steer = p.vel.y < (Lg.steerBelow ?? 6) || Lg.keepX === undefined;
            const gx = Lg.keepX !== undefined && p.vel.y >= (Lg.steerBelow ?? 6) ? Lg.keepX : tx;
            tick({ ...(steer || Lg.keepX !== undefined ? this.airSteer(gx, tz, 0, 0, 2.6, 7) : {}), jump: true });
            if (p.mode === 'ground' || p.mode === 'swim') { landed = true; break; }
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['Sprungfeld', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed || !okY) { log.push(['FEHLER: Sprungfeld', Lg.name ?? Lg.at, JSON.stringify(hist.slice(-25))]); break; }
          continue;
        }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) { const dx = tx - p.pos.x, dz = tz - p.pos.z; tick({ ...this.stick(dx, dz, 1), run: false, jump: Lg.jumpIn && k % 40 < 12 }); }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Röhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, rode = false;
          const r0 = mech.rides;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' ? d < 2.0 : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { rode = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            let k = 0;
            for (; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
            if (Lg.max && guard + 1 >= Lg.max) break;
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ Sprung auf [x, z] mit Stampfattacke über dem Ziel
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounded = false;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && k > 4 && (pounded || p.state === 'groundpound')) break;
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5 && p.pos.y > (Lg.above ?? -99)) pounded = true;
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ alle Felder (Liste [x, z]) betreten
        if (Lg.tiles) {
          for (const [tx, tz] of Lg.tiles) {
            for (let n = 0; n < 400 && !p.dead; n++) {
              const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
              if (d < 0.3) break;
              tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2))), run: false });
            }
            for (let n = 0; n < 6; n++) tick({});
          }
          log.push(['felder', Lg.tiles.length, Lg.group ? L.named.get(Lg.group)?.done : null]);
          if (Lg.group && !L.named.get(Lg.group)?.done) log.push(['FEHLER: Felder nicht alle an', Lg.group]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen (zum Ziel drehen, Aktion), Rückkehr abwarten
        if (Lg.throwAt) {
          const [tx, tz] = Lg.throwAt;
          let k = 0;
          for (; k < 200 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995) break;
            tick({ ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          for (let n = 0; n < (Lg.wait ?? 240); n++) tick({});
          log.push(['sichel', `${Lg.throwAt}`, k, p.power]);
          continue;
        }
        // ------------------------------------------------ Wurfball (Id) aufheben, zum Ziel drehen, werfen
        if (Lg.ball) {
          const b = ent(Lg.ball);
          let k = 0;
          for (; k < 600 && p.holding !== b && !p.dead; k++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (d > 0.8) { tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5 + 0.2)), run: false }); continue; }
            if (dot < 0.9) { tick({ ...this.stick(dx, dz, 0.15), run: false }); continue; }
            tick({ action: k % 8 === 0 });
          }
          const got = p.holding === b;
          const [tx, tz] = Lg.throwTo;
          if (Lg.stand) goTo(Lg.stand[0], Lg.stand[1], 0.2);
          for (let n = 0; n < 200 && !p.dead; n++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995 && p.hSpeed() < 0.3) break;
            tick(dot > 0.995 ? {} : { ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          mech.thrown = got && p.holding !== b;
          if (Lg.trace) for (let n = 0; n < 90; n++) { tick({}); if (n % 3 === 0) log.push(['ball', n, +b.pos.x.toFixed(2), +b.pos.y.toFixed(2), +b.pos.z.toFixed(2), +b.vel.x.toFixed(1), +b.vel.y.toFixed(1)]); }
          log.push(['wurfball', Lg.ball, got, mech.thrown, k, +b.pos.x.toFixed(2), +b.pos.y.toFixed(2), +b.pos.z.toFixed(2)]);
          if (!got) log.push(['FEHLER: Ball nicht aufgehoben', Lg.ball]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const pw0 = p.power;
          goTo(bx, bz);
          for (let k = 0; k < 90 && p.hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          let tries = 0;
          for (; tries < 4 && p.power === pw0 && !p.dead; tries++) {
            goTo(back[0], back[1]);
            for (let k = 0; k < 40; k++) tick({});
            for (let k = 0; k < 240 && !p.dead; k++) {
              const dx = bx - p.pos.x, dz = bz - p.pos.z;
              if (k > 10 && p.mode === 'ground') break;
              tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 4) : this.stick(dx, dz, 0.5)), jump: k < (Lg.hold ?? 40), run: false });
            }
            for (let k = 0; k < 30; k++) tick({});
            if (p.power === pw0) { const n = this.chase('powerup', { max: 300 }); void n; }
          }
          log.push(['power', Lg.grab.join(','), p.power, tries]);
          if (p.power === pw0) log.push(['FEHLER: Power-up nicht geholt', Lg.grab]);
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf: zur Wand springen und dagegen drücken
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.pos.y > (Lg.top ?? 99) - 0.1 && p.mode === 'ground') { top = true; break; }
            if (p.mode === 'wall') { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: false, jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : p.vel.y > 0 });
          }
          if (Lg.then) for (let n = 0; n < 300 && !p.dead; n++, k++) { const dx = Lg.then[0] - p.pos.x, dz = Lg.then[1] - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d))), run: false }); }
          log.push(['klettern', `${Lg.climb}`, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!top && !Lg.allowFail) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ------------------------------------------------ fahrende Wolke im Autoscroller (wie course_w6d): abwarten, aufspringen, mitfahren, abspringen
        if (Lg.cloud) {
          const m = L.named.get(Lg.cloud);
          const mpos = () => (m.pm ? m.pm.pos : m.mb.pos);
          const ready = () => {
            if (Lg.on === 'right') return m.mb.pos.x > 3.1 && Math.abs(p.pos.x - Lg.stand[0]) < 0.4;
            if (Lg.on === 'low') return m.mb.pos.y < 70.8 && Math.abs(p.pos.x - Lg.stand[0]) < 0.4;
            return true;
          };
          let k = 0;
          for (; k < 2400 && !ready(); k++) {
            const sp = Lg.stand ?? null;
            if (sp) { const dx = sp[0] - p.pos.x, dz = sp[1] - p.pos.z; tick(Math.hypot(dx, dz) > 0.3 ? { ...this.stick(dx, dz, 0.5), run: false } : {}); } else tick({});
          }
          let j = 0, on = false;
          for (; j < 300; j++) {
            const q = mpos();
            const tx = q.x, tz = Lg.at?.[1] ?? q.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, (m.pm ? m.mover : m.mb.mover)?.vx ?? 0, 0, 3.2, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: j < 26, run: false });
            if (j > 8 && p.mode === 'ground') { on = p.pos.y > (Lg.onY ?? (m.pm ? q.y + 0.2 : q.y + 0.3)); break; }
          }
          if (!on) { log.push(['FEHLER: nicht auf', Lg.cloud, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2)]); break; }
          const winOk = () => { const w = L.scroll, fr = L.archetype?.frame, y = Lg.win ?? Lg.y; return y === undefined || !w || w.state === 'done' || !fr || y + 0.5 <= w.center.y + fr.front; };
          let r = 0;
          for (; r < 3600 && !(cond(Lg.rideUntil) && winOk()); r++) { const q = mpos(); const dx = q.x - p.pos.x; tick(Math.abs(dx) > 0.3 ? { ...this.stick(dx, 0, 0.5), run: false } : {}); }
          const [tx, tz] = Lg.off;
          let a = 0;
          for (; a < 400; a++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.8, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 30, run: false });
            if (a > 10 && p.mode === 'ground') break;
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['gefahren', Lg.cloud, k, j, r, a, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!okY) { log.push(['FEHLER: Absprung von', Lg.cloud]); break; }
          continue;
        }
        // ------------------------------------------------ aus dem Wasser springen (wie course_w8b): an die Oberfläche und an den Rand zur
        // Zielseite schwimmen, dann mit Schwung zum Ziel (auch hinüber in den nächsten Wasserkörper)
        if (Lg.leap) {
          const [tx, tz] = Lg.leap;
          let k = 0;
          for (let q = 0; q < 240 && p.mode === 'air' && !p.dead; q++) tick({});
          const wb = !Lg.from && p.water && p.water.x1 !== undefined ? p.water : null;
          const x0 = Lg.from ? Lg.from[0] : wb ? Math.max(wb.x0 + 0.7, Math.min(wb.x1 - 0.7, tx)) : p.pos.x;
          const z0 = Lg.from ? Lg.from[1] : wb ? Math.max(wb.z0 + 0.7, Math.min(wb.z1 - 0.7, tz)) : p.pos.z;
          const wasSwim = p.mode === 'swim';
          for (; k < 900 && p.mode === 'swim' && !p.dead; k++) {
            const dx = x0 - p.pos.x, dz = z0 - p.pos.z, d = Math.hypot(dx, dz);
            const top = p.water ? p.water.top - (p.pos.y + p.half.y) < 0.45 : false;
            const go = d < (Lg.from ? 0.5 : 1.3) && top && k > 10;
            const st = Lg.from ? this.stick(dx, dz, Math.min(1, d)) : go ? this.stick(tx - p.pos.x, tz - p.pos.z, 1) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)));
            tick({ ...st, jump: go && k % 12 < 4 });
          }
          let j = 0;
          for (; j < 400 && (p.mode === 'air' || p.mode === 'wall') && !p.dead; j++) {
            const up = Lg.over !== undefined && p.pos.y < Lg.over && p.vel.y > 0;
            tick({ ...(up ? this.airSteer(x0, z0, 0, 0, 3.2, 2) : this.airSteer(tx, tz, 0, 0, 3.2, 6.5)), jump: p.vel.y > 0 });
          }
          settle();
          log.push(['aussprung', `${Lg.leap}`, wasSwim, k, j, p.mode, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!wasSwim) { log.push(['FEHLER: nicht im Wasser vor dem Aussprung', Lg.leap]); break; }
          continue;
        }
        // ------------------------------------------------ bewegte Plattform (wie course_w4a): abwarten (when), aufspringen, mitfahren (until)
        if (Lg.plat) {
          const m = L.named.get(Lg.plat);
          const axisV = (c2) => (c2.axis === 'x' ? m.pm.pos.x : c2.axis === 'y' ? m.pm.pos.y : m.pm.pos.z);
          const ok = () => { const v = axisV(Lg.when); return (Lg.when.lt === undefined || v < Lg.when.lt) && (Lg.when.gt === undefined || v > Lg.when.gt); };
          let k = 0;
          // fresh: eine frische Ankunft abwarten (nicht mitten in der Wartezeit losspringen)
          if (Lg.fresh) for (; k < 3000 && ok(); k++) tick({});
          for (; k < 3000 && !ok(); k++) tick({});
          let j = 0, on = false, left = false;
          for (; j < 260; j++) {
            const mv = m.mover ?? { vx: 0, vz: 0 };
            const tx = m.pm.pos.x, tz = m.pm.pos.z;
            const st = p.mode === 'air' ? this.airSteer(tx, tz, mv.vx ?? 0, mv.vz ?? 0, 2.8, 9) : this.stick(tx - p.pos.x, tz - p.pos.z);
            tick({ ...st, jump: j < (Lg.jump ?? 26), run: Lg.run ?? true });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') { on = p.ground?.mover === m.mover || p.ground === m.shape; break; }
          }
          log.push([Lg.name ?? `auf ${Lg.plat}`, k, j, on, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) { log.push(['FEHLER: nicht auf der Plattform', Lg.plat]); break; }
          if (Lg.until) {
            const done = () => { const v = axisV(Lg.until); return (Lg.until.lt === undefined || v < Lg.until.lt) && (Lg.until.gt === undefined || v > Lg.until.gt); };
            let r = 0;
            for (; r < 3000 && !done() && !p.dead; r++) {
              const dx = m.pm.pos.x - p.pos.x, dz = m.pm.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              tick(d > 0.2 ? { ...this.stick(dx, dz, Math.min(0.5, d)), run: false } : {});
              if (p.mode === 'ground' && p.ground !== m.shape && p.ground?.mover !== m.mover) { log.push(['FEHLER: von der Plattform gefallen', Lg.plat]); break; }
            }
          }
          mech.plats = (mech.plats ?? 0) + 1;
          continue;
        }
        // ------------------------------------------------ Fackel (Index) mit einem Feuerball anzünden: hingehen, zur Fackel drehen, werfen
        if (Lg.torch !== undefined) {
          const F = L.named.get('fackeln'), t = F.torches[Lg.torch];
          if (Lg.from) goTo(Lg.from[0], Lg.from[1], 0.25, 900);
          let tries = 0;
          for (; tries < (Lg.tries ?? 5) && !t.lit && !p.dead; tries++) {
            for (let k = 0; k < 160; k++) {
              const dx = t.x - p.pos.x, dz = t.z - p.pos.z, d = Math.hypot(dx, dz);
              const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
              if (dot > 0.999 && p.hSpeed() < 0.2) break;
              tick(dot > 0.999 ? {} : { ...this.stick(dx, dz, 0.12), run: false });
            }
            tick({ action: true }); tick({});
            for (let k = 0; k < 150 && !t.lit; k++) tick({});
          }
          mech.torches = (mech.torches ?? 0) + (t.lit ? 1 : 0);
          log.push(['fackel', Lg.torch, t.lit, tries, t.hits, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.power]);
          if (!t.lit && !Lg.allowFail) log.push(['FEHLER: Fackel nicht angezündet', Lg.torch]);
          continue;
        }
        // ------------------------------------------------ Weitsprung: Anlauf Richtung Ziel, ducken, springen; in der Luft zum Ziel lenken
        if (Lg.long) {
          const [tx, tz] = Lg.long;
          let k = 0, longed = false;
          const ru = Lg.runup ?? 10;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (k > ru + 20 && p.mode === 'ground') break;
            if (p.state === 'longjump') longed = true;
            if (p.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            const crouch = k >= ru && k < ru + 3, jump = k >= ru + 2 && k < ru + 6;
            tick({ ...this.stick(dx, dz, 1), run: true, crouch, jump });
          }
          log.push(['weitsprung', `${Lg.long}`, longed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        if (holdJ) { for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({}); gate(Lg.win ?? Lg.y); }
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        const y0 = p.pos.y;
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const highEnough = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          const done = dist < within && highEnough && (Lg.y === undefined || p.mode === 'ground' || p.mode === 'swim') && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          if (holdJ && landed && p.mode === 'ground' && !highEnough && i > 20) { landed = false; airborne = false; j0 = i + 1; gate(Lg.win ?? Lg.y); }
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, Lg.vmax ?? VMAX);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          if (j0 === null && Lg.jumpAt && Lg.edgeJump && p.mode === 'ground' && dist > 0.6) {
            const ux = dx / dist, uz = dz / dist, h = c.world.raycastDown(p.pos.x + ux * 0.45, p.pos.y + 0.6, p.pos.z + uz * 0.45, 1.2);
            if (!h || h.y < p.pos.y - 0.4) j0 = i;
          }
          const jump = (holdJ && j0 !== null ? (i - j0 >= 0 && i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && Lg.swimJump !== false && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? RUN, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, +(L.scroll?.center?.y ?? 0).toFixed(1)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to, Lg.y, y0]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.hammers = hammerSeen.size;
      mech.lives = L.runtime.save?.lives;
      mech.wand = L.named.get('b1_wand')?.info?.().on ?? '';
      mech.ring = L.entities.find((e) => e.kind === 'sternring')?.got ?? 0;
      mech.waters = [...waters];
      mech.ziegel = L.named.get('b2_ziegel')?.broken ?? 0;
      mech.fackeln = L.named.get('fackeln')?.info?.() ?? null;
      mech.uhren = L.named.get('b4_uhren')?.info?.().got ?? 0;
      mech.fleck = L.named.get('b4_fleck')?.open ?? false;
      mech.ringLeft = L.entities.filter((e) => e.kind === 'sternmuenze' && e.alive && !e.removed).map((e) => [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1)]);
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, deathCause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, o.vuln ? 0 : 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt: Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
      const acc = new Map();
      const orig = r.renderBufferDirect;
      r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
        const t0 = r.info.render.triangles;
        orig.call(this, camera, scene, geometry, material, object, group);
        const key = `${scene ? '' : 'S:'}${label(object)}`;
        const a = acc.get(key) ?? { calls: 0, tris: 0 };
        a.calls++; a.tris += r.info.render.triangles - t0;
        acc.set(key, a);
      };
      const f0 = v.frame;
      const wait = () => {
        if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; }
        r.renderBufferDirect = orig;
        res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[1] - x[1] || y[2] - x[2]).slice(0, 40));
      };
      requestAnimationFrame(wait);
    }),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) if (e.alive !== false && !e.removed) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
  };
  window.__ba = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
    try {
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
    } catch {
      console.log(`Level ${id} startet nicht. Konsole:`);
      for (const x of errors) console.log('  ', x);
      return false;
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__ba[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}blume_a_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__ba.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ------------------------------------------------------------------ Remix-Daten und Gegenprobe Basis (in der Seite)
/** Remix-Kennzahlen des geladenen Levels und Rohdaten der Basis (Registry). */
function remixInfo(baseId) {
  const c = window.__course, L = c.level, d = L.data, CL = window.__courseLevels;
  const raw = CL.raw(d.id), base = CL.raw(baseId);
  const calls = window.__audio?.music?.__calls ?? [];
  const sum = (l) => JSON.stringify(l, (k, v) => (typeof v === 'function' ? `fn:${v.name}` : v));
  return {
    stub: CL.isRemix(raw) && raw.remix?.base === baseId && !raw.segments, remix: d.remix ? { base: d.remix.base, light: d.remix.light, variant: d.remix.variant, added: d.remix.added, changed: d.remix.changed, removed: d.remix.removed } : null,
    title: d.title, world: d.world, theme: d.theme, light: c.view.theme.light ?? null, music: d.music, variant: d.musicVariant ?? null, timeLimit: L.runtime.timeLimit,
    archetype: d.archetype, stamp: L.entities.filter((e) => e.kind === 'stamp').length, starsData: d.stars?.length ?? 0,
    // Sterne (Indizes): Stern-Entitäten und Sterne, die ein Pilzlingsturm trägt (er erzeugt seinen Stern selbst)
    starEntities: new Set([...L.entities.filter((e) => e.kind === 'star').map((e) => e.index), ...L.entities.filter((e) => e.kind === 'pilzlingsturm' && e.carry?.star !== undefined).map((e) => e.carry.star)]).size,
    call: calls.filter((x) => x[0] === d.music).slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
    baseHash: sum(base), baseTheme: base.theme, baseMusic: base.music, baseVariant: base.musicVariant ?? null, baseRemix: base.remix ?? null, baseStamp: !!base.stamp,
    baseStars: base.stars?.length ?? 0, baseTime: base.timeLimit, baseTitle: base.title,
  };
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id} (Remix von ${R.base})`);
  // Gegenprobe vorab: Rohdaten der Basis vor dem ersten Laden eines Remix (frische Seite mit dem Basislevel)
  let baseBefore = null;
  if (PARTS.has('load') || PARTS.has('rules')) {
    loaded = null;
    if (!(await load(R.base))) { check(`${R.base} lädt`, false); continue; }
    baseBefore = await sc((b) => {
      const CL = window.__courseLevels, L = window.__course.level;
      const sum = (l) => JSON.stringify(l, (k, v) => (typeof v === 'function' ? `fn:${v.name}` : v));
      const k = {}; for (const e of L.entities) k[e.kind] = (k[e.kind] ?? 0) + 1;
      return { hash: sum(CL.raw(b)), kinds: k, theme: L.data.theme, music: L.data.music, variant: L.data.musicVariant ?? null, time: L.runtime.timeLimit, title: L.data.title, stars: L.data.stars?.length ?? 0 };
    }, R.base);
  }
  loaded = null;
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const info = await sc(remixInfo, R.base);
    const kinds = await W('kinds');
    console.log(`  „${info.title}“, Welt ${info.world}, Thema ${info.theme} (Licht ${info.light}), Musik ${info.music} (Variante ${info.variant}; music.play ${JSON.stringify(info.call)}), Zeitlimit ${info.timeLimit} s, Sterne ${info.starEntities}, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: Remix-Platzhalter (remixOf, Basis ${R.base}) wird von der Registry aufgelöst`, info.stub && info.remix?.base === R.base);
    check(`${id}: „${R.meta.title}“, Welt 11, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}${R.meta.variant ? ` (Variante ${R.meta.variant})` : ' (ohne Variante)'}, Archetyp ${R.meta.archetype}, ${R.meta.stars} Sterne, kein Stempel`,
      info.title === R.meta.title && info.world === 11 && info.timeLimit === R.meta.time && info.theme === R.meta.theme && info.music === R.meta.music && info.variant === R.meta.variant
      && info.archetype === R.meta.archetype && info.starEntities === R.meta.stars && info.stamp === 0
      && (R.meta.variant ? info.call?.[1]?.variant === R.meta.variant && info.mVariant === R.meta.variant : !info.call?.[1]?.variant));
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    // Gegenprobe: Rohdaten der Basis unverändert, Basis selbst wie vorher
    check(`${id}: Gegenprobe – Rohdaten der Basis ${R.base} nach dem Remix unverändert (Thema ${info.baseTheme}, Musik ${info.baseMusic} ohne Variante, ${info.baseStars} Sterne, Stempel, ${info.baseTime} s, kein Remix-Feld)`,
      !!baseBefore && info.baseHash === baseBefore.hash && !info.baseRemix && info.baseVariant === null && info.baseStamp);
    // die Basis noch einmal laden: Gegnerzahlen und Daten wie vor dem Remix
    loaded = null;
    await load(R.base);
    const baseAfter = await sc(() => { const L = window.__course.level; const k = {}; for (const e of L.entities) k[e.kind] = (k[e.kind] ?? 0) + 1; return { kinds: k, theme: L.data.theme, music: L.data.music, variant: L.data.musicVariant ?? null, time: L.runtime.timeLimit, title: L.data.title }; });
    const same = Object.entries(R.baseEnemies ?? {}).every(([k, n]) => (baseAfter.kinds[k] ?? 0) === n) && baseAfter.theme === baseBefore.theme && baseAfter.title === baseBefore.title && baseAfter.time === baseBefore.time && baseAfter.variant === null;
    check(`${id}: Gegenprobe – Basis ${R.base} geladen wie vorher („${baseAfter.title}“, ${baseAfter.theme}, ${baseAfter.time} s, ${Object.entries(R.baseEnemies ?? {}).map(([k, n]) => `${k} ${baseAfter.kinds[k] ?? 0}/${n}`).join(', ')})`, same);
    loaded = null;
    await load(id);
  }

  // ------------------------------------------------ Remix-Regeln wirksam (je Level, mit Gegenprobe)
  for (const r of !PARTS.has('rules') ? [] : pick(R.rules ?? [])) {
    await load(id);
    const res = await sc(r.fn, r.arg ?? null);
    if (process.env.VERBOSE) console.log('     ', JSON.stringify(res));
    check(`${id}: Regel – ${r.name}${r.text ? ` (${r.text(res)})` : ''}`, !!r.ok(res));
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2, ...(R.place ?? {}) });
    const res = await W('drive', R.main, { ...(R.drive ?? {}) });
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Restzeit ${res.rt.time} s`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}${m.text ? ` (${m.text(res)})` : ''}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt.slice(0, 3), { settle: 6, ...(R.sweepScroll ? { scroll: pt[3] } : {}) });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.slice(0, 3).join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { ...(R.drive ?? {}), invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Geheimnisse und Mechanik
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { ...(R.drive ?? {}), invuln: t.invuln });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = PI / 2, scroll] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw, ...(scroll !== undefined ? { scroll } : {}) });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
