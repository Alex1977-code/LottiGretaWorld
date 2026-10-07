// Audio-Test: Kontext wird bei Nutzergeste freigeschaltet, Themen wechseln, Energie-Ebene beim Reiten,
// Stummschaltung wird gespeichert, keine Fehler. Zusätzlich wird jedes Thema offline gerendert und
// messbar geprüft (Spitzenpegel, RMS, Frequenzbänder, Beat-Periodizität, Knoten je Sekunde);
// die ersten 8 s von world1 landen als WAV in tests/out/world1.wav.
import { writeFileSync } from 'node:fs';
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4184;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
await loadGame(page, PORT, errors, stop, 'test');
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const audio = () => sc(() => { const a = window.__audio; return { ctx: a.engine.ctx ? a.engine.ctx.state : 'none', ready: a.engine.ready, theme: a.music.current, drums: a.music.drums, muted: a.engine.muted, pending: a.music.pending ?? null, energy: a.music.energyGain ? a.music.energyGain.gain.value : null }; });
const fmt = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : String(v));

/** Läuft im Browser: Thema offline rendern und vermessen. */
async function analyzeInPage({ name, seconds, energy, wantWav, beatMult = 1 }) {
  const r = await window.__audio.music.renderTheme(name, seconds, { energy });
  const x = r.buffer.getChannelData(0), sr = r.sampleRate;
  let peak = 0, sum = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; sum += x[i] * x[i]; }
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
    const pcm = new Int16Array(x.length);
    for (let i = 0; i < x.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767)));
    const bytes = new Uint8Array(pcm.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    wav = btoa(s);
  }
  return { name, seconds, bpm: r.bpm, bars: r.bars, sampleRate: sr, peak, rms, bands, beatLag: bestLag / rate, beatExpected: beat, acBest: best, acBeat, acEighth, acOff, nodesPerSecond: r.nodesPerSecond, oscPerSecond: r.oscillatorsPerSecond, inGameLevel: r.inGameLevel, wav };
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

// Sequencer läuft weiter ohne Fehler
await page.waitForTimeout(1000);
check('Keine Audio-Fehler in der Konsole', errors.length === 0);

await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
