const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/hash-table.js');

const TONES = ['default', 'active', 'sorted', 'muted', 'pivot', 'found'];
const sum = key => [...key].reduce((total, c) => total + c.charCodeAt(0), 0);
const hash = key => sum(key) % 7;
const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const lineFor = {
  put: { bucket: [5, 7], compare: [8, 9], update: [10, 11], append: [12, 13] },
  get: { bucket: [5, 15], compare: [16, 17], found: [18], missing: [19] },
  delete: { bucket: [5, 21], compare: [22, 23], remove: [24, 25, 26], missing: [27] },
};

// Reference model: buckets of [key, value] lists with append-at-tail chaining.
function model(operations) {
  const buckets = Array.from({ length: 7 }, () => []), results = [];
  let comparisons = 0, collisions = 0;
  for (const op of operations) {
    const bucket = buckets[hash(op.key)];
    let found = -1;
    for (let i = 0; i < bucket.length; i++) { comparisons++; if (bucket[i].key === op.key) { found = i; break; } }
    if (op.op === 'put') {
      if (found >= 0) { bucket[found].value = op.value; results.push('updated'); }
      else { if (bucket.length) collisions++; bucket.push({ key: op.key, value: op.value }); results.push('inserted'); }
    } else if (found < 0) results.push('not found');
    else if (op.op === 'get') results.push(bucket[found].value);
    else { bucket.splice(found, 1); results.push('deleted'); }
  }
  return { buckets, results, comparisons, collisions, size: buckets.flat().length };
}

function randomScript(seed) {
  let x = seed;
  const next = n => { x = (x * 1103515245 + 12345) % 2147483648; return x % n; };
  const keys = ['a', 'h', 'o', 'cat', 'act', 'tac', 'dog', 'god', 'stop', 'pots', 'zebra', 'abcdefgh'];
  return Array.from({ length: next(13) }, () => {
    const op = ['put', 'put', 'get', 'delete'][next(4)], key = keys[next(keys.length)];
    return op === 'put' ? { op, key, value: next(1099) - 99 } : { op, key };
  });
}
const toText = operations => operations.map(op => op.op === 'put' ? `${op.op} ${op.key} ${op.value}` : `${op.op} ${op.key}`).join('\n');

test('exports the lesson contract in CommonJS and a dependency-free browser', () => {
  assert.equal(lesson.id, 'hash-table');
  assert.equal(lesson.number, '15');
  assert.equal(lesson.name, 'Hash Table');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons['hash-table'], lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/hash-table.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = browser.AlgorithmLessons['hash-table'];
  const result = browserLesson.build(browserLesson.parse({ operations: 'put cat 1, get cat' })).at(-1).state.result;
  assert.deepEqual(Array.from(result.results), ['inserted', 1]);

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  lesson.theory.steps.forEach(step => { bilingual(step.title); bilingual(step.body); });
  lesson.theory.notes.forEach(bilingual);
  lesson.fields.forEach(field => { bilingual(field.label); bilingual(field.help); });
  assert.ok(lesson.code.every(line => line.length < 60));
  assert.ok(lesson.presets.some(preset => preset.id === 'default'));
  assert.ok(lesson.keySteps.includes('compare') && lesson.keySteps.includes('bucket'));
  assert.deepEqual(lesson.parse(lesson.defaults), lesson.parse(lesson.presets[0].input));
});

test('parse accepts the documented syntax and rejects malformed scripts with bilingual messages', () => {
  assert.deepEqual(lesson.parse({ operations: '' }), { operations: [] });
  assert.deepEqual(lesson.parse({ operations: '  \n , ' }), { operations: [] });
  assert.deepEqual(lesson.parse({ operations: 'PUT cat ٥\n get  cat ; delete cat،get dog,' }).operations, [
    { op: 'put', key: 'cat', value: 5 }, { op: 'get', key: 'cat' }, { op: 'delete', key: 'cat' }, { op: 'get', key: 'dog' },
  ]);
  assert.deepEqual(lesson.parse({ operations: 'put a -99, put b +999' }).operations.map(op => op.value), [-99, 999]);
  const rejects = [
    undefined, null, [], {}, { operations: 5 },
    { operations: 'push cat 1' }, { operations: 'put cat' }, { operations: 'put cat 1 2' },
    { operations: 'get cat 1' }, { operations: 'delete' }, { operations: 'put Cat 1' },
    { operations: 'put abcdefghi 1' }, { operations: 'put c4t 1' }, { operations: 'put cat 1000' },
    { operations: 'put cat -100' }, { operations: 'put cat 1.5' }, { operations: 'put cat x' },
    { operations: Array.from({ length: 13 }, () => 'get a').join(',') },
    { operations: 'get a,'.repeat(50) },
  ];
  for (const raw of rejects) {
    assert.throws(() => lesson.parse(raw), error => {
      bilingual(error.userMessage);
      return true;
    }, JSON.stringify(raw));
  }
});

test('build enforces the same constraints on its public input', () => {
  const bad = [
    null, {}, { operations: 'put a 1' }, { operations: [null] }, { operations: [{ op: 'pop', key: 'a' }] },
    { operations: [{ op: 'get', key: 'A' }] }, { operations: [{ op: 'get', key: '' }] },
    { operations: [{ op: 'put', key: 'a' }] }, { operations: [{ op: 'put', key: 'a', value: 1000 }] },
    { operations: [{ op: 'put', key: 'a', value: 1.5 }] }, { operations: [{ op: 'get', key: 'a', value: 1 }] },
    { operations: Array.from({ length: 13 }, () => ({ op: 'get', key: 'a' })) },
  ];
  for (const input of bad) assert.throws(() => lesson.build(input), error => !!error.userMessage, JSON.stringify(input));
  for (const input of bad.slice(1)) assert.throws(() => lesson.summary(input));
});

test('results, final buckets and counters match a reference chaining model', () => {
  const scripts = [...lesson.presets.map(preset => lesson.parse(preset.input).operations)];
  for (let seed = 1; seed <= 150; seed++) scripts.push(randomScript(seed));
  for (const operations of scripts) {
    const input = lesson.parse({ operations: toText(operations) });
    assert.deepEqual(input.operations, operations);
    const frames = lesson.build(input), last = frames.at(-1), expected = model(operations);
    assert.equal(last.kind, 'done');
    assert.equal(last.state.done, true);
    assert.deepEqual(last.state.result, { size: expected.size, buckets: expected.buckets, results: expected.results });
    assert.equal(last.state.comparisons, expected.comparisons);
    assert.equal(last.state.collisions, expected.collisions);
    assert.equal(frames.filter(frame => frame.kind === 'compare').length, expected.comparisons);
    assert.equal(frames.filter(frame => frame.kind === 'hash').length, operations.length);
    assert.equal(frames.filter(frame => frame.kind === 'bucket').length, operations.length);
  }
});

test('every frame keeps the invariant, truthful lines, arithmetic and a coherent scene', () => {
  const scripts = lesson.presets.map(preset => lesson.parse(preset.input));
  for (let seed = 200; seed < 260; seed++) scripts.push({ operations: randomScript(seed) });
  for (const input of scripts) {
    const frames = lesson.build(input);
    assert.equal(frames[0].kind, 'ready');
    assert.deepEqual(frames[0].lines, []);
    let comparisons = 0;
    for (const [index, frame] of frames.entries()) {
      const s = frame.state;
      bilingual(frame.title); bilingual(frame.explanation);
      assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
      // Invariant: each key lives in buckets[hash(key)] exactly once; size counts every entry.
      const keys = s.buckets.flat().map(entry => entry.key);
      assert.equal(new Set(keys).size, keys.length, 'keys are unique');
      s.buckets.forEach((bucket, b) => bucket.forEach(entry => assert.equal(hash(entry.key), b)));
      assert.equal(s.size, keys.length);
      const metric = Object.fromEntries(frame.metrics.map(item => [item.label.en, item.value]));
      assert.equal(metric.Size, s.size);
      assert.equal(metric['Load factor'], `${s.size}/7 ≈ ${(s.size / 7).toFixed(2)}`);
      assert.equal(metric['Longest chain'], Math.max(...s.buckets.map(bucket => bucket.length)));
      if (frame.kind === 'compare') comparisons++;
      assert.equal(metric['Key comparisons'], comparisons);

      const op = s.op;
      if (frame.kind === 'hash') {
        assert.deepEqual(frame.lines, [3, 4]);
        assert.equal(s.sum, sum(s.key));
        assert.equal(frame.equation, `${[...s.key].join('+')} = ${[...s.key].map(c => c.charCodeAt(0)).join('+')} = ${s.sum}`);
      } else if (['ready', 'done'].includes(frame.kind)) {
        assert.equal(op, null);
      } else {
        assert.deepEqual(frame.lines, lineFor[op.op][frame.kind], `${frame.kind} lines for ${op.op}`);
        assert.equal(s.b, hash(op.key));
      }
      if (frame.kind === 'bucket') assert.ok(frame.equation.endsWith(`${s.sum} mod 7 = ${s.b}`));
      if (frame.kind === 'compare') {
        const entry = s.buckets[s.b][s.cursor];
        assert.equal(frame.equation, `"${entry.key}" == "${op.key}" → ${entry.key === op.key}`);
        const next = frames[index + 1].kind;
        if (entry.key === op.key) assert.ok(['update', 'found', 'remove'].includes(next));
        else assert.ok(['compare', 'append', 'missing'].includes(next));
      }

      const rows = frame.scene.rows;
      assert.equal(frame.scene.graph, null);
      assert.deepEqual(rows.filter(row => row.id.startsWith('bucket-')).map(row => row.id), [0, 1, 2, 3, 4, 5, 6].map(b => `bucket-${b}`));
      assert.equal(rows.some(row => row.id === 'key'), s.key !== null);
      for (const row of rows) {
        bilingual(row.label);
        assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
        row.cells.forEach(cell => assert.ok(TONES.includes(cell.tone)));
        if (row.id === 'key') {
          assert.deepEqual(row.cells.map(cell => cell.value), [...s.key]);
          assert.deepEqual(row.cells.map(cell => cell.marker), [...s.key].map(c => String(c.charCodeAt(0))));
          continue;
        }
        const b = Number(row.id.slice(7)), bucket = s.buckets[b], [head, ...entries] = row.cells;
        assert.equal(head.id, `head-${b}`);
        assert.equal(head.value, bucket.length ? '→' : '∅');
        assert.equal(head.tone, b === s.b ? 'pivot' : 'default');
        assert.deepEqual(entries.map(cell => cell.id), bucket.map(entry => `entry-${entry.key}`));
        assert.deepEqual(entries.map(cell => cell.value), bucket.map(entry => `${entry.key}:${entry.value}`));
        if (frame.kind === 'compare' && b === s.b) {
          const toneAt = entries[s.cursor].tone;
          assert.equal(toneAt, bucket[s.cursor].key === op.key ? 'found' : 'active');
          entries.slice(0, s.cursor).forEach(cell => assert.equal(cell.tone, 'muted'));
        }
        if (b !== s.b) entries.forEach(cell => assert.equal(cell.tone, 'default'));
      }
      assert.deepEqual(frame.scene.collections[0].values, s.results.map(item => item.text));
      bilingual(frame.scene.collections[0].label);
      bilingual(frame.scene.note);
    }
  }
});

test('collisions, anagrams, updates, deletes and misses are shown as the lesson describes', () => {
  const run = text => lesson.build(lesson.parse({ operations: text }));
  const anagrams = run('put stop 1, put pots 2, put tops 3, put spot 4, get post');
  assert.equal(anagrams.at(-1).state.collisions, 3);
  assert.equal(anagrams.at(-1).state.result.buckets[hash('stop')].length, 4);
  const lastMiss = anagrams.filter(frame => frame.kind === 'compare').slice(-4);
  assert.ok(lastMiss.every(frame => frame.explanation.en.includes('same letters')));
  assert.equal(anagrams.at(-2).kind, 'missing');

  const update = run('put x 1, put x 2');
  const updateFrame = update.find(frame => frame.kind === 'update');
  assert.equal(updateFrame.equation, 'e.value = 2 (was 1)');
  assert.equal(updateFrame.state.size, 1);

  const spread = run('put a 1, put b 2, put c 3, put d 4, put e 5, put f 6, put g 7');
  assert.equal(spread.at(-1).state.collisions, 0);
  assert.equal(spread.at(-1).state.comparisons, 0);
  assert.ok(spread.at(-1).state.result.buckets.every(bucket => bucket.length === 1));

  const remove = run('put a 1, put h 2, delete a, get h');
  const removeFrame = remove.find(frame => frame.kind === 'remove');
  assert.deepEqual(removeFrame.state.buckets[6], [{ key: 'h', value: 2 }]);
  assert.equal(removeFrame.equation, 'size = 2 - 1 = 1');
  assert.equal(remove.at(-1).state.result.results.at(-1), 2);

  const empty = run('get cat, delete cat');
  assert.deepEqual(empty.filter(frame => frame.kind === 'missing').map(frame => frame.lines), [[19], [27]]);
  assert.equal(empty.some(frame => frame.kind === 'compare'), false);

  const none = run('');
  assert.deepEqual(none.map(frame => frame.kind), ['ready', 'done']);
  assert.deepEqual(none.at(-1).state.result, { size: 0, buckets: [[], [], [], [], [], [], []], results: [] });
});

test('frames are independent deep snapshots, deterministic and detached from the caller input', () => {
  const input = lesson.parse(lesson.defaults), before = structuredClone(input);
  const frames = lesson.build(input);
  assert.deepEqual(input, before);
  assert.deepEqual(lesson.build(input), frames);
  const snapshot = structuredClone(frames[3]);
  frames[3].state.buckets[4].push({ key: 'zzz', value: 0 });
  frames[3].scene.rows[0].cells.length = 0;
  frames[3].title.en = 'changed';
  assert.deepEqual(lesson.build(input)[3], snapshot);
  assert.notEqual(frames[4].state.buckets, frames[5].state.buckets);
  assert.deepEqual(input, before);
});

test('summary counts operations by kind', () => {
  const summary = lesson.summary(lesson.parse({ operations: 'put a 1, get a, delete a, get b' }));
  bilingual(summary);
  assert.match(summary.en, /^4 operations \(1 put · 2 get · 1 delete\)/);
});
