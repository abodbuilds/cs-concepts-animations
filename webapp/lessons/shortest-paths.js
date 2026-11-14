(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const display = value => value === Infinity ? '∞' : value == null ? '—' : value;
  // Infinity stays explicit in every JSON-safe snapshot, including the result.
  const copy = value => JSON.parse(JSON.stringify(value, (_, item) => item === Infinity ? '∞' : item));
  const limits = { nodes: 64, graph: 1024, start: 16, target: 16 };
  const code = [
    'dijkstra(nodes, outgoing, start, target):',
    '  dist = {v: ∞}; prev = {v: null}; settled = {}',
    '  if nodes is empty: return empty result',
    '  dist[start] = 0',
    '  while size(settled) < size(nodes):',
    '    u = null; best = ∞',
    '    for v in nodes (A–H order):',
    '      if v not in settled:',
    '        if dist[v] < best:',
    '          u = v; best = dist[v]',
    '    if u == null: break',
    '    add u to settled',
    '    for (v, weight) in outgoing[u] (A–H order):',
    '      candidate = dist[u] + weight',
    '      if candidate < dist[v]:',
    '        dist[v] = candidate',
    '        prev[v] = u',
    '      else: keep dist[v] and prev[v]',
    '  path = null',
    '  if target != null:',
    '    path = []',
    '    if dist[target] != ∞:',
    '      reversePath = []; cursor = target',
    '      while cursor != null:',
    '        append cursor to reversePath',
    '        cursor = prev[cursor]',
    '      path = reverse(reversePath)',
    '  return dist, prev, settled, path',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      fail('Use an object with nodes, edges, start, and optional target.', 'ابعت object فيه nodes وedges وstart، وممكن target.');
    if (!Array.isArray(input.nodes) || input.nodes.length > 8)
      fail('Use at most 8 nodes, named A–H.', 'استخدم بحد أقصى ٨ nodes، بأسامي من A لحد H.');
    const nodes = [];
    for (const node of input.nodes) {
      if (typeof node !== 'string' || !/^[A-H]$/.test(node) || nodes.includes(node))
        fail('Each node must be a distinct uppercase letter A–H.', 'كل node لازم يكون حرف إنجليزي كبير من A لحد H، من غير تكرار.');
      nodes.push(node);
    }
    nodes.sort();
    const nodeSet = new Set(nodes);
    if (!Array.isArray(input.edges) || input.edges.length > 20)
      fail('Use at most 20 directed edges.', 'استخدم بحد أقصى ٢٠ edge موجّه.');
    const edges = [], pairs = new Set();
    for (const edge of input.edges) {
      if (!edge || typeof edge !== 'object' || Array.isArray(edge) ||
          !nodeSet.has(edge.from) || !nodeSet.has(edge.to))
        fail('Every edge endpoint must appear in the node list.', 'طرفين كل edge لازم يكونوا موجودين في قائمة الـ nodes.');
      if (!Number.isSafeInteger(edge.weight) || edge.weight < 0 || edge.weight > 999)
        fail('Dijkstra needs nonnegative weights: use integers from 0 to 999.', 'Dijkstra محتاج أوزان مش سالبة: استخدم أعداد صحيحة من ٠ لحد ٩٩٩.');
      const pair = `${edge.from}-${edge.to}`;
      if (pairs.has(pair))
        fail(`Duplicate edge ${edge.from} → ${edge.to}. Use one weight per directed pair.`, `الـ edge من ${edge.from} لـ ${edge.to} متكرّر. اكتب وزن واحد لكل اتجاه.`);
      pairs.add(pair);
      edges.push({ from: edge.from, to: edge.to, weight: edge.weight });
    }
    // Canonical order without sorting E edges or repeatedly filtering them per node.
    const byPair = new Map(edges.map(edge => [`${edge.from}-${edge.to}`, edge]));
    const orderedEdges = [];
    for (const from of nodes) for (const to of nodes) {
      const edge = byPair.get(`${from}-${to}`);
      if (edge) orderedEdges.push(edge);
    }
    const start = input.start, target = input.target === undefined ? null : input.target;
    if (nodes.length === 0) {
      if (start !== null || target !== null)
        fail('For an empty graph, leave start and target empty (null in build input).', 'لو الجراف فاضي، سيب start وtarget فاضيين (null في build).');
    } else if (!nodeSet.has(start)) {
      fail('Choose a start node from the node list.', 'اختار start موجود في قائمة الـ nodes.');
    }
    if (target !== null && !nodeSet.has(target))
      fail('Choose a target from the node list, or leave it empty.', 'اختار target من قائمة الـ nodes، أو سيبه فاضي.');
    return { nodes, edges: orderedEdges, start, target };
  }

  function parse(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      fail('Enter the graph fields as text.', 'اكتب بيانات الجراف كنص.');
    for (const [name, limit] of Object.entries(limits)) {
      if (typeof raw[name] !== 'string' || raw[name].length > limit)
        fail(`${name} must be text of at most ${limit} characters.`, `${name} لازم يكون نص طوله بحد أقصى ${limit} حرف.`);
    }
    const nodes = raw.nodes.trim() ? raw.nodes.trim().split(/[,\s]+/).filter(Boolean) : [];
    const graph = raw.graph.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    const edges = graph.split(/[;\n]/).map(line => line.trim()).filter(Boolean).map(line => {
      const match = /^([A-H])\s+([A-H])\s+([+-]?\d+)$/.exec(line);
      if (!match)
        fail('Write each edge as A B 4, separated by a newline or semicolon.', 'اكتب كل edge بالشكل A B 4، وافصل بينهم بسطر جديد أو فاصلة منقوطة إنجليزي ;.');
      return { from: match[1], to: match[2], weight: Number(match[3]) };
    });
    return validate({ nodes, edges, start: raw.start.trim() || null, target: raw.target.trim() || null });
  }

  function build(input) {
    const { nodes, edges, start, target } = validate(input);
    // Prepare adjacency once. Every reachable node's outgoing list is processed once.
    const outgoing = Object.fromEntries(nodes.map(node => [node, []]));
    for (const edge of edges) outgoing[edge.from].push(edge);
    const settled = new Set();
    const state = {
      nodes, edges, start, target, initialized: false,
      distances: {}, predecessors: {}, settled: [], frontier: [], unreachable: [],
      current: null, scanNode: null, best: Infinity, activeEdge: null,
      candidate: null, previousDistance: null, condition: null,
      nodeScans: 0, minComparisons: 0, relaxations: 0, improvements: 0,
      distancesComplete: false, path: null, reversePath: [], cursor: null,
      done: false, result: null,
    };
    const frames = [];
    function emit(kind, lines, title, explanation, equation = '') {
      state.frontier = nodes.filter(node => !settled.has(node) && Number.isFinite(state.distances[node]));
      const pathCards = state.path?.length ? state.path : state.reversePath;
      const pathNodes = new Set(state.path || []);
      const pathEdges = new Set((state.path || []).slice(1).map((node, index) => `${state.path[index]}-${node}`));
      const tone = node => {
        if (pathNodes.has(node)) return 'found';
        if (state.scanNode === node || state.activeEdge?.to === node || state.cursor === node) return 'active';
        if (state.current === node && !state.distancesComplete) return 'pivot';
        if (settled.has(node)) return 'sorted';
        return state.distances[node] === Infinity ? 'muted' : 'default';
      };
      const scene = {
        rows: [
          { id: 'distances', label: message('Distance from start', 'المسافة من start'), layout: 'cards',
            cells: nodes.map(node => ({ id: `distance-${node}`, value: display(state.distances[node]), marker: node, tone: tone(node) })) },
          { id: 'predecessors', label: message('Predecessor', 'جينا من أنهي node؟'), layout: 'cards',
            cells: nodes.map(node => ({ id: `predecessor-${node}`, value: display(state.predecessors[node]), marker: node, tone: tone(node) })) },
          { id: 'frontier', label: message('Frontier · finite and unsettled', 'Frontier · وصلناله ولسه مش نهائي'), layout: 'cards',
            cells: state.frontier.map(node => ({ id: `node-${node}`, value: `${node}: ${state.distances[node]}`, tone: tone(node) })) },
          { id: 'settled', label: message('Settled · final distance', 'Settled · المسافة بقت نهائية'), layout: 'cards',
            cells: state.settled.map(node => ({ id: `node-${node}`, value: `${node}: ${state.distances[node]}`, tone: tone(node) })) },
          { id: 'path', label: state.path?.length ? message('Path · start to target', 'المسار · من start لـ target') :
            message('Reconstruction · target backwards', 'بنبني المسار · من target لورا'), layout: 'cards',
            cells: pathCards.map(node => ({ id: `path-${node}`, value: node, tone: 'found' })) },
        ],
        graph: {
          nodes: nodes.map(node => ({ id: node, label: node, tone: tone(node),
            detail: `d=${display(state.distances[node])}; prev=${display(state.predecessors[node])}` })),
          edges: edges.map(edge => {
            const onPath = pathEdges.has(`${edge.from}-${edge.to}`);
            const active = state.activeEdge?.from === edge.from && state.activeEdge?.to === edge.to;
            return { ...edge, directed: true, tone: onPath ? 'found' : active ? 'active' : 'default' };
          }),
        },
        collections: [{ label: message('Unreachable from start · after completion', 'مش ممكن نوصلهم من start · بعد ما نخلّص'), values: state.unreachable }],
        note: state.distancesComplete ?
          message('Distances are final. ∞ means unreachable from start; — means no predecessor.', 'المسافات بقت نهائية. ∞ يعني مش ممكن نوصل من start؛ و— يعني مفيش predecessor.') :
          message('∞ means no route found yet. Frontier order is alphabetical; every minimum uses a linear scan.', '∞ يعني لسه ملاقيناش طريق. الـ frontier بترتيب الحروف؛ كل مرة بندوّر على الأصغر بمسح خطّي.'),
      };
      frames.push(copy({ kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'start', value: start }, { name: 'target', value: target },
          { name: 'u (minimum)', value: state.current }, { name: 'v (scan)', value: state.scanNode },
          { name: 'best', value: display(state.best) }, { name: 'edge.to', value: state.activeEdge?.to ?? null },
          { name: 'candidate', value: state.candidate }, { name: 'previous distance', value: display(state.previousDistance) },
          { name: 'condition', value: state.condition }, { name: 'cursor', value: state.cursor },
        ],
        metrics: [
          { label: message('Node scan visits', 'زيارات المسح'), value: state.nodeScans },
          { label: message('Minimum comparisons', 'مقارنات اختيار الأصغر'), value: state.minComparisons },
          { label: message('Edge relaxations', 'محاولات تحسين المسافة'), value: state.relaxations },
          { label: message('Distance improvements', 'تحسينات المسافة'), value: state.improvements },
          { label: message('Settled nodes', 'Nodes بمسافة نهائية'), value: state.settled.length },
        ], scene }));
    }

    function finish(line) {
      state.distancesComplete = true;
      state.unreachable = nodes.filter(node => state.distances[node] === Infinity);
      state.done = true;
      state.result = { start, target, distances: state.distances, predecessors: state.predecessors,
        settled: state.settled, unreachable: state.unreachable, path: state.path,
        targetDistance: target === null ? null : state.distances[target] };
      const count = state.unreachable.length;
      const explanation = !nodes.length ? message('The graph is empty, so there are no distances or paths to return.', 'الجراف فاضي، فمفيش مسافات أو مسارات نرجّعها.') :
        target === null ? message(`All distances from ${start} are final. ${count} node(s) are unreachable; ∞ is not a finite distance.`, `كل المسافات من ${start} بقت نهائية. عدد الـ nodes اللي مش ممكن نوصلهم: ${count}؛ ∞ مش مسافة محدودة.`) :
        state.distances[target] === Infinity ? message(`There is no directed path from ${start} to ${target}. The target distance is ∞ and the path is empty.`, `مفيش مسار مع اتجاه الأسهم من ${start} لـ ${target}. المسافة ∞ والمسار فاضي.`) :
        message(`The shortest distance to ${target} is ${state.distances[target]}, using ${state.path.length - 1} edge(s). All other source distances are final too.`, `أقصر مسافة لـ ${target} هي ${state.distances[target]}، باستخدام ${state.path.length - 1} edge. وباقي المسافات من start بقت نهائية كمان.`);
      emit('done', [line], message('Shortest paths complete', 'كده خلّصنا أقصر المسارات'), explanation,
        target === null ? 'return distances, predecessors' : `dist[${target}] = ${display(state.distances[target])}`);
    }

    emit('ready', [], message('Dijkstra · choose the cheapest frontier node', 'Dijkstra · نختار أقل مسافة في الـ frontier'),
      message('Follow directed edges with nonnegative weights. Repeatedly scan for a minimum, settle it, and try each outgoing edge.', 'هنمشي مع اتجاه الأسهم وبأوزان مش سالبة. كل مرة ندوّر على أقل مسافة، نثبّتها، ونجرب كل edge خارج منه.'));
    state.distances = Object.fromEntries(nodes.map(node => [node, Infinity]));
    state.predecessors = Object.fromEntries(nodes.map(node => [node, null]));
    state.initialized = true;
    emit('initialize', [2], message('Start with unknown distances', 'نبدأ والمسافات لسه مش معروفة'),
      message('Set each distance to ∞ and each predecessor to null. No node has been settled.', 'نخلّي كل مسافة ∞ وكل predecessor يساوي null. لسه مفيش node مسافته نهائية.'));
    state.condition = nodes.length === 0;
    emit('empty-check', [3], message(state.condition ? 'There are no nodes' : 'The graph has nodes', state.condition ? 'الجراف مفيهوش nodes' : 'الجراف فيه nodes'),
      message(state.condition ? 'Return an empty result without accessing a start node.' : `The graph has ${nodes.length} node(s), so initialize the start distance next.`, state.condition ? 'هنرجّع نتيجة فاضية من غير ما نقرأ start.' : `الجراف فيه ${nodes.length} nodes، فهنحدّد مسافة start دلوقتي.`));
    if (state.condition) { finish(3); return frames; }
    state.distances[start] = 0;
    emit('source', [4], message(`Start at ${start}`, `نبدأ من ${start}`),
      message(`Reaching ${start} from itself costs zero. It is the first finite frontier node.`, `الوصول من ${start} لنفسه تكلفته صفر. ده أول node في الـ frontier بمسافة محدودة.`), `dist[${start}] = 0`);

    while (true) {
      state.scanNode = null; state.activeEdge = null;
      state.candidate = null; state.previousDistance = null;
      state.condition = settled.size < nodes.length;
      emit('loop', [5], message(state.condition ? 'Choose the next minimum' : 'Every node is settled', state.condition ? 'نختار أقل مسافة جديدة' : 'كل المسافات بقت نهائية'),
        message(state.condition ? `${nodes.length - settled.size} node(s) remain unsettled. Scan all nodes to find a finite minimum.` : 'No unsettled nodes remain. Finish the distance phase.', state.condition ? `لسه ${nodes.length - settled.size} nodes مش نهائيين. هنمسح كل الـ nodes عشان نلاقي أقل مسافة محدودة.` : 'مفيش nodes فاضلة. خلّصنا حساب المسافات.'), `${settled.size} < ${nodes.length} → ${state.condition}`);
      if (!state.condition) break;
      state.current = null; state.best = Infinity;
      emit('minimum-reset', [6], message('Reset the minimum', 'نصفّر اختيار الأصغر'),
        message('Begin this linear scan without a chosen node. Only a finite distance can replace ∞.', 'نبدأ المسح من غير node مختار. مسافة محدودة بس هي اللي تقدر تبقى أصغر من ∞.'), 'u = null; best = ∞');
      for (const node of nodes) {
        state.scanNode = node; state.nodeScans++;
        emit('scan', [7], message(`Inspect ${node}`, `نبص على ${node}`),
          message(`Visit ${node} in alphabetical order. This scan visit counts even if the node is settled.`, `بنزور ${node} بترتيب الحروف. الزيارة دي بتتحسب حتى لو مسافته بقت نهائية.`), `v = ${node}`);
        state.condition = !settled.has(node);
        emit('eligibility', [8], message(state.condition ? `${node} is unsettled` : `${node} is already settled`, state.condition ? `${node} لسه مش نهائي` : `${node} مسافته نهائية خلاص`),
          message(state.condition ? 'Compare its distance with the best seen in this scan.' : 'Skip this node: its shortest distance is already final.', state.condition ? 'نقارن مسافته بأقل مسافة شفناها في المسح ده.' : 'نعدّي الـ node ده: أقصر مسافة ليه اتحسمت.'), `${node} ∉ settled → ${state.condition}`);
        if (!state.condition) continue;
        state.condition = state.distances[node] < state.best; state.minComparisons++;
        emit('minimum-compare', [9], message(state.condition ? 'A smaller candidate' : 'Keep the current minimum', state.condition ? 'لقينا مسافة أصغر' : 'نخلّي الاختيار زي ما هو'),
          message(state.condition ? `${node} has a strictly smaller tentative distance, so it becomes the next candidate.` : state.distances[node] === Infinity ? `${node} has no known route yet; ∞ cannot win the minimum scan.` : `${node} is not strictly cheaper. Equal distances keep the alphabetically earlier candidate.`, state.condition ? `${node} مسافته المؤقتة أصغر فعلًا، فهيبقى الاختيار الجديد.` : state.distances[node] === Infinity ? `لسه مفيش طريق معروف لـ ${node}؛ ∞ مش هيفوز باختيار الأصغر.` : `${node} مش أرخص من الاختيار الحالي. لو المسافتين متساويين، نخلّي الحرف اللي جه الأول.`),
          `${display(state.distances[node])} < ${display(state.best)} → ${state.condition}`);
        if (state.condition) {
          state.current = node; state.best = state.distances[node];
          emit('minimum-choice', [10], message(`${node} is the best so far`, `${node} هو الأقل لحد دلوقتي`),
            message(`Save ${node} with distance ${state.best}. Finish the scan before settling it.`, `نحفظ ${node} ومسافته ${state.best}. لازم نكمّل المسح قبل ما نثبّته.`), `u = ${node}; best = ${state.best}`);
        }
      }
      state.scanNode = null; state.condition = state.current === null;
      emit('minimum-check', [11], message(state.condition ? 'No reachable frontier remains' : `The minimum is ${state.current}`, state.condition ? 'مفيش frontier نقدر نوصله' : `أقل مسافة عند ${state.current}`),
        message(state.condition ? 'Every remaining distance is ∞. These nodes are unreachable from start; stop without settling them.' : `The full scan chose ${state.current} at distance ${state.best}. Nonnegative weights make this distance final.`, state.condition ? 'كل المسافات اللي فاضلة ∞. مش ممكن نوصل للـ nodes دي من start؛ نوقف من غير ما نثبّتهم.' : `المسح كله اختار ${state.current} بمسافة ${state.best}. بما إن الأوزان مش سالبة، المسافة دي نهائية.`), `u == null → ${state.condition}`);
      if (state.condition) break;
      const current = state.current;
      settled.add(current); state.settled.push(current);
      emit('settle', [12], message(`Settle ${current}`, `نثبّت مسافة ${current}`),
        message(`The shortest distance to ${current} is ${state.distances[current]}. Now examine its ${outgoing[current].length} outgoing edge(s).`, `أقصر مسافة لـ ${current} هي ${state.distances[current]}. دلوقتي نجرب الـ ${outgoing[current].length} edges اللي خارجين منه.`), `settled.add(${current})`);
      for (const edge of outgoing[current]) {
        state.activeEdge = edge; state.candidate = null; state.previousDistance = state.distances[edge.to];
        emit('edge', [13], message(`Try ${current} → ${edge.to}`, `نجرب ${current} → ${edge.to}`),
          message(`This directed edge has weight ${edge.weight}. Compare a route through ${current} with the recorded distance to ${edge.to}.`, `الـ edge ده وزنه ${edge.weight}. هنقارن طريق بيعدّي على ${current} بالمسافة المسجّلة لـ ${edge.to}.`));
        state.candidate = state.distances[current] + edge.weight;
        emit('candidate', [14], message('Add the edge weight', 'نضيف وزن الـ edge'),
          message(`Reaching ${current} costs ${state.distances[current]}; this edge adds ${edge.weight}.`, `الوصول لـ ${current} تكلفته ${state.distances[current]}، والـ edge بيزود ${edge.weight}.`), `${state.distances[current]} + ${edge.weight} = ${state.candidate}`);
        state.condition = state.candidate < state.distances[edge.to]; state.relaxations++;
        emit('relax-test', [15], message(state.condition ? 'This route is shorter' : 'No improvement', state.condition ? 'الطريق ده أقصر' : 'مفيش تحسين'),
          message(state.condition ? `The route through ${current} improves ${edge.to}; update its distance and predecessor next.` : `This route is not strictly shorter. Keep ${edge.to}'s distance and predecessor, including on a tie.`, state.condition ? `الطريق اللي بيعدّي على ${current} بيحسّن مسافة ${edge.to}؛ هنغيّر المسافة والـ predecessor.` : `الطريق ده مش أقصر فعلًا. نسيب مسافة ${edge.to} والـ predecessor زي ما هم، حتى لو في تعادل.`), `${state.candidate} < ${display(state.distances[edge.to])} → ${state.condition}`);
        if (state.condition) {
          state.distances[edge.to] = state.candidate; state.improvements++;
          emit('distance-update', [16], message(`Improve ${edge.to}'s distance`, `نحسّن مسافة ${edge.to}`),
            message(`Replace ${display(state.previousDistance)} with ${state.candidate}. The next line records how we reached ${edge.to}.`, `نبدّل ${display(state.previousDistance)} بـ ${state.candidate}. السطر الجاي هيسجّل وصلنا لـ ${edge.to} منين.`), `dist[${edge.to}] = ${state.candidate}`);
          state.predecessors[edge.to] = current;
          emit('predecessor-update', [17], message(`Remember ${current} before ${edge.to}`, `نفتكر إن ${current} قبل ${edge.to}`),
            message(`Set ${edge.to}'s predecessor to ${current}. Follow these links backwards later to recover a shortest path.`, `نخلّي predecessor بتاع ${edge.to} هو ${current}. بعدين نمشي ورا الروابط دي بالعكس عشان نرجّع أقصر مسار.`), `prev[${edge.to}] = ${current}`);
        } else {
          emit('keep-distance', [18], message('Keep the recorded route', 'نخلّي الطريق المسجّل'),
            message(`${edge.to} keeps distance ${state.distances[edge.to]}. Equal-cost alternatives do not replace the first predecessor.`, `${edge.to} يفضل بمسافة ${state.distances[edge.to]}. الطريق المساوي في التكلفة مش بيغيّر أول predecessor.`), `dist[${edge.to}] stays ${state.distances[edge.to]}`);
        }
      }
    }
    state.distancesComplete = true;
    state.unreachable = nodes.filter(node => state.distances[node] === Infinity);
    state.path = null;
    emit('path-reset', [19], message('Distances complete', 'خلّصنا المسافات'),
      message('All reachable distances are final. A path is returned only when a target is supplied.', 'كل المسافات اللي نقدر نوصلها بقت نهائية. هنرجّع مسار لو فيه target بس.'), 'path = null');
    state.condition = target !== null;
    emit('target-check', [20], message(state.condition ? `Recover a path to ${target}` : 'Return all source distances', state.condition ? `نرجّع مسار لـ ${target}` : 'نرجّع كل المسافات من start'),
      message(state.condition ? 'Use predecessor links to reconstruct a path, if the target is reachable.' : 'No target was requested; the distance and predecessor tables are the result.', state.condition ? 'هنستخدم الـ predecessors عشان نبني مسار، لو نقدر نوصل لـ target.' : 'مفيش target مطلوب؛ جدول المسافات والـ predecessors هو النتيجة.'), `target != null → ${state.condition}`);
    if (state.condition) {
      state.path = [];
      emit('path-empty', [21], message('Prepare the target path', 'نجهّز مسار target'),
        message('Begin with an empty path. It stays empty when the target is unreachable.', 'نبدأ بمسار فاضي. هيفضل فاضي لو مش ممكن نوصل لـ target.'), 'path = []');
      state.condition = state.distances[target] !== Infinity;
      emit('target-reachable', [22], message(state.condition ? 'The target is reachable' : 'The target is unreachable', state.condition ? 'نقدر نوصل لـ target' : 'مش ممكن نوصل لـ target'),
        message(state.condition ? `${target} has a finite distance, so trace its predecessors backwards.` : `${target} remains at ∞. There is no predecessor chain to reconstruct.`, state.condition ? `مسافة ${target} محدودة، فهنمشي ورا الـ predecessors لورا.` : `مسافة ${target} لسه ∞. مفيش سلسلة predecessors نبني منها مسار.`), `dist[${target}] != ∞ → ${state.condition}`);
      if (state.condition) {
        state.cursor = target; state.reversePath = [];
        emit('path-start', [23], message('Start at the target', 'نبدأ من target'),
          message(`Set cursor to ${target}. Collect nodes backwards, then reverse once.`, `نخلّي cursor عند ${target}. هنجمع الـ nodes من الآخر، وبعدين نعكسهم مرة واحدة.`), `cursor = ${target}`);
        while (true) {
          state.condition = state.cursor !== null;
          emit('path-check', [24], message(state.condition ? 'A predecessor-chain node remains' : 'The chain is complete', state.condition ? 'لسه فيه node في السلسلة' : 'كده السلسلة خلصت'),
            message(state.condition ? `Append ${state.cursor}, then follow its predecessor.` : 'The start has no predecessor. Stop before reading a null node.', state.condition ? `نضيف ${state.cursor}، وبعدين نرجع للـ predecessor بتاعه.` : 'start ملوش predecessor. نوقف قبل ما نقرأ node قيمته null.'), `cursor != null → ${state.condition}`);
          if (!state.condition) break;
          state.reversePath.push(state.cursor);
          emit('path-append', [25], message(`Add ${state.cursor} to the reverse path`, `نضيف ${state.cursor} للمسار العكسي`),
            message('This card keeps its identity when the completed path is reversed.', 'الكارت ده هيحتفظ بهويته لما نعكس المسار بعد ما يكتمل.'), `reversePath.append(${state.cursor})`);
          const previous = state.cursor;
          state.cursor = state.predecessors[previous];
          emit('path-backtrack', [26], message('Follow the predecessor', 'نرجع للـ predecessor'),
            message(state.cursor === null ? `${previous} is the start; its predecessor is null.` : `The chosen route reached ${previous} from ${state.cursor}. Move backwards one edge.`, state.cursor === null ? `${previous} هو start؛ الـ predecessor بتاعه null.` : `الطريق المختار وصل لـ ${previous} من ${state.cursor}. نرجع edge واحد لورا.`), `cursor = prev[${previous}] = ${state.cursor === null ? 'null' : state.cursor}`);
        }
        state.path = [...state.reversePath].reverse();
        emit('path-reverse', [27], message('Turn the path forwards', 'نخلّي المسار من الأول للآخر'),
          message(`Reverse ${state.path.length} card(s) once. The path now runs from ${start} to ${target}.`, `نعكس الـ ${state.path.length} كروت مرة واحدة. كده المسار ماشي من ${start} لـ ${target}.`), 'path = reverse(reversePath)');
      }
    }
    finish(28);
    return frames;
  }

  const defaults = { nodes: 'A B C D E F', graph: 'A B 4\nA C 1\nC B 2\nC D 5\nB D 1\nB E 7\nD E 3\nE B 1', start: 'A', target: 'E' };
  const lesson = {
    id: 'shortest-paths', name: 'Shortest Paths · Dijkstra', theme: 'algorithms', category: 'graph', number: '09',
    label: 'DIJKSTRA · LINEAR MINIMUM', cost: 'O(V² + E)',
    description: message('Find shortest paths from one start node with nonnegative edge weights. Scan for the cheapest frontier node, then relax every outgoing edge.', 'نلاقي أقصر المسارات من start واحد، بأوزان مش سالبة. ندوّر على أقل مسافة في الـ frontier، وبعدين نجرب نحسّن المسافات بكل edge خارج منه.'),
    note: message('Directed graph; alphabetical scans and neighbors. Equal costs keep the first route. All source distances are computed, even with a target.', 'الجراف موجّه؛ المسح والجيران بترتيب الحروف. التكلفة المتساوية بتسيب أول طريق زي ما هو. بنحسب كل المسافات من start حتى لو فيه target.'),
    code,
    keySteps: ['ready', 'source', 'settle', 'candidate', 'distance-update', 'keep-distance', 'path-append', 'path-reverse', 'done'],
    view: {
      nodeBadge: 'distances', treeRow: 'predecessors', hideRows: ['settled'],
      legend: [
        { tone: 'pivot', role: 'current', label: message('Current', 'الحالية') },
        { tone: 'default', role: 'waiting', label: message('Frontier', 'Frontier') },
        { tone: 'sorted', role: 'done', label: message('Final', 'نهائية') },
        { tone: 'active', role: 'peek' },
        { tone: 'found', role: 'path' },
        { badge: true, label: message('Best distance so far', 'أقل مسافة لحد دلوقتي') },
      ],
    },
    fields: [
      { name: 'nodes', label: message('Nodes', 'الـ nodes'), type: 'text', maxLength: limits.nodes,
        help: message('List up to 8 distinct uppercase letters A–H, separated by spaces or commas. Include isolated nodes. Empty graph: clear all four fields.', 'اكتب لحد ٨ حروف إنجليزي كبيرة مختلفة من A لحد H، وافصل بمسافات أو فواصل إنجليزي. ضيف الـ nodes المعزولة. لجراف فاضي: امسح الأربع خانات.') },
      { name: 'graph', label: message('Directed weighted edges', 'Edges موجّهة بأوزان'), type: 'textarea', maxLength: limits.graph,
        help: message('A B 4 means A → B costs 4. One edge per line or semicolon (;), at most 20. Integer weights 0–999 (English/Arabic digits); no negatives or duplicate directed pairs. For both directions, add B A 4. Self-loops are allowed.', 'A B 4 يعني من A لـ B بتكلفة ٤. كل edge في سطر أو افصل بـ ;، بحد أقصى ٢٠. أوزان صحيحة من ٠ لـ ٩٩٩، بأرقام إنجليزي أو عربي؛ من غير سالب أو تكرار نفس الاتجاه. للاتجاهين ضيف B A 4. ممكن edge من node لنفسه.') },
      { name: 'start', label: message('Start', 'البداية'), type: 'text', maxLength: limits.start,
        help: message('One listed node, required unless the graph is empty.', 'حرف واحد من قائمة الـ nodes، ومطلوب إلا لو الجراف فاضي.') },
      { name: 'target', label: message('Target · optional', 'الهدف · اختياري'), type: 'text', maxLength: limits.target,
        help: message('One listed node to reconstruct a path, or leave blank for all source distances only.', 'اختار حرف من القائمة عشان نرجّع مساره، أو سيبه فاضي لو عايز كل المسافات بس.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Cheaper detour + isolated node', 'طريق غير مباشر أرخص + node معزول'), input: { ...defaults } },
      { id: 'ties', label: message('Equal-cost routes', 'طرق بنفس التكلفة'), input: { nodes: 'D C B A', graph: 'A C 1; A B 1; C D 2; B D 2', start: 'A', target: 'D' } },
      { id: 'zero-cycle', label: message('Zero weights + cycle', 'أوزان صفر + دورة'), input: { nodes: 'A B C', graph: 'A B 0; B A 0; B B 0; B C 2; A C 5', start: 'A', target: 'C' } },
      { id: 'unreachable', label: message('Unreachable target', 'هدف مش ممكن نوصله'), input: { nodes: 'A B C D', graph: 'A B 2; C D 1', start: 'A', target: 'D' } },
      { id: 'all-distances', label: message('All source distances', 'كل المسافات من start'), input: { ...defaults, target: '' } },
      { id: 'singleton', label: message('Start is the target', 'البداية هي الهدف'), input: { nodes: 'A', graph: '', start: 'A', target: 'A' } },
      { id: 'no-edges', label: message('Nodes without edges', 'Nodes من غير edges'), input: { nodes: 'A B C', graph: '', start: 'B', target: 'A' } },
      { id: 'empty', label: message('Empty graph', 'جراف فاضي'), input: { nodes: '', graph: '', start: '', target: '' } },
    ],
    parse, build,
    summary(input) {
      const { nodes, edges, start, target } = validate(input);
      return nodes.length ? message(`${nodes.length} nodes · ${edges.length} directed edges · start ${start}${target === null ? ' · all distances' : ` · target ${target}`}`,
        `${nodes.length} nodes · ${edges.length} edges موجّهة · البداية ${start}${target === null ? ' · كل المسافات' : ` · الهدف ${target}`}`) :
        message('Empty graph · no start or target', 'جراف فاضي · مفيش بداية أو هدف');
    },
    theory: {
      idea: message('Always make the closest unfinished node final next, then check whether going through it gives its neighbors a shorter route.',
        'كل مرة ثبّت أقرب node لسه مش نهائية، وبعدين شوف: المرور منها بيدّي جيرانها طريق أقصر ولا لأ؟'),
      title: message('Why can the smallest distance become final?', 'ليه أقل مسافة ممكن تبقى نهائية؟'),
      intro: message('A path cost is the sum of its edge weights. Dijkstra finds shortest paths from one start in a directed graph with nonnegative weights. This lesson accepts integer weights 0–999, at most 8 nodes and 20 edges; it uses a linear minimum scan, not a heap.', 'تكلفة المسار هي مجموع أوزان الـ edges. Dijkstra بيلاقي أقصر المسارات من start واحد في جراف موجّه بأوزان مش سالبة. هنا بنقبل أوزان صحيحة من ٠ لـ ٩٩٩، ولحد ٨ nodes و٢٠ edge؛ وبنختار الأصغر بمسح خطّي، من غير heap.'),
      invariant: message('Every settled distance is final; every finite tentative distance is a discovered path cost. Suppose a shorter route to the chosen minimum existed. Its first unsettled node follows a settled node whose outgoing edge was already relaxed. That unsettled distance would be at most the route prefix, and hence smaller than our minimum because the remaining weights are nonnegative: a contradiction.', 'كل مسافة اتثبّتت نهائية؛ وكل مسافة مؤقتة محدودة جاية من مسار لقيناه. افترض إن فيه طريق أقصر للاختيار الأقل. أول node لسه مؤقت في الطريق ده جاي بعد node نهائي، والـ edge اللي بينهم اتجرّب قبل كده. يبقى مسافة الـ node المؤقت مش أكبر من تكلفة الجزء ده من الطريق، وبالتالي أقل من اختيارنا؛ لأن الأوزان اللي فاضلة مش سالبة. وده يناقض إننا اخترنا الأقل.'),
      steps: [
        { title: message('Initialize the source', 'نجهّز البداية'), body: message('Set all distances to ∞ and predecessors to null, then set start to zero. Know what directed edges and path costs mean before stepping through the trace.', 'نبدأ كل المسافات بـ ∞ والـ predecessors بـ null، ونخلّي start بصفر. قبل التجربة، اعرف معنى اتجاه الـ edge وإزاي بنجمع تكلفة المسار.') },
        { title: message('Scan and settle', 'نمسح ونثبّت'), body: message('Scan every node alphabetically; compare only unsettled distances. Strict < keeps the alphabetically earlier minimum on ties. Settle a finite winner. If none exists, the remaining nodes are unreachable.', 'نمشي على كل الـ nodes بترتيب الحروف، ونقارن بس اللي لسه مش نهائيين. شرط < بيخلّي الحرف اللي جه الأول يكسب التعادل. نثبّت الاختيار لو مسافته محدودة. لو مفيش، الباقي مش ممكن نوصلهم.') },
        { title: message('Relax every outgoing edge', 'نجرب كل edge خارج'), body: message('For u → v, compute candidate = dist[u] + weight. A strict improvement changes dist[v], then prev[v]. Otherwise keep both, including on zero-weight cycles and equal routes. Edges back to settled nodes are still shown and cannot improve them.', 'للـ edge من u لـ v، نحسب candidate = dist[u] + weight. لو أصغر فعلًا، نغيّر dist[v] وبعدين prev[v]. غير كده نسيبهم، حتى مع دورة وزنها صفر أو طرق متساوية. بنعرض كمان الـ edges الراجعة لـ nodes نهائية، ومش هتحسّنها.') },
        { title: message('Recover one shortest path', 'نرجّع مسار واحد من الأقصر'), body: message('After all distances are complete, follow predecessors from the optional target to start. Append backwards, then reverse once in O(V). No target gives path = null; an unreachable target gives []; start as target gives a one-node path costing zero.', 'بعد ما نخلّص كل المسافات، نمشي ورا الـ predecessors من target لحد start لو فيه هدف. نضيف من الآخر، وبعدين نعكس مرة واحدة في O(V). من غير هدف path = null؛ هدف مش ممكن نوصله نتيجته []؛ ولو start هو الهدف، المسار node واحد وتكلفته صفر.') },
      ],
      notes: [
        message('Negative weights are rejected: a later negative edge could invalidate a settled distance. Bellman–Ford is a suitable alternative when negative weights are needed, with negative-cycle checks.', 'بنرفض الأوزان السالبة: edge سالب ييجي بعدين ممكن يبوّظ مسافة ثبّتناها. Bellman–Ford بديل مناسب لو محتاج أوزان سالبة، مع فحص الدورات السالبة.'),
        message('This is single-source shortest paths, not all-pairs. A target adds reconstruction; it does not stop the search early. Every reachable outgoing edge is tested once; edges whose source is unreachable are never visited.', 'دي أقصر مسارات من بداية واحدة، مش بين كل زوج nodes. target بيضيف بناء المسار، ومش بيوقّف البحث بدري. كل edge خارج من node نقدر نوصله بيتجرّب مرة؛ edges اللي مصدرها مش ممكن نوصله مش بنزورها.'),
        message('Linear scans are simple and useful for small or dense graphs. For large sparse graphs, a binary heap with adjacency lists can give O((V + E) log V). If every edge has the same positive cost, BFS is enough.', 'المسح الخطّي بسيط ومناسب للجراف الصغير أو الكثيف. للجراف الكبير اللي edges فيه قليلة، binary heap مع adjacency lists ممكن يدي O((V + E) log V). ولو كل edge له نفس التكلفة الموجبة، BFS يكفي.'),
        message('Node and neighbor order is A–H, independent of input order. Validation and canonical ordering take O(V² + E); adjacency is then built once. Parallel directed edges are rejected; reverse edges and self-loops are allowed. Ties keep the first predecessor, so one shortest path is returned.', 'ترتيب الـ nodes والجيران من A لـ H، مهما كان ترتيب المدخلات. التحقّق وتجهيز الترتيب بياخد O(V² + E)، وبنجهّز قوائم الجيران مرة واحدة. بنرفض تكرار نفس الـ edge في نفس الاتجاه؛ الاتجاه العكسي والـ self-loop مسموحين. التعادل بيسيّب أول predecessor، فبنرجّع مسار أقصر واحد.'),
      ],
      costs: [
        { label: message('Worst-case time · linear scans + edges', 'أسوأ وقت · المسح + الـ edges'), value: 'O(V² + E)' },
        { label: message('Extra algorithm space · excluding graph', 'مساحة الخوارزمية · من غير الجراف'), value: 'O(V)' },
        { label: message('Graph and adjacency storage', 'تخزين الجراف والجيران'), value: 'O(V + E)' },
        { label: message('Optional path reconstruction', 'بناء المسار الاختياري'), value: 'O(V)' },
        { label: message('V = nodes; E = directed edges', 'V عدد الـ nodes؛ E عدد الـ edges الموجّهة'), value: 'V ≤ 8; E ≤ 20' },
      ],
    },
  };
  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
