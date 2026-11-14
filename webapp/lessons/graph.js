(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_VERTICES_LENGTH = 64;
  const MAX_OPERATIONS_LENGTH = 400;
  const MAX_DIRECTION_LENGTH = 16;
  const MAX_OPERATIONS = 12;
  const ARITY = { add: 1, neighbors: 1, edge: 2, 'remove-edge': 2, 'has-edge': 2 };
  const isNode = value => typeof value === 'string' && /^[A-H]$/.test(value);
  const opText = op => [op.op, op.u, op.v].filter(Boolean).join(' ');

  const code = [
    'addVertex(v):',
    '  if v in adj: return                  # already there',
    '  adj[v] = []                          # list: O(1)',
    '  add a row and a column of 0s to M    # matrix: O(V)',
    'addEdge(u, v):',
    '  if u or v not in adj: return error',
    '  if M[u][v] == 1: return              # O(1) check',
    '  M[u][v] = 1; adj[u].append(v)',
    '  if undirected: M[v][u] = 1; adj[v].append(u)',
    'removeEdge(u, v):',
    '  if u or v not in adj: return error',
    '  if M[u][v] == 0: return not found',
    '  M[u][v] = 0; adj[u].remove(v)        # O(deg u)',
    '  if undirected: M[v][u] = 0; adj[v].remove(u)',
    'neighbors(u):',
    '  if u not in adj: return error',
    '  list: return adj[u]                  # O(deg u)',
    '  matrix: return [w for w if M[u][w] == 1]   # O(V)',
    'hasEdge(u, v):',
    '  if u or v not in adj: return error',
    '  list: for w in adj[u]: if w == v: return true',
    '  list: return false                   # O(deg u)',
    '  matrix: return M[u][v] == 1          # O(1)',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  // Public build input: {directed: boolean, vertices: string[], operations: {op,u,v?}[]}.
  // build validates and copies it, so it enforces the same limits as parse.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.directed !== 'boolean' ||
        !Array.isArray(input.vertices) || !Array.isArray(input.operations)) {
      fail('Expected {directed, vertices, operations}.', 'محتاجين object فيه directed وvertices وoperations.');
    }
    if (input.vertices.length > 8) fail('Start with at most 8 nodes.', 'ابدأ بـ 8 nodes بالكتير.');
    const vertices = Array.from(input.vertices);
    if (vertices.some(node => !isNode(node)) || new Set(vertices).size !== vertices.length) {
      fail('Starting nodes must be distinct single uppercase letters A–H.',
        'الـ nodes اللي بنبدأ بيها لازم تكون حروف capital من A لـ H، ومفيش حرف متكرّر.');
    }
    if (input.operations.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operations بالكتير.`);
    }
    const operations = Array.from(input.operations, op => {
      if (!op || typeof op !== 'object' || Array.isArray(op) || !Object.hasOwn(ARITY, op.op)) {
        fail('Each operation is add, edge, remove-edge, neighbors or has-edge.',
          'كل operation لازم تكون add أو edge أو remove-edge أو neighbors أو has-edge.');
      }
      const arity = ARITY[op.op];
      const allowed = arity === 2 ? ['op', 'u', 'v'] : ['op', 'u'];
      if (Object.keys(op).some(field => !allowed.includes(field)) || !isNode(op.u) ||
          (arity === 2 && !isNode(op.v))) {
        fail(`${op.op} needs ${arity === 2 ? 'two node labels' : 'one node label'} from A to H.`,
          `${op.op} محتاجة ${arity === 2 ? 'اسمين nodes' : 'اسم node واحد'} من A لـ H.`);
      }
      if (arity === 2 && op.u === op.v) {
        fail(`${op.op} ${op.u} ${op.v}: the two ends must differ. This lesson draws simple graphs without self-loops.`,
          `${op.op} ${op.u} ${op.v}: الطرفين لازم يكونوا مختلفين. الدرس ده بيرسم graphs من غير self-loops.`);
      }
      return arity === 2 ? { op: op.op, u: op.u, v: op.v } : { op: op.op, u: op.u };
    });
    return { directed: input.directed, vertices, operations };
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) ||
        typeof rawInput.vertices !== 'string' || typeof rawInput.operations !== 'string' ||
        typeof rawInput.direction !== 'string') {
      fail('Provide nodes, operations and direction as text.', 'اكتب الـ nodes والـ operations والـ direction كـ text.');
    }
    if (rawInput.vertices.length > MAX_VERTICES_LENGTH || rawInput.operations.length > MAX_OPERATIONS_LENGTH ||
        rawInput.direction.length > MAX_DIRECTION_LENGTH) {
      fail('Keep nodes within 64 characters, operations within 400 and direction within 16.',
        'الـ nodes لحد 64 character، والـ operations لحد 400، والـ direction لحد 16.');
    }
    const direction = rawInput.direction.trim().toLowerCase();
    if (!['', 'undirected', 'directed'].includes(direction)) {
      fail('Direction is undirected or directed.', 'الـ direction يا undirected يا directed.');
    }
    const vertices = rawInput.vertices.trim() ? rawInput.vertices.trim().split(/[\s,،]+/) : [];
    for (const label of vertices) {
      if (!isNode(label)) {
        fail(`"${label.slice(0, 8)}" is not a node. Use single uppercase letters A–H separated by spaces or commas.`,
          `"${label.slice(0, 8)}" مش node. اكتب حروف capital من A لـ H، وافصل بينهم بمسافة أو comma.`);
      }
    }
    if (new Set(vertices).size !== vertices.length) {
      fail('Each starting node appears once.', 'كل node تتكتب مرة واحدة بس في الأول.');
    }
    const lines = rawInput.operations.split(/[\r\n,،;]+/).map(line => line.trim()).filter(Boolean);
    if (lines.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations; found ${lines.length}.`,
        `مسموح لحد ${MAX_OPERATIONS} operations، وانت كاتب ${lines.length}.`);
    }
    const operations = lines.map((line, index) => {
      const tokens = line.split(/\s+/);
      const op = tokens[0].toLowerCase();
      const shown = line.slice(0, 24);
      if (!Object.hasOwn(ARITY, op) || tokens.length !== ARITY[op] + 1 || !tokens.slice(1).every(isNode)) {
        fail(`Operation ${index + 1} ("${shown}"): use add A, edge A B, remove-edge A B, neighbors A or has-edge A B, with capital letters A–H.`,
          `الـ operation رقم ${index + 1} ("${shown}"): اكتب add A أو edge A B أو remove-edge A B أو neighbors A أو has-edge A B، بحروف capital من A لـ H.`);
      }
      if (tokens.length === 3 && tokens[1] === tokens[2]) {
        fail(`Operation ${index + 1} ("${shown}"): the two ends must differ; self-loops are not drawn in this lesson.`,
          `الـ operation رقم ${index + 1} ("${shown}"): الطرفين لازم يكونوا مختلفين، الدرس ده مفيهوش self-loops.`);
      }
      return tokens.length === 3 ? { op, u: tokens[1], v: tokens[2] } : { op, u: tokens[1] };
    });
    return validate({ directed: direction === 'directed', vertices, operations });
  }

  // Nodes sit on a circle in insertion order, so a node keeps its place while edges change.
  function positions(order) {
    const n = order.length, radius = n > 5 ? 124 : n > 2 ? 108 : 70;
    return Object.fromEntries(order.map((node, i) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / Math.max(1, n);
      return [node, n === 1 ? { x: 220, y: 168 } :
        { x: Math.round(220 + radius * Math.cos(angle)), y: Math.round(168 + radius * Math.sin(angle)) }];
    }));
  }

  function build(input) {
    const graph = validate(input);
    const directed = graph.directed;
    const state = {
      directed, order: [], adj: {}, matrix: {}, edges: [], answers: [],
      op: null, opIndex: -1, u: null, v: null,
      listReads: 0, matrixReads: 0, cellsWritten: 0,
      done: false, result: null,
    };
    for (const node of graph.vertices) {
      state.order.push(node); state.adj[node] = [];
    }
    for (const a of state.order) {
      state.matrix[a] = {};
      for (const b of state.order) state.matrix[a][b] = 0;
    }
    const frames = [];
    const V = () => state.order.length;
    const E = () => state.edges.length;
    const matrixSize = () => state.order.filter(node => state.matrix[node]).length;
    const entries = () => state.order.reduce((total, node) => total + state.adj[node].length, 0);
    const findEdge = (u, v) => state.edges.findIndex(edge =>
      (edge.from === u && edge.to === v) || (!directed && edge.from === v && edge.to === u));

    function scene(hl) {
      const place = positions(state.order);
      const edgeTone = edge => {
        const hit = hl.edge && ((edge.from === hl.edge.u && edge.to === hl.edge.v) ||
          (!directed && edge.from === hl.edge.v && edge.to === hl.edge.u));
        if (hit) return hl.edge.tone;
        if (hl.fromNode && (edge.from === hl.fromNode || (!directed && edge.to === hl.fromNode))) return 'found';
        return 'default';
      };
      const rows = [];
      for (const node of state.order) {
        const list = state.adj[node];
        rows.push({ id: `adj-${node}`, label: message(`adj[${node}]`, `adj[${node}]`), layout: 'cards',
          cells: list.length ? list.map((w, index) => {
            const mark = hl.adj[`${node}:${w}`];
            const rowTone = hl.adjRow === node ? 'found' : 'default';
            return { id: `adj-${node}-${w}`, value: w, index, tone: mark ? mark.tone : rowTone, marker: mark ? mark.marker : '' };
          }) : [{ id: `adj-${node}-none`, value: '∅', tone: hl.adjRow === node || hl.emptyRow === node ? 'active' : 'muted', marker: '' }] });
      }
      // Between adding a node's list and growing M, the new node has no matrix row or column yet.
      const inMatrix = state.order.filter(node => state.matrix[node]);
      if (inMatrix.length) {
        rows.push({ id: 'matrix-head', label: message('M columns', 'أعمدة M'), layout: 'cards',
          cells: inMatrix.map((w, index) => ({ id: `matrix-head-${w}`, value: w, index,
            tone: hl.column === w ? 'pivot' : 'muted', marker: '' })) });
      }
      for (const a of inMatrix) {
        rows.push({ id: `matrix-${a}`, label: message(`M[${a}]`, `M[${a}]`), layout: 'cards',
          cells: inMatrix.map((b, index) => {
            const value = state.matrix[a][b];
            const mark = hl.matrix[`${a}:${b}`];
            const rowTone = hl.matrixRow === a ? (value ? 'found' : 'active') : value ? 'sorted' : 'default';
            return { id: `matrix-${a}-${b}`, value, index, tone: mark ? mark.tone : rowTone, marker: mark ? mark.marker : '' };
          }) });
      }
      const remaining = graph.operations.slice(Math.max(0, state.opIndex)).map((op, i) =>
        (i === 0 && state.opIndex >= 0 && !state.done ? '▶ ' : '') + opText(op));
      return {
        rows,
        graph: {
          nodes: state.order.map(node => ({ id: node, label: node, ...place[node],
            tone: hl.nodes[node] || 'default',
            detail: message(`${directed ? 'out-degree' : 'degree'} ${state.adj[node].length}`,
              `${directed ? 'out-degree' : 'degree'} ${state.adj[node].length}`) })),
          edges: state.edges.map(edge => ({ from: edge.from, to: edge.to, directed, tone: edgeTone(edge) })),
        },
        collections: [
          { label: message('Operations left', 'الـ operations اللي فاضلة'), values: state.done ? [] : remaining },
          { label: message('Answers', 'الإجابات'), values: state.answers.map(item => `${item.op} → ${item.text}`) },
        ],
        note: message(
          `List: ${V()} heads + ${entries()} entries${directed ? '' : ' (each undirected edge twice)'}. Matrix: ${matrixSize()}×${matrixSize()} = ${matrixSize() ** 2} cells, whatever the number of edges.`,
          `الـ list: ${V()} heads و${entries()} entries${directed ? '' : ' (كل undirected edge متخزّن مرتين)'}. الـ matrix: ${matrixSize()}×${matrixSize()} = ${matrixSize() ** 2} خانة، مهما كان عدد الـ edges.`),
      };
    }

    function emit(kind, lines, title, explanation, equation = '', highlight = {}) {
      const hl = { nodes: {}, adj: {}, matrix: {}, ...highlight };
      const u = state.u;
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'op', value: state.op ? opText(state.op) : '—' },
          { name: 'u', value: u ?? '—' },
          { name: 'v', value: state.v ?? '—' },
          { name: 'deg(u)', value: u && state.adj[u] ? state.adj[u].length : '—' },
          { name: 'V', value: V() },
          { name: 'E', value: E() },
        ],
        metrics: [
          { label: message('List entries read', 'entries قريناها من الـ list'), value: state.listReads },
          { label: message('Matrix cells read', 'خانات قريناها من الـ matrix'), value: state.matrixReads },
          { label: message('Matrix cells written', 'خانات كتبناها في الـ matrix'), value: state.cellsWritten },
          { label: message('List space · heads + entries', 'مساحة الـ list · heads + entries'), value: V() + entries() },
          { label: message('Matrix space · V²', 'مساحة الـ matrix · V²'), value: matrixSize() ** 2 },
        ],
        scene: scene(hl),
      }));
    }

    function answer(text) {
      state.answers.push({ op: opText(state.op), text });
    }

    function missing(line, labels) {
      const gone = labels.filter(label => !state.adj[label]);
      const nodes = Object.fromEntries(labels.filter(label => state.adj[label]).map(label => [label, 'active']));
      answer('error');
      emit('missing-vertex', [line], message(`${gone.join(' and ')} ${gone.length > 1 ? 'are' : 'is'} not in the graph`,
        `${gone.join(' و')} ${gone.length > 1 ? 'مش موجودين' : 'مش موجودة'} في الـ graph`),
        message(`There is no adj[${gone[0]}] and no row ${gone[0]} in M, so ${state.op.op} stops with an error. Add the node first with add ${gone[0]}.`,
          `مفيش adj[${gone[0]}] ولا row ${gone[0]} في الـ M، فالـ ${state.op.op} بتعمل return بـ error. لازم نعمل add ${gone[0]} الأول.`),
        `${gone.join(', ')} not in adj → error`, { nodes });
    }

    emit('ready', [], message('One graph, two ways to store it', 'graph واحد، وطريقتين نخزّنه بيهم'),
      message(`${directed ? 'Directed' : 'Undirected'} graph with ${V()} nodes. Each of the ${graph.operations.length} operations updates an adjacency list and an adjacency matrix side by side, so you can compare what each one costs.`,
        `الـ graph ده ${directed ? 'directed' : 'undirected'}، وعدد الـ nodes فيه ${V()}، وعدد الـ operations ${graph.operations.length}. كل operation هتعدّل الـ adjacency list والـ adjacency matrix مع بعض، عشان نقارن كل واحدة بتكلّف قد إيه.`));

    graph.operations.forEach((op, opIndex) => {
      state.op = op; state.opIndex = opIndex; state.u = op.u; state.v = op.v ?? null;
      const { u, v } = op;

      if (op.op === 'add') {
        if (state.adj[u]) {
          emit('duplicate-vertex', [2], message(`${u} is already a node`, `${u} موجودة أصلًا`),
            message(`adj[${u}] already exists, so nothing changes. A second copy would split ${u}'s edges between two lists.`,
              `adj[${u}] موجودة خلاص، فمفيش حاجة هتتغيّر. لو عملنا نسخة تانية، الـ edges بتاعة ${u} هتتقسم على اتنين lists.`),
            `${u} in adj → true`, { nodes: { [u]: 'active' } });
          return;
        }
        state.order.push(u); state.adj[u] = [];
        emit('add-list', [2, 3], message(`${u} gets an empty list`, `${u} بقت ليها list فاضية`),
          message(`In the adjacency list a new node is just one empty list: O(1). ${u} has no neighbors yet.`,
            `في الـ adjacency list، node جديدة يعني list فاضية وخلاص: O(1). لسه ${u} مالهاش neighbors.`),
          `adj[${u}] = []`, { nodes: { [u]: 'active' }, emptyRow: u });
        const old = V() - 1;
        state.matrix[u] = {};
        for (const a of state.order) { state.matrix[a][u] = 0; state.matrix[u][a] = 0; }
        state.cellsWritten += 2 * old + 1;
        emit('add-matrix', [4], message(`The matrix grows to ${V()}×${V()}`, `الـ matrix كبرت لـ ${V()}×${V()}`),
          message(`The matrix needs a new row and a new column, all 0: ${2 * old + 1} new cells, O(V). If M lives in a fixed-size array, it must be copied into a bigger one: O(V²).`,
            `الـ matrix محتاجة row جديد وcolumn جديد، كلهم 0. عدد الخانات الجديدة ${2 * old + 1}، يعني O(V). ولو الـ M متخزّنة في array حجمها ثابت، هنضطر ننسخها كلها في واحدة أكبر: O(V²).`),
          `cells = ${old}² → ${V()}² (+${2 * old + 1})`, { nodes: { [u]: 'active' }, matrixRow: u, column: u,
            matrix: Object.fromEntries(state.order.map(a => [`${a}:${u}`, { tone: 'active', marker: '' }])) });
        return;
      }

      if (op.op === 'edge') {
        if (!state.adj[u] || !state.adj[v]) { missing(6, [u, v]); return; }
        state.matrixReads++;
        const exists = state.matrix[u][v] === 1;
        emit(exists ? 'duplicate-edge' : 'edge-check', [7],
          exists ? message(`${u}–${v} is already there`, `الـ edge ${u}–${v} موجود أصلًا`) : message(`Check M[${u}][${v}] first`, `بنبص على M[${u}][${v}] الأول`),
          exists ? message(`M[${u}][${v}] is 1, so we return without adding. Without this O(1) check, adj[${u}] would hold ${v} twice.`,
            `M[${u}][${v}] بـ 1، يبقى هنعمل return من غير ما نضيف حاجة. لولا الـ check ده اللي بياخد O(1)، كان ${v} هيتكتب مرتين في adj[${u}].`)
            : message(`M[${u}][${v}] is 0: no edge yet. One cell read, O(1). Checking adj[${u}] instead would cost O(deg ${u}).`,
              `M[${u}][${v}] بـ 0، يعني لسه مفيش edge. قرينا خانة واحدة، O(1). لو كنا دوّرنا في adj[${u}] كانت هتاخد O(deg ${u}).`),
          `M[${u}][${v}] == 1 → ${exists}`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, edge: exists ? { u, v, tone: 'active' } : null,
            matrix: { [`${u}:${v}`]: { tone: exists ? 'found' : 'active', marker: '?' } } });
        if (exists) { answer('already there'); return; }
        state.matrix[u][v] = 1; state.adj[u].push(v); state.cellsWritten++;
        state.edges.push({ from: u, to: v });
        emit('add-edge', [8], message(`Add ${u}${directed ? ' → ' : '–'}${v}`, `بنضيف الـ edge ${u}${directed ? ' → ' : '–'}${v}`),
          message(`Set one cell to 1 and append ${v} to the end of adj[${u}]. Both are O(1).`,
            `بنكتب 1 في خانة واحدة، ونحط ${v} في آخر adj[${u}]. الاتنين O(1).`),
          `M[${u}][${v}] = 1; adj[${u}].append(${v})`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, edge: { u, v, tone: 'active' },
            adj: { [`${u}:${v}`]: { tone: 'found', marker: 'new' } },
            matrix: { [`${u}:${v}`]: { tone: 'found', marker: 'set' } } });
        if (!directed) {
          state.matrix[v][u] = 1; state.adj[v].push(u); state.cellsWritten++;
        }
        emit('mirror', [9], directed ? message('Directed: only one side', 'directed: ناحية واحدة بس') : message(`Mirror it: ${v} also sees ${u}`, `بنكتبه في الناحية التانية: ${v} كمان بتشوف ${u}`),
          directed ? message(`The edge goes from ${u} to ${v} only. M[${v}][${u}] stays 0 and adj[${v}] stays as it was, so M is not symmetric.`,
            `الـ edge رايح من ${u} لـ ${v} بس. M[${v}][${u}] بتفضل 0 وadj[${v}] مش بتتغيّر، فالـ M مش symmetric.`)
            : message(`Undirected means the edge works both ways, so we also set M[${v}][${u}] and append ${u} to adj[${v}]. M stays symmetric, and the edge is now stored in two lists.`,
              `undirected يعني الـ edge شغّال في الاتجاهين. فبنكتب كمان M[${v}][${u}] = 1 ونحط ${u} في adj[${v}]. كده الـ M بتفضل symmetric، والـ edge متخزّن في الـ list مرتين.`),
          directed ? 'undirected → false' : `M[${v}][${u}] = 1; adj[${v}].append(${u})`,
          { nodes: { [u]: 'pivot', [v]: 'active' }, edge: { u, v, tone: 'found' },
            adj: directed ? {} : { [`${v}:${u}`]: { tone: 'found', marker: 'new' } },
            matrix: directed ? { [`${v}:${u}`]: { tone: 'active', marker: '0' } } : { [`${v}:${u}`]: { tone: 'found', marker: 'set' } } });
        answer('added');
        return;
      }

      if (op.op === 'remove-edge') {
        if (!state.adj[u] || !state.adj[v]) { missing(11, [u, v]); return; }
        state.matrixReads++;
        const exists = state.matrix[u][v] === 1;
        emit(exists ? 'remove-check' : 'edge-missing', [12],
          exists ? message(`M[${u}][${v}] is 1: the edge exists`, `M[${u}][${v}] بـ 1، يعني الـ edge موجود`) : message(`No ${u}${directed ? ' → ' : '–'}${v} edge to remove`, `مفيش edge ${u}${directed ? ' → ' : '–'}${v} نشيله`),
          exists ? message('One cell read confirms it in O(1). Now remove it from both representations.',
            'خانة واحدة أكّدت ده في O(1). دلوقتي هنشيله من الاتنين.')
            : message(`M[${u}][${v}] is 0, so we return "not found" and nothing changes.`,
              `M[${u}][${v}] بـ 0، يبقى هنعمل return بـ "not found" ومفيش حاجة هتتغيّر.`),
          `M[${u}][${v}] == 0 → ${!exists}`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, edge: exists ? { u, v, tone: 'active' } : null,
            matrix: { [`${u}:${v}`]: { tone: 'active', marker: '?' } } });
        if (!exists) { answer('not found'); return; }
        const at = state.adj[u].indexOf(v);
        state.listReads += at + 1;
        const scanned = Object.fromEntries(state.adj[u].slice(0, at).map(w => [`${u}:${w}`, { tone: 'muted', marker: '' }]));
        scanned[`${u}:${v}`] = { tone: 'active', marker: 'remove' };
        emit('remove-scan', [13], message(`Find ${v} inside adj[${u}]`, `بندوّر على ${v} جوّه adj[${u}]`),
          message(`The matrix clears one cell, O(1). The list has to walk adj[${u}] until it meets ${v}: ${at + 1} of ${state.adj[u].length} entries read. That walk is why removal is O(deg ${u}).`,
            `الـ matrix بتصفّر خانة واحدة، O(1). أما الـ list فلازم نمشي في adj[${u}] لحد ما نلاقي ${v}: عدد الـ entries اللي قريناها ${at + 1} من ${state.adj[u].length}. المشي ده هو اللي بيخلّي الـ remove تاخد O(deg ${u}).`),
          `adj[${u}].indexOf(${v}) = ${at}`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, edge: { u, v, tone: 'active' }, adj: scanned,
            matrix: { [`${u}:${v}`]: { tone: 'active', marker: 'clear' } } });
        state.matrix[u][v] = 0; state.adj[u].splice(at, 1); state.cellsWritten++;
        const edgeIndex = findEdge(u, v);
        state.edges.splice(edgeIndex, 1);
        emit('remove-edge', [13], message(`${u}${directed ? ' → ' : '–'}${v} is gone`, `الـ edge ${u}${directed ? ' → ' : '–'}${v} اتشال`),
          message(`M[${u}][${v}] is 0 again and ${v} left adj[${u}]. The entries after it shifted left by one.`,
            `M[${u}][${v}] رجعت 0، و${v} خرج من adj[${u}]. الـ entries اللي بعده اتزحزحت مكان شمال.`),
          `M[${u}][${v}] = 0; adj[${u}].remove(${v})`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, adjRow: u,
            matrix: { [`${u}:${v}`]: { tone: 'found', marker: 'cleared' } } });
        let back = 0;
        if (!directed) {
          back = state.adj[v].indexOf(u);
          state.listReads += back + 1;
          state.matrix[v][u] = 0; state.adj[v].splice(back, 1); state.cellsWritten++;
        }
        emit('mirror', [14], directed ? message('Directed: the other side was never stored', 'directed: الناحية التانية مكانتش متخزّنة أصلًا') : message(`Remove the mirror copy from adj[${v}]`, `بنشيل النسخة التانية من adj[${v}]`),
          directed ? message(`Only ${u} → ${v} existed. M[${v}][${u}] and adj[${v}] are untouched.`,
            `كان فيه ${u} → ${v} بس. M[${v}][${u}] وadj[${v}] مااتلمسوش.`)
            : message(`Clear M[${v}][${u}] too, and walk adj[${v}] to find ${u}: ${back + 1} entries read. Undirected removal pays the list walk twice.`,
              `بنصفّر M[${v}][${u}] كمان، ونمشي في adj[${v}] لحد ما نلاقي ${u}، وعدد الـ entries اللي قريناها ${back + 1}. الـ remove في الـ undirected بيدفع تمن المشي في الـ list مرتين.`),
          directed ? 'undirected → false' : `M[${v}][${u}] = 0; adj[${v}].remove(${u})`,
          { nodes: { [u]: 'pivot', [v]: 'active' }, adjRow: directed ? null : v,
            matrix: { [`${v}:${u}`]: { tone: directed ? 'active' : 'found', marker: directed ? '0' : 'cleared' } } });
        answer('removed');
        return;
      }

      if (op.op === 'neighbors') {
        if (!state.adj[u]) { missing(16, [u]); return; }
        const list = [...state.adj[u]];
        state.listReads += list.length;
        const shown = list.length ? list.join(', ') : '∅';
        const nodes = { [u]: 'active', ...Object.fromEntries(list.map(w => [w, 'found'])) };
        emit('neighbors-list', [17], message(`adj[${u}] already is the answer`, `adj[${u}] هي الإجابة على طول`),
          message(list.length ? `Read the ${list.length} entries of adj[${u}]: ${shown}. Work grows with deg(${u}), not with V. They come in the order the edges were added.`
            : `adj[${u}] is empty: ${u} has no ${directed ? 'outgoing ' : ''}neighbors. Zero entries read.`,
          list.length ? `بنقرا adj[${u}] كلها، وعدد الـ entries فيها ${list.length}: ${shown}. الشغل بيكبر مع deg(${u})، مش مع V. وبييجوا بنفس ترتيب إضافة الـ edges.`
            : `adj[${u}] فاضية، يعني ${u} مالهاش neighbors${directed ? ' طالعة منها' : ''}. ومقريناش ولا entry.`),
          `neighbors(${u}) = [${list.join(', ')}] · ${list.length} reads`,
          { nodes, adjRow: u, emptyRow: u, fromNode: u });
        state.matrixReads += V();
        const fromMatrix = state.order.filter(w => state.matrix[u][w] === 1);
        emit('neighbors-matrix', [18], message(`The matrix scans the whole row M[${u}]`, `الـ matrix لازم تلف على الـ row M[${u}] كله`),
          message(`Read every cell of row ${u} (${V()} cells) to find the ones (${fromMatrix.length}). The zeros cost the same as the ones, so this is O(V) even when ${u} has ${fromMatrix.length === 0 ? 'no neighbors' : 'few neighbors'}.`,
            `بنقرا row ${u} كله، وعدد خاناته ${V()}، عشان نلاقي اللي فيهم 1 (عددهم ${fromMatrix.length}). الـ 0 بياخد نفس الوقت زي الـ 1، فده O(V) حتى لو ${u} ${fromMatrix.length === 0 ? 'مالهاش neighbors' : 'الـ neighbors بتوعها قليلين'}.`),
          `scan M[${u}][*] · ${V()} reads → [${[...fromMatrix].sort().join(', ')}]`,
          { nodes, matrixRow: u, fromNode: u });
        answer(`[${list.join(', ')}]`);
        return;
      }

      // has-edge
      if (!state.adj[u] || !state.adj[v]) { missing(20, [u, v]); return; }
      const list = state.adj[u];
      let found = false;
      for (let index = 0; index < list.length; index++) {
        const w = list[index];
        state.listReads++;
        found = w === v;
        const marks = Object.fromEntries(list.slice(0, index).map(x => [`${u}:${x}`, { tone: 'muted', marker: '' }]));
        marks[`${u}:${w}`] = { tone: found ? 'found' : 'active', marker: 'w' };
        emit(found ? 'has-list-result' : 'has-scan', [21],
          found ? message(`Found ${v} on read ${index + 1}`, `لقينا ${v}، وعدد القراءات ${index + 1}`) : message(`${w} is not ${v}, keep walking`, `${w} مش ${v}، بنكمّل`),
          found ? message(`Entry ${index + 1} of adj[${u}] is ${v}, so the list answers true. In the worst case this walk reads all deg(${u}) entries.`,
            `الـ entry رقم ${index + 1} في adj[${u}] هو ${v}، يبقى الـ list بترد true. في الـ worst case المشي ده بيقرا كل الـ deg(${u}) entries.`)
            : message(`The list has no index by name, so we compare entry by entry. Read ${index + 1} of ${list.length}.`,
              `الـ list مفيهاش طريقة نوصل بيها لـ ${v} على طول، فبنقارن entry ورا entry. دي القراءة رقم ${index + 1} من ${list.length}.`),
          `${w} == ${v} → ${found}`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, edge: found ? { u, v, tone: 'found' } : null, adj: marks });
        if (found) break;
      }
      if (!found) {
        emit('has-list-result', [22], message(`adj[${u}] has no ${v}`, `adj[${u}] مفيهاش ${v}`),
          message(list.length ? `We read every entry (${list.length}) without meeting ${v}, so the list answers false. A "no" always costs the full O(deg ${u}) walk.`
            : `adj[${u}] is empty, so the loop never runs and the list answers false right away.`,
          list.length ? `قرينا كل الـ entries (عددهم ${list.length}) ومالقيناش ${v}، يبقى الـ list بترد false. الـ "لأ" دايمًا بتكلّف المشي كله: O(deg ${u}).`
            : `adj[${u}] فاضية، فالـ loop مش هتلف خالص، والـ list بترد false على طول.`),
          `${v} not in adj[${u}] → false`,
          { nodes: { [u]: 'active', [v]: 'pivot' }, emptyRow: u,
            adj: Object.fromEntries(list.map(x => [`${u}:${x}`, { tone: 'muted', marker: '' }])) });
      }
      state.matrixReads++;
      const bit = state.matrix[u][v] === 1;
      emit('has-matrix', [23], message(`M[${u}][${v}] answers in one read`, `M[${u}][${v}] بترد من قراية واحدة`),
        message(`Jump straight to row ${u}, column ${v}: it holds ${bit ? 1 : 0}, so the answer is ${bit}. One read no matter how many edges ${u} has. That speed is what the V² cells buy.`,
          `بنروح على row ${u} وcolumn ${v} على طول: فيها ${bit ? 1 : 0}، يعني الإجابة ${bit}. قراية واحدة مهما كان عدد الـ edges بتوع ${u}. السرعة دي هي اللي بندفع تمنها V² خانة.`),
        `M[${u}][${v}] == 1 → ${bit}`,
        { nodes: { [u]: 'active', [v]: bit ? 'found' : 'pivot' }, edge: bit ? { u, v, tone: 'found' } : null, column: v,
          matrix: { [`${u}:${v}`]: { tone: bit ? 'found' : 'active', marker: '?' } } });
      answer(String(bit));
    });

    state.op = null; state.u = null; state.v = null; state.opIndex = graph.operations.length;
    state.done = true;
    state.result = {
      directed,
      vertices: [...state.order],
      edges: state.edges.map(edge => [edge.from, edge.to]),
      adjacency: Object.fromEntries(state.order.map(node => [node, [...state.adj[node]]])),
      matrix: state.order.map(a => state.order.map(b => state.matrix[a][b])),
      answers: state.answers.map(item => ({ ...item })),
    };
    const listSpace = V() + entries(), matrixSpace = V() * V();
    emit('done', [], message(V() ? `Final graph: V = ${V()}, E = ${E()}` : 'The graph is still empty', V() ? `الـ graph في الآخر: V = ${V()} وE = ${E()}` : 'الـ graph لسه فاضي'),
      message(V() ? `Same graph, two layouts. The list holds ${listSpace} items (V + ${directed ? 'E' : '2E'}), the matrix ${matrixSpace} cells (V²). Reads so far: ${state.listReads} list entries, ${state.matrixReads} matrix cells. ${listSpace < matrixSpace ? 'This graph is sparse enough that the list is smaller.' : 'This graph is dense enough that the matrix costs no more space.'}`
        : 'No nodes, no edges: both representations are empty.',
      V() ? `نفس الـ graph بطريقتين. حجم الـ list: ${listSpace} (V + ${directed ? 'E' : '2E'})، وحجم الـ matrix: ${matrixSpace} خانة (V²). لحد دلوقتي قرينا من الـ list عدد ${state.listReads} entries، ومن الـ matrix عدد ${state.matrixReads} خانة. ${listSpace < matrixSpace ? 'الـ graph ده sparse كفاية إن الـ list تبقى أصغر.' : 'الـ graph ده dense كفاية إن الـ matrix مش بتاخد مساحة أكتر.'}`
        : 'مفيش nodes ولا edges، فالاتنين فاضيين.'),
      `list = ${listSpace} · matrix = ${matrixSpace}`);
    return frames;
  }

  const defaults = {
    vertices: 'A B C D E',
    operations: 'edge A B\nedge A C\nedge B D\nedge C D\nedge D E\nneighbors D\nhas-edge A D\nhas-edge D C\nremove-edge C D\nhas-edge C D',
    direction: 'undirected',
  };

  const lesson = {
    id: 'graph', name: 'Graph', theme: 'data-structures', category: 'structure', number: '18',
    label: 'GRAPH', cost: 'O(deg) · O(1)',
    description: message('Store the same graph as an adjacency list and an adjacency matrix, and watch what each operation costs in both.',
      'بنخزّن نفس الـ graph كـ adjacency list وكـ adjacency matrix، ونشوف كل operation بتكلّف قد إيه في الاتنين.'),
    note: message('The list reads only the neighbors it has: neighbors and has-edge are O(deg). The matrix answers has-edge in O(1) but always spends V² cells and scans V cells for neighbors.',
      'الـ list بتقرا الـ neighbors اللي عندها بس: neighbors وhas-edge بياخدوا O(deg). الـ matrix بترد على has-edge في O(1)، بس دايمًا بتاخد V² خانة، وبتلف على V خانات عشان تجيب الـ neighbors.'),
    code,
    keySteps: ['ready', 'add-matrix', 'add-edge', 'mirror', 'duplicate-edge', 'remove-scan', 'edge-missing',
      'neighbors-list', 'neighbors-matrix', 'has-scan', 'has-list-result', 'has-matrix', 'missing-vertex', 'duplicate-vertex', 'done'],
    view: {
      legend: [
        { tone: 'active', role: 'current', label: message('u · the node we read from', 'u · الـ node اللي بنقرا منها') },
        { tone: 'pivot', role: 'peek', label: message('v · the other end', 'v · الطرف التاني') },
        { tone: 'found', role: 'done', label: message('Answer', 'الإجابة') },
      ],
    },
    fields: [
      { name: 'vertices', type: 'text', maxLength: MAX_VERTICES_LENGTH,
        label: message('Starting nodes', 'الـ nodes اللي بنبدأ بيها'),
        help: message('Distinct capital letters A–H separated by spaces or commas, such as A B C. Leave blank to start from an empty graph.',
          'حروف capital من A لـ H من غير تكرار، وافصل بينهم بمسافة أو comma، زي A B C. سيبها فاضية لو عايز تبدأ من graph فاضي.') },
      { name: 'operations', type: 'textarea', maxLength: MAX_OPERATIONS_LENGTH,
        label: message('Operations', 'الـ operations'),
        help: message('One per line (or separated by commas), up to 12: add A · edge A B · remove-edge A B · neighbors A · has-edge A B. Labels are capital letters A–H, and the two ends of an edge must differ. Using a node that does not exist is allowed: the trace shows the error.',
          'واحدة في كل سطر (أو افصل بـ comma)، لحد 12: add A · edge A B · remove-edge A B · neighbors A · has-edge A B. الأسماء حروف capital من A لـ H، وطرفين الـ edge لازم يكونوا مختلفين. عادي تستخدم node مش موجودة، والـ trace هيوريك الـ error.') },
      { name: 'direction', type: 'text', maxLength: MAX_DIRECTION_LENGTH,
        label: message('Direction', 'الـ direction'),
        help: message('undirected (default): edge A B works both ways. directed: edge A B goes from A to B only.',
          'undirected (الأساسي): edge A B شغّال في الاتجاهين. directed: edge A B رايح من A لـ B بس.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Small friend network', 'شبكة صحاب صغيرة'), input: { ...defaults } },
      { id: 'directed', label: message('One-way streets · directed', 'شوارع اتجاه واحد · directed'),
        input: { vertices: 'A B C D', operations: 'edge A B\nedge B C\nedge C A\nedge A C\nedge C D\nhas-edge B A\nhas-edge A B\nneighbors A\nneighbors D\nremove-edge A C', direction: 'directed' } },
      { id: 'dense', label: message('Dense · every pair connected', 'dense · كل اتنين متوصّلين'),
        input: { vertices: 'A B C D', operations: 'edge A B\nedge A C\nedge A D\nedge B C\nedge B D\nedge C D\nneighbors A\nhas-edge D B', direction: 'undirected' } },
      { id: 'sparse', label: message('Sparse · 8 nodes, 2 edges', 'sparse · 8 nodes و2 edges'),
        input: { vertices: 'A B C D E F G H', operations: 'edge A H\nedge C F\nneighbors B\nneighbors A\nhas-edge A H\nhas-edge B G', direction: 'undirected' } },
      { id: 'grow', label: message('Grow from empty', 'بنكبّر من graph فاضي'),
        input: { vertices: '', operations: 'add A\nadd B\nedge A B\nadd C\nedge B C\nadd D\nneighbors B', direction: 'undirected' } },
      { id: 'errors', label: message('Missing, duplicate, not found', 'مش موجود، متكرّر، مالقيناهوش'),
        input: { vertices: 'A B C', operations: 'edge A D\nremove-edge A B\nadd A\nedge A B\nedge B A\nneighbors C\nhas-edge C A\nhas-edge E A', direction: 'undirected' } },
      { id: 'empty', label: message('Empty graph · no operations', 'graph فاضي · من غير operations'),
        input: { vertices: '', operations: '', direction: 'undirected' } },
    ],
    parse, build,
    summary(input) {
      const graph = validate(input);
      return message(`${graph.vertices.length} starting nodes · ${graph.operations.length} operations · ${graph.directed ? 'directed' : 'undirected'}`,
        `عدد الـ nodes في الأول ${graph.vertices.length} · عدد الـ operations ${graph.operations.length} · ${graph.directed ? 'directed' : 'undirected'}`);
    },
    theory: {
      idea: message('A graph is a set of nodes plus the edges between them. To store it, either give every node a list of its neighbors, or keep a V×V grid of 0s and 1s.',
        'الـ graph عبارة عن nodes وedges بتوصّل بينهم. عشان نخزّنه، يا إمّا كل node يبقى ليها list بالـ neighbors بتوعها، يا إمّا نعمل جدول V×V كله 0 و1.'),
      title: message('Adjacency list or adjacency matrix?', 'adjacency list ولا adjacency matrix؟'),
      intro: message('A graph G = (V, E) has vertices (nodes) and edges between pairs of them. Roads between cities, friendships, links between pages and task dependencies are all graphs. In an undirected graph an edge works both ways, like a friendship; in a directed graph it has a direction, like following someone or a one-way street. You only need arrays and lists to follow this lesson.',
        'الـ graph G = (V, E) فيه vertices (يعني nodes) وedges بتوصّل بين كل اتنين. الطرق بين المدن، والصحاب على السوشيال ميديا، والـ links بين الصفحات، وترتيب المهام اللي بتعتمد على بعض، كل دول graphs. في الـ undirected graph الـ edge شغّال في الاتجاهين، زي الصداقة. وفي الـ directed graph ليه اتجاه، زي إنك تعمل follow لحد، أو شارع اتجاه واحد. كل اللي محتاجه عشان تتابع الدرس ده الـ arrays والـ lists.'),
      invariant: message('Both representations always describe the same edge set: M[u][v] is 1 exactly when v appears in adj[u]. For an undirected graph that also means M is symmetric and every edge sits in two lists, so the list entries add up to 2E (E when directed).',
        'الاتنين دايمًا بيوصفوا نفس الـ edges: M[u][v] بـ 1 لو وبس لو v موجود في adj[u]. ولو الـ graph undirected، يبقى الـ M كمان symmetric، وكل edge متخزّن في list تين، فمجموع الـ entries بيبقى 2E (وE لو directed).'),
      steps: [
        { title: message('Adjacency list: store only what exists', 'الـ adjacency list: بنخزّن الموجود بس'),
          body: message('Each node keeps a list of its neighbors. Space is O(V + E). Adding an edge appends to the end, O(1). Listing neighbors reads exactly deg(u) entries. But has-edge and remove-edge must walk the list: O(deg u).',
            'كل node معاها list بالـ neighbors بتوعها. المساحة O(V + E). إضافة edge بتحطّه في آخر الـ list، O(1). وجيب الـ neighbors بيقرا deg(u) entries بالظبط. بس has-edge وremove-edge لازم يمشوا في الـ list: O(deg u).') },
        { title: message('Adjacency matrix: one cell per pair', 'الـ adjacency matrix: خانة لكل اتنين'),
          body: message('A V×V grid where M[u][v] is 1 when the edge u→v exists. has-edge, adding and removing an edge each touch one cell: O(1). But the grid always takes V² cells, listing neighbors scans a whole row (O(V)), and adding a node grows every row.',
            'جدول V×V، فيه M[u][v] بـ 1 لو فيه edge من u لـ v. has-edge وإضافة edge وشيله كل واحد فيهم بيلمس خانة واحدة: O(1). بس الجدول دايمًا بياخد V² خانة، وجيب الـ neighbors بيلف على row كامل (O(V))، وإضافة node بتكبّر كل الـ rows.') },
        { title: message('Sparse or dense decides', 'الـ sparse والـ dense هما اللي بيحسموا'),
          body: message('Most real graphs are sparse: a road map or a social network has far fewer edges than V². Use a list there; it is what BFS, DFS and Dijkstra walk, since they visit each neighbor once. Pick a matrix for small or dense graphs, or when "is u connected to v?" is the hot question.',
            'أغلب الـ graphs الحقيقية sparse: خريطة طرق أو شبكة صحاب فيها edges أقل بكتير من V². هنا استخدم list، وهي اللي BFS وDFS وDijkstra بيمشوا عليها، عشان كل واحد فيهم بيزور كل neighbor مرة. اختار الـ matrix لو الـ graph صغير أو dense، أو لو السؤال اللي بيتكرّر كتير هو "u متوصّلة بـ v؟".') },
      ],
      notes: [
        message('Undirected edges appear twice in the list (u in adj[v] and v in adj[u]) and twice in the matrix (M is symmetric). Directed edges appear once, so M[u][v] and M[v][u] can differ, and neighbors(u) means the outgoing ones.',
          'الـ undirected edge بيظهر مرتين في الـ list (u في adj[v] وv في adj[u])، ومرتين في الـ matrix (الـ M symmetric). الـ directed edge بيظهر مرة واحدة، فـ M[u][v] وM[v][u] ممكن يختلفوا، وneighbors(u) يعني الـ edges الطالعة من u بس.'),
        message('This lesson keeps simple graphs: no self-loops and no duplicate edges. addEdge checks M first, which costs O(1); a list-only implementation would need an O(deg) scan, or would allow duplicates.',
          'الدرس ده بيستخدم simple graphs: مفيش self-loops ولا edges متكرّرة. الـ addEdge بيبص على M الأول، وده بياخد O(1). لو عندنا list بس، كنا هنحتاج نمشي فيها O(deg)، أو نسمح بالتكرار.'),
        message('Adding a node to the matrix writes 2V + 1 new cells here. A matrix stored in one fixed-size block must be copied into a bigger block instead, O(V²). The list just adds one empty list.',
          'إضافة node للـ matrix هنا بتكتب 2V + 1 خانة جديدة. ولو الـ matrix متخزّنة في block واحد حجمه ثابت، لازم ننسخها كلها في block أكبر، O(V²). أما الـ list فبتضيف list فاضية وخلاص.'),
        message('Weighted graphs store the weight instead of a 1 (matrix) or next to the neighbor (list). Hash sets instead of lists give O(1) average has-edge with O(V + E) space.',
          'لو الـ graph فيه weights، بنخزّن الـ weight مكان الـ 1 في الـ matrix، أو جنب الـ neighbor في الـ list. ولو استخدمنا hash sets بدل الـ lists، has-edge بتاخد O(1) في المتوسط والمساحة بتفضل O(V + E).'),
        message('Next: BFS and DFS walk these lists to explore a graph, and Shortest Paths (Dijkstra) adds weights. All three run in O(V + E) or close to it because they use adjacency lists; on a matrix they would cost O(V²).',
          'الخطوة الجاية: BFS وDFS بيمشوا على الـ lists دي عشان يلفّوا في الـ graph، وShortest Paths (Dijkstra) بيضيف weights. التلاتة بياخدوا O(V + E) أو قريب منها عشان بيستخدموا adjacency lists. على matrix كانوا هياخدوا O(V²).'),
      ],
      costs: [
        { label: message('Space · list / matrix', 'المساحة · list / matrix'), value: 'O(V + E) / O(V²)' },
        { label: message('has-edge · list / matrix', 'has-edge · list / matrix'), value: 'O(deg u) / O(1)' },
        { label: message('neighbors · list / matrix', 'neighbors · list / matrix'), value: 'O(deg u) / O(V)' },
        { label: message('add edge · list / matrix', 'إضافة edge · list / matrix'), value: 'O(1) / O(1)' },
        { label: message('remove edge · list / matrix', 'شيل edge · list / matrix'), value: 'O(deg u) / O(1)' },
        { label: message('add node · list / matrix', 'إضافة node · list / matrix'), value: 'O(1) / O(V)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
