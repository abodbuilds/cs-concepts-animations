const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const lesson = require('../lessons/merge-sort.js');

const stableOrder = numbers => numbers.map((value, index) => ({ value, id: `item-${index}`, index }))
  .sort((a, b) => a.value - b.value || a.index - b.index);
const top = frame => frame.state.stack.at(-1);
const validTones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);
const linesByKind = {
  ready: [], allocate: [2], done: [4], 'base-check': [6], 'base-return': [6], split: [7],
  'merge-call': [10], 'range-return': [11], 'merge-init': [13], 'merge-check': [14],
  compare: [15], 'advance-left': [17], 'take-right': [18], 'advance-right': [20],
  'advance-write': [21], 'left-check': [22], 'advance-left-remainder': [24],
  'right-check': [25], 'advance-right-remainder': [27], 'copy-index': [28],
  'copy-back': [29], 'merge-return': [30],
};

function bilingual(text) {
  assert.equal(typeof text.en, 'string');
  assert.ok(text.en.trim().length);
  assert.equal(typeof text.ar, 'string');
  assert.match(text.ar, /[\u0600-\u06ff]/u);
}

function userError(action) {
  assert.throws(action, error => {
    assert.ok(error instanceof Error);
    bilingual(error.userMessage);
    return true;
  });
}

test('exports a standalone classic module and the complete lesson contract', () => {
  assert.equal(lesson, globalThis.AlgorithmLessons['merge-sort']);
  const source = fs.readFileSync(path.join(__dirname, '../lessons/merge-sort.js'), 'utf8');
  const existingLesson = { id: 'existing' };
  const context = vm.createContext({ AlgorithmLessons: { existing: existingLesson } });
  vm.runInContext(source, context);
  assert.equal(context.AlgorithmLessons.existing, existingLesson);
  assert.equal(context.AlgorithmLessons['merge-sort'].id, 'merge-sort');
  const browserLesson = context.AlgorithmLessons['merge-sort'];
  const browserResult = browserLesson.build(browserLesson.parse({ numbers: '3, 1, 2' })).at(-1).state.result;
  assert.deepEqual(Array.from(browserResult), [1, 2, 3]);

  assert.equal(lesson.id, 'merge-sort');
  assert.equal(lesson.number, '05');
  assert.equal(lesson.category, 'sort');
  assert.equal(lesson.name, 'Merge Sort');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(lesson.cost, 'O(n log n)');
  bilingual(lesson.description);
  bilingual(lesson.note);
  assert.equal(lesson.fields.length, 1);
  assert.equal(lesson.fields[0].name, 'numbers');
  assert.equal(lesson.fields[0].type, 'text');
  bilingual(lesson.fields[0].label);
  bilingual(lesson.fields[0].help);
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.doesNotMatch(lesson.code.join('\n'), /\bkey\b/u);
  for (const name of ['title', 'intro', 'invariant']) bilingual(lesson.theory[name]);
  assert.ok(lesson.theory.steps.length >= 3);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  for (const note of lesson.theory.notes) bilingual(note);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  assert.match(lesson.theory.invariant.en, /equality/u);
  assert.match(lesson.theory.notes.map(note => note.en).join(' '), /snapshots/u);
});

test('parses bounded integers, Arabic digits, mixed delimiters, and empty input', () => {
  for (const [text, expected] of [
    ['', []], [' \n\t ', []], ['٧، ٣، ۵، -٢', [7, 3, 5, -2]],
    ['-999 +999 0', [-999, 999, 0]], ['1 , 2\n-3\t4، +5', [1, 2, -3, 4, 5]],
    ['+0, -0', [0, -0]], ['0002 -001', [2, -1]],
    [Array.from({ length: 16 }, (_, index) => index - 8).join(','), Array.from({ length: 16 }, (_, index) => index - 8)],
  ]) {
    const raw = Object.freeze({ numbers: text });
    assert.deepEqual(lesson.parse(raw), { numbers: expected });
    assert.equal(raw.numbers, text);
  }
});

test('rejects malformed text and enforces the same numeric limits in build', () => {
  for (const numbers of [
    '1,,2', ',1', '1,', '1, ,2', '،', ',', '1;2', '1.5', '1e2', '0x10',
    '--2', '+ 2', 'NaN', 'Infinity', '-Infinity', '1000', '-1000', '٩٩٩٩',
    '9007199254740992', '<script>', '2 apples', '1'.repeat(257), ' '.repeat(257),
    Array(17).fill('1').join(','),
  ]) userError(() => lesson.parse({ numbers }));
  for (const raw of [undefined, null, [], '1,2', {}, { numbers: null }, { numbers: [1, 2] }, { numbers: 12 }]) {
    userError(() => lesson.parse(raw));
  }
  for (const input of [
    undefined, null, [], [1, 2], '1,2', {}, { numbers: '1,2' }, { numbers: new Int16Array([1]) },
    { numbers: [1.1] }, { numbers: [NaN] }, { numbers: [Infinity] }, { numbers: [1000] },
    { numbers: [-1000] }, { numbers: [Number.MAX_SAFE_INTEGER + 1] }, { numbers: ['1'] },
    { numbers: [null] }, { numbers: [true] }, { numbers: [1n] }, { numbers: Array(1) },
    { numbers: [1, , 2] }, { numbers: Array(17).fill(0) },
  ]) {
    userError(() => lesson.build(input));
    userError(() => lesson.summary(input));
  }
});

test('every preset is meaningful, valid, and accurately summarized', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.deepEqual(lesson.presets.find(preset => preset.id === 'default').input, lesson.defaults);
  const lengths = [];
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    assert.equal(typeof preset.input.numbers, 'string');
    const parsed = lesson.parse(preset.input);
    lengths.push(parsed.numbers.length);
    bilingual(lesson.summary(parsed));
    assert.match(lesson.summary(parsed).en, new RegExp(`^${parsed.numbers.length} cards`));
    const result = lesson.build(parsed).at(-1).state.result;
    assert.deepEqual(result, stableOrder(parsed.numbers).map(item => item.value));
  }
  assert.ok(lengths.includes(0));
  assert.ok(lengths.includes(1));
});

test('sorts seeded random arrays stably, preserving every original card and input', () => {
  let seed = 0x51ab;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const inputs = [
    [], [4], [2, 1], [-999, 999, 0, -999], [2, 1, 2, 1], [0, -0, 0, -0],
    Array(16).fill(3), Array.from({ length: 16 }, (_, index) => index),
    Array.from({ length: 16 }, (_, index) => 16 - index),
  ];
  for (let index = 0; index < 68; index++) {
    inputs.push(Array.from({ length: index % 17 }, () => (random() % 11) - 5));
  }
  for (const numbers of inputs) {
    const original = numbers.slice();
    const input = Object.freeze({ numbers: Object.freeze(numbers) });
    const frames = lesson.build(input), end = frames.at(-1).state;
    const expected = stableOrder(original);
    assert.deepEqual(end.result, expected.map(item => item.value));
    assert.deepEqual(end.numbers, end.result);
    assert.deepEqual(end.slots, expected.map(item => item.id));
    assert.deepEqual(input.numbers, original);
    assert.equal(frames[0].kind, 'ready');
    assert.equal(frames[0].state.done, false);
    assert.equal(frames[0].state.result, null);
    assert.deepEqual(frames[0].state.numbers, original);
    assert.deepEqual(frames[0].state.buffer, []);
    assert.deepEqual(end.stack, []);
    assert.equal(end.done, true);
    assert.equal(end.merges, Math.max(0, original.length - 1));
    assert.equal(end.calls, original.length ? 2 * original.length - 1 : 1);
    assert.ok(frames.length <= 700, 'the maximum supported input has a bounded teaching trace');
    for (const frame of frames) {
      const state = frame.state;
      assert.deepEqual(state.original, original);
      const mainIds = state.slots.filter(id => id !== null);
      assert.equal(new Set(mainIds).size, mainIds.length);
      for (let index = 0; index < original.length; index++) {
        const id = `item-${index}`;
        const mainIndex = state.slots.indexOf(id);
        const scratchIndex = state.bufferSlots.findIndex((slot, at) => slot === id && state.bufferValid[at]);
        assert.ok(mainIndex !== -1 || scratchIndex !== -1, 'each original card survives in the array or valid buffer');
        if (mainIndex !== -1) assert.equal(state.numbers[mainIndex], original[index]);
        if (scratchIndex !== -1) assert.equal(state.buffer[scratchIndex], original[index]);
      }
      if (['base-return', 'merge-return', 'range-return'].includes(frame.kind)) {
        const { left, right } = state.operation;
        const expectedRange = expected.filter(item => item.index >= left && item.index < right);
        assert.deepEqual(state.numbers.slice(left, right), expectedRange.map(item => item.value));
        assert.deepEqual(state.slots.slice(left, right), expectedRange.map(item => item.id));
      }
      if (frame.kind !== 'done') assert.equal(state.done, false);
    }
  }
});

test('every merge write and copy back is a single truthful operation, with exact counters', () => {
  const inputs = [[3, 1, 2], [2, 1, 2, 1], [1, 2, 3, 4], [4, 3, 2, 1], [-5], [],
    lesson.parse(lesson.defaults).numbers];
  for (const numbers of inputs) {
    const frames = lesson.build({ numbers });
    let comparisons = 0, bufferWrites = 0, copyBacks = 0, merges = 0, maxDepth = 0;
    let activeMerge = null;
    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index], state = frame.state, previous = frames[index - 1]?.state;
      const operation = state.operation, call = top(frame);
      maxDepth = Math.max(maxDepth, state.stack.length);
      if (frame.kind === 'merge-call') {
        const { left, middle, right } = operation;
        assert.deepEqual(state.numbers.slice(left, middle), [...state.numbers.slice(left, middle)].sort((a, b) => a - b));
        assert.deepEqual(state.numbers.slice(middle, right), [...state.numbers.slice(middle, right)].sort((a, b) => a - b));
        assert.ok(state.bufferValid.every(valid => !valid));
        activeMerge = { left, right, written: 0, copied: 0,
          expected: stableOrder(numbers).filter(item => item.index >= left && item.index < right) };
      }
      if (frame.kind === 'compare') {
        comparisons++;
        assert.ok(call.i >= call.left && call.i < call.middle);
        assert.ok(call.j >= call.middle && call.j < call.right);
        assert.equal(operation.leftIndex, call.i);
        assert.equal(operation.rightIndex, call.j);
        assert.equal(operation.leftValue, state.numbers[call.i]);
        assert.equal(operation.rightValue, state.numbers[call.j]);
        assert.equal(state.condition, state.numbers[call.i] <= state.numbers[call.j]);
        assert.equal(operation.take, state.condition ? 'left' : 'right');
        assert.equal(frames[index - 1].kind, 'merge-check');
        assert.equal(frames[index - 1].state.condition, true);
        assert.equal(frame.equation, `${operation.leftValue} <= ${operation.rightValue} → ${state.condition}`);
        const write = frames[index + (state.condition ? 1 : 2)];
        assert.equal(write.kind, 'buffer-write');
        assert.equal(write.state.operation.side, operation.take);
      }
      if (frame.kind === 'buffer-write') {
        bufferWrites++;
        assert.equal(operation.to, activeMerge.left + activeMerge.written);
        assert.equal(operation.to, call.write);
        assert.equal(operation.from, operation.side === 'left' ? call.i : call.j);
        assert.ok(operation.from >= (operation.side === 'left' ? call.left : call.middle));
        assert.ok(operation.from < (operation.side === 'left' ? call.middle : call.right));
        assert.equal(operation.value, previous.numbers[operation.from]);
        assert.equal(operation.id, previous.slots[operation.from]);
        assert.equal(operation.id, activeMerge.expected[activeMerge.written].id);
        assert.equal(state.buffer[operation.to], operation.value);
        assert.equal(state.bufferSlots[operation.to], operation.id);
        assert.equal(state.bufferValid[operation.to], true);
        for (let slot = 0; slot < numbers.length; slot++) {
          if (slot !== operation.to) assert.equal(state.buffer[slot], previous.buffer[slot]);
        }
        if (operation.reason === 'remainder') {
          assert.ok(operation.side === 'left' ? call.j === call.right : call.i === call.middle);
        }
        activeMerge.written++;
        assert.deepEqual(state.buffer.slice(activeMerge.left, activeMerge.left + activeMerge.written),
          activeMerge.expected.slice(0, activeMerge.written).map(item => item.value));
      } else if (previous && frame.kind !== 'allocate') {
        assert.deepEqual(state.buffer, previous.buffer, 'only allocation and buffer-write may modify buffer memory');
      }
      if (frame.kind === 'copy-back') {
        copyBacks++;
        assert.equal(activeMerge.written, activeMerge.right - activeMerge.left, 'the entire merge is buffered before any overwrite');
        assert.equal(operation.to, activeMerge.left + activeMerge.copied);
        assert.equal(operation.from, operation.to);
        assert.equal(state.numbers[operation.to], previous.buffer[operation.from]);
        assert.equal(operation.id, activeMerge.expected[activeMerge.copied].id);
        assert.equal(state.slots[operation.to], operation.id);
        assert.equal(frames[index - 1].kind, 'copy-index');
        assert.equal(frames[index - 1].state.condition, true);
        for (let slot = 0; slot < numbers.length; slot++) {
          if (slot !== operation.to) assert.equal(state.numbers[slot], previous.numbers[slot]);
        }
        activeMerge.copied++;
        assert.deepEqual(state.slots.slice(activeMerge.left, activeMerge.left + activeMerge.copied),
          activeMerge.expected.slice(0, activeMerge.copied).map(item => item.id));
      } else if (previous) {
        assert.deepEqual(state.numbers, previous.numbers, 'only copy-back may change the array');
      }
      if (frame.kind === 'merge-return') {
        merges++;
        assert.equal(activeMerge.copied, activeMerge.right - activeMerge.left);
        activeMerge = null;
      }
      assert.equal(state.comparisons, comparisons);
      assert.equal(state.bufferWrites, bufferWrites);
      assert.equal(state.copyBacks, copyBacks);
      assert.equal(state.merges, merges);
      assert.equal(state.maxDepth, maxDepth);
      assert.equal(state.auxiliarySlots, frame.kind === 'ready' ? 0 : numbers.length);
      assert.deepEqual(frame.metrics.map(metric => metric.value),
        [comparisons, bufferWrites, copyBacks, merges, maxDepth, state.auxiliarySlots]);
    }
    assert.equal(bufferWrites, copyBacks);
  }
});

test('tie handling is stable across halves, and both remainder paths are shown', () => {
  const ties = lesson.build({ numbers: [2, 1, 2, 1] });
  const equalComparisons = ties.filter(frame => frame.kind === 'compare' &&
    frame.state.operation.leftValue === frame.state.operation.rightValue);
  assert.equal(equalComparisons.length, 2);
  for (const frame of equalComparisons) {
    assert.equal(frame.state.operation.take, 'left');
    assert.equal(frame.state.condition, true);
    assert.match(frame.explanation.en, /original input/u);
    assert.match(frame.explanation.ar, /الأصلي/u);
  }
  assert.deepEqual(ties.at(-1).state.slots, ['item-1', 'item-3', 'item-0', 'item-2']);
  for (const [numbers, side] of [[[1, 2], 'right'], [[2, 1], 'left']]) {
    const frames = lesson.build({ numbers });
    const remainder = frames.filter(frame => frame.kind === 'buffer-write' && frame.state.operation.reason === 'remainder');
    assert.equal(remainder.length, 1);
    assert.equal(remainder[0].state.operation.side, side);
    assert.equal(frames.at(-1).state.comparisons, 1);
  }
  for (const numbers of [[], [9]]) {
    const frames = lesson.build({ numbers });
    assert.equal(frames.at(-1).state.comparisons, 0);
    assert.equal(frames.at(-1).state.bufferWrites, 0);
    assert.equal(frames.at(-1).state.copyBacks, 0);
    assert.ok(!frames.some(frame => frame.kind === 'compare' || frame.kind === 'merge-call'));
    assert.deepEqual(frames[0].scene.rows[0].cells.map(cell => cell.value), numbers);
  }
});

test('pseudocode lines, range boundaries, and the call stack agree with every operation', () => {
  for (const numbers of [[], [5], [3, 1, 2], [5, 4, 3, 2, 1], Array(16).fill(2)]) {
    const frames = lesson.build({ numbers });
    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index], state = frame.state, operation = state.operation;
      const call = top(frame), previous = frames[index - 1];
      assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
      if (frame.kind === 'call') {
        const parent = state.stack.at(-2);
        assert.deepEqual(frame.lines, [parent ? parent.phase === 'wait-left' ? 8 : 9 : 3]);
      } else if (frame.kind === 'buffer-write') {
        assert.deepEqual(frame.lines, [operation.reason === 'comparison' ?
          operation.side === 'left' ? 16 : 19 : operation.side === 'left' ? 23 : 26]);
      } else {
        assert.deepEqual(frame.lines, linesByKind[frame.kind], `unknown or mislabeled operation: ${frame.kind}`);
      }
      for (let depth = 0; depth < state.stack.length; depth++) {
        const entry = state.stack[depth], parent = state.stack[depth - 1];
        assert.ok(0 <= entry.left && entry.left <= entry.right && entry.right <= numbers.length);
        if (entry.middle !== null) assert.ok(entry.left < entry.middle && entry.middle < entry.right);
        if (parent) {
          assert.equal(parent.routine, 'sortRange');
          if (entry.routine === 'merge') {
            assert.equal(entry.left, parent.left); assert.equal(entry.right, parent.right);
            assert.equal(entry.middle, parent.middle);
          } else if (parent.phase === 'wait-left') {
            assert.equal(entry.left, parent.left); assert.equal(entry.right, parent.middle);
          } else {
            assert.equal(parent.phase, 'wait-right');
            assert.equal(entry.left, parent.middle); assert.equal(entry.right, parent.right);
          }
        }
      }
      if (previous) {
        const delta = ['call', 'merge-call'].includes(frame.kind) ? 1 :
          ['base-return', 'range-return', 'merge-return'].includes(frame.kind) ? -1 : 0;
        assert.equal(state.stack.length, previous.state.stack.length + delta);
      }
      if (frame.kind === 'split') {
        assert.equal(call.middle, Math.floor((call.left + call.right) / 2));
      } else if (frame.kind === 'base-check') {
        assert.equal(state.condition, call.right - call.left <= 1);
      } else if (frame.kind === 'merge-check') {
        assert.equal(state.condition, call.i < call.middle && call.j < call.right);
        assert.equal(frames[index + 1].kind, state.condition ? 'compare' : 'left-check');
      } else if (frame.kind === 'left-check' || frame.kind === 'right-check') {
        assert.equal(state.condition, operation.cursor < operation.end);
        assert.equal(frames[index + 1].kind, state.condition ? 'buffer-write' : frame.kind === 'left-check' ? 'right-check' : 'copy-index');
      } else if (frame.kind === 'copy-index') {
        assert.equal(state.condition, operation.index < operation.right);
        assert.equal(frames[index + 1].kind, state.condition ? 'copy-back' : 'merge-return');
      }
      assert.equal(frame.variables.find(variable => variable.name === 'n').value, numbers.length);
      for (const variable of frame.variables.filter(variable => variable.name !== 'n')) {
        assert.equal(variable.value, call && call[variable.name] != null ? call[variable.name] : '—');
      }
    }
  }
});

test('scene rows preserve card identity, show scratch memory, and satisfy the frame schema', () => {
  const numbers = [4, 1, 4, 0, -1];
  const frames = lesson.build({ numbers });
  assert.ok(frames.some(frame => frame.state.slots.includes(null)), 'exercise copy-back ghosts');
  assert.ok(frames.some(frame => frame.state.buffer.some((value, index) => value !== null && !frame.state.bufferValid[index])),
    'exercise reused scratch slots');
  for (const frame of frames) {
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.equal(frame.scene.graph, null);
    assert.equal(new Set(frame.scene.rows.map(row => row.id)).size, frame.scene.rows.length);
    for (const metric of frame.metrics) bilingual(metric.label);
    for (const row of frame.scene.rows) {
      bilingual(row.label);
      assert.equal(row.layout, 'cards');
      assert.equal(row.cells.length, numbers.length);
      assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
      for (const [index, cell] of row.cells.entries()) {
        assert.ok(validTones.has(cell.tone));
        assert.equal(typeof cell.marker, 'string');
        assert.equal(cell.index, index);
        if (row.id === 'numbers') {
          assert.equal(cell.value, frame.state.numbers[index]);
          assert.equal(cell.id, frame.state.slots[index] ?? `memory-${index}`);
          if (frame.state.slots[index] === null) {
            assert.equal(cell.tone, 'muted');
            assert.match(cell.marker, /old copy/u);
          }
        } else {
          assert.equal(row.id, 'buffer');
          assert.equal(cell.value, frame.state.buffer[index] ?? '·');
          assert.equal(cell.id, frame.state.bufferValid[index] ? `aux-${frame.state.bufferSlots[index]}` : `scratch-${index}`);
          assert.ok(!frame.scene.rows[0].cells.some(main => main.id === cell.id));
        }
      }
    }
    const stack = frame.scene.collections[0];
    bilingual(stack.label);
    assert.equal(stack.values.length, frame.state.stack.length);
    stack.values.forEach((value, index) => {
      const entry = frame.state.stack[index];
      assert.ok(value.includes(entry.routine));
      assert.ok(value.includes(`[${entry.left}, ${entry.right})`));
      assert.ok(value.includes(entry.phase));
    });
  }
});

test('trace snapshots and builds have no shared mutable data', () => {
  const input = { numbers: [3, 1, 3, 2] };
  const frames = lesson.build(input);
  assert.deepEqual(frames, lesson.build(input), 'build is deterministic');
  const seen = new WeakSet();
  function assertIndependent(value) {
    if (value === null || typeof value !== 'object') return;
    assert.ok(!seen.has(value), 'objects must be independent even within and across snapshots');
    seen.add(value);
    for (const child of Object.values(value)) assertIndependent(child);
  }
  for (const frame of frames) assertIndependent(frame);
  const reference = lesson.build(input);
  input.numbers[0] = 999;
  assert.deepEqual(frames, reference, 'later caller mutations cannot change recorded frames');
  frames.at(-1).state.result[0] = -777;
  frames.at(-1).scene.rows[0].cells[0].value = -888;
  frames[0].title.en = 'Changed';
  frames[0].state.original[0] = -555;
  assert.deepEqual(frames[1], reference[1]);
  assert.deepEqual(frames.at(-1).state.numbers, reference.at(-1).state.numbers);
  assert.deepEqual(lesson.build({ numbers: [3, 1, 3, 2] }), reference, 'trace edits cannot leak into module content or future builds');
});

test('operation counts expose all merge work, including already sorted inputs', () => {
  for (const numbers of [[1, 2, 3, 4], [4, 3, 2, 1], [7, 7, 7, 7]]) {
    const state = lesson.build({ numbers }).at(-1).state;
    assert.equal(state.comparisons, 4);
    assert.equal(state.bufferWrites, 8);
    assert.equal(state.copyBacks, 8);
    assert.equal(state.merges, 3);
    assert.equal(state.auxiliarySlots, 4);
    assert.equal(state.maxDepth, 3);
  }
  const interleaved = lesson.build({ numbers: [3, 1, 4, 2] }).at(-1).state;
  assert.equal(interleaved.comparisons, 5);
  const maximum = lesson.build({ numbers: Array.from({ length: 16 }, (_, index) => 16 - index) }).at(-1).state;
  assert.equal(maximum.bufferWrites, 64);
  assert.equal(maximum.copyBacks, 64);
  assert.equal(maximum.auxiliarySlots, 16);
  assert.equal(maximum.maxDepth, 5);
});
