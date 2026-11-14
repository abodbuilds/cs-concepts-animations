const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/bubble-sort.js');

const sorted = numbers => [...numbers].sort((a, b) => a - b);
const input = numbers => ({ numbers });
const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const inversions = numbers => numbers.reduce((total, value, index) =>
  total + numbers.slice(index + 1).filter(next => next < value).length, 0);
const lineFor = {
  ready: [], boundary: [2], 'outer-check': [3], reset: [4], 'scan-start': [5],
  'pair-check': [6], compare: [7], swap: [8], flag: [9], advance: [10],
  shrink: [11], 'exit-check': [12], 'early-exit': [13], done: [14],
};

test('exports the complete lesson contract in CommonJS and a dependency-free browser', () => {
  assert.equal(lesson.id, 'bubble-sort');
  assert.equal(lesson.number, '04');
  assert.equal(lesson.name, 'Bubble Sort');
  assert.equal(lesson.category, 'sort');
  assert.equal(lesson.cost, 'O(n²)');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons['bubble-sort'], lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/bubble-sort.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = browser.AlgorithmLessons['bubble-sort'];
  assert.equal(browserLesson.id, lesson.id);
  const browserResult = browserLesson.build(browserLesson.parse({ numbers: '3, 1, 2' })).at(-1).state.result;
  assert.deepEqual(Array.from(browserResult), [1, 2, 3]);

  for (const value of [lesson.description, lesson.note, lesson.theory.title,
    lesson.theory.intro, lesson.theory.invariant, lesson.summary(input([]))]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 3);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  assert.match(lesson.code[6], /numbers\[i\] > numbers\[i \+ 1\]/);
  assert.equal(lesson.fields.length, 1);
  const field = lesson.fields[0];
  assert.equal(field.name, 'numbers');
  assert.equal(field.type, 'text');
  assert.equal(field.maxLength, 256);
  bilingual(field.label); bilingual(field.help);
});

test('parses empty, negative, duplicate, signed, and Arabic-digit inputs without mutation', () => {
  const examples = [
    ['', []], [' \n\t ', []], ['0', [0]], ['-999, 999, +2, 2', [-999, 999, 2, 2]],
    ['٧، ٣، ۵، -٢', [7, 3, 5, -2]], ['1 \n -2\t3 , +4، ٥', [1, -2, 3, 4, 5]],
    [Array(16).fill('-999').join(', '), Array(16).fill(-999)],
  ];
  for (const [text, numbers] of examples) {
    const raw = Object.freeze({ numbers: text });
    assert.deepEqual(lesson.parse(raw), { numbers });
    assert.deepEqual(raw, { numbers: text });
  }
  assert.deepEqual(lesson.parse(lesson.defaults), { numbers: [7, 3, 5, 2, 6] });
});

test('parse and build both reject invalid or excessive public inputs with bilingual errors', () => {
  const rejects = (fn, value) => assert.throws(() => fn(value), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
  for (const raw of [undefined, null, [], {}, '1,2', { numbers: 2 }, { numbers: [1, 2] }]) {
    rejects(lesson.parse, raw);
  }
  for (const text of ['1.5', '1e2', '0x10', 'Infinity', 'NaN', '-1000', '1000',
    '9007199254740992', 'cat', '<script>', '1;2', '1,,2', '1, ,2', ',1', '1,', '،،',
    '+ 2', '1-2', '١٫٥', '1'.repeat(257), ' '.repeat(257), Array(17).fill('1').join(',')]) {
    rejects(lesson.parse, { numbers: text });
  }
  const badInputs = [undefined, null, [], {}, [1, 2], '1,2', { numbers: '1,2' },
    { numbers: new Int16Array([1]) }, input(Array(17).fill(0)), input(new Array(2)),
    input([1, , 3])];
  for (const value of [NaN, Infinity, -Infinity, 0.5, 1000, -1000, Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER + 1, '2', null, undefined, true, {}, 2n]) badInputs.push(input([value]));
  for (const value of badInputs) rejects(lesson.build, value);
});

test('all presets are runnable, distinct, localized, and cover the promised edge cases', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.equal(new Set(lesson.presets.map(preset => preset.input.numbers)).size, lesson.presets.length);
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    assert.equal(typeof preset.input.numbers, 'string');
    const parsed = lesson.parse(preset.input);
    assert.deepEqual(lesson.build(parsed).at(-1).state.result, sorted(parsed.numbers));
    bilingual(lesson.summary(parsed));
  }
  const preset = id => lesson.presets.find(entry => entry.id === id);
  assert.deepEqual(preset('default').input, lesson.defaults);
  assert.deepEqual(lesson.parse(preset('empty').input).numbers, []);
  assert.equal(lesson.parse(preset('singleton').input).numbers.length, 1);
  for (const id of ['sorted', 'reverse', 'duplicates', 'equal', 'negative', 'late-small']) assert.ok(preset(id));
});

function verifyTrace(numbers) {
  const original = [...numbers], expected = sorted(numbers);
  const frames = lesson.build(Object.freeze({ numbers: Object.freeze([...numbers]) }));
  const final = frames.at(-1).state;
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  assert.equal(frames[0].state.right, null);
  assert.deepEqual(frames[0].state.numbers, original);
  assert.equal(frames.at(-1).kind, 'done');
  assert.equal(final.done, true);
  assert.deepEqual(final.result, expected);
  assert.deepEqual(final.numbers, expected);
  assert.deepEqual(numbers, original);
  assert.equal(final.swaps, inversions(numbers), 'one adjacent strict swap removes exactly one inversion');
  assert.ok(final.comparisons <= numbers.length * (numbers.length - 1) / 2);
  assert.ok(final.passes <= Math.max(0, numbers.length - 1));
  assert.ok(frames.length <= 8 * numbers.length * numbers.length + 8, 'trace must stay finite and quadratic');

  let comparisons = 0, swaps = 0, passes = 0;
  for (const [frameIndex, frame] of frames.entries()) {
    const s = frame.state, before = frames[frameIndex - 1]?.state;
    if (frame.kind === 'compare') comparisons++;
    if (frame.kind === 'swap') swaps++;
    if (frame.kind === 'reset') passes++;
    assert.equal(s.comparisons, comparisons);
    assert.equal(s.swaps, swaps);
    assert.equal(s.passes, passes);
    if (frameIndex < frames.length - 1) { assert.equal(s.done, false); assert.equal(s.result, null); }
    assert.deepEqual(frame.lines, lineFor[frame.kind]);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.ok(s.sortedFrom >= 0 && s.sortedFrom <= numbers.length);
    assert.deepEqual(s.numbers.slice(s.sortedFrom), expected.slice(s.sortedFrom), 'the completed suffix is in final position');
    if (before) assert.ok(s.sortedFrom <= before.sortedFrom, 'the completed suffix never shrinks');
    if (s.sortedFrom > 0 && s.sortedFrom < numbers.length) {
      assert.ok(Math.max(...s.numbers.slice(0, s.sortedFrom)) <= s.numbers[s.sortedFrom]);
    }
    assert.deepEqual([...s.ids].sort(), original.map((_, i) => `item-${i}`).sort());
    for (let index = 0; index < s.numbers.length; index++) {
      const origin = Number(s.ids[index].slice(5));
      assert.equal(s.numbers[index], original[origin]);
      for (let next = index + 1; next < s.numbers.length; next++) {
        if (s.numbers[index] === s.numbers[next]) {
          assert.ok(origin < Number(s.ids[next].slice(5)), 'equal cards retain input order at every frame');
        }
      }
    }
    assert.equal(frame.scene.rows.length, 1);
    const row = frame.scene.rows[0];
    assert.equal(row.id, 'numbers'); assert.equal(row.layout, 'cards'); bilingual(row.label);
    assert.equal(new Set(row.cells.map(cell => cell.id)).size, numbers.length);
    assert.deepEqual(row.cells.map(cell => cell.id), s.ids);
    assert.deepEqual(row.cells.map(cell => cell.value), s.numbers);
    for (const [index, cell] of row.cells.entries()) {
      assert.equal(cell.index, index);
      assert.ok(['default', 'active', 'sorted', 'muted', 'pivot', 'found'].includes(cell.tone));
      assert.equal(cell.tone === 'sorted', index >= s.sortedFrom);
      assert.equal(cell.tone === 'active', s.pair.includes(index));
      assert.equal(typeof cell.marker, 'string');
      assert.equal(cell.marker.includes('right'), index === s.right);
    }
    assert.equal(frame.scene.graph, null);
    assert.deepEqual(frame.scene.collections, []);
    assert.deepEqual(frame.metrics.map(metric => metric.value),
      [s.comparisons, s.swaps, s.passes, numbers.length - s.sortedFrom]);
    frame.metrics.forEach(metric => bilingual(metric.label));
    assert.deepEqual(Object.fromEntries(frame.variables.map(variable => [variable.name, variable.value])), {
      right: s.right === null ? '—' : s.right, i: s.i === null ? '—' : s.i,
      swapped: s.swapped === null ? '—' : s.swapped, sortedFrom: s.sortedFrom,
    });
    if (frame.kind === 'compare') {
      assert.ok(s.i >= 0 && s.i < s.right && s.right < numbers.length);
      assert.deepEqual(s.pair, [s.i, s.i + 1]);
      assert.equal(s.condition, s.numbers[s.i] > s.numbers[s.i + 1]);
      assert.equal(frames[frameIndex + 1].kind, s.condition ? 'swap' : 'advance');
      assert.equal(frame.equation, `${s.numbers[s.i]} > ${s.numbers[s.i + 1]} → ${s.condition}`);
    } else if (frame.kind === 'swap') {
      assert.equal(frames[frameIndex - 1].kind, 'compare');
      assert.equal(before.condition, true);
      const values = [...before.numbers], ids = [...before.ids];
      [values[s.i], values[s.i + 1]] = [values[s.i + 1], values[s.i]];
      [ids[s.i], ids[s.i + 1]] = [ids[s.i + 1], ids[s.i]];
      assert.deepEqual(s.numbers, values, 'a swap moves exactly the compared adjacent values');
      assert.deepEqual(s.ids, ids, 'the same adjacent card identities move with their values');
      assert.equal(inversions(s.numbers), inversions(before.numbers) - 1);
      assert.equal(frames[frameIndex + 1].kind, 'flag');
    }
    if (before && frame.kind !== 'swap') {
      assert.deepEqual(s.numbers, before.numbers, 'no untraced value movement');
      assert.deepEqual(s.ids, before.ids, 'no untraced card movement');
    }
    if (before) {
      if (!['scan-start', 'advance'].includes(frame.kind)) assert.equal(s.i, before.i);
      if (!['boundary', 'shrink'].includes(frame.kind)) assert.equal(s.right, before.right);
      if (!['reset', 'flag'].includes(frame.kind)) assert.equal(s.swapped, before.swapped);
    }
    if (frame.kind === 'reset') { assert.equal(s.swapped, false); assert.equal(s.sortedFrom, s.right + 1); }
    if (frame.kind === 'flag') assert.equal(s.swapped, true);
    if (frame.kind === 'outer-check') assert.equal(s.condition, s.right > 0);
    if (frame.kind === 'pair-check') assert.equal(s.condition, s.i < s.right);
    if (frame.kind === 'advance') {
      assert.equal(s.i, before.i + 1);
      assert.equal(s.numbers[s.i], Math.max(...s.numbers.slice(0, s.i + 1)), 'the largest scanned value moves right');
    }
    if (frame.kind === 'shrink') {
      assert.equal(s.right, before.right - 1);
      assert.equal(s.sortedFrom, s.right + 1);
    }
    if (frame.kind === 'exit-check') assert.equal(s.condition, !s.swapped);
    if (frame.kind === 'early-exit') {
      assert.equal(s.swapped, false); assert.equal(s.earlyExit, true);
      assert.deepEqual(s.numbers, expected); assert.equal(s.sortedFrom, 0);
      assert.equal(frames[frameIndex + 1].kind, 'done');
    }
  }
  assert.deepEqual(frames, JSON.parse(JSON.stringify(frames)), 'snapshots contain only JSON-safe data');
}

test('sorting traces preserve stability, boundaries, scenes, and exact operations on diverse arrays', () => {
  const examples = [[], [0], [2, 1], [1, 2], [2, 2], [7, 3, 5, 2, 6],
    [3, 1, 3, 2, 1], [2, 3, 4, 5, 1], [999, -999, 0, -999, 999], Array(16).fill(4),
    Array.from({ length: 16 }, (_, i) => i), Array.from({ length: 16 }, (_, i) => 16 - i)];
  let seed = 0x4b0bb1e;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed % 15) - 7; };
  for (let iteration = 0; iteration < 51; iteration++) {
    examples.push(Array.from({ length: iteration % 17 }, random));
  }
  examples.forEach(verifyTrace);
});

test('exhaustive small arrays match stable numeric sorting', () => {
  for (let length = 0; length <= 5; length++) {
    for (let encoding = 0; encoding < 3 ** length; encoding++) {
      let remaining = encoding;
      const numbers = Array.from({ length }, () => { const value = remaining % 3 - 1; remaining = Math.floor(remaining / 3); return value; });
      const final = lesson.build(input(numbers)).at(-1).state;
      const expected = numbers.map((value, index) => ({ value, id: `item-${index}` }))
        .sort((a, b) => a.value - b.value);
      assert.deepEqual(final.result, expected.map(item => item.value));
      assert.deepEqual(final.ids, expected.map(item => item.id));
      assert.equal(final.swaps, inversions(numbers));
    }
  }
});

test('early exit gives linear best case and shrinking bounds give exact reverse-case costs', () => {
  for (let n = 0; n <= 16; n++) {
    for (const numbers of [Array.from({ length: n }, (_, i) => i - 8), Array(n).fill(3)]) {
      const frames = lesson.build(input(numbers)), final = frames.at(-1).state;
      assert.equal(final.comparisons, Math.max(0, n - 1));
      assert.equal(final.swaps, 0);
      assert.equal(final.passes, n > 1 ? 1 : 0);
      assert.equal(final.earlyExit, n > 1);
      assert.equal(frames.filter(frame => frame.kind === 'early-exit').length, n > 1 ? 1 : 0);
    }
    const reverse = Array.from({ length: n }, (_, i) => n - i);
    const frames = lesson.build(input(reverse)), final = frames.at(-1).state;
    const worstCasePairs = n * Math.max(0, n - 1) / 2;
    assert.equal(final.comparisons, worstCasePairs);
    assert.equal(final.swaps, worstCasePairs);
    assert.equal(final.passes, Math.max(0, n - 1));
    assert.equal(final.earlyExit, false);
    const passes = frames.filter(frame => frame.kind === 'reset');
    assert.deepEqual(passes.map(frame => frame.state.right), Array.from({ length: Math.max(0, n - 1) }, (_, i) => n - 1 - i));
    for (const pass of passes) {
      assert.equal(frames.filter(frame => frame.kind === 'compare' && frame.state.passes === pass.state.passes).length, pass.state.right);
    }
  }
  const secondPass = lesson.build(input([2, 1, 3, 4])).at(-1).state;
  assert.equal(secondPass.earlyExit, true, 'swapped must reset after a pass that swapped');
  assert.equal(secondPass.passes, 2);
  assert.equal(secondPass.comparisons, 5);
  assert.equal(lesson.build(input([2, 3, 4, 5, 1])).at(-1).state.comparisons, 10,
    'a small last value still takes quadratic comparisons despite few inversions');
});

test('frames are independent deep snapshots, deterministic, and detached from caller inputs', () => {
  const data = { numbers: [3, 2, 3, 1] }, before = structuredClone(data);
  const frames = lesson.build(data);
  assert.deepEqual(data, before);
  assert.deepEqual(lesson.build(data), frames);
  const earlierObjects = new Set();
  for (const frame of frames) {
    const frameObjects = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      assert.ok(!earlierObjects.has(value), 'no object or array may be shared across frames');
      if (frameObjects.has(value)) return;
      frameObjects.add(value);
      Object.values(value).forEach(visit);
    };
    visit(frame);
    frameObjects.forEach(value => earlierObjects.add(value));
  }
  const baseline = structuredClone(frames);
  data.numbers[0] = 99;
  assert.deepEqual(frames, baseline);
  const index = frames.findIndex(frame => frame.kind === 'swap');
  frames[index].state.numbers[0] = 99;
  frames[index].state.ids[0] = 'changed';
  frames[index].scene.rows[0].cells[0].value = 99;
  frames[index].scene.rows[0].label.en = 'changed';
  frames[index].metrics[0].label.en = 'changed';
  frames[index].variables[0].value = 99;
  frames[index].title.ar = 'changed';
  frames[index].lines.push(99);
  assert.deepEqual(frames.slice(0, index), baseline.slice(0, index));
  assert.deepEqual(frames.slice(index + 1), baseline.slice(index + 1));
  assert.deepEqual(lesson.build(before), baseline);
  const final = frames.at(-1).state;
  final.result[0] = 99;
  assert.deepEqual(final.numbers, sorted(before.numbers));
});
