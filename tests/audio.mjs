// Audio-Test: Kontext wird bei Nutzergeste freigeschaltet, Themen wechseln, Energie-Ebene beim Reiten,
// Stummschaltung wird gespeichert, keine Fehler. Zusätzlich wird jedes Thema offline gerendert und
// messbar geprüft (Spitzenpegel, RMS, Frequenzbänder, Beat-Periodizität, Knoten je Sekunde);
// die ersten 8 s von world1 landen als WAV in tests/out/world1.wav.
//
// Kurs-Modus: alle Kurs-Themen (docs/KURS-ARCHITEKTUR.md, Abschnitt Audio) werden auf Eckdaten (Tempo,
// Takte, Loop), Konsistenz und Messwerte geprüft – ganzer Loop gerendert, RMS im Bereich der bestehenden
// Themen –, ihre ersten 8 s landen als tests/out/<thema>.wav. Alle Effekte (Vertragsnamen und Klassik)
// werden live ausgelöst (keine Fehler, Knotenzahl je Effekt begrenzt, unbekannte Namen stumm) und offline
// vermessen (Spitze, Dauer, Lautheit K-gewichtet im Vergleich zu den bestehenden Effekten);
// tests/out/sfx_demo.wav enthält alle Effekte nacheinander mit 0,6 s Pause (Reihenfolge im Log).
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';
import { THEMES } from '../src/audio/themes.js';

const PORT = 4184;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop, 'test');
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const audio = () => sc(() => { const a = window.__audio; return { ctx: a.engine.ctx ? a.engine.ctx.state : 'none', ready: a.engine.ready, theme: a.music.current, drums: a.music.drums, muted: a.engine.muted, pending: a.music.pending ?? null, energy: a.music.energyGain ? a.music.energyGain.gain.value : null }; });
const fmt = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : String(v));

/** Läuft im Browser: Thema offline rendern und vermessen. */
async function analyzeInPage({ name, seconds, energy, wantWav, beatMult = 1, wavSeconds = Infinity }) {
  const r = await window.__audio.music.renderTheme(name, seconds, { energy });
  const x = r.buffer.getChannelData(0), sr = r.sampleRate;
  let peak = 0, sum = 0, peakAt = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) { peak = a; peakAt = i / sr; } sum += x[i] * x[i]; }
  const rms = Math.sqrt(sum / x.length);

  // Spektrum: FFT (8192, Hann), Leistung über alle Rahmen gemittelt
  const N = 8192;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const fft = (re, im) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < half; k++) {
          const a = i + k, b = a + half;
          const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  };
  const power = new Float64Array(N / 2), re = new Float64Array(N), im = new Float64Array(N);
  for (let off = 0; off + N <= x.length; off += N) {
    for (let i = 0; i < N; i++) { re[i] = x[off + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k];
  }
  const binHz = sr / N;
  const bandPower = (lo, hi) => { let s = 0; for (let k = Math.ceil(lo / binHz); k < Math.min(N / 2, Math.floor(hi / binHz)); k++) s += power[k]; return s; };
  const total = bandPower(20, sr / 2);
  const bands = {};
  for (const [k, lo, hi] of [['bass', 40, 150], ['mid', 200, 2500], ['high', 6000, sr / 2]]) {
    const share = bandPower(lo, hi) / total;
    bands[k] = { share, dB: 20 * Math.log10(rms * Math.sqrt(share) + 1e-9) }; // Pegel des Bandes in dBFS
  }

  // Beat-Periodizität: Hüllkurve (RMS je 5 ms, Mittelwert abgezogen) → normierte Autokorrelation
  const w = Math.round(sr * 0.005), env = [];
  for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = 0; j < w; j++) s += x[i + j] * x[i + j]; env.push(Math.sqrt(s / w)); }
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  for (let i = 0; i < env.length; i++) env[i] -= mean;
  let e0 = 0; for (const v of env) e0 += v * v;
  const ac = (lag) => { let s = 0; for (let i = 0; i + lag < env.length; i++) s += env[i] * env[i + lag]; return s / e0; };
  // Gesucht wird das Maximum rund um den Kick-Abstand (beatMult Schläge): zwischen 0,6- und 1,4-facher Periode,
  // damit weder das Achtel darunter noch die doppelte Periode darüber gezählt wird
  const rate = sr / w;
  const beat = 60 / r.bpm * beatMult;
  let bestLag = 0, best = -Infinity;
  for (let lag = Math.round(0.6 * beat * rate); lag <= Math.round(1.4 * beat * rate); lag++) { const v = ac(lag); if (v > best) { best = v; bestLag = lag; } }
  const acBeat = ac(Math.round(beat * rate)), acEighth = ac(Math.round(beat / 2 * rate)), acOff = ac(Math.round(beat * 0.75 * rate));

  let wav = null;
  if (wantWav) {
    const pcm = new Int16Array(Math.min(x.length, Math.round(wavSeconds * sr)));
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767)));
    const bytes = new Uint8Array(pcm.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    wav = btoa(s);
  }
  return { name, seconds, bpm: r.bpm, bars: r.bars, sampleRate: sr, peak, peakAt, rms, bands, beatLag: bestLag / rate, beatExpected: beat, acBest: best, acBeat, acEighth, acOff, nodesPerSecond: r.nodesPerSecond, oscPerSecond: r.oscillatorsPerSecond, inGameLevel: r.inGameLevel, wav };
}

/**
 * Läuft im Browser: alle Effekte offline rendern (Effekt-Bus 0,5 wie im Spiel) und vermessen –
 * Spitze, hörbare Dauer, Lautheit (K-Gewichtung nach BS.1770 genähert: Hochpass 38 Hz + Höhenregal
 * +4 dB ab 1,7 kHz; Maximum über 100-ms-Fenster, in LUFS-ähnlicher Skala), Knotenzahl.
 * Baut daraus die Demo (Effekt, 0,6 s Pause, nächster Effekt …) als 16-Bit-PCM (Base64).
 */
async function sfxInPage({ order, gap }) {
  const fx = window.__audio.engine.effects;
  const rendered = await fx.render(order, { seconds: 1.8 });
  const sr = rendered[0].sampleRate;
  const biquad = (x, [b0, b1, b2, a0, a1, a2]) => {
    const y = new Float64Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  };
  const shelf = (f0, dB) => {
    const A = Math.pow(10, dB / 40), w = 2 * Math.PI * f0 / sr, c = Math.cos(w), al = Math.sin(w) / 2 * Math.SQRT2, s = 2 * Math.sqrt(A) * al;
    return [A * ((A + 1) + (A - 1) * c + s), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - s), (A + 1) - (A - 1) * c + s, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - s];
  };
  const hp = (f0, q) => {
    const w = 2 * Math.PI * f0 / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    return [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al];
  };
  const stats = [], parts = [];
  for (const r of rendered) {
    const x = r.samples;
    let peak = 0, last = 0;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a > 0.001) last = i; }
    const k = biquad(biquad(x, shelf(1681, 4)), hp(38, 0.5));
    const win = Math.round(0.1 * sr), hop = Math.round(0.01 * sr);
    let best = 0;
    for (let i = 0; i + win <= k.length; i += hop) { let s = 0; for (let j = i; j < i + win; j++) s += k[j] * k[j]; best = Math.max(best, s / win); }
    const duration = last / sr;
    stats.push({ name: r.name, peak, duration, loudness: -0.691 + 10 * Math.log10(best + 1e-12), nodes: r.nodes, oscillators: r.oscillators });
    parts.push(x.subarray(0, Math.min(x.length, last + Math.round(0.03 * sr))));
  }
  // Demo zusammensetzen: Effekt, dann `gap` Sekunden Stille
  const gapN = Math.round(gap * sr);
  const total = parts.reduce((n, p) => n + p.length + gapN, gapN);
  const pcm = new Int16Array(total);
  const starts = [];
  let pos = gapN;
  for (const p of parts) {
    starts.push(pos / sr);
    for (let i = 0; i < p.length; i++) pcm[pos + i] = Math.max(-32768, Math.min(32767, Math.round(p[i] * 32767)));
    pos += p.length + gapN;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { sampleRate: sr, stats, starts, seconds: total / sr, wav: btoa(s) };
}

function writeWav(path, pcmBase64, sr) {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}

// ---- Live: Freischaltung, Themen, Energie-Ebene, Stummschaltung ----
let a = await audio();
console.log('vor Geste:', JSON.stringify(a));
check('Vor der ersten Geste kein AudioContext', a.ctx === 'none' && a.pending === 'world1');

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
a = await audio();
console.log('nach Geste:', JSON.stringify(a));
check('Geste schaltet Audio frei', a.ctx === 'running' && a.ready);
check('Welt-Thema läuft', a.theme === 'world1');
check('Ohne Pflaume keine Energie-Ebene', a.drums === false && a.energy !== null && a.energy < 0.05);

const graph = await sc(() => { const e = window.__audio.engine, m = window.__audio.music; const t = m.theme.tracks; return { comp: e.musicComp && e.musicComp.constructor.name, level: e.musicBus.gain.value, sfx: e.sfxBus.gain.value, tracks: Object.keys(t), chord: t.stabs.events[0]?.notes.length, drumKinds: [...new Set(t.drums.events.map((d) => d.kind))].sort().join(''), bars: m.theme.bars, bpm: m.theme.bpm, validation: m.validateThemes() }; });
console.log('Musik-Kette:', JSON.stringify(graph));
check('Musik läuft über Kompressor/Limiter, Pegel 0,22–0,3', graph.comp === 'DynamicsCompressorNode' && graph.level >= 0.22 && graph.level <= 0.3 && graph.sfx === 0.5);
check('Spuren lead/stabs/piano/pad/bass/energy/drums vorhanden', ['lead', 'stabs', 'piano', 'pad', 'bass', 'energy', 'drums'].every((k) => graph.tracks.includes(k)));
check('Akkord-Parser: Stab mit 3 Tönen', graph.chord === 3);
check('Drums nutzen Kick, Clap, Snare, Hat zu/offen, Crash', graph.drumKinds === 'chkors');
check('world1: 140 BPM, 16 Takte', graph.bpm === 140 && graph.bars === 16);
check('Alle Themen konsistent (gleich lange Spuren, 16 Sechzehntel je Takt)', graph.validation.length === 0);
if (graph.validation.length) console.log('  ', graph.validation.join('\n   '));

// Effekte auslösen: Sprung, Gleiten
await page.keyboard.down('Space'); await page.waitForTimeout(700); await page.keyboard.up('Space');

// Aufsteigen → Energie-Ebene an
await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; s.hero.body.reset(m.x, m.y - 24); });
await page.waitForTimeout(600);
a = await audio();
console.log('auf Pflaume:', JSON.stringify(a));
check('Auf Pflaume kommt die Energie-Ebene dazu', a.drums === true && a.energy > 0.5);

// CPU-Last: erzeugte Knoten je Sekunde im Live-Kontext (mit Energie-Ebene, inkl. Effekten)
const s0 = await sc(() => ({ ...window.__audio.engine.stats, t: window.__audio.engine.now }));
await page.waitForTimeout(2500);
const s1 = await sc(() => ({ ...window.__audio.engine.stats, t: window.__audio.engine.now }));
const liveRate = (s1.nodes - s0.nodes) / (s1.t - s0.t), liveOsc = (s1.oscillators - s0.oscillators) / (s1.t - s0.t);
console.log(`Live: ${fmt(liveRate, 1)} Knoten/s, ${fmt(liveOsc, 1)} Oszillatoren/s über ${fmt(s1.t - s0.t, 2)} s`);
check('Live unter 120 Knoten/s', liveRate > 20 && liveRate < 120);

// Stummschalten (M) und speichern
await page.keyboard.press('m');
await page.waitForTimeout(100);
a = await audio();
check('M schaltet stumm', a.muted === true && (await sc(() => localStorage.getItem('lotti-greta-muted'))) === '1');
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

// Levelende-Thema: spielt und endet von selbst (kein Loop)
await sc(() => window.__audio.music.play('complete'));
await page.waitForTimeout(200);
check('Levelende-Thema läuft', (await audio()).theme === 'complete');
await page.waitForTimeout(4000);
check('Levelende-Thema endet von selbst', (await audio()).theme === null);
await sc(() => window.__audio.music.play('map'));

// ---- Kurs-Themen: Eckdaten, Validierung, live abspielen ----
// Vertragsnamen (docs/KURS-ARCHITEKTUR.md, Abschnitt Audio) plus Ziel, Funkelstern, Spielende.
const CONTRACT_THEMES = ['course_grass', 'course_cave', 'course_circus', 'course_river', 'course_boss', 'course_arena', 'course_diorama', 'course_map'];
const COURSE_THEMES = {
  course_grass: { bpm: 140, bars: [16, 16], loop: true },
  course_cave: { bpm: 132, bars: [16, 16], loop: true, fx: 'delay' },
  course_circus: { bpm: 138, bars: [16, 16], loop: true, organ: true },
  course_river: { bpm: 142, bars: [16, 16], loop: true, energy: true },
  course_boss: { bpm: 145, bars: [16, 16], loop: true, riser: true },
  course_arena: { bpm: 140, bars: [8, 8], loop: true },
  course_diorama: { bpm: 112, bars: [8, 16], loop: true, beatMult: 2 }, // Kick auf 1 und 3
  course_map: { bpm: 124, bars: [8, 16], loop: true, beatMult: 2 },
  course_clear: { bars: [2, 3], loop: false, noBeat: true },
  course_star: { bpm: 160, bars: [4, 4], loop: true },
  course_gameover: { bars: [1, 3], loop: false, noBeat: true },
};
const infos = await sc((names) => names.map((n) => window.__audio.music.themeInfo(n)), Object.keys(COURSE_THEMES));
console.log('\nKurs-Themen:');
for (const i of infos) if (i) console.log(`   ${i.name.padEnd(16)} ${i.bpm} BPM, ${i.bars} Takte, ${fmt(i.seconds, 2)} s, Loop ${i.loop}, Spuren ${i.tracks.join('/')}, Drums ${i.drumKinds}${i.fx.length ? `, Effekte ${i.fx.join('+')}` : ''}${i.energy ? ', Energie-Ebene' : ''}`);
check('Alle Kurs-Themen aus dem Vertrag vorhanden', CONTRACT_THEMES.every((n) => infos.some((i) => i && i.name === n)));
for (const [name, spec] of Object.entries(COURSE_THEMES)) {
  const i = infos.find((x) => x && x.name === name);
  check(`${name}: vorhanden, ${spec.bpm ?? '?'} BPM, ${spec.bars.join('–')} Takte, ${spec.loop ? 'Loop' : 'kein Loop'}`, !!i
    && (spec.bpm === undefined || i.bpm === spec.bpm) && Number.isInteger(i.bars) && i.bars >= spec.bars[0] && i.bars <= spec.bars[1] && i.loop === spec.loop);
}
check('course_cave: Hall/Echo-Bus (fx.delay)', infos.find((i) => i?.name === 'course_cave')?.fx.includes('delay'));
check('course_circus: Rechteck-Orgel-Spur', infos.find((i) => i?.name === 'course_circus')?.tracks.includes('organ'));
check('course_river: schnelle Arpeggien und Energie-Ebene', infos.find((i) => i?.name === 'course_river')?.tracks.includes('arp') && infos.find((i) => i?.name === 'course_river')?.energy);
check('course_boss: Hoover-Riser und Stabs', ['riser', 'stabs'].every((k) => infos.find((i) => i?.name === 'course_boss')?.tracks.includes(k)));
check('course_clear: höchstens 3 Takte, kein Loop', infos.find((i) => i?.name === 'course_clear')?.bars <= 3);

// Der Validator selbst: krumme Takte, ungleich lange Spuren, falsche Drum-Länge und Tippfehler werden gemeldet
const bad = await sc(() => window.__audio.music.validateThemes({
  kaputt: { bpm: 120, lead: ['C4:15', 'C4:16'], bass: ['C2:16'], drums: ['k...k...k...k..'], fx: { delay: { send: { leed: 1 } } } },
}));
console.log('Validator (absichtlich kaputtes Thema):\n   ' + bad.join('\n   '));
check('Themen-Validierung meldet krumme Takte, ungleiche Spuren, Drum-Länge und unbekannte Spur', bad.length >= 4
  && bad.some((m) => m.includes('15 statt 16')) && bad.some((m) => m.includes('unterschiedlich lang')) && bad.some((m) => m.includes('leed')));

// Jedes Kurs-Thema live kurz anspielen (Wechsel ohne Fehler, Effekt-Busse werden angelegt)
const liveThemes = await sc(async (names) => {
  const m = window.__audio.music, out = [];
  for (const n of names) {
    m.play(n);
    await new Promise((r) => setTimeout(r, 250));
    out.push({ name: n, current: m.current, fxNodes: m.fx ? m.fx.nodes.length : 0 });
  }
  m.play('gibtEsNicht');
  const unknown = m.current;
  m.play('toString');
  return { out, unknown, unknown2: m.current };
}, Object.keys(COURSE_THEMES));
check('Alle Kurs-Themen spielen live', liveThemes.out.every((x) => x.current === x.name));
check('Höhle legt Hall/Echo-Bus an, Wiese nicht', liveThemes.out.find((x) => x.name === 'course_cave').fxNodes > 0 && liveThemes.out.find((x) => x.name === 'course_grass').fxNodes === 0);
check('Unbekanntes Thema: Stille statt Fehler', liveThemes.unknown === null && liveThemes.unknown2 === null);
for (const name of ['course_clear', 'course_gameover']) {
  const secs = infos.find((i) => i?.name === name).seconds;
  await sc((n) => window.__audio.music.play(n), name);
  await page.waitForTimeout(200);
  const running = (await audio()).theme === name;
  await page.waitForTimeout(secs * 1000 + 600);
  check(`${name} spielt und endet von selbst (${fmt(secs, 2)} s)`, running && (await audio()).theme === null);
}
await sc(() => window.__audio.music.play('map'));

// ---- Effekte live: alle Namen auslösen, Knoten je Effekt zählen, unbekannte Namen stumm ----
const CONTRACT_SFX = ['jump', 'jump2', 'jump3', 'backflip', 'longjump', 'walljump', 'groundpound', 'slide', 'land', 'coin', 'star', 'stamp',
  'powerup', 'powerdown', 'oneup', 'blockhit', 'brickbreak', 'pipe', 'checkpoint', 'goalpole', 'timewarn', 'claw', 'fireball', 'stomp',
  'hurt', 'die', 'switch', 'bounce'];
const MAX_SFX_NODES = 40;
const liveSfx = await sc(async () => {
  const e = window.__audio.engine, fx = e.effects, nodes = {}, unknown = {};
  for (const n of fx.names) {
    const a = e.stats.nodes; // synchron gemessen: der Sequencer läuft nur in Timer-Rückrufen
    fx.play(n);
    nodes[n] = e.stats.nodes - a;
    await new Promise((r) => setTimeout(r, 40));
  }
  for (const n of ['gibtEsNicht', 'toString', '__proto__', 'constructor', 'hasOwnProperty', '', undefined, null, 42]) {
    const a = e.stats.nodes;
    try { fx.play(n); unknown[String(n)] = e.stats.nodes - a; } catch (err) { unknown[String(n)] = `Fehler: ${err.message}`; }
  }
  return { names: fx.names, course: fx.course, nodes, unknown };
});
check('Effekt-Liste enthält alle Vertragsnamen', CONTRACT_SFX.every((n) => liveSfx.names.includes(n)) && CONTRACT_SFX.every((n) => liveSfx.course.includes(n)) && liveSfx.course.length === CONTRACT_SFX.length);
const heavy = Object.entries(liveSfx.nodes).filter(([, n]) => !(n > 0 && n <= MAX_SFX_NODES));
console.log(`Effekte live: ${Object.keys(liveSfx.nodes).length} ausgelöst, Knoten je Effekt ${Math.min(...Object.values(liveSfx.nodes))}–${Math.max(...Object.values(liveSfx.nodes))}`);
check(`Alle Effekte erzeugen Knoten, höchstens ${MAX_SFX_NODES} je Effekt${heavy.length ? ` (auffällig: ${heavy.map(([k, n]) => `${k}=${n}`).join(', ')})` : ''}`, heavy.length === 0);
console.log('Unbekannte Namen:', JSON.stringify(liveSfx.unknown));
check('Unbekannte Effekt-Namen bleiben stumm (kein Fehler, keine Knoten)', Object.values(liveSfx.unknown).every((v) => v === 0));
await page.waitForTimeout(1500);
check('Effekte live ohne Konsolenfehler', errors.length === 0);

// ---- Offline: Themen rendern und vermessen ----
const results = {};
for (const job of [
  { name: 'world1', seconds: 8, energy: false, wantWav: true },
  { name: 'world1', seconds: 8, energy: true, label: 'world1+energy' },
  { name: 'map', seconds: 8, energy: false, beatMult: 2 }, // Kick auf 1 und 3 → Kick-Abstand = 2 Schläge
  { name: 'complete', seconds: 3.5, energy: false },
]) {
  const r = await sc(analyzeInPage, job);
  const label = job.label ?? job.name;
  results[label] = r;
  const b = r.bands;
  console.log(`\n[${label}] ${r.bpm} BPM, ${r.bars} Takte, ${r.seconds} s offline (Mix hinter Kompressor, Pegel 1; im Spiel ×${r.inGameLevel})`);
  console.log(`   Spitze ${fmt(r.peak)}  RMS ${fmt(r.rms)} (im Spiel ${fmt(r.rms * r.inGameLevel)})  Knoten/s ${fmt(r.nodesPerSecond, 1)}  Oszillatoren/s ${fmt(r.oscPerSecond, 1)}`);
  console.log(`   Bänder: Bass 40–150 Hz ${fmt(b.bass.dB, 1)} dBFS (${fmt(b.bass.share * 100, 1)} %), Mitten 200–2500 Hz ${fmt(b.mid.dB, 1)} dBFS (${fmt(b.mid.share * 100, 1)} %), Höhen >6 kHz ${fmt(b.high.dB, 1)} dBFS (${fmt(b.high.share * 100, 1)} %)`);
  console.log(`   Beat: Autokorrelations-Maximum bei ${fmt(r.beatLag)} s (erwartet ${fmt(r.beatExpected)} s = ${job.beatMult ?? 1}·60/${r.bpm}); AK(Kick-Abstand) ${fmt(r.acBeat, 2)}, AK(halber) ${fmt(r.acEighth, 2)}, AK(3/4) ${fmt(r.acOff, 2)}`);
  if (r.wav) { writeWav(`${OUT}${job.name}.wav`, r.wav, r.sampleRate); console.log(`   WAV: ${OUT}${job.name}.wav`); }
}
for (const [label, r] of Object.entries(results)) {
  const b = r.bands;
  check(`${label}: kein Clipping (Spitze ${fmt(r.peak)} < 0,98)`, r.peak < 0.98);
  check(`${label}: RMS im Bereich 0,08–0,25 (${fmt(r.rms)})`, r.rms >= 0.08 && r.rms <= 0.25);
  check(`${label}: Bass, Mitten und Höhen deutlich vorhanden`, b.bass.dB > -30 && b.mid.dB > -30 && b.high.dB > -42);
  check(`${label}: unter 120 Knoten/s (${fmt(r.nodesPerSecond, 1)})`, r.nodesPerSecond < 120);
  if (label !== 'complete') {
    check(`${label}: Beat-Periodizität am Kick-Abstand ${fmt(r.beatExpected)} s (${fmt(r.beatLag)} s)`, Math.abs(r.beatLag - r.beatExpected) <= r.beatExpected * 0.03 && r.acBeat > r.acOff);
  }
}

// ---- Offline: Kurs-Themen (ganzer Loop) rendern und vermessen, erste 8 s als WAV ----
const refRms = ['world1', 'map', 'complete'].map((n) => results[n].rms);
const rmsLo = Math.min(...refRms) / Math.SQRT2, rmsHi = Math.max(...refRms) * Math.SQRT2; // bestehende Themen ±3 dB
console.log(`\nKurs-Themen offline (RMS-Bereich = bestehende Themen ±3 dB: ${fmt(rmsLo)}–${fmt(rmsHi)})`);
const courseResults = {};
for (const [name, spec] of Object.entries(COURSE_THEMES)) {
  const info = infos.find((i) => i?.name === name);
  const seconds = info.loop ? Math.max(8, info.seconds) : info.seconds + 0.6;
  const jobs = [{ name, seconds, energy: false, wantWav: true, wavSeconds: 8, beatMult: spec.beatMult ?? 1 }];
  if (spec.energy) jobs.push({ name, seconds, energy: true, wantWav: false, beatMult: spec.beatMult ?? 1, label: `${name}+energy` });
  for (const job of jobs) {
    const r = await sc(analyzeInPage, job);
    const label = job.label ?? name;
    courseResults[label] = { ...r, spec };
    const b = r.bands;
    console.log(`\n[${label}] ${r.bpm} BPM, ${r.bars} Takte, ${fmt(r.seconds, 2)} s offline (${info.loop ? 'ganzer Loop' : 'ganzes Stück'})`);
    console.log(`   Spitze ${fmt(r.peak)} bei ${fmt(r.peakAt, 2)} s  RMS ${fmt(r.rms)} (im Spiel ${fmt(r.rms * r.inGameLevel)})  Knoten/s ${fmt(r.nodesPerSecond, 1)}  Oszillatoren/s ${fmt(r.oscPerSecond, 1)}`);
    console.log(`   Bänder: Bass ${fmt(b.bass.dB, 1)} dBFS (${fmt(b.bass.share * 100, 1)} %), Mitten ${fmt(b.mid.dB, 1)} dBFS (${fmt(b.mid.share * 100, 1)} %), Höhen ${fmt(b.high.dB, 1)} dBFS (${fmt(b.high.share * 100, 2)} %)`);
    if (!spec.noBeat) console.log(`   Beat: AK-Maximum bei ${fmt(r.beatLag)} s (erwartet ${fmt(r.beatExpected)} s = ${job.beatMult}·60/${r.bpm}); AK(Kick-Abstand) ${fmt(r.acBeat, 2)}, AK(halber) ${fmt(r.acEighth, 2)}, AK(3/4) ${fmt(r.acOff, 2)}`);
    if (r.wav) { writeWav(`${OUT}${name}.wav`, r.wav, r.sampleRate); console.log(`   WAV: ${OUT}${name}.wav`); }
  }
}
for (const [label, r] of Object.entries(courseResults)) {
  const b = r.bands;
  check(`${label}: kein Clipping (Spitze ${fmt(r.peak)} < 0,98)`, r.peak < 0.98);
  check(`${label}: RMS ${fmt(r.rms)} im Bereich der bestehenden Themen`, r.rms >= rmsLo && r.rms <= rmsHi);
  check(`${label}: Bass, Mitten und Höhen vorhanden`, b.bass.dB > -30 && b.mid.dB > -30 && b.high.dB > -42);
  check(`${label}: unter 120 Knoten/s (${fmt(r.nodesPerSecond, 1)})`, r.nodesPerSecond < 120);
  if (!r.spec.noBeat) {
    check(`${label}: Beat-Periodizität am Kick-Abstand ${fmt(r.beatExpected)} s (${fmt(r.beatLag)} s)`, Math.abs(r.beatLag - r.beatExpected) <= r.beatExpected * 0.03 && r.acBeat > r.acOff);
  }
}

// ---- Hall/Echo-Bus wirkt: ein einzelner Tropfen mit den Höhlen-Einstellungen, mit und ohne fx ----
// Trocken ist der Pluck nach ~0,45 s verklungen; mit Echo-Bus muss im Folgetakt deutlich Energie bleiben.
const cave = THEMES.course_cave;
const echoProbe = await sc(async ({ voice, fx }) => {
  const m = window.__audio.music;
  const tail = async (withFx) => {
    const th = { bpm: 132, voice, fx: withFx ? fx : undefined, arp: ['B5:1 -:15', '-:16'] };
    const r = await m.renderTheme('echo-probe', 4, { theme: th });
    const x = r.buffer.getChannelData(0), sr = r.sampleRate;
    const bar = 60 / 132 * 4;
    let s = 0, n = 0;
    for (let i = Math.floor((0.02 + 0.6) * sr); i < Math.floor((0.02 + 2 * bar) * sr); i++) { s += x[i] * x[i]; n++; }
    return Math.sqrt(s / n);
  };
  return { dry: await tail(false), wet: await tail(true) };
}, { voice: cave.voice, fx: cave.fx });
console.log(`\nEcho-Bus (Höhle): Nachklang-RMS ab 0,6 s trocken ${echoProbe.dry.toExponential(2)}, mit fx ${echoProbe.wet.toExponential(2)}`);
check('Höhle: Hall/Echo-Bus erzeugt hörbaren Nachklang (mind. 20 dB über trocken)', echoProbe.wet > 0.002 && echoProbe.wet > echoProbe.dry * 10);

// ---- Offline: Effekte vermessen, Demo schreiben ----
const order = [...CONTRACT_SFX, ...liveSfx.names.filter((n) => !CONTRACT_SFX.includes(n))];
const demo = await sc(sfxInPage, { order, gap: 0.6 });
writeWav(`${OUT}sfx_demo.wav`, demo.wav, demo.sampleRate);
// Bezug: bestehende, unveränderte Klassik-Effekte für Spielereignisse (ohne die bewusst leisen Umgebungs- und
// Menü-Geräusche glideOpen, dive, vanish, hover, step, select, pause)
const REF_SFX = ['jump', 'land', 'hardLand', 'stomp', 'hurt', 'fireball', 'die', 'bigCoin', 'berry', 'key', 'gate', 'slam', 'mount', 'panic', 'swoop'];
const byName = Object.fromEntries(demo.stats.map((s) => [s.name, s]));
const refL = REF_SFX.map((n) => byName[n].loudness).sort((p, q) => p - q);
const refMedian = refL[Math.floor(refL.length / 2)];
const loLim = refL[0] - 1, hiLim = refL[refL.length - 1] + 1;
console.log(`\nEffekte offline (Effekt-Bus 0,5): Lautheit der bestehenden Effekte ${fmt(refL[0], 1)} … ${fmt(refL[refL.length - 1], 1)} LUFS (Median ${fmt(refMedian, 1)}); erlaubt ${fmt(loLim, 1)} … ${fmt(hiLim, 1)}`);
console.log(`Demo: ${OUT}sfx_demo.wav (${fmt(demo.seconds, 1)} s, je Effekt + 0,6 s Pause), Reihenfolge:`);
order.forEach((n, i) => {
  const s = byName[n];
  console.log(`   ${String(i + 1).padStart(2)}. ${fmt(demo.starts[i], 2).padStart(6)} s  ${n.padEnd(12)} Dauer ${fmt(s.duration, 2)} s  Spitze ${fmt(s.peak, 2)}  Lautheit ${fmt(s.loudness, 1)} LUFS  Knoten ${s.nodes}${CONTRACT_SFX.includes(n) ? '' : '  (Klassik)'}`);
});
const courseL = CONTRACT_SFX.map((n) => byName[n].loudness).sort((p, q) => p - q);
const courseMedian = courseL[Math.floor(courseL.length / 2)];
check(`Kurs-Effekte gleich laut wie die bestehenden (Median ${fmt(courseMedian, 1)} vs. ${fmt(refMedian, 1)} LUFS, ±2 dB)`, Math.abs(courseMedian - refMedian) <= 2);
for (const n of CONTRACT_SFX) {
  const s = byName[n];
  check(`sfx ${n}: Lautheit ${fmt(s.loudness, 1)} LUFS im Bereich, Spitze ${fmt(s.peak, 2)} < 0,9, Dauer ${fmt(s.duration, 2)} s, ${s.nodes} Knoten`,
    s.loudness >= loLim && s.loudness <= hiLim && s.peak < 0.9 && s.duration > 0.04 && s.duration <= 1.6 && s.nodes <= MAX_SFX_NODES);
}

// Sequencer läuft weiter ohne Fehler
await page.waitForTimeout(1000);
check('Keine Audio-Fehler in der Konsole', errors.length === 0);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
