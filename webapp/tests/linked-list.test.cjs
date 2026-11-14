const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/linked-list.js');

const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const run = (values, operations) => lesson.build(lesson.parse({ values, operations }));
const kinds = frames => frames.map(frame => frame.kind);
const metric = (frame, en) => frame.metrics.find(item => item.label.en === en).value;
const variable = (frame, name) => frame.variables.find(item => item.name === name).value;

// Reference model of the same operations on a plain array.
function model(values, operations) {
  const list = [...values];
  const results = [];
  for (const item of operations) {
    if (item.op === 'insertHead') { list.unshift(item.value); results.push(`insertHead ${item.value} ✓`); }
    else if (item.op === 'append') { list.push(item.value); results.push(`append ${item.value} ✓`); }
    else if (item.op === 'find') results.push(`find ${item.value} → ${list.includes(item.value) ? 'node' : 'null'}`);
    else if (item.op === 'delete') {
      const at = list.indexOf(item.value);
      if (at >= 0) list.splice(at, 1);
      results.push(`delete ${item.value} → ${at >= 0}`);
    } else {
      const at = list.indexOf(item.target);
      if (at >= 0) list.splice(at + 1, 0, item.value);
      results.push(`insertAfter ${item.target} ${item.value}${at >= 0 ? ' ✓' : ' → false'}`);
    }
  }
  return { list, results };
}

const lineKinds = {
  ready: [], op: [1, 5, 13, 19, 28], create: [2, 6, 31], link: [3, 32], head: [4, 8], 'empty-check': [7],
  'start-walk': [9, 14, 20, 29], 'tail-check': [10], step: [11, 17, 23], relink: [12, 33], 'walk-check': [15, 21],
  compare: [16, 22], found: [16], match: [22], 'not-found': [18, 24, 30], unlink: [25, 26], removed: [27], done: [],
};

test('exports the lesson contract in CommonJS and a dependency-free browser context', () => {
  assert.equal(lesson.id, 'linked-list');
  assert.equal(lesson.number, '12');
  assert.equal(lesson.name, 'Linked List');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons['linked-list'], lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/linked-list.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = browser.AlgorithmLessons['linked-list'];
  const result = browserLesson.build(browserLesson.parse({ values: '1, 2', operations: 'insertHead 0' })).at(-1).state.result;
  assert.deepEqual(Array.from(result.list), [0, 1, 2]);

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 4);
  lesson.theory.steps.forEach(step => { bilingual(step.title); bilingual(step.body); });
  lesson.theory.notes.forEach(bilingual);
  lesson.theory.costs.forEach(cost => { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); });
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  assert.deepEqual(lesson.fields.map(field => [field.name, field.type]), [['values', 'text'], ['operations', 'textarea']]);
  lesson.fields.forEach(field => { bilingual(field.label); bilingual(field.help); assert.ok(field.maxLength > 0); });
  for (const preset of lesson.presets) { bilingual(preset.label); assert.equal(typeof preset.input.values, 'string'); }
  assert.ok(lesson.keySteps.every(kind => Object.hasOwn(lineKinds, kind)));
  lesson.view.legend.forEach(item => bilingual(item.label));
});

test('parses the operation script strictly and accepts harmless variations', () => {
  assert.deepEqual(lesson.parse(lesson.defaults), {
    values: [3, 8, 5],
    operations: [{ op: 'insertHead', value: 1 }, { op: 'append', value: 9 }, { op: 'find', value: 5 },
      { op: 'delete', value: 8 }, { op: 'insertAfter', target: 5, value: 7 }],
  });
  assert.deepEqual(lesson.parse({ values: '', operations: '' }), { values: [], operations: [] });
  assert.deepEqual(lesson.parse({ values: ' -99 999 +2، ٧ ', operations: 'INSERTHEAD -0;\n\n find ٥ ،  insertafter 2 3' }), {
    values: [-99, 999, 2, 7],
    operations: [{ op: 'insertHead', value: 0 }, { op: 'find', value: 5 }, { op: 'insertAfter', target: 2, value: 3 }],
  });
  const raw = Object.freeze({ values: '1,2', operations: 'append 3' });
  lesson.parse(raw);
  assert.deepEqual(raw, { values: '1,2', operations: 'append 3' });
});

test('parse and build reject malformed or excessive input with bilingual errors', () => {
  const rejects = (fn, value) => assert.throws(() => fn(value), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
  for (const raw of [undefined, null, [], {}, { values: '1' }, { values: 1, operations: '' }, { values: '', operations: [] }]) {
    rejects(lesson.parse, raw);
  }
  for (const values of ['1.5', '1000', '-100', 'x', '1,,2', ',1', '1,', '0x1', '1e2', '1 2 3 4 5 6 7', '1'.repeat(65)]) {
    rejects(lesson.parse, { values, operations: '' });
  }
  for (const operations of ['push 1', 'append', 'append 1 2', 'insertAfter 1', 'insertAfter 1 2 3', 'find x',
    'delete 1000', 'insertHead 1.5', 'insertHead1', Array(13).fill('find 1').join('\n'), 'a'.repeat(301),
    'append 1, append 2, append 3, append 4, append 5, append 6, append 7']) {
    rejects(lesson.parse, { values: '', operations });
  }
  // The size limit follows the actual list: a failed delete does not make room.
  rejects(lesson.parse, { values: '1,2,3,4,5,6', operations: 'delete 9\nappend 7' });
  assert.equal(lesson.parse({ values: '1,2,3,4,5,6', operations: 'delete 6\nappend 7\ninsertAfter 9 1' }).operations.length, 3);
  for (const input of [null, { values: [], operations: {} }, { values: [1.5], operations: [] }, { values: [1, , 2], operations: [] },
    { values: Array(7).fill(1), operations: [] }, { values: [], operations: [{ op: 'pop', value: 1 }] },
    { values: [], operations: [{ op: 'append', value: 1, extra: 1 }] }, { values: [], operations: [{ op: 'insertAfter', value: 1 }] },
    { values: [], operations: [{ op: 'find', value: 2000 }] }, { values: [], operations: Array(13).fill({ op: 'find', value: 1 }) }]) {
    rejects(lesson.build, input);
    rejects(lesson.summary, input);
  }
});

test('final lists and return values match a reference model for presets and random scripts', () => {
  const cases = [lesson.defaults, ...lesson.presets.map(preset => preset.input)].map(raw => lesson.parse(raw));
  let seed = 12345;
  const random = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const ops = ['insertHead', 'append', 'find', 'delete', 'insertAfter'];
  while (cases.length < 300) {
    const values = Array.from({ length: random(7) }, () => random(6));
    const operations = Array.from({ length: random(13) }, () => {
      const op = ops[random(5)];
      return op === 'insertAfter' ? { op, target: random(6), value: random(6) } : { op, value: random(6) };
    });
    try { cases.push(lesson.parse({ values: values.join(','), operations: operations.map(item =>
      item.op === 'insertAfter' ? `${item.op} ${item.target} ${item.value}` : `${item.op} ${item.value}`).join('\n') })); } catch (error) {
      assert.match(error.message, /past 6 nodes/);
    }
  }
  for (const input of cases) {
    const before = structuredClone(input);
    const frames = lesson.build(input);
    assert.deepEqual(input, before, 'input not mutated');
    const expected = model(input.values, input.operations);
    const last = frames.at(-1);
    assert.equal(last.kind, 'done');
    assert.equal(last.state.done, true);
    assert.deepEqual(last.state.result, expected);
    assert.equal(frames[0].kind, 'ready');
    assert.deepEqual(frames[0].state.list, input.values);
    assert.equal(frames.filter(frame => frame.kind === 'op').length, input.operations.length);
    assert.ok(frames.slice(0, -1).every(frame => !frame.state.done && frame.state.result === null));
  }
});

test('every frame uses truthful lines and a drawable, consistent scene', () => {
  const inputs = [lesson.defaults, ...lesson.presets.map(preset => preset.input)];
  for (const raw of inputs) {
    const frames = lesson.build(lesson.parse(raw));
    for (const frame of frames) {
      assert.ok(Object.hasOwn(lineKinds, frame.kind), frame.kind);
      if (frame.kind === 'start-walk' && frame.lines.length === 2) assert.deepEqual(frame.lines, [29, 14]);
      else if (frame.kind === 'not-found' && frame.lines.length === 2) assert.deepEqual(frame.lines, [18, 30]);
      else {
        assert.ok(frame.lines.length <= 1);
        if (frame.lines.length) assert.ok(lineKinds[frame.kind].includes(frame.lines[0]), `${frame.kind} at ${frame.lines}`);
      }
      bilingual(frame.title); bilingual(frame.explanation);
      const { graph, rows } = frame.scene;
      const ids = new Set(graph.nodes.map(node => node.id));
      assert.equal(ids.size, graph.nodes.length);
      assert.ok(graph.nodes.length <= 8 && graph.edges.length <= 20);
      assert.ok(ids.has('head') && ids.has('null'));
      for (const node of graph.nodes) {
        assert.ok(Number.isFinite(node.x) && node.x >= 22 && node.x <= 418, 'x inside the view');
        assert.ok(Number.isFinite(node.y) && node.y >= 22 && node.y <= 314, 'y inside the view');
      }
      // Every drawn node except null has exactly one outgoing next edge.
      for (const node of graph.nodes) {
        const out = graph.edges.filter(edge => edge.from === node.id);
        assert.equal(out.length, node.id === 'null' ? 0 : 1, node.id);
      }
      assert.ok(graph.edges.every(edge => edge.directed && ids.has(edge.from) && ids.has(edge.to)));
      // Following edges from head reproduces the list row and the state list.
      const next = new Map(graph.edges.map(edge => [edge.from, edge.to]));
      const walk = [];
      for (let id = next.get('head'); id !== 'null'; id = next.get(id)) { walk.push(id); assert.ok(walk.length <= 6); }
      const chain = rows.find(row => row.id === 'chain');
      assert.deepEqual(chain.cells.map(cell => cell.id), walk);
      assert.deepEqual(chain.cells.map(cell => cell.value), frame.state.list);
      assert.equal(new Set(chain.cells.map(cell => cell.id)).size, chain.cells.length);
      assert.equal(variable(frame, 'length'), walk.length);
      if (walk.length) assert.match(chain.cells[0].marker, /head/);
    }
  }
});

test('insertHead is constant work while append walks n - 1 hops', () => {
  const frames = run('1, 2, 3, 4', 'insertHead 0\nappend 6');
  const head = frames.find(frame => frame.kind === 'head');
  assert.equal(metric(head, 'Hops this operation'), 0);
  assert.equal(metric(head, 'Pointer writes'), 2);
  const link = frames.find(frame => frame.kind === 'link');
  assert.equal(link.state.list[0], 1, 'node.next is set before head moves');
  assert.ok(link.scene.graph.edges.some(edge => edge.tone === 'active' && edge.from === link.state.pending && edge.to === link.state.chain[0]));
  const relink = frames.find(frame => frame.kind === 'relink');
  assert.equal(metric(relink, 'Hops this operation'), 4, 'five nodes before append, so four hops');
  assert.equal(metric(relink, 'Pointer writes'), 1);
  assert.equal(frames.filter(frame => frame.kind === 'tail-check').length, 5);
  assert.match(relink.explanation.en, /O\(n\)/);
  // Appending to an empty list takes the head branch with no walk.
  const empty = run('', 'append 4');
  assert.deepEqual(kinds(empty), ['ready', 'op', 'create', 'empty-check', 'head', 'done']);
  assert.deepEqual(empty.find(frame => frame.kind === 'head').lines, [8]);
});

test('find walks node by node and reports the worst case when missing', () => {
  const hit = run('4, 7, 2', 'find 2');
  assert.deepEqual(kinds(hit), ['ready', 'op', 'start-walk', 'walk-check', 'compare', 'step', 'walk-check', 'compare', 'step',
    'walk-check', 'found', 'done']);
  const found = hit.find(frame => frame.kind === 'found');
  assert.equal(metric(found, 'Value comparisons'), 3);
  assert.equal(metric(found, 'Hops this operation'), 2);
  assert.equal(variable(found, 'current'), 2);
  assert.equal(found.scene.rows[0].cells[2].tone, 'found');
  const miss = run('4, 7, 2', 'find 9');
  const notFound = miss.find(frame => frame.kind === 'not-found');
  assert.deepEqual(notFound.lines, [18]);
  assert.equal(metric(notFound, 'Value comparisons'), 3);
  assert.equal(variable(notFound, 'current'), 'null');
  assert.deepEqual(miss.at(-1).state.result.results, ['find 9 → null']);
});

test('delete keeps prev one node behind and relinks around the target', () => {
  const frames = run('3, 8, 5', 'delete 5');
  const steps = frames.filter(frame => frame.kind === 'step');
  assert.deepEqual(steps.map(frame => [variable(frame, 'prev'), variable(frame, 'current')]), [[3, 8], [8, 5]]);
  assert.ok(steps.every(frame => frame.lines[0] === 23));
  const unlink = frames.find(frame => frame.kind === 'unlink');
  assert.deepEqual(unlink.lines, [26]);
  assert.deepEqual(unlink.state.list, [3, 8]);
  const removed = unlink.scene.graph.nodes.find(node => node.tone === 'muted');
  assert.equal(removed.label, '5');
  assert.ok(removed.y > 168, 'unlinked node drops below the chain');
  const prevId = unlink.state.prev;
  assert.ok(unlink.scene.graph.edges.some(edge => edge.from === prevId && edge.to === 'null' && edge.tone === 'active'));
  const after = frames.find(frame => frame.kind === 'removed');
  assert.ok(!after.scene.graph.nodes.some(node => node.label === '5'));
  assert.deepEqual(after.lines, [27]);

  const first = run('5, 2, 5', 'delete 5');
  const headUnlink = first.find(frame => frame.kind === 'unlink');
  assert.deepEqual(headUnlink.lines, [25]);
  assert.equal(variable(headUnlink, 'head'), 2);
  assert.match(first.find(frame => frame.kind === 'removed').explanation.en, /first match/);
  assert.deepEqual(first.at(-1).state.result.list, [2, 5]);

  const empty = run('', 'delete 4');
  assert.deepEqual(kinds(empty), ['ready', 'op', 'start-walk', 'walk-check', 'not-found', 'done']);
  assert.deepEqual(empty.find(frame => frame.kind === 'not-found').lines, [24]);
  assert.match(empty.find(frame => frame.kind === 'walk-check').explanation.en, /empty/);
});

test('insertAfter reuses the find walk, then links the new node before relinking', () => {
  const frames = run('4, 7, 2', 'insertAfter 7 5');
  assert.deepEqual(frames.find(frame => frame.kind === 'start-walk').lines, [29, 14]);
  const create = frames.find(frame => frame.kind === 'create');
  const pending = create.scene.graph.nodes.find(node => node.id === create.state.pending);
  assert.ok(pending.y < 168, 'new node floats above the chain until linked');
  assert.deepEqual(create.state.list, [4, 7, 2]);
  const link = frames.find(frame => frame.kind === 'link');
  assert.deepEqual(link.state.list, [4, 7, 2], 'not reachable after the first write');
  assert.ok(link.scene.graph.edges.some(edge => edge.from === link.state.pending && edge.to === link.state.chain[2]));
  const relink = frames.find(frame => frame.kind === 'relink');
  assert.deepEqual(relink.state.list, [4, 7, 5, 2]);
  assert.equal(metric(relink, 'Pointer writes'), 2);
  const missing = run('4, 7, 2', 'insertAfter 9 5');
  assert.deepEqual(missing.find(frame => frame.kind === 'not-found').lines, [18, 30]);
  assert.ok(!missing.some(frame => frame.kind === 'create'));
  assert.equal(missing.at(-1).state.result.results[0], 'insertAfter 9 5 → false');
});

test('snapshots are independent deep copies with stable node identities', () => {
  const frames = run('5, 5, 5', 'insertHead 5\ndelete 5');
  frames[0].state.list.push(99);
  frames[0].scene.graph.nodes[0].label = 'changed';
  assert.deepEqual(frames[1].state.list, [5, 5, 5]);
  assert.equal(frames[1].scene.graph.nodes[0].label, 'head');
  // The three original nodes keep their ids; the new head is a fourth identity, and delete removes it.
  const ids = frames[0].state.chain;
  const afterInsert = frames.find(frame => frame.kind === 'head').state.chain;
  assert.deepEqual(afterInsert.slice(1), ids);
  assert.ok(!ids.includes(afterInsert[0]));
  assert.deepEqual(frames.at(-1).state.chain, ids);
  // Collections track the script.
  assert.deepEqual(frames.at(-1).scene.collections[0].values, ['✓ insertHead 5', '✓ delete 5']);
});

test('summaries are bilingual and every trace stays bounded', () => {
  bilingual(lesson.summary(lesson.parse(lesson.defaults)));
  const big = lesson.parse({ values: '1,2,3,4,5', operations: Array(12).fill('find 99').join('\n') });
  const frames = lesson.build(big);
  assert.ok(frames.length < 400);
  assert.equal(frames.at(-1).state.result.results.length, 12);
});
