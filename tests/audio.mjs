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
//
// Welt 2–4: alle neuen Themen (Wüste … Lava-Burg, drei Karten) mit denselben Messungen und WAV-Hörproben,
// Kanon-Eigenschaft der Spiegelfrucht und Piep-Takt von course_beep an den Themen-Daten geprüft; alle neuen
// Effekte live und offline, Hörprobe tests/out/sfx_demo_w2.wav. Taktuhr (music.beat()/onBeat()): vor der
// Freischaltung über die Ersatzuhr (Tempo, Abstand der Rückrufe, Abmelden), stetig beim Freischalten (Musik
// steigt im Takt ein), mit Ton (Tempo, Rückrufe im Takt der hörbaren Musik, Lage zum Sequencer), stumm,
// bei angehaltenem Kontext (Ersatzuhr übernimmt, danach Wiedereinstieg), Themenwechsel, Stopp und
// deterministisch über den Testhaken (setManualClock/advanceClock).
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';
import { THEMES } from '../src/audio/themes.js';
import { midi } from '../src/audio/Music.js';

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

/**
 * onBeat-Serie auswerten: lückenlose Zählzeiten, Felder, Median der Einzelabstände (robust gegen einzelne
 * Hänger des Hauptthreads unter Last), größte Abweichung, Verzug. `gridErr`: Rückrufzeit minus gemeldetem
 * Verzug muss exakt im Raster der Zählzeiten liegen (jeder Rückruf meldet seine Zählzeit richtig, auch wenn er
 * verspätet kommt).
 */
function beatSeries(hits, bpm) {
  const spb = 60 / bpm;
  const consecutive = hits.length > 0 && hits.every((h, i) => i === 0 || h.beat === hits[i - 1].beat + 1);
  const fields = hits.every((h) => h.bar === Math.floor(h.beat / 4) && h.inBar === h.beat % 4 && h.bpm === bpm);
  const gaps = hits.slice(1).map((h, i) => (h.t - hits[i].t) / 1000).sort((p, q) => p - q);
  const interval = gaps.length ? (gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2) : NaN;
  const jitter = gaps.reduce((m, g) => Math.max(m, Math.abs(g - spb)), 0);
  const at = (h) => h.t / 1000 - h.late; // Zeitpunkt der Zählzeit laut Rückruf
  const gridErr = hits.reduce((m, h) => Math.max(m, Math.abs(at(h) - at(hits[0]) - (h.beat - hits[0].beat) * spb)), 0);
  const lates = hits.map((h) => h.late).sort((p, q) => p - q);
  return { n: hits.length, consecutive, fields, interval, intervalErr: Math.abs(interval - spb) / spb, jitter, gridErr, lateMedian: lates[Math.floor(lates.length / 2)] ?? NaN, lateMax: lates[lates.length - 1] ?? NaN };
}
const beatOk = (b) => b.bar === Math.floor(b.beat / 4) && Math.abs(b.phase - (b.beat - Math.floor(b.beat))) < 1e-9 && b.inBar === Math.floor(b.beat) % 4;

// ---- Live: Freischaltung, Themen, Energie-Ebene, Stummschaltung ----
let a = await audio();
console.log('vor Geste:', JSON.stringify(a));
check('Vor der ersten Geste kein AudioContext', a.ctx === 'none' && a.pending === 'world1');

// Taktuhr vor der Freischaltung: Ersatzuhr über performance.now() mit dem Tempo des angeforderten Themas.
// Die Spielszene steht währenddessen (der Ablauf danach – Pflaume, Gegner – bleibt wie ohne diese Messung).
const pre = await sc(async () => {
  const m = window.__audio.music;
  window.__game.scene.pause('Play');
  const b0 = m.beat(), t0 = performance.now();
  const hits = [];
  const off = m.onBeat((ev) => hits.push({ ...ev, t: performance.now() }));
  await new Promise((r) => setTimeout(r, 4000));
  const b1 = m.beat(), t1 = performance.now();
  off();
  const n = hits.length;
  await new Promise((r) => setTimeout(r, 600));
  window.__game.scene.resume('Play');
  return { b0, b1, dt: (t1 - t0) / 1000, hits, extra: hits.length - n, ctx: !!window.__audio.engine.ctx };
});
const ps = beatSeries(pre.hits, 140);
console.log(`Taktuhr ohne Freischaltung: ${JSON.stringify(pre.b0)} → Zählzeit ${fmt(pre.b1.beat)} nach ${fmt(pre.dt)} s`);
console.log(`   onBeat ${ps.n}× (Zählzeiten ${pre.hits.map((h) => h.beat).join(',')}), Abstand (Median) ${fmt(ps.interval)} s, größte Abweichung ${fmt(ps.jitter * 1000, 1)} ms, Raster ±${fmt(ps.gridErr * 1000, 2)} ms, Verzug Median ${fmt(ps.lateMedian * 1000, 1)} ms, max ${fmt(ps.lateMax * 1000, 1)} ms`);
check('Taktuhr ohne Freischaltung: Ersatzuhr läuft mit dem angeforderten Thema (world1, 140 BPM, playing, Quelle ersatz)', !pre.ctx && pre.b0.playing && pre.b0.source === 'ersatz' && pre.b0.bpm === 140 && pre.b0.theme === 'world1');
check(`Taktuhr ohne Freischaltung: beat() steigt mit dem Tempo (${fmt((pre.b1.beat - pre.b0.beat) / pre.dt)} statt ${fmt(140 / 60)} Zählzeiten/s)`, Math.abs((pre.b1.beat - pre.b0.beat) / pre.dt - 140 / 60) < 140 / 60 * 0.03);
check('Taktuhr: bar, phase und inBar passen zur Zählzeit', beatOk(pre.b0) && beatOk(pre.b1));
check(`onBeat über die Ersatzuhr: ${ps.n} lückenlose Zählzeiten im Abstand ${fmt(ps.interval)} s (erwartet ${fmt(60 / 140)} s ±3 %), jede im Raster (±${fmt(ps.gridErr * 1000, 2)} ms)`, ps.n >= 7 && ps.consecutive && ps.fields && ps.intervalErr < 0.03 && ps.gridErr < 0.003);
check(`onBeat über die Ersatzuhr pünktlich (Verzug Median ${fmt(ps.lateMedian * 1000, 1)} ms < 25 ms)`, ps.lateMedian < 0.025);
check('onBeat: Abmelden beendet die Rückrufe', pre.extra === 0);

const beforeUnlock = await sc(() => ({ b: window.__audio.music.beat(), t: performance.now() }));
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
a = await audio();
console.log('nach Geste:', JSON.stringify(a));
check('Geste schaltet Audio frei', a.ctx === 'running' && a.ready);
// Lage der Musik zur Uhr: Zählzeit der Uhr zur Planungszeit des nächsten Sequencer-Schritts ↔ dieser Schritt
const clockPos = () => sc(() => {
  const m = window.__audio.music, e = window.__audio.engine, c = m.clock, th = m.theme, seq = m.seq;
  const at = c.b0 + (seq.time - c.t0) * c.bpm / 60;
  const d = ((at * 4 - seq.step) % th.length + th.length) % th.length;
  return { b: m.beat(), t: performance.now(), offsetSteps: Math.min(d, th.length - d), latency: e.now - e.audibleTime() };
});
const afterUnlock = await clockPos();
const expectUnlock = beforeUnlock.b.beat + (afterUnlock.t - beforeUnlock.t) / 1000 * 140 / 60;
console.log(`Freischaltung: Zählzeit vorher ${fmt(beforeUnlock.b.beat)}, nachher ${fmt(afterUnlock.b.beat)} (erwartet ${fmt(expectUnlock)}), Quelle ${afterUnlock.b.source}, Ausgabelatenz ${fmt(afterUnlock.latency * 1000, 1)} ms`);
check(`Freischaltung: Taktuhr springt nicht (Zählzeit ${fmt(afterUnlock.b.beat)} statt ${fmt(expectUnlock)}), Quelle jetzt audio`, afterUnlock.b.source === 'audio' && Math.abs(afterUnlock.b.beat - expectUnlock) < 0.12);
check(`Freischaltung: Musik steigt im Takt der Uhr ein (Sequencer ${fmt(afterUnlock.offsetSteps, 4)} Sechzehntel neben der Uhr)`, afterUnlock.offsetSteps < 0.01);
check(`Hörbare Zeit berücksichtigt die Ausgabelatenz (${fmt(afterUnlock.latency * 1000, 1)} ms, 0–500 ms)`, afterUnlock.latency >= 0 && afterUnlock.latency < 0.5);
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
// auf das Aufsteigen warten (unter Last laufen die Physik-Bilder langsamer), dann die Einblendung der Energie-Ebene
await page.waitForFunction(() => window.__audio.music.drums, null, { timeout: 3000 }).catch(() => {});
await page.waitForTimeout(300);
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
  // Welt 2–4 (has = Spuren, die das Thema prägen; drums = Schlagzeug-Zeichen; fx = Effekt-Bus)
  course_desert: { bpm: 136, bars: [16, 16], loop: true, has: ['lead', 'arp'], drums: 'dp' },
  course_space: { bpm: 124, bars: [16, 16], loop: true, beatMult: 2, has: ['pad', 'arp', 'bell'], fx: 'delay' },
  course_shadow: { bpm: 126, bars: [16, 16], loop: true, has: ['arp', 'echo'], fx: 'lowpass' },
  course_hills: { bpm: 144, bars: [16, 16], loop: true, has: ['lead', 'piano', 'bell'] },
  course_cherry: { bpm: 132, bars: [16, 16], loop: true, has: ['piano', 'bell', 'organ'] },
  course_tank: { bpm: 138, bars: [16, 16], loop: true, has: ['lead', 'stabs'], drums: 's' },
  course_house: { bpm: 168, bars: [4, 4], loop: true, has: ['arp', 'lead'], drums: 'x' },
  course_snow: { bpm: 128, bars: [16, 16], loop: true, has: ['bell', 'pad', 'piano'], drums: 'j' },
  course_ghost: { bpm: 122, bars: [16, 16], loop: true, has: ['organ', 'whistle'], drums: 'x' },
  course_plaza: { bpm: 152, bars: [16, 16], loop: true, has: ['arp', 'piano', 'bell'] },
  course_water: { bpm: 118, bars: [16, 16], loop: true, beatMult: 2, has: ['arp', 'lead'], fx: 'lowpass' },
  course_race: { bpm: 150, bars: [16, 16], loop: true, has: ['lead', 'arp', 'riser'] },
  course_autumn: { bpm: 134, bars: [16, 16], loop: true, has: ['lead', 'arp', 'piano'] },
  course_train: { bpm: 146, bars: [16, 16], loop: true, has: ['whistle', 'lead'] },
  course_skyway: { bpm: 136, bars: [16, 16], loop: true, has: ['pad', 'arp', 'lead', 'bell'] },
  course_canyon: { bpm: 132, bars: [16, 16], loop: true, has: ['whistle', 'arp'] },
  course_poison: { bpm: 130, bars: [16, 16], loop: true, has: ['lead', 'arp', 'stabs'] },
  course_beep: { bpm: 120, bars: [16, 16], loop: true, has: ['bell'], drums: 'x' },
  course_bounce: { bpm: 140, bars: [16, 16], loop: true, has: ['lead', 'arp'] },
  course_ruins: { bpm: 128, bars: [16, 16], loop: true, has: ['whistle', 'arp', 'lead'] },
  course_lavacastle: { bpm: 148, bars: [16, 16], loop: true, has: ['organ', 'stabs', 'lead'] },
  course_world2_map: { bpm: 120, bars: [8, 8], loop: true, beatMult: 2, drums: 'dp' },
  course_world3_map: { bpm: 116, bars: [8, 8], loop: true, beatMult: 2, drums: 'j' },
  course_world4_map: { bpm: 122, bars: [8, 8], loop: true, beatMult: 2, has: ['whistle'] },
};
// Musiknamen Welt 2–4 (Auftrag/Vertrag) und Karten-Themen je Welt
const CONTRACT_THEMES_W = ['course_desert', 'course_space', 'course_shadow', 'course_hills', 'course_cherry', 'course_tank', 'course_house',
  'course_snow', 'course_ghost', 'course_plaza', 'course_water', 'course_race', 'course_autumn', 'course_train', 'course_skyway',
  'course_canyon', 'course_poison', 'course_beep', 'course_bounce', 'course_ruins', 'course_lavacastle',
  'course_world2_map', 'course_world3_map', 'course_world4_map'];
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
check(`Alle ${CONTRACT_THEMES_W.length} Themen für Welt 2–4 vorhanden`, CONTRACT_THEMES_W.every((n) => infos.some((i) => i && i.name === n)));
for (const [name, spec] of Object.entries(COURSE_THEMES)) {
  if (!spec.has && !spec.drums && !spec.fx) continue;
  const i = infos.find((x) => x && x.name === name);
  check(`${name}: Spuren ${(spec.has ?? []).join('/') || '–'}, Schlagzeug ${spec.drums ?? '–'}, Effekt ${spec.fx ?? '–'}`, !!i
    && (spec.has ?? []).every((k) => i.tracks.includes(k)) && [...(spec.drums ?? '')].every((ch) => i.drumKinds.includes(ch)) && (!spec.fx || i.fx.includes(spec.fx)));
}
// Klangfarbe aus den Daten: Lagune blubbert (Plucks gleiten aufwärts), Gifttropfen gleiten abwärts, Spukhaus-Theremin mit weitem Vibrato
check('course_water: blubbernde Plucks (glide > 1), Tiefpass auf Lead/Piano/Pad', THEMES.course_water.voice.arp.glide > 1 && ['lead', 'piano', 'pad'].every((k) => THEMES.course_water.fx.lowpass[k] <= 1600));
check('course_poison: Gifttropfen gleiten abwärts (glide < 1)', THEMES.course_poison.voice.arp.glide < 1);
check('course_ghost: Theremin mit weitem Vibrato (≥ 30 Cent)', THEMES.course_ghost.voice.whistle.vibrato >= 30);

// Spiegelfrucht-Kanon: die Glocke spielt die Piano-Stimme zwei Takte später eine Oktave höher, die Orgel vier Takte
// später eine Oktave tiefer – Ton für Ton (aus den Themen-Daten)
const noteList = (bars) => {
  const out = [];
  let pos = 0;
  for (const bar of bars) for (const tok of bar.trim().split(/\s+/)) { const [n, d] = tok.split(':'); if (n !== '-') out.push([pos, n.split('+').map(midi).join('+')]); pos += +d; }
  return out;
};
const canonOk = (voice, steps, semis) => {
  const lead = noteList(THEMES.course_cherry.piano).filter(([p]) => p + steps < 256).map(([p, n]) => `${p + steps}:${n.split('+').map((x) => +x + semis).join('+')}`);
  const follow = noteList(THEMES.course_cherry[voice]).map(([p, n]) => `${p}:${n}`);
  return lead.length > 40 && lead.length === follow.length && lead.every((x, i) => x === follow[i]);
};
check('course_cherry: Kanon – Glocke klont das Piano 2 Takte später eine Oktave höher, Orgel 4 Takte später eine Oktave tiefer', canonOk('bell', 32, 12) && canonOk('organ', 64, -12));

// Piep-Takt: Umschalten alle 8 Zählzeiten, auf der Eins der Umschalt-Piep (G6) mit Crash, auf den 3 Zählzeiten davor der Warn-Piep (C6)
const beepInfo = infos.find((i) => i?.name === 'course_beep');
const beeps = noteList(THEMES.course_beep.bell).map(([p, n]) => ({ beat: p / 4, note: +n }));
const beepPlan = [];
for (let b = 0; b < 64; b++) { const k = b % 8; if (k === 0) beepPlan.push({ beat: b, note: midi('G6') }); else if (k >= 5) beepPlan.push({ beat: b, note: midi('C6') }); }
const crashBars = THEMES.course_beep.drums.map((bar, i) => (Array.isArray(bar) ? bar : [bar]).some((l) => l[0] === 'r') ? i : -1).filter((i) => i >= 0);
check(`course_beep: Spiel-Takt ${JSON.stringify(beepInfo?.sync)} (Umschalten alle 8 Zählzeiten, 3 Warn-Pieps)`, beepInfo?.sync?.switchEvery === 8 && beepInfo?.sync?.warnBeats === 3);
check(`course_beep: ${beeps.length} Pieps genau auf dem Spiel-Takt (Umschalt-Piep G6 auf jeder 8. Zählzeit, Warn-Piep C6 auf den 3 davor), Crash auf jedem Umschalten`, beeps.length === beepPlan.length
  && beeps.every((x, i) => x.beat === beepPlan[i].beat && x.note === beepPlan[i].note) && crashBars.length === 8 && crashBars.every((b) => b % 2 === 0));

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

// ---- Taktuhr mit Ton: Tempo, onBeat im Takt der hörbaren Musik, stumm, angehaltener Kontext, Wechsel, Stopp ----
const live = await sc(async () => {
  const m = window.__audio.music, e = window.__audio.engine;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pos = () => { const c = m.clock, th = m.theme, seq = m.seq; const at = c.b0 + (seq.time - c.t0) * c.bpm / 60; const d = ((at * 4 - seq.step) % th.length + th.length) % th.length; return Math.min(d, th.length - d); };
  const snap = () => ({ b: m.beat(), t: performance.now() });
  m.play('course_beep');
  await wait(300);
  const r0 = snap();
  const hits = [];
  const off = m.onBeat((ev) => hits.push({ ...ev, t: performance.now(), audible: e.audibleTime() }));
  await wait(4000);
  off();
  const r1 = snap();
  const c = m.clock;
  const audibleLag = hits.map((h) => h.audible - (c.t0 + (h.beat - c.b0) * 60 / c.bpm)); // hörbar seit … s
  const offset1 = pos();
  e.setMuted(true);
  const m0 = snap();
  await wait(1000);
  const m1 = snap();
  e.setMuted(false);
  const s0 = snap();
  await e.ctx.suspend();
  await wait(700);
  const s1 = snap();
  await e.ctx.resume();
  await wait(400);
  const s2 = snap();
  const offset2 = pos();
  m.play('course_race');
  await wait(250);
  const race = m.beat();
  m.stop();
  const st0 = m.beat();
  await wait(200);
  const st1 = m.beat();
  const noop = typeof m.onBeat(42);
  m.play('map');
  return { r0, r1, hits, audibleLag, offset1, m0, m1, s0, s1, s2, offset2, race, st0, st1, noop };
});
const rate = (x, y) => (y.b.beat - x.b.beat) / ((y.t - x.t) / 1000);
const ls = beatSeries(live.hits, 120);
const lagSorted = [...live.audibleLag].sort((p, q) => p - q);
console.log(`\nTaktuhr mit Ton (course_beep, 120 BPM): Start ${JSON.stringify(live.r0.b)}`);
console.log(`   Tempo ${fmt(rate(live.r0, live.r1))} Zählzeiten/s; onBeat ${ls.n}×, Abstand (Median) ${fmt(ls.interval)} s, größte Abweichung ${fmt(ls.jitter * 1000, 1)} ms, Raster ±${fmt(ls.gridErr * 1000, 2)} ms, Verzug Median ${fmt(ls.lateMedian * 1000, 1)} ms, max ${fmt(ls.lateMax * 1000, 1)} ms`);
console.log(`   Rückruf nach dem Hörbarwerden der Zählzeit: ${fmt(lagSorted[0] * 1000, 1)} … ${fmt(lagSorted[lagSorted.length - 1] * 1000, 1)} ms; Sequencer neben der Uhr ${fmt(live.offset1, 4)} Sechzehntel`);
console.log(`   stumm: ${fmt(rate(live.m0, live.m1))} Zählzeiten/s; Kontext angehalten: ${fmt(rate(live.s0, live.s1))} Zählzeiten/s (Quelle ${live.s1.b.source}), danach Quelle ${live.s2.b.source}, Zählzeit ${fmt(live.s2.b.beat)} (erwartet ${fmt(live.s1.b.beat + (live.s2.t - live.s1.t) / 500)}), Sequencer neben der Uhr ${fmt(live.offset2, 4)}`);
check('Taktuhr mit Ton: course_beep startet bei Zählzeit 0 mit 120 BPM auf der hörbaren Uhr', live.r0.b.theme === 'course_beep' && live.r0.b.bpm === 120 && live.r0.b.source === 'audio' && live.r0.b.playing && live.r0.b.beat < 1.5 && beatOk(live.r0.b));
check(`Taktuhr mit Ton: beat() steigt mit dem Tempo (${fmt(rate(live.r0, live.r1))} statt 2 Zählzeiten/s)`, Math.abs(rate(live.r0, live.r1) - 2) < 2 * 0.03);
check(`onBeat mit Ton: ${ls.n} lückenlose Zählzeiten im Abstand ${fmt(ls.interval)} s (erwartet 0,5 s ±3 %), jede im Raster (±${fmt(ls.gridErr * 1000, 2)} ms)`, ls.n >= 6 && ls.consecutive && ls.fields && ls.intervalErr < 0.03 && ls.gridErr < 0.01);
check(`onBeat synchron zur hörbaren Musik: Rückruf 0–40 ms nach dem Hörbarwerden (Median ${fmt(lagSorted[Math.floor(lagSorted.length / 2)] * 1000, 1)} ms), Sequencer exakt auf der Uhr`, lagSorted[0] >= -0.002 && lagSorted[Math.floor(lagSorted.length / 2)] < 0.04 && live.offset1 < 0.01);
check(`Stummgeschaltet läuft die Taktuhr weiter (${fmt(rate(live.m0, live.m1))} Zählzeiten/s, Quelle ${live.m1.b.source})`, Math.abs(rate(live.m0, live.m1) - 2) < 2 * 0.05 && live.m1.b.source === 'audio');
check(`Kontext angehalten: Ersatzuhr übernimmt stetig (${fmt(rate(live.s0, live.s1))} Zählzeiten/s, Quelle ${live.s1.b.source})`, live.s1.b.source === 'ersatz' && Math.abs(rate(live.s0, live.s1) - 2) < 2 * 0.06);
check('Kontext fortgesetzt: Uhr wieder hörbar, ohne Sprung, Musik im Takt der Uhr', live.s2.b.source === 'audio' && Math.abs(live.s2.b.beat - (live.s1.b.beat + (live.s2.t - live.s1.t) / 500)) < 0.15 && live.offset2 < 0.01);
check(`Themenwechsel: Zählung beginnt neu im Tempo des neuen Themas (course_race, ${live.race.bpm} BPM, Zählzeit ${fmt(live.race.beat)})`, live.race.theme === 'course_race' && live.race.bpm === 150 && live.race.beat < 1);
check('stop(): Taktuhr steht (playing false, Zählzeit fest)', !live.st0.playing && live.st0.beat === live.st1.beat && !live.st1.playing);
check('onBeat ohne Funktion: Abmelden-Funktion ohne Wirkung', live.noop === 'function');

// Testhaken: virtuelle Uhr, deterministisch vorgespult (1/60 s je Bild wie die Spiel-Schritte)
const man = await sc(() => {
  const m = window.__audio.music, r = {};
  m.stop();
  r.on = m.setManualClock(true);
  m.play('course_beep');
  const evs = [];
  const off = m.onBeat((ev) => evs.push(ev));
  const samples = [];
  for (let i = 1; i <= 594; i++) { m.advanceClock(1 / 60); if (i % 60 === 0) samples.push(m.beat()); }
  off();
  r.end0 = m.beat();
  m.advanceClock(2);
  r.after = evs.length;
  r.end = m.beat();
  r.manual = m.manualClock;
  r.off = m.setManualClock(false);
  r.cont = m.beat();
  r.evs = evs;
  r.samples = samples;
  m.play('map');
  return r;
});
console.log(`Testhaken: ${man.evs.length} Rückrufe in 9,9 s virtueller Zeit (Zählzeiten ${man.evs[0]?.beat}…${man.evs[man.evs.length - 1]?.beat}), Proben ${man.samples.map((b) => fmt(b.beat, 2)).join(' ')}`);
check('Testhaken: setManualClock(true) schaltet die virtuelle Uhr ein', man.on === true && man.manual === true && man.off === false);
check('Testhaken: 9,9 s bei 120 BPM ergeben genau die Zählzeiten 0–19 in Reihenfolge, mit Takt/Zählzeit im Takt', man.evs.length === 20 && man.evs.every((ev, i) => ev.beat === i && ev.bar === Math.floor(i / 4) && ev.inBar === i % 4 && ev.theme === 'course_beep' && ev.late >= 0 && ev.late < 1 / 60 + 1e-9));
check('Testhaken: beat() nach jeder virtuellen Sekunde genau 2, 4, … 18 Zählzeiten', man.samples.length === 9 && man.samples.every((b, k) => Math.abs(b.beat - 2 * (k + 1)) < 1e-6 && b.source === 'ersatz' && b.playing && beatOk(b)));
check('Testhaken: nach dem Abmelden keine Rückrufe mehr; Zählzeit läuft weiter (+4 in 2 s)', man.after === 20 && Math.abs(man.end.beat - man.end0.beat - 4) < 1e-6);
check(`Testhaken aus: Zählzeit läuft stetig weiter (${fmt(man.end.beat)} → ${fmt(man.cont.beat)})`, Math.abs(man.cont.beat - man.end.beat) < 0.1 && man.cont.playing);

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
  return { names: fx.names, course: fx.course, world: fx.world, nodes, unknown };
});
const WORLD_SFX = ['clone', 'clone_lost', 'helm_on', 'helm_off', 'cannon', 'propeller', 'light', 'quicksand', 'sand_crumble', 'peck', 'bullet',
  'boss_hit', 'boss_spin', 'house_tick', 'room_clear', 'ice_slide', 'snowball', 'ghost', 'splash_big', 'train_whistle', 'beep', 'beep_switch'];
check(`Effekt-Liste enthält alle ${WORLD_SFX.length} Namen für Welt 2–4`, WORLD_SFX.every((n) => liveSfx.names.includes(n)) && WORLD_SFX.every((n) => liveSfx.world.includes(n)) && liveSfx.world.length === WORLD_SFX.length);
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
const order = [...CONTRACT_SFX, ...liveSfx.names.filter((n) => !CONTRACT_SFX.includes(n) && !WORLD_SFX.includes(n))];
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

// Effekte Welt 2–4: eigene Hörprobe, gleiche Maßstäbe wie die Kurs-Effekte
const demoW = await sc(sfxInPage, { order: WORLD_SFX, gap: 0.6 });
writeWav(`${OUT}sfx_demo_w2.wav`, demoW.wav, demoW.sampleRate);
console.log(`\nEffekte Welt 2–4: ${OUT}sfx_demo_w2.wav (${fmt(demoW.seconds, 1)} s, je Effekt + 0,6 s Pause), Reihenfolge:`);
const byNameW = Object.fromEntries(demoW.stats.map((x) => [x.name, x]));
WORLD_SFX.forEach((n, i) => {
  const x = byNameW[n];
  console.log(`   ${String(i + 1).padStart(2)}. ${fmt(demoW.starts[i], 2).padStart(6)} s  ${n.padEnd(14)} Dauer ${fmt(x.duration, 2)} s  Spitze ${fmt(x.peak, 2)}  Lautheit ${fmt(x.loudness, 1)} LUFS  Knoten ${x.nodes}`);
});
const worldL = WORLD_SFX.map((n) => byNameW[n].loudness).sort((p, q) => p - q);
const worldMedian = worldL[Math.floor(worldL.length / 2)];
check(`Effekte Welt 2–4 gleich laut wie die bestehenden (Median ${fmt(worldMedian, 1)} vs. ${fmt(refMedian, 1)} LUFS, ±2 dB)`, Math.abs(worldMedian - refMedian) <= 2);
for (const n of WORLD_SFX) {
  const x = byNameW[n];
  check(`sfx ${n}: Lautheit ${fmt(x.loudness, 1)} LUFS im Bereich, Spitze ${fmt(x.peak, 2)} < 0,9, Dauer ${fmt(x.duration, 2)} s, ${x.nodes} Knoten`,
    x.loudness >= loLim && x.loudness <= hiLim && x.peak < 0.9 && x.duration > 0.04 && x.duration <= 1.6 && x.nodes <= MAX_SFX_NODES);
}

// Sequencer läuft weiter ohne Fehler
await page.waitForTimeout(1000);
check('Keine Audio-Fehler in der Konsole', errors.length === 0);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
