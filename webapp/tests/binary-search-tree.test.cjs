const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/binary-search-tree.js');

const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.ok(value.ar.trim());
};
const raw = (start, operations) => ({ start, operations });
const rejects = (fn, value) => assert.throws(() => fn(value), error => {
  assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
});

// An independent reference BST (recursive, copy-the-successor delete) to check outcomes and final shape.
function reference(start, ops) {
  let rootNode = null;
  const insert = value => {
    if (!rootNode) { rootNode = { value, left: null, right: null }; return { outcome: 'inserted', comparisons: 0 }; }
    let node = rootNode, comparisons = 0;
    while (true) {
      comparisons++;
      if (value === node.value) return { outcome: 'duplicate', comparisons };
      const side = value < node.value ? 'left' : 'right';
      if (!node[side]) { node[side] = { value, left: null, right: null }; return { outcome: 'inserted', comparisons }; }
      node = node[side];
    }
  };
  const search = value => {
    let node = rootNode, comparisons = 0;
    while (node) {
      comparisons++;
      if (value === node.value) return { outcome: 'found', comparisons };
      node = value < node.value ? node.left : node.right;
    }
    return { outcome: 'not-found', comparisons };
  };
  const remove = value => {
    let comparisons = 0, kind = null;
    const del = (node, target) => {
      if (!node) return null;
      comparisons++;
      if (target < node.value) { node.left = del(node.left, target); return node; }
      if (target > node.value) { node.right = del(node.right, target); return node; }
      if (!node.left || !node.right) { kind = kind || (node.left || node.right ? 'one-child' : 'leaf'); return node.left || node.right; }
      kind = 'two-children';
      let succ = node.right;
      while (succ.left) succ = succ.left;
      node.value = succ.value;
      // Unlinking the successor is pointer work, not a value comparison, in the traced algorithm.
      const saved = comparisons;
      node.right = del(node.right, succ.value);
      comparisons = saved;
      return node;
    };
    rootNode = del(rootNode, value);
    return kind ? { outcome: 'deleted', comparisons, case: kind } : { outcome: 'not-found', comparisons };
  };
  const inorder = (node = rootNode, out = []) => { if (node) { inorder(node.left, out); out.push(node.value); inorder(node.right, out); } return out; };
  const preorder = (node = rootNode, out = []) => { if (node) { out.push(node.value); preorder(node.left, out); preorder(node.right, out); } return out; };
  start.forEach(insert);
  const outcomes = ops.map(op => op.op === 'insert' ? insert(op.value) : op.op === 'search' ? search(op.value)
    : op.op === 'delete' ? remove(op.value) : { outcome: 'output', comparisons: 0, output: inorder() });
  return { outcomes, values: inorder(), preorder: preorder() };
}

function treeOf(state) {
  const preorder = (id, out = []) => { if (id !== null) { out.push(state.nodes[id].value); preorder(state.nodes[id].left, out); preorder(state.nodes[id].right, out); } return out; };
  return preorder(state.root);
}

const linesFor = (frame, op, before) => {
  const kind = frame.kind;
  if (kind === 'ready' || kind === 'done') return [[]];
  const byOp = {
    op: { insert: [[1], [1, 3]], search: [[10, 11]], inorder: [[17]], delete: [[22, 23]] },
    compare: { insert: [[5, 6]], search: [[12, 13]], delete: [[24]] },
    descend: { insert: [[7, 9]], search: [[14], [15]], delete: [[25, 26]] },
    found: { search: [[12, 13]], delete: [[24]] },
    'not-found': { search: [[12, 16]], delete: [[24, 27]] },
  };
  if (byOp[kind]) return byOp[kind][op];
  return [{ 'insert-root': [2], duplicate: [5], attach: [7, 8], visit: [20], 'inorder-done': [21], 'inorder-empty': [18],
    'two-children': [28, 29], 'successor-step': [30], successor: [30], copy: [31, 32], unlink: [33, 34] }[kind]];
};

function verify(start, ops) {
  const input = { start: [...start], ops: ops.map(op => ({ ...op })) };
  const before = structuredClone(input);
  const frames = lesson.build(input);
  assert.deepEqual(input, before, 'input not mutated');
  const expected = reference(start, ops);
  const final = frames.at(-1).state;
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  assert.equal(frames.at(-1).kind, 'done');
  assert.equal(final.done, true);
  assert.deepEqual(final.result.values, expected.values);
  assert.deepEqual(treeOf(final), expected.preorder, 'final shape matches the reference BST');
  assert.equal(final.result.size, expected.values.length);
  assert.deepEqual(final.result.outcomes.map(({ outcome, comparisons }) => ({ outcome, comparisons })),
    expected.outcomes.map(({ outcome, comparisons }) => ({ outcome, comparisons })));
  final.result.outcomes.forEach((outcome, index) => {
    if (expected.outcomes[index].case) assert.equal(outcome.case, expected.outcomes[index].case);
    if (expected.outcomes[index].output) assert.deepEqual(outcome.output, expected.outcomes[index].output);
  });
  assert.equal(frames.filter(frame => frame.kind === 'op').length, ops.length);

  let total = 0, opIndex = -1;
  for (const [index, frame] of frames.entries()) {
    const s = frame.state, previous = frames[index - 1]?.state;
    if (frame.kind === 'op') opIndex++;
    const op = ops[opIndex]?.op;
    // Each visited node costs one three-way comparison, shown as compare, found or duplicate.
    if (['compare', 'found', 'duplicate'].includes(frame.kind)) total++;
    assert.equal(s.totalComparisons, total, `comparison counter at ${frame.kind}`);
    if (index && index < frames.length - 1) { assert.equal(s.done, false); assert.equal(s.result, null); }
    assert.ok(linesFor(frame, op).some(lines => JSON.stringify(lines) === JSON.stringify(frame.lines)), `${frame.kind} (${op}) lines ${frame.lines}`);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    if (previous && frame.kind === 'compare') assert.equal(s.comparisons, previous.comparisons + 1);

    // The BST invariant and parent/child structure hold in every frame except mid-copy (value duplicated on purpose).
    const ids = Object.keys(s.nodes);
    assert.ok(ids.length <= 8);
    const seen = new Set();
    const check = (id, low, high, depth, depths) => {
      if (id === null) return -1;
      assert.ok(!seen.has(id), 'no node reachable twice'); seen.add(id);
      const node = s.nodes[id];
      assert.equal(node.id, id);
      if (frame.kind !== 'copy') assert.ok(node.value > low && node.value < high, `BST invariant at ${node.value}`);
      depths[id] = depth;
      return 1 + Math.max(check(node.left, low, frame.kind === 'copy' ? Infinity : node.value, depth + 1, depths),
        check(node.right, frame.kind === 'copy' ? -Infinity : node.value, high, depth + 1, depths));
    };
    const depths = {};
    const height = check(s.root, -Infinity, Infinity, 0, depths);
    assert.equal(seen.size, ids.length, 'every stored node is in the tree');
    assert.equal(frame.metrics[2].value, ids.length);
    assert.equal(frame.metrics[3].value, height);
    assert.equal(frame.metrics[0].value, s.comparisons);
    assert.equal(frame.metrics[1].value, s.totalComparisons);
    frame.metrics.forEach(metric => bilingual(metric.label));

    const graph = frame.scene.graph;
    if (!ids.length) {
      assert.equal(graph, null);
      assert.ok(frame.scene.rows.some(row => row.id === 'bst-empty' && row.cells.length === 0));
      continue;
    }
    assert.equal(graph.nodes.length, ids.length);
    const nodeIds = graph.nodes.map(node => node.id);
    assert.equal(new Set(nodeIds).size, nodeIds.length);
    const values = graph.nodes.map(node => s.nodes[node.id].value);
    for (let i = 1; i < values.length; i++) {
      assert.ok(frame.kind === 'copy' ? values[i - 1] <= values[i] : values[i - 1] < values[i], 'nodes listed in in-order');
      assert.ok(graph.nodes[i].x > graph.nodes[i - 1].x, 'x follows in-order rank');
    }
    for (const node of graph.nodes) {
      assert.equal(node.label, String(s.nodes[node.id].value));
      assert.ok(['default', 'active', 'sorted', 'muted', 'pivot', 'found'].includes(node.tone));
      assert.ok(node.x >= 22 && node.x <= 418 && node.y >= 22 && node.y <= 314, 'node inside the canvas');
      bilingual(node.detail);
      for (const other of graph.nodes) {
        if (other === node) continue;
        assert.ok(Math.hypot(node.x - other.x, node.y - other.y) >= 50, 'nodes at least 50 apart');
        if (depths[other.id] > depths[node.id]) assert.ok(other.y > node.y, 'deeper nodes are lower');
        if (depths[other.id] === depths[node.id]) assert.equal(other.y, node.y);
      }
    }
    const expectedEdges = ids.flatMap(id => ['left', 'right'].filter(side => s.nodes[id][side] !== null).map(side => `${id}>${s.nodes[id][side]}`)).sort();
    assert.deepEqual(graph.edges.map(edge => `${edge.from}>${edge.to}`).sort(), expectedEdges);
    assert.ok(graph.edges.every(edge => edge.directed === true));
    assert.ok(graph.edges.length <= 20);
    if (frame.kind === 'compare') {
      assert.equal(graph.nodes.filter(node => node.tone === 'active').length, 1, 'one node is compared');
      assert.equal(s.nodes[s.focus].value !== s.value, true);
    }
    if (frame.kind === 'attach' || frame.kind === 'insert-root') {
      const added = graph.nodes.find(node => s.nodes[node.id].value === s.value);
      assert.equal(added.tone, 'pivot');
      assert.equal(s.nodes[added.id].left, null); assert.equal(s.nodes[added.id].right, null);
    }
    for (const row of frame.scene.rows) {
      bilingual(row.label);
      assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
    }
    const output = frame.scene.rows.find(row => row.id === 'bst-output').cells.map(cell => cell.value);
    assert.deepEqual(output, [...output].sort((a, b) => a - b), 'in-order output is ascending');
  }
  assert.deepEqual(frames, JSON.parse(JSON.stringify(frames)), 'snapshots contain only JSON-safe data');
  return frames;
}

test('exports the lesson contract in CommonJS and a dependency-free browser context', () => {
  assert.equal(lesson.id, 'binary-search-tree');
  assert.equal(lesson.number, '16');
  assert.equal(lesson.name, 'Binary Search Tree');
  assert.equal(lesson.theme, 'data-structures');
  assert.equal(lesson.category, 'structure');
  assert.equal(lesson.cost, 'O(h)');
  assert.equal(lesson.label, lesson.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons['binary-search-tree'], lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/binary-search-tree.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = browser.AlgorithmLessons['binary-search-tree'];
  const result = browserLesson.build(browserLesson.parse(raw('2, 1', 'insert 3, inorder'))).at(-1).state.result;
  assert.deepEqual(Array.from(result.values), [1, 2, 3]);

  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.idea,
    lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  assert.ok(lesson.theory.steps.length >= 3);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  const theoryText = JSON.stringify(lesson.theory);
  for (const word of ['root', 'leaf', 'parent', 'child', 'height', 'O(h)', 'O(n)', 'O(log n)', 'n − 1']) assert.ok(theoryText.includes(word), word);
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.ok(lesson.code.every(line => !/\bkey\b/.test(line)));
  assert.deepEqual(lesson.fields.map(field => [field.name, field.type]), [['start', 'text'], ['operations', 'textarea']]);
  for (const field of lesson.fields) { bilingual(field.label); bilingual(field.help); assert.ok(field.maxLength > 0); }
  for (const item of lesson.view.legend) bilingual(item.label);
  const kinds = new Set(lesson.presets.flatMap(preset => lesson.build(lesson.parse(preset.input)).map(frame => frame.kind)));
  for (const kind of lesson.keySteps) assert.ok(kinds.has(kind), `key step ${kind} occurs in some preset`);
});

test('parses separators, case, signs and Arabic digits without mutating the raw input', () => {
  const examples = [
    [raw('', ''), { start: [], ops: [] }],
    [raw(' 5 3  8 ', 'INSERT 4\nsearch -2; Delete +3،inorder'), { start: [5, 3, 8],
      ops: [{ op: 'insert', value: 4 }, { op: 'search', value: -2 }, { op: 'delete', value: 3 }, { op: 'inorder', value: null }] }],
    [raw('٥٠، ٣٠', 'insert ٧٠\n\n search 30 ,'), { start: [50, 30], ops: [{ op: 'insert', value: 70 }, { op: 'search', value: 30 }] }],
    [raw('-99, 999', 'search -99'), { start: [-99, 999], ops: [{ op: 'search', value: -99 }] }],
  ];
  for (const [rawInput, parsed] of examples) {
    const frozen = Object.freeze({ ...rawInput });
    assert.deepEqual(lesson.parse(frozen), parsed);
    assert.deepEqual(frozen, rawInput);
  }
  assert.deepEqual(lesson.parse(lesson.defaults).start, [50, 30, 70, 20, 40]);
  assert.equal(lesson.parse(raw('', Array(12).fill('search 1').join(','))).ops.length, 12);
  // Deletes free space, so a script can insert more than 8 times while never holding 9 nodes.
  assert.doesNotThrow(() => lesson.parse(raw('1,2,3,4,5,6,7,8', 'delete 1, insert 9, delete 2, insert 10, insert 10')));
});

test('parse and build reject malformed, out-of-range and oversized inputs with bilingual errors', () => {
  for (const value of [undefined, null, [], {}, 'x', { start: '1' }, { operations: '' }, { start: 1, operations: '' }, { start: '', operations: [] }]) {
    rejects(lesson.parse, value);
  }
  for (const [start, operations] of [
    ['1.5', ''], ['1,,2', ''], ['a', ''], ['1000', ''], ['-100', ''], ['1, 1', ''], ['1,2,3,4,5,6,7,8,9', ''], ['1'.repeat(65), ''],
    ['', 'insert'], ['', 'insert 1.5'], ['', 'insert x'], ['', 'push 3'], ['', 'inorder 3'], ['', 'search 1000'],
    ['', 'delete -100'], ['', 'insert 1 2'], ['', '<b>'], ['', Array(13).fill('inorder').join(',')], ['', 'i'.repeat(241)],
    ['1,2,3,4,5,6,7,8', 'insert 9'], ['', 'insert 1,insert 2,insert 3,insert 4,insert 5,insert 6,insert 7,insert 8,insert 9'],
  ]) rejects(lesson.parse, raw(start, operations));
  assert.doesNotThrow(() => lesson.parse(raw('1,2,3,4,5,6,7,8', 'insert 8')), 'a duplicate insert never grows the tree');

  const ok = { start: [2, 1], ops: [{ op: 'insert', value: 3 }] };
  assert.doesNotThrow(() => lesson.build(ok));
  for (const value of [undefined, null, [], {}, { start: [] }, { ops: [] }, { start: '1', ops: [] },
    { start: [1, 1], ops: [] }, { start: [0.5], ops: [] }, { start: [1000], ops: [] }, { start: [NaN], ops: [] },
    { start: Array.from({ length: 9 }, (_, i) => i), ops: [] }, { start: [], ops: Array(13).fill({ op: 'inorder', value: null }) },
    { start: [], ops: [{ op: 'pop', value: 1 }] }, { start: [], ops: [{ op: 'insert', value: '1' }] },
    { start: [], ops: [{ op: 'insert' }] }, { start: [], ops: [{ op: 'inorder', value: 3 }] }, { start: [], ops: [null] },
    { start: Array.from({ length: 8 }, (_, i) => i), ops: [{ op: 'insert', value: 99 }] }]) rejects(lesson.build, value);
});

test('presets are distinct, runnable and cover the promised cases', () => {
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
  assert.equal(new Set(lesson.presets.map(preset => JSON.stringify(preset.input))).size, lesson.presets.length);
  const preset = id => lesson.presets.find(entry => entry.id === id);
  assert.deepEqual(preset('default').input, lesson.defaults);
  const results = {};
  for (const entry of lesson.presets) {
    bilingual(entry.label);
    const parsed = lesson.parse(entry.input);
    bilingual(lesson.summary(parsed));
    results[entry.id] = verify(parsed.start, parsed.ops).at(-1).state.result;
  }
  const outcomes = id => results[id].outcomes.map(item => item.outcome);
  assert.ok(outcomes('default').includes('duplicate') && outcomes('default').includes('found') && outcomes('default').includes('not-found'));
  assert.equal(results.balanced.height, 2);
  assert.equal(results.balanced.outcomes.at(-1).comparisons, 3, 'balanced: 7 nodes, a leaf search takes 3 comparisons');
  assert.equal(results.degenerate.height, results.degenerate.size - 1, 'sorted inserts build a chain');
  assert.equal(results.degenerate.outcomes.find(item => item.op === 'search').comparisons, results.degenerate.size, 'searching the last value costs n');
  assert.deepEqual(results['delete-cases'].outcomes.filter(item => item.op === 'delete').map(item => item.case), ['leaf', 'one-child', 'two-children']);
  const deleteFrames = lesson.build(lesson.parse(preset('delete-cases').input));
  assert.ok(deleteFrames.some(frame => frame.kind === 'successor-step'), 'the successor walk is shown');
  assert.ok(outcomes('not-found').filter(item => item === 'not-found').length >= 2);
  assert.ok(outcomes('duplicates').filter(item => item === 'duplicate').length >= 3);
  assert.deepEqual(lesson.parse(preset('empty').input).start, []);
  assert.equal(results.empty.outcomes[0].comparisons, 0);
});

test('random scripts match a reference BST frame by frame', () => {
  let seed = 0xb57;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (let run = 0; run < 150; run++) {
    const pool = Array.from({ length: 12 }, (_, i) => i * 7 - 20);
    const start = [];
    const startCount = random(9);
    while (start.length < startCount) { const value = pool[random(pool.length)]; if (!start.includes(value)) start.push(value); }
    const present = new Set(start), ops = [];
    for (let i = random(13); i > 0; i--) {
      const pick = random(10), value = pool[random(pool.length)];
      if (pick < 4) { if (!present.has(value) && present.size >= 8) continue; present.add(value); ops.push({ op: 'insert', value }); }
      else if (pick < 6) ops.push({ op: 'search', value });
      else if (pick < 9) { present.delete(value); ops.push({ op: 'delete', value }); }
      else ops.push({ op: 'inorder', value: null });
    }
    verify(start, ops);
  }
});

test('every delete case and every successor shape is traced truthfully', () => {
  verify([50, 30, 70, 60, 80, 65], [{ op: 'delete', value: 50 }]); // successor deeper, with a right child
  verify([50, 30, 70], [{ op: 'delete', value: 50 }]); // successor is the right child itself
  verify([50, 70], [{ op: 'delete', value: 50 }]); // root with one child
  verify([50], [{ op: 'delete', value: 50 }, { op: 'insert', value: 50 }]); // tree becomes empty and regrows
  const frames = verify([50, 30, 70, 60, 80, 65], [{ op: 'delete', value: 50 }]);
  const copyFrame = frames.find(frame => frame.kind === 'copy');
  assert.equal(copyFrame.state.nodes[copyFrame.state.root].value, 60);
  assert.equal(Object.values(copyFrame.state.nodes).filter(node => node.value === 60).length, 2, 'the copy briefly shows both 60s');
  const unlink = frames.find(frame => frame.kind === 'unlink');
  assert.equal(unlink.equation, '70.left = 65');
});

test('degenerate chains: every sorted insert costs one more comparison', () => {
  for (const values of [[1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1]]) {
    const frames = verify([], values.map(value => ({ op: 'insert', value })));
    const result = frames.at(-1).state.result;
    assert.deepEqual(result.outcomes.map(item => item.comparisons), [0, 1, 2, 3, 4, 5, 6, 7]);
    assert.equal(result.height, 7);
    assert.match(frames.at(-1).scene.note.en, /linked list/);
  }
});

test('frames are independent deep snapshots, deterministic, and detached from caller input', () => {
  const data = lesson.parse(lesson.presets.find(preset => preset.id === 'delete-cases').input);
  const before = structuredClone(data);
  const frames = lesson.build(data);
  assert.deepEqual(data, before);
  assert.deepEqual(lesson.build(data), frames);
  const earlier = new Set();
  for (const frame of frames) {
    const mine = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      assert.ok(!earlier.has(value), 'no object shared across frames');
      if (mine.has(value)) return;
      mine.add(value);
      Object.values(value).forEach(visit);
    };
    visit(frame);
    mine.forEach(value => earlier.add(value));
  }
  const baseline = structuredClone(frames);
  frames[3].state.nodes[frames[3].state.root].value = 999;
  frames[3].scene.graph.nodes[0].x = 0;
  frames[3].title.ar = 'changed';
  assert.deepEqual(frames.slice(4), baseline.slice(4));
  data.start.push(1);
  assert.deepEqual(frames.slice(0, 3), baseline.slice(0, 3));
});
