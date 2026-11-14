(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_GRAPH_LENGTH = 500;
  const MAX_START_LENGTH = 16;
  const isNode = value => typeof value === 'string' && /^[A-H]$/.test(value);
  const edgeId = (from, to) => [from, to].sort().join('-');

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  // Public build input: {nodes: string[], edges: {from,to}[], start: string|null}.
  // Copy and canonicalize here so build enforces the same graph rules as parse.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
      fail('Use a graph with nodes, edges and a start node.',
        'محتاجين graph فيه nodes و edges و start node.');
    }
    if (input.nodes.length > 8 || input.edges.length > 20) {
      fail('Use at most 8 nodes and 20 undirected edges.',
        'مسموح لحد 8 nodes و 20 undirected edge بس.');
    }
    const nodes = [...input.nodes];
    if (nodes.some(node => !isNode(node)) || new Set(nodes).size !== nodes.length) {
      fail('Node labels must be distinct single uppercase letters A–H.',
        'اسم كل node لازم يكون حرف capital واحد من A لـ H، ومفيش اسمين زي بعض.');
    }
    nodes.sort();
    const seen = new Set();
    const edges = Array.from(input.edges, edge => {
      if (!edge || typeof edge !== 'object' || Array.isArray(edge) ||
          Object.keys(edge).some(field => field !== 'from' && field !== 'to') ||
          !isNode(edge.from) || !isNode(edge.to) ||
          !nodes.includes(edge.from) || !nodes.includes(edge.to)) {
        fail('Each edge needs only from and to, both labels present in nodes; no weights or directions.',
          'كل edge فيه from و to بس، والاتنين لازم يكونوا موجودين في nodes. مفيش weights ولا directions.');
      }
      const id = edgeId(edge.from, edge.to);
      if (seen.has(id)) {
        fail(`Edge ${id} is repeated. A-B and B-A are the same edge.`,
          `الـ edge ${id} متكرّر. A-B و B-A هما نفس الـ edge.`);
      }
      seen.add(id);
      const [from, to] = id.split('-');
      return { from, to };
    });
    edges.sort((a, b) => edgeId(a.from, a.to) < edgeId(b.from, b.to) ? -1 : 1);
    if (nodes.length === 0 ? input.start !== null : !isNode(input.start) || !nodes.includes(input.start)) {
      fail(nodes.length ? 'Choose a start node that appears in the graph.' : 'Leave start blank for an empty graph (null in build input).',
        nodes.length ? 'اختار start node موجودة في الـ graph.' : 'لو الـ graph فاضي، سيب start فاضي (يعني null في الـ input بتاع build).');
    }
    return { nodes, edges, start: input.start };
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput.graph !== 'string' || typeof rawInput.start !== 'string') {
      fail('Provide graph and start as text fields.', 'اكتب graph و start كـ text fields.');
    }
    if (rawInput.graph.length > MAX_GRAPH_LENGTH || rawInput.start.length > MAX_START_LENGTH) {
      fail('Keep graph text within 500 characters and start within 16 characters.',
        'الـ graph لحد 500 character، والـ start لحد 16 character.');
    }
    const nodes = new Set();
    const edges = [];
    const text = rawInput.graph.trim();
    if (text) {
      for (const entry of text.split(/[,;\r\n]+/)) {
        const token = entry.trim();
        // Blank lines and repeated separators are harmless; other text is strict.
        if (!token) continue;
        const match = /^([A-H])(?:\s*-\s*([A-H]))?$/.exec(token);
        if (!match) {
          fail('Use A-B for an undirected edge or A for a node. Separate entries with commas, semicolons or newlines; labels are A–H.',
            'اكتب A-B عشان undirected edge، أو A عشان node لوحدها. افصل بينهم بـ comma أو semicolon أو سطر جديد. الأسماء من A لـ H.');
        }
        nodes.add(match[1]);
        if (match[2]) {
          nodes.add(match[2]);
          edges.push({ from: match[1], to: match[2] });
        }
      }
      if (nodes.size === 0) {
        fail('Enter a node or edge, or leave graph completely blank.',
          'اكتب node أو edge، أو سيب الـ graph فاضي خالص.');
      }
    }
    return validate({ nodes: [...nodes], edges, start: rawInput.start.trim() || null });
  }

  const code = [
    'bfs(graph, start):',
    '  queue = []; discovered = {}; processed = {}',
    '  order = []; distance[*] = ∞; parent[*] = null',
    '  if graph is empty:',
    '    return order, distance, parent',
    '  distance[start] = 0',
    '  discovered.add(start); queue.enqueue(start)',
    '  while queue is not empty:',
    '    current = queue.dequeue()',
    '    order.append(current)',
    '    for neighbor in neighbors[current] (A..H):',
    '      examine(current, neighbor)',
    '      if neighbor not in discovered:',
    '        distance[neighbor] = distance[current] + 1',
    '        parent[neighbor] = current',
    '        discovered.add(neighbor); queue.enqueue(neighbor)',
    '    processed.add(current)',
    '  return order, distance, parent',
  ];

  function sceneFor(state) {
    const processed = new Set(state.processed);
    const discovered = new Set(state.discovered);
    const examined = new Set(state.examinedEdges.map(edge => edgeId(edge.from, edge.to)));
    const active = state.activeEdge && edgeId(state.activeEdge.from, state.activeEdge.to);
    const current = state.current !== null && !processed.has(state.current) ? state.current : null;
    return {
      rows: [
        { id: 'bfs-queue', label: message('Queue · front → back', 'الـ queue · front → back'), layout: 'cards',
          cells: state.queue.map((node, index) => ({ id: `bfs-node-${node}`, value: node, index,
            tone: index === 0 ? 'pivot' : 'default',
            marker: index === 0 ? (state.queue.length === 1 ? 'front / back' : 'front') :
              index === state.queue.length - 1 ? 'back' : '' })) },
        { id: 'bfs-current', label: message('Current node', 'الـ node اللي شغّالين عليها'), layout: 'cards',
          cells: current === null ? [] : [{ id: `bfs-node-${current}`, value: current, tone: 'active', marker: 'current' }] },
        { id: 'bfs-order', label: message('Traversal order · on dequeue', 'ترتيب الزيارة · بيتسجّل وقت الـ dequeue'), layout: 'cards',
          cells: state.order.map((node, index) => ({ id: `bfs-order-${node}`, value: node, index,
            tone: processed.has(node) ? 'sorted' : 'active' })) },
        { id: 'bfs-distance', label: message('Distance / level · number of edges', 'الـ distance / الـ level · عدد الـ edges'), layout: 'cards',
          cells: state.nodes.map(node => ({ id: `bfs-distance-${node}`, value: state.distance[node] ?? '—',
            marker: node, tone: discovered.has(node) ? 'found' : 'muted' })) },
      ],
      graph: {
        nodes: state.nodes.map(node => ({ id: node, label: node,
          tone: node === current ? 'active' : node === state.neighbor ? 'pivot' :
            processed.has(node) ? 'sorted' : discovered.has(node) ? 'found' : state.done ? 'muted' : 'default',
          detail: `d = ${state.distance[node] ?? '—'} · parent = ${state.parent[node] ?? '—'}` })),
        edges: state.edges.map(edge => {
          const id = edgeId(edge.from, edge.to);
          return { ...edge, directed: false,
            tone: id === active ? 'active' : state.parent[edge.to] === edge.from || state.parent[edge.from] === edge.to ?
              'found' : examined.has(id) ? 'sorted' : state.done ? 'muted' : 'default' };
        }),
      },
      collections: [
        { label: message('Discovered · marked on enqueue', 'Discovered · بنعلّم عليها وقت الـ enqueue'), values: state.discovered },
        { label: message('Processed · all neighbors checked', 'Processed · فحصنا كل الـ neighbors بتوعها'), values: state.processed },
        { label: message('Examined edges · scan direction', 'الـ edges اللي فحصناها · بنفحص من أنهي ناحية'),
          values: state.examinedEdges.map(edge => `${edge.from} → ${edge.to}`) },
      ],
      note: state.done ? message(
        `Finished ${state.order.length} reachable nodes; ${state.nodes.length - state.order.length} unreachable. ∞ means no path from start.`,
        `خلّصنا ${state.order.length} nodes نقدر نوصلها، و ${state.nodes.length - state.order.length} مش هنقدر نوصلها. ∞ يعني مفيش path من start.`) :
        message('Front leaves first. Discovered means already queued; processed means all neighbors checked. ∞ means not reached yet.',
          'اللي في الـ front بيطلع الأول. Discovered يعني دخلت الـ queue خلاص، و processed يعني فحصنا كل الـ neighbors بتوعها. ∞ يعني لسه موصلناش لها.'),
    };
  }

  function build(input) {
    const graph = validate(input);
    const adjacency = Object.fromEntries(graph.nodes.map(node => [node, []]));
    for (const { from, to } of graph.edges) {
      adjacency[from].push(to);
      if (from !== to) adjacency[to].push(from);
    }
    for (const neighbors of Object.values(adjacency)) neighbors.sort();
    // A head cursor gives the algorithm O(1) dequeue; snapshots copy the live tail.
    const fifo = [];
    let head = 0;
    const discovered = new Set();
    const state = { ...graph, initialized: false, queue: [], discovered: [], processed: [], order: [],
      distance: {}, parent: {}, current: null, neighbor: null, activeEdge: null, examinedEdges: [],
      condition: null, enqueues: 0, dequeues: 0, skippedEdges: 0, maxQueue: 0, done: false, result: null };
    const frames = [];
    function emit(kind, lines, title, explanation, equation = '') {
      state.queue = fifo.slice(head);
      // Clone the entire frame, including scene, labels, variables and result.
      frames.push(copy({ kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'start', value: state.start ?? '—' },
          { name: 'current', value: state.current ?? '—' },
          { name: 'neighbor', value: state.neighbor ?? '—' },
          { name: 'distance[current]', value: state.distance[state.current] ?? '—' },
          { name: 'queue.size', value: state.queue.length },
          { name: 'condition', value: state.condition ?? '—' },
        ],
        metrics: [
          { label: message('Enqueues / discoveries', 'الـ enqueues / الاكتشافات'), value: state.enqueues },
          { label: message('Dequeues', 'الـ dequeues'), value: state.dequeues },
          { label: message('Examined edges', 'الـ edges اللي اتفحصت'), value: state.examinedEdges.length },
          { label: message('Already discovered', 'كانت discovered قبل كده'), value: state.skippedEdges },
          { label: message('Largest queue', 'أكبر حجم للـ queue'), value: state.maxQueue },
        ],
        scene: sceneFor(state),
      }));
    }
    function enqueue(node, parent, distance) {
      state.distance[node] = distance;
      state.parent[node] = parent;
      discovered.add(node);
      state.discovered.push(node);
      fifo.push(node);
      state.enqueues++;
      state.maxQueue = Math.max(state.maxQueue, fifo.length - head);
    }
    function finish(line) {
      state.done = true;
      state.result = { order: state.order, distance: state.distance, parent: state.parent };
      emit('done', [line], message(graph.nodes.length ? 'The reachable component is complete' : 'An empty graph has no visits',
        graph.nodes.length ? 'خلّصنا كل اللي نقدر نوصله' : 'الـ graph فاضي، مفيش حاجة نزورها'),
      message(graph.nodes.length ?
        `Return the traversal and shortest edge-count distances from ${graph.start}. ${graph.nodes.length - state.order.length} nodes stay unreachable; BFS does not restart elsewhere.` :
        'Return an empty order and empty distance and parent maps. No node was enqueued or examined.',
      graph.nodes.length ?
        `بنعمل return لترتيب الزيارة، ولأقصر distance بعدد الـ edges من ${graph.start}. عدد الـ nodes اللي مش هنقدر نوصلها: ${graph.nodes.length - state.order.length}، والـ BFS مش بيبدأ من تاني من node تانية.` :
        'بنعمل return لـ order فاضي، و distance و parent فاضيين. معملناش enqueue لأي node، ومفحصناش ولا edge.'),
      'return order, distance, parent');
      return frames;
    }

    emit('ready', [], message('Explore one level at a time', 'هنمشي level ورا level'),
      message(graph.nodes.length ?
        `Start at ${graph.start}. This undirected, unweighted graph has ${graph.nodes.length} nodes and ${graph.edges.length} edges; only the reachable component will be visited. Neighbors are checked A to H.` :
        'Both input fields are blank. Initialize the empty structures, then return without choosing a start node.',
      graph.nodes.length ?
        `هنبدأ من ${graph.start}. الـ graph ده undirected ومن غير weights، وفيه ${graph.nodes.length} nodes و ${graph.edges.length} edges. هنزور بس الـ nodes اللي نقدر نوصلها، وبنفحص الـ neighbors من A لـ H.` :
        'الاتنين fields فاضيين. هنجهّز الـ structures فاضية، ونعمل return من غير ما نختار start node.'));
    state.initialized = true;
    for (const node of graph.nodes) { state.distance[node] = '∞'; state.parent[node] = null; }
    emit('initialize', [2, 3], message('Prepare the queue and distance map', 'بنجهّز الـ queue والـ distances'),
      message('The queue, discovered set, processed set and order start empty. Every node starts at ∞ with no parent.',
        'الـ queue و discovered و processed و order كلهم بيبدأوا فاضيين. وكل node الـ distance بتاعتها ∞ ومالهاش parent.'),
      'distance[*] = ∞; parent[*] = null');
    state.condition = graph.nodes.length === 0;
    emit('empty-check', [4], message(state.condition ? 'There is no start node' : 'There is a graph to explore',
      state.condition ? 'مفيش start node' : 'فيه graph نمشي فيه'),
    message(state.condition ? 'The graph is empty, so take the early return.' : `The graph is nonempty and ${graph.start} is a valid start. Seed the queue next.`,
      state.condition ? 'الـ graph فاضي، يبقى هنعمل return بدري.' : `الـ graph مش فاضي، و ${graph.start} موجودة فيه. الخطوة الجاية هنعمل لها enqueue.`),
    `nodes.length == 0 → ${state.condition}`);
    if (state.condition) return finish(5);

    state.condition = null;
    enqueue(graph.start, null, 0);
    emit('seed', [6, 7], message(`Discover ${graph.start} at distance zero`, `${graph.start} بقت discovered، والـ distance بتاعتها 0`),
      message(`Mark ${graph.start} discovered as it enters the queue. The start needs no edge and has no parent.`,
        `بنعلّم ${graph.start} إنها discovered وهي داخلة الـ queue. الـ start مش محتاجة edge، ومالهاش parent.`),
      `distance[${graph.start}] = 0; enqueue(${graph.start})`);
    while (true) {
      state.condition = head < fifo.length;
      emit('queue-check', [8], message(state.condition ? 'The frontier still has work' : 'The queue is empty',
        state.condition ? 'لسه فيه شغل في الـ queue' : 'الـ queue فاضية'),
      message(state.condition ? `There are ${fifo.length - head} pending nodes. Take the oldest one next.` :
        'Every discovered node has been processed. Any remaining ∞ node is unreachable from this start.',
      state.condition ? `عدد الـ nodes اللي مستنية: ${fifo.length - head}. هنطلّع أقدم واحدة فيهم.` :
        'كل node discovered بقت processed. أي node لسه الـ distance بتاعتها ∞ مش هنقدر نوصلها من الـ start دي.'),
      `queue.size > 0 → ${state.condition}`);
      if (!state.condition) break;

      state.current = fifo[head++];
      state.dequeues++;
      state.condition = null;
      emit('dequeue', [9], message(`Take ${state.current} from the front`, `بنعمل dequeue لـ ${state.current} من الـ front`),
        message(`${state.current} is next because it entered first. Its distance ${state.distance[state.current]} is already final.`,
          `الدور على ${state.current} عشان دخلت الأول. الـ distance بتاعتها ${state.distance[state.current]}، ومش هتتغيّر تاني.`),
        `current = dequeue() = ${state.current}`);
      state.order.push(state.current);
      emit('visit', [10], message(`Record the visit to ${state.current}`, `بنسجّل زيارة ${state.current}`),
        message(`This is visit ${state.order.length}. Traversal order records dequeue time; checking this node's neighbors comes next.`,
          `دي الزيارة رقم ${state.order.length}. ترتيب الزيارة بيتسجّل وقت الـ dequeue، وبعد كده هنفحص الـ neighbors بتوعها.`),
        `order.append(${state.current})`);

      for (let index = 0; index <= adjacency[state.current].length; index++) {
        state.neighbor = adjacency[state.current][index] ?? null;
        state.activeEdge = null;
        state.condition = state.neighbor !== null;
        emit('neighbor-check', [11], message(state.condition ? `Choose neighbor ${state.neighbor}` : `No neighbors remain for ${state.current}`,
          state.condition ? `بناخد الـ neighbor ${state.neighbor}` : `${state.current} مفيش ليها neighbors تانية`),
        message(state.condition ? `Choose the next neighbor of ${state.current} in A-to-H order. Being adjacent does not mean it is new.` :
          `All ${adjacency[state.current].length} adjacency entries have been checked. This node can now be marked processed.`,
        state.condition ? `بناخد الـ neighbor الجاي بتاع ${state.current} بترتيب A لـ H. ومش معنى إنه neighbor إنه لسه جديد.` :
          `فحصنا كل الـ neighbors بتوعها، وعددهم ${adjacency[state.current].length}. دلوقتي نقدر نعلّمها إنها processed.`),
        state.condition ? `neighbor = ${state.neighbor}` : 'no next neighbor');
        if (!state.condition) break;

        state.condition = null;
        state.activeEdge = { from: state.current, to: state.neighbor };
        state.examinedEdges.push(state.activeEdge);
        emit('examine', [12], message(`Examine ${state.current} → ${state.neighbor}`, `بنفحص ${state.current} → ${state.neighbor}`),
          message('Count this adjacency entry even if its other endpoint was already discovered. The arrow shows the scan direction, not a directed edge.',
            'بنعدّ الـ edge ده حتى لو الطرف التاني discovered قبل كده. السهم بيوضّح إحنا بنفحص من أنهي ناحية، مش إن الـ edge ليه اتجاه.'),
          `examined edges = ${state.examinedEdges.length}`);
        state.condition = !discovered.has(state.neighbor);
        if (!state.condition) state.skippedEdges++;
        emit('discovery-check', [13], message(state.condition ? `${state.neighbor} has not been discovered` : `${state.neighbor} is already discovered`,
          state.condition ? `${state.neighbor} لسه مش discovered` : `${state.neighbor} discovered قبل كده`),
        message(state.condition ? `The first route to ${state.neighbor} is through ${state.current}. Assign its level and enqueue it next.` :
          `${state.neighbor} was marked on enqueue, so do not enqueue it again or change its parent or distance. This also handles cycles and self-loops.`,
        state.condition ? `أول مرة نوصل لـ ${state.neighbor} كانت من ${state.current}. هنحدّد الـ level بتاعها ونعمل لها enqueue.` :
          `${state.neighbor} اتعلّمت discovered وقت الـ enqueue، فمش هنعمل لها enqueue تاني، ومش هنغيّر الـ parent ولا الـ distance بتاعتها. كده الـ cycles والـ self-loops مش بتعمل مشكلة.`),
        `${state.neighbor} not in discovered → ${state.condition}`);
        if (state.condition) {
          const distance = state.distance[state.current] + 1;
          enqueue(state.neighbor, state.current, distance);
          emit('discover', [14, 15, 16], message(`Enqueue ${state.neighbor} at level ${distance}`, `بنعمل enqueue لـ ${state.neighbor}، والـ level بتاعها ${distance}`),
            message(`One edge from ${state.current} reaches ${state.neighbor}. Save the parent, mark it discovered and append it to the back; FIFO keeps this next level behind the current one.`,
              `edge واحد من ${state.current} بيوصّلنا لـ ${state.neighbor}. بنحفظ الـ parent، ونعلّمها discovered، ونحطّها في آخر الـ queue. الـ FIFO بيخلّي الـ level الجاي يستنى ورا الـ level الحالي.`),
            `distance[${state.neighbor}] = ${state.distance[state.current]} + 1 = ${distance}; parent = ${state.current}`);
        }
      }
      state.processed.push(state.current);
      state.condition = null;
      emit('processed', [17], message(`Finish processing ${state.current}`, `${state.current} بقت processed`),
        message(`Every neighbor of ${state.current} is discovered now. Its adjacency list will not be scanned again.`,
          `كل الـ neighbors بتوع ${state.current} بقوا discovered. مش هنفحص الـ adjacency list بتاعتها تاني.`),
        `processed.add(${state.current})`);
    }
    return finish(18);
  }

  const defaults = { graph: 'A-B, A-C, B-D, C-D, D-E, C-F', start: 'A' };
  const lesson = {
    id: 'bfs', name: 'Breadth-First Search', theme: 'algorithms', category: 'graph', number: '07',
    label: 'BREADTH-FIRST SEARCH', cost: 'O(V + E)',
    description: message('A FIFO queue explores the reachable graph one level at a time, finding shortest paths by edge count.',
      'FIFO queue بتمشي في الجزء اللي نقدر نوصله من الـ graph، level ورا level، وبتلاقي أقصر path بعدد الـ edges.'),
    note: message('Undirected and unweighted. Check neighbors A to H, mark discovered on enqueue, and record traversal on dequeue. Only the start component is visited; ∞ means unreachable at the end.',
      'الـ graph undirected ومن غير weights. بنفحص الـ neighbors من A لـ H، وبنعلّم الـ node discovered وقت الـ enqueue، وبنسجّل الزيارة وقت الـ dequeue. بنزور بس الـ component بتاع الـ start، و ∞ في الآخر يعني مش هنقدر نوصلها.'),
    code,
    keySteps: ['ready', 'seed', 'dequeue', 'discovery-check', 'discover', 'done'],
    view: {
      nodeBadge: 'bfs-distance', hideRows: ['bfs-current'], hideCollections: true,
      legend: [
        { tone: 'active', role: 'current', label: message('Current', 'الـ node الحالية') },
        { tone: 'found', role: 'waiting', label: message('In the queue', 'في الـ queue') },
        { tone: 'sorted', role: 'done', label: message('Done', 'خلصت') },
        { tone: 'pivot', role: 'peek' },
        { badge: true, label: message('Edges from start', 'عدد الـ edges من الـ start') },
      ],
    },
    fields: [
      { name: 'graph', type: 'textarea', maxLength: MAX_GRAPH_LENGTH,
        label: message('Graph · undirected edges', 'الـ graph · undirected edges'),
        help: message('Write A-B for an edge, or D to include a node without an edge. Separate entries with commas, semicolons or newlines. Labels A–H; up to 8 nodes and 20 edges. Spaces around - and repeated node declarations are allowed. A-A is a self-loop; duplicate edges (including B-A after A-B) are rejected. Blank means empty.',
          'اكتب A-B عشان edge، أو D عشان تضيف node من غير edges. افصل بـ comma أو semicolon أو سطر جديد. الأسماء من A لـ H، ولحد 8 nodes و 20 edge. عادي تحط مسافات حوالين الـ -، وعادي تكرّر اسم الـ node. A-A يبقى self-loop. الـ edge المكرّر مرفوض، حتى لو كتبت B-A بعد A-B. لو سبته فاضي يبقى graph فاضي.') },
      { name: 'start', type: 'text', maxLength: MAX_START_LENGTH,
        label: message('Start node', 'الـ start node'),
        help: message('One uppercase letter A–H that occurs in the graph. For an empty graph, leave this blank too.',
          'حرف capital واحد من A لـ H، ولازم يكون موجود في الـ graph. لو الـ graph فاضي، سيب ده فاضي برضه.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Two routes to one node', 'node نقدر نوصلها من طريقين'), input: { ...defaults } },
      { id: 'cycle', label: message('Cycle and a tail', 'cycle وطالع منه edge'), input: { graph: 'A-B, B-C, C-A, C-D', start: 'A' } },
      { id: 'disconnected', label: message('Disconnected components', 'components مش متصلة ببعض'), input: { graph: 'A-B, A-C, D-E, F', start: 'A' } },
      { id: 'singleton', label: message('One isolated node', 'node واحدة لوحدها'), input: { graph: 'C', start: 'C' } },
      { id: 'self-loop', label: message('A self-loop', 'self-loop'), input: { graph: 'A-A, A-B', start: 'A' } },
      { id: 'wide', label: message('A wide frontier', 'level واحد واسع'), input: { graph: 'A-B, A-C, A-D, A-E, A-F, A-G, A-H', start: 'A' } },
      { id: 'empty', label: message('Empty graph', 'graph فاضي'), input: { graph: '', start: '' } },
    ],
    parse, build,
    summary(input) {
      const graph = validate(input);
      return graph.nodes.length ? message(`${graph.nodes.length} nodes · ${graph.edges.length} undirected edges · start ${graph.start} · A–H neighbor order`,
        `${graph.nodes.length} nodes · ${graph.edges.length} undirected edges · الـ start ${graph.start} · الـ neighbors بترتيب A لـ H`) :
        message('Empty graph · no start node', 'graph فاضي · مفيش start node');
    },
    theory: {
      idea: message('Explore the graph in waves: first the start node, then all of its neighbors, then their neighbors. A queue keeps nodes in the order they were discovered.',
        'بنمشي في الـ graph موجة موجة: الأول الـ start node، بعدين كل الـ neighbors بتوعها، بعدين الـ neighbors بتوعهم. الـ queue بتطلّع الـ nodes بنفس الترتيب اللي اكتشفناها بيه.'),
      title: message('Why a queue finds the shortest route', 'ليه الـ queue بتوصّلنا لأقصر path؟'),
      intro: message('BFS explores by distance from one start. You need an unweighted graph, adjacency lists, a FIFO queue and a discovered set. This lesson uses undirected edges; each edge costs one step.',
        'الـ BFS بيمشي في الـ graph حسب البعد عن start واحدة. محتاج graph من غير weights، و adjacency lists، و FIFO queue، و discovered set. في الدرس ده الـ edges undirected، وكل edge بخطوة واحدة.'),
      invariant: message('At each queue check, every discovered node is either pending in the queue exactly once or fully processed. Queue distances never decrease from front to back. Each discovered distance is already the shortest edge count from start.',
        'كل مرة بنفحص الـ queue، أي node discovered يا إمّا مستنية فيها مرة واحدة بالظبط، يا إمّا بقت processed. الـ distances من الـ front للـ back عمرها ما بتقلّ. والـ distance بتاعة أي node discovered هي فعلًا أقل عدد edges من الـ start.'),
      steps: [
        { title: message('1. Seed level zero', '1. بنبدأ من level 0'),
          body: message('Initialize every distance to ∞. Give start distance zero and enqueue it while marking it discovered. For an empty graph, return empty results before enqueueing.',
            'كل الـ distances بتبدأ ∞. الـ start بناخد الـ distance بتاعتها 0، ونعمل لها enqueue ونعلّمها discovered في نفس الوقت. لو الـ graph فاضي، بنعمل return لنتيجة فاضية قبل أي enqueue.') },
        { title: message('2. Expand the oldest discovery', '2. بنكمّل من أقدم node اكتشفناها'),
          body: message('Dequeue the front, record its visit, then examine its neighbors alphabetically. For an undiscovered neighbor, save parent and distance[current] + 1, mark it discovered and enqueue it together. Mark current processed after its last neighbor.',
            'بنعمل dequeue للـ front، ونسجّل زيارتها، ونفحص الـ neighbors بتوعها بالترتيب الأبجدي. لو الـ neighbor مش discovered، بنحفظ الـ parent و distance[current] + 1، ونعلّمه discovered ونعمل له enqueue في نفس الخطوة. بعد آخر neighbor بنعلّم current إنها processed.') },
        { title: message('3. Why the first distance is shortest', '3. ليه أول distance هي الأقصر؟'),
          body: message('FIFO processes all nodes at distance d before any at d + 1. A newly discovered neighbor therefore has distance d + 1; a shorter route would have discovered it from an earlier level already. Marking on enqueue prevents two parents or a cycle from adding it twice.',
            'الـ FIFO بيخلّص كل الـ nodes اللي على distance d قبل أي node على d + 1. يبقى أي neighbor جديد الـ distance بتاعته d + 1. لو كان فيه path أقصر، كنا اكتشفناه من level قبله. وعشان بنعلّم وقت الـ enqueue، مفيش parent تاني ولا cycle يقدر يدخّله الـ queue مرتين.') },
        { title: message('4. Stop at the component boundary', '4. بنقف عند حدود الـ component'),
          body: message('Each reachable node enters the queue once, so the finite queue eventually empties. Every processed node has all its neighbors discovered, so no reachable node can remain unseen. Nodes in other components retain ∞ and no parent.',
            'كل node نقدر نوصلها بتدخل الـ queue مرة واحدة بس، فالـ queue في الآخر هتفضى. وكل node processed الـ neighbors بتوعها كلهم discovered، فمفيش node نقدر نوصلها تفوتنا. الـ nodes اللي في components تانية بتفضل الـ distance بتاعتها ∞ ومن غير parent.') },
      ],
      notes: [
        message('Traversal order means dequeue order. Discovered means enqueued at least once; processed means all neighbors examined. Parent links describe one shortest-path tree, not every possible shortest route.',
          'ترتيب الزيارة هو ترتيب الـ dequeue. Discovered يعني دخلت الـ queue مرة على الأقل، و processed يعني فحصنا كل الـ neighbors بتوعها. الـ parent links بترسم shortest-path tree واحدة، مش كل الـ shortest paths الممكنة.'),
        message('Alphabetical neighbor order makes ties deterministic, regardless of input order. Changing that order can change visits and parents, but cannot change shortest distances.',
          'الترتيب الأبجدي للـ neighbors بيحسم التعادل بنفس الطريقة كل مرة، مهما كان ترتيب الـ input. لو غيّرنا الترتيب ده، الزيارات والـ parents ممكن يتغيّروا، بس أقصر distances مش هتتغيّر.'),
        message('With adjacency lists, O(1) FIFO operations and O(1) discovered lookup, BFS takes O(V + E) worst-case time and O(V) extra space. Here all V distances are initialized, but only the reachable component is scanned. An undirected edge is examined once per endpoint; a self-loop once.',
          'لو عندنا adjacency lists، والـ FIFO operations بـ O(1)، والـ lookup في discovered بـ O(1)، يبقى الـ BFS بياخد O(V + E) في الـ worst case، و O(V) space زيادة. هنا بنجهّز الـ V distances كلها، بس بنفحص بس الـ component بتاع الـ start. الـ undirected edge بيتفحص مرة من كل طرف، والـ self-loop مرة واحدة.'),
        message('A broad level can require a large queue. DFS uses a different frontier and does not guarantee shortest paths by first discovery. BFS does not minimize weighted cost; use Dijkstra for nonnegative weights.',
          'لو الـ level واسع، الـ queue ممكن تكبر أوي. الـ DFS بيختار الـ node الجاية بطريقة تانية، ومش بيضمن إن أول ما يكتشف node يبقى لقى أقصر path ليها. الـ BFS مش بيقلّل مجموع الـ weights. لو الـ weights مش سالبة، استخدم Dijkstra.'),
        message('V is all input nodes; E is unique undirected edges.',
          'V عدد كل الـ nodes في الـ input، و E عدد الـ undirected edges من غير تكرار.'),
      ],
      costs: [
        { label: message('Worst-case BFS time', 'وقت الـ BFS في الـ worst case'), value: 'O(V + E)' },
        { label: message('Traversal auxiliary space', 'الـ space الزيادة للـ traversal'), value: 'O(V)' },
        { label: message('Largest possible queue', 'أكبر حجم ممكن للـ queue'), value: 'O(V)' },
        { label: message('Adjacency storage', 'تخزين الـ adjacency lists'), value: 'O(V + E)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons.bfs = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
