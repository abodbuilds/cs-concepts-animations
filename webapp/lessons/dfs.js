(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const isNode = value => typeof value === 'string' && /^[A-H]$/.test(value);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const edgeId = (from, to) => [from, to].sort().join('-');
  const graphLimit = 512;
  const startLimit = 16;

  const code = [
    'dfs(graph, start):',
    '  discovered = {}; finished = {}; order = []',
    '  parent = {}',
    '  if start is NONE:',
    '    return order',
    '  visit(start)',
    '  return order',
    'visit(node):',
    '  discovered.add(node)',
    '  order.append(node)',
    '  for neighbor in neighbors(node), A to H:',
    '    if neighbor not in discovered:',
    '      parent[neighbor] = node',
    '      visit(neighbor)',
    '  finished.add(node)',
    '  return',
  ];

  function invalid(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  // Public build input: {nodes: ['A', ...], edges: [{from, to}], start: 'A' | null}.
  // Normalize fresh copies, so callers may provide any node/edge ordering.
  function validate(input) {
    if (!isObject(input) || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
      invalid('Use a graph with nodes, edges, and a start node.', 'لازم الـ graph يبقى فيه nodes و edges و start node.');
    }
    if (input.nodes.length > 8 || Array.from(input.nodes).some(node => !isNode(node))) {
      invalid('Use at most 8 nodes, each a single uppercase letter A-H.', 'أقصى حاجة 8 nodes، وكل node اسمها حرف capital واحد من A لـ H.');
    }
    if (new Set(input.nodes).size !== input.nodes.length) {
      invalid('Each node must appear once in nodes.', 'كل node لازم تظهر مرة واحدة بس في nodes.');
    }
    if (input.edges.length > 20) {
      invalid('Use at most 20 undirected edges.', 'أقصى حاجة 20 edge، وكلهم undirected.');
    }
    const nodes = [...input.nodes].sort();
    const seen = new Set();
    const edges = Array.from(input.edges, edge => {
      if (!isObject(edge) || !isNode(edge.from) || !isNode(edge.to)
        || !nodes.includes(edge.from) || !nodes.includes(edge.to)
        || ('directed' in edge && edge.directed !== false) || 'weight' in edge) {
        invalid('Each edge needs existing from/to nodes A-H, with no direction or weight.', 'كل edge لازم يبقى ليه from و to، وهما nodes موجودة من A لـ H. ومن غير اتجاه ولا weight.');
      }
      const id = edgeId(edge.from, edge.to);
      if (seen.has(id)) {
        invalid(`Edge ${id} is repeated; A-B and B-A are the same edge.`, `الـ edge ${id} متكرّر. A-B و B-A هما نفس الـ edge.`);
      }
      seen.add(id);
      const [from, to] = id.split('-');
      return { from, to };
    }).sort((a, b) => edgeId(a.from, a.to) < edgeId(b.from, b.to) ? -1 : 1);
    if (nodes.length === 0 ? input.start !== null : !isNode(input.start) || !nodes.includes(input.start)) {
      invalid('Choose a start node in the graph; use null only for an empty graph.', 'اختار start node موجودة في الـ graph. استخدم null بس لو الـ graph فاضي.');
    }
    return { nodes, edges, start: input.start };
  }

  function parse(rawInput) {
    if (!isObject(rawInput) || typeof rawInput.graph !== 'string' || typeof rawInput.start !== 'string') {
      invalid('Enter graph and start as text.', 'اكتب الـ graph والـ start كـ text.');
    }
    if (rawInput.graph.length > graphLimit || rawInput.start.length > startLimit) {
      invalid('Keep graph text within 512 characters and start within 16.', 'الـ graph لازم ميعدّيش 512 character، والـ start ميعدّيش 16.');
    }
    const nodes = new Set();
    const edges = [];
    const tokens = rawInput.graph.split(/[,;\r\n]+/).map(token => token.trim()).filter(Boolean);
    for (const token of tokens) {
      const match = /^([A-H])(?:\s*-\s*([A-H]))?$/.exec(token);
      if (!match) {
        invalid('Use A-B for an edge or H for an isolated node; separate entries with commas, semicolons, or newlines.', 'اكتب A-B عشان edge، أو H لوحدها عشان node. افصل بينهم بـ comma أو semicolon أو سطر جديد.');
      }
      nodes.add(match[1]);
      if (match[2]) {
        nodes.add(match[2]);
        edges.push({ from: match[1], to: match[2] });
      }
    }
    const start = rawInput.start.trim();
    if (nodes.size === 0 && start !== '') {
      invalid('Leave start blank when the graph is empty.', 'سيب الـ start فاضي لو الـ graph فاضي.');
    }
    if (nodes.size > 0 && (!isNode(start) || !nodes.has(start))) {
      invalid('Start must be one uppercase letter A-H present in the graph.', 'الـ start لازم يبقى حرف capital واحد من A لـ H، وموجود في الـ graph.');
    }
    return validate({ nodes: [...nodes], edges, start: start || null });
  }

  function build(input) {
    const { nodes, edges, start } = validate(input);
    const adjacency = Object.fromEntries(nodes.map(node => [node, []]));
    for (const { from, to } of edges) {
      adjacency[from].push(to);
      if (from !== to) adjacency[to].push(from);
    }
    for (const neighbors of Object.values(adjacency)) neighbors.sort();

    const state = {
      nodes, edges, adjacency, start, initialized: false,
      current: null, neighbor: null, condition: null, activeEdge: null,
      stack: [], discovered: [], finished: [], order: [], parent: {},
      examinedEdges: [], treeEdges: [], edgeChecks: 0, returns: 0, maxDepth: 0,
      done: false, result: null,
    };
    const frames = [];
    const discovered = new Set();

    function emit(kind, lines, title, explanation, equation = '') {
      const top = state.stack[state.stack.length - 1];
      const scene = {
        rows: [
          {
            id: 'dfs-stack', label: message('Call stack · bottom → top', 'الـ call stack · من تحت لفوق'), layout: 'cards',
            cells: state.stack.map((call, index) => ({
              id: `dfs-call-${call.node}`, value: call.node, index,
              tone: index === state.stack.length - 1 ? 'active' : 'pivot',
              marker: index === state.stack.length - 1 ? 'top' : `next: ${call.nextIndex}`,
            })),
          },
          {
            id: 'dfs-order', label: message('Discovery order', 'ترتيب الاكتشاف'), layout: 'cards',
            cells: state.order.map((node, index) => ({
              id: `dfs-order-${node}`, value: node, index,
              tone: node === state.current ? 'active' : 'found',
            })),
          },
        ],
        graph: {
          nodes: nodes.map(node => ({
            id: node, label: node,
            tone: node === state.current ? 'active' : state.finished.includes(node) ? 'sorted'
              : discovered.has(node) ? 'pivot' : state.done ? 'muted' : 'default',
            detail: `seen: ${discovered.has(node)}; finished: ${state.finished.includes(node)}`,
          })),
          edges: edges.map(edge => {
            const id = edgeId(edge.from, edge.to);
            const active = state.activeEdge && edgeId(state.activeEdge.from, state.activeEdge.to) === id;
            const tree = state.treeEdges.some(item => edgeId(item.from, item.to) === id);
            const examined = state.examinedEdges.some(item => edgeId(item.from, item.to) === id);
            return { ...edge, directed: false, tone: active ? 'active' : tree ? 'found' : examined ? 'muted' : 'default' };
          }),
        },
        collections: [
          { label: message('Discovered', 'اتكتشفت'), values: state.discovered },
          { label: message('Finished', 'خلصت'), values: state.finished },
        ],
        note: message('Neighbors: A → H. Only the start component is visited.', 'الـ neighbors بالترتيب من A لـ H. بنزور بس الـ nodes اللي نقدر نوصلها من الـ start.'),
      };
      // Copy the whole frame, including scene and nested stack cursors, for safe seeking.
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'start', value: start === null ? 'NONE' : start },
          { name: 'node', value: state.current === null ? '—' : state.current },
          { name: 'neighbor', value: state.neighbor === null ? '—' : state.neighbor },
          { name: 'nextIndex', value: top ? top.nextIndex : '—' },
          { name: 'parent[node]', value: state.parent[state.current] || '—' },
          { name: 'depth', value: state.stack.length },
          { name: 'condition', value: state.condition === null ? '—' : state.condition },
        ],
        metrics: [
          { label: message('Discovered nodes', 'الـ nodes اللي اتكتشفت'), value: state.discovered.length },
          { label: message('Neighbor entries examined', 'الـ neighbors اللي شيّكنا عليهم'), value: state.edgeChecks },
          { label: message('Calls returned', 'الـ calls اللي رجعت'), value: state.returns },
          { label: message('Maximum stack depth', 'أقصى depth وصله الـ stack'), value: state.maxDepth },
        ],
        scene,
      }));
    }

    emit('ready', [], message('Follow one branch all the way', 'هنمشي في فرع واحد لحد آخره'),
      start === null
        ? message('The graph is empty, so there is no starting call. The result will be empty.', 'الـ graph فاضي، يعني مفيش call نبدأ بيه. والنتيجة هتطلع فاضية.')
        : message(`Start at ${start}. Explore the first unseen neighbor alphabetically, then return when a branch is finished.`, `هنبدأ من ${start}. هندخل في أول neighbor لسه مشفناهوش بالترتيب الأبجدي، ولما الفرع يخلص هنرجع.`));

    state.initialized = true;
    emit('initialize', [2, 3], message('Clear the traversal state', 'بنبدأ الـ traversal من الصفر'),
      message('No node has been discovered or finished. The order and parent map start empty.', 'لسه مفيش ولا node اتكتشفت أو خلصت. والـ order والـ parent فاضيين.'),
      'discovered = {}; finished = {}; order = []; parent = {}');
    state.condition = start === null;
    emit('empty-check', [4], message(start === null ? 'There is no start node' : 'A starting node is available', start === null ? 'مفيش start node' : 'فيه start node نبدأ منها'),
      start === null
        ? message('The empty-input guard succeeds. Return without making a recursive call.', 'الـ input فاضي، فالـ condition طلع true. هنعمل return من غير أي recursive call.')
        : message(`The guard is false because ${start} exists. The next operation calls visit(${start}).`, `الـ condition طلع false عشان ${start} موجودة. الخطوة الجاية هنعمل call لـ visit(${start}).`),
      `start is NONE → ${state.condition}`);

    function visit(node, caller) {
      const call = { node, nextIndex: 0, neighbor: null };
      state.stack.push(call);
      state.current = node;
      state.neighbor = null;
      state.condition = null;
      state.activeEdge = caller === null ? null : { from: caller, to: node };
      state.maxDepth = Math.max(state.maxDepth, state.stack.length);
      emit('call', [caller === null ? 6 : 14], message(`Enter visit(${node})`, `بندخل visit(${node})`),
        caller === null
          ? message(`Push the first call for ${node}. It is now active; discovery happens on the next line.`, `بنعمل push لأول call، بتاع ${node}. ده الـ call الشغّال دلوقتي، وفي السطر الجاي هنعلّم ${node} إنها discovered.`)
          : message(`Suspend ${caller} and push a call for ${node}. The caller keeps its next-neighbor position.`, `بنوقّف ${caller} مؤقتًا، ونعمل push لـ call بتاع ${node}. الـ call بتاع ${caller} فاكر هو وقف عند أنهي neighbor.`),
        `visit(${node}); depth = ${state.stack.length}`);

      discovered.add(node);
      state.discovered.push(node);
      emit('discover', [9], message(`Discover ${node}`, `اكتشفنا ${node}`),
        message(`Mark ${node} before exploring its edges. A cycle cannot create another call for this node.`, `بنعلّم على ${node} قبل ما نشيّك على الـ edges بتاعتها. كده الـ cycles مش هتعمل call تاني للـ node دي.`),
        `discovered.add(${node})`);
      state.order.push(node);
      emit('record', [10], message(`Record ${node}'s arrival`, `بنسجّل إننا وصلنا لـ ${node}`),
        message(`Append ${node} at discovery index ${state.order.length - 1}. This is arrival order, not return order.`, `بنعمل append لـ ${node} في الـ order عند index ${state.order.length - 1}. ده ترتيب وصولنا للـ nodes، مش ترتيب الرجوع.`),
        `order[${state.order.length - 1}] = ${node}`);

      for (const neighbor of adjacency[node]) {
        call.neighbor = neighbor;
        call.nextIndex++;
        state.neighbor = neighbor;
        state.activeEdge = { from: node, to: neighbor };
        state.condition = true;
        state.edgeChecks++;
        state.examinedEdges.push({ from: node, to: neighbor });
        emit('examine', [11], message(`Examine ${node} → ${neighbor}`, `بنشيّك على ${node} → ${neighbor}`),
          message(`Take neighbor ${neighbor} at index ${call.nextIndex - 1} in ${node}'s alphabetical adjacency list. The suspended call will resume at index ${call.nextIndex}.`, `بناخد الـ neighbor ${neighbor} من index ${call.nextIndex - 1} في الـ adjacency list بتاعة ${node}، ودي مترتّبة أبجديًا. لما الـ call ده يرجع يكمّل، هيبدأ من index ${call.nextIndex}.`),
          `neighbors(${node})[${call.nextIndex - 1}] = ${neighbor}`);
        state.condition = !discovered.has(neighbor);
        emit(state.condition ? 'unseen' : 'skip', [12],
          message(state.condition ? `${neighbor} is new` : `${neighbor} was already discovered`, state.condition ? `${neighbor} جديدة` : `${neighbor} اتكتشفت قبل كده`),
          state.condition
            ? message(`${neighbor} has no earlier visit. Save its parent, then explore it before another neighbor of ${node}.`, `${neighbor} لسه مزرناهاش. هنسجّل الـ parent بتاعها، وبعدين ندخل فيها قبل أي neighbor تاني لـ ${node}.`)
            : message(neighbor === node ? `This self-loop leads back to ${node}, which is already discovered. Skip the recursive call.`
              : `${neighbor} is ${state.finished.includes(neighbor) ? 'finished' : 'still on the call stack'}. Skip this edge's recursive call and continue with ${node}'s next neighbor.`,
            neighbor === node ? `الـ self-loop ده بيرجّعنا لـ ${node} نفسها، وهي discovered خلاص. مش هنعمل recursive call.`
              : `${neighbor} ${state.finished.includes(neighbor) ? 'خلصت خلاص' : 'لسه في الـ call stack'}. مش هنعمل recursive call للـ edge ده، وهنكمّل على الـ neighbor اللي بعده بتاع ${node}.`),
          `${neighbor} not in discovered → ${state.condition}`);
        if (state.condition) {
          state.parent[neighbor] = node;
          state.treeEdges.push({ from: node, to: neighbor });
          emit('parent', [13], message(`${node} becomes ${neighbor}'s parent`, `${node} بقت الـ parent بتاع ${neighbor}`),
            message(`The edge from ${node} first reaches ${neighbor}. Keep it in the DFS tree so the route can be reconstructed.`, `الـ edge اللي من ${node} هو أول edge يوصّلنا لـ ${neighbor}. بنحفظه في الـ DFS tree عشان نقدر نطلّع الـ path بعدين.`),
            `parent[${neighbor}] = ${node}`);
          visit(neighbor, node);
        }
      }

      state.neighbor = null;
      call.neighbor = null;
      state.activeEdge = null;
      state.condition = false;
      emit('exhausted', [11], message(`${node} has no neighbors left to check`, `${node} مفضلّهاش neighbors نشيّك عليها`),
        message(`All ${adjacency[node].length} neighbor entries for ${node} have been examined. The loop ends.`, `شيّكنا على كل الـ neighbors بتوع ${node}، وعددهم ${adjacency[node].length}. الـ loop خلصت.`),
        `nextIndex = ${call.nextIndex}; degree(${node}) = ${adjacency[node].length}`);
      state.finished.push(node);
      state.condition = null;
      emit('finish', [15], message(`Finish ${node}`, `${node} خلصت`),
        message(`Every neighbor of ${node} is discovered and every child call has returned. Mark this node finished before leaving its call.`, `كل الـ neighbors بتوع ${node} اتكتشفوا، وكل الـ calls اللي طلعت منها رجعت. بنعلّم عليها finished قبل ما نخرج من الـ call بتاعها.`),
        `finished.add(${node})`);
      state.stack.pop();
      state.returns++;
      const resumed = state.stack[state.stack.length - 1];
      state.current = resumed ? resumed.node : null;
      state.neighbor = resumed ? resumed.neighbor : null;
      state.activeEdge = resumed ? { from: node, to: resumed.node } : null;
      emit('return', [16], message(resumed ? `Backtrack to ${resumed.node}` : 'Return from the starting call', resumed ? `بنعمل backtrack لـ ${resumed.node}` : 'بنرجع من أول call'),
        resumed
          ? message(`Pop ${node}. Resume ${resumed.node} at neighbor index ${resumed.nextIndex}; do not restart its loop.`, `بنعمل pop لـ ${node}. ${resumed.node} هتكمّل من index ${resumed.nextIndex} في الـ neighbors بتوعها، مش هنبدأ الـ loop بتاعتها من الأول.`)
          : message(`Pop ${node}. The call stack is empty, and every node reachable from ${start} has finished.`, `بنعمل pop لـ ${node}. الـ call stack فضي، وكل node نقدر نوصلها من ${start} خلصت.`),
        `return; depth = ${state.stack.length}`);
    }

    if (start !== null) visit(start, null);
    state.done = true;
    state.result = [...state.order];
    state.condition = null;
    const unvisited = nodes.length - state.discovered.length;
    emit('done', [start === null ? 5 : 7], message('DFS traversal complete', 'الـ DFS خلص'),
      start === null
        ? message('Return an empty discovery order. No nodes, edges, or calls were processed.', 'بنعمل return لـ order فاضي. مفيش ولا node ولا edge ولا call اشتغلنا عليهم.')
        : message(`Return the discovery order of ${state.order.length} reachable nodes. ${unvisited ? `${unvisited} disconnected node(s) remain unvisited; this traversal does not restart there.` : 'Every node in this graph was reachable from the start.'}`, `بنعمل return لترتيب اكتشاف ${state.order.length} nodes قدرنا نوصلها. ${unvisited ? `فيه ${unvisited} من الـ nodes مش متوصّلة بالباقي ومزرناهاش. الـ traversal مش هيبدأ من عندها تاني.` : 'كل الـ nodes في الـ graph ده قدرنا نوصلها من الـ start.'}`),
      'return order');
    return frames;
  }

  const defaults = { graph: 'A-B, A-C, B-D, B-E, C-F, E-G, F-G, H', start: 'A' };
  const lesson = {
    id: 'dfs', name: 'Depth-First Search', theme: 'algorithms', category: 'graph', number: '08',
    label: 'DEPTH-FIRST SEARCH', cost: 'O(V + E)',
    description: message('Go deep along one branch, then backtrack. Watch recursive calls build the discovery order.', 'بننزل في فرع واحد لحد آخره، وبعدين بنرجع. شوف الـ recursive calls وهي بتبني ترتيب الاكتشاف.'),
    note: message('Undirected, unweighted graph. Neighbors run A to H. Only the start component is visited; the result is discovery order.', 'الـ graph هنا undirected ومن غير weights. الـ neighbors بالترتيب من A لـ H. بنزور بس الـ nodes اللي نقدر نوصلها من الـ start، والنتيجة هي ترتيب الاكتشاف.'),
    code,
    keySteps: ['ready', 'discover', 'skip', 'return', 'done'],
    view: {
      hideCollections: true, markers: { 'dfs-stack': ['top'] },
      legend: [
        { tone: 'active', role: 'current', label: message('Current', 'الـ node الحالية') },
        { tone: 'pivot', role: 'waiting', label: message('Waiting on the stack', 'مستنية في الـ stack') },
        { tone: 'sorted', role: 'done', label: message('Finished', 'خلصت') },
      ],
    },
    fields: [
      {
        name: 'graph', label: message('Graph edges and isolated nodes', 'الـ edges والـ nodes اللي لوحدها'), type: 'textarea', maxLength: graphLimit,
        help: message('Write A-B for an undirected edge or H for a node. Separate entries with commas, semicolons, or newlines; spaces around - and empty separators are allowed. Labels A-H; at most 8 nodes and 20 edges. No duplicate edges (A-B equals B-A). Self-loops are allowed and checked once. Leave both fields blank for an empty graph.', 'اكتب A-B عشان edge من غير اتجاه، أو H لوحدها عشان node. افصل بـ comma أو semicolon أو سطر جديد، والمسافات حوالين الـ - والفواصل الفاضية عادي. الأسماء من A لـ H، وأقصى حاجة 8 nodes و 20 edge. متكرّرش أي edge، فـ A-B هو نفسه B-A. الـ self-loop مسموح، وبنشيّك عليه مرة واحدة بس. لو عايز graph فاضي، سيب الخانتين فاضيين.'),
      },
      {
        name: 'start', label: message('Start node', 'الـ start node'), type: 'text', maxLength: startLimit,
        help: message('One uppercase letter A-H already in the graph. Leave blank only for an empty graph.', 'حرف capital واحد من A لـ H، وموجود في الـ graph. سيبه فاضي بس لو الـ graph فاضي.'),
      },
    ],
    defaults: { ...defaults },
    presets: [
      { id: 'default', label: message('Branches, a cycle, and an isolated node', 'فروع و cycle و node لوحدها'), input: { ...defaults } },
      { id: 'branching', label: message('Backtracking between branches', 'الـ backtracking بين الفروع'), input: { graph: 'A-B, A-C, B-D, B-E, C-F, C-G', start: 'A' } },
      { id: 'cycle', label: message('A cycle stops at discovered nodes', 'الـ cycle بتقف عند الـ nodes اللي اتكتشفت'), input: { graph: 'A-B, B-C, C-A', start: 'A' } },
      { id: 'disconnected', label: message('Start in a disconnected component', 'بنبدأ في جزء منفصل من الـ graph'), input: { graph: 'A-B, B-C, D-E, F, H', start: 'D' } },
      { id: 'chain', label: message('Deepest call stack', 'أعمق call stack'), input: { graph: 'A-B, B-C, C-D, D-E, E-F, F-G, G-H', start: 'A' } },
      { id: 'self-loop', label: message('Self-loops need no new call', 'الـ self-loop مش محتاج call جديد'), input: { graph: 'A-A, A-B, B-B', start: 'A' } },
      { id: 'singleton', label: message('One isolated node', 'node واحدة لوحدها'), input: { graph: 'D', start: 'D' } },
      { id: 'empty', label: message('Empty graph', 'graph فاضي'), input: { graph: '', start: '' } },
    ],
    parse, build,
    summary(input) {
      const { nodes, edges, start } = validate(input);
      return start === null
        ? message('Empty graph · no start · empty traversal', 'graph فاضي · مفيش start · traversal فاضي')
        : message(`${nodes.length} nodes · ${edges.length} undirected edges · start ${start} · A–H neighbor order`, `${nodes.length} nodes · ${edges.length} edges undirected · الـ start هي ${start} · الـ neighbors من A لـ H`);
    },
    theory: {
      idea: message('Follow one path as deep as it goes. Only at a dead end, go back one step and try the next neighbor.',
        'امشي في path واحد لحد آخره. ولما الطريق يتسد، ساعتها بس ارجع خطوة وجرّب الـ neighbor اللي بعده.'),
      title: message('Depth first, then backtrack', 'بننزل للآخر، وبعدين بنعمل backtrack'),
      intro: message('DFS explores a graph using recursive calls. Know what a node, an undirected edge, an adjacency list, and a last-in-first-out call stack mean. Each call keeps its position while a child explores deeper.', 'الـ DFS بيلف على الـ graph بـ recursive calls. لازم تكون عارف يعني إيه node، و edge من غير اتجاه، و adjacency list، و call stack بيشتغل LIFO (آخر call يدخل هو أول واحد يطلع). كل call بيفتكر هو واقف فين، لحد ما الـ call اللي جواه يخلص ويرجع.'),
      invariant: message('Each node is marked discovered before any outgoing exploration, so it is called at most once. Active calls form a path from the start; each suspended call remembers its next neighbor. A finished node has examined every neighbor and all its child calls have returned. Following any path from the start therefore discovers every reachable node; no call crosses to a disconnected component.', 'كل node بنعلّم عليها discovered قبل ما نشيّك على أي neighbor ليها، فمستحيل نعملّها call أكتر من مرة. الـ calls الشغّالة بتعمل path من الـ start، وكل call واقف فاكر الـ neighbor الجاي. الـ node اللي خلصت تبقى شيّكت على كل الـ neighbors بتوعها، وكل الـ calls اللي طلعت منها رجعت. عشان كده لو مشينا ورا أي path من الـ start، هنكتشف كل node نقدر نوصلها، ومفيش call هيعدّي لجزء منفصل.'),
      steps: [
        { title: message('Enter and discover', 'بندخل ونكتشف'), body: message('Push a call, mark its node discovered, and append it to the order. Marking before recursion prevents cycles and self-loops from repeating work.', 'بنعمل push لـ call، ونعلّم الـ node بتاعته discovered، ونعمل append ليها في الـ order. ولأننا بنعلّم عليها قبل الـ recursion، الـ cycles والـ self-loops مش بيخلّونا نكرّر شغل.') },
        { title: message('Explore one neighbor', 'بنشيّك على neighbor واحد'), body: message('Check neighbors alphabetically. If a neighbor is unseen, save its parent and finish that recursive call before checking the next neighbor. Otherwise skip the new call.', 'بنشيّك على الـ neighbors بالترتيب الأبجدي. لو الـ neighbor لسه مشفناهوش، بنسجّل الـ parent بتاعه ونخلّص الـ recursive call بتاعه قبل ما نشيّك على اللي بعده. غير كده، مش بنعمل call جديد.') },
        { title: message('Finish and return', 'بنخلّص ونرجع'), body: message('When no neighbor remains, mark the node finished and pop its call. Resume the parent at its saved position. Discovery order and finishing order serve different purposes.', 'لما مايفضلش neighbors، بنعلّم الـ node إنها finished ونعمل pop للـ call بتاعها. الـ parent بيكمّل من المكان اللي كان حافظه. ترتيب الاكتشاف وترتيب الـ finish كل واحد فيهم ليه استخدام مختلف.') },
      ],
      notes: [
        message('Only the start component is traversed. An isolated start is visited once; an empty graph requires no start and returns an empty order. To traverse every component, an outer loop over unseen nodes would be needed.', 'بنزور بس الجزء اللي متوصّل بالـ start. لو الـ start node لوحدها، هنزورها مرة واحدة. والـ graph الفاضي مش محتاج start، وبيرجّع order فاضي. لو عايزين نزور كل الأجزاء، هنحتاج loop برّانية تلف على الـ nodes اللي لسه مشفناهاش.'),
        message('The graph is undirected and unweighted. A-B and B-A denote one edge; duplicates are rejected. An ordinary edge is examined from both ends, while a self-loop is stored and examined once. An edge to a discovered node does not always prove a cycle: it may simply lead back to the parent.', 'الـ graph هنا undirected ومن غير weights. A-B و B-A هما نفس الـ edge، والتكرار مرفوض. الـ edge العادي بنشيّك عليه من الناحيتين، لكن الـ self-loop بيتخزّن مرة وبنشيّك عليه مرة. ولو edge وصّلنا لـ node discovered، ده مش دايمًا معناه إن فيه cycle. ممكن يكون بيرجّعنا للـ parent وخلاص.'),
        message('With adjacency lists already ordered and constant-time discovered-set lookup, the traversal takes O(Vr + Er) for reachable nodes and edges, with O(V + E) as the whole-graph worst case. Input normalization and neighbor sorting happen before traversal; sorting costs O(V log V + E log(E + 1) + Σ deg(v) log(deg(v) + 1)).', 'لو الـ adjacency lists مترتّبة جاهزة، والـ lookup في discovered بياخد O(1)، يبقى الـ traversal بياخد O(Vr + Er) للـ nodes والـ edges اللي نقدر نوصلها. والـ worst case للـ graph كله O(V + E). تجهيز الـ input وترتيب الـ neighbors بيحصلوا قبل الـ traversal، والترتيب بياخد O(V log V + E log(E + 1) + Σ deg(v) log(deg(v) + 1)).'),
        message('The call stack can grow to Vr on a long path. On large graphs recursion may overflow the runtime stack; explicit stack frames with a saved neighbor cursor preserve this exact order. Pushing every neighbor at once with a different marking rule may change the DFS tree.', 'الـ call stack ممكن يكبر لحد Vr لو الـ path طويل. في الـ graphs الكبيرة، الـ recursion ممكن يعمل overflow للـ stack بتاع الـ runtime. لو عملنا stack بإيدينا، وكل frame فيه حافظ الـ neighbor اللي واقف عنده، هنفضل محافظين على نفس الترتيب بالظبط. لكن لو عملنا push لكل الـ neighbors مرة واحدة، وعلّمنا عليهم بطريقة تانية، الـ DFS tree ممكن تتغيّر.'),
        message('DFS is useful for reachability, maze exploration, and as a building block for other graph algorithms. Its parent tree provides a route, but does not guarantee the fewest edges; BFS does for unweighted graphs. Alphabetical order makes this lesson reproducible, not uniquely correct.', 'الـ DFS مفيد عشان نعرف نقدر نوصل لإيه، ولما نلف في متاهة، وكأساس لـ graph algorithms تانية. الـ parent tree بتدّينا path، بس مش شرط يكون بأقل عدد edges. الـ BFS هو اللي بيضمن ده في الـ graph اللي من غير weights. الترتيب الأبجدي هنا عشان الدرس يدّي نفس النتيجة كل مرة، مش عشان هو الترتيب الصح الوحيد.'),
      ],
      costs: [
        { label: message('Worst-case traversal time', 'وقت الـ traversal في الـ worst case'), value: 'O(V + E)' },
        { label: message('Reachable component time', 'وقت الجزء اللي نقدر نوصله بس'), value: 'O(Vr + Er)' },
        { label: message('Traversal extra space', 'الـ extra space بتاعة الـ traversal'), value: 'O(Vr)' },
        { label: message('Graph representation', 'المساحة اللي الـ graph بياخدها'), value: 'O(V + E)' },
        { label: message('Maximum recursion depth', 'أقصى depth للـ recursion'), value: 'O(Vr)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons.dfs = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
