const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const B = require('../lessons/bfs.js');

const clone = value => JSON.parse(JSON.stringify(value));
const trace = (graph, start) => B.build(B.parse({ graph, start }));
const edgeId = (from, to) => [from, to].sort().join('-');
const row = (frame, id) => frame.scene.rows.find(item => item.id === id);
const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim() && value.ar.trim());
};
const lineMap = {
  ready: [], initialize: [2, 3], 'empty-check': [4], seed: [6, 7], 'queue-check': [8],
  dequeue: [9], visit: [10], 'neighbor-check': [11], examine: [12],
  'discovery-check': [13], discover: [14, 15, 16], processed: [17],
};

// Independent all-pairs shortest paths, rather than another BFS implementation.
function referenceDistances(input) {
  const distance = Object.fromEntries(input.nodes.map(from => [from,
    Object.fromEntries(input.nodes.map(to => [to, from === to ? 0 : Infinity]))]));
  for (const { from, to } of input.edges) {
    if (from !== to) distance[from][to] = distance[to][from] = 1;
  }
  for (const via of input.nodes) for (const from of input.nodes) for (const to of input.nodes) {
    distance[from][to] = Math.min(distance[from][to], distance[from][via] + distance[via][to]);
  }
  return Object.fromEntries(input.nodes.map(node => [node,
    Number.isFinite(distance[input.start][node]) ? distance[input.start][node] : '∞']));
}

function assertTrace(input, frames) {
  assert.ok(frames.length >= 4 && frames.length < 200, 'bounded graph produces a finite small trace');
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  const final = frames.at(-1).state;
  assert.equal(final.done, true);
  assert.deepEqual(final.result.distance, referenceDistances(input));
  assert.deepEqual(final.result.order, final.order);
  assert.deepEqual(final.result.parent, final.parent);
  assert.deepEqual(final.order, final.discovered, 'FIFO preserves discovery order');
  assert.deepEqual(final.order, final.processed);
  assert.equal(final.enqueues, final.order.length);
  assert.equal(final.dequeues, final.order.length);
  const graphEdges = new Set(input.edges.map(edge => edgeId(edge.from, edge.to)));
  const reachable = input.nodes.filter(node => final.distance[node] !== '∞').sort();
  assert.deepEqual([...final.order].sort(), reachable);
  const expectedExaminations = [];
  for (const { from, to } of input.edges) if (reachable.includes(from)) {
    expectedExaminations.push(`${from}>${to}`);
    if (from !== to) expectedExaminations.push(`${to}>${from}`);
  }
  assert.deepEqual(final.examinedEdges.map(edge => `${edge.from}>${edge.to}`).sort(), expectedExaminations.sort());
  assert.equal(final.skippedEdges, final.examinedEdges.length - Math.max(0, final.order.length - 1));
  for (const node of input.nodes) {
    if (node === input.start || !reachable.includes(node)) assert.equal(final.parent[node], null);
    else {
      assert.ok(graphEdges.has(edgeId(node, final.parent[node])));
      assert.equal(final.distance[node], final.distance[final.parent[node]] + 1);
    }
  }

  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index], state = frame.state, previous = frames[index - 1]?.state;
    assert.deepEqual(frame.lines, frame.kind === 'done' ? [input.nodes.length ? 18 : 5] : lineMap[frame.kind]);
    assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= B.code.length));
    assert.equal(state.done, index === frames.length - 1);
    if (!state.done) assert.equal(state.result, null);
    for (const list of [state.queue, state.discovered, state.order, state.processed]) {
      assert.equal(new Set(list).size, list.length, 'a node occurs at most once per work collection');
      assert.ok(list.every(node => input.nodes.includes(node)));
    }
    assert.ok(state.queue.every(node => state.discovered.includes(node) && !state.order.includes(node)));
    assert.ok(state.order.every(node => state.discovered.includes(node)));
    assert.ok(state.processed.every(node => state.order.includes(node)));
    assert.equal(state.enqueues, state.discovered.length);
    assert.equal(state.enqueues - state.dequeues, state.queue.length);
    assert.equal(state.dequeues, state.order.length + (frame.kind === 'dequeue' ? 1 : 0));
    assert.ok(state.maxQueue >= state.queue.length);
    for (let i = 1; i < state.queue.length; i++) {
      assert.ok(state.distance[state.queue[i - 1]] <= state.distance[state.queue[i]], 'queue levels never decrease');
    }
    for (let i = 1; i < state.order.length; i++) {
      assert.ok(state.distance[state.order[i - 1]] <= state.distance[state.order[i]], 'visit levels never decrease');
    }
    for (const node of state.discovered) assert.equal(state.distance[node], final.distance[node], 'first distance is final');
    if (state.initialized) for (const node of input.nodes) {
      if (!state.discovered.includes(node)) { assert.equal(state.distance[node], '∞'); assert.equal(state.parent[node], null); }
    }
    if (frame.kind === 'queue-check') {
      assert.equal(state.condition, state.queue.length > 0);
      assert.deepEqual([...state.queue, ...state.processed].sort(), [...state.discovered].sort());
    }
    assert.equal(new Set(state.examinedEdges.map(edge => `${edge.from}>${edge.to}`)).size, state.examinedEdges.length);
    assert.ok(state.examinedEdges.every(edge => graphEdges.has(edgeId(edge.from, edge.to))));
    if (previous) {
      assert.ok(state.enqueues >= previous.enqueues);
      assert.ok(state.dequeues >= previous.dequeues);
      assert.ok(state.examinedEdges.length >= previous.examinedEdges.length);
      assert.ok(state.maxQueue >= previous.maxQueue);
      for (const node of previous.discovered) {
        assert.equal(state.distance[node], previous.distance[node]);
        assert.equal(state.parent[node], previous.parent[node]);
      }
    }
    if (frame.kind === 'seed') {
      assert.deepEqual(state.queue, [input.start]);
      assert.deepEqual(state.discovered, [input.start]);
      assert.equal(state.distance[input.start], 0);
    }
    if (frame.kind === 'dequeue') {
      assert.equal(state.current, previous.queue[0]);
      assert.deepEqual(state.queue, previous.queue.slice(1));
      assert.deepEqual(state.order, previous.order);
      assert.deepEqual(state.discovered, previous.discovered);
    }
    if (frame.kind === 'visit') assert.deepEqual(state.order, [...previous.order, state.current]);
    if (frame.kind === 'examine') {
      assert.deepEqual(state.examinedEdges, [...previous.examinedEdges, { from: state.current, to: state.neighbor }]);
      assert.deepEqual(state.activeEdge, state.examinedEdges.at(-1));
    }
    if (frame.kind === 'discovery-check') {
      assert.equal(state.condition, !state.discovered.includes(state.neighbor));
      assert.deepEqual(state.queue, previous.queue);
      assert.deepEqual(state.distance, previous.distance);
      assert.deepEqual(state.parent, previous.parent);
      assert.equal(frames[index + 1].kind, state.condition ? 'discover' : 'neighbor-check');
    }
    if (frame.kind === 'discover') {
      assert.ok(!previous.discovered.includes(state.neighbor));
      assert.deepEqual(state.queue, [...previous.queue, state.neighbor]);
      assert.deepEqual(state.discovered, [...previous.discovered, state.neighbor]);
      assert.equal(state.parent[state.neighbor], state.current);
      assert.equal(state.distance[state.neighbor], state.distance[state.current] + 1);
    }
    if (frame.kind === 'processed') assert.deepEqual(state.processed, [...previous.processed, state.current]);
  }
  assert.equal(final.maxQueue, Math.max(...frames.map(frame => frame.state.queue.length)));
}

test('BFS exports the contract in CommonJS and a dependency-free classic browser script', () => {
  assert.equal(globalThis.AlgorithmLessons.bfs, B);
  assert.equal(B.id, 'bfs');
  assert.equal(B.number, '07');
  assert.equal(B.category, 'graph');
  for (const name of ['name', 'label', 'cost']) assert.equal(typeof B[name], 'string');
  for (const item of [B.description, B.note, B.summary(B.parse(B.defaults)), B.theory.title, B.theory.intro, B.theory.invariant]) bilingual(item);
  for (const step of B.theory.steps) { bilingual(step.title); bilingual(step.body); }
  for (const note of B.theory.notes) bilingual(note);
  for (const cost of B.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  assert.deepEqual(B.fields.map(field => field.name), ['graph', 'start']);
  for (const field of B.fields) {
    bilingual(field.label); bilingual(field.help);
    assert.ok(['text', 'textarea'].includes(field.type));
    assert.equal(typeof B.defaults[field.name], 'string');
  }
  assert.ok(B.code.every(line => typeof line === 'string' && line.length < 60));
  const sentinel = { keep: true };
  const context = vm.createContext({ AlgorithmLessons: { sentinel } });
  vm.runInContext(readFileSync(require.resolve('../lessons/bfs.js'), 'utf8'), context);
  assert.equal(context.AlgorithmLessons.sentinel, sentinel);
  assert.equal(context.AlgorithmLessons.bfs.id, 'bfs');
  assert.equal(JSON.stringify(context.AlgorithmLessons.bfs.build(context.AlgorithmLessons.bfs.parse(B.defaults))),
    JSON.stringify(B.build(B.parse(B.defaults))));
});

test('Presets cover shared children, cycles, disconnected nodes, singleton, self-loop, wide frontier and empty graph', () => {
  const expected = {
    default: ['A', 'B', 'C', 'D', 'F', 'E'], cycle: ['A', 'B', 'C', 'D'],
    disconnected: ['A', 'B', 'C'], singleton: ['C'], 'self-loop': ['A', 'B'],
    wide: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], empty: [],
  };
  assert.equal(new Set(B.presets.map(preset => preset.id)).size, B.presets.length);
  assert.deepEqual(B.presets.find(preset => preset.id === 'default').input, B.defaults);
  for (const preset of B.presets) {
    bilingual(preset.label);
    const input = B.parse(preset.input), frames = B.build(input);
    assert.deepEqual(frames.at(-1).state.result.order, expected[preset.id]);
    assertTrace(input, frames);
    bilingual(B.summary(input));
  }
  const defaultEnd = B.build(B.parse(B.defaults)).at(-1).state;
  assert.deepEqual(defaultEnd.distance, { A: 0, B: 1, C: 1, D: 2, E: 3, F: 2 });
  assert.equal(defaultEnd.parent.D, 'B', 'alphabetically first route wins a shortest-path tie');
  assert.equal(defaultEnd.examinedEdges.length, 12);
  const wide = B.presets.find(preset => preset.id === 'wide');
  assert.equal(B.build(B.parse(wide.input)).at(-1).state.maxQueue, 7);
});

test('A queued shared child is skipped before processing; cycles and self-loops do not repeat work', () => {
  const frames = trace('A-B, A-C, B-D, C-D, D-D', 'A');
  const shared = frames.find(frame => frame.kind === 'discovery-check' && frame.state.current === 'C' && frame.state.neighbor === 'D');
  assert.equal(shared.state.condition, false);
  assert.ok(shared.state.queue.includes('D'));
  assert.ok(!shared.state.processed.includes('D'));
  assert.equal(shared.state.parent.D, 'B');
  assert.equal(frames.filter(frame => frame.kind === 'discover' && frame.state.neighbor === 'D').length, 1);
  const loop = frames.find(frame => frame.kind === 'discovery-check' && frame.state.current === 'D' && frame.state.neighbor === 'D');
  assert.equal(loop.state.condition, false);
  assert.equal(loop.state.distance.D, 2);
  assert.equal(frames.at(-1).state.examinedEdges.length, 9);
});

test('The chosen start controls reachability, and empty and isolated inputs avoid invalid access', () => {
  const frames = trace('A-B, C-D, E', 'D');
  assert.deepEqual(frames.at(-1).state.result, {
    order: ['D', 'C'], distance: { A: '∞', B: '∞', C: 1, D: 0, E: '∞' },
    parent: { A: null, B: null, C: 'D', D: null, E: null },
  });
  const isolated = trace('A-B, C', 'C').at(-1).state;
  assert.deepEqual(isolated.order, ['C']);
  assert.equal(isolated.examinedEdges.length, 0);
  assert.equal(isolated.maxQueue, 1);
  const empty = trace('', '');
  assert.deepEqual(empty.map(frame => frame.kind), ['ready', 'initialize', 'empty-check', 'done']);
  assert.deepEqual(empty.at(-1).state.result, { order: [], distance: {}, parent: {} });
  assert.ok(empty.every(frame => frame.scene.graph.nodes.length === 0 && frame.scene.graph.edges.length === 0));
});

test('Alphabetical traversal and frames are deterministic despite edge, endpoint and node declaration order', () => {
  const one = B.parse({ graph: 'F, D-E; A-C\nB-D, C-F, C-D, B-A', start: ' A ' });
  const two = B.parse(B.defaults);
  assert.deepEqual(one, two);
  assert.deepEqual(B.build(one), B.build(two));
  assert.deepEqual(B.build({ nodes: [...two.nodes].reverse(), edges: [...two.edges].reverse().map(edge => ({ from: edge.to, to: edge.from })), start: 'A' }), B.build(two));
  const frames = B.build(one);
  for (const current of one.nodes) {
    const scanned = frames.filter(frame => frame.kind === 'examine' && frame.state.current === current).map(frame => frame.state.neighbor);
    assert.deepEqual(scanned, [...scanned].sort());
  }
});

test('BFS agrees with all-pairs shortest paths on every four-node simple graph and each start', () => {
  const nodes = ['A', 'B', 'C', 'D'];
  const possible = nodes.flatMap((from, index) => nodes.slice(index + 1).map(to => ({ from, to })));
  for (let mask = 0; mask < 1 << possible.length; mask++) for (const start of nodes) {
    const input = { nodes, edges: possible.filter((_, index) => mask & (1 << index)), start };
    assertTrace(input, B.build(input));
  }
});

test('Full-size, dense and seeded random graphs preserve queue and distance invariants', () => {
  let seed = 7841;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const allNodes = [...'ABCDEFGH'];
  for (let sample = 0; sample < 40; sample++) {
    const nodes = allNodes.slice(0, sample === 0 ? 8 : 1 + Math.floor(random() * 8));
    const edges = nodes.flatMap((from, index) => nodes.slice(index).map(to => ({ from, to })))
      .filter(() => sample === 0 || random() < 0.45).slice(0, 20);
    const input = { nodes, edges, start: nodes[Math.floor(random() * nodes.length)] };
    assertTrace(input, B.build(input));
  }
});

test('Raw graph syntax normalizes whitespace, separators, implicit nodes and repeated node declarations', () => {
  assert.deepEqual(B.parse({ graph: '  C ;\nB - A, A, A\r\nC-C,\n', start: ' B ' }), {
    nodes: ['A', 'B', 'C'], edges: [{ from: 'A', to: 'B' }, { from: 'C', to: 'C' }], start: 'B',
  });
  assert.deepEqual(B.parse({ graph: ' \n\t ', start: ' ' }), { nodes: [], edges: [], start: null });
});

test('parse rejects malformed, directed, weighted, duplicate, excessive and missing-start inputs with bilingual errors', () => {
  const invalid = [
    null, {}, { graph: [], start: 'A' }, { graph: 'A', start: null },
    ...['a-b', 'A-I', 'AA-B', 'A B', 'A--B', 'A-B-C', 'A->B', 'A:B', 'A-B:2', 'A-B 2', '<script>', 'A،B', 'é', 'A-1', ',;\n', 'A-B, B-A', 'A-A, A-A']
      .map(graph => ({ graph, start: 'A' })),
    { graph: 'A', start: '' }, { graph: 'A', start: 'B' }, { graph: 'A', start: 'a' },
    { graph: 'A', start: 'AB' }, { graph: '', start: 'A' }, { graph: 'A'.repeat(501), start: 'A' },
    { graph: 'A', start: ' '.repeat(16) + 'A' },
  ];
  const nodes = [...'ABCDEFGH'];
  const tooMany = nodes.flatMap((from, index) => nodes.slice(index + 1).map(to => `${from}-${to}`)).slice(0, 21).join(',');
  invalid.push({ graph: tooMany, start: 'A' });
  for (const raw of invalid) assert.throws(() => B.parse(raw), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
});

test('build revalidates its public input, including sparse arrays and unweighted undirected edge shape', () => {
  const valid = { nodes: ['A', 'B'], edges: [{ from: 'A', to: 'B' }], start: 'A' };
  const invalid = [null, {}, [], { ...valid, nodes: 'A B' }, { ...valid, edges: {} },
    ...[['A', 'A'], ['a'], ['I'], ['AA'], [1], new Array(2), [...'ABCDEFGHI']].map(nodes => ({ ...valid, nodes })),
    ...[null, '', 'C', 'AB', 0].map(start => ({ ...valid, start })),
    ...[[null], new Array(1), [['A', 'B']], [{}], [{ from: 'A', to: 'C' }],
      [{ from: 'a', to: 'B' }], [{ from: 'A', to: 'B', weight: 1 }],
      [{ from: 'A', to: 'B', directed: true }],
      [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }]]
      .map(edges => ({ ...valid, edges })),
    { nodes: [], edges: [], start: '' }, { nodes: [], edges: [], start: 'A' },
    { nodes: [], edges: [{ from: 'A', to: 'B' }], start: null },
  ];
  const nodes = [...'ABCDEFGH'];
  const edges = nodes.flatMap((from, index) => nodes.slice(index + 1).map(to => ({ from, to })));
  invalid.push({ nodes, edges: edges.slice(0, 21), start: 'A' });
  for (const input of invalid) assert.throws(() => B.build(input), error => {
    assert.ok(error instanceof Error); bilingual(error.userMessage); return true;
  });
  assertTrace({ nodes, edges: edges.slice(0, 20), start: 'A' }, B.build({ nodes, edges: edges.slice(0, 20), start: 'A' }));
});

test('Inputs stay untouched and every frame owns independent nested snapshots, scenes and results', () => {
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  const raw = freeze(clone(B.defaults));
  const input = freeze(B.parse(raw));
  const original = clone(input), frames = B.build(input), repeated = B.build(input);
  assert.deepEqual(input, original);
  assert.deepEqual(raw, B.defaults);
  assert.deepEqual(frames, repeated);
  const objects = new WeakSet();
  function independent(value) {
    if (value && typeof value === 'object') {
      assert.ok(!objects.has(value), 'no mutable object is shared between snapshots or scene/state copies');
      objects.add(value); Object.values(value).forEach(independent);
    }
  }
  frames.forEach(independent);
  frames[0].state.edges[0].from = 'H';
  frames[0].scene.rows[0].label.en = 'changed';
  frames.at(-1).state.result.order.push('H');
  frames.at(-1).state.result.distance.A = 99;
  assert.deepEqual(frames[1], repeated[1]);
  assert.equal(frames.at(-1).state.distance.A, 0);
  assert.equal(frames.at(-1).state.order.length, original.nodes.length);
  assert.deepEqual(input, original);
  assert.deepEqual(B.build(input), repeated);
});

test('Scenes use valid graph references, stable moving card IDs, scratch identities and contract-only tones', () => {
  const tones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);
  for (const preset of B.presets) for (const frame of B.build(B.parse(preset.input))) {
    const state = frame.state;
    bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
    assert.equal(typeof frame.equation, 'string');
    assert.deepEqual(clone(frame), frame, 'all snapshot data survives JSON with infinity represented as text');
    for (const variable of frame.variables) {
      assert.equal(typeof variable.name, 'string');
      assert.ok(['string', 'number', 'boolean'].includes(typeof variable.value));
    }
    for (const metric of frame.metrics) { bilingual(metric.label); assert.ok(Number.isSafeInteger(metric.value) && metric.value >= 0); }
    assert.equal(frame.metrics[2].value, state.examinedEdges.length);
    const ids = new Set();
    assert.equal(new Set(frame.scene.rows.map(item => item.id)).size, frame.scene.rows.length);
    for (const item of frame.scene.rows) {
      bilingual(item.label); assert.equal(item.layout, 'cards');
      for (const cell of item.cells) {
        assert.ok(!ids.has(cell.id)); ids.add(cell.id);
        assert.ok(tones.has(cell.tone));
        if (cell.index !== undefined) assert.ok(Number.isInteger(cell.index) && cell.index >= 0);
      }
    }
    assert.deepEqual(row(frame, 'bfs-queue').cells.map(cell => cell.value), state.queue);
    assert.deepEqual(row(frame, 'bfs-order').cells.map(cell => cell.value), state.order);
    for (const cell of row(frame, 'bfs-queue').cells) assert.equal(cell.id, `bfs-node-${cell.value}`);
    for (const cell of row(frame, 'bfs-current').cells) assert.equal(cell.id, `bfs-node-${cell.value}`);
    for (const cell of row(frame, 'bfs-order').cells) assert.equal(cell.id, `bfs-order-${cell.value}`);
    for (const cell of row(frame, 'bfs-distance').cells) {
      assert.equal(cell.id, `bfs-distance-${cell.marker}`);
      assert.equal(cell.value, state.distance[cell.marker] ?? '—');
    }
    assert.deepEqual(frame.scene.graph.nodes.map(node => node.id), [...state.nodes].sort());
    assert.ok(frame.scene.graph.nodes.length <= 8 && frame.scene.graph.edges.length <= 20);
    for (const node of frame.scene.graph.nodes) { assert.ok(tones.has(node.tone)); assert.equal(typeof node.detail, 'string'); }
    for (const edge of frame.scene.graph.edges) {
      assert.ok(state.nodes.includes(edge.from) && state.nodes.includes(edge.to));
      assert.equal(edge.directed, false); assert.ok(tones.has(edge.tone));
      assert.equal(edge.weight, undefined);
    }
    if (frame.kind === 'examine') {
      const edge = frame.scene.graph.edges.find(edge => edgeId(edge.from, edge.to) === edgeId(state.current, state.neighbor));
      assert.equal(edge.tone, 'active');
    }
    for (const collection of frame.scene.collections) { bilingual(collection.label); assert.ok(Array.isArray(collection.values)); }
    assert.deepEqual(frame.scene.collections[0].values, state.discovered);
    assert.deepEqual(frame.scene.collections[1].values, state.processed);
    assert.equal(frame.scene.collections[2].values.length, state.examinedEdges.length);
  }
});
