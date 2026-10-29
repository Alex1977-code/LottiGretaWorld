// Klangnamen-Prüfung (ohne Browser): sammelt alle im Quellcode src/** aufgerufenen Effekt-Namen und prüft sie gegen die
// vorhandenen Effekte (src/audio/sfx.js, SFX_NAMES). Unbekannte Namen bleiben im Spiel stumm (kein Fehler) – genau das
// soll hier auffallen.
//
// Gesammelt werden
//   · Aufrufe der Abspiel-Funktionen: sfx('x'), level.sfx('x'), this.level.sfx('x'), playSfx('x') … (Name = 1. Argument),
//     w6Sfx(level, 'x') und hwSfx(level, 'x', 'ersatz') (Name = 2. Argument, Ersatz = 3. Argument),
//   · Aktions-Objekte in Level-/Baustein-Daten: { sfx: 'x' } (entities/gimmick.js runAction spielt action.sfx ab),
//   · Ersatz-Tabellen: die Werte von SFX6 in blocks/w6kit.js (Ersatz muss es geben; Schlüssel sind Aufrufnamen).
// Ausdrücke aus Zeichenketten (a ? 'x' : 'y', a || 'x') zählen als statisch (jede Möglichkeit wird geprüft); Vergleichs-
// Literale in der Bedingung zählen nicht. Alles andere (Variablen, Template-Strings mit ${…}) ist dynamisch: diese Stellen
// stehen von Hand geprüft in DYNAMIC (Datei + Ausdruck → welche Namen dort ankommen können); eine neue, ungeprüfte
// dynamische Stelle lässt den Test scheitern, ebenso eine unbekannte Abspiel-Funktion (Name „sfx“ oder
// endet auf „Sfx“).
//
// Aufruf: node tests/sfx_namen.mjs   (Ausgabe: Namen mit Zahl der Aufrufstellen, fehlende Namen mit Fundstellen)
// Auch als Modul: scanSfxNames() liefert { calls, missing, dynamic, unchecked, unknownFns } (von tests/audio.mjs genutzt).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SFX_NAMES } from '../src/audio/sfx.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/** Abspiel-Funktionen: Index des Namens-Arguments, ggf. Index des Ersatz-Arguments. */
const PLAYERS = { sfx: { name: 0 }, playSfx: { name: 0 }, w6Sfx: { name: 1 }, hwSfx: { name: 1, fallback: 2 } };
/** Funktionen auf „Sfx“, die keinen Namen abspielen (Offline-Rendern einer Namensliste). */
const NOT_PLAYERS = new Set(['renderSfx']);

/**
 * Von Hand geprüfte dynamische Stellen: `${Datei}|${Ausdruck}` → { names: mögliche Namen, why: Begründung }.
 * Ausdruck wie im Quelltext (Leerraum zusammengefasst). Bei names: null leitet die Stelle nur weiter (Wrapper);
 * die Namen werden an den Aufrufstellen des Wrappers geprüft.
 */
export const DYNAMIC = {
  'src/course/level/Level.js|name': { names: null, why: 'Level.sfx(name) leitet an sfx() weiter (Stummschaltung je Level)' },
  'src/course/blocks/hwkit.js|name': { names: null, why: 'hwSfx(level, name, fallback) leitet weiter – Name an den hwSfx-Aufrufen geprüft' },
  'src/course/blocks/hwkit.js|fallback': { names: null, why: 'hwSfx: Ersatzname an den hwSfx-Aufrufen geprüft' },
  'src/course/blocks/w6kit.js|name': { names: null, why: 'w6Sfx(level, name) leitet weiter – Name an den w6Sfx-Aufrufen geprüft' },
  'src/course/blocks/w6kit.js|SFX6[name]': { names: null, why: 'w6Sfx: Ersatz aus der Tabelle SFX6 (Werte geprüft)' },
  'src/course/entities/gimmick.js|action.sfx': { names: null, why: 'runAction spielt { sfx: … } aus Level-Daten – als Aktions-Objekte gesammelt' },
  'src/course/player/Player.js|kind': { names: ['jump', 'jump2', 'jump3'], why: 'startJump: im letzten Zweig ist kind jump/jump2/jump3 (Salto, Weit- und Seitwärtssprung haben eigene Zweige)' },
  'src/course/levels/w8/_helpers_e.js|`note${k++ % 8}`': { names: ['note0', 'note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7'], why: '8-Burg Glockenbaum: Tonleiter-Index k % 8' },
  'src/course/blocks/types/w2_space.js|`note${st.note % 8}`': { names: ['note0', 'note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7'], why: 'Tastenstein: Ton-Index note % 8' },
  'src/course/levels/w8/_helpers_e.js|`note${k++ % 8}`': { names: ['note0', 'note1', 'note2', 'note3', 'note4', 'note5', 'note6', 'note7'], why: '8-Burg Glockenbaum (glockenKlang): Ton-Index k % 8' },
};

/** Kommentare durch Leerzeichen ersetzen (Zeilen bleiben erhalten), Zeichenketten und Regex-Literale überspringen. */
function stripComments(src) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  let prevSig = ''; // letztes bedeutsames Zeichen (für Regex-Erkennung)
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const skipString = (q) => { // i steht auf dem öffnenden Anführungszeichen
    i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') i++;
      else if (q === '`' && src[i] === '$' && src[i + 1] === '{') { i += 2; skipCode('}'); continue; }
      i++;
    }
    i++;
  };
  function skipCode(end) { // bis zur passenden schließenden Klammer `end` (für ${…} in Template-Strings)
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === end && depth === 0) { i++; return; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      step();
    }
  }
  function step() {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const stop = e < 0 ? n : e; blank(i, stop); i = stop; return; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const stop = e < 0 ? n : e + 2; blank(i, stop); i = stop; return; }
    if (c === '"' || c === "'" || c === '`') { skipString(c); prevSig = 'a'; return; }
    if (c === '/' && (prevSig === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prevSig) || /\breturn\s*$/.test(src.slice(Math.max(0, i - 12), i)))) {
      i++; let cls = false;
      while (i < n && (src[i] !== '/' || cls) && src[i] !== '\n') { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; }
      i++; prevSig = 'a'; return;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  while (i < n) step();
  return out.join('');
}

/** Ab Position p (auf „(“) das Argument-Stück bis zur passenden „)“ – Zeichenketten werden beachtet. */
function argText(code, p) {
  let depth = 0;
  for (let i = p; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') { i = endOfString(code, i); continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return { text: code.slice(p + 1, i), end: i }; }
  }
  return null;
}
function endOfString(code, i) {
  const q = code[i];
  for (let k = i + 1; k < code.length; k++) {
    if (code[k] === '\\') { k++; continue; }
    if (q === '`' && code[k] === '$' && code[k + 1] === '{') { let d = 1; k += 2; while (k < code.length && d) { if (code[k] === '{') d++; else if (code[k] === '}') d--; k++; } k--; continue; }
    if (code[k] === q) return k;
  }
  return code.length;
}

/** Auf oberster Ebene an einem Zeichen(paar) teilen (Klammern und Zeichenketten beachten). */
function splitTop(expr, sep) {
  const parts = [];
  let depth = 0, last = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '"' || c === "'" || c === '`') { i = endOfString(expr, i); continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && expr.startsWith(sep, i)) { parts.push(expr.slice(last, i)); i += sep.length - 1; last = i + 1; }
  }
  parts.push(expr.slice(last));
  return parts.map((s) => s.trim());
}

/** Ternär-Ausdruck „a ? b : c“ auf oberster Ebene zerlegen (verschachtelte ?: im Zweig b werden beachtet). */
function splitTernary(expr) {
  let depth = 0, q = -1, nest = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '"' || c === "'" || c === '`') { i = endOfString(expr, i); continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && c === '?' && expr[i + 1] !== '?' && expr[i - 1] !== '?' && expr[i + 1] !== '.') { if (q < 0) q = i; else nest++; }
    else if (depth === 0 && c === ':' && q >= 0) { if (nest) nest--; else return [expr.slice(0, q), expr.slice(q + 1, i), expr.slice(i + 1)].map((s) => s.trim()); }
  }
  return null;
}

/**
 * Mögliche Namen eines Ausdrucks: { names: [statisch], dynamic: [Teilausdrücke] }.
 * Zeichenkette → Name; a ? b : c → b und c; a || b / a ?? b → beide; Klammern werden entfernt; sonst dynamisch.
 */
function namesOf(expr) {
  let e = expr.trim();
  while (e.startsWith('(') && argText(e, 0)?.end === e.length - 1) e = e.slice(1, -1).trim();
  const lit = /^(['"])([^'"\\]*)\1$/.exec(e) || /^`([^`$\\]*)`$/.exec(e);
  if (lit) return { names: [lit[2] ?? lit[1]], dynamic: [] };
  const t = splitTernary(e);
  if (t) return merge(namesOf(t[1]), namesOf(t[2]));
  for (const op of ['??', '||']) {
    const parts = splitTop(e, op);
    if (parts.length > 1) return parts.map(namesOf).reduce(merge);
  }
  return { names: [], dynamic: [e.replace(/\s+/g, ' ')] };
}
const merge = (a, b) => ({ names: [...a.names, ...b.names], dynamic: [...a.dynamic, ...b.dynamic] });

function* jsFiles(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) yield* jsFiles(p);
    else if (/\.(m?js)$/.test(ent.name)) yield p;
  }
}

/**
 * Quellcode durchsuchen. Liefert
 *   calls:   Map Name → [Fundstellen „datei:zeile“] (alle statischen Namen inkl. Ersatznamen und Aktions-Objekte)
 *   missing: Namen ohne eigenen Effekt (mit Fundstellen)
 *   dynamic: alle dynamischen Stellen [{ where, expr, known }]
 *   unchecked: dynamische Stellen ohne Eintrag in DYNAMIC
 *   unknownFns: Funktionen „sfx“/„…Sfx“, die nicht in PLAYERS stehen
 */
export function scanSfxNames({ src = SRC, known = SFX_NAMES } = {}) {
  const calls = new Map();
  const dynamic = [];
  const unknownFns = [];
  const add = (name, where, kind) => {
    if (!calls.has(name)) calls.set(name, []);
    calls.get(name).push(kind ? `${where} (${kind})` : where);
  };
  for (const file of jsFiles(src)) {
    const rel = relative(ROOT, file).split('\\').join('/');
    const raw = readFileSync(file, 'utf8');
    const code = stripComments(raw);
    const lineOf = (pos) => code.slice(0, pos).split('\n').length;
    // Aufrufe: Bezeichner „sfx“ oder „…Sfx“ direkt vor „(“
    for (const m of code.matchAll(/([A-Za-z_$][\w$]*)\s*(?:\?\.\s*)?\(/g)) {
      const fn = m[1];
      if (!/(^sfx|Sfx)$/.test(fn) || NOT_PLAYERS.has(fn)) continue;
      const open = m.index + m[0].length - 1;
      const a = argText(code, open);
      if (!a) continue;
      const before = code.slice(Math.max(0, m.index - 12), m.index);
      const after = code.slice(a.end + 1).trimStart();
      // Definitionen überspringen: function sfx(…) { / Methode sfx(name) { (nicht nach „.“)
      if (/\bfunction\s*$/.test(before) || (!/\.\s*$/.test(before) && after.startsWith('{'))) continue;
      const spec = PLAYERS[fn];
      const where = `${rel}:${lineOf(m.index)}`;
      if (!spec) { unknownFns.push(`${where} ${fn}(…)`); continue; }
      const args = splitTop(a.text, ',');
      for (const [role, idx] of Object.entries(spec)) {
        if (args[idx] === undefined || args[idx] === '') continue;
        const r = namesOf(args[idx]);
        r.names.forEach((nm) => add(nm, where, role === 'fallback' ? 'Ersatz' : ''));
        for (const expr of r.dynamic) {
          const info = DYNAMIC[`${rel}|${expr}`];
          dynamic.push({ where, expr, fn, known: !!info, why: info?.why ?? '' });
          if (info?.names) info.names.forEach((nm) => add(nm, where, `dynamisch: ${expr}`));
        }
      }
    }
    // Aktions-Objekte { sfx: 'x' } (Level-Daten, onBreak …)
    for (const m of code.matchAll(/\bsfx\s*:\s*(['"])([^'"]*)\1/g)) add(m[2], `${rel}:${lineOf(m.index)}`, 'Aktion');
    // Ersatz-Tabelle SFX6 (blocks/w6kit.js): { name: 'ersatz', … }
    const tab = /\bconst\s+SFX6\s*=\s*\{/.exec(code);
    if (tab) {
      const body = argText(code, tab.index + tab[0].length - 1).text;
      for (const m of body.matchAll(/(['"]?)([\w$]+)\1\s*:\s*(['"])([^'"]*)\3/g)) add(m[4], `${rel}:${lineOf(tab.index)}`, `Ersatz für ${m[2]}`);
    }
  }
  const knownSet = new Set(known);
  const missing = [...calls].filter(([name]) => !knownSet.has(name)).map(([name, where]) => ({ name, where }));
  const unchecked = dynamic.filter((d) => !d.known);
  return { calls, missing, dynamic, unchecked, unknownFns };
}

// ---- Als Skript: Bericht und Prüfungen ----
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = scanSfxNames();
  const names = [...r.calls.keys()].sort();
  const total = [...r.calls.values()].reduce((s, w) => s + w.length, 0);
  console.log(`Klangnamen im Quellcode: ${names.length} verschiedene an ${total} Stellen; vorhandene Effekte: ${SFX_NAMES.length}`);
  console.log(names.map((nm) => `${nm}×${r.calls.get(nm).length}`).join('  '));
  console.log(`\nDynamische Stellen (${r.dynamic.length}, von Hand geprüft in DYNAMIC):`);
  for (const d of r.dynamic) console.log(`   ${d.known ? '✓' : '?'} ${d.where}  ${d.fn}(${d.expr})${d.why ? `  – ${d.why}` : '  – UNGEPRÜFT'}`);
  const unused = SFX_NAMES.filter((nm) => !r.calls.has(nm));
  console.log(`\nEffekte ohne statischen Aufruf im Kurs-/Klassik-Code (${unused.length}): ${unused.join(', ')}`);
  if (r.missing.length) {
    console.log(`\nFehlende Klänge (${r.missing.length}):`);
    for (const m of r.missing) console.log(`   ${m.name.padEnd(14)} ${m.where.length}×  ${m.where.slice(0, 4).join(', ')}${m.where.length > 4 ? ' …' : ''}`);
  }
  let ok = true;
  const check = (name, pass) => { console.log(pass ? '  ✓' : '  ✗', name); ok &&= pass; };
  console.log('');
  check(`Kein fehlender Klangname – statisch und dynamisch geprüft (${r.missing.length ? r.missing.map((m) => m.name).join(', ') : 'alle vorhanden'})`, r.missing.length === 0);
  check(`Alle dynamischen Stellen von Hand geprüft${r.unchecked.length ? ` (ungeprüft: ${r.unchecked.map((d) => `${d.where} ${d.expr}`).join('; ')})` : ''}`, r.unchecked.length === 0);
  check(`Keine unbekannte Abspiel-Funktion${r.unknownFns.length ? ` (${r.unknownFns.join('; ')})` : ''}`, r.unknownFns.length === 0);
  check(`Mindestens 150 Aufrufstellen gefunden (Suche greift: ${total})`, total >= 150);
  process.exit(ok ? 0 : 1);
}
