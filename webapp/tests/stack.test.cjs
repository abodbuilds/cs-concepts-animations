const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/stack.js');

const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const raw = (operations, capacity = '4', initial = '') => ({ operations, capacity, initial });
const run = (operations, capacity, initial) => lesson.build(lesson.parse(raw(operations, capacity, initial)));
const lineFor = {
  ready: [], 'push-check': [2, 3], overflow: [4], 'push-top': [5], push: [6],
  'pop-check': [7, 8], 'pop-read': [10], pop: [11, 12],
  'peek-check': [13, 14], peek: [16], 'is-empty': [17, 18], done: [], underflow: null,
};

// Reference model: a plain JavaScript array used as an unbounded list, capped by capacity.
function reference({ capacity, initial, operations }) {
  const stack = [...initial], outputs = [];
  for (const op of operations) {
    if (op.op === 'push') {
      if (stack.length === capacity) outputs.push(`push ${op.value} → overflow`);
      else stack.push(op.value);
    } else if (op.op === 'pop') outputs.push(stack.length ? `pop → ${stack.pop()}` : 'pop → underflow');
    else if (op.op === 'peek') outputs.push(stack.length ? `peek → ${stack.at(-1)}` : 'peek → underflow');
    else outputs.push(`isEmpty → ${stack.length === 0}`);
  }
  return { stack, top: stack.length - 1, outputs };
}

test('exports the lesson contract in CommonJS and a dependency-free browser', () => {
  assert.equal(lesson.id, 'stack');
  assert.equal(lesson.number, '13');
  assert.equal(lesson.name, 'Stack');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.label, 'STACK');
  assert.equal(globalThis.AlgorithmLessons.stack, lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/stack.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = browser.AlgorithmLessons.stack;
  const result = browserLesson.build(browserLesson.parse(raw('push 1, push 2, pop'))).at(-1).state.result;
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { stack: [1], top: 0, outputs: ['pop → 2'] });

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 3);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  assert.deepEqual(lesson.fields.map(field => field.name), ['operations', 'capacity', 'initial']);
  for (const field of lesson.fields) { bilingual(field.label); bilingual(field.help); assert.ok(field.maxLength > 0); }
  assert.equal(lesson.fields[0].type, 'textarea');
  for (const kind of lesson.keySteps) assert.ok(Object.hasOwn(lineFor, kind));
  // The traced code lines must say what the frames claim.
  assert.match(lesson.code[2], /top == capacity - 1/);
  assert.match(lesson.code[3], /overflow/);
  assert.match(lesson.code[4], /top = top \+ 1/);
  assert.match(lesson.code[5], /items\[top\] = value/);
  assert.match(lesson.code[7], /top == -1/);
  assert.match(lesson.code[8], /underflow/);
  assert.match(lesson.code[9], /value = items\[top\]/);
  assert.match(lesson.code[10], /top = top - 1/);
  assert.match(lesson.code[11], /return value/);
  assert.match(lesson.code[13], /top == -1/);
  assert.match(lesson.code[14], /underflow/);
  assert.match(lesson.code[15], /return items\[top\]/);
  assert.match(lesson.code[17], /return top == -1/);
});

test('parses separators, call syntax, case, Arabic digits, and starting values without mutation', () => {
  const examples = [
    [raw('push 5, pop'), { capacity: 4, initial: [], operations: [{ op: 'push', value: 5 }, { op: 'pop' }] }],
    [raw('PUSH(-99)\n\npeek()\nIs Empty\nisEmpty()', ' 8 ', '999 -2'), { capacity: 8, initial: [999, -2],
      operations: [{ op: 'push', value: -99 }, { op: 'peek' }, { op: 'isEmpty' }, { op: 'isEmpty' }] }],
    [raw('push ٧، pop; push +3', '٢', '١'), { capacity: 2, initial: [1],
      operations: [{ op: 'push', value: 7 }, { op: 'pop' }, { op: 'push', value: 3 }] }],
    [raw(Array(12).fill('pop').join('\n'), '1', '0'), { capacity: 1, initial: [0], operations: Array(12).fill({ op: 'pop' }) }],
  ];
  for (const [input, expected] of examples) {
    const frozen = Object.freeze({ ...input });
    assert.deepEqual(lesson.parse(frozen), expected);
    assert.deepEqual(frozen, input);
  }
  assert.deepEqual(lesson.parse({ operations: 'pop', capacity: '3' }), { capacity: 3, initial: [], operations: [{ op: 'pop' }] });
});

test('parse and build reject malformed or excessive input with bilingual errors', () => {
  const rejects = (fn, value) => assert.throws(() => fn(value), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
  for (const value of [undefined, null, [], {}, 'push 1', { operations: 'pop' }, { operations: 1, capacity: '3' },
    { operations: 'pop', capacity: 3 }, { operations: 'pop', capacity: '3', initial: [1] }]) rejects(lesson.parse, value);
  for (const operations of ['', ' \n , ', 'push', 'push 1000', 'push -100', 'push 1.5', 'push 1e2', 'push x',
    'push 1 2', 'pop 3', 'peek 1', 'top', 'size', '<script>', 'pushh 1', Array(13).fill('pop').join(','), 'p'.repeat(241)]) {
    rejects(lesson.parse, raw(operations));
  }
  for (const capacity of ['', '0', '9', '-1', '2.5', 'x', '12345']) rejects(lesson.parse, raw('pop', capacity));
  for (const initial of ['1,,2', '1.5', '1000', 'a', '1, 2, 3, 4, 5', '1'.repeat(65)]) rejects(lesson.parse, raw('pop', '4', initial));

  const good = { capacity: 3, initial: [], operations: [{ op: 'pop' }] };
  const bad = [undefined, null, [], '1', {}, { ...good, capacity: 0 }, { ...good, capacity: 9 }, { ...good, capacity: 2.5 },
    { ...good, capacity: '3' }, { ...good, initial: [1, 2, 3, 4] }, { ...good, initial: [1000] }, { ...good, initial: [NaN] },
    { ...good, initial: '1' }, { ...good, operations: [] }, { ...good, operations: Array(13).fill({ op: 'pop' }) },
    { ...good, operations: [{ op: 'push' }] }, { ...good, operations: [{ op: 'push', value: 1000 }] },
    { ...good, operations: [{ op: 'push', value: '1' }] }, { ...good, operations: [{ op: 'pop', value: 1 }] },
    { ...good, operations: [{ op: 'size' }] }, { ...good, operations: [null] }, { ...good, operations: 'pop' }];
  for (const value of bad) rejects(lesson.build, value);
});

test('presets are distinct, runnable, localized, and cover the promised edge cases', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  const preset = id => lesson.presets.find(entry => entry.id === id);
  assert.deepEqual(preset('default').input, lesson.defaults);
  for (const entry of lesson.presets) {
    bilingual(entry.label);
    const parsed = lesson.parse(entry.input);
    bilingual(lesson.summary(parsed));
    assert.deepEqual(lesson.build(parsed).at(-1).state.result, reference(parsed));
  }
  const kinds = id => new Set(lesson.build(lesson.parse(preset(id).input)).map(frame => frame.kind));
  assert.ok(kinds('underflow').has('underflow'));
  assert.ok(kinds('overflow').has('overflow'));
  assert.ok(kinds('capacity-one').has('overflow'));
  assert.deepEqual(lesson.build(lesson.parse(preset('reverse').input)).at(-1).state.result.outputs.slice(0, 4),
    ['pop → 4', 'pop → 3', 'pop → 2', 'pop → 1'], 'LIFO reverses the push order');
});

function verifyTrace(input) {
  const before = structuredClone(input);
  const frames = lesson.build(input);
  assert.deepEqual(input, before, 'input not mutated');
  const { capacity, initial, operations } = input;
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.top, initial.length - 1);
  assert.equal(frames.at(-1).kind, 'done');
  assert.equal(frames.at(-1).state.done, true);
  assert.deepEqual(frames.at(-1).state.result, reference(input));
  assert.ok(frames.length <= 2 + 3 * operations.length);
  assert.equal(frames.filter(frame => ['push', 'overflow', 'pop', 'peek', 'underflow', 'is-empty'].includes(frame.kind)).length,
    operations.length, 'exactly one finishing frame per operation');

  let accesses = 0, errors = 0;
  for (const [index, frame] of frames.entries()) {
    const s = frame.state, prev = frames[index - 1]?.state;
    if (['push', 'pop-read', 'peek'].includes(frame.kind)) accesses++;
    if (['overflow', 'underflow'].includes(frame.kind)) errors++;
    assert.equal(s.accesses, accesses);
    assert.equal(s.errors, errors);
    if (index < frames.length - 1) { assert.equal(s.done, false); assert.equal(s.result, null); }
    if (frame.kind === 'underflow') {
      assert.deepEqual(frame.lines, frames[index - 1].kind === 'pop-check' ? [9] : [15], 'underflow points at its own error line');
    } else assert.deepEqual(frame.lines, lineFor[frame.kind]);
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.ok(s.top >= -1 && s.top <= capacity - 1, 'invariant: -1 ≤ top ≤ capacity - 1');
    assert.equal(s.items.length, capacity);

    if (prev) {
      // Only the top changes: every slot other than one index stays identical.
      const changed = s.items.map((value, i) => value !== prev.items[i] || s.ids[i] !== prev.ids[i]).filter(Boolean).length;
      if (frame.kind === 'push') {
        assert.equal(changed <= 1, true);
        assert.equal(s.items[s.top], s.value);
        assert.notEqual(s.ids[s.top], prev.ids[s.top], 'a pushed value gets a new identity');
        assert.equal(s.top, prev.top);
      } else {
        assert.equal(changed, 0, `${frame.kind} must not write to the array`);
        assert.deepEqual(s.ids, prev.ids);
      }
      if (frame.kind === 'push-top') assert.equal(s.top, prev.top + 1);
      else if (frame.kind === 'pop') { assert.equal(s.top, prev.top - 1); assert.equal(s.value, prev.items[prev.top]); }
      else assert.equal(s.top, prev.top);
      for (let i = 0; i <= Math.min(s.top, prev.top); i++) {
        if (!(frame.kind === 'push' && i === s.top)) assert.equal(s.ids[i], prev.ids[i], 'values below top never move');
      }
    }
    if (frame.kind === 'push-check') assert.equal(s.condition, s.top === capacity - 1);
    if (['pop-check', 'peek-check'].includes(frame.kind)) assert.equal(s.condition, s.top === -1);
    if (frame.kind === 'overflow') { assert.equal(s.top, capacity - 1); assert.equal(frames[index - 1].kind, 'push-check'); }
    if (frame.kind === 'underflow') { assert.equal(s.top, -1); assert.match(frames[index - 1].kind, /^(pop|peek)-check$/); }
    if (frame.kind === 'peek') assert.equal(s.value, s.items[s.top]);
    if (frame.kind === 'is-empty') assert.equal(s.value, s.top === -1);

    assert.equal(frame.scene.graph, null);
    const row = frame.scene.rows[0];
    assert.equal(frame.scene.rows.length, 1);
    assert.equal(row.id, 'stack'); bilingual(row.label);
    assert.equal(row.cells.length, capacity);
    assert.equal(new Set(row.cells.map(cell => cell.id)).size, capacity);
    for (const [i, cell] of row.cells.entries()) {
      assert.equal(cell.index, i);
      assert.equal(cell.id, s.ids[i] ?? `slot-${i}`);
      assert.equal(cell.value, s.items[i] === null ? '—' : s.items[i]);
      assert.equal(cell.marker === 'top', i === s.top);
      assert.equal(cell.marker === 'old', i > s.top && s.items[i] !== null);
      if (i !== s.touched) assert.equal(cell.tone, i <= s.top ? 'default' : 'muted', 'only the touched slot is highlighted');
      else assert.ok(['active', 'found', 'pivot'].includes(cell.tone));
    }
    if (s.touched !== null) assert.ok(s.touched === s.top || (frame.kind === 'pop' && s.touched === s.top + 1));
    assert.deepEqual(frame.scene.collections[0].values, s.outputs);
    frame.scene.collections.forEach(collection => bilingual(collection.label));
    assert.deepEqual(frame.metrics.map(metric => metric.value), [s.top + 1, `${s.step} / ${operations.length}`, s.accesses, s.errors]);
    frame.metrics.forEach(metric => bilingual(metric.label));
    assert.deepEqual(frame.variables.map(variable => variable.name), ['op', 'top', 'capacity', 'value']);
  }
  assert.deepEqual(frames, JSON.parse(JSON.stringify(frames)), 'snapshots contain only JSON-safe data');
}

test('traces match a reference stack on edge cases and random scripts', () => {
  const ops = text => lesson.parse(raw(text)).operations;
  const examples = [
    { capacity: 1, initial: [], operations: ops('pop') },
    { capacity: 1, initial: [], operations: ops('peek, isEmpty, push 1, push 2, isEmpty, pop, pop') },
    { capacity: 3, initial: [7, 7, 7], operations: ops('push 7, pop, pop, pop, pop, push 7, peek') },
    { capacity: 8, initial: [1, 2, 3, 4, 5, 6, 7, 8], operations: ops('push 9, peek') },
    { capacity: 2, initial: [-99, 999], operations: ops('pop, push 0, pop, pop, pop, peek, isEmpty') },
  ];
  let seed = 0x5eed;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let i = 0; i < 80; i++) {
    const capacity = 1 + random(8);
    const initial = Array.from({ length: random(capacity + 1) }, () => random(7) - 3);
    const operations = Array.from({ length: 1 + random(12) }, () => {
      const kind = random(5);
      return kind < 2 ? { op: 'push', value: random(7) - 3 } : { op: ['pop', 'peek', 'isEmpty'][kind - 2] };
    });
    examples.push({ capacity, initial, operations });
  }
  examples.forEach(verifyTrace);
});

test('every operation costs at most one array access, independent of stack size', () => {
  for (let size = 0; size <= 7; size++) {
    const initial = Array.from({ length: size }, (_, i) => i);
    const frames = lesson.build({ capacity: 8, initial, operations: [{ op: 'push', value: 50 }, { op: 'peek' }, { op: 'pop' }, { op: 'isEmpty' }] });
    const final = frames.at(-1).state;
    assert.equal(final.accesses, 3, 'push writes once, peek and pop read once, isEmpty reads nothing');
    assert.equal(frames.length, 1 + 3 + 2 + 3 + 1 + 1);
  }
});

test('frames are independent deep snapshots, deterministic, and detached from caller input', () => {
  const data = { capacity: 3, initial: [4], operations: [{ op: 'push', value: 2 }, { op: 'pop' }, { op: 'pop' }, { op: 'pop' }] };
  const frames = lesson.build(data);
  assert.deepEqual(lesson.build(data), frames);
  const seen = new Set();
  for (const frame of frames) {
    const own = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      assert.ok(!seen.has(value), 'no object shared across frames');
      if (own.has(value)) return;
      own.add(value); Object.values(value).forEach(visit);
    };
    visit(frame);
    own.forEach(value => seen.add(value));
  }
  const baseline = structuredClone(frames);
  data.initial[0] = 99; data.operations[0].value = 99;
  assert.deepEqual(frames, baseline);
  frames[2].state.items[0] = 42; frames[2].scene.rows[0].cells[0].value = 42; frames[2].title.en = 'x';
  assert.deepEqual(frames.slice(3), baseline.slice(3));
  frames.at(-1).state.result.stack.push(1);
  assert.deepEqual(frames.at(-1).state.items, baseline.at(-1).state.items);
});
