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
      fail('Use an object with nodes, edges, start, and optional target.', 'ابعت object فيه nodes و edges و start، و target لو عايز.');
    if (!Array.isArray(input.nodes) || input.nodes.length > 8)
      fail('Use at most 8 nodes, named A–H.', 'أقصى حاجة 8 nodes، وأساميهم من A لـ H.');
    const nodes = [];
    for (const node of input.nodes) {
      if (typeof node !== 'string' || !/^[A-H]$/.test(node) || nodes.includes(node))
        fail('Each node must be a distinct uppercase letter A–H.', 'كل node لازم تكون حرف capital واحد من A لـ H، ومن غير تكرار.');
      nodes.push(node);
    }
    nodes.sort();
    const nodeSet = new Set(nodes);
    if (!Array.isArray(input.edges) || input.edges.length > 20)
      fail('Use at most 20 directed edges.', 'أقصى حاجة 20 directed edge.');
    const edges = [], pairs = new Set();
    for (const edge of input.edges) {
      if (!edge || typeof edge !== 'object' || Array.isArray(edge) ||
          !nodeSet.has(edge.from) || !nodeSet.has(edge.to))
        fail('Every edge endpoint must appear in the node list.', 'كل edge لازم يبدأ وينتهي عند nodes انت كاتبها.');
      if (!Number.isSafeInteger(edge.weight) || edge.weight < 0 || edge.weight > 999)
        fail('Dijkstra needs nonnegative weights: use integers from 0 to 999.', 'Dijkstra مينفعش معاه weight سالب: استخدم أرقام صحيحة من 0 لـ 999.');
      const pair = `${edge.from}-${edge.to}`;
      if (pairs.has(pair))
        fail(`Duplicate edge ${edge.from} → ${edge.to}. Use one weight per directed pair.`, `الـ edge من ${edge.from} لـ ${edge.to} متكرّر. كل اتجاه ليه weight واحد بس.`);
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
        fail('For an empty graph, leave start and target empty (null in build input).', 'لو الـ graph فاضي، سيب start و target فاضيين (null في الـ build input).');
    } else if (!nodeSet.has(start)) {
      fail('Choose a start node from the node list.', 'اختار start من الـ nodes اللي كتبتها.');
    }
    if (target !== null && !nodeSet.has(target))
      fail('Choose a target from the node list, or leave it empty.', 'اختار target من الـ nodes اللي كتبتها، أو سيبه فاضي.');
    return { nodes, edges: orderedEdges, start, target };
  }

  function parse(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      fail('Enter the graph fields as text.', 'اكتب بيانات الـ graph كـ text.');
    for (const [name, limit] of Object.entries(limits)) {
      if (typeof raw[name] !== 'string' || raw[name].length > limit)
        fail(`${name} must be text of at most ${limit} characters.`, `${name} لازم يكون text، و ${limit} character بالكتير.`);
    }
    const nodes = raw.nodes.trim() ? raw.nodes.trim().split(/[,\s]+/).filter(Boolean) : [];
    const graph = raw.graph.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    const edges = graph.split(/[;\n]/).map(line => line.trim()).filter(Boolean).map(line => {
      const match = /^([A-H])\s+([A-H])\s+([+-]?\d+)$/.exec(line);
      if (!match)
        fail('Write each edge as A B 4, separated by a newline or semicolon.', 'اكتب كل edge بالشكل ده: A B 4، وافصل بينهم بسطر جديد أو ;.');
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
          { id: 'distances', label: message('Distance from start', 'الـ distance من start'), layout: 'cards',
            cells: nodes.map(node => ({ id: `distance-${node}`, value: display(state.distances[node]), marker: node, tone: tone(node) })) },
          { id: 'predecessors', label: message('Predecessor', 'الـ predecessor · جينا منين؟'), layout: 'cards',
            cells: nodes.map(node => ({ id: `predecessor-${node}`, value: display(state.predecessors[node]), marker: node, tone: tone(node) })) },
          { id: 'frontier', label: message('Frontier · finite and unsettled', 'Frontier · وصلنالهم ولسه مش settled'), layout: 'cards',
            cells: state.frontier.map(node => ({ id: `node-${node}`, value: `${node}: ${state.distances[node]}`, tone: tone(node) })) },
          { id: 'settled', label: message('Settled · final distance', 'Settled · الـ distance بقت نهائية'), layout: 'cards',
            cells: state.settled.map(node => ({ id: `node-${node}`, value: `${node}: ${state.distances[node]}`, tone: tone(node) })) },
          { id: 'path', label: state.path?.length ? message('Path · start to target', 'الـ path · من start لـ target') :
            message('Reconstruction · target backwards', 'بنبني الـ path · من target لورا'), layout: 'cards',
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
        collections: [{ label: message('Unreachable from start · after completion', 'مفيش path ليهم من start · بعد ما نخلّص'), values: state.unreachable }],
        note: state.distancesComplete ?
          message('Distances are final. ∞ means unreachable from start; — means no predecessor.', 'الـ distances بقت نهائية. ∞ يعني مفيش path من start، و — يعني مفيش predecessor.') :
          message('∞ means no route found yet. Frontier order is alphabetical; every minimum uses a linear scan.', '∞ يعني لسه ملقيناش path. الـ frontier مترتّب بالحروف، وكل مرة بندوّر على أصغر distance بنلف على الـ nodes كلها.'),
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
          { label: message('Node scan visits', 'مرات الـ scan على الـ nodes'), value: state.nodeScans },
          { label: message('Minimum comparisons', 'مقارنات الـ minimum'), value: state.minComparisons },
          { label: message('Edge relaxations', 'مرات الـ relax'), value: state.relaxations },
          { label: message('Distance improvements', 'مرات الـ distance اتحسّنت'), value: state.improvements },
          { label: message('Settled nodes', 'الـ settled nodes'), value: state.settled.length },
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
      const explanation = !nodes.length ? message('The graph is empty, so there are no distances or paths to return.', 'الـ graph فاضي، يعني مفيش distances ولا paths نرجّعها.') :
        target === null ? message(`All distances from ${start} are final. ${count} node(s) are unreachable; ∞ is not a finite distance.`, `كل الـ distances من ${start} بقت نهائية. عدد الـ nodes اللي مفيش path ليها: ${count}، و ∞ مش distance حقيقية.`) :
        state.distances[target] === Infinity ? message(`There is no directed path from ${start} to ${target}. The target distance is ∞ and the path is empty.`, `مفيش directed path من ${start} لـ ${target}. الـ distance بتاعة ${target} ∞، والـ path فاضي.`) :
        message(`The shortest distance to ${target} is ${state.distances[target]}, using ${state.path.length - 1} edge(s). All other source distances are final too.`, `أقصر distance لـ ${target} هي ${state.distances[target]}، وعدد الـ edges في الـ path: ${state.path.length - 1}. وكل الـ distances التانية من start بقت نهائية برضه.`);
      emit('done', [line], message('Shortest paths complete', 'كده خلّصنا الـ shortest paths'), explanation,
        target === null ? 'return distances, predecessors' : `dist[${target}] = ${display(state.distances[target])}`);
    }

    emit('ready', [], message('Dijkstra · choose the cheapest frontier node', 'Dijkstra · بناخد أرخص node في الـ frontier'),
      message('Follow directed edges with nonnegative weights. Repeatedly scan for a minimum, settle it, and try each outgoing edge.', 'بنمشي مع اتجاه الـ edges، والـ weights مش سالبة. كل مرة بندوّر على أصغر distance، نعملها settle، ونجرّب كل edge خارج منها.'));
    state.distances = Object.fromEntries(nodes.map(node => [node, Infinity]));
    state.predecessors = Object.fromEntries(nodes.map(node => [node, null]));
    state.initialized = true;
    emit('initialize', [2], message('Start with unknown distances', 'لسه مش عارفين أي distance'),
      message('Set each distance to ∞ and each predecessor to null. No node has been settled.', 'كل distance بتبدأ ∞، وكل predecessor بيبدأ null. لسه مفيش node بقت settled.'));
    state.condition = nodes.length === 0;
    emit('empty-check', [3], message(state.condition ? 'There are no nodes' : 'The graph has nodes', state.condition ? 'الـ graph مفيهوش nodes' : 'الـ graph فيه nodes'),
      message(state.condition ? 'Return an empty result without accessing a start node.' : `The graph has ${nodes.length} node(s), so initialize the start distance next.`, state.condition ? 'هنعمل return لنتيجة فاضية، من غير ما نلمس start.' : `الـ graph فيه nodes (عددهم ${nodes.length})، يبقى هنحط الـ distance بتاعة start دلوقتي.`));
    if (state.condition) { finish(3); return frames; }
    state.distances[start] = 0;
    emit('source', [4], message(`Start at ${start}`, `بنبدأ من ${start}`),
      message(`Reaching ${start} from itself costs zero. It is the first finite frontier node.`, `الوصول من ${start} لنفسها بيكلّف 0. دي أول node في الـ frontier ليها distance مش ∞.`), `dist[${start}] = 0`);

    while (true) {
      state.scanNode = null; state.activeEdge = null;
      state.candidate = null; state.previousDistance = null;
      state.condition = settled.size < nodes.length;
      emit('loop', [5], message(state.condition ? 'Choose the next minimum' : 'Every node is settled', state.condition ? 'بندوّر على الـ minimum الجاي' : 'كل الـ nodes بقت settled'),
        message(state.condition ? `${nodes.length - settled.size} node(s) remain unsettled. Scan all nodes to find a finite minimum.` : 'No unsettled nodes remain. Finish the distance phase.', state.condition ? `عدد الـ nodes اللي لسه مش settled: ${nodes.length - settled.size}. هنلف على كل الـ nodes عشان نلاقي أصغر distance مش ∞.` : 'مفيش ولا node لسه مش settled. كده خلّصنا حساب الـ distances.'), `${settled.size} < ${nodes.length} → ${state.condition}`);
      if (!state.condition) break;
      state.current = null; state.best = Infinity;
      emit('minimum-reset', [6], message('Reset the minimum', 'بنصفّر الـ minimum'),
        message('Begin this linear scan without a chosen node. Only a finite distance can replace ∞.', 'بنبدأ الـ scan ومفيش node مختارة. ومفيش غير distance مش ∞ تقدر تاخد مكان الـ ∞.'), 'u = null; best = ∞');
      for (const node of nodes) {
        state.scanNode = node; state.nodeScans++;
        emit('scan', [7], message(`Inspect ${node}`, `بنبص على ${node}`),
          message(`Visit ${node} in alphabetical order. This scan visit counts even if the node is settled.`, `بنزور ${node} بترتيب الحروف. الزيارة دي بتتحسب حتى لو ${node} settled.`), `v = ${node}`);
        state.condition = !settled.has(node);
        emit('eligibility', [8], message(state.condition ? `${node} is unsettled` : `${node} is already settled`, state.condition ? `${node} لسه مش settled` : `${node} settled خلاص`),
          message(state.condition ? 'Compare its distance with the best seen in this scan.' : 'Skip this node: its shortest distance is already final.', state.condition ? 'بنقارن الـ distance بتاعتها بأصغر distance شفناها في الـ scan ده.' : 'هنعدّي الـ node دي: أقصر distance ليها اتحسمت خلاص.'), `${node} ∉ settled → ${state.condition}`);
        if (!state.condition) continue;
        state.condition = state.distances[node] < state.best; state.minComparisons++;
        emit('minimum-compare', [9], message(state.condition ? 'A smaller candidate' : 'Keep the current minimum', state.condition ? 'لقينا candidate أصغر' : 'الـ minimum زي ما هو '),
          message(state.condition ? `${node} has a strictly smaller tentative distance, so it becomes the next candidate.` : state.distances[node] === Infinity ? `${node} has no known route yet; ∞ cannot win the minimum scan.` : `${node} is not strictly cheaper. Equal distances keep the alphabetically earlier candidate.`, state.condition ? `الـ distance المؤقتة بتاعة ${node} أصغر بجد، يبقى ${node} بقت الـ candidate.` : state.distances[node] === Infinity ? `لسه مفيش path معروف لـ ${node}، و ∞ مش هتكسب في الـ minimum scan.` : `${node} مش أرخص بجد. لو الـ distances زي بعض، بنسيب الـ candidate اللي حرفه الأول.`),
          `${display(state.distances[node])} < ${display(state.best)} → ${state.condition}`);
        if (state.condition) {
          state.current = node; state.best = state.distances[node];
          emit('minimum-choice', [10], message(`${node} is the best so far`, `${node} هي الأصغر لحد دلوقتي`),
            message(`Save ${node} with distance ${state.best}. Finish the scan before settling it.`, `بنحفظ ${node} والـ distance بتاعتها ${state.best}. لازم نكمّل الـ scan الأول قبل ما نعملها settle.`), `u = ${node}; best = ${state.best}`);
        }
      }
      state.scanNode = null; state.condition = state.current === null;
      emit('minimum-check', [11], message(state.condition ? 'No reachable frontier remains' : `The minimum is ${state.current}`, state.condition ? 'الـ frontier مفيهوش nodes نقدر نوصلها' : `أصغر distance عند ${state.current}`),
        message(state.condition ? 'Every remaining distance is ∞. These nodes are unreachable from start; stop without settling them.' : `The full scan chose ${state.current} at distance ${state.best}. Nonnegative weights make this distance final.`, state.condition ? 'كل الـ distances اللي فاضلة ∞. الـ nodes دي مفيش path ليها من start، فهنوقف من غير ما نعملها settle.' : `الـ scan كله اختار ${state.current} والـ distance بتاعتها ${state.best}. وطالما الـ weights مش سالبة، الـ distance دي نهائية.`), `u == null → ${state.condition}`);
      if (state.condition) break;
      const current = state.current;
      settled.add(current); state.settled.push(current);
      emit('settle', [12], message(`Settle ${current}`, `بنعمل settle لـ ${current}`),
        message(`The shortest distance to ${current} is ${state.distances[current]}. Now examine its ${outgoing[current].length} outgoing edge(s).`, `أقصر distance لـ ${current} هي ${state.distances[current]}. دلوقتي هنجرّب الـ edges اللي خارجة منها، وعددهم ${outgoing[current].length}.`), `settled.add(${current})`);
      for (const edge of outgoing[current]) {
        state.activeEdge = edge; state.candidate = null; state.previousDistance = state.distances[edge.to];
        emit('edge', [13], message(`Try ${current} → ${edge.to}`, `بنجرّب ${current} → ${edge.to}`),
          message(`This directed edge has weight ${edge.weight}. Compare a route through ${current} with the recorded distance to ${edge.to}.`, `الـ edge ده الـ weight بتاعه ${edge.weight}. هنقارن الـ path اللي معدّي على ${current} بالـ distance المتسجّلة لـ ${edge.to}.`));
        state.candidate = state.distances[current] + edge.weight;
        emit('candidate', [14], message('Add the edge weight', 'بنزوّد الـ weight بتاع الـ edge'),
          message(`Reaching ${current} costs ${state.distances[current]}; this edge adds ${edge.weight}.`, `الوصول لـ ${current} بيكلّف ${state.distances[current]}، والـ edge ده بيزوّد ${edge.weight}.`), `${state.distances[current]} + ${edge.weight} = ${state.candidate}`);
        state.condition = state.candidate < state.distances[edge.to]; state.relaxations++;
        emit('relax-test', [15], message(state.condition ? 'This route is shorter' : 'No improvement', state.condition ? 'الـ path ده أقصر' : 'مفيش تحسين'),
          message(state.condition ? `The route through ${current} improves ${edge.to}; update its distance and predecessor next.` : `This route is not strictly shorter. Keep ${edge.to}'s distance and predecessor, including on a tie.`, state.condition ? `الـ path اللي معدّي على ${current} أقصر لـ ${edge.to}، يبقى هنغيّر الـ distance والـ predecessor بتوعها.` : `الـ path ده مش أقصر بجد. ${edge.to} هتفضل بنفس الـ distance والـ predecessor، حتى لو فيه تعادل.`), `${state.candidate} < ${display(state.distances[edge.to])} → ${state.condition}`);
        if (state.condition) {
          state.distances[edge.to] = state.candidate; state.improvements++;
          emit('distance-update', [16], message(`Improve ${edge.to}'s distance`, `بنحسّن الـ distance بتاعة ${edge.to}`),
            message(`Replace ${display(state.previousDistance)} with ${state.candidate}. The next line records how we reached ${edge.to}.`, `بنشيل ${display(state.previousDistance)} ونحط ${state.candidate}. السطر الجاي هيسجّل جينا لـ ${edge.to} منين.`), `dist[${edge.to}] = ${state.candidate}`);
          state.predecessors[edge.to] = current;
          emit('predecessor-update', [17], message(`Remember ${current} before ${edge.to}`, `بنسجّل إن ${current} قبل ${edge.to}`),
            message(`Set ${edge.to}'s predecessor to ${current}. Follow these links backwards later to recover a shortest path.`, `الـ predecessor بتاع ${edge.to} بقى ${current}. بعدين هنمشي ورا الـ predecessors دي بالعكس عشان نطلّع أقصر path.`), `prev[${edge.to}] = ${current}`);
        } else {
          emit('keep-distance', [18], message('Keep the recorded route', 'بنسيب الـ path المتسجّل زي ما هو '),
            message(`${edge.to} keeps distance ${state.distances[edge.to]}. Equal-cost alternatives do not replace the first predecessor.`, `${edge.to} هتفضل الـ distance بتاعتها ${state.distances[edge.to]}. الـ path اللي بنفس التكلفة مش بيغيّر أول predecessor.`), `dist[${edge.to}] stays ${state.distances[edge.to]}`);
        }
      }
    }
    state.distancesComplete = true;
    state.unreachable = nodes.filter(node => state.distances[node] === Infinity);
    state.path = null;
    emit('path-reset', [19], message('Distances complete', 'الـ distances خلصت'),
      message('All reachable distances are final. A path is returned only when a target is supplied.', 'كل الـ distances اللي نقدر نوصلها بقت نهائية. هنعمل return لـ path بس لو فيه target.'), 'path = null');
    state.condition = target !== null;
    emit('target-check', [20], message(state.condition ? `Recover a path to ${target}` : 'Return all source distances', state.condition ? `هنطلّع الـ path لـ ${target}` : 'هنعمل return لكل الـ distances من start'),
      message(state.condition ? 'Use predecessor links to reconstruct a path, if the target is reachable.' : 'No target was requested; the distance and predecessor tables are the result.', state.condition ? 'هنستخدم الـ predecessors عشان نبني الـ path، لو نقدر نوصل لـ target.' : 'مفيش target، يعني النتيجة هي جدول الـ distances والـ predecessors.'), `target != null → ${state.condition}`);
    if (state.condition) {
      state.path = [];
      emit('path-empty', [21], message('Prepare the target path', 'بنجهّز الـ path بتاع target'),
        message('Begin with an empty path. It stays empty when the target is unreachable.', 'بنبدأ بـ path فاضي. هيفضل فاضي لو مفيش path لـ target.'), 'path = []');
      state.condition = state.distances[target] !== Infinity;
      emit('target-reachable', [22], message(state.condition ? 'The target is reachable' : 'The target is unreachable', state.condition ? 'نقدر نوصل لـ target' : 'target مفيش path ليها'),
        message(state.condition ? `${target} has a finite distance, so trace its predecessors backwards.` : `${target} remains at ∞. There is no predecessor chain to reconstruct.`, state.condition ? `الـ distance بتاعة ${target} مش ∞، يبقى هنمشي ورا الـ predecessors بتوعها لورا.` : `${target} لسه ∞. مفيش predecessors نبني منهم path.`), `dist[${target}] != ∞ → ${state.condition}`);
      if (state.condition) {
        state.cursor = target; state.reversePath = [];
        emit('path-start', [23], message('Start at the target', 'بنبدأ من target'),
          message(`Set cursor to ${target}. Collect nodes backwards, then reverse once.`, `بنخلّي cursor = ${target}. هنجمع الـ nodes بالعكس، وبعدين نعمل reverse مرة واحدة.`), `cursor = ${target}`);
        while (true) {
          state.condition = state.cursor !== null;
          emit('path-check', [24], message(state.condition ? 'A predecessor-chain node remains' : 'The chain is complete', state.condition ? 'لسه فيه node في سلسلة الـ predecessors' : 'كده السلسلة خلصت'),
            message(state.condition ? `Append ${state.cursor}, then follow its predecessor.` : 'The start has no predecessor. Stop before reading a null node.', state.condition ? `هنضيف ${state.cursor}، وبعدين نروح للـ predecessor بتاعها.` : 'start ملهاش predecessor. بنقف قبل ما نقرا node قيمتها null.'), `cursor != null → ${state.condition}`);
          if (!state.condition) break;
          state.reversePath.push(state.cursor);
          emit('path-append', [25], message(`Add ${state.cursor} to the reverse path`, `بنعمل append لـ ${state.cursor} في reversePath`),
            message('This card keeps its identity when the completed path is reversed.', 'لما الـ path يكمل هنعمل reverse، والـ node دي هتروح مكانها الصح.'), `reversePath.append(${state.cursor})`);
          const previous = state.cursor;
          state.cursor = state.predecessors[previous];
          emit('path-backtrack', [26], message('Follow the predecessor', 'بنرجع للـ predecessor'),
            message(state.cursor === null ? `${previous} is the start; its predecessor is null.` : `The chosen route reached ${previous} from ${state.cursor}. Move backwards one edge.`, state.cursor === null ? `${previous} هي start، والـ predecessor بتاعها null.` : `الـ path اللي اخترناه وصل لـ ${previous} من ${state.cursor}. بنرجع edge واحد لورا.`), `cursor = prev[${previous}] = ${state.cursor === null ? 'null' : state.cursor}`);
        }
        state.path = [...state.reversePath].reverse();
        emit('path-reverse', [27], message('Turn the path forwards', 'بنعمل reverse للـ path'),
          message(`Reverse ${state.path.length} card(s) once. The path now runs from ${start} to ${target}.`, `بنعمل reverse للـ path كله مرة واحدة (${state.path.length} nodes). دلوقتي الـ path ماشي من ${start} لـ ${target}.`), 'path = reverse(reversePath)');
      }
    }
    finish(28);
    return frames;
  }

  const defaults = { nodes: 'A B C D E F', graph: 'A B 4\nA C 1\nC B 2\nC D 5\nB D 1\nB E 7\nD E 3\nE B 1', start: 'A', target: 'E' };
  const lesson = {
    id: 'shortest-paths', name: 'Shortest Paths · Dijkstra', theme: 'algorithms', category: 'graph', number: '09',
    label: 'DIJKSTRA · LINEAR MINIMUM', cost: 'O(V² + E)',
    description: message('Find shortest paths from one start node with nonnegative edge weights. Scan for the cheapest frontier node, then relax every outgoing edge.', 'بنلاقي أقصر الـ paths من start واحد، والـ weights مش سالبة. كل مرة بناخد أرخص node في الـ frontier، وبعدين نعمل relax لكل edge خارج منها.'),
    note: message('Directed graph; alphabetical scans and neighbors. Equal costs keep the first route. All source distances are computed, even with a target.', 'الـ graph هنا directed، والـ scan والـ neighbors بترتيب الحروف. لو فيه path بنفس التكلفة، بنسيب أول path زي ما هو. وبنحسب كل الـ distances من start حتى لو فيه target.'),
    code,
    keySteps: ['ready', 'source', 'settle', 'candidate', 'distance-update', 'keep-distance', 'path-append', 'path-reverse', 'done'],
    view: {
      nodeBadge: 'distances', treeRow: 'predecessors', hideRows: ['settled'],
      legend: [
        { tone: 'pivot', role: 'current', label: message('Current', 'الـ node الحالية') },
        { tone: 'default', role: 'waiting', label: message('Frontier', 'Frontier') },
        { tone: 'sorted', role: 'done', label: message('Final', 'Settled') },
        { tone: 'active', role: 'peek' },
        { tone: 'found', role: 'path' },
        { badge: true, label: message('Best distance so far', 'أصغر distance لحد دلوقتي') },
      ],
    },
    fields: [
      { name: 'nodes', label: message('Nodes', 'الـ nodes'), type: 'text', maxLength: limits.nodes,
        help: message('List up to 8 distinct uppercase letters A–H, separated by spaces or commas. Include isolated nodes. Empty graph: clear all four fields.', 'اكتب لحد 8 حروف capital مختلفة من A لـ H، وافصل بينهم بمسافة أو comma. اكتب كمان الـ nodes اللي ملهاش edges. عشان graph فاضي: امسح الأربع خانات.') },
      { name: 'graph', label: message('Directed weighted edges', 'الـ directed edges والـ weights'), type: 'textarea', maxLength: limits.graph,
        help: message('A B 4 means A → B costs 4. One edge per line or semicolon (;), at most 20. Integer weights 0–999 (English/Arabic digits); no negatives or duplicate directed pairs. For both directions, add B A 4. Self-loops are allowed.', 'A B 4 يعني A → B بيكلّف 4. كل edge في سطر أو بينهم ;، و 20 بالكتير. الـ weights أرقام صحيحة من 0 لـ 999 (أرقام إنجليزي أو عربي). مفيش سالب، ومفيش نفس الاتجاه مرتين. عشان الاتجاهين ضيف B A 4. الـ self-loop مسموح.') },
      { name: 'start', label: message('Start', 'الـ start'), type: 'text', maxLength: limits.start,
        help: message('One listed node, required unless the graph is empty.', 'node واحدة من اللي كتبتها، ولازم تكتبها إلا لو الـ graph فاضي.') },
      { name: 'target', label: message('Target · optional', 'الـ target · اختياري'), type: 'text', maxLength: limits.target,
        help: message('One listed node to reconstruct a path, or leave blank for all source distances only.', 'node واحدة من اللي كتبتها عشان نطلّع الـ path بتاعها، أو سيبها فاضية لو عايز الـ distances من start بس.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Cheaper detour + isolated node', 'لفّة أرخص + node معزولة'), input: { ...defaults } },
      { id: 'ties', label: message('Equal-cost routes', 'paths بنفس التكلفة'), input: { nodes: 'D C B A', graph: 'A C 1; A B 1; C D 2; B D 2', start: 'A', target: 'D' } },
      { id: 'zero-cycle', label: message('Zero weights + cycle', 'weights بـ 0 + cycle'), input: { nodes: 'A B C', graph: 'A B 0; B A 0; B B 0; B C 2; A C 5', start: 'A', target: 'C' } },
      { id: 'unreachable', label: message('Unreachable target', 'target مفيش path ليها'), input: { nodes: 'A B C D', graph: 'A B 2; C D 1', start: 'A', target: 'D' } },
      { id: 'all-distances', label: message('All source distances', 'كل الـ distances من start'), input: { ...defaults, target: '' } },
      { id: 'singleton', label: message('Start is the target', 'start هي الـ target'), input: { nodes: 'A', graph: '', start: 'A', target: 'A' } },
      { id: 'no-edges', label: message('Nodes without edges', 'nodes من غير edges'), input: { nodes: 'A B C', graph: '', start: 'B', target: 'A' } },
      { id: 'empty', label: message('Empty graph', 'graph فاضي'), input: { nodes: '', graph: '', start: '', target: '' } },
    ],
    parse, build,
    summary(input) {
      const { nodes, edges, start, target } = validate(input);
      return nodes.length ? message(`${nodes.length} nodes · ${edges.length} directed edges · start ${start}${target === null ? ' · all distances' : ` · target ${target}`}`,
        `${nodes.length} nodes · ${edges.length} directed edges · start ${start}${target === null ? ' · كل الـ distances' : ` · target ${target}`}`) :
        message('Empty graph · no start or target', 'graph فاضي · مفيش start ولا target');
    },
    theory: {
      idea: message('Always make the closest unfinished node final next, then check whether going through it gives its neighbors a shorter route.',
        'كل مرة بنعمل settle لأقرب node لسه مش settled، وبعدين بنشوف: لو عدّينا عليها، الـ neighbors بتوعها هيوصلوا بـ path أقصر ولا لأ؟'),
      title: message('Why can the smallest distance become final?', 'ليه أصغر distance ينفع تبقى نهائية؟'),
      intro: message('A path cost is the sum of its edge weights. Dijkstra finds shortest paths from one start in a directed graph with nonnegative weights. This lesson accepts integer weights 0–999, at most 8 nodes and 20 edges; it uses a linear minimum scan, not a heap.', 'تكلفة الـ path هي مجموع الـ weights بتاعة الـ edges اللي فيه. Dijkstra بيلاقي أقصر الـ paths من start واحد في directed graph، والـ weights مش سالبة. هنا بنقبل weights صحيحة من 0 لـ 999، و 8 nodes و 20 edge بالكتير. وبنختار الـ minimum بـ linear scan، مش بـ heap.'),
      invariant: message('Every settled distance is final; every finite tentative distance is a discovered path cost. Suppose a shorter route to the chosen minimum existed. Its first unsettled node follows a settled node whose outgoing edge was already relaxed. That unsettled distance would be at most the route prefix, and hence smaller than our minimum because the remaining weights are nonnegative: a contradiction.', 'أي distance بقت settled تبقى نهائية، وأي distance مؤقتة مش ∞ هي تكلفة path لقيناه فعلًا. افترض إن فيه path أقصر للـ minimum اللي اخترناه. أول node مش settled في الـ path ده جاية بعد node settled، والـ edge اللي بينهم عملناله relax قبل كده. يبقى الـ distance بتاعة الـ node دي مش أكبر من تكلفة أول جزء من الـ path. وطالما الـ weights اللي باقية مش سالبة، تبقى أصغر من الـ minimum بتاعنا. وده مستحيل، لأننا اخترنا الأصغر.'),
      steps: [
        { title: message('Initialize the source', 'بنجهّز الـ source'), body: message('Set all distances to ∞ and predecessors to null, then set start to zero. Know what directed edges and path costs mean before stepping through the trace.', 'كل الـ distances بتبدأ ∞ والـ predecessors بـ null، وبعدين start بـ 0. قبل ما تمشي في الخطوات، لازم تكون فاهم يعني إيه directed edge وإزاي بنحسب تكلفة الـ path.') },
        { title: message('Scan and settle', 'بنعمل scan و settle'), body: message('Scan every node alphabetically; compare only unsettled distances. Strict < keeps the alphabetically earlier minimum on ties. Settle a finite winner. If none exists, the remaining nodes are unreachable.', 'بنلف على كل الـ nodes بترتيب الحروف، ونقارن الـ distances اللي لسه مش settled بس. وعشان المقارنة < مش <=، الحرف الأول هو اللي بيكسب في التعادل. لو اللي كسب الـ distance بتاعته مش ∞، بنعمله settle. لو مفيش، الـ nodes اللي فاضلة مفيش path ليها.') },
        { title: message('Relax every outgoing edge', 'بنعمل relax لكل edge خارج'), body: message('For u → v, compute candidate = dist[u] + weight. A strict improvement changes dist[v], then prev[v]. Otherwise keep both, including on zero-weight cycles and equal routes. Edges back to settled nodes are still shown and cannot improve them.', 'لكل u → v، بنحسب candidate = dist[u] + weight. لو أصغر بجد، بنغيّر dist[v] وبعدين prev[v]. غير كده بنسيبهم زي ما هم، حتى في cycle الـ weights بتاعتها 0 أو paths متساوية. الـ edges اللي راجعة لـ nodes settled بتظهر برضه، بس مش ممكن تحسّنها.') },
        { title: message('Recover one shortest path', 'بنطلّع shortest path واحد'), body: message('After all distances are complete, follow predecessors from the optional target to start. Append backwards, then reverse once in O(V). No target gives path = null; an unreachable target gives []; start as target gives a one-node path costing zero.', 'بعد ما كل الـ distances تخلص، بنمشي ورا الـ predecessors من الـ target (لو موجود) لحد start. بنضيف بالعكس، وبعدين نعمل reverse مرة واحدة في O(V). من غير target يبقى path = null، و target مفيش path ليها تدّي []، ولو start هي الـ target يبقى الـ path فيه node واحدة وتكلفته 0.') },
      ],
      notes: [
        message('Negative weights are rejected: a later negative edge could invalidate a settled distance. Bellman–Ford is a suitable alternative when negative weights are needed, with negative-cycle checks.', 'الـ weights السالبة مرفوضة: edge سالب نقابله بعدين ممكن يبوّظ distance عملناها settle. لو محتاج weights سالبة، Bellman–Ford بديل كويس، وبيكشف الـ negative cycles.'),
        message('This is single-source shortest paths, not all-pairs. A target adds reconstruction; it does not stop the search early. Every reachable outgoing edge is tested once; edges whose source is unreachable are never visited.', 'ده single-source shortest paths، مش all-pairs. الـ target بيضيف خطوة بناء الـ path بس، ومش بيوقّف الـ search بدري. كل edge خارج من node نقدر نوصلها بنجرّبه مرة واحدة، والـ edges اللي بتبدأ من node مفيش path ليها مش بنعدّي عليها خالص.'),
        message('Linear scans are simple and useful for small or dense graphs. For large sparse graphs, a binary heap with adjacency lists can give O((V + E) log V). If every edge has the same positive cost, BFS is enough.', 'الـ linear scan بسيط وكويس للـ graphs الصغيرة أو الـ dense. في graph كبير و sparse، الـ binary heap مع adjacency lists ممكن يوصّلك لـ O((V + E) log V). ولو كل الـ edges ليها نفس الـ weight الموجب، BFS كفاية.'),
        message('Node and neighbor order is A–H, independent of input order. Validation and canonical ordering take O(V² + E); adjacency is then built once. Parallel directed edges are rejected; reverse edges and self-loops are allowed. Ties keep the first predecessor, so one shortest path is returned.', 'ترتيب الـ nodes والـ neighbors من A لـ H، مهما كان ترتيبك في الـ input. الـ validation وترتيب الـ edges بياخدوا O(V² + E)، وبعدين بنبني الـ adjacency مرة واحدة. مينفعش نفس الـ directed edge يتكرر، بس الاتجاه العكسي والـ self-loops مسموحين. في التعادل بنسيب أول predecessor، فبنرجّع shortest path واحد بس.'),
      ],
      costs: [
        { label: message('Worst-case time · linear scans + edges', 'الـ worst case للوقت · الـ scans + الـ edges'), value: 'O(V² + E)' },
        { label: message('Extra algorithm space · excluding graph', 'مساحة زيادة للـ algorithm · من غير الـ graph'), value: 'O(V)' },
        { label: message('Graph and adjacency storage', 'تخزين الـ graph والـ adjacency'), value: 'O(V + E)' },
        { label: message('Optional path reconstruction', 'بناء الـ path (اختياري)'), value: 'O(V)' },
        { label: message('V = nodes; E = directed edges', 'V عدد الـ nodes، و E عدد الـ directed edges'), value: 'V ≤ 8; E ≤ 20' },
      ],
    },
  };
  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
