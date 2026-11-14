const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/selection-sort.js');

const lineFor = {
  ready: [], length: [2], pass: [3], minimum: [4], scan: [5],
  compare: [6], 'new-minimum': [7], 'swap-check': [8], swap: [9], done: [10],
};
const tones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);

function bilingual(value) {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
}

function userError(run) {
  assert.throws(run, error => {
    assert.ok(error instanceof Error);
    bilingual(error.userMessage);
    return true;
  });
}

function fixtures() {
  const inputs = [
    [], [7], [-0], [0, -0, -1], [2, 1], [1, 2],
    [64, 25, 12, 22, 11], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1],
    [4, 4, 4, 4], [2, 2, 1], [-3, 0, -8, -3, 5], [-999, 999, 0, -999],
    Array.from({ length: 16 }, (_, index) => 16 - index),
  ];
  let seed = 20261114;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let sample = 0; sample < 90; sample++) {
    inputs.push(Array.from({ length: sample % 17 }, () => random() % 17 - 8));
  }
  return inputs;
}

test('exports the full contract and registers without a host or other lessons', () => {
  assert.equal(lesson.id, 'selection-sort');
  assert.equal(lesson.name, 'Selection Sort');
  assert.equal(lesson.category, 'sort');
  assert.equal(lesson.number, '03');
  assert.equal(lesson.label, 'SELECTION SORT');
  assert.equal(lesson.cost, 'O(n²)');
  assert.equal(globalThis.AlgorithmLessons[lesson.id], lesson);
  bilingual(lesson.description);
  bilingual(lesson.note);
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.equal(lesson.fields.length, 1);
  const field = lesson.fields[0];
  assert.equal(field.name, 'numbers');
  assert.equal(field.type, 'text');
  assert.equal(field.maxLength, 256);
  bilingual(field.label);
  bilingual(field.help);
  for (const name of ['title', 'intro', 'invariant']) bilingual(lesson.theory[name]);
  for (const step of lesson.theory.steps) {
    bilingual(step.title);
    bilingual(step.body);
  }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) {
    bilingual(cost.label);
    assert.equal(typeof cost.value, 'string');
  }
  assert.ok(lesson.theory.notes.some(note => /Instability/.test(note.en)));
  assert.ok(lesson.theory.notes.some(note => /no early exit/.test(note.en)));

  const sandbox = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/selection-sort.js'), 'utf8'), sandbox);
  assert.equal(sandbox.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = sandbox.AlgorithmLessons['selection-sort'];
  assert.equal(browserLesson.id, lesson.id);
  assert.equal(JSON.stringify(browserLesson.build(browserLesson.parse({ numbers: '2, 1' })).at(-1).state.result), '[1,2]');
});

test('parses raw string fields, Arabic digits, separators, boundaries, and empty input', () => {
  const cases = [
    ['', []], [' \n\t ', []], ['+7', [7]], ['-999, 999, 0', [-999, 999, 0]],
    ['٧، ٣، ۵، -٢', [7, 3, 5, -2]], [' 1 ,\t-2  +3\n4،٥ ', [1, -2, 3, 4, 5]],
    [Array(16).fill('999').join(', '), Array(16).fill(999)],
  ];
  for (const [text, expected] of cases) {
    const raw = Object.freeze({ numbers: text });
    assert.deepEqual(lesson.parse(raw), { numbers: expected });
  }
  assert.ok(Object.is(lesson.parse({ numbers: '-0' }).numbers[0], -0));
  assert.notEqual(lesson.parse({ numbers: '1,2' }).numbers, lesson.parse({ numbers: '1,2' }).numbers);
});

test('rejects malformed, excessive, and out-of-range raw input with bilingual errors', () => {
  for (const numbers of [
    '1,cat,2', '1.5', '1e2', '0x10', 'Infinity', 'NaN', '1000', '-1000',
    '9007199254740992', '١٠٠٠', '1,,2', ',1', '1,', '1, ,2', ',', '١،،٢',
    '1;2', '[1,2]', '--1', '+', '1-2', '<script>', '1\u00002',
    Array(17).fill('1').join(','), ' '.repeat(257), '0'.repeat(257),
  ]) userError(() => lesson.parse({ numbers }));
  for (const raw of [undefined, null, {}, [], { numbers: null }, { numbers: 2 }, { numbers: [1, 2] }]) {
    userError(() => lesson.parse(raw));
  }
});

test('build and summary independently enforce the public parsed-input constraints', () => {
  const invalid = [
    undefined, null, [], [1, 2], {}, { numbers: '1, 2' }, { numbers: new Int32Array([1]) },
    { numbers: Array(17).fill(0) }, { numbers: new Array(2) },
    ...[undefined, null, NaN, Infinity, -Infinity, 0.5, -1000, 1000, Number.MAX_SAFE_INTEGER, '2', true, 2n, {}]
      .map(value => ({ numbers: [value] })),
  ];
  for (const input of invalid) {
    userError(() => lesson.build(input));
    userError(() => lesson.summary(input));
  }
  for (const numbers of [[], [-999, 999], Array(16).fill(0)]) {
    assert.ok(lesson.build({ numbers }).at(-1).state.done);
    bilingual(lesson.summary({ numbers }));
  }
});

test('every preset parses, summarizes, and sorts with meaningful edge cases', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.deepEqual(lesson.presets.find(preset => preset.id === 'default').input, lesson.defaults);
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    assert.equal(typeof preset.input.numbers, 'string');
    const input = lesson.parse(preset.input);
    bilingual(lesson.summary(input));
    assert.deepEqual(lesson.build(input).at(-1).state.result, [...input.numbers].sort((a, b) => a - b));
  }
  for (const id of ['default', 'sorted', 'reverse', 'unstable', 'equal', 'negative', 'singleton', 'empty']) {
    assert.ok(lesson.presets.some(preset => preset.id === id));
  }
});

test('sorts seeded random and boundary arrays without mutating input; snapshots conserve identities and fixed prefixes', () => {
  for (const values of fixtures()) {
    const input = Object.freeze({ numbers: Object.freeze([...values]) });
    const frames = lesson.build(input);
    const sorted = [...values].sort((a, b) => a - b);
    const final = frames.at(-1).state;
    assert.ok(frames.length > 1 && frames.length < 1000);
    assert.deepEqual(input.numbers, values);
    // Signed zeros compare equally, so check numeric order separately from identity.
    assert.deepEqual(final.result.map(value => value === 0 ? 0 : value), sorted.map(value => value === 0 ? 0 : value));
    assert.deepEqual(final.result, final.numbers);
    assert.equal(final.comparisons, values.length * Math.max(0, values.length - 1) / 2);
    assert.equal(final.swaps, frames.filter(frame => frame.kind === 'swap').length);
    assert.ok(final.swaps <= Math.max(0, values.length - 1));
    assert.equal(frames[0].kind, 'ready');
    assert.equal(frames[0].state.done, false);
    assert.equal(frames[0].state.result, null);
    assert.deepEqual(frames[0].state.numbers, values);
    assert.equal(final.done, true);
    assert.equal(final.fixedCount, values.length);

    for (const [frameIndex, frame] of frames.entries()) {
      const state = frame.state;
      const row = frame.scene.rows[0];
      assert.equal(state.done, frameIndex === frames.length - 1);
      if (!state.done) assert.equal(state.result, null);
      assert.deepEqual([...state.itemIds].sort(), values.map((_, index) => `item-${index}`).sort());
      assert.equal(row.id, 'numbers');
      assert.equal(row.layout, 'cards');
      assert.equal(new Set(row.cells.map(cell => cell.id)).size, values.length);
      assert.deepEqual(row.cells.map(cell => cell.id), state.itemIds);
      assert.deepEqual(row.cells.map(cell => cell.value), state.numbers);
      for (const [index, cell] of row.cells.entries()) {
        const originalIndex = Number(cell.id.slice(5));
        assert.ok(Object.is(cell.value, values[originalIndex]), 'the original value stays with its card');
        assert.equal(cell.index, index);
        assert.equal(cell.marker.split(' · ')[0], String.fromCharCode(65 + originalIndex));
        assert.ok(tones.has(cell.tone));
        assert.equal(cell.tone === 'sorted', index < state.fixedCount);
        if (index < state.fixedCount) assert.ok(state.numbers[index] === sorted[index]);
      }
      assert.ok(state.fixedCount >= 0 && state.fixedCount <= values.length);
      for (let index = 1; index < state.fixedCount; index++) {
        assert.ok(state.numbers[index - 1] <= state.numbers[index]);
      }
      if (state.fixedCount > 0) {
        assert.ok(state.numbers.slice(state.fixedCount).every(value => value >= state.numbers[state.fixedCount - 1]));
      }
      if (frameIndex) {
        const previous = frames[frameIndex - 1].state;
        assert.ok(state.fixedCount >= previous.fixedCount);
        for (let index = 0; index < previous.fixedCount; index++) {
          assert.equal(state.itemIds[index], previous.itemIds[index], 'a fixed card never moves again');
        }
        if (frame.kind !== 'swap') {
          assert.deepEqual(state.numbers, previous.numbers, 'only a swap moves values');
          assert.deepEqual(state.itemIds, previous.itemIds, 'only a swap moves identities');
        }
        assert.equal(state.comparisons - previous.comparisons, frame.kind === 'compare' ? 1 : 0);
        assert.equal(state.swaps - previous.swaps, frame.kind === 'swap' ? 1 : 0);
      }
    }
  }
});

test('each scan, comparison, minimum update, and swap matches the pseudocode and its loop invariant', () => {
  for (const values of fixtures()) {
    const frames = lesson.build({ numbers: values });
    const scans = new Map();
    for (const [index, frame] of frames.entries()) {
      const state = frame.state;
      const next = frames[index + 1];
      assert.deepEqual(frame.lines, lineFor[frame.kind]);
      assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
      if (frame.kind === 'pass') {
        assert.equal(state.condition, state.start < values.length - 1);
        assert.equal(next.kind, state.condition ? 'minimum' : 'done');
      }
      if (frame.kind === 'minimum') assert.equal(state.minIndex, state.start);
      if (frame.kind === 'scan') {
        assert.equal(state.condition, state.scan < values.length);
        assert.equal(next.kind, state.condition ? 'compare' : 'swap-check');
      }
      if (['scan', 'compare', 'new-minimum', 'minimum'].includes(frame.kind)) {
        const lastExamined = frame.kind === 'minimum' ? state.start
          : frame.kind === 'new-minimum' ? state.scan : state.scan - 1;
        const examined = state.numbers.slice(state.start, lastExamined + 1);
        const minimum = Math.min(...examined);
        assert.ok(state.numbers[state.minIndex] === minimum);
        assert.equal(state.minIndex, state.start + examined.indexOf(minimum), 'keep the first equal minimum');
        assert.match(frame.scene.rows[0].cells[state.minIndex].marker, / · min/);
        assert.equal(frame.scene.rows[0].cells[state.minIndex].tone, 'found');
      }
      if (frame.kind === 'compare') {
        assert.ok(state.scan > state.start && state.scan < values.length);
        assert.ok(state.minIndex >= state.start && state.minIndex < state.scan);
        assert.equal(state.condition, state.numbers[state.scan] < state.numbers[state.minIndex]);
        assert.equal(frame.equation, `${state.numbers[state.scan]} < ${state.numbers[state.minIndex]} → ${state.condition}`);
        assert.equal(next.kind, state.condition ? 'new-minimum' : 'scan');
        if (!scans.has(state.start)) scans.set(state.start, []);
        scans.get(state.start).push(state.scan);
      }
      if (frame.kind === 'new-minimum') {
        assert.equal(frames[index - 1].kind, 'compare');
        assert.equal(frames[index - 1].state.condition, true);
        assert.equal(state.minIndex, state.scan);
        assert.equal(next.kind, 'scan');
      }
      if (frame.kind === 'swap-check') {
        assert.equal(state.condition, state.minIndex !== state.start);
        assert.equal(next.kind, state.condition ? 'swap' : 'pass');
      }
      if (frame.kind === 'swap') {
        assert.equal(frames[index - 1].kind, 'swap-check');
        const previous = frames[index - 1].state;
        assert.equal(previous.condition, true);
        const expectedValues = previous.numbers.slice();
        const expectedIds = previous.itemIds.slice();
        for (const array of [expectedValues, expectedIds]) {
          [array[state.start], array[state.minIndex]] = [array[state.minIndex], array[state.start]];
        }
        assert.deepEqual(state.numbers, expectedValues);
        assert.deepEqual(state.itemIds, expectedIds);
        assert.equal(state.fixedCount, state.start + 1);
        assert.equal(next.kind, 'pass');
      }
    }
    assert.equal(scans.size, Math.max(0, values.length - 1));
    for (let start = 0; start < values.length - 1; start++) {
      assert.deepEqual(scans.get(start), Array.from({ length: values.length - start - 1 }, (_, index) => start + index + 1));
    }
  }
});

test('sorted and equal arrays still use quadratic comparisons but skip all self-swaps', () => {
  for (let length = 0; length <= 16; length++) {
    for (const numbers of [Array.from({ length }, (_, index) => index), Array(length).fill(2)]) {
      const frames = lesson.build({ numbers });
      const final = frames.at(-1).state;
      assert.equal(final.comparisons, length * Math.max(0, length - 1) / 2);
      assert.equal(final.swaps, 0);
      assert.equal(frames.filter(frame => frame.kind === 'swap-check').length, Math.max(0, length - 1));
      assert.ok(frames.filter(frame => frame.kind === 'swap-check').every(frame => frame.state.condition === false));
      assert.equal(frames.filter(frame => frame.kind === 'new-minimum').length, 0);
    }
  }
  const worstSwaps = lesson.build({ numbers: [2, 3, 4, 5, 1] }).at(-1).state;
  assert.equal(worstSwaps.swaps, 4);
});

test('the instability example visibly reverses equal cards through one distant swap', () => {
  const preset = lesson.presets.find(preset => preset.id === 'unstable');
  const frames = lesson.build(lesson.parse(preset.input));
  const final = frames.at(-1).state;
  assert.deepEqual(final.result, [1, 2, 2]);
  assert.deepEqual(final.itemIds, ['item-2', 'item-1', 'item-0']);
  const swaps = frames.filter(frame => frame.kind === 'swap');
  assert.equal(swaps.length, 1);
  assert.match(swaps[0].explanation.en, /Card A jumps past equal-valued card B/);
  assert.match(swaps[0].explanation.ar, /الكارت A عدّى الكارت B/);
});

test('frames are deterministic, independent deep snapshots with complete bilingual UI data', () => {
  const input = { numbers: [4, 2, 4, 1] };
  const frames = lesson.build(input);
  const repeat = lesson.build(input);
  assert.deepEqual(frames, repeat);
  const seen = new WeakSet();
  function independent(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(!seen.has(value), 'no object reference is reused between or within frames');
    seen.add(value);
    for (const child of Object.values(value)) independent(child);
  }
  for (const frame of frames) {
    independent(frame);
    bilingual(frame.title);
    bilingual(frame.explanation);
    bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.equal(frame.scene.graph, null);
    assert.deepEqual(frame.scene.collections, []);
    for (const row of frame.scene.rows) bilingual(row.label);
    for (const variable of frame.variables) {
      assert.equal(typeof variable.name, 'string');
      assert.ok(['number', 'string'].includes(typeof variable.value));
      if (typeof variable.value === 'number') assert.ok(Number.isFinite(variable.value));
    }
    for (const metric of frame.metrics) {
      bilingual(metric.label);
      assert.ok(Number.isSafeInteger(metric.value));
    }
    assert.deepEqual(frame.metrics.map(metric => metric.value), [frame.state.comparisons, frame.state.swaps, frame.state.fixedCount]);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(frames)), frames);
  input.numbers[0] = 999;
  assert.deepEqual(frames, repeat);
  frames[0].state.numbers[0] = -999;
  frames[0].state.itemIds[0] = 'changed';
  frames[0].scene.rows[0].cells[0].value = -999;
  frames[0].scene.rows[0].label.en = 'changed';
  frames[0].metrics[0].label.ar = 'changed';
  frames[0].variables[0].value = -999;
  frames[0].lines.push(99);
  frames[0].title.en = 'changed';
  assert.deepEqual(frames.slice(1), repeat.slice(1));
  assert.deepEqual(lesson.build({ numbers: [4, 2, 4, 1] }), repeat);
  frames.at(-1).state.result[0] = -999;
  assert.deepEqual(frames.at(-1).state.numbers, [1, 2, 4, 4]);
});
