const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/arrays.js');

const TONES = ['default', 'active', 'sorted', 'muted', 'pivot', 'found'];
const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const raw = (capacity, initial, operations) => ({ capacity: String(capacity), initial, operations });

// Independent reference model of the fixed-capacity array semantics.
function reference({ capacity, initial, operations }) {
  const a = [...initial], outputs = [];
  let moves = 0, comparisons = 0, rejected = 0;
  operations.forEach((o, step) => {
    const tag = `${step + 1}. `;
    const name = `${o.op}(${['index', 'value'].filter(k => k in o).map(k => o[k]).join(', ')})`;
    const bad = reason => { rejected++; outputs.push(`${tag}${name} ✗ ${reason}`); };
    if (o.op === 'get') {
      if (o.index < 0 || o.index >= a.length) bad('out of bounds'); else outputs.push(`${tag}get(${o.index}) → ${a[o.index]}`);
    } else if (o.op === 'set') {
      if (o.index < 0 || o.index >= a.length) bad('out of bounds'); else { a[o.index] = o.value; outputs.push(`${tag}${name} ✓`); }
    } else if (o.op === 'append') {
      if (a.length === capacity) bad('full'); else { a.push(o.value); outputs.push(`${tag}${name} ✓`); }
    } else if (o.op === 'insert') {
      if (a.length === capacity) bad('full');
      else if (o.index < 0 || o.index > a.length) bad('out of bounds');
      else { moves += a.length - o.index; outputs.push(`${tag}${name} ✓ moves: ${a.length - o.index}`); a.splice(o.index, 0, o.value); }
    } else if (o.op === 'delete') {
      if (o.index < 0 || o.index >= a.length) bad('out of bounds');
      else { moves += a.length - 1 - o.index; outputs.push(`${tag}delete(${o.index}) → ${a[o.index]}`); a.splice(o.index, 1); }
    } else if (o.op === 'find') {
      const at = a.indexOf(o.value);
      comparisons += at === -1 ? a.length : at + 1;
      outputs.push(`${tag}find(${o.value}) → ${at}`);
    }
  });
  return { values: a, moves, comparisons, rejected, outputs };
}

function expectedLines(frame) {
  const op = frame.state.operation && frame.state.operation.split('(')[0];
  const table = {
    op: { get: [1], set: [4], append: [7], insert: [11], delete: [20], find: [29] },
    check: { get: [2], set: [5], append: [8], delete: [21] },
    overflow: { append: [8], insert: [12] },
    'out-of-bounds': { get: [2], set: [5], insert: [13], delete: [21] },
    read: { get: [3] },
    write: { set: [6], append: [9], insert: [18] },
    grow: { append: [10], insert: [19] },
    'shift-start': { insert: [14], delete: [23] },
    shift: { insert: [15, 16, 17], delete: [24, 25, 26] },
    'shift-end': { insert: [15], delete: [24] },
    remove: { delete: [22] }, shrink: { delete: [27, 28] },
    'scan-start': { find: [30] }, compare: { find: [31, 32] }, found: { find: [32] },
    advance: { find: [33] }, 'not-found': { find: [31, 34] },
  };
  if (frame.kind === 'ready' || frame.kind === 'done') return [];
  if (frame.kind === 'check' && op === 'insert') return frame.equation.includes('==') ? [12] : [13];
  const lines = table[frame.kind] && table[frame.kind][op];
  assert.ok(lines, `unexpected frame kind ${frame.kind} for ${op}`);
  return lines;
}

test('exports the lesson contract in CommonJS and in a dependency-free browser context', () => {
  assert.equal(lesson.id, 'arrays');
  assert.equal(lesson.number, '11');
  assert.equal(lesson.name, 'Arrays');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons.arrays, lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/arrays.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = browser.AlgorithmLessons.arrays;
  const result = browserLesson.build(browserLesson.parse(raw(4, '1, 2', 'insert 0 9'))).at(-1).state.result;
  assert.deepEqual(Array.from(result.values), [9, 1, 2]);

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 4);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  // Line references used by the trace point at the statements they claim.
  const at = n => lesson.code[n - 1];
  assert.match(at(3), /return a\[i\]/); assert.match(at(6), /a\[i\] = value/);
  assert.match(at(9), /a\[size\] = value/); assert.match(at(12), /size == capacity/);
  assert.match(at(13), /i > size/); assert.match(at(16), /a\[j\] = a\[j - 1\]/);
  assert.match(at(18), /a\[i\] = value/); assert.match(at(22), /removed = a\[i\]/);
  assert.match(at(25), /a\[j\] = a\[j \+ 1\]/); assert.match(at(27), /size = size - 1/);
  assert.match(at(32), /a\[i\] == value/); assert.match(at(34), /return -1/);
  assert.deepEqual(lesson.fields.map(field => [field.name, field.type]),
    [['capacity', 'text'], ['initial', 'text'], ['operations', 'textarea']]);
  for (const field of lesson.fields) { bilingual(field.label); bilingual(field.help); assert.ok(field.maxLength > 0); }
  assert.ok(lesson.keySteps.includes('shift'));
});

test('parses separators, case, signs, and Arabic digits without mutating raw input', () => {
  const rawInput = Object.freeze(raw(6, '4, 8 ,15', 'GET 2\ninsert 1 23 ; delete 0, append +42،find -5\n\n'));
  assert.deepEqual(lesson.parse(rawInput), {
    capacity: 6, initial: [4, 8, 15],
    operations: [{ op: 'get', index: 2 }, { op: 'insert', index: 1, value: 23 }, { op: 'delete', index: 0 },
      { op: 'append', value: 42 }, { op: 'find', value: -5 }],
  });
  assert.equal(rawInput.initial, '4, 8 ,15');
  assert.deepEqual(lesson.parse({ capacity: '٨', initial: '٧ ٣', operations: 'set ١ ٩٩٩' }),
    { capacity: 8, initial: [7, 3], operations: [{ op: 'set', index: 1, value: 999 }] });
  assert.deepEqual(lesson.parse(raw(1, '', '')), { capacity: 1, initial: [], operations: [] });
  assert.deepEqual(lesson.parse(raw(3, '', 'get -99, get 99')).operations, [{ op: 'get', index: -99 }, { op: 'get', index: 99 }]);
  assert.equal(lesson.parse(raw(2, '', Array(12).fill('find 1').join('\n'))).operations.length, 12);
  assert.deepEqual(lesson.parse({ ...lesson.defaults }).initial, [4, 8, 15, 16]);
});

test('parse and build reject malformed or excessive input with bilingual errors', () => {
  const rejects = (fn, value) => assert.throws(() => fn(value), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
  for (const value of [undefined, null, [], {}, 'x', { capacity: 4, initial: '', operations: '' },
    { capacity: '4', initial: [], operations: '' }, { capacity: '4', initial: '' }]) rejects(lesson.parse, value);
  for (const capacity of ['', '0', '9', '-1', '1.5', 'four', '100']) {
    rejects(lesson.parse, raw(capacity, '', ''));
  }
  for (const initial of ['1,,2', '1.5', 'a', '1000', '-100', '1 2 3 4 5', ',1', '9'.repeat(65)]) {
    rejects(lesson.parse, raw(4, initial, ''));
  }
  for (const operations of ['push 1', 'get', 'get 1 2', 'set 1', 'insert 1', 'append', 'append 1 2',
    'delete', 'find', 'get 100', 'get -100', 'append 1000', 'insert 0 -100', 'get 1.5', 'get x',
    '<script>', 'append 1e2', Array(13).fill('get 0').join(','), 'get 0,'.repeat(50)]) {
    rejects(lesson.parse, raw(4, '1', operations));
  }
  const good = { capacity: 4, initial: [1], operations: [{ op: 'get', index: 0 }] };
  const bad = [undefined, null, [], {}, { ...good, capacity: 0 }, { ...good, capacity: 9 }, { ...good, capacity: '4' },
    { ...good, initial: [1, 2, 3, 4, 5] }, { ...good, initial: [1.5] }, { ...good, initial: [1000] }, { ...good, initial: '1' },
    { ...good, operations: null }, { ...good, operations: Array(13).fill({ op: 'get', index: 0 }) },
    { ...good, operations: [{ op: 'push', value: 1 }] }, { ...good, operations: [{ op: 'get' }] },
    { ...good, operations: [{ op: 'get', index: 0, value: 1 }] }, { ...good, operations: [{ op: 'append', value: NaN }] },
    { ...good, operations: [{ op: 'insert', index: 100, value: 1 }] }, { ...good, operations: [{ op: 'find', value: '1' }] },
    { ...good, operations: [null] }, { ...good, operations: [{ op: 'toString' }] }];
  for (const value of bad) rejects(lesson.build, value);
});

function verifyTrace(input) {
  const before = structuredClone(input);
  const frames = lesson.build(input);
  assert.deepEqual(input, before, 'build does not mutate its input');
  const expected = reference(input);
  const final = frames.at(-1).state;
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  assert.deepEqual(frames[0].state.values, input.initial);
  assert.equal(frames.at(-1).kind, 'done');
  assert.equal(final.done, true);
  assert.deepEqual(final.result, { values: expected.values, size: expected.values.length, capacity: input.capacity, outputs: expected.outputs });
  assert.equal(final.moves, expected.moves);
  assert.equal(final.comparisons, expected.comparisons);
  assert.equal(final.rejected, expected.rejected);
  assert.equal(frames.filter(frame => frame.kind === 'op').length, input.operations.length);
  assert.ok(frames.length <= 2 + input.operations.length * (6 + 2 * input.capacity));

  let moves = 0, comparisons = 0;
  for (const [index, frame] of frames.entries()) {
    const s = frame.state, prev = frames[index - 1]?.state;
    if (frame.kind === 'shift') moves++;
    if (frame.kind === 'compare') comparisons++;
    assert.equal(s.moves, moves);
    assert.equal(s.comparisons, comparisons);
    if (index < frames.length - 1) { assert.equal(s.done, false); assert.equal(s.result, null); }
    assert.deepEqual(frame.lines, expectedLines(frame), `${frame.kind} lines`);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');

    // The invariant: live elements fill exactly slots 0 … size − 1 (shift/remove frames may hold one moving hole).
    assert.ok(s.size >= 0 && s.size <= s.capacity);
    assert.equal(s.slots.length, s.capacity);
    const op = s.operation ? s.operation.split('(')[0] : null;
    const midOperation = ['remove', 'shift-start', 'shift', 'shift-end'].includes(frame.kind);
    // An insert's travelling hole sits inside 0 … size; a just-written append/insert value sits at index size until grow.
    const live = s.size + ((midOperation && op === 'insert') || (frame.kind === 'write' && op !== 'set') ? 1 : 0);
    const holes = s.slots.slice(0, live).filter(slot => slot.value === null).length;
    assert.equal(holes, midOperation ? 1 : 0, `${frame.kind}: no gaps among live elements outside a shift`);
    assert.ok(s.slots.slice(live).every(slot => slot.value === null), 'slots past the live range are free');
    if (!midOperation && live === s.size) assert.deepEqual(s.values, s.slots.slice(0, s.size).map(slot => slot.value));
    assert.equal(new Set(s.slots.map(slot => slot.id)).size, s.capacity);

    const row = frame.scene.rows[0];
    assert.equal(frame.scene.rows.length, 1);
    assert.equal(row.id, 'array'); assert.equal(row.layout, 'cards'); bilingual(row.label);
    assert.deepEqual(row.cells.map(cell => cell.id), s.slots.map(slot => slot.id));
    for (const [position, cell] of row.cells.entries()) {
      assert.equal(cell.index, position);
      assert.equal(cell.value, s.slots[position].value === null ? '' : s.slots[position].value);
      assert.ok(TONES.includes(cell.tone));
      assert.equal(cell.marker.split(' · ').includes('size'), position === s.size);
      assert.equal(cell.marker.split(' · ').includes('j'), position === s.j);
    }
    assert.equal(frame.scene.graph, null);
    assert.equal(frame.scene.collections.length, 1);
    bilingual(frame.scene.collections[0].label);
    assert.deepEqual(frame.scene.collections[0].values, s.outputs);
    frame.metrics.forEach(metric => bilingual(metric.label));
    assert.deepEqual(frame.metrics.map(metric => metric.value), [s.opMoves, s.moves, s.comparisons, s.rejected]);
    const variables = Object.fromEntries(frame.variables.map(variable => [variable.name, variable.value]));
    assert.equal(variables.size, s.size); assert.equal(variables.capacity, s.capacity);

    if (prev) {
      const prevIds = prev.slots.map(slot => slot.id), ids = s.slots.map(slot => slot.id);
      if (frame.kind === 'shift') {
        // Exactly one element moves one slot, trading places with the travelling hole.
        const changed = ids.map((id, k) => id !== prevIds[k] ? k : -1).filter(k => k >= 0);
        assert.equal(changed.length, 2);
        assert.equal(changed[1] - changed[0], 1);
        const isInsert = s.operation.startsWith('insert');
        const [from, to] = isInsert ? [changed[0], changed[1]] : [changed[1], changed[0]];
        assert.equal(s.slots[to].id, prev.slots[from].id, 'the moved card keeps its identity');
        assert.equal(s.slots[to].value, prev.slots[from].value);
        assert.equal(s.slots[from].value, null);
        assert.equal(s.j, isInsert ? prev.j - 1 : prev.j + 1);
        assert.equal(s.opMoves, prev.opMoves + 1);
        assert.equal(s.focus[to], 'active');
      } else if (['write', 'remove'].includes(frame.kind)) {
        const changed = ids.map((id, k) => (id !== prevIds[k] || s.slots[k].value !== prev.slots[k].value) ? k : -1).filter(k => k >= 0);
        assert.equal(changed.length, 1, `${frame.kind} touches one slot`);
      } else {
        assert.deepEqual(s.slots, prev.slots, `${frame.kind} moves nothing`);
      }
      if (frame.kind === 'grow') assert.equal(s.size, prev.size + 1);
      else if (frame.kind === 'shrink') assert.equal(s.size, prev.size - 1);
      else if (frame.kind !== 'done') assert.equal(s.size, prev.size);
    }
    if (frame.kind === 'shift-end') {
      const isInsert = s.operation.startsWith('insert');
      assert.equal(s.slots[s.j].value, null, 'the hole is where the loop stopped');
      if (isInsert) assert.equal(s.j, s.i); else assert.equal(s.j, s.size - 1);
    }
    if (frame.kind === 'write' && s.operation.startsWith('insert')) {
      const shifts = frames.slice(0, index).reverse();
      const startAt = shifts.findIndex(f => f.kind === 'shift-start');
      assert.equal(shifts.slice(0, startAt).filter(f => f.kind === 'shift').length, s.opMoves);
      assert.equal(s.opMoves, s.size - s.i, 'insert moves exactly size − i elements');
    }
    if (frame.kind === 'shrink') assert.equal(s.opMoves, s.size - s.i, 'delete moves exactly (old size) − 1 − i elements');
    if (frame.kind === 'read') assert.equal(s.output, s.slots[s.i].value);
    if (frame.kind === 'found') assert.equal(s.slots[s.i].value, s.value);
    if (frame.kind === 'compare') assert.equal(s.condition, s.slots[s.i].value === s.value);
    if (frame.kind === 'overflow') { assert.equal(s.size, s.capacity); assert.ok(Object.values(s.focus).every(t => t === 'pivot')); }
    if (frame.kind === 'out-of-bounds') {
      const limit = s.operation.startsWith('insert') ? s.size : s.size - 1;
      assert.ok(s.i < 0 || s.i > limit);
    }
  }
  assert.deepEqual(frames, JSON.parse(JSON.stringify(frames)), 'snapshots are JSON-safe');
  return frames;
}

test('every preset runs, matches the reference model, and covers the promised edge cases', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  const preset = id => lesson.presets.find(entry => entry.id === id);
  assert.deepEqual(preset('default').input, lesson.defaults);
  const kinds = new Set();
  for (const entry of [{ id: 'defaults', input: lesson.defaults }, ...lesson.presets]) {
    if (entry.label) bilingual(entry.label);
    const parsed = lesson.parse({ ...entry.input });
    bilingual(lesson.summary(parsed));
    verifyTrace(parsed).forEach(frame => kinds.add(frame.kind));
  }
  for (const kind of ['read', 'write', 'shift', 'remove', 'overflow', 'out-of-bounds', 'found', 'not-found', 'grow', 'shrink']) {
    assert.ok(kinds.has(kind), `presets show ${kind}`);
  }
  assert.equal(lesson.parse(preset('empty').input).initial.length, 0);
  const overflow = lesson.build(lesson.parse(preset('overflow').input));
  assert.equal(overflow.filter(frame => frame.kind === 'overflow').length, 2);
  const duplicates = lesson.build(lesson.parse(preset('duplicates').input)).at(-1).state.result.outputs;
  assert.equal(duplicates[0], '1. find(5) → 0', 'find returns the first of duplicate values');
});

test('front insertions and deletions cost n moves while the end costs none', () => {
  for (let n = 0; n <= 7; n++) {
    const initial = Array.from({ length: n }, (_, k) => k * 10);
    const front = lesson.build({ capacity: 8, initial, operations: [{ op: 'insert', index: 0, value: 5 }] }).at(-1).state;
    assert.equal(front.moves, n);
    const back = lesson.build({ capacity: 8, initial, operations: [{ op: 'append', value: 5 }, { op: 'insert', index: n + 1, value: 6 }] }).at(-1).state;
    assert.equal(back.moves, 0);
    if (n) {
      const del = lesson.build({ capacity: 8, initial, operations: [{ op: 'delete', index: 0 }, { op: 'get', index: n - 2 }] }).at(-1).state;
      assert.equal(del.moves, n - 1);
      const last = lesson.build({ capacity: 8, initial, operations: [{ op: 'delete', index: n - 1 }] }).at(-1).state;
      assert.equal(last.moves, 0);
    }
  }
  const full = lesson.build({ capacity: 2, initial: [1, 2], operations: [{ op: 'insert', index: 9, value: 3 }] });
  assert.equal(full.filter(frame => frame.kind === 'overflow').length, 1, 'full is checked before the index');
  assert.deepEqual(full.at(-1).state.result.values, [1, 2]);
});

test('randomized scripts match the reference model at every frame', () => {
  let seed = 0x5eed11;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const ops = Object.keys({ get: 0, set: 0, append: 0, insert: 0, delete: 0, find: 0 });
  for (let round = 0; round < 150; round++) {
    const capacity = 1 + random(8);
    const initial = Array.from({ length: random(capacity + 1) }, () => random(7) - 3);
    const operations = Array.from({ length: random(13) }, () => {
      const op = ops[random(ops.length)], o = { op };
      if (['get', 'set', 'insert', 'delete'].includes(op)) o.index = random(capacity + 3) - 1;
      if (['set', 'append', 'insert', 'find'].includes(op)) o.value = random(7) - 3;
      return o;
    });
    verifyTrace({ capacity, initial, operations });
  }
  verifyTrace({ capacity: 1, initial: [], operations: [] });
  verifyTrace({ capacity: 8, initial: [-99, 999, -99, 999, 0, 0, 0, 0], operations: Array(12).fill({ op: 'delete', index: 0 }) });
});

test('frames are independent deep snapshots and deterministic', () => {
  const data = lesson.parse(lesson.defaults), before = structuredClone(data);
  const frames = lesson.build(data);
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
  const index = frames.findIndex(frame => frame.kind === 'shift');
  frames[index].state.slots[0].value = 77;
  frames[index].scene.rows[0].cells[0].value = 77;
  frames[index].title.ar = 'changed';
  assert.deepEqual(frames.slice(index + 1), baseline.slice(index + 1));
  data.initial[0] = 77;
  assert.deepEqual(lesson.build(before), baseline);
});
