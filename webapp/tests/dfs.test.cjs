const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/dfs.js');

const clone = value => JSON.parse(JSON.stringify(value));
const last = frames => frames.at(-1).state;
const trace = (graph, start) => lesson.build(lesson.parse({ graph, start }));
const tones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);

function bilingual(value) {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim());
  assert.match(value.ar, /[\u0600-\u06ff]/);
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// An independent oracle scans the edge list instead of using the lesson's adjacency data.
function reference(input) {
  const order = [], finished = [], examined = [], parent = {};
  const seen = new Set();
  let maxDepth = 0;
  function visit(node, depth) {
    seen.add(node);
    order.push(node);
    maxDepth = Math.max(maxDepth, depth);
    const neighbors = [...new Set(input.edges.flatMap(({ from, to }) =>
      from === node ? [to] : to === node ? [from] : []))].sort();
    for (const neighbor of neighbors) {
      examined.push({ from: node, to: neighbor });
      if (!seen.has(neighbor)) {
        parent[neighbor] = node;
        visit(neighbor, depth + 1);
      }
    }
    finished.push(node);
  }
  if (input.start !== null) visit(input.start, 1);
  return { order, finished, examined, parent, maxDepth };
}

const lineMap = {
  ready: [], initialize: [2, 3], 'empty-check': [4], discover: [9], record: [10],
  examine: [11], unseen: [12], skip: [12], parent: [13], exhausted: [11],
  finish: [15], return: [16],
};

function checkTrace(input, frames) {
  const expected = reference(input);
  const end = last(frames);
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  assert.equal(frames.at(-1).kind, 'done');
  assert.equal(end.done, true);
  assert.deepEqual(end.result, expected.order);
  assert.deepEqual(end.order, expected.order);
  assert.deepEqual(end.discovered, expected.order);
  assert.deepEqual(end.finished, expected.finished);
  assert.deepEqual(end.examinedEdges, expected.examined);
  assert.deepEqual(end.parent, expected.parent);
  assert.equal(end.maxDepth, expected.maxDepth);
  assert.equal(end.edgeChecks, expected.examined.length);
  assert.equal(end.returns, expected.order.length);
  assert.deepEqual(end.stack, []);
  assert.equal(end.treeEdges.length, Math.max(0, expected.order.length - 1));
  assert.ok(frames.length <= 150, 'bounded graph must produce a finite, compact trace');
  assert.deepEqual(frames, clone(frames), 'snapshots must be plain, JSON-safe data');

  const objectReferences = new Set();
  function independent(value) {
    if (value && typeof value === 'object') {
      assert.ok(!objectReferences.has(value), 'nested frame data must not share mutable references');
      objectReferences.add(value);
      Object.values(value).forEach(independent);
    }
  }

  for (const [index, frame] of frames.entries()) {
    independent(frame);
    const s = frame.state;
    const previous = index > 0 ? frames[index - 1].state : null;
    bilingual(frame.title);
    bilingual(frame.explanation);
    bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.deepEqual(frame.lines, frame.kind === 'call' ? [s.stack.length === 1 ? 6 : 14]
      : frame.kind === 'done' ? [input.start === null ? 5 : 7] : lineMap[frame.kind]);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
    assert.equal(s.done, index === frames.length - 1);
    if (!s.done) assert.equal(s.result, null);
    assert.equal(s.discovered.length, new Set(s.discovered).size);
    assert.equal(s.finished.length, new Set(s.finished).size);
    assert.equal(s.order.length, new Set(s.order).size);
    assert.deepEqual(s.order, s.discovered.slice(0, s.order.length));
    assert.equal(s.discovered.length - s.order.length, frame.kind === 'discover' ? 1 : 0);
    assert.ok(s.finished.every(node => s.discovered.includes(node)));
    assert.equal(s.current, s.stack.at(-1)?.node ?? null);
    assert.equal(s.stack.length, new Set(s.stack.map(call => call.node)).size);
    assert.ok(s.maxDepth >= s.stack.length);
    assert.equal(s.edgeChecks, s.examinedEdges.length);
    for (const [depth, call] of s.stack.entries()) {
      assert.ok(s.nodes.includes(call.node));
      assert.ok(call.nextIndex >= 0 && call.nextIndex <= s.adjacency[call.node].length);
      if (depth === 0) assert.equal(call.node, input.start);
      else assert.equal(s.parent[call.node], s.stack[depth - 1].node);
      if (frame.kind === 'call' && depth === s.stack.length - 1) assert.ok(!s.discovered.includes(call.node));
      else assert.ok(s.discovered.includes(call.node));
      if (s.finished.includes(call.node)) {
        assert.equal(frame.kind, 'finish');
        assert.equal(depth, s.stack.length - 1);
      }
    }

    assert.deepEqual(frame.metrics.map(metric => metric.value), [s.discovered.length, s.edgeChecks, s.returns, s.maxDepth]);
    for (const metric of frame.metrics) {
      bilingual(metric.label);
      assert.ok(Number.isInteger(metric.value) && metric.value >= 0);
    }
    assert.equal(new Set(frame.variables.map(variable => variable.name)).size, frame.variables.length);
    assert.equal(frame.variables.find(variable => variable.name === 'depth').value, s.stack.length);

    const graph = frame.scene.graph;
    assert.deepEqual(graph.nodes.map(node => node.id), [...input.nodes].sort());
    assert.ok(graph.nodes.length <= 8 && graph.edges.length <= 20);
    for (const node of graph.nodes) {
      assert.equal(node.label, node.id);
      assert.ok(tones.has(node.tone));
      assert.equal(node.detail, `seen: ${s.discovered.includes(node.id)}; finished: ${s.finished.includes(node.id)}`);
      if (s.done) assert.equal(node.tone, expected.order.includes(node.id) ? 'sorted' : 'muted');
    }
    for (const edge of graph.edges) {
      assert.ok(s.nodes.includes(edge.from) && s.nodes.includes(edge.to));
      assert.ok(tones.has(edge.tone));
      assert.equal(edge.directed, false);
    }
    for (const edge of [...s.examinedEdges, ...s.treeEdges, ...(s.activeEdge ? [s.activeEdge] : [])]) {
      assert.ok(graph.edges.some(item => item.from === edge.from && item.to === edge.to
        || item.to === edge.from && item.from === edge.to));
    }
    assert.deepEqual(frame.scene.rows.map(row => row.id), ['dfs-stack', 'dfs-order']);
    for (const row of frame.scene.rows) {
      bilingual(row.label);
      assert.equal(row.layout, 'cards');
      assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
      for (const [cellIndex, cell] of row.cells.entries()) {
        assert.equal(cell.index, cellIndex);
        assert.ok(tones.has(cell.tone));
        assert.equal(cell.id, row.id === 'dfs-stack' ? `dfs-call-${cell.value}` : `dfs-order-${cell.value}`);
      }
    }
    assert.deepEqual(frame.scene.rows[0].cells.map(cell => cell.value), s.stack.map(call => call.node));
    assert.deepEqual(frame.scene.rows[1].cells.map(cell => cell.value), s.order);
    assert.deepEqual(frame.scene.collections.map(collection => collection.values), [s.discovered, s.finished]);
    frame.scene.collections.forEach(collection => bilingual(collection.label));

    if (!previous) continue;
    assert.equal(s.edgeChecks - previous.edgeChecks, frame.kind === 'examine' ? 1 : 0);
    assert.equal(s.returns - previous.returns, frame.kind === 'return' ? 1 : 0);
    assert.equal(s.discovered.length - previous.discovered.length, frame.kind === 'discover' ? 1 : 0);
    assert.equal(s.order.length - previous.order.length, frame.kind === 'record' ? 1 : 0);
    assert.equal(s.finished.length - previous.finished.length, frame.kind === 'finish' ? 1 : 0);
    assert.equal(s.stack.length - previous.stack.length, frame.kind === 'call' ? 1 : frame.kind === 'return' ? -1 : 0);
    if (frame.kind === 'examine') {
      assert.equal(s.neighbor, s.adjacency[s.current][s.stack.at(-1).nextIndex - 1]);
      assert.deepEqual(s.activeEdge, { from: s.current, to: s.neighbor });
      assert.equal(s.condition, true);
    }
    if (frame.kind === 'skip' || frame.kind === 'unseen') {
      assert.equal(s.condition, !s.discovered.includes(s.neighbor));
      assert.equal(frames[index + 1].kind, s.condition ? 'parent'
        : s.stack.at(-1).nextIndex === s.adjacency[s.current].length ? 'exhausted' : 'examine');
    }
    if (frame.kind === 'parent') {
      assert.equal(s.parent[s.neighbor], s.current);
      assert.ok(!s.discovered.includes(s.neighbor));
      assert.equal(frames[index + 1].kind, 'call');
      assert.equal(frames[index + 1].state.current, s.neighbor);
    }
    if (frame.kind === 'exhausted') {
      assert.equal(s.condition, false);
      assert.equal(s.stack.at(-1).nextIndex, s.adjacency[s.current].length);
      assert.equal(frames[index + 1].kind, 'finish');
    }
    if (frame.kind === 'finish') {
      assert.ok(s.adjacency[s.current].every(neighbor => s.discovered.includes(neighbor)));
      assert.equal(frames[index + 1].kind, 'return');
    }
    if (frame.kind === 'return') {
      assert.deepEqual(s.stack, previous.stack.slice(0, -1));
      assert.equal(s.finished.at(-1), previous.current);
      if (s.stack.length) assert.equal(s.neighbor, s.stack.at(-1).neighbor);
    }
  }
}

test('registers a dependency-free classic module and complete bilingual lesson metadata', () => {
  assert.equal(globalThis.AlgorithmLessons.dfs, lesson);
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../lessons/dfs.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  assert.equal(browser.AlgorithmLessons.dfs.id, 'dfs');
  assert.deepEqual(clone(browser.AlgorithmLessons.dfs.build(browser.AlgorithmLessons.dfs.parse(lesson.defaults))),
    lesson.build(lesson.parse(lesson.defaults)));
  assert.equal(lesson.number, '08');
  assert.equal(lesson.category, 'graph');
  assert.equal(lesson.name, 'Depth-First Search');
  assert.equal(lesson.cost, 'O(V + E)');
  [lesson.description, lesson.note, lesson.theory.title, lesson.theory.intro, lesson.theory.invariant].forEach(bilingual);
  for (const step of lesson.theory.steps) [step.title, step.body].forEach(bilingual);
  lesson.theory.notes.forEach(bilingual);
  lesson.theory.costs.forEach(cost => { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); });
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
  assert.deepEqual(lesson.fields.map(field => field.name), ['graph', 'start']);
  for (const field of lesson.fields) {
    bilingual(field.label);
    bilingual(field.help);
    assert.ok(['text', 'textarea'].includes(field.type));
    assert.ok(Number.isInteger(field.maxLength));
  }
  assert.equal(new Set(lesson.presets.map(preset => preset.id)).size, lesson.presets.length);
});

test('presets produce exact discovery order and satisfy every trace and scene invariant', () => {
  const expected = {
    default: ['A', 'B', 'D', 'E', 'G', 'F', 'C'],
    branching: ['A', 'B', 'D', 'E', 'C', 'F', 'G'],
    cycle: ['A', 'B', 'C'], disconnected: ['D', 'E'],
    chain: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    'self-loop': ['A', 'B'], singleton: ['D'], empty: [],
  };
  assert.deepEqual(lesson.defaults, lesson.presets.find(preset => preset.id === 'default').input);
  for (const preset of lesson.presets) {
    bilingual(preset.label);
    assert.ok(Object.values(preset.input).every(value => typeof value === 'string'));
    const input = lesson.parse(preset.input);
    const frames = lesson.build(input);
    assert.deepEqual(last(frames).result, expected[preset.id], preset.id);
    bilingual(lesson.summary(input));
    checkTrace(input, frames);
  }
});

test('cycles, self-loops, and disconnected components produce no repeated discovery', () => {
  const cycle = trace('A-B, B-C, C-A, D-E', 'B');
  assert.deepEqual(last(cycle).result, ['B', 'A', 'C']);
  assert.equal(last(cycle).edgeChecks, 6);
  assert.equal(cycle.filter(frame => frame.kind === 'call').length, 3);
  assert.equal(cycle.filter(frame => frame.kind === 'skip').length, 4);
  assert.ok(cycle.filter(frame => frame.kind === 'examine').every(frame => !['D', 'E'].includes(frame.state.current)));
  const loop = trace('A-A, A-B, B-B', 'A');
  assert.equal(last(loop).edgeChecks, 4, 'one entry per self-loop and two per ordinary undirected edge');
  assert.equal(last(loop).maxDepth, 2);
  assert.equal(loop.filter(frame => frame.kind === 'skip' && frame.state.current === frame.state.neighbor).length, 2);
  const isolated = trace('A-B, C', 'C');
  assert.deepEqual(last(isolated).result, ['C']);
  assert.equal(last(isolated).edgeChecks, 0);
  assert.deepEqual(last(isolated).parent, {});
  const empty = trace('', '');
  assert.deepEqual(empty.map(frame => frame.kind), ['ready', 'initialize', 'empty-check', 'done']);
  assert.equal(last(empty).maxDepth, 0);
  assert.equal(last(empty).returns, 0);
});

test('backtracking resumes the parent cursor and stable call-card identities survive suspension', () => {
  const frames = trace('A-C, B-E, A-B, B-D', 'A');
  const callD = frames.find(frame => frame.kind === 'call' && frame.state.current === 'D');
  assert.deepEqual(callD.state.stack.map(call => call.node), ['A', 'B', 'D']);
  assert.equal(callD.state.stack[1].nextIndex, 2);
  const backToB = frames.find(frame => frame.kind === 'return' && frame.state.finished.at(-1) === 'D');
  assert.equal(backToB.state.current, 'B');
  assert.equal(backToB.state.stack.at(-1).nextIndex, 2);
  assert.deepEqual(backToB.scene.rows[0].cells.map(cell => cell.id), ['dfs-call-A', 'dfs-call-B']);
  const next = frames[frames.indexOf(backToB) + 1];
  assert.equal(next.kind, 'examine');
  assert.equal(next.state.neighbor, 'E');
  assert.deepEqual(last(frames).finished, ['D', 'E', 'B', 'C', 'A']);
  assert.deepEqual(last(frames).result, ['A', 'B', 'D', 'E', 'C']);
});

test('parsing defines deterministic undirected syntax, spacing, self-loops, and normalization', () => {
  const raw = { graph: '\n H ; C - A, B-A\r\n D; A; A-A, ;\n', start: ' A ' };
  const before = clone(raw);
  const parsed = lesson.parse(raw);
  assert.deepEqual(parsed, {
    nodes: ['A', 'B', 'C', 'D', 'H'],
    edges: [{ from: 'A', to: 'A' }, { from: 'A', to: 'B' }, { from: 'A', to: 'C' }], start: 'A',
  });
  assert.deepEqual(raw, before);
  const canonical = lesson.parse({ graph: 'A-A, A-B, A-C, D, H', start: 'A' });
  assert.deepEqual(lesson.build(parsed), lesson.build(canonical));
  const shuffled = { nodes: [...canonical.nodes].reverse(), edges: [...canonical.edges].reverse().map(({ from, to }) => ({ from: to, to: from })), start: 'A' };
  assert.deepEqual(lesson.build(shuffled), lesson.build(canonical));
  assert.deepEqual(lesson.parse({ graph: ' , ; \n', start: ' ' }), { nodes: [], edges: [], start: null });
});

test('raw input rejects malformed, excessive, weighted, directed, or ambiguous graphs with bilingual errors', () => {
  const graphs = ['a-b', 'A-I', 'AA-B', 'A-1', 'A->B', 'A--B', 'A-B-C', 'A:B', 'A B', 'A-B:2',
    'A-B، B-C', 'A-B, B-A', 'A-A; A-A', '<script>', 'أ', '😀', 'A'.repeat(513)];
  const bad = [null, [], {}, { graph: 7, start: 'A' }, { graph: 'A', start: null },
    ...graphs.map(graph => ({ graph, start: 'A' })),
    ...['', 'B', 'a', 'AA', 'I', ' A '.repeat(6)].map(start => ({ graph: 'A', start })),
    { graph: '', start: 'A' }];
  const labels = 'ABCDEFGH'.split('');
  const tooMany = labels.flatMap((from, i) => labels.slice(i + 1).map(to => `${from}-${to}`)).slice(0, 21);
  bad.push({ graph: tooMany.join(','), start: 'A' });
  for (const raw of bad) assert.throws(() => lesson.parse(raw), error => { bilingual(error.userMessage); return true; });
  const boundary = lesson.parse({ graph: tooMany.slice(0, 20).join(','), start: 'A' });
  assert.equal(boundary.edges.length, 20);
  checkTrace(boundary, lesson.build(boundary));
  assert.deepEqual(lesson.parse({ graph: 'A'.padEnd(512, ' '), start: 'A'.padEnd(16, ' ') }), { nodes: ['A'], edges: [], start: 'A' });
});

test('public build and summary enforce graph constraints even when parse is bypassed', () => {
  const base = { nodes: ['A', 'B'], edges: [{ from: 'A', to: 'B' }], start: 'A' };
  const bad = [null, [], {}, lesson.defaults,
    { ...base, nodes: ['A', 'A'] }, { ...base, nodes: ['A', 'I'] }, { ...base, nodes: new Array(2) },
    { ...base, nodes: ['A', 1] }, { ...base, nodes: 'AB' }, { ...base, nodes: Array(9).fill('A') },
    { ...base, edges: new Array(1) }, { ...base, edges: {} }, { ...base, edges: [null] },
    { ...base, edges: [['A', 'B']] }, { ...base, edges: [{ from: 'A', to: 'C' }] },
    { ...base, edges: [{ from: 'a', to: 'B' }] }, { ...base, edges: [{ from: 'A' }] },
    { ...base, edges: [{ from: 'A', to: 'B', weight: 2 }] },
    { ...base, edges: [{ from: 'A', to: 'B', directed: true }] },
    { ...base, edges: [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }] },
    { ...base, edges: Array(21).fill({ from: 'A', to: 'B' }) },
    ...[undefined, null, '', 'C', ' A ', 1].map(start => ({ ...base, start })),
    { nodes: [], edges: [], start: 'A' }, { nodes: [], edges: [], start: '' },
    { nodes: [], edges: [{ from: 'A', to: 'A' }], start: null }];
  for (const input of bad) {
    assert.throws(() => lesson.build(input), error => { bilingual(error.userMessage); return true; });
    assert.throws(() => lesson.summary(input), error => { bilingual(error.userMessage); return true; });
  }
  checkTrace(base, lesson.build(base));
});

test('build is pure and deterministic, with independent nested snapshots and scene data', () => {
  const input = freeze(lesson.parse(lesson.defaults));
  const original = clone(input);
  const frames = lesson.build(input);
  const pristine = clone(frames);
  assert.deepEqual(lesson.build(input), pristine);
  assert.deepEqual(input, original);
  frames[0].state.adjacency.A.push('H');
  frames[0].state.edges[0].from = 'H';
  frames[0].scene.graph.nodes[0].tone = 'muted';
  frames[0].scene.rows[0].cells.push({ id: 'bad', value: 'H' });
  const entered = frames.findIndex(frame => frame.kind === 'call');
  frames[entered].state.stack[0].nextIndex = 99;
  frames[entered].scene.rows[0].cells[0].value = 'H';
  assert.equal(frames[entered].state.stack[0].node, 'A');
  assert.deepEqual(frames[entered + 1], pristine[entered + 1]);
  assert.deepEqual(frames[1], pristine[1]);
  frames.at(-1).state.result.push('H');
  assert.deepEqual(frames.at(-1).state.order, pristine.at(-1).state.order);
  assert.deepEqual(input, original);
  assert.deepEqual(lesson.build(input), pristine);
});

test('seeded graph samples match independent DFS across starts, input orders, loops, and density', () => {
  let seed = 803;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let sample = 0; sample < 48; sample++) {
    const count = sample % 9;
    const nodes = 'ABCDEFGH'.slice(0, count).split('');
    const edges = [];
    for (let from = 0; from < count; from++) {
      for (let to = from; to < count; to++) {
        if (edges.length < 20 && random() % 5 < sample % 5) {
          edges.push({ from: nodes[from], to: nodes[to] });
        }
      }
    }
    const input = { nodes: [...nodes].reverse(), edges: edges.reverse(), start: count ? nodes[random() % count] : null };
    const before = clone(input);
    checkTrace(input, lesson.build(freeze(input)));
    assert.deepEqual(input, before);
  }
});
