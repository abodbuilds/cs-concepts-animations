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
      invalid('Use a graph with nodes, edges, and a start node.', 'استخدم graph فيه nodes وedges وstart.');
    }
    if (input.nodes.length > 8 || Array.from(input.nodes).some(node => !isNode(node))) {
      invalid('Use at most 8 nodes, each a single uppercase letter A-H.', 'استخدم لحد ٨ nodes، وكل اسم حرف إنجليزي كبير من A لحد H.');
    }
    if (new Set(input.nodes).size !== input.nodes.length) {
      invalid('Each node must appear once in nodes.', 'كل node لازم يظهر مرة واحدة في nodes.');
    }
    if (input.edges.length > 20) {
      invalid('Use at most 20 undirected edges.', 'استخدم لحد ٢٠ edge من غير اتجاه.');
    }
    const nodes = [...input.nodes].sort();
    const seen = new Set();
    const edges = Array.from(input.edges, edge => {
      if (!isObject(edge) || !isNode(edge.from) || !isNode(edge.to)
        || !nodes.includes(edge.from) || !nodes.includes(edge.to)
        || ('directed' in edge && edge.directed !== false) || 'weight' in edge) {
        invalid('Each edge needs existing from/to nodes A-H, with no direction or weight.', 'كل edge محتاج from وto موجودين من A لحد H، من غير اتجاه أو weight.');
      }
      const id = edgeId(edge.from, edge.to);
      if (seen.has(id)) {
        invalid(`Edge ${id} is repeated; A-B and B-A are the same edge.`, `الـ edge ${id} متكرّر؛ A-B وB-A نفس الـ edge.`);
      }
      seen.add(id);
      const [from, to] = id.split('-');
      return { from, to };
    }).sort((a, b) => edgeId(a.from, a.to) < edgeId(b.from, b.to) ? -1 : 1);
    if (nodes.length === 0 ? input.start !== null : !isNode(input.start) || !nodes.includes(input.start)) {
      invalid('Choose a start node in the graph; use null only for an empty graph.', 'اختار start موجود في الـ graph؛ استخدم null بس لو الـ graph فاضي.');
    }
    return { nodes, edges, start: input.start };
  }

  function parse(rawInput) {
    if (!isObject(rawInput) || typeof rawInput.graph !== 'string' || typeof rawInput.start !== 'string') {
      invalid('Enter graph and start as text.', 'اكتب graph وstart كنص.');
    }
    if (rawInput.graph.length > graphLimit || rawInput.start.length > startLimit) {
      invalid('Keep graph text within 512 characters and start within 16.', 'خلّي نص الـ graph لحد ٥١٢ حرف وstart لحد ١٦ حرف.');
    }
    const nodes = new Set();
    const edges = [];
    const tokens = rawInput.graph.split(/[,;\r\n]+/).map(token => token.trim()).filter(Boolean);
    for (const token of tokens) {
      const match = /^([A-H])(?:\s*-\s*([A-H]))?$/.exec(token);
      if (!match) {
        invalid('Use A-B for an edge or H for an isolated node; separate entries with commas, semicolons, or newlines.', 'اكتب A-B للـ edge أو H لوحده للـ node؛ افصل بفاصلة إنجليزي أو فاصلة منقوطة أو سطر جديد.');
      }
      nodes.add(match[1]);
      if (match[2]) {
        nodes.add(match[2]);
        edges.push({ from: match[1], to: match[2] });
      }
    }
    const start = rawInput.start.trim();
    if (nodes.size === 0 && start !== '') {
      invalid('Leave start blank when the graph is empty.', 'سيب start فاضي لما الـ graph يبقى فاضي.');
    }
    if (nodes.size > 0 && (!isNode(start) || !nodes.has(start))) {
      invalid('Start must be one uppercase letter A-H present in the graph.', 'start لازم يبقى حرف إنجليزي كبير من A لحد H وموجود في الـ graph.');
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
            id: 'dfs-stack', label: message('Call stack · bottom → top', 'Call stack · من القاع للقمة'), layout: 'cards',
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
          { label: message('Discovered', 'اتكتشف'), values: state.discovered },
          { label: message('Finished', 'خلص'), values: state.finished },
        ],
        note: message('Neighbors: A → H. Only the start component is visited.', 'الجيران من A لحد H. بنزور بس الجزء اللي نقدر نوصله من start.'),
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
          { label: message('Discovered nodes', 'Nodes اتكتشفت'), value: state.discovered.length },
          { label: message('Neighbor entries examined', 'جيران اتفحصوا'), value: state.edgeChecks },
          { label: message('Calls returned', 'Calls رجعت'), value: state.returns },
          { label: message('Maximum stack depth', 'أكبر عمق للـ stack'), value: state.maxDepth },
        ],
        scene,
      }));
    }

    emit('ready', [], message('Follow one branch all the way', 'نمشي في فرع لحد آخره'),
      start === null
        ? message('The graph is empty, so there is no starting call. The result will be empty.', 'الـ graph فاضي، فمفيش call نبدأ بيه. النتيجة هتبقى فاضية.')
        : message(`Start at ${start}. Explore the first unseen neighbor alphabetically, then return when a branch is finished.`, `هنبدأ من ${start}. نختار أول جار لسه متشافش بالترتيب الأبجدي، ونرجع لما الفرع يخلص.`));

    state.initialized = true;
    emit('initialize', [2, 3], message('Clear the traversal state', 'نجهّز حالة الزيارة'),
      message('No node has been discovered or finished. The order and parent map start empty.', 'لسه مفيش node اتكتشف أو خلص. order وparent بيبدأوا فاضيين.'),
      'discovered = {}; finished = {}; order = []; parent = {}');
    state.condition = start === null;
    emit('empty-check', [4], message(start === null ? 'There is no start node' : 'A starting node is available', start === null ? 'مفيش start نبدأ منه' : 'عندنا start نبدأ منه'),
      start === null
        ? message('The empty-input guard succeeds. Return without making a recursive call.', 'شرط الـ input الفاضي اتحقّق. هنرجّع النتيجة من غير recursion.')
        : message(`The guard is false because ${start} exists. The next operation calls visit(${start}).`, `الشرط طلع غلط عشان ${start} موجود. الخطوة الجاية هتنادي visit(${start}).`),
      `start is NONE → ${state.condition}`);

    function visit(node, caller) {
      const call = { node, nextIndex: 0, neighbor: null };
      state.stack.push(call);
      state.current = node;
      state.neighbor = null;
      state.condition = null;
      state.activeEdge = caller === null ? null : { from: caller, to: node };
      state.maxDepth = Math.max(state.maxDepth, state.stack.length);
      emit('call', [caller === null ? 6 : 14], message(`Enter visit(${node})`, `ندخل visit(${node})`),
        caller === null
          ? message(`Push the first call for ${node}. It is now active; discovery happens on the next line.`, `نحط أول call لـ ${node} في الـ stack. هو دلوقتي شغّال، والسطر الجاي هيعلّمه إنه اتكتشف.`)
          : message(`Suspend ${caller} and push a call for ${node}. The caller keeps its next-neighbor position.`, `نوقّف ${caller} مؤقتًا ونحط call لـ ${node}. الـ caller فاكر مكان الجار اللي هيكمل منه.`),
        `visit(${node}); depth = ${state.stack.length}`);

      discovered.add(node);
      state.discovered.push(node);
      emit('discover', [9], message(`Discover ${node}`, `اكتشفنا ${node}`),
        message(`Mark ${node} before exploring its edges. A cycle cannot create another call for this node.`, `نعلّم ${node} قبل ما نفحص الـ edges بتاعته. كده أي cycle مش هيعمل call تاني لنفس الـ node.`),
        `discovered.add(${node})`);
      state.order.push(node);
      emit('record', [10], message(`Record ${node}'s arrival`, `نسجّل وصولنا لـ ${node}`),
        message(`Append ${node} at discovery index ${state.order.length - 1}. This is arrival order, not return order.`, `نضيف ${node} في order عند index ${state.order.length - 1}. ده ترتيب الوصول، مش ترتيب الرجوع.`),
        `order[${state.order.length - 1}] = ${node}`);

      for (const neighbor of adjacency[node]) {
        call.neighbor = neighbor;
        call.nextIndex++;
        state.neighbor = neighbor;
        state.activeEdge = { from: node, to: neighbor };
        state.condition = true;
        state.edgeChecks++;
        state.examinedEdges.push({ from: node, to: neighbor });
        emit('examine', [11], message(`Examine ${node} → ${neighbor}`, `نفحص ${node} → ${neighbor}`),
          message(`Take neighbor ${neighbor} at index ${call.nextIndex - 1} in ${node}'s alphabetical adjacency list. The suspended call will resume at index ${call.nextIndex}.`, `ناخد الجار ${neighbor} عند index ${call.nextIndex - 1} في جيران ${node} المترتّبين. لما الـ call يكمل، هيبدأ من index ${call.nextIndex}.`),
          `neighbors(${node})[${call.nextIndex - 1}] = ${neighbor}`);
        state.condition = !discovered.has(neighbor);
        emit(state.condition ? 'unseen' : 'skip', [12],
          message(state.condition ? `${neighbor} is new` : `${neighbor} was already discovered`, state.condition ? `${neighbor} لسه جديد` : `${neighbor} اتكتشف قبل كده`),
          state.condition
            ? message(`${neighbor} has no earlier visit. Save its parent, then explore it before another neighbor of ${node}.`, `${neighbor} لسه متزارش. نسجّل parent بتاعه وبعدين نستكشفه قبل أي جار تاني لـ ${node}.`)
            : message(neighbor === node ? `This self-loop leads back to ${node}, which is already discovered. Skip the recursive call.`
              : `${neighbor} is ${state.finished.includes(neighbor) ? 'finished' : 'still on the call stack'}. Skip this edge's recursive call and continue with ${node}'s next neighbor.`,
            neighbor === node ? `الـ self-loop بيرجّعنا لـ ${node}، وهو اتكتشف خلاص. نعدّي من غير call جديد.`
              : `${neighbor} ${state.finished.includes(neighbor) ? 'خلص خلاص' : 'لسه في الـ call stack'}. نعدّي من غير call جديد ونكمّل مع الجار اللي بعده لـ ${node}.`),
          `${neighbor} not in discovered → ${state.condition}`);
        if (state.condition) {
          state.parent[neighbor] = node;
          state.treeEdges.push({ from: node, to: neighbor });
          emit('parent', [13], message(`${node} becomes ${neighbor}'s parent`, `${node} يبقى parent لـ ${neighbor}`),
            message(`The edge from ${node} first reaches ${neighbor}. Keep it in the DFS tree so the route can be reconstructed.`, `الـ edge من ${node} هو أول طريق وصلنا لـ ${neighbor}. نحفظه في شجرة DFS عشان نقدر نرجّع المسار.`),
            `parent[${neighbor}] = ${node}`);
          visit(neighbor, node);
        }
      }

      state.neighbor = null;
      call.neighbor = null;
      state.activeEdge = null;
      state.condition = false;
      emit('exhausted', [11], message(`${node} has no neighbors left to check`, `خلّصنا فحص جيران ${node}`),
        message(`All ${adjacency[node].length} neighbor entries for ${node} have been examined. The loop ends.`, `فحصنا كل جيران ${node}، وعددهم ${adjacency[node].length}. الحلقة خلصت.`),
        `nextIndex = ${call.nextIndex}; degree(${node}) = ${adjacency[node].length}`);
      state.finished.push(node);
      state.condition = null;
      emit('finish', [15], message(`Finish ${node}`, `${node} خلص`),
        message(`Every neighbor of ${node} is discovered and every child call has returned. Mark this node finished before leaving its call.`, `كل جيران ${node} اتكتشفوا وكل الـ calls اللي خرجت منه رجعت. نعلّمه إنه خلص قبل ما نخرج من الـ call.`),
        `finished.add(${node})`);
      state.stack.pop();
      state.returns++;
      const resumed = state.stack[state.stack.length - 1];
      state.current = resumed ? resumed.node : null;
      state.neighbor = resumed ? resumed.neighbor : null;
      state.activeEdge = resumed ? { from: node, to: resumed.node } : null;
      emit('return', [16], message(resumed ? `Backtrack to ${resumed.node}` : 'Return from the starting call', resumed ? `نرجع لـ ${resumed.node}` : 'نرجع من أول call'),
        resumed
          ? message(`Pop ${node}. Resume ${resumed.node} at neighbor index ${resumed.nextIndex}; do not restart its loop.`, `نشيل ${node} من الـ stack. نكمّل ${resumed.node} من index ${resumed.nextIndex}؛ مش هنعيد الحلقة من الأول.`)
          : message(`Pop ${node}. The call stack is empty, and every node reachable from ${start} has finished.`, `نشيل ${node} من الـ stack. كده فضي، وكل node نقدر نوصلها من ${start} خلصت.`),
        `return; depth = ${state.stack.length}`);
    }

    if (start !== null) visit(start, null);
    state.done = true;
    state.result = [...state.order];
    state.condition = null;
    const unvisited = nodes.length - state.discovered.length;
    emit('done', [start === null ? 5 : 7], message('DFS traversal complete', 'زيارة DFS خلصت'),
      start === null
        ? message('Return an empty discovery order. No nodes, edges, or calls were processed.', 'نرجّع order فاضي. مفيش nodes أو edges أو calls اتعالجت.')
        : message(`Return the discovery order of ${state.order.length} reachable nodes. ${unvisited ? `${unvisited} disconnected node(s) remain unvisited; this traversal does not restart there.` : 'Every node in this graph was reachable from the start.'}`, `نرجّع ترتيب اكتشاف ${state.order.length} nodes وصلنالها. ${unvisited ? `فيه ${unvisited} nodes منفصلين متزاروش؛ مش هنبدأ زيارة جديدة عندهم.` : 'كل nodes في الـ graph ده قدرنا نوصلها من start.'}`),
      'return order');
    return frames;
  }

  const defaults = { graph: 'A-B, A-C, B-D, B-E, C-F, E-G, F-G, H', start: 'A' };
  const lesson = {
    id: 'dfs', name: 'Depth-First Search', category: 'graph', number: '08',
    label: 'DEPTH-FIRST SEARCH', cost: 'O(V + E)',
    description: message('Go deep along one branch, then backtrack. Watch recursive calls build the discovery order.', 'ننزل في فرع لحد آخره وبعدين نرجع. شوف الـ recursive calls وهي بتبني ترتيب الاكتشاف.'),
    note: message('Undirected, unweighted graph. Neighbors run A to H. Only the start component is visited; the result is discovery order.', 'Graph من غير اتجاه أو أوزان. الجيران من A لحد H. بنزور بس الجزء المتصل بـ start، والنتيجة ترتيب الاكتشاف.'),
    code,
    fields: [
      {
        name: 'graph', label: message('Graph edges and isolated nodes', 'Edges الـ graph والـ nodes المنفصلة'), type: 'textarea', maxLength: graphLimit,
        help: message('Write A-B for an undirected edge or H for a node. Separate entries with commas, semicolons, or newlines; spaces around - and empty separators are allowed. Labels A-H; at most 8 nodes and 20 edges. No duplicate edges (A-B equals B-A). Self-loops are allowed and checked once. Leave both fields blank for an empty graph.', 'اكتب A-B للـ edge من غير اتجاه، أو H لوحده للـ node. افصل بفاصلة إنجليزي أو فاصلة منقوطة أو سطر جديد؛ ينفع مسافات حوالين - وفواصل فاضية. الأسماء A-H، بحد أقصى ٨ nodes و٢٠ edge. متكرّرش edge؛ A-B زي B-A. الـ self-loop مسموح وبيتفحص مرة واحدة. سيب الخانتين فاضيين للـ graph الفاضي.'),
      },
      {
        name: 'start', label: message('Start node', 'نبدأ من node'), type: 'text', maxLength: startLimit,
        help: message('One uppercase letter A-H already in the graph. Leave blank only for an empty graph.', 'حرف إنجليزي كبير من A لحد H موجود في الـ graph. سيبه فاضي بس لو الـ graph فاضي.'),
      },
    ],
    defaults: { ...defaults },
    presets: [
      { id: 'default', label: message('Branches, a cycle, and an isolated node', 'فروع وcycle وnode منفصل'), input: { ...defaults } },
      { id: 'branching', label: message('Backtracking between branches', 'الرجوع بين الفروع'), input: { graph: 'A-B, A-C, B-D, B-E, C-F, C-G', start: 'A' } },
      { id: 'cycle', label: message('A cycle stops at discovered nodes', 'Cycle بيقف عند الـ nodes اللي اتكشفت'), input: { graph: 'A-B, B-C, C-A', start: 'A' } },
      { id: 'disconnected', label: message('Start in a disconnected component', 'نبدأ في جزء منفصل'), input: { graph: 'A-B, B-C, D-E, F, H', start: 'D' } },
      { id: 'chain', label: message('Deepest call stack', 'أعمق call stack'), input: { graph: 'A-B, B-C, C-D, D-E, E-F, F-G, G-H', start: 'A' } },
      { id: 'self-loop', label: message('Self-loops need no new call', 'Self-loop من غير call جديد'), input: { graph: 'A-A, A-B, B-B', start: 'A' } },
      { id: 'singleton', label: message('One isolated node', 'Node واحد لوحده'), input: { graph: 'D', start: 'D' } },
      { id: 'empty', label: message('Empty graph', 'Graph فاضي'), input: { graph: '', start: '' } },
    ],
    parse, build,
    summary(input) {
      const { nodes, edges, start } = validate(input);
      return start === null
        ? message('Empty graph · no start · empty traversal', 'Graph فاضي · مفيش start · زيارة فاضية')
        : message(`${nodes.length} nodes · ${edges.length} undirected edges · start ${start} · A–H neighbor order`, `${nodes.length} nodes · ${edges.length} edges من غير اتجاه · البداية ${start} · الجيران من A لحد H`);
    },
    theory: {
      title: message('Depth first, then backtrack', 'ننزل للأعمق وبعدين نرجع'),
      intro: message('DFS explores a graph using recursive calls. Know what a node, an undirected edge, an adjacency list, and a last-in-first-out call stack mean. Each call keeps its position while a child explores deeper.', 'DFS بيستكشف الـ graph بـ recursive calls. محتاج تعرف node وedge من غير اتجاه وadjacency list، وإن آخر call يدخل الـ stack هو أول واحد يخرج. كل call فاكر مكانه لحد ما اللي بعده يخلص.'),
      invariant: message('Each node is marked discovered before any outgoing exploration, so it is called at most once. Active calls form a path from the start; each suspended call remembers its next neighbor. A finished node has examined every neighbor and all its child calls have returned. Following any path from the start therefore discovers every reachable node; no call crosses to a disconnected component.', 'بنعلّم كل node إنه اتكتشف قبل فحص جيرانه، فمش بنناديه مرتين. الـ calls الشغّالة بتكوّن مسار من start، وكل call واقف فاكر الجار الجاي. أي node خلص يبقى فحص كل جيرانه وكل calls اللي خرجت منه رجعت. عشان كده أي مسار من start هنكتشف كل nodes اللي فيه، ومفيش call هيوصل لجزء منفصل.'),
      steps: [
        { title: message('Enter and discover', 'ندخل ونكتشف'), body: message('Push a call, mark its node discovered, and append it to the order. Marking before recursion prevents cycles and self-loops from repeating work.', 'نحط call في الـ stack، ونعلّم الـ node إنه اتكتشف، ونضيفه لـ order. العلامة قبل recursion بتمنع الـ cycles والـ self-loops من تكرار الشغل.') },
        { title: message('Explore one neighbor', 'نستكشف جار واحد'), body: message('Check neighbors alphabetically. If a neighbor is unseen, save its parent and finish that recursive call before checking the next neighbor. Otherwise skip the new call.', 'نفحص الجيران أبجديًا. لو الجار لسه متشافش، نحفظ parent بتاعه ونخلّص الـ recursive call بتاعه قبل الجار اللي بعده. لو اتشاف، نعدّي من غير call جديد.') },
        { title: message('Finish and return', 'نخلّص ونرجع'), body: message('When no neighbor remains, mark the node finished and pop its call. Resume the parent at its saved position. Discovery order and finishing order serve different purposes.', 'لما ميبقاش فيه جار نفحصه، نعلّم الـ node إنه خلص ونشيل الـ call. نكمّل parent من المكان اللي حافظه. ترتيب الاكتشاف وترتيب الانتهاء ليهم استخدامات مختلفة.') },
      ],
      notes: [
        message('Only the start component is traversed. An isolated start is visited once; an empty graph requires no start and returns an empty order. To traverse every component, an outer loop over unseen nodes would be needed.', 'بنزور بس الجزء المتصل بـ start. لو start لوحده هنزوره مرة؛ الـ graph الفاضي ملوش start وبيرجّع order فاضي. عشان نزور كل الأجزاء، هنحتاج حلقة خارجية على الـ nodes اللي لسه متشافتش.'),
        message('The graph is undirected and unweighted. A-B and B-A denote one edge; duplicates are rejected. An ordinary edge is examined from both ends, while a self-loop is stored and examined once. An edge to a discovered node does not always prove a cycle: it may simply lead back to the parent.', 'الـ graph من غير اتجاه أو أوزان. A-B وB-A نفس الـ edge والتكرار مرفوض. الـ edge العادي بيتفحص من الناحيتين، والـ self-loop بيتحفظ ويتفحص مرة. الوصول لـ node اتكتشف مش دايمًا دليل على cycle؛ ممكن يكون مجرد رجوع لـ parent.'),
        message('With adjacency lists already ordered and constant-time discovered-set lookup, the traversal takes O(Vr + Er) for reachable nodes and edges, with O(V + E) as the whole-graph worst case. Input normalization and neighbor sorting happen before traversal; sorting costs O(V log V + E log(E + 1) + Σ deg(v) log(deg(v) + 1)).', 'لو adjacency lists مترتّبة، والبحث في discovered بياخد وقت ثابت، الزيارة بتاخد O(Vr + Er) للـ nodes والـ edges اللي نقدر نوصلها. أسوأ حالة للـ graph كله O(V + E). تجهيز الـ input وترتيب الجيران بيحصل قبل الزيارة؛ الترتيب تكلفته O(V log V + E log(E + 1) + Σ deg(v) log(deg(v) + 1)).'),
        message('The call stack can grow to Vr on a long path. On large graphs recursion may overflow the runtime stack; explicit stack frames with a saved neighbor cursor preserve this exact order. Pushing every neighbor at once with a different marking rule may change the DFS tree.', 'الـ call stack ممكن يوصل لـ Vr في مسار طويل. في graph كبير، recursion ممكن يملا stack البرنامج. نقدر نستخدم stack صريح، وكل frame حافظ مكان الجار الجاي عشان نفس الترتيب يفضل. لو حطّينا كل الجيران مرة واحدة وغيّرنا وقت العلامة، شجرة DFS ممكن تتغيّر.'),
        message('DFS is useful for reachability, maze exploration, and as a building block for other graph algorithms. Its parent tree provides a route, but does not guarantee the fewest edges; BFS does for unweighted graphs. Alphabetical order makes this lesson reproducible, not uniquely correct.', 'DFS مفيد لمعرفة الوصول واستكشاف المتاهات وكجزء من خوارزميات graph تانية. شجرة parent بتدينا مسار، بس مش شرط بأقل عدد edges؛ BFS بيضمن ده في graph من غير أوزان. الترتيب الأبجدي بيخلّي نفس المثال يدي نفس النتيجة، لكنه مش الترتيب الصح الوحيد.'),
        message('The lesson caps input at 8 nodes and 20 edges. Complexity figures describe the algorithm; the teaching trace additionally stores F independent snapshots, using O(F × (V + E)) memory for rewind and playback.', 'الدرس بيقبل لحد ٨ nodes و٢٠ edge. أرقام التعقيد تخص الخوارزمية؛ الشرح بيحفظ كمان F snapshots مستقلين، بذاكرة O(F × (V + E)) عشان نرجع لأي خطوة ونشغّلها.'),
      ],
      costs: [
        { label: message('Worst-case traversal time', 'وقت الزيارة في أسوأ حالة'), value: 'O(V + E)' },
        { label: message('Reachable component time', 'وقت الجزء اللي نقدر نوصله'), value: 'O(Vr + Er)' },
        { label: message('Traversal extra space', 'ذاكرة الزيارة الإضافية'), value: 'O(Vr)' },
        { label: message('Graph representation', 'ذاكرة تمثيل الـ graph'), value: 'O(V + E)' },
        { label: message('Maximum recursion depth', 'أكبر عمق للـ recursion'), value: 'O(Vr)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons.dfs = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
