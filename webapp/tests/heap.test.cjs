const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/heap.js');

const bilingual = value => {
  assert.ok(value && typeof value === 'object');
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const tones = ['default', 'active', 'sorted', 'muted', 'pivot', 'found'];
const parentOf = i => Math.floor((i - 1) / 2);
const isHeap = values => values.every((value, i) => i === 0 || values[parentOf(i)] <= value);
const fixedLines = {
  ready: [], overflow: [1, 2], append: [3, 4], 'compare-parent': [5, 6, 7], 'swap-up': [8, 9],
  'reached-root': [5], 'take-min': [12], 'move-last': [13, 14, 15, 16], emptied: [13, 14],
  'compare-child': [22], 'swap-down': [23, 24], leaf: [17], extracted: [25], peek: [28], done: [],
};

// A plain reference model: a sorted multiset gives the expected outputs of every script.
function reference({ initial, operations }) {
  const bag = [...initial], outputs = [];
  for (const op of operations) {
    bag.sort((a, b) => a - b);
    if (op.op === 'insert') { if (bag.length === 8) outputs.push(`insert ${op.value}: overflow`); else bag.push(op.value); }
    else if (op.op === 'extract') outputs.push(bag.length ? `extract: ${bag.shift()}` : 'extract: underflow');
    else outputs.push(bag.length ? `peek: ${bag[0]}` : 'peek: underflow');
  }
  return { size: bag.length, sorted: bag.sort((a, b) => a - b), outputs };
}

function randomInput(seed) {
  let s = seed >>> 0;
  const rand = n => { s = (s * 1664525 + 1013904223) >>> 0; return s % n; };
  const initial = Array.from({ length: rand(9) }, () => rand(12) - 3);
  const operations = Array.from({ length: rand(13) }, () => {
    const r = rand(10);
    return r < 5 ? { op: 'insert', value: rand(12) - 3 } : r < 8 ? { op: 'extract' } : { op: 'peek' };
  });
  return { initial, operations };
}

function verifyTrace(input) {
  const before = structuredClone(input);
  const frames = lesson.build(input);
  assert.deepEqual(input, before, 'build does not mutate its input');
  const expected = reference(input);
  const final = frames.at(-1);
  assert.equal(frames[0].kind, 'ready');
  assert.equal(final.kind, 'done');
  assert.equal(final.state.done, true);
  assert.deepEqual(final.state.result.outputs, expected.outputs);
  assert.equal(final.state.result.heap.length, expected.size);
  assert.deepEqual([...final.state.result.heap].sort((a, b) => a - b), expected.sorted);
  assert.ok(isHeap(final.state.result.heap));
  assert.ok(isHeap(frames[0].state.heap.map(entry => entry.value)), 'the starting heap is already a heap');
  assert.deepEqual([...frames[0].state.heap.map(entry => entry.value)].sort((a, b) => a - b),
    [...input.initial].sort((a, b) => a - b));

  let comparisons = 0, swaps = 0, opSwaps = 0, opIndex = null;
  for (const [index, frame] of frames.entries()) {
    const s = frame.state, prev = frames[index - 1]?.state, values = s.heap.map(entry => entry.value);
    if (index < frames.length - 1) { assert.equal(s.done, false); assert.equal(s.result, null); }
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.ok(s.heap.length <= 8);

    // Truthful line references.
    const op = s.opIndex === null ? null : input.operations[s.opIndex].op;
    if (fixedLines[frame.kind]) assert.deepEqual(frame.lines, fixedLines[frame.kind], frame.kind);
    else if (frame.kind === 'operation' || frame.kind === 'underflow') {
      assert.deepEqual(frame.lines, { insert: [1, 2], extract: [10, 11], peek: [26, 27] }[op]);
      if (frame.kind === 'underflow') assert.equal(s.heap.length, 0);
    } else if (frame.kind === 'pick-child') {
      const chooseRight = s.right !== null && values[s.right] < values[s.left];
      assert.deepEqual(frame.lines, chooseRight ? [17, 18, 19, 20, 21] : [17, 18, 19, 20]);
      assert.equal(s.left, 2 * s.i + 1);
      assert.ok(s.left < values.length);
      assert.equal(s.right === null, s.left + 1 >= values.length);
    } else assert.fail(`unexpected frame kind ${frame.kind}`);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));

    // Counters move only on the frames that do the work.
    if (s.opIndex !== opIndex) { opIndex = s.opIndex; opSwaps = 0; }
    if (frame.kind === 'compare-parent' || frame.kind === 'compare-child') comparisons++;
    if (frame.kind === 'pick-child' && s.right !== null) comparisons++;
    if (frame.kind === 'swap-up' || frame.kind === 'swap-down') { swaps++; opSwaps++; }
    assert.equal(s.comparisons, comparisons);
    assert.equal(s.swaps, swaps);
    assert.ok(opSwaps <= Math.floor(Math.log2(Math.max(1, values.length))), 'each operation swaps at most once per level');

    // Heap order holds except on the one edge being repaired.
    if (s.phase === 'ok') assert.ok(isHeap(values), `heap order at frame ${index}`);
    else {
      for (let i = 1; i < values.length; i++) {
        const p = parentOf(i);
        if (s.phase === 'up' && i === s.i) continue;
        if (s.phase === 'down' && p === s.i) continue;
        assert.ok(values[p] <= values[i], `only the repaired edge may break order at frame ${index}`);
      }
    }

    if (frame.kind === 'compare-parent') {
      assert.equal(s.parent, parentOf(s.i));
      assert.equal(s.condition, values[s.parent] <= values[s.i]);
      assert.equal(frame.equation, `parent = (${s.i} − 1) // 2 = ${s.parent}; ${values[s.parent]} <= ${values[s.i]} → ${s.condition}`);
      if (!s.condition) assert.equal(frames[index + 1].kind, 'swap-up');
    }
    if (frame.kind === 'compare-child') {
      const l = 2 * s.i + 1, r = l + 1;
      assert.equal(s.child, r < values.length && values[r] < values[l] ? r : l, 'the smaller child is chosen');
      assert.equal(s.condition, values[s.i] <= values[s.child]);
      if (!s.condition) assert.equal(frames[index + 1].kind, 'swap-down');
    }
    if (frame.kind === 'swap-up' || frame.kind === 'swap-down') {
      const from = prev.i, to = frame.kind === 'swap-up' ? prev.parent : prev.child, ids = [...prev.heap];
      [ids[from], ids[to]] = [ids[to], ids[from]];
      assert.deepEqual(s.heap, ids, 'a swap moves exactly the two compared entries, identities included');
      assert.equal(s.i, to);
    } else if (prev && !['append', 'move-last', 'emptied'].includes(frame.kind)) {
      assert.deepEqual(s.heap, prev.heap, 'no untraced movement');
    }
    if (frame.kind === 'append') {
      assert.deepEqual(s.heap.slice(0, -1), prev.heap);
      assert.equal(values.at(-1), input.operations[s.opIndex].value);
      assert.ok(!prev.heap.some(entry => entry.id === s.heap.at(-1).id), 'a new value gets a new identity');
    }
    if (frame.kind === 'move-last') {
      assert.equal(s.heap.length, prev.heap.length - 1);
      assert.deepEqual(s.heap[0], prev.heap.at(-1), 'the last entry itself moves to the root');
      assert.deepEqual(s.heap.slice(1), prev.heap.slice(1, -1));
    }
    if (frame.kind === 'take-min' || frame.kind === 'peek') assert.equal(s.min, values[0]);

    // Both views show the same heap, with stable identities.
    const [row] = frame.scene.rows;
    assert.equal(frame.scene.rows.length, 1);
    assert.equal(row.id, 'heap'); bilingual(row.label);
    assert.deepEqual(row.cells.map(cell => cell.id), s.heap.map(entry => entry.id));
    assert.deepEqual(row.cells.map(cell => cell.value), values);
    assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
    row.cells.forEach((cell, i) => { assert.equal(cell.index, i); assert.ok(tones.includes(cell.tone)); });
    if (s.i !== null && s.i < values.length) assert.equal(row.cells[s.i].tone === 'active' || row.cells[s.i].tone === 'found', true);
    const graph = frame.scene.graph;
    if (!values.length) assert.equal(graph, null);
    else {
      assert.ok(graph.nodes.length <= 8 && graph.edges.length <= 20);
      assert.deepEqual(graph.nodes.map(node => node.id), row.cells.map(cell => cell.id));
      assert.deepEqual(graph.nodes.map(node => node.label), values.map(String));
      graph.nodes.forEach((node, i) => {
        assert.equal(node.tone, row.cells[i].tone);
        assert.ok(node.x >= 22 && node.x <= 418 && node.y >= 22 && node.y <= 314, 'node inside the canvas');
        const level = Math.floor(Math.log2(i + 1));
        assert.equal(node.y, 52 + level * 80, 'one row per tree level');
        if (i > 0) assert.ok(graph.nodes[parentOf(i)].y < node.y, 'parents sit above children');
      });
      assert.equal(new Set(graph.nodes.map(node => `${node.x},${node.y}`)).size, graph.nodes.length, 'no overlapping nodes');
      assert.deepEqual(graph.edges.map(edge => [edge.from, edge.to]),
        s.heap.slice(1).map((entry, k) => [s.heap[parentOf(k + 1)].id, entry.id]), 'edges are exactly parent → child');
      const activeEdges = graph.edges.filter(edge => edge.tone === 'active').length;
      assert.equal(activeEdges, ['compare-parent', 'compare-child'].includes(frame.kind) ? 1 :
        frame.kind === 'pick-child' ? (s.right === null ? 1 : 2) : 0);
    }
    assert.deepEqual(frame.scene.collections[0].values, s.outputs);
    bilingual(frame.scene.collections[0].label);
    frame.metrics.forEach(metric => bilingual(metric.label));
    assert.deepEqual(frame.metrics.slice(0, 2).map(metric => metric.value), [s.comparisons, s.swaps]);
    assert.equal(frame.metrics[2].value, `${values.length} / 8`);
  }
  // Snapshots are independent of each other.
  if (frames.length > 2) {
    frames[1].state.heap.push({ id: 'x', value: 0 });
    frames[1].scene.rows[0].cells.length = 0;
    assert.notEqual(frames[2].state.heap.at(-1)?.id, 'x');
    assert.deepEqual(lesson.build(input)[1].state.heap, structuredClone(lesson.build(input)[1].state.heap));
  }
  return frames;
}

test('exports the lesson contract in CommonJS and a dependency-free browser', () => {
  assert.equal(lesson.id, 'heap');
  assert.equal(lesson.number, '17');
  assert.equal(lesson.name, 'Binary Heap');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons.heap, lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/heap.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const result = browser.AlgorithmLessons.heap.build(browser.AlgorithmLessons.heap.parse({ initial: '3 1', operations: 'pop' })).at(-1).state.result;
  assert.deepEqual(Array.from(result.outputs), ['extract: 1']);

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 3);
  lesson.theory.steps.forEach(step => { bilingual(step.title); bilingual(step.body); });
  lesson.theory.notes.forEach(bilingual);
  lesson.theory.costs.forEach(cost => { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); });
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  assert.equal(lesson.code[5], '    parent = (i - 1) // 2');
  assert.equal(lesson.code[17], '      child = 2 * i + 1');
  assert.deepEqual(lesson.fields.map(field => [field.name, field.type]), [['initial', 'text'], ['operations', 'textarea']]);
  lesson.fields.forEach(field => { bilingual(field.label); bilingual(field.help); assert.ok(field.maxLength > 0); });
  lesson.view.legend.forEach(item => { assert.ok(tones.includes(item.tone)); bilingual(item.label); });
  for (const kind of lesson.keySteps) assert.ok(kind === 'ready' || kind === 'done' || kind in fixedLines || kind === 'pick-child' || kind === 'underflow');
});

test('parses aliases, separators, case and Arabic digits without mutation', () => {
  const examples = [
    [{ initial: '', operations: '' }, { initial: [], operations: [] }],
    [{ initial: ' 3, 1  2 ', operations: 'INSERT 5\n\npop; Peek, push -7، extractMin, top' },
      { initial: [3, 1, 2], operations: [{ op: 'insert', value: 5 }, { op: 'extract' }, { op: 'peek' },
        { op: 'insert', value: -7 }, { op: 'extract' }, { op: 'peek' }] }],
    [{ initial: '٣، ۵', operations: 'insert ١٢' }, { initial: [3, 5], operations: [{ op: 'insert', value: 12 }] }],
    [{ initial: '-99 999 +4', operations: 'insert +999, insert -99' },
      { initial: [-99, 999, 4], operations: [{ op: 'insert', value: 999 }, { op: 'insert', value: -99 }] }],
    [{ initial: Array(8).fill('1').join(','), operations: Array(12).fill('peek').join('\n') },
      { initial: Array(8).fill(1), operations: Array(12).fill({ op: 'peek' }) }],
  ];
  for (const [raw, parsed] of examples) {
    const frozen = Object.freeze({ ...raw });
    assert.deepEqual(lesson.parse(frozen), parsed);
    assert.deepEqual(frozen, raw);
  }
});

test('parse and build reject malformed or excessive input with bilingual errors', () => {
  const rejects = (fn, value) => assert.throws(() => fn(value), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
  for (const raw of [undefined, null, [], {}, 'insert 1', { initial: '' }, { operations: '' },
    { initial: 1, operations: '' }, { initial: '', operations: ['peek'] }]) rejects(lesson.parse, raw);
  const badInitial = ['1.5', '1e2', 'x', '1,,2', ',1', '1,', '-100', '1000', '1;2', Array(9).fill('1').join(','), '1'.repeat(65)];
  for (const initial of badInitial) rejects(lesson.parse, { initial, operations: '' });
  const badOps = ['insert', 'insert x', 'insert 1.5', 'insert 1000', 'insert -100', 'insert 1 2', 'push', 'extract 3',
    'peek 1', 'delete 3', 'insert5', 'pop pop', '<script>', Array(13).fill('peek').join(','), 'peek,'.repeat(49)];
  for (const operations of badOps) rejects(lesson.parse, { initial: '', operations });

  const ok = { initial: [], operations: [] };
  const bad = [undefined, null, [], {}, { initial: [] }, { operations: [] }, { initial: '1', operations: [] },
    { initial: Array(9).fill(1), operations: [] }, { initial: [1.5], operations: [] }, { initial: [1000], operations: [] },
    { initial: ['1'], operations: [] }, { initial: [, 1], operations: [] },
    { ...ok, operations: Array(13).fill({ op: 'peek' }) }, { ...ok, operations: [{ op: 'insert' }] },
    { ...ok, operations: [{ op: 'insert', value: '3' }] }, { ...ok, operations: [{ op: 'insert', value: -100 }] },
    { ...ok, operations: [{ op: 'peek', value: 3 }] }, { ...ok, operations: [{ op: 'pop' }] },
    { ...ok, operations: [{ op: 'extract', extra: true }] }, { ...ok, operations: [null] }, { ...ok, operations: ['peek'] }];
  for (const value of bad) rejects(lesson.build, value);
  for (const value of bad.slice(4)) rejects(lesson.summary, value);
});

test('presets run, are distinct, and cover the promised edge cases', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.deepEqual(lesson.presets.find(preset => preset.id === 'default').input, lesson.defaults);
  const results = {};
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    const parsed = lesson.parse(preset.input);
    bilingual(lesson.summary(parsed));
    const frames = verifyTrace(parsed);
    results[preset.id] = { kinds: new Set(frames.map(frame => frame.kind)), result: frames.at(-1).state.result };
  }
  assert.ok(results.underflow.kinds.has('underflow'));
  assert.deepEqual(results.underflow.result.outputs, ['peek: underflow', 'extract: underflow', 'extract: 6', 'extract: underflow']);
  assert.ok(results.overflow.kinds.has('overflow'));
  assert.equal(results.overflow.result.outputs[0], 'insert 0: overflow');
  assert.deepEqual(results.drain.result.outputs.map(out => Number(out.split(': ')[1])), [1, 2, 3, 5, 6, 7, 8, 9], 'extracts come out sorted');
  assert.ok(results.drain.kinds.has('emptied') && results.drain.kinds.has('leaf'));
  assert.ok(results['build-up'].kinds.has('reached-root'));
  assert.equal(results.duplicates.kinds.has('swap-up'), true);
  for (const kind of ['append', 'compare-parent', 'swap-up', 'reached-root', 'peek', 'take-min', 'move-last',
    'pick-child', 'compare-child', 'swap-down', 'leaf', 'extracted']) assert.ok(results.default.kinds.has(kind), kind);
  assert.deepEqual(results.default.result, { heap: [6, 7, 10, 12, 9], outputs: ['peek: 2', 'extract: 2', 'extract: 4'] });
});

test('ties stop sifting: equal values never swap with each other', () => {
  const frames = verifyTrace({ initial: [5, 5, 5], operations: [{ op: 'insert', value: 5 }, { op: 'extract' }] });
  assert.equal(frames.filter(frame => frame.kind.startsWith('swap')).length, 0);
  const stop = frames.find(frame => frame.kind === 'compare-parent');
  assert.equal(stop.state.condition, true);
});

test('the final heap is generally not sorted, and the done frame says so', () => {
  const frames = verifyTrace({ initial: [1, 5, 2, 6, 7, 3], operations: [{ op: 'peek' }] });
  const final = frames.at(-1);
  assert.deepEqual(final.state.result.heap, [1, 5, 2, 6, 7, 3]);
  assert.match(final.explanation.en, /not sorted/);
});

test('randomized scripts match a reference priority queue at every step', () => {
  for (let seed = 1; seed <= 300; seed++) verifyTrace(randomInput(seed));
});

test('the trace follows the shared lesson-contract shape', () => {
  for (const preset of [{ input: lesson.defaults }, ...lesson.presets]) {
    const frames = lesson.build(lesson.parse({ ...preset.input }));
    assert.ok(frames.length > 1 && frames.length < 20000);
    for (const frame of frames) {
      assert.ok(Array.isArray(frame.variables) && Array.isArray(frame.metrics));
      frame.variables.forEach(variable => { assert.equal(typeof variable.name, 'string'); assert.ok(Object.hasOwn(variable, 'value')); });
      if (frame.scene.graph) {
        const ids = new Set(frame.scene.graph.nodes.map(node => node.id));
        assert.equal(ids.size, frame.scene.graph.nodes.length);
        frame.scene.graph.edges.forEach(edge => assert.ok(ids.has(edge.from) && ids.has(edge.to)));
      }
    }
  }
});
