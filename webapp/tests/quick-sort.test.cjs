const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/quick-sort.js');

const clone = value => JSON.parse(JSON.stringify(value));
const trace = numbers => lesson.build({ numbers });
const linesByKind = {
  ready: [], start: [2], done: [3], enter: [4], 'base-check': [5],
  'base-return': [6], 'partition-call': [7, 11], 'partition-result': [7],
  'call-left': [8], 'call-right': [9], return: [10], pivot: [12],
  'boundary-start': [13], 'scan-start': [14], 'scan-check': [15],
  compare: [16], 'boundary-advance': [17], swap: [18],
  'scan-advance': [19], 'pivot-swap': [20], 'partition-return': [21],
};
const tones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);

function bilingual(value) {
  assert.deepEqual(Object.keys(value).sort(), ['ar', 'en']);
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.match(value.ar, /[\u0600-\u06ff]/);
}

function seededInputs() {
  let seed = 731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  return Array.from({ length: 68 }, (_, index) =>
    Array.from({ length: index % 17 }, () => index % 2 ? (random() % 9) - 4 : (random() % 1999) - 999));
}

test('exports a standalone classic module and preserves other registered lessons', () => {
  assert.equal(lesson.id, 'quick-sort');
  assert.equal(lesson.number, '06');
  assert.equal(lesson.category, 'sort');
  assert.equal(globalThis.AlgorithmLessons['quick-sort'], lesson);
  const existing = { id: 'existing' };
  const context = { AlgorithmLessons: { existing } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../lessons/quick-sort.js'), 'utf8'), context);
  assert.equal(context.AlgorithmLessons.existing, existing);
  const browserLesson = context.AlgorithmLessons['quick-sort'];
  assert.equal(browserLesson.id, lesson.id);
  assert.deepEqual(clone(browserLesson.build(browserLesson.parse({ numbers: '3, 1, 2' }))).at(-1).state.result, [1, 2, 3]);
});

test('lesson content, presets, and every frame follow the bilingual contract', () => {
  for (const name of ['description', 'note']) bilingual(lesson[name]);
  for (const name of ['title', 'intro', 'invariant']) bilingual(lesson.theory[name]);
  lesson.theory.steps.forEach(step => { bilingual(step.title); bilingual(step.body); });
  lesson.theory.notes.forEach(bilingual);
  lesson.theory.costs.forEach(cost => { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); });
  assert.equal(lesson.fields.length, 1);
  const field = lesson.fields[0];
  assert.equal(field.name, 'numbers');
  assert.equal(field.type, 'text');
  bilingual(field.label);
  bilingual(field.help);
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(!/\bkey\b/.test(lesson.code.join('\n')));
  assert.equal(lesson.code[11].trim(), 'value = numbers[right]');
  assert.equal(lesson.code[15].trim(), 'if numbers[scan] <= value:');
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.deepEqual(lesson.presets.find(preset => preset.id === 'default').input, lesson.defaults);
  const kinds = new Set();
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    assert.equal(typeof preset.input.numbers, 'string');
    const input = lesson.parse(preset.input);
    bilingual(lesson.summary(input));
    for (const frame of lesson.build(input)) {
      kinds.add(frame.kind);
      assert.deepEqual(Object.keys(frame).sort(),
        ['equation', 'explanation', 'kind', 'lines', 'metrics', 'scene', 'state', 'title', 'variables']);
      bilingual(frame.title);
      bilingual(frame.explanation);
      assert.equal(typeof frame.equation, 'string');
      assert.deepEqual(frame.lines, linesByKind[frame.kind], frame.kind);
      assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
      assert.equal(typeof frame.state.done, 'boolean');
      assert.ok(Object.hasOwn(frame.state, 'result'));
      const vars = Object.fromEntries(frame.variables.map(variable => [variable.name, variable.value]));
      for (const name of ['left', 'right', 'value', 'pivotIndex', 'boundary', 'scan', 'p', 'condition']) {
        assert.equal(vars[name], frame.state[name] === null ? '—' : frame.state[name]);
      }
      assert.equal(vars['sort depth'], frame.state.callStack.length);
      frame.metrics.forEach(metric => { bilingual(metric.label); assert.ok(Number.isSafeInteger(metric.value)); });
      assert.deepEqual(frame.metrics.map(metric => metric.value),
        ['comparisons', 'swaps', 'selfSwaps', 'partitions', 'maxDepth'].map(name => frame.state[name]));
      assert.equal(frame.scene.graph, null);
      assert.equal(frame.scene.rows.length, 1);
      const row = frame.scene.rows[0];
      assert.equal(row.id, 'numbers');
      assert.equal(row.layout, 'cards');
      bilingual(row.label);
      assert.equal(row.cells.length, input.numbers.length);
      assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
      for (const [index, cell] of row.cells.entries()) {
        assert.equal(cell.id, frame.state.slots[index]);
        assert.equal(cell.value, frame.state.numbers[index]);
        assert.equal(cell.index, index);
        assert.ok(tones.has(cell.tone));
        assert.equal(typeof cell.marker, 'string');
        if (frame.state.finalized.includes(index)) assert.equal(cell.tone, 'sorted');
        if (frame.state.finalizedPivots.includes(index)) assert.ok(cell.marker.includes('pivot ✓'));
        if (index === frame.state.scan) assert.ok(cell.marker.includes('scan'));
        if (index === frame.state.boundary) assert.ok(cell.marker.includes('boundary'));
        if (index === frame.state.pivotIndex && !frame.state.partitioned) assert.equal(cell.tone, 'pivot');
      }
      bilingual(frame.scene.note);
      frame.scene.collections.forEach(collection => {
        bilingual(collection.label);
        assert.ok(collection.values.every(value => typeof value === 'string'));
      });
      assert.equal(frame.scene.collections[0].values.length, frame.state.callStack.length);
      assert.equal(frame.scene.collections[1].values.length, frame.state.pendingRanges.length);
      assert.deepEqual(frame.scene.collections[2].values, frame.state.finalizedPivots.map(String));
      assert.deepEqual(clone(frame), frame, 'frames must be losslessly JSON serializable');
    }
  }
  assert.deepEqual([...kinds].sort(), Object.keys(linesByKind).sort(), 'presets exercise every kind of operation');
});

test('parsing accepts the documented syntax, Arabic digits, boundaries, and empty input', () => {
  const cases = [
    ['', []], [' \n\t ', []], ['7', [7]],
    [' +999, -999, 0, -0 ', [999, -999, 0, 0]],
    ['٧، ٣، ۵، -٢', [7, 3, 5, -2]],
    ['1 2\n3\t-4', [1, 2, 3, -4]], ['1 , 2، +3  -4', [1, 2, 3, -4]],
    [Array(16).fill('999').join(', '), Array(16).fill(999)],
  ];
  for (const [numbers, expected] of cases) {
    const raw = Object.freeze({ numbers });
    assert.deepEqual(lesson.parse(raw), { numbers: expected });
    assert.deepEqual(lesson.build(lesson.parse(raw)).at(-1).state.result, [...expected].sort((a, b) => a - b));
  }
});

test('parse and build reject excessive, malformed, out-of-range, and sparse inputs with bilingual errors', () => {
  const hasMessage = error => {
    assert.ok(error instanceof Error);
    bilingual(error.userMessage);
    return true;
  };
  for (const numbers of [
    '1,,2', ',1', '1,', '1, ,2', '،', '1.5,2', '1e2', '0x10',
    'Infinity', 'NaN', '1000', '-1000', '9007199254740992', '1;2',
    'one', '<script>', '[1,2]', '--1', '+ 2', Array(17).fill(1).join(','),
    ' '.repeat(lesson.fields[0].maxLength + 1),
  ]) assert.throws(() => lesson.parse({ numbers }), hasMessage, numbers);
  for (const raw of [undefined, null, {}, [], '1,2', { numbers: [1, 2] }, { numbers: 1 }]) {
    assert.throws(() => lesson.parse(raw), hasMessage);
  }
  for (const input of [
    undefined, null, {}, [], [1, 2], { numbers: '1,2' }, { numbers: new Int16Array([1, 2]) },
    ...[[NaN], [Infinity], [-Infinity], [1.5], [1000], [-1000], [Number.MAX_SAFE_INTEGER],
      ['1'], [null], [undefined], [true], [1n], Array(2), Array(17).fill(0)]
      .map(numbers => ({ numbers })),
  ]) {
    assert.throws(() => lesson.build(input), hasMessage);
    assert.throws(() => lesson.summary(input), hasMessage);
  }
});

test('sorts presets and seeded arrays without mutation, preserving identity and partition invariants', () => {
  const inputs = [...lesson.presets.map(preset => lesson.parse(preset.input).numbers), ...seededInputs()];
  for (const numbers of inputs) {
    const original = [...numbers];
    const input = Object.freeze({ numbers: Object.freeze([...numbers]) });
    const frames = lesson.build(input);
    const expected = [...numbers].sort((a, b) => a - b);
    assert.ok(frames.length >= 6 && frames.length < 2000);
    assert.equal(frames[0].kind, 'ready');
    assert.deepEqual(frames[0].state.numbers, original);
    assert.equal(frames[0].state.left, null);
    assert.deepEqual(frames.at(-1).state.result, expected);
    assert.deepEqual(frames.at(-1).state.numbers, expected);
    assert.deepEqual(frames.at(-1).state.finalized, numbers.map((_, index) => index));
    assert.deepEqual(input.numbers, original);
    const ids = numbers.map((_, index) => `item-${index}`).sort();
    const finalizedIds = new Map();
    for (const [step, frame] of frames.entries()) {
      const state = frame.state;
      assert.equal(state.done, step === frames.length - 1);
      if (!state.done) assert.equal(state.result, null);
      assert.deepEqual([...state.slots].sort(), ids, 'every card exists exactly once');
      state.slots.forEach((id, index) => assert.equal(state.numbers[index], original[Number(id.slice(5))]));
      for (const [index, id] of finalizedIds) assert.equal(state.slots[index], id, 'final cards never move again');
      assert.equal(new Set(state.finalized).size, state.finalized.length);
      assert.equal(new Set(state.finalizedPivots).size, state.finalizedPivots.length);
      for (const index of state.finalized) {
        assert.equal(state.numbers[index], expected[index]);
        finalizedIds.set(index, state.slots[index]);
      }
      for (const index of state.finalizedPivots) assert.ok(state.finalized.includes(index));
      if (state.pivotId !== null) {
        assert.equal(state.slots[state.pivotIndex], state.pivotId);
        assert.equal(state.numbers[state.pivotIndex], state.value);
      }
      if (frame.kind === 'scan-check') {
        assert.ok(state.left <= state.scan && state.scan <= state.right);
        assert.ok(state.left - 1 <= state.boundary && state.boundary < state.scan);
        assert.equal(state.pivotIndex, state.right);
        assert.equal(state.condition, state.scan < state.right);
        assert.ok(state.numbers.slice(state.left, state.boundary + 1).every(value => value <= state.value));
        assert.ok(state.numbers.slice(state.boundary + 1, state.scan).every(value => value > state.value));
      }
      if (frame.kind === 'compare') {
        assert.ok(state.scan >= state.left && state.scan < state.right);
        assert.equal(state.condition, state.numbers[state.scan] <= state.value);
      }
      if (frame.kind === 'partition-return') {
        assert.equal(state.pivotIndex, state.boundary + 1);
        assert.ok(state.numbers.slice(state.left, state.pivotIndex).every(value => value <= state.value));
        assert.ok(state.numbers.slice(state.pivotIndex + 1, state.right + 1).every(value => value > state.value));
        assert.ok(state.finalizedPivots.includes(state.pivotIndex));
      }
      if (frame.kind === 'return') {
        const segment = state.numbers.slice(state.left, state.right + 1);
        assert.deepEqual(segment, [...segment].sort((a, b) => a - b));
      }
      if (step === 0) continue;
      const previous = frames[step - 1].state;
      assert.equal(state.comparisons - previous.comparisons, frame.kind === 'compare' ? 1 : 0);
      assert.equal(state.partitions - previous.partitions, frame.kind === 'partition-call' ? 1 : 0);
      assert.equal(state.calls - previous.calls, frame.kind === 'enter' ? 1 : 0);
      if (state.swap) {
        const { from, to, moved, idsBefore, valuesBefore, purpose } = state.swap;
        assert.ok(from >= state.left && from <= state.right);
        assert.ok(to >= state.left && to <= state.right);
        assert.equal(from, purpose === 'pivot' ? state.boundary + 1 : state.boundary);
        assert.equal(to, purpose === 'pivot' ? state.right : state.scan);
        assert.equal(frame.kind, purpose === 'pivot' ? 'pivot-swap' : 'swap');
        assert.equal(moved, from !== to);
        assert.deepEqual(idsBefore, [previous.slots[from], previous.slots[to]]);
        assert.deepEqual(valuesBefore, [previous.numbers[from], previous.numbers[to]]);
        const nextSlots = [...previous.slots];
        [nextSlots[from], nextSlots[to]] = [nextSlots[to], nextSlots[from]];
        assert.deepEqual(state.slots, nextSlots, 'each movement is exactly the highlighted swap');
        assert.equal(state.swaps - previous.swaps, moved ? 1 : 0);
        assert.equal(state.selfSwaps - previous.selfSwaps, moved ? 0 : 1);
      } else {
        assert.deepEqual(state.slots, previous.slots, 'cards move only on a swap line');
        assert.deepEqual(state.numbers, previous.numbers);
        assert.equal(state.swaps, previous.swaps);
        assert.equal(state.selfSwaps, previous.selfSwaps);
      }
      if (frame.kind === 'boundary-advance') {
        assert.equal(state.boundary, previous.boundary + 1);
        assert.equal(frames[step - 1].kind, 'compare');
        assert.equal(previous.condition, true);
        assert.equal(frames[step + 1].kind, 'swap');
      }
      if (frame.kind === 'scan-advance') assert.equal(state.scan, previous.scan + 1);
    }
    assert.equal(frames.at(-1).state.comparisons,
      frames.filter(frame => frame.kind === 'partition-call').reduce((count, frame) => count + frame.state.right - frame.state.left, 0));
  }
});

test('call stack and pending ranges represent actual left-first recursion including empty calls', () => {
  for (const numbers of [...lesson.presets.map(preset => lesson.parse(preset.input).numbers), ...seededInputs().slice(0, 17)]) {
    const frames = trace(numbers);
    let observedDepth = 0;
    for (const [step, frame] of frames.entries()) {
      const state = frame.state;
      observedDepth = Math.max(observedDepth, state.callStack.length);
      assert.equal(state.maxDepth, observedDepth);
      assert.ok(state.maxDepth <= Math.max(1, numbers.length));
      for (const [index, call] of state.callStack.entries()) {
        assert.ok(call.left >= 0 && call.left <= numbers.length);
        assert.ok(call.right >= -1 && call.right < numbers.length);
        if (!index) continue;
        const parent = state.callStack[index - 1];
        assert.ok(parent.p !== null);
        assert.ok(state.finalizedPivots.includes(parent.p));
        if (parent.phase === 'left') {
          assert.equal(call.left, parent.left);
          assert.equal(call.right, parent.p - 1);
        } else {
          assert.equal(parent.phase, 'right');
          assert.equal(call.left, parent.p + 1);
          assert.equal(call.right, parent.right);
        }
      }
      if (state.callStack.length) {
        assert.equal(state.left, state.callStack.at(-1).left);
        assert.equal(state.right, state.callStack.at(-1).right);
      }
      const pendingIndices = new Set();
      for (const range of state.pendingRanges) {
        assert.ok(range.left >= 0 && range.left <= numbers.length);
        assert.ok(range.right >= -1 && range.right < numbers.length);
        for (let index = range.left; index <= range.right; index++) {
          assert.ok(!pendingIndices.has(index), 'pending ranges do not overlap');
          assert.ok(!state.finalized.includes(index), 'no pending call includes a final position');
          pendingIndices.add(index);
        }
      }
      if (!step) continue;
      const previous = frames[step - 1];
      if (frame.kind === 'enter') {
        assert.equal(state.callStack.length, previous.state.callStack.length + 1);
        assert.deepEqual(previous.state.pendingRanges[0], { left: state.left, right: state.right });
        assert.deepEqual(state.pendingRanges, previous.state.pendingRanges.slice(1));
      } else {
        const returning = ['return', 'base-return'].includes(previous.kind);
        assert.equal(state.callStack.length, previous.state.callStack.length - (returning ? 1 : 0));
        if (frame.kind === 'partition-result') {
          assert.deepEqual(state.pendingRanges, [
            { left: state.left, right: state.p - 1 },
            { left: state.p + 1, right: state.right },
            ...previous.state.pendingRanges,
          ]);
        } else assert.deepEqual(state.pendingRanges, previous.state.pendingRanges);
      }
      if (frame.kind === 'call-left') assert.equal(state.callStack.at(-1).phase, 'left');
      if (frame.kind === 'call-right') assert.equal(state.callStack.at(-1).phase, 'right');
    }
    assert.deepEqual(frames.at(-1).state.callStack, []);
    assert.deepEqual(frames.at(-1).state.pendingRanges, []);
  }
});

test('operation counts demonstrate quadratic last-pivot cases and balanced recursion', () => {
  for (const size of [0, 1, 2, 6, 16]) {
    const sorted = Array.from({ length: size }, (_, index) => index);
    for (const numbers of [sorted, [...sorted].reverse(), Array(size).fill(4)]) {
      const state = trace(numbers).at(-1).state;
      assert.equal(state.comparisons, size < 2 ? 0 : size * (size - 1) / 2);
      assert.equal(state.partitions, Math.max(0, size - 1));
      assert.equal(state.maxDepth, Math.max(1, size));
      assert.equal(state.calls, 2 * state.partitions + 1);
    }
    const state = trace(sorted).at(-1).state;
    assert.equal(state.swaps, 0);
    assert.equal(state.selfSwaps, size < 2 ? 0 : size * (size + 1) / 2 - 1);
  }
  const balanced = trace([1, 3, 2, 6, 5, 7, 4]).at(-1).state;
  assert.equal(balanced.comparisons, 10);
  assert.equal(balanced.partitions, 3);
  assert.equal(balanced.maxDepth, 3);
  const example = lesson.build(lesson.parse(lesson.defaults)).at(-1).state;
  assert.equal(example.comparisons, 13);
  assert.equal(example.swaps, 11);
  assert.equal(example.selfSwaps, 0);
});

test('duplicate card identities expose instability even though self-swaps move nothing', () => {
  const frames = trace([2, 2, 1]);
  const firstPivotSwap = frames.find(frame => frame.kind === 'pivot-swap');
  assert.deepEqual(firstPivotSwap.state.swap.idsBefore, ['item-0', 'item-2']);
  assert.deepEqual(frames.at(-1).state.result, [1, 2, 2]);
  assert.deepEqual(frames.at(-1).state.slots, ['item-2', 'item-1', 'item-0']);
  const duplicateFrames = trace([2, 3, 2, 1, 2]);
  assert.deepEqual(duplicateFrames.at(-1).state.result, [1, 2, 2, 2, 3]);
  assert.equal(new Set(duplicateFrames.at(-1).state.slots).size, 5);
  const allEqual = trace([4, 4, 4, 4]);
  assert.equal(allEqual.at(-1).state.swaps, 0);
  assert.ok(allEqual.at(-1).state.selfSwaps > 0);
  assert.ok(allEqual.filter(frame => frame.kind === 'compare').every(frame => frame.state.condition));
});

test('snapshots and successive builds share no mutable objects, including nested scenes and stack records', () => {
  const raw = clone(lesson.defaults);
  const input = lesson.parse(raw);
  const frames = lesson.build(input);
  const pristine = clone(frames);
  assert.deepEqual(lesson.build(input), pristine, 'trace generation is deterministic');
  const seen = new WeakSet();
  function independent(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(!seen.has(value), 'no object is reused across snapshot branches or frames');
    seen.add(value);
    Object.values(value).forEach(independent);
  }
  frames.forEach(independent);
  input.numbers[0] = 999;
  raw.numbers = '0';
  assert.deepEqual(frames, pristine, 'changing input after build cannot change snapshots');
  const index = frames.findIndex(frame => frame.kind === 'swap');
  const frame = frames[index];
  frame.state.numbers[0] = 999;
  frame.state.slots[0] = 'changed';
  frame.state.swap.idsBefore[0] = 'changed';
  frame.state.callStack[0].phase = 'changed';
  frame.scene.rows[0].cells[0].id = 'changed';
  frame.scene.collections[0].values.push('changed');
  frame.title.en = 'changed';
  frame.lines[0] = 999;
  frame.metrics[0].label.en = 'changed';
  for (let other = 0; other < frames.length; other++) {
    if (other !== index) assert.deepEqual(frames[other], pristine[other]);
  }
  frames.at(-1).state.result[0] = 999;
  assert.deepEqual(frames.at(-1).state.numbers, pristine.at(-1).state.numbers);
  assert.deepEqual(lesson.build(lesson.parse(lesson.defaults)), pristine, 'mutating a returned trace cannot contaminate another build');
});
