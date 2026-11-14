const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/queue.js');

const CAPACITY = 6;
const TONES = ['default', 'active', 'sorted', 'muted', 'pivot', 'found'];
const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const rejects = (fn, value) => assert.throws(() => fn(value), error => {
  assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
});
const enq = value => ({ op: 'enqueue', value });
const deq = { op: 'dequeue' }, peek = { op: 'peek' };
const linesFor = (kind, op) => ({
  'full-check': [1, 2], overflow: [2], rear: [3], 'rear-wrap': [3], write: [4, 5],
  'empty-check': [6, 7], take: [8], front: [9], 'front-wrap': [9], dequeued: [10, 11],
  'peek-check': [12, 13], peek: [14], underflow: op === 'peek' ? [13] : [7], ready: [], done: [],
})[kind];

// A plain FIFO model: an unbounded array with shift(), bounded by the capacity check.
function model(operations) {
  const queue = [], outputs = [];
  let naiveShifts = 0;
  for (const operation of operations) {
    if (operation.op === 'enqueue') {
      if (queue.length === CAPACITY) outputs.push({ op: 'enqueue', value: operation.value, status: 'overflow' });
      else { queue.push(operation.value); outputs.push({ op: 'enqueue', value: operation.value, status: 'ok' }); }
    } else if (!queue.length) outputs.push({ op: operation.op, value: null, status: 'underflow' });
    else if (operation.op === 'peek') outputs.push({ op: 'peek', value: queue[0], status: 'ok' });
    else { naiveShifts += queue.length - 1; outputs.push({ op: 'dequeue', value: queue.shift(), status: 'ok' }); }
  }
  return { queue, outputs, naiveShifts };
}

test('exports the lesson contract in CommonJS and in a dependency-free browser context', () => {
  assert.equal(lesson.id, 'queue');
  assert.equal(lesson.number, '14');
  assert.equal(lesson.name, 'Queue');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons.queue, lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/queue.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const result = browser.AlgorithmLessons.queue.build(browser.AlgorithmLessons.queue.parse({ operations: 'enq 1, enq 2, deq' })).at(-1).state.result;
  assert.deepEqual(JSON.parse(JSON.stringify(result.queue)), [2]);

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant, lesson.summary({ operations: [] })]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 3);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  assert.match(lesson.code[2], /rear = \(front \+ size\) % capacity/);
  assert.match(lesson.code[8], /front = \(front \+ 1\) % capacity/);
  assert.equal(lesson.fields.length, 1);
  const [field] = lesson.fields;
  assert.equal(field.name, 'operations'); assert.equal(field.type, 'textarea');
  bilingual(field.label); bilingual(field.help);
  const kinds = new Set(['ready', 'full-check', 'overflow', 'rear', 'rear-wrap', 'write', 'empty-check', 'take',
    'front', 'front-wrap', 'dequeued', 'peek-check', 'peek', 'underflow', 'done']);
  kinds.forEach(kind => assert.ok(linesFor(kind, 'dequeue')));
  for (const kind of lesson.keySteps) assert.ok(kinds.has(kind), `key step ${kind} is a real frame kind`);
});

test('parses aliases, separators, signs and Arabic digits without mutating the raw input', () => {
  const examples = [
    ['', []], [' \n\t ', []],
    ['enqueue 5, dequeue, peek', [enq(5), deq, peek]],
    ['ENQ +7\ndeq\r\nPeek ; enq -99، enq 999', [enq(7), deq, peek, enq(-99), enq(999)]],
    ['enqueue   ٤٢ , enq ۷', [enq(42), enq(7)]],
    [Array(12).fill('peek').join(','), Array(12).fill(peek)],
  ];
  for (const [text, operations] of examples) {
    const raw = Object.freeze({ operations: text });
    assert.deepEqual(lesson.parse(raw), { operations });
    assert.deepEqual(raw, { operations: text });
  }
  assert.equal(lesson.parse(lesson.defaults).operations.length, 11);
});

test('parse and build reject malformed or excessive input with bilingual errors', () => {
  for (const raw of [undefined, null, [], {}, 'peek', { operations: 3 }, { operations: [peek] }]) rejects(lesson.parse, raw);
  for (const text of ['push 3', 'pop', 'enqueue', 'enqueue 1.5', 'enqueue 1e2', 'enqueue -100', 'enqueue 1000',
    'enqueue x', 'dequeue 3', 'peek 1', 'enqueue 1 2', 'enq 1,, deq', ', deq', 'deq,', '<script>', 'enq 0x10',
    Array(13).fill('deq').join(','), 'x'.repeat(241)]) {
    rejects(lesson.parse, { operations: text });
  }
  const bad = [undefined, null, [], {}, { operations: 'deq' }, { operations: Array(13).fill(deq) },
    { operations: [deq, , deq] }, { operations: [null] }, { operations: [[]] }, { operations: [{ op: 'push', value: 1 }] },
    { operations: [{ op: 'dequeue', value: 1 }] }, { operations: [{ op: 'enqueue' }] },
    { operations: [{ op: 'enqueue', value: 1, extra: 2 }] }];
  for (const value of [NaN, Infinity, 0.5, -100, 1000, '5', null, true, 2n]) bad.push({ operations: [{ op: 'enqueue', value }] });
  for (const value of bad) rejects(lesson.build, value);
  for (const value of bad) rejects(lesson.summary, value);
});

test('presets are distinct, localized, runnable and cover wrap, overflow, underflow, duplicates and empty', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.equal(new Set(lesson.presets.map(preset => preset.input.operations)).size, lesson.presets.length);
  const kindsOf = id => new Set(lesson.build(lesson.parse(lesson.presets.find(preset => preset.id === id).input)).map(frame => frame.kind));
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    const parsed = lesson.parse(preset.input);
    const final = lesson.build(parsed).at(-1).state;
    const expected = model(parsed.operations);
    assert.deepEqual(final.result, { queue: expected.queue, outputs: expected.outputs });
    bilingual(lesson.summary(parsed));
  }
  assert.deepEqual(lesson.presets.find(preset => preset.id === 'default').input, lesson.defaults);
  assert.ok(kindsOf('default').has('rear-wrap'));
  assert.ok(kindsOf('front-wrap').has('front-wrap'));
  assert.ok(kindsOf('overflow').has('overflow') && kindsOf('overflow').has('rear-wrap'));
  assert.ok(kindsOf('underflow').has('underflow'));
  assert.ok(kindsOf('peek-only').has('peek'));
  assert.deepEqual([...kindsOf('empty')], ['ready', 'done']);
});

function verifyTrace(operations) {
  const input = { operations: operations.map(operation => ({ ...operation })) }, before = structuredClone(input);
  const frames = lesson.build(input), expected = model(operations);
  assert.deepEqual(input, before, 'input not mutated');
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames.at(-1).kind, 'done');
  assert.ok(frames.length <= 2 + 4 * operations.length);
  const final = frames.at(-1).state;
  assert.equal(final.done, true);
  assert.deepEqual(final.result, { queue: expected.queue, outputs: expected.outputs });
  assert.equal(final.naiveShifts, expected.naiveShifts);

  for (const [index, frame] of frames.entries()) {
    const s = frame.state, prev = frames[index - 1]?.state;
    if (index < frames.length - 1) { assert.equal(s.done, false); assert.equal(s.result, null); }
    assert.deepEqual(frame.lines, linesFor(frame.kind, s.op), `${frame.kind} line refs`);
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.ok(s.size >= 0 && s.size <= CAPACITY);
    assert.ok(s.front >= 0 && s.front < CAPACITY && s.rear >= 0 && s.rear < CAPACITY);
    assert.equal(s.buffer.length, CAPACITY);
    const occupied = s.buffer.filter(value => value !== null).length;
    // Between "take" and "dequeued" the slot is cleared before size is lowered; otherwise the invariant holds.
    const midDequeue = ['take', 'front', 'front-wrap'].includes(frame.kind);
    assert.equal(occupied, midDequeue ? s.size - 1 : s.size);
    if (!midDequeue) {
      assert.equal(s.rear, (s.front + s.size) % CAPACITY, 'rear is the next free slot');
      for (let k = 0; k < CAPACITY; k++) {
        assert.equal(s.buffer[(s.front + k) % CAPACITY] !== null, k < s.size, 'occupied slots run from front for size slots');
      }
    }
    const logical = Array.from({ length: occupied }, (_, k) => s.buffer[(s.rear - occupied + k + CAPACITY) % CAPACITY]);
    assert.deepEqual(frame.scene.collections[0].values, logical);
    frame.scene.collections.forEach(collection => bilingual(collection.label));

    const [row] = frame.scene.rows;
    assert.equal(frame.scene.rows.length, 1); assert.equal(row.id, 'buffer'); bilingual(row.label);
    assert.deepEqual(row.cells.map(cell => cell.id), Array.from({ length: CAPACITY }, (_, i) => `slot-${i}`));
    assert.deepEqual(row.cells.map(cell => cell.value), s.buffer);
    for (const [i, cell] of row.cells.entries()) {
      assert.equal(cell.index, i);
      assert.ok(TONES.includes(cell.tone));
      assert.equal(cell.marker.split(' · ').includes('front'), i === s.front);
      assert.equal(cell.marker.split(' · ').includes('rear'), i === s.rear);
      if (i !== s.focus) assert.equal(cell.tone, cell.value === null ? 'muted' : 'default');
    }
    assert.equal(frame.scene.graph, null);
    assert.deepEqual(frame.metrics.map(metric => metric.value),
      [`${s.size} / ${CAPACITY}`, 0, s.naiveShifts, `${s.overflows} / ${s.underflows}`]);
    frame.metrics.forEach(metric => bilingual(metric.label));
    assert.deepEqual(frame.variables.map(variable => variable.name), ['front', 'size', 'rear', 'value', 'capacity']);

    if (!prev) continue;
    const changedSlots = s.buffer.map((value, i) => value !== prev.buffer[i] ? i : -1).filter(i => i >= 0);
    if (frame.kind === 'write') {
      assert.deepEqual(changedSlots, [prev.rear], 'enqueue writes exactly one slot, at rear');
      assert.equal(s.buffer[prev.rear], s.value);
      assert.equal(s.size, prev.size + 1);
      assert.equal(s.focus, prev.rear); assert.equal(row.cells[prev.rear].tone, 'found');
    } else if (frame.kind === 'take') {
      assert.deepEqual(changedSlots, [s.front], 'dequeue clears exactly the front slot');
      assert.equal(s.value, prev.buffer[s.front]); assert.equal(row.cells[s.front].tone, 'active');
    } else {
      assert.deepEqual(changedSlots, [], `${frame.kind} moves no element`);
    }
    if (['front', 'front-wrap'].includes(frame.kind)) {
      assert.equal(s.front, (prev.front + 1) % CAPACITY);
      assert.equal(frame.kind === 'front-wrap', prev.front === CAPACITY - 1);
    } else assert.equal(s.front, prev.front);
    if (['rear', 'rear-wrap'].includes(frame.kind)) {
      assert.equal(frame.kind === 'rear-wrap', s.front + s.size >= CAPACITY);
      assert.equal(frame.equation, `rear = (${s.front} + ${s.size}) % ${CAPACITY} = ${s.rear}`);
    }
    if (frame.kind === 'full-check') assert.equal(s.condition, s.size === CAPACITY);
    if (['empty-check', 'peek-check'].includes(frame.kind)) assert.equal(s.condition, s.size === 0);
    if (frame.kind === 'overflow') { assert.equal(s.size, CAPACITY); assert.equal(s.overflows, prev.overflows + 1); }
    if (frame.kind === 'underflow') { assert.equal(s.size, 0); assert.equal(s.underflows, prev.underflows + 1); }
    if (frame.kind === 'peek') { assert.equal(s.value, s.buffer[s.front]); assert.equal(s.size, prev.size); }
    if (frame.kind === 'dequeued') {
      assert.equal(s.size, prev.size - 1);
      assert.equal(s.naiveShifts - prev.naiveShifts, s.size, 'a naive array would shift the remaining elements');
    }
  }
  assert.deepEqual(frames, JSON.parse(JSON.stringify(frames)), 'snapshots are JSON-safe');
}

test('traces match a FIFO model with truthful lines, stable slots, and O(1) work on diverse scripts', () => {
  const scripts = [[], [deq], [peek], [enq(1), deq, deq],
    [enq(5), enq(3), enq(8), deq, deq, enq(1), enq(9), enq(4), enq(7), peek, deq],
    Array.from({ length: 7 }, (_, i) => enq(i)),
    [...Array.from({ length: 6 }, (_, i) => enq(i * 10)), deq, deq, enq(1), enq(2), enq(3), peek],
    [enq(7), enq(7), enq(7), deq, enq(7), peek]];
  let seed = 0x9e3779b9;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let iteration = 0; iteration < 120; iteration++) {
    scripts.push(Array.from({ length: iteration % 13 }, () => {
      const pick = random() % 5;
      return pick < 3 ? enq((random() % 1099) - 99) : pick === 3 ? deq : peek;
    }));
  }
  scripts.forEach(verifyTrace);
});

test('rear and front both wrap with modulo while the naive shift count grows', () => {
  const frames = lesson.build({ operations: [enq(1), enq(2), enq(3), enq(4), enq(5), enq(6), deq, deq, enq(7), enq(8), enq(9)] });
  const wrap = frames.filter(frame => frame.kind === 'rear-wrap');
  assert.deepEqual(wrap.map(frame => frame.state.rear), [0, 1]);
  assert.ok(frames.some(frame => frame.kind === 'overflow'), 'the third enqueue after two dequeues overflows');
  const final = frames.at(-1).state;
  assert.deepEqual(final.buffer, [7, 8, 3, 4, 5, 6]);
  assert.equal(final.front, 2); assert.equal(final.size, 6); assert.equal(final.naiveShifts, 5 + 4);
  assert.deepEqual(final.result.queue, [3, 4, 5, 6, 7, 8]);
  const fronts = lesson.build(lesson.parse({ operations: 'enq 1, enq 2, enq 3, enq 4, enq 5, deq, deq, deq, deq, deq, enq 6, deq' }));
  const frontWrap = fronts.find(frame => frame.kind === 'front-wrap');
  assert.equal(frontWrap.state.front, 0);
  assert.equal(frontWrap.equation, 'front = (5 + 1) % 6 = 0');
});

test('frames are independent deep snapshots and deterministic', () => {
  const data = { operations: [enq(3), enq(2), deq, peek] }, before = structuredClone(data);
  const frames = lesson.build(data);
  assert.deepEqual(data, before);
  assert.deepEqual(lesson.build(data), frames);
  const seen = new Set();
  for (const frame of frames) {
    const own = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      assert.ok(!seen.has(value), 'no object is shared across frames');
      if (own.has(value)) return;
      own.add(value); Object.values(value).forEach(visit);
    };
    visit(frame); own.forEach(value => seen.add(value));
  }
  const baseline = structuredClone(frames);
  data.operations[0].value = 99;
  frames[2].state.buffer[0] = 99; frames[2].scene.rows[0].cells[0].value = 99; frames[2].title.ar = 'x';
  assert.deepEqual(frames.slice(3), baseline.slice(3));
  assert.deepEqual(lesson.build(before), baseline);
});

// lesson-contract.test.cjs pins its lesson list; repeat its per-frame checks here for this lesson.
test('follows the shared lesson contract for every preset', () => {
  for (const preset of [{ id: 'defaults', input: lesson.defaults }, ...lesson.presets]) {
    const input = lesson.parse({ ...preset.input }), before = structuredClone(input);
    const frames = lesson.build(input);
    assert.deepEqual(input, before);
    assert.ok(frames.length > 1 && frames.length < 20000);
    for (const frame of frames) {
      assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
      assert.equal(typeof frame.state.done, 'boolean');
      for (const variable of frame.variables) { assert.equal(typeof variable.name, 'string'); assert.ok(Object.hasOwn(variable, 'value')); }
      for (const row of frame.scene.rows) {
        bilingual(row.label);
        assert.equal(new Set(row.cells.map(cell => String(cell.id))).size, row.cells.length);
        for (const cell of row.cells) assert.ok(TONES.includes(cell.tone));
      }
    }
  }
});
