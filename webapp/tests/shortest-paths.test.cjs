'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const lesson = require('../lessons/shortest-paths.js');

const clone = value => JSON.parse(JSON.stringify(value));
const numeric = value => value === '∞' ? Infinity : value;
const raw = (nodes, graph = '', start = '', target = '') => ({ nodes, graph, start, target });
const trace = input => lesson.build(lesson.parse(input));
const result = input => trace(input).at(-1).state.result;
const preset = id => lesson.presets.find(item => item.id === id).input;
const bilingual = value => {
  assert.equal(typeof value?.en, 'string');
  assert.equal(typeof value?.ar, 'string');
  assert.ok(value.en.trim() && value.ar.trim());
};

// Independent oracle: repeated Bellman–Ford relaxation, without minimum selection.
function reference(input) {
  const distances = Object.fromEntries(input.nodes.map(node => [node, Infinity]));
  if (input.start !== null) distances[input.start] = 0;
  for (let pass = 1; pass < input.nodes.length; pass++) {
    for (const edge of input.edges) {
      distances[edge.to] = Math.min(distances[edge.to], distances[edge.from] + edge.weight);
    }
  }
  return Object.fromEntries(Object.entries(distances).map(([node, distance]) => [node, distance === Infinity ? '∞' : distance]));
}

function verifyResult(input, end) {
  const expected = reference(input);
  assert.deepEqual(end.distances, expected);
  assert.deepEqual(end.unreachable, input.nodes.filter(node => expected[node] === '∞'));
  assert.deepEqual([...end.settled].sort(), input.nodes.filter(node => expected[node] !== '∞'));
  assert.equal(new Set(end.settled).size, end.settled.length);
  for (const node of input.nodes) {
    if (expected[node] === '∞' || node === input.start) {
      assert.equal(end.predecessors[node], null);
      continue;
    }
    const visited = new Set();
    let cursor = node, cost = 0;
    while (cursor !== input.start) {
      assert.ok(!visited.has(cursor), 'predecessor links must not form a cycle');
      visited.add(cursor);
      const parent = end.predecessors[cursor];
      const edge = input.edges.find(item => item.from === parent && item.to === cursor);
      assert.ok(edge, 'predecessor must be connected by a directed input edge');
      assert.equal(numeric(expected[parent]) + edge.weight, expected[cursor]);
      cost += edge.weight;
      cursor = parent;
    }
    assert.equal(cost, expected[node]);
  }
  if (input.target === null) {
    assert.equal(end.path, null);
    assert.equal(end.targetDistance, null);
  } else if (expected[input.target] === '∞') {
    assert.deepEqual(end.path, []);
    assert.equal(end.targetDistance, '∞');
  } else {
    assert.equal(end.path[0], input.start);
    assert.equal(end.path.at(-1), input.target);
    assert.equal(end.targetDistance, expected[input.target]);
    assert.equal(new Set(end.path).size, end.path.length);
    let cost = 0;
    for (let index = 1; index < end.path.length; index++) {
      const edge = input.edges.find(item => item.from === end.path[index - 1] && item.to === end.path[index]);
      assert.ok(edge);
      cost += edge.weight;
    }
    assert.equal(cost, end.targetDistance);
  }
}

test('exports a standalone classic-script lesson and preserves the existing registry', () => {
  assert.equal(lesson.id, 'shortest-paths');
  assert.equal(lesson.number, '09');
  assert.equal(lesson.category, 'graph');
  assert.match(lesson.name, /Dijkstra/);
  assert.equal(lesson.cost, 'O(V² + E)');
  assert.equal(globalThis.AlgorithmLessons['shortest-paths'], lesson);
  const context = vm.createContext({ AlgorithmLessons: { existing: { id: 'existing' } } });
  vm.runInContext(readFileSync(require.resolve('../lessons/shortest-paths.js'), 'utf8'), context);
  assert.equal(context.AlgorithmLessons.existing.id, 'existing');
  const browserLesson = context.AlgorithmLessons['shortest-paths'];
  const browserResult = browserLesson.build(browserLesson.parse(browserLesson.defaults)).at(-1).state.result;
  assert.deepEqual(clone(browserResult), result(lesson.defaults));
  for (const value of [lesson.description, lesson.note, lesson.theory.title, lesson.theory.intro, lesson.theory.invariant]) bilingual(value);
  for (const step of lesson.theory.steps) { bilingual(step.title); bilingual(step.body); }
  lesson.theory.notes.forEach(bilingual);
  for (const cost of lesson.theory.costs) { bilingual(cost.label); assert.equal(typeof cost.value, 'string'); }
  for (const field of lesson.fields) {
    bilingual(field.label); bilingual(field.help);
    assert.ok(['text', 'textarea'].includes(field.type));
    assert.equal(typeof lesson.defaults[field.name], 'string');
    assert.ok(field.maxLength > 0);
  }
  assert.ok(lesson.code.every(line => typeof line === 'string' && line.length < 60));
});

test('the default graph improves earlier routes and reconstructs the actual cheapest path', () => {
  const frames = trace(lesson.defaults), end = frames.at(-1).state;
  assert.deepEqual(end.result, {
    start: 'A', target: 'E', distances: { A: 0, B: 3, C: 1, D: 4, E: 7, F: '∞' },
    predecessors: { A: null, B: 'C', C: 'A', D: 'B', E: 'D', F: null },
    settled: ['A', 'C', 'B', 'D', 'E'], unreachable: ['F'], path: ['A', 'C', 'B', 'D', 'E'], targetDistance: 7,
  });
  assert.equal(end.nodeScans, 36, 'six full scans, including the exhausted frontier');
  assert.equal(end.minComparisons, 21);
  assert.equal(end.relaxations, 8);
  assert.equal(end.improvements, 7);
  assert.deepEqual(frames.at(-1).metrics.map(metric => metric.value), [36, 21, 8, 7, 5]);
  const updates = frames.filter(frame => frame.kind === 'distance-update' && frame.state.activeEdge.to === 'E');
  assert.deepEqual(updates.map(frame => frame.state.distances.E), [10, 7]);
  assert.equal(updates[1].state.predecessors.E, 'B', 'predecessor write has its own subsequent frame');
  assert.equal(frames[frames.indexOf(updates[1]) + 1].state.predecessors.E, 'D');
});

test('all presets have validated results, summaries, and distinct useful edge cases', () => {
  assert.equal(new Set(lesson.presets.map(item => item.id)).size, lesson.presets.length);
  for (const item of lesson.presets) {
    bilingual(item.label);
    const input = lesson.parse(item.input);
    bilingual(lesson.summary(input));
    verifyResult(input, lesson.build(input).at(-1).state.result);
  }
  assert.deepEqual(result(preset('singleton')).path, ['A']);
  assert.equal(result(preset('singleton')).targetDistance, 0);
  assert.deepEqual(result(preset('unreachable')).unreachable, ['C', 'D']);
  assert.deepEqual(result(preset('unreachable')).path, []);
  assert.equal(result(preset('all-distances')).path, null);
  assert.deepEqual(result(preset('empty')), {
    start: null, target: null, distances: {}, predecessors: {}, settled: [], unreachable: [], path: null, targetDistance: null,
  });
  assert.deepEqual(result(preset('no-edges')).settled, ['B']);
});

test('ties are deterministic, and zero-weight cycles and self-loops never rewrite a settled route', () => {
  const ties = result(preset('ties'));
  assert.deepEqual(ties.settled, ['A', 'B', 'C', 'D']);
  assert.deepEqual(ties.path, ['A', 'B', 'D']);
  const input = lesson.parse(preset('ties'));
  assert.deepEqual(lesson.build({ ...input, nodes: [...input.nodes].reverse(), edges: [...input.edges].reverse() }), lesson.build(input));
  const zeroFrames = trace(preset('zero-cycle'));
  assert.deepEqual(zeroFrames.at(-1).state.result.distances, { A: 0, B: 0, C: 2 });
  assert.deepEqual(zeroFrames.at(-1).state.result.predecessors, { A: null, B: 'A', C: 'B' });
  const settledTests = zeroFrames.filter(frame => frame.kind === 'relax-test' && frame.state.settled.includes(frame.state.activeEdge.to));
  assert.equal(settledTests.length, 2, 'both the zero-weight back edge and self-loop are examined');
  assert.ok(settledTests.every(frame => !frame.state.condition));
});

test('direction matters and choosing a target never skips other reachable distances', () => {
  assert.equal(result(raw('A B', 'A B 3', 'B', 'A')).targetDistance, '∞');
  assert.equal(result(raw('A B', 'A B 3; B A 4', 'B', 'A')).targetDistance, 4);
  const all = result(raw('A B C D', 'A B 1; A C 5; C D 1', 'A', 'B'));
  assert.deepEqual(all.distances, { A: 0, B: 1, C: 5, D: 6 });
  assert.deepEqual(all.settled, ['A', 'B', 'C', 'D']);
  const self = result(raw('A B C', 'A B 0; B C 1', 'A', 'A'));
  assert.deepEqual(self.path, ['A']);
  assert.deepEqual(self.distances, { A: 0, B: 0, C: 1 });
});

test('parser canonicalizes labels and edge order, including Arabic digits and blank lines', () => {
  assert.deepEqual(lesson.parse(raw(' H, C A ', 'C H ۹;\r\n A C ٠\n\nA H +12;', ' A ', ' H ')), {
    nodes: ['A', 'C', 'H'], edges: [{ from: 'A', to: 'C', weight: 0 }, { from: 'A', to: 'H', weight: 12 }, { from: 'C', to: 'H', weight: 9 }], start: 'A', target: 'H',
  });
  assert.deepEqual(lesson.parse(raw('   ', '\n ; ', ' ', ' ')), { nodes: [], edges: [], start: null, target: null });
});

function assertUserError(action) {
  assert.throws(action, error => {
    assert.ok(error instanceof Error);
    bilingual(error.userMessage);
    return true;
  });
}

test('parser rejects negative, malformed, excessive, or ambiguous graph input with bilingual errors', () => {
  const invalid = [
    null, [], {}, { ...raw('A', '', 'A'), target: null }, { ...raw('A', '', 'A'), graph: 3 },
    raw('A A', '', 'A'), raw('A I', '', 'A'), raw('a B', '', 'B'), raw('AA', '', 'AA'),
    raw('A B C D E F G H A', '', 'A'), raw('A'.repeat(65), '', 'A'),
    raw('A B', 'A C 1', 'A'), raw('A B', 'A B -1', 'A'), raw('A B', 'A B -١', 'A'),
    raw('A B', 'A B 1.5', 'A'), raw('A B', 'A B 1e2', 'A'), raw('A B', 'A B Infinity', 'A'),
    raw('A B', 'A B NaN', 'A'), raw('A B', 'A B 1000', 'A'), raw('A B', 'A B 9007199254740992', 'A'),
    raw('A B', 'A B', 'A'), raw('A B', 'A B 1 extra', 'A'), raw('A B', 'A→B:1', 'A'),
    raw('A B', 'A B 1, B A 2', 'A'), raw('A B', 'A B 1; A B 2', 'A'),
    raw('A B', '<script>', 'A'), raw('A B', ' '.repeat(1025), 'A'),
    raw('A B', '', ''), raw('A B', '', 'C'), raw('A B', '', 'A', 'C'), raw('A B', '', 'A', 'AB'),
    raw('', 'A B 1'), raw('', '', 'A'), raw('', '', '', 'A'),
    raw('A', '', 'A'.repeat(17)), raw('A', '', 'A', 'A'.repeat(17)),
  ];
  const pairs = [];
  for (const from of 'ABCDE') for (const to of 'ABCDE') pairs.push(`${from} ${to} 1`);
  invalid.push(raw('A B C D E', pairs.slice(0, 21).join(';'), 'A'));
  for (const input of invalid) assertUserError(() => lesson.parse(input));
});

test('build independently enforces every public graph constraint', () => {
  const valid = { nodes: ['A', 'B'], edges: [{ from: 'A', to: 'B', weight: 1 }], start: 'A', target: null };
  const invalid = [null, [], {},
    { ...valid, nodes: null }, { ...valid, nodes: ['A', 'A'] }, { ...valid, nodes: ['A', 'I'] },
    { ...valid, nodes: ['A', 'b'] }, { ...valid, nodes: ['A', 1] }, { ...valid, nodes: Array(2) },
    { ...valid, nodes: [...'ABCDEFGHA'] }, { ...valid, nodes: ['AA', 'B'] },
    { ...valid, edges: null }, { ...valid, edges: Array(1) }, { ...valid, edges: [null] },
    { ...valid, edges: [{ from: 'A', to: 'C', weight: 1 }] },
    { ...valid, edges: [{ from: 'a', to: 'B', weight: 1 }] },
    { ...valid, edges: [valid.edges[0], { ...valid.edges[0], weight: 2 }] },
    { ...valid, start: null }, { ...valid, start: 'C' }, { ...valid, start: ' A ' },
    { ...valid, target: '' }, { ...valid, target: 'C' }, { ...valid, target: ['B'] },
    { nodes: [], edges: [], start: 'A', target: null }, { nodes: [], edges: [], start: null, target: 'A' },
  ];
  for (const weight of [-1, 1.5, 1000, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER, '1', null, undefined]) {
    invalid.push({ ...valid, edges: [{ from: 'A', to: 'B', weight }] });
  }
  const edges = [];
  for (const from of 'ABCDE') for (const to of 'ABCDE') edges.push({ from, to, weight: 0 });
  invalid.push({ nodes: [...'ABCDE'], edges: edges.slice(0, 21), start: 'A', target: null });
  for (const input of invalid) assertUserError(() => lesson.build(input));
  assert.equal(lesson.build({ nodes: ['A'], edges: [], start: 'A' }).at(-1).state.result.path, null, 'build target is optional');
});

test('maximum-size graphs and accumulated distances above the edge-weight limit work', () => {
  const nodes = [...'ABCDEFGH'];
  const chain = nodes.slice(1).map((to, index) => ({ from: nodes[index], to, weight: 999 }));
  const end = lesson.build({ nodes, edges: chain, start: 'A', target: 'H' }).at(-1).state;
  assert.equal(end.result.targetDistance, 6993);
  assert.deepEqual(end.result.path, nodes);
  assert.equal(end.nodeScans, 64);
  assert.equal(end.minComparisons, 36);
  assert.equal(end.relaxations, 7);
  const edges = [...chain, ...nodes.map(node => ({ from: node, to: node, weight: 0 })),
    ...nodes.slice(1, 6).map(from => ({ from, to: 'A', weight: 1 }))];
  assert.equal(edges.length, 20);
  const input = { nodes, edges, start: 'A', target: 'H' };
  verifyResult(input, lesson.build(input).at(-1).state.result);
});

const operationLines = {
  ready: [], initialize: [2], 'empty-check': [3], source: [4], loop: [5],
  'minimum-reset': [6], scan: [7], eligibility: [8], 'minimum-compare': [9], 'minimum-choice': [10],
  'minimum-check': [11], settle: [12], edge: [13], candidate: [14], 'relax-test': [15],
  'distance-update': [16], 'predecessor-update': [17], 'keep-distance': [18], 'path-reset': [19],
  'target-check': [20], 'path-empty': [21], 'target-reachable': [22], 'path-start': [23],
  'path-check': [24], 'path-append': [25], 'path-backtrack': [26], 'path-reverse': [27],
};

test('every frame obeys the scene, localization, one-based line, and JSON-safe snapshot contract', () => {
  const tones = new Set(['default', 'active', 'sorted', 'muted', 'pivot', 'found']);
  for (const item of lesson.presets) {
    const input = lesson.parse(item.input), frames = lesson.build(input);
    assert.equal(frames[0].kind, 'ready');
    assert.equal(frames[0].state.done, false);
    assert.equal(frames[0].state.result, null);
    assert.equal(frames.at(-1).state.done, true);
    assert.ok(frames.slice(0, -1).every(frame => !frame.state.done && frame.state.result === null));
    assert.deepEqual(clone(frames), frames);
    assert.ok(frames.length < 700, 'bounded inputs produce a finite, practical trace');
    for (const frame of frames) {
      bilingual(frame.title); bilingual(frame.explanation); bilingual(frame.scene.note);
      assert.equal(typeof frame.equation, 'string');
      assert.deepEqual(frame.lines, frame.kind === 'done' ? [input.nodes.length ? 28 : 3] : operationLines[frame.kind]);
      assert.ok(frame.lines.every(line => Number.isInteger(line) && line >= 1 && line <= lesson.code.length));
      assert.equal(new Set(frame.scene.rows.map(row => row.id)).size, frame.scene.rows.length);
      for (const row of frame.scene.rows) {
        bilingual(row.label);
        assert.equal(row.layout, 'cards');
        assert.equal(new Set(row.cells.map(cell => cell.id)).size, row.cells.length);
        for (const cell of row.cells) {
          assert.equal(typeof cell.id, 'string');
          assert.ok(tones.has(cell.tone));
          assert.ok(['number', 'string'].includes(typeof cell.value));
        }
      }
      assert.deepEqual(frame.scene.graph.nodes.map(node => node.id), input.nodes);
      for (const node of frame.scene.graph.nodes) { assert.ok(tones.has(node.tone)); assert.equal(node.id, node.label); }
      assert.equal(frame.scene.graph.edges.length, input.edges.length);
      for (const edge of frame.scene.graph.edges) {
        assert.ok(input.nodes.includes(edge.from) && input.nodes.includes(edge.to));
        assert.ok(tones.has(edge.tone)); assert.equal(edge.directed, true);
        assert.ok(input.edges.some(item => item.from === edge.from && item.to === edge.to && item.weight === edge.weight));
      }
      for (const collection of frame.scene.collections) { bilingual(collection.label); assert.ok(Array.isArray(collection.values)); }
      for (const metric of frame.metrics) { bilingual(metric.label); assert.ok(Number.isSafeInteger(metric.value) && metric.value >= 0); }
      for (const variable of frame.variables) assert.equal(typeof variable.name, 'string');
      for (const value of Object.values(frame.state.distances)) assert.ok(value === '∞' || Number.isSafeInteger(value));
    }
  }
});

function verifyTrace(input, frames) {
  const expected = reference(input), testedEdges = [], scanGroups = [];
  let scanGroup = null;
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index], state = frame.state, before = frames[index - 1]?.state;
    for (const node of state.settled) assert.equal(state.distances[node], expected[node], 'settled distance is already optimal');
    if (before) for (const node of before.settled) {
      assert.ok(state.settled.includes(node));
      assert.equal(state.distances[node], before.distances[node], 'settled distance cannot change');
      assert.equal(state.predecessors[node], before.predecessors[node], 'settled predecessor cannot change');
    }
    const finiteUnsettled = input.nodes.filter(node => !state.settled.includes(node) && Number.isFinite(numeric(state.distances[node])));
    assert.deepEqual(state.frontier, finiteUnsettled);
    if (frame.kind === 'minimum-reset') { scanGroup = []; scanGroups.push(scanGroup); }
    if (frame.kind === 'scan') scanGroup.push(state.scanNode);
    if (frame.kind === 'minimum-compare') {
      assert.equal(state.condition, numeric(state.distances[state.scanNode]) < numeric(state.best));
      assert.ok(!state.settled.includes(state.scanNode));
    }
    if (frame.kind === 'minimum-check') {
      const ordered = [...finiteUnsettled].sort((a, b) => state.distances[a] - state.distances[b] || a.localeCompare(b));
      assert.equal(state.current, ordered[0] ?? null, 'linear scan chooses the cheapest, alphabetically first node');
      assert.equal(state.condition, ordered.length === 0);
    }
    if (frame.kind === 'relax-test') {
      const { from, to, weight } = state.activeEdge;
      assert.equal(state.current, from);
      assert.ok(state.settled.includes(from));
      assert.equal(state.candidate, state.distances[from] + weight);
      assert.equal(state.previousDistance, state.distances[to]);
      assert.equal(state.condition, state.candidate < numeric(state.distances[to]));
      testedEdges.push(`${from}-${to}`);
      assert.equal(frames[index + 1].kind, state.condition ? 'distance-update' : 'keep-distance');
    }
    if (frame.kind === 'distance-update') {
      assert.ok(!state.settled.includes(state.activeEdge.to));
      assert.equal(state.distances[state.activeEdge.to], state.candidate);
      assert.equal(frames[index + 1].kind, 'predecessor-update');
    }
    if (frame.kind === 'predecessor-update') assert.equal(state.predecessors[state.activeEdge.to], state.current);
    if (frame.kind === 'keep-distance') {
      assert.deepEqual(state.distances, before.distances);
      assert.deepEqual(state.predecessors, before.predecessors);
    }
  }
  for (const group of scanGroups) assert.deepEqual(group, input.nodes, 'each minimum uses a full alphabetical scan');
  const end = frames.at(-1).state;
  assert.deepEqual(testedEdges.sort(), input.edges.filter(edge => expected[edge.from] !== '∞').map(edge => `${edge.from}-${edge.to}`).sort());
  assert.equal(new Set(testedEdges).size, testedEdges.length, 'each reachable outgoing edge is relaxed once');
  assert.equal(end.nodeScans, frames.filter(frame => frame.kind === 'scan').length);
  assert.equal(end.minComparisons, frames.filter(frame => frame.kind === 'minimum-compare').length);
  assert.equal(end.relaxations, testedEdges.length);
  assert.equal(end.improvements, frames.filter(frame => frame.kind === 'distance-update').length);
  assert.equal(end.nodeScans, input.nodes.length * scanGroups.length);
}

test('traces maintain the settling invariant and show every reachable relaxation with truthful counters', () => {
  for (const item of lesson.presets) {
    const input = lesson.parse(item.input);
    verifyTrace(input, lesson.build(input));
  }
});

test('seeded graphs match independent shortest-path results and trace invariants', () => {
  let seed = 731;
  const random = bound => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % bound; };
  for (let trial = 0; trial < 64; trial++) {
    const count = trial % 9, nodes = [...'ABCDEFGH'].slice(0, count), edges = [];
    const possible = [];
    for (const from of nodes) for (const to of nodes) possible.push({ from, to, weight: random(10) });
    while (possible.length && edges.length < 20) {
      const [edge] = possible.splice(random(possible.length), 1);
      if (random(3) === 0) edges.push(edge);
    }
    const input = { nodes, edges, start: count ? nodes[random(count)] : null, target: count && trial % 3 ? nodes[random(count)] : null };
    const frames = lesson.build(input);
    assert.ok(frames.length < 700);
    verifyResult(input, frames.at(-1).state.result);
    verifyTrace(input, frames);
  }
});

test('inputs are never mutated and snapshots share no mutable nested objects', () => {
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  const rawInput = freeze(clone(lesson.defaults)), originalRaw = clone(rawInput);
  const input = freeze(lesson.parse(rawInput)), original = clone(input);
  const frames = lesson.build(input), expected = clone(frames);
  assert.deepEqual(rawInput, originalRaw);
  assert.deepEqual(input, original);
  assert.deepEqual(lesson.build(input), expected, 'identical input yields the identical trace');
  const objects = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(!objects.has(value), 'each snapshot and nested display object is independently owned');
    objects.add(value);
    Object.values(value).forEach(visit);
  }
  frames.forEach(visit);
  frames[0].state.nodes[0] = 'H';
  frames[0].scene.graph.nodes[0].detail = 'changed';
  frames[0].scene.rows[0].cells[0].value = 123;
  assert.deepEqual(frames.slice(1), expected.slice(1));
  assert.deepEqual(input, original);
  const last = frames.at(-1);
  last.state.result.distances.A = 99;
  assert.equal(last.state.distances.A, 0, 'result tables are detached from state tables too');
});

test('card identities survive settlement and the final path reversal', () => {
  const frames = trace(lesson.defaults);
  for (const frame of frames) {
    const rows = Object.fromEntries(frame.scene.rows.map(row => [row.id, row]));
    for (const node of frame.state.nodes) {
      assert.equal(rows.distances.cells.find(cell => cell.marker === node).id, `distance-${node}`);
      assert.equal(rows.predecessors.cells.find(cell => cell.marker === node).id, `predecessor-${node}`);
    }
    assert.deepEqual(rows.frontier.cells.map(cell => cell.id), frame.state.frontier.map(node => `node-${node}`));
    assert.deepEqual(rows.settled.cells.map(cell => cell.id), frame.state.settled.map(node => `node-${node}`));
    const identities = [...rows.frontier.cells, ...rows.settled.cells].map(cell => cell.id);
    assert.equal(new Set(identities).size, identities.length);
  }
  const reverse = frames.find(frame => frame.kind === 'path-reverse');
  const preceding = frames[frames.indexOf(reverse) - 1];
  const ids = frame => frame.scene.rows.find(row => row.id === 'path').cells.map(cell => cell.id);
  assert.deepEqual(ids(reverse), ids(preceding).reverse());
  const highlighted = frames.at(-1).scene.graph.edges.filter(edge => edge.tone === 'found').map(edge => `${edge.from}-${edge.to}`);
  assert.deepEqual(highlighted, ['A-C', 'B-D', 'C-B', 'D-E']);
});
