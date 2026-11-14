const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const G = require('../lessons/graph.js');

const raw = (vertices, operations, direction = 'undirected') => ({ vertices, operations, direction });
const trace = (...args) => G.build(G.parse(raw(...args)));
const row = (frame, id) => frame.scene.rows.find(item => item.id === id);
const bilingual = value => {
  assert.equal(typeof value.en, 'string');
  assert.equal(typeof value.ar, 'string');
  assert.ok(value.en.trim() && value.ar.trim());
};
const lineMap = {
  ready: [], done: [], 'duplicate-vertex': [2], 'add-list': [2, 3], 'add-matrix': [4],
  'edge-check': [7], 'duplicate-edge': [7], 'add-edge': [8], 'edge-missing': [12], 'remove-check': [12],
  'remove-scan': [13], 'remove-edge': [13], 'neighbors-list': [17], 'neighbors-matrix': [18],
  'has-scan': [21],
};

// Independent model: an edge set and insertion-ordered lists, no matrix.
function reference({ directed, vertices, operations }) {
  const order = [...vertices], adj = Object.fromEntries(vertices.map(node => [node, []])), answers = [];
  const text = op => [op.op, op.u, op.v].filter(Boolean).join(' ');
  for (const op of operations) {
    const { u, v } = op;
    if (op.op === 'add') { if (!adj[u]) { order.push(u); adj[u] = []; } continue; }
    if (!adj[u] || (v && !adj[v])) { answers.push({ op: text(op), text: 'error' }); continue; }
    if (op.op === 'edge') {
      if (adj[u].includes(v)) answers.push({ op: text(op), text: 'already there' });
      else { adj[u].push(v); if (!directed) adj[v].push(u); answers.push({ op: text(op), text: 'added' }); }
    } else if (op.op === 'remove-edge') {
      if (!adj[u].includes(v)) answers.push({ op: text(op), text: 'not found' });
      else {
        adj[u] = adj[u].filter(w => w !== v); if (!directed) adj[v] = adj[v].filter(w => w !== u);
        answers.push({ op: text(op), text: 'removed' });
      }
    } else if (op.op === 'neighbors') answers.push({ op: text(op), text: `[${adj[u].join(', ')}]` });
    else answers.push({ op: text(op), text: String(adj[u].includes(v)) });
  }
  const matrix = order.map(a => order.map(b => adj[a].includes(b) ? 1 : 0));
  return { order, adj, matrix, answers };
}

function assertFrames(input, frames) {
  assert.equal(frames[0].kind, 'ready');
  assert.equal(frames[0].state.done, false);
  assert.equal(frames[0].state.result, null);
  assert.equal(frames.at(-1).state.done, true);
  assert.ok(frames.length < 400);
  const expected = reference(input), result = frames.at(-1).state.result;
  assert.deepEqual(result.vertices, expected.order);
  assert.deepEqual(result.adjacency, expected.adj);
  assert.deepEqual(result.matrix, expected.matrix);
  assert.deepEqual(result.answers, expected.answers);
  assert.equal(result.directed, input.directed);

  for (const [i, frame] of frames.entries()) {
    bilingual(frame.title); bilingual(frame.explanation);
    if (lineMap[frame.kind]) assert.deepEqual(frame.lines, lineMap[frame.kind], `${frame.kind} lines at ${i}`);
    assert.ok(frame.lines.every(line => line >= 1 && line <= G.code.length));
    const { state, scene } = frame;
    // Representation invariant: the matrix bit and the list membership always agree.
    const inMatrix = state.order.filter(node => state.matrix[node]);
    let entries = 0;
    for (const a of state.order) {
      entries += state.adj[a].length;
      assert.equal(new Set(state.adj[a]).size, state.adj[a].length, 'no duplicate entries');
      if (!state.matrix[a]) continue;
      for (const b of inMatrix) {
        assert.equal(state.matrix[a][b], state.adj[a].includes(b) ? 1 : 0, `M[${a}][${b}] at ${i}`);
        // Line 8 / 13 write one direction; line 9 / 14 writes the mirror on the very next frame.
        const halfway = frame.kind === 'add-edge' || frame.kind === 'remove-edge';
        if (!input.directed && !halfway) assert.equal(state.matrix[a][b], state.matrix[b][a], 'undirected M is symmetric');
      }
    }
    if (input.directed) assert.equal(entries, state.edges.length);
    else if (frame.kind === 'add-edge') assert.equal(entries, 2 * state.edges.length - 1);
    else if (frame.kind === 'remove-edge') assert.equal(entries, 2 * state.edges.length + 1);
    else assert.equal(entries, 2 * state.edges.length);
    assert.ok(state.order.length <= 8 && state.edges.length <= 20);

    const nodes = scene.graph.nodes, ids = new Set(nodes.map(node => node.id));
    assert.deepEqual(nodes.map(node => node.id), state.order, 'nodes keep insertion order');
    for (const edge of scene.graph.edges) {
      assert.ok(ids.has(edge.from) && ids.has(edge.to));
      assert.equal(edge.directed, input.directed);
      assert.ok(state.adj[edge.from].includes(edge.to));
    }
    for (const node of nodes) {
      assert.ok(node.x >= 22 && node.x <= 418 && node.y >= 22 && node.y <= 314);
      for (const other of nodes) if (other !== node) assert.ok(Math.hypot(node.x - other.x, node.y - other.y) >= 50);
    }
    for (const sceneRow of scene.rows) {
      assert.equal(new Set(sceneRow.cells.map(cell => cell.id)).size, sceneRow.cells.length);
    }
    for (const node of state.order) {
      const list = row(frame, `adj-${node}`);
      assert.deepEqual(list.cells.map(cell => cell.value), state.adj[node].length ? state.adj[node] : ['∅']);
    }
    for (const a of inMatrix) {
      assert.deepEqual(row(frame, `matrix-${a}`).cells.map(cell => cell.value), inMatrix.map(b => state.matrix[a][b]));
    }
    assert.equal(frame.metrics.find(m => m.label.en.startsWith('Matrix space')).value, inMatrix.length ** 2);
  }
}

test('exports the lesson contract in CommonJS and a dependency-free browser context', () => {
  assert.equal(G.id, 'graph');
  assert.equal(G.number, '18');
  assert.equal(G.name, 'Graph');
  assert.equal(G.theme, 'data-structures');
  assert.equal(G.category, 'structure');
  assert.equal(G.label, G.label.toUpperCase());
  assert.equal(globalThis.AlgorithmLessons.graph, G);
  assert.ok(G.code.every(line => line.length < 60), 'short pseudocode lines');
  const browser = { AlgorithmLessons: { existing: { id: 'existing' } } };
  vm.runInNewContext(readFileSync(require.resolve('../lessons/graph.js'), 'utf8'), browser);
  assert.equal(browser.AlgorithmLessons.existing.id, 'existing');
  const lesson = browser.AlgorithmLessons.graph;
  const answers = lesson.build(lesson.parse(raw('A B', 'edge A B, has-edge B A'))).at(-1).state.result.answers;
  assert.equal(answers.at(-1).text, 'true');
  for (const value of [G.description, G.note, G.theory.title, G.theory.idea, G.theory.intro, G.theory.invariant])
    bilingual(value);
  G.fields.forEach(field => { bilingual(field.label); bilingual(field.help); });
});

test('every preset matches an independent edge-set model and keeps both representations in sync', () => {
  for (const preset of [{ input: G.defaults }, ...G.presets]) {
    const input = G.parse(preset.input);
    assertFrames(input, G.build(input));
  }
  const def = trace(G.defaults.vertices, G.defaults.operations).at(-1).state.result;
  assert.deepEqual(def.answers.map(item => item.text),
    ['added', 'added', 'added', 'added', 'added', '[B, C, E]', 'false', 'true', 'removed', 'false']);
});

test('randomized operation scripts agree with the reference', () => {
  let seed = 7;
  const random = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const letters = 'ABCDEFGH';
  for (let round = 0; round < 150; round++) {
    const vertices = [...letters].filter(() => random(2)).slice(0, 1 + random(8));
    const ops = [];
    for (let k = random(13); k > 0; k--) {
      const kind = ['add', 'edge', 'edge', 'remove-edge', 'neighbors', 'has-edge'][random(6)];
      const u = letters[random(8)];
      let v = letters[random(8)];
      if (v === u) v = letters[(letters.indexOf(u) + 1) % 8];
      ops.push(kind === 'add' || kind === 'neighbors' ? `${kind} ${u}` : `${kind} ${u} ${v}`);
    }
    const input = G.parse(raw(vertices.join(' '), ops.join('\n'), random(2) ? 'directed' : 'undirected'));
    assertFrames(input, G.build(input));
  }
});

test('costs: list walks O(deg), matrix probes one cell and scans V cells for neighbors', () => {
  const frames = trace('A B C D E', 'edge A B, edge A C, edge A D, has-edge A D, has-edge A E, neighbors A');
  const metric = (frame, start) => frame.metrics.find(m => m.label.en.startsWith(start)).value;
  const before = frames.find(f => f.kind === 'has-scan');
  const hit = frames.find(f => f.kind === 'has-list-result' && f.lines[0] === 21);
  assert.equal(metric(hit, 'List entries') - metric(before, 'List entries'), 2, 'D is the 3rd entry: 3 reads total');
  assert.equal(frames.filter(f => f.kind === 'has-scan' || (f.kind === 'has-list-result' && f.lines[0] === 21)).length, 3 + 3);
  const miss = frames.find(f => f.kind === 'has-list-result' && f.lines[0] === 22);
  assert.ok(miss.explanation.en.includes('every entry (3)'));
  const [m1, m2] = frames.filter(f => f.kind === 'has-matrix');
  assert.equal(metric(m2, 'Matrix cells read') - metric(m1, 'Matrix cells read'), 1);
  const list = frames.find(f => f.kind === 'neighbors-list'), matrix = frames.find(f => f.kind === 'neighbors-matrix');
  assert.equal(metric(matrix, 'Matrix cells read') - metric(list, 'Matrix cells read'), 5, 'scan all V = 5 cells');
  assert.ok(row(matrix, 'matrix-A').cells.every(cell => ['found', 'active'].includes(cell.tone)));
  // Adding a node to a V-node matrix writes 2V + 1 cells.
  const grow = trace('A B C', 'add D');
  assert.equal(metric(grow.at(-1), 'Matrix cells written'), 7);
  assert.equal(metric(grow.at(-1), 'Matrix space'), 16);
});

test('directed edges are stored once and drawn with arrows', () => {
  const frames = trace('A B C', 'edge A B, edge B A, has-edge C A, edge C A, neighbors C', 'directed');
  const result = frames.at(-1).state.result;
  assert.deepEqual(result.adjacency, { A: ['B'], B: ['A'], C: ['A'] });
  assert.deepEqual(result.matrix, [[0, 1, 0], [1, 0, 0], [1, 0, 0]]);
  assert.ok(frames.at(-1).scene.graph.edges.every(edge => edge.directed));
  const mirror = frames.find(f => f.kind === 'mirror');
  assert.equal(mirror.equation, 'undirected → false');
  // Undirected: B A after A B is a duplicate.
  const undirected = trace('A B', 'edge A B, edge B A').at(-1).state.result;
  assert.deepEqual(undirected.answers.map(item => item.text), ['added', 'already there']);
});

test('edge cases: empty graph, missing nodes, duplicate node, not-found removal, growth from empty', () => {
  const empty = trace('', '');
  assert.equal(empty.length, 2);
  assert.deepEqual(empty.at(-1).state.result.vertices, []);
  assert.deepEqual(empty[0].scene.graph.nodes, []);
  const frames = trace('A', 'edge A B, remove-edge B A, add A, neighbors H');
  assert.deepEqual(frames.filter(f => f.kind === 'missing-vertex').map(f => f.lines[0]), [6, 11, 16]);
  assert.equal(frames.filter(f => f.kind === 'duplicate-vertex').length, 1);
  const notFound = trace('A B', 'remove-edge A B');
  assert.ok(notFound.some(f => f.kind === 'edge-missing'));
  assert.equal(notFound.at(-1).state.result.answers[0].text, 'not found');
  const grow = trace('', 'add C, add A, edge C A');
  assert.deepEqual(grow.at(-1).state.result.vertices, ['C', 'A'], 'matrix index follows insertion order');
  const addList = grow.find(f => f.kind === 'add-list');
  assert.equal(row(addList, 'matrix-C'), undefined, 'matrix grows on the next line');
  assert.deepEqual(row(addList, 'adj-C').cells.map(cell => cell.value), ['∅']);
  const removal = trace('A B C D', 'edge A B, edge A C, edge A D, remove-edge A C');
  const scan = removal.find(f => f.kind === 'remove-scan');
  assert.deepEqual(row(scan, 'adj-A').cells.map(cell => cell.tone), ['muted', 'active', 'default']);
  assert.deepEqual(removal.at(-1).state.result.adjacency.A, ['B', 'D']);
});

test('parse validates strictly with bilingual errors', () => {
  const bad = [
    raw('A B', 'connect A B'), raw('A B', 'edge a b'), raw('A B', 'edge A'), raw('A B', 'edge A B C'),
    raw('A B', 'edge A A'), raw('A B', 'has-edge B B'), raw('A A', ''), raw('A I', ''), raw('AB', ''),
    raw('A', 'add A\n'.repeat(13)), raw('A', '', 'both'), raw('A'.repeat(65), ''), raw('A', 'x'.repeat(401)),
    { vertices: 'A', operations: '' }, null, [],
  ];
  for (const input of bad) {
    assert.throws(() => G.parse(input), error => { bilingual(error.userMessage); return true; }, JSON.stringify(input));
  }
  assert.deepEqual(G.parse(raw(' A, B ', ' EDGE A B ;\n\n has-edge B A ', ' Directed ')), {
    directed: true, vertices: ['A', 'B'], operations: [{ op: 'edge', u: 'A', v: 'B' }, { op: 'has-edge', u: 'B', v: 'A' }],
  });
  assert.deepEqual(G.parse(raw('', '', '')).operations, []);
  const badBuild = [
    { directed: 'no', vertices: [], operations: [] },
    { directed: false, vertices: ['A', 'A'], operations: [] },
    { directed: false, vertices: [], operations: [{ op: 'edge', u: 'A' }] },
    { directed: false, vertices: [], operations: [{ op: 'add', u: 'A', v: 'B' }] },
    { directed: false, vertices: [], operations: [{ op: 'edge', u: 'A', v: 'A' }] },
    { directed: false, vertices: [], operations: Array(13).fill({ op: 'add', u: 'A' }) },
  ];
  for (const input of badBuild) assert.throws(() => G.build(input));
});

test('no input mutation and independent snapshots', () => {
  const input = G.parse(G.defaults), before = structuredClone(input);
  const frames = G.build(input);
  assert.deepEqual(input, before);
  frames[1].state.adj.A.push('Z');
  frames[1].scene.rows[0].cells.length = 0;
  assert.notDeepEqual(frames[2].state.adj.A, frames[1].state.adj.A);
  assert.deepEqual(G.build(input), G.build(structuredClone(before)));
  bilingual(G.summary(input));
  assert.ok(G.keySteps.every(kind => typeof kind === 'string'));
});
