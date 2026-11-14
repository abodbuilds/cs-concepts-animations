'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/string-matching.js');

const clone = value => JSON.parse(JSON.stringify(value));
const lineForKind = {
  ready: [], 'code-points': [2], lengths: [3], 'empty-check': [4],
  'empty-found': [5], 'fit-check': [6], 'too-long': [7], start: [8],
  candidate: [9], reset: [10], 'pattern-bounds': [11], compare: [12],
  mismatch: [13], advance: [14], 'match-check': [15], found: [16],
  shift: [17], missing: [18],
};
const tones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);

function bilingual(value) {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim().length > 0);
  assert.ok(value.ar.trim().length > 0);
}

// Use the native UTF-16 search as an independent oracle, then translate its
// returned prefix length to the lesson's code-point coordinate system.
function expectedIndex({ text, pattern }) {
  const offset = text.indexOf(pattern);
  return offset < 0 ? -1 : Array.from(text.slice(0, offset)).length;
}

function verifyTrace(input) {
  const original = clone(input);
  const frames = lesson.build(Object.freeze(input));
  assert.deepEqual(input, original);
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  assert.equal(frames.at(-1).state.done, true);
  assert.equal(frames.at(-1).state.result, expectedIndex(input));
  assert.equal(frames.filter(frame => frame.state.done).length, 1);

  const text = Array.from(input.text), pattern = Array.from(input.pattern);
  let comparisons = 0, candidates = 0, shifts = 0;
  const seenObjects = new Set();
  function checkIndependentObjects(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(!seenObjects.has(value), 'all nested snapshot objects must be independently copied');
    seenObjects.add(value);
    for (const child of Object.values(value)) checkIndependentObjects(child);
  }
  for (const [frameIndex, frame] of frames.entries()) {
    const state = frame.state, previous = frames[frameIndex - 1];
    checkIndependentObjects(frame);
    assert.deepEqual(frame.lines, lineForKind[frame.kind], frame.kind);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line > 0 && line <= lesson.code.length));
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.deepEqual(state.text, text);
    assert.deepEqual(state.pattern, pattern);
    if (!state.done) assert.equal(state.result, null);
    if (frame.kind === 'compare') {
      comparisons++;
      const compared = state.comparison;
      assert.equal(compared.textIndex, state.shift + state.j);
      assert.equal(compared.patternIndex, state.j);
      assert.ok(state.j >= 0 && state.j < pattern.length);
      assert.ok(compared.textIndex >= 0 && compared.textIndex < text.length);
      assert.equal(compared.textValue, text[compared.textIndex]);
      assert.equal(compared.patternValue, pattern[compared.patternIndex]);
      assert.equal(compared.equal, compared.textValue === compared.patternValue);
      assert.equal(state.condition, !compared.equal, 'line 12 tests inequality');
      assert.equal(state.matchedLength, state.j + Number(compared.equal));
      assert.equal(frame.equation,
        `text[${compared.textIndex}] ${JSON.stringify(compared.textValue)} != pattern[${state.j}] ${JSON.stringify(compared.patternValue)} → ${!compared.equal}`);
      assert.equal(frames[frameIndex + 1].kind, compared.equal ? 'advance' : 'mismatch');
    }
    if (frame.kind === 'candidate') {
      assert.equal(state.condition, state.shift <= text.length - pattern.length);
      if (state.condition) {
        assert.equal(state.shift, candidates, 'try consecutive starts, including overlapping candidates');
        candidates++;
        assert.equal(frames[frameIndex + 1].kind, 'reset');
      } else assert.equal(frames[frameIndex + 1].kind, 'missing');
    }
    if (frame.kind === 'shift') {
      shifts++;
      assert.equal(state.shift, previous.state.shift + 1);
      assert.equal(previous.kind, 'match-check');
      assert.equal(previous.state.condition, false);
      assert.equal(state.comparison, null);
      assert.equal(state.matchedLength, 0);
    }
    if (frame.kind === 'reset') {
      assert.equal(state.j, 0);
      assert.equal(state.matchedLength, 0);
    }
    if (frame.kind === 'advance') {
      assert.equal(previous.kind, 'compare');
      assert.equal(previous.state.comparison.equal, true);
      assert.equal(state.j, previous.state.j + 1);
      assert.equal(state.shift, previous.state.shift);
    }
    if (frame.kind === 'mismatch') {
      assert.equal(previous.kind, 'compare');
      assert.equal(previous.state.comparison.equal, false);
      assert.equal(frames[frameIndex + 1].kind, 'match-check');
    }
    if (frame.kind === 'pattern-bounds') {
      assert.equal(state.condition, state.j < pattern.length);
      assert.equal(frames[frameIndex + 1].kind, state.condition ? 'compare' : 'match-check');
    }
    if (frame.kind === 'match-check') {
      assert.equal(state.condition, state.j === pattern.length);
      assert.equal(frames[frameIndex + 1].kind, state.condition ? 'found' : 'shift');
    }
    if (state.candidateActive) {
      assert.ok(state.shift >= 0 && state.shift <= text.length - pattern.length);
      assert.deepEqual(text.slice(state.shift, state.shift + state.matchedLength), pattern.slice(0, state.matchedLength),
        'every highlighted prefix has really been verified');
      for (let earlier = 0; earlier < state.shift; earlier++) {
        assert.notDeepEqual(text.slice(earlier, earlier + pattern.length), pattern,
          'an earlier match must never be skipped');
      }
    }
    assert.equal(state.comparisons, comparisons);
    assert.equal(state.candidates, candidates);
    assert.equal(state.shifts, shifts);
    assert.deepEqual(frame.metrics.map(metric => metric.value), [comparisons, candidates, shifts]);
    for (const metric of frame.metrics) bilingual(metric.label);
    const variables = Object.fromEntries(frame.variables.map(variable => [variable.name, variable.value]));
    for (const name of ['n', 'm', 'shift', 'j', 'matchedLength', 'result']) assert.equal(variables[name], state[name]);
    assert.equal(variables['shift + j'], state.candidateActive && state.j < state.m ? state.shift + state.j : null);

    assert.equal(frame.scene.graph, null);
    assert.deepEqual(frame.scene.collections, []);
    assert.deepEqual(frame.scene.rows.map(row => row.id), ['text', 'pattern']);
    for (const row of frame.scene.rows) {
      bilingual(row.label);
      assert.equal(row.layout, 'aligned');
      assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
      for (const cell of row.cells) assert.ok(tones.has(cell.tone));
    }
    const [textRow, patternRow] = frame.scene.rows;
    assert.deepEqual(textRow.cells.map(cell => cell.value), text);
    assert.deepEqual(textRow.cells.map(cell => cell.id), text.map((_, i) => `text-${i}`));
    const offset = state.shift ?? 0;
    assert.equal(patternRow.cells.length, offset + pattern.length);
    for (let blank = 0; blank < offset; blank++) {
      assert.deepEqual(patternRow.cells[blank], { id: `pattern-gap-${blank}`, value: '', tone: 'muted' });
    }
    for (const [index, value] of pattern.entries()) {
      const cell = patternRow.cells[offset + index];
      assert.equal(cell.id, `pattern-${index}`, 'pattern card identities survive every shift');
      assert.equal(cell.value, value);
      assert.equal(cell.index, index, 'pattern indices are independent of alignment');
    }
    if (frame.kind === 'compare' || frame.kind === 'mismatch') {
      const { textIndex, patternIndex, equal } = state.comparison;
      const textCell = textRow.cells[textIndex], patternCell = patternRow.cells[offset + patternIndex];
      assert.equal(textCell.marker, 'shift + j');
      assert.equal(patternCell.marker, 'j');
      assert.equal(textCell.tone, equal ? 'active' : 'pivot');
      assert.equal(patternCell.tone, textCell.tone);
      assert.equal(textIndex, offset + patternIndex, 'the compared cards are aligned');
    }
    if (frame.kind === 'found') {
      assert.equal(textRow.cells.filter(cell => cell.tone === 'found').length, pattern.length);
      assert.equal(patternRow.cells.filter(cell => cell.tone === 'found').length, pattern.length);
    }
  }
  if (pattern.length > 0 && pattern.length <= text.length) {
    assert.ok(comparisons <= (text.length - pattern.length + 1) * pattern.length);
  } else assert.equal(comparisons, 0);
  assert.deepEqual(frames, lesson.build(input), 'trace generation must be deterministic');
  assert.deepEqual(frames, clone(frames), 'snapshots must remain JSON-safe plain data');
  return frames;
}

test('lesson exports the contract and registers without dependencies as a classic browser script', () => {
  assert.equal(lesson.id, 'string-matching');
  assert.equal(lesson.number, '10');
  assert.equal(lesson.category, 'string');
  assert.equal(globalThis.AlgorithmLessons['string-matching'], lesson);
  const context = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/string-matching.js'), 'utf8'), context);
  assert.equal(context.AlgorithmLessons.existing.id, 'existing');
  assert.equal(context.AlgorithmLessons['string-matching'].build({ text: 'hello', pattern: 'll' }).at(-1).state.result, 2);
  for (const name of ['description', 'note']) bilingual(lesson[name]);
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.deepEqual(lesson.fields.map(field => field.name), ['text', 'pattern']);
  for (const field of lesson.fields) {
    bilingual(field.label); bilingual(field.help);
    assert.ok(['text', 'textarea'].includes(field.type));
  }
  for (const field of ['title', 'intro', 'invariant']) bilingual(lesson.theory[field]);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  for (const note of lesson.theory.notes) bilingual(note);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
});

test('presets exercise success, failure, overlaps, Unicode, and empty inputs', () => {
  assert.deepEqual(lesson.presets.find(preset => preset.id === 'default').input, lesson.defaults);
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    const input = lesson.parse(preset.input);
    bilingual(lesson.summary(input));
    verifyTrace(input);
  }
  const end = lesson.build(lesson.parse(lesson.defaults)).at(-1).state;
  assert.equal(end.result, 4);
  assert.equal(end.candidates, 5);
  assert.equal(end.comparisons, 14);
});

test('first-match results cover boundaries, overlapping starts, and literal Unicode semantics', () => {
  const examples = [
    ['', '', 0], ['', 'a', -1], ['abc', '', 0], ['a', 'aa', -1],
    ['a', 'a', 0], ['a', 'b', -1], ['abc', 'abc', 0], ['abc', 'abd', -1],
    ['abc', 'c', 2], ['abcabc', 'abc', 0], ['aaab', 'aab', 1],
    ['bananana', 'ana', 1], ['aaaaa', 'aaa', 0], ['ababac', 'abac', 2],
    ['🙂a🙂b', '🙂b', 2], ['🙂🙂x', 'x', 2], ['سلام يا سلام', 'سلام', 0],
    ['x👩‍💻z', 'z', 4], ['e\u0301x', 'x', 2], ['é', 'e\u0301', -1],
    ['AaA', 'a', 1], ['a a b', ' a', 1], ['a\n\tb', '\n\t', 1],
    [' a ', ' ', 0], ['\0a\0', '\0', 0], ['<script>', '<s', 0],
  ];
  for (const [text, pattern, result] of examples) {
    assert.equal(verifyTrace({ text, pattern }).at(-1).state.result, result);
  }
});

test('deterministic generated inputs agree with an independent first-match oracle', () => {
  let seed = 0x570123;
  const random = max => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  };
  const alphabet = ['a', 'a', 'b', '🙂', 'س', ' ', '\u0301'];
  for (let trial = 0; trial < 100; trial++) {
    const text = Array.from({ length: random(25) }, () => alphabet[random(alphabet.length)]).join('');
    let pattern = Array.from({ length: random(11) }, () => alphabet[random(alphabet.length)]).join('');
    if (trial % 3 === 0) {
      const points = Array.from(text), start = random(points.length + 1);
      pattern = points.slice(start, start + random(11)).join('');
    }
    verifyTrace({ text, pattern });
  }
});

test('worst-case comparison count is (n - m + 1)m with no skipped candidates', () => {
  for (const [n, m] of [[24, 10], [24, 1], [10, 10], [1, 1]]) {
    const frames = verifyTrace({ text: 'a'.repeat(n), pattern: 'a'.repeat(m - 1) + 'b' });
    const end = frames.at(-1).state;
    assert.equal(end.result, -1);
    assert.equal(end.candidates, n - m + 1);
    assert.equal(end.comparisons, (n - m + 1) * m);
    assert.equal(end.shifts, n - m + 1, 'the final loop increment is an actual shift');
    for (const frame of frames.filter(frame => frame.kind === 'mismatch')) assert.equal(frame.state.j, m - 1);
  }
});

test('empty and longer patterns exit before entering a candidate or reading characters', () => {
  for (const input of [{ text: '', pattern: '' }, { text: 'abc', pattern: '' }, { text: '', pattern: 'x' }, { text: 'a', pattern: 'ab' }]) {
    const frames = verifyTrace(input), end = frames.at(-1);
    assert.equal(end.kind, input.pattern ? 'too-long' : 'empty-found');
    assert.equal(end.state.candidates, 0);
    assert.equal(end.state.shifts, 0);
    assert.equal(end.state.comparisons, 0);
    assert.equal(end.state.shift, null);
    assert.equal(end.state.j, null);
    assert.equal(end.state.comparison, null);
  }
});

test('parse and build validate strings and code-point limits without trimming or normalization', () => {
  const raw = Object.freeze({ text: ' 🙂e\u0301\n', pattern: ' e\u0301 ' });
  const parsed = lesson.parse(raw);
  assert.deepEqual(parsed, raw);
  assert.notEqual(parsed, raw);
  verifyTrace(parsed);
  const maxInput = { text: '🙂'.repeat(24), pattern: '🙂'.repeat(10) };
  verifyTrace(lesson.parse(maxInput));
  for (const field of lesson.fields) assert.ok(maxInput[field.name].length <= field.maxLength,
    'HTML UTF-16 length hints must allow the full astral code-point limit');
  const invalid = [
    null, undefined, [], 'abc', {}, { text: 'abc' }, { pattern: 'a' },
    { text: 123, pattern: '' }, { text: '', pattern: 1 },
    { text: ['a'], pattern: '' }, { text: '', pattern: ['a'] },
    { text: new String('abc'), pattern: '' },
    { text: 'a'.repeat(25), pattern: '' }, { text: '', pattern: 'a'.repeat(11) },
    { text: '🙂'.repeat(25), pattern: '' }, { text: '', pattern: '🙂'.repeat(11) },
    { text: '\uD800', pattern: '' }, { text: '', pattern: '\uDC00' },
    { text: 'a\uD800b', pattern: '' },
  ];
  for (const input of invalid) {
    for (const entry of [lesson.parse, lesson.build]) {
      assert.throws(() => entry(input), error => {
        assert.ok(error instanceof Error);
        bilingual(error.userMessage);
        return true;
      });
    }
  }
  assert.match(lesson.summary({ text: '🙂🙂', pattern: '🙂' }).en, /^2 text code points · 1 pattern code points/);
});

test('nested frame mutations cannot change other snapshots, metadata, or future builds', () => {
  const input = Object.freeze({ text: 'aaab', pattern: 'aab' });
  const frames = lesson.build(input), before = clone(frames), metadata = clone(lesson.presets);
  const index = frames.findIndex(frame => frame.kind === 'compare');
  const frame = frames[index];
  frame.state.text[0] = 'changed';
  frame.state.pattern[0] = 'changed';
  frame.state.comparison.equal = false;
  frame.lines.push(999);
  frame.title.en = 'changed';
  frame.explanation.ar = 'changed';
  frame.variables[0].value = 999;
  frame.metrics[0].label.en = 'changed';
  frame.scene.rows[0].cells[0].value = 'changed';
  frame.scene.rows[1].cells[0].id = 'changed';
  frame.scene.note.en = 'changed';
  for (let i = 0; i < frames.length; i++) if (i !== index) assert.deepEqual(frames[i], before[i]);
  assert.deepEqual(lesson.build(input), before);
  assert.deepEqual(lesson.presets, metadata);
  assert.deepEqual(input, { text: 'aaab', pattern: 'aab' });
});
