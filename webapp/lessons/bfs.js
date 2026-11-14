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
        'استخدم graph فيه nodes وedges ونقطة بداية start.');
    }
    if (input.nodes.length > 8 || input.edges.length > 20) {
      fail('Use at most 8 nodes and 20 undirected edges.',
        'استخدم لحد 8 nodes و20 edge من غير اتجاه.');
    }
    const nodes = [...input.nodes];
    if (nodes.some(node => !isNode(node)) || new Set(nodes).size !== nodes.length) {
      fail('Node labels must be distinct single uppercase letters A–H.',
        'اسم كل node لازم يكون حرف إنجليزي كبير واحد من A لـ H، من غير تكرار في nodes.');
    }
    nodes.sort();
    const seen = new Set();
    const edges = Array.from(input.edges, edge => {
      if (!edge || typeof edge !== 'object' || Array.isArray(edge) ||
          Object.keys(edge).some(field => field !== 'from' && field !== 'to') ||
          !isNode(edge.from) || !isNode(edge.to) ||
          !nodes.includes(edge.from) || !nodes.includes(edge.to)) {
        fail('Each edge needs only from and to, both labels present in nodes; no weights or directions.',
          'كل edge فيه from وto بس، والاتنين لازم يكونوا موجودين في nodes؛ مفيش أوزان أو اتجاهات.');
      }
      const id = edgeId(edge.from, edge.to);
      if (seen.has(id)) {
        fail(`Edge ${id} is repeated. A-B and B-A are the same edge.`,
          `الـ edge ${id} متكرّر. A-B وB-A نفس الوصلة.`);
      }
      seen.add(id);
      const [from, to] = id.split('-');
      return { from, to };
    });
    edges.sort((a, b) => edgeId(a.from, a.to) < edgeId(b.from, b.to) ? -1 : 1);
    if (nodes.length === 0 ? input.start !== null : !isNode(input.start) || !nodes.includes(input.start)) {
      fail(nodes.length ? 'Choose a start node that appears in the graph.' : 'Leave start blank for an empty graph (null in build input).',
        nodes.length ? 'اختار start موجودة في الـ graph.' : 'سيب start فاضية لو الـ graph فاضي (null في مدخل build).');
    }
    return { nodes, edges, start: input.start };
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput.graph !== 'string' || typeof rawInput.start !== 'string') {
      fail('Provide graph and start as text fields.', 'اكتب graph وstart كحقول نصية.');
    }
    if (rawInput.graph.length > MAX_GRAPH_LENGTH || rawInput.start.length > MAX_START_LENGTH) {
      fail('Keep graph text within 500 characters and start within 16 characters.',
        'خلّي نص الـ graph لحد 500 حرف، وstart لحد 16 حرف.');
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
            'اكتب A-B لوصلة من غير اتجاه، أو A لـ node لوحدها. افصل بفاصلة إنجليزية أو فاصلة منقوطة أو سطر جديد؛ الأسماء من A لـ H.');
        }
        nodes.add(match[1]);
        if (match[2]) {
          nodes.add(match[2]);
          edges.push({ from: match[1], to: match[2] });
        }
      }
      if (nodes.size === 0) {
        fail('Enter a node or edge, or leave graph completely blank.',
          'اكتب node أو edge، أو سيب graph فاضي خالص.');
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
        { id: 'bfs-queue', label: message('Queue · front → back', 'الطابور · الأول → الآخر'), layout: 'cards',
          cells: state.queue.map((node, index) => ({ id: `bfs-node-${node}`, value: node, index,
            tone: index === 0 ? 'pivot' : 'default',
            marker: index === 0 ? (state.queue.length === 1 ? 'front / back' : 'front') :
              index === state.queue.length - 1 ? 'back' : '' })) },
        { id: 'bfs-current', label: message('Current node', 'الـ node اللي شغّالين عليها'), layout: 'cards',
          cells: current === null ? [] : [{ id: `bfs-node-${current}`, value: current, tone: 'active', marker: 'current' }] },
        { id: 'bfs-order', label: message('Traversal order · on dequeue', 'ترتيب الزيارة · وقت الخروج من الطابور'), layout: 'cards',
          cells: state.order.map((node, index) => ({ id: `bfs-order-${node}`, value: node, index,
            tone: processed.has(node) ? 'sorted' : 'active' })) },
        { id: 'bfs-distance', label: message('Distance / level · number of edges', 'المسافة / المستوى · عدد الوصلات'), layout: 'cards',
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
        { label: message('Discovered · marked on enqueue', 'اتكشفت · بنعلّم عليها وقت الدخول للطابور'), values: state.discovered },
        { label: message('Processed · all neighbors checked', 'خلصت · فحصنا كل جيرانها'), values: state.processed },
        { label: message('Examined edges · scan direction', 'الوصلات اللي فحصناها · اتجاه الفحص'),
          values: state.examinedEdges.map(edge => `${edge.from} → ${edge.to}`) },
      ],
      note: state.done ? message(
        `Finished ${state.order.length} reachable nodes; ${state.nodes.length - state.order.length} unreachable. ∞ means no path from start.`,
        `خلّصنا ${state.order.length} nodes نقدر نوصل لهم؛ و${state.nodes.length - state.order.length} مش متصلين بالبداية. ∞ يعني مفيش طريق من start.`) :
        message('Front leaves first. Discovered means already queued; processed means all neighbors checked. ∞ means not reached yet.',
          'اللي في الأول يخرج الأول. Discovered يعني دخل الطابور؛ processed يعني خلّصنا جيرانه. ∞ يعني لسه موصلناش له.'),
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
          { label: message('Enqueues / discoveries', 'مرات الدخول / الاكتشاف'), value: state.enqueues },
          { label: message('Dequeues', 'مرات الخروج'), value: state.dequeues },
          { label: message('Examined edges', 'وصلات اتفحصت'), value: state.examinedEdges.length },
          { label: message('Already discovered', 'كانت اتكشفت قبل كده'), value: state.skippedEdges },
          { label: message('Largest queue', 'أكبر حجم للطابور'), value: state.maxQueue },
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
        graph.nodes.length ? 'خلّصنا الجزء المتصل بالبداية' : 'الـ graph فاضي، مفيش زيارة'),
      message(graph.nodes.length ?
        `Return the traversal and shortest edge-count distances from ${graph.start}. ${graph.nodes.length - state.order.length} nodes stay unreachable; BFS does not restart elsewhere.` :
        'Return an empty order and empty distance and parent maps. No node was enqueued or examined.',
      graph.nodes.length ?
        `نرجّع ترتيب الزيارة وأقصر مسافات بعدد الوصلات من ${graph.start}. فيه ${graph.nodes.length - state.order.length} nodes مش متصلين بالبداية؛ BFS مش هيبدأ من حتّة تانية.` :
        'نرجّع ترتيب فاضي وخرائط distance وparent فاضية. مدخّلناش أي node للطابور ومفحصناش أي وصلة.'),
      'return order, distance, parent');
      return frames;
    }

    emit('ready', [], message('Explore one level at a time', 'نكتشف مستوى ورا مستوى'),
      message(graph.nodes.length ?
        `Start at ${graph.start}. This undirected, unweighted graph has ${graph.nodes.length} nodes and ${graph.edges.length} edges; only the reachable component will be visited. Neighbors are checked A to H.` :
        'Both input fields are blank. Initialize the empty structures, then return without choosing a start node.',
      graph.nodes.length ?
        `هنبدأ من ${graph.start}. الـ graph من غير اتجاه أو أوزان، فيه ${graph.nodes.length} nodes و${graph.edges.length} وصلات؛ هنزور بس الجزء اللي نقدر نوصل له. بنفحص الجيران من A لـ H.` :
        'حقول المدخلات فاضية. نجهّز البيانات الفاضية ونرجّع النتيجة من غير ما نختار بداية.'));
    state.initialized = true;
    for (const node of graph.nodes) { state.distance[node] = '∞'; state.parent[node] = null; }
    emit('initialize', [2, 3], message('Prepare the queue and distance map', 'نجهّز الطابور وخريطة المسافات'),
      message('The queue, discovered set, processed set and order start empty. Every node starts at ∞ with no parent.',
        'الطابور وdiscovered وprocessed وترتيب الزيارة بيبدأوا فاضيين. مسافة كل node بتبدأ ∞، ومن غير parent.'),
      'distance[*] = ∞; parent[*] = null');
    state.condition = graph.nodes.length === 0;
    emit('empty-check', [4], message(state.condition ? 'There is no start node' : 'There is a graph to explore',
      state.condition ? 'مفيش node نبدأ منها' : 'فيه graph نقدر نكتشفه'),
    message(state.condition ? 'The graph is empty, so take the early return.' : `The graph is nonempty and ${graph.start} is a valid start. Seed the queue next.`,
      state.condition ? 'الـ graph فاضي، فهنرجّع النتيجة دلوقتي.' : `الـ graph مش فاضي و${graph.start} بداية موجودة. الخطوة الجاية ندخّلها الطابور.`),
    `nodes.length == 0 → ${state.condition}`);
    if (state.condition) return finish(5);

    state.condition = null;
    enqueue(graph.start, null, 0);
    emit('seed', [6, 7], message(`Discover ${graph.start} at distance zero`, `نكتشف ${graph.start} على مسافة صفر`),
      message(`Mark ${graph.start} discovered as it enters the queue. The start needs no edge and has no parent.`,
        `نعلّم على ${graph.start} إنها اتكشفت وهي داخلة الطابور. البداية مش محتاجة وصلة، ومفيش ليها parent.`),
      `distance[${graph.start}] = 0; enqueue(${graph.start})`);
    while (true) {
      state.condition = head < fifo.length;
      emit('queue-check', [8], message(state.condition ? 'The frontier still has work' : 'The queue is empty',
        state.condition ? 'لسه فيه شغل في الطابور' : 'الطابور فضي'),
      message(state.condition ? `There are ${fifo.length - head} pending nodes. Take the oldest one next.` :
        'Every discovered node has been processed. Any remaining ∞ node is unreachable from this start.',
      state.condition ? `فيه ${fifo.length - head} nodes مستنيين. هنطلع اللي دخل قبل الباقي.` :
        'كل node اتكشفت خلّصناها. أي node لسه مسافتها ∞ مش ممكن نوصل لها من البداية دي.'),
      `queue.size > 0 → ${state.condition}`);
      if (!state.condition) break;

      state.current = fifo[head++];
      state.dequeues++;
      state.condition = null;
      emit('dequeue', [9], message(`Take ${state.current} from the front`, `نطلّع ${state.current} من أول الطابور`),
        message(`${state.current} is next because it entered first. Its distance ${state.distance[state.current]} is already final.`,
          `الدور على ${state.current} عشان دخل الأول. مسافته ${state.distance[state.current]} محسومة من وقت اكتشافه.`),
        `current = dequeue() = ${state.current}`);
      state.order.push(state.current);
      emit('visit', [10], message(`Record the visit to ${state.current}`, `نسجّل زيارة ${state.current}`),
        message(`This is visit ${state.order.length}. Traversal order records dequeue time; checking this node's neighbors comes next.`,
          `دي الزيارة رقم ${state.order.length}. بنسجّل ترتيب الزيارة وقت الخروج من الطابور؛ بعد كده نفحص جيران الـ node.`),
        `order.append(${state.current})`);

      for (let index = 0; index <= adjacency[state.current].length; index++) {
        state.neighbor = adjacency[state.current][index] ?? null;
        state.activeEdge = null;
        state.condition = state.neighbor !== null;
        emit('neighbor-check', [11], message(state.condition ? `Choose neighbor ${state.neighbor}` : `No neighbors remain for ${state.current}`,
          state.condition ? `نختار الجار ${state.neighbor}` : `مفيش جيران تاني لـ ${state.current}`),
        message(state.condition ? `Choose the next neighbor of ${state.current} in A-to-H order. Being adjacent does not mean it is new.` :
          `All ${adjacency[state.current].length} adjacency entries have been checked. This node can now be marked processed.`,
        state.condition ? `نختار الجار الجاي لـ ${state.current} بترتيب A لـ H. وجود وصلة مش معناه إن الجار لسه جديد.` :
          `فحصنا كل جيران الـ node، وعددهم ${adjacency[state.current].length}. نقدر نعلّم عليها إنها خلصت.`),
        state.condition ? `neighbor = ${state.neighbor}` : 'no next neighbor');
        if (!state.condition) break;

        state.condition = null;
        state.activeEdge = { from: state.current, to: state.neighbor };
        state.examinedEdges.push(state.activeEdge);
        emit('examine', [12], message(`Examine ${state.current} → ${state.neighbor}`, `نفحص ${state.current} → ${state.neighbor}`),
          message('Count this adjacency entry even if its other endpoint was already discovered. The arrow shows the scan direction, not a directed edge.',
            'بنحسب فحص الوصلة حتى لو الطرف التاني اتكشف قبل كده. السهم بيوضّح اتجاه الفحص، مش اتجاه للوصلة.'),
          `examined edges = ${state.examinedEdges.length}`);
        state.condition = !discovered.has(state.neighbor);
        if (!state.condition) state.skippedEdges++;
        emit('discovery-check', [13], message(state.condition ? `${state.neighbor} has not been discovered` : `${state.neighbor} is already discovered`,
          state.condition ? `${state.neighbor} لسه متكشفش` : `${state.neighbor} اتكشف قبل كده`),
        message(state.condition ? `The first route to ${state.neighbor} is through ${state.current}. Assign its level and enqueue it next.` :
          `${state.neighbor} was marked on enqueue, so do not enqueue it again or change its parent or distance. This also handles cycles and self-loops.`,
        state.condition ? `أول طريق لـ ${state.neighbor} جه من ${state.current}. هنحدّد مستواه وندخّله الطابور.` :
          `${state.neighbor} اتعلّم عليه وقت دخوله الطابور، فمش هندخّله تاني ولا نغيّر parent أو المسافة. كده الدورات والوصلة الراجعة لنفس الـ node مش بتكرّر الشغل.`),
        `${state.neighbor} not in discovered → ${state.condition}`);
        if (state.condition) {
          const distance = state.distance[state.current] + 1;
          enqueue(state.neighbor, state.current, distance);
          emit('discover', [14, 15, 16], message(`Enqueue ${state.neighbor} at level ${distance}`, `ندخّل ${state.neighbor} في المستوى ${distance}`),
            message(`One edge from ${state.current} reaches ${state.neighbor}. Save the parent, mark it discovered and append it to the back; FIFO keeps this next level behind the current one.`,
              `وصلة واحدة من ${state.current} توصّلنا لـ ${state.neighbor}. نحفظ parent، ونعلّم إنه اتكشف وندخّله آخر الطابور؛ FIFO بيخلّي المستوى الجاي يستنى بعد الحالي.`),
            `distance[${state.neighbor}] = ${state.distance[state.current]} + 1 = ${distance}; parent = ${state.current}`);
        }
      }
      state.processed.push(state.current);
      state.condition = null;
      emit('processed', [17], message(`Finish processing ${state.current}`, `خلّصنا شغل ${state.current}`),
        message(`Every neighbor of ${state.current} is discovered now. Its adjacency list will not be scanned again.`,
          `كل جيران ${state.current} اتكشفوا دلوقتي. مش هنفحص قائمة جيرانه تاني.`),
        `processed.add(${state.current})`);
    }
    return finish(18);
  }

  const defaults = { graph: 'A-B, A-C, B-D, C-D, D-E, C-F', start: 'A' };
  const lesson = {
    id: 'bfs', name: 'Breadth-First Search', theme: 'algorithms', category: 'graph', number: '07',
    label: 'BREADTH-FIRST SEARCH', cost: 'O(V + E)',
    description: message('A FIFO queue explores the reachable graph one level at a time, finding shortest paths by edge count.',
      'طابور FIFO بيكتشف الجزء المتصل بالبداية مستوى ورا مستوى، وبيجيب أقصر مسافات بعدد الوصلات.'),
    note: message('Undirected and unweighted. Check neighbors A to H, mark discovered on enqueue, and record traversal on dequeue. Only the start component is visited; ∞ means unreachable at the end.',
      'من غير اتجاه أو أوزان. نفحص الجيران من A لـ H، ونعلّم وقت دخول الطابور، ونسجّل الزيارة وقت الخروج. بنزور بس الجزء المتصل بالبداية؛ ∞ في الآخر يعني مش ممكن نوصل له.'),
    code,
    keySteps: ['ready', 'seed', 'dequeue', 'discovery-check', 'discover', 'done'],
    view: {
      nodeBadge: 'bfs-distance', hideRows: ['bfs-current'], hideCollections: true,
      legend: [
        { tone: 'active', role: 'current', label: message('Current', 'الحالية') },
        { tone: 'found', role: 'waiting', label: message('In the queue', 'في الطابور') },
        { tone: 'sorted', role: 'done', label: message('Done', 'خلصت') },
        { tone: 'pivot', role: 'peek' },
        { badge: true, label: message('Edges from start', 'عدد الوصلات من البداية') },
      ],
    },
    fields: [
      { name: 'graph', type: 'textarea', maxLength: MAX_GRAPH_LENGTH,
        label: message('Graph · undirected edges', 'الـ graph · وصلات من غير اتجاه'),
        help: message('Write A-B for an edge, or D to include a node without an edge. Separate entries with commas, semicolons or newlines. Labels A–H; up to 8 nodes and 20 edges. Spaces around - and repeated node declarations are allowed. A-A is a self-loop; duplicate edges (including B-A after A-B) are rejected. Blank means empty.',
          'اكتب A-B لوصلة، أو D عشان تضيف node من غير وصلة. افصل بفاصلة إنجليزية أو فاصلة منقوطة أو سطر جديد. الأسماء A لـ H؛ لحد 8 nodes و20 وصلة. ينفع مسافات حوالين - وتكرار اسم node لوحده. A-A وصلة لنفس الـ node؛ تكرار الوصلة حتى بالعكس مرفوض. الفاضي يعني graph فاضي.') },
      { name: 'start', type: 'text', maxLength: MAX_START_LENGTH,
        label: message('Start node', 'نقطة البداية · start'),
        help: message('One uppercase letter A–H that occurs in the graph. For an empty graph, leave this blank too.',
          'حرف إنجليزي كبير واحد من A لـ H وموجود في الـ graph. لو الـ graph فاضي، سيب الحقل ده فاضي كمان.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Two routes to one node', 'طريقين لنفس الـ node'), input: { ...defaults } },
      { id: 'cycle', label: message('Cycle and a tail', 'دورة ومعاها وصلة'), input: { graph: 'A-B, B-C, C-A, C-D', start: 'A' } },
      { id: 'disconnected', label: message('Disconnected components', 'أجزاء مش متصلة'), input: { graph: 'A-B, A-C, D-E, F', start: 'A' } },
      { id: 'singleton', label: message('One isolated node', 'node واحدة لوحدها'), input: { graph: 'C', start: 'C' } },
      { id: 'self-loop', label: message('A self-loop', 'وصلة راجعة لنفس الـ node'), input: { graph: 'A-A, A-B', start: 'A' } },
      { id: 'wide', label: message('A wide frontier', 'طابور كبير في مستوى واحد'), input: { graph: 'A-B, A-C, A-D, A-E, A-F, A-G, A-H', start: 'A' } },
      { id: 'empty', label: message('Empty graph', 'graph فاضي'), input: { graph: '', start: '' } },
    ],
    parse, build,
    summary(input) {
      const graph = validate(input);
      return graph.nodes.length ? message(`${graph.nodes.length} nodes · ${graph.edges.length} undirected edges · start ${graph.start} · A–H neighbor order`,
        `${graph.nodes.length} nodes · ${graph.edges.length} وصلات من غير اتجاه · البداية ${graph.start} · ترتيب الجيران A لـ H`) :
        message('Empty graph · no start node', 'graph فاضي · مفيش نقطة بداية');
    },
    theory: {
      idea: message('Explore the graph in waves: first the start node, then all of its neighbors, then their neighbors. A queue keeps nodes in the order they were discovered.',
        'استكشف الـ graph موجة موجة: الأول نقطة البداية، بعدين كل جيرانها، بعدين جيران جيرانها. الطابور بيحفظ الـ nodes بترتيب اكتشافها.'),
      title: message('Why a queue finds the shortest route', 'ليه الطابور بيوصل لأقصر طريق؟'),
      intro: message('BFS explores by distance from one start. You need an unweighted graph, adjacency lists, a FIFO queue and a discovered set. This lesson uses undirected edges; each edge costs one step.',
        'BFS بيكتشف الـ graph حسب المسافة من بداية واحدة. محتاج graph من غير أوزان، وقوائم جيران، وطابور FIFO، ومجموعة discovered. هنا الوصلات من غير اتجاه، وكل وصلة بخطوة واحدة.'),
      invariant: message('At each queue check, every discovered node is either pending in the queue exactly once or fully processed. Queue distances never decrease from front to back. Each discovered distance is already the shortest edge count from start.',
        'كل مرة نفحص الطابور، أي node اتكشفت يا إمّا مستنية فيه مرة واحدة، يا إمّا خلّصناها. المسافات من أول الطابور لآخره مبتقلّش. مسافة أي node اتكشفت هي فعلًا أقل عدد وصلات من البداية.'),
      steps: [
        { title: message('1. Seed level zero', '١. نبدأ من المستوى صفر'),
          body: message('Initialize every distance to ∞. Give start distance zero and enqueue it while marking it discovered. For an empty graph, return empty results before enqueueing.',
            'نبدأ كل المسافات بـ ∞. نخلي مسافة start صفر وندخّلها الطابور وإحنا بنعلّم إنها اتكشفت. لو الـ graph فاضي، نرجّع نتيجة فاضية قبل أي دخول للطابور.') },
        { title: message('2. Expand the oldest discovery', '٢. نكمّل من أقدم اكتشاف'),
          body: message('Dequeue the front, record its visit, then examine its neighbors alphabetically. For an undiscovered neighbor, save parent and distance[current] + 1, mark it discovered and enqueue it together. Mark current processed after its last neighbor.',
            'نطلع أول node، ونسجّل زيارتها ونفحص جيرانها بالترتيب الأبجدي. لو الجار جديد، نحفظ parent ومسافته distance[current] + 1، ونعلّم عليه وندخّله الطابور مع بعض. بعد آخر جار نعلّم على current إنها خلصت.') },
        { title: message('3. Why the first distance is shortest', '٣. ليه أول مسافة هي الأقصر؟'),
          body: message('FIFO processes all nodes at distance d before any at d + 1. A newly discovered neighbor therefore has distance d + 1; a shorter route would have discovered it from an earlier level already. Marking on enqueue prevents two parents or a cycle from adding it twice.',
            'FIFO بيخلّص كل nodes على مسافة d قبل أي node على d + 1. يبقى الجار الجديد مسافته d + 1؛ لو فيه طريق أقصر كان اتكشف من مستوى أسبق. التعليم وقت الدخول يمنع طريقين أو دورة إنهم يدخّلوه مرتين.') },
        { title: message('4. Stop at the component boundary', '٤. نقف عند حدود الجزء المتصل'),
          body: message('Each reachable node enters the queue once, so the finite queue eventually empties. Every processed node has all its neighbors discovered, so no reachable node can remain unseen. Nodes in other components retain ∞ and no parent.',
            'كل node نقدر نوصل لها بتدخل مرة واحدة، فالطابور في الآخر هيفضى. كل node خلّصناها جيرانها اتكشفوا، فمفيش node متصلة بالبداية ممكن تفوتنا. اللي في أجزاء تانية تفضل مسافتها ∞ ومن غير parent.') },
      ],
      notes: [
        message('Traversal order means dequeue order. Discovered means enqueued at least once; processed means all neighbors examined. Parent links describe one shortest-path tree, not every possible shortest route.',
          'ترتيب الزيارة بيتسجّل وقت الخروج. Discovered يعني دخل الطابور، وprocessed يعني فحصنا كل جيرانه. روابط parent بترسم شجرة واحدة لأقصر الطرق، مش كل الطرق الممكنة.'),
        message('Alphabetical neighbor order makes ties deterministic, regardless of input order. Changing that order can change visits and parents, but cannot change shortest distances.',
          'الترتيب الأبجدي بيحسم التعادل بنفس الشكل مهما كان ترتيب المدخلات. لو غيّرنا ترتيب الجيران، الزيارات وparent ممكن يتغيّروا، بس أقصر المسافات ثابتة.'),
        message('With adjacency lists, O(1) FIFO operations and O(1) discovered lookup, BFS takes O(V + E) worst-case time and O(V) extra space. Here all V distances are initialized, but only the reachable component is scanned. An undirected edge is examined once per endpoint; a self-loop once.',
          'مع قوائم الجيران، وعمليات FIFO والبحث في discovered بتكلفة O(1)، أسوأ وقت هو O(V + E) والمساحة الإضافية O(V). هنا بنجهّز مسافات كل V، بس بنفحص الجزء المتصل بالبداية. الوصلة بتتفحص من كل طرف مرة؛ وصلة الـ node لنفسها مرة واحدة.'),
        message('A broad level can require a large queue. DFS uses a different frontier and does not guarantee shortest paths by first discovery. BFS does not minimize weighted cost; use Dijkstra for nonnegative weights.',
          'لو المستوى واسع، الطابور ممكن يكبر. DFS بيختار الخطوة الجاية بطريقة تانية ومش بيضمن أقصر مسافة من أول اكتشاف. BFS مش بيقلّل تكلفة الأوزان؛ استخدم Dijkstra للأوزان غير السالبة.'),
        message('V is all input nodes; E is unique undirected edges.',
          'V عدد كل nodes في المدخلات، وE عدد الوصلات من غير تكرار.'),
      ],
      costs: [
        { label: message('Worst-case BFS time', 'أسوأ وقت لـ BFS'), value: 'O(V + E)' },
        { label: message('Traversal auxiliary space', 'مساحة إضافية للتنفيذ'), value: 'O(V)' },
        { label: message('Largest possible queue', 'أكبر طابور ممكن'), value: 'O(V)' },
        { label: message('Adjacency storage', 'تخزين قوائم الجيران'), value: 'O(V + E)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons.bfs = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
