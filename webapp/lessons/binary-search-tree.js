(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_NODES = 8;
  const MAX_START = 8;
  const MAX_OPS = 12;
  const MIN_VALUE = -99;
  const MAX_VALUE = 999;
  const MAX_START_LENGTH = 64;
  const MAX_OPS_LENGTH = 240;
  const OPS = ['insert', 'search', 'delete', 'inorder'];
  // Canvas geometry (440×336): neighbouring in-order ranks sit 54px apart, so any two nodes stay ≥ 50px apart.
  const RANK_STEP = 54;
  const CENTER_X = 220;
  const CENTER_Y = 168;
  const LEVEL_SPAN = 270;
  const MAX_LEVEL_GAP = 70;

  const code = [
    'insert(value):',
    '  if root is null: root = Node(value); return',
    '  node = root',
    '  while true:',
    '    if value == node.value: return  # duplicate',
    '    side = value < node.value ? left : right',
    '    if node.side is null:',
    '      node.side = Node(value); return',
    '    node = node.side',
    'search(value):',
    '  node = root',
    '  while node is not null:',
    '    if value == node.value: return node',
    '    if value < node.value: node = node.left',
    '    else: node = node.right',
    '  return null  # not found',
    'inorder(node):',
    '  if node is null: return',
    '  inorder(node.left)',
    '  output(node.value)',
    '  inorder(node.right)',
    'delete(value):',
    '  parent = null; node = root',
    '  while node and node.value != value:',
    '    parent = node',
    '    node = value < node.value ? node.left : node.right',
    '  if node is null: return  # not found',
    '  if node.left and node.right:  # two children',
    '    parent = node; succ = node.right',
    '    while succ.left: parent = succ; succ = succ.left',
    '    node.value = succ.value  # copy the successor',
    '    node = succ  # now remove the successor node',
    '  child = node.left ?? node.right  # null or one',
    '  put child where node was (under parent or as root)',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const isValue = value => Number.isSafeInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE;
  const count = n => `${n} comparison${n === 1 ? '' : 's'}`;
  const opText = op => op.op === 'inorder' ? 'inorder' : `${op.op} ${op.value}`;

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Array.isArray(input.start) || !Array.isArray(input.ops)) {
      fail('Expected an object with start and ops arrays.', 'محتاجين object جواه start وops، والاتنين arrays.');
    }
    if (input.start.length > MAX_START) fail('Start with at most 8 values.', 'ابدأ بـ 8 values بالكتير.');
    if (input.ops.length > MAX_OPS) fail('Use at most 12 operations.', 'اكتب 12 operation بالكتير.');
    const present = new Set();
    for (const value of input.start) {
      if (!isValue(value)) fail('Every value must be an integer from -99 to 999.', 'كل رقم لازم يكون صحيح ومن -99 لحد 999.');
      if (present.has(value)) {
        fail(`Starting values must be distinct; ${value} appears twice.`,
          `الـ values اللي بنبدأ بيها لازم تكون مختلفة، والـ ${value} متكرّر.`);
      }
      present.add(value);
    }
    for (const [index, op] of input.ops.entries()) {
      if (!op || typeof op !== 'object' || Array.isArray(op) || !OPS.includes(op.op)) {
        fail(`Operation ${index + 1} must be insert, search, delete or inorder.`,
          `الـ operation رقم ${index + 1} لازم تكون insert أو search أو delete أو inorder.`);
      }
      if (op.op === 'inorder' ? op.value !== null : !isValue(op.value)) {
        fail(op.op === 'inorder' ? `Operation ${index + 1}: inorder takes no value.` : 'Every value must be an integer from -99 to 999.',
          op.op === 'inorder' ? `الـ operation رقم ${index + 1}: الـ inorder مش بياخد رقم.` : 'كل رقم لازم يكون صحيح ومن -99 لحد 999.');
      }
      // The drawing holds 8 nodes, so scripts that would grow past it are rejected up front.
      if (op.op === 'insert' && !present.has(op.value)) {
        if (present.size >= MAX_NODES) {
          fail(`Operation ${index + 1} (insert ${op.value}) would make 9 nodes. This view draws at most 8, so delete one first or drop an insert.`,
            `الـ operation رقم ${index + 1} (insert ${op.value}) هتخلّي الـ tree فيها 9 nodes. الشاشة بترسم 8 بس، فاعمل delete لواحدة الأول أو شيل insert.`);
        }
        present.add(op.value);
      }
      if (op.op === 'delete') present.delete(op.value);
    }
    return input;
  }

  const normalizeDigits = text => text
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[−–]/g, '-');

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)
      || typeof rawInput.start !== 'string' || typeof rawInput.operations !== 'string') {
      fail('Enter the starting values and the operations as text.', 'اكتب الـ values اللي هنبدأ بيها والـ operations كـ text.');
    }
    if (rawInput.start.length > MAX_START_LENGTH || rawInput.operations.length > MAX_OPS_LENGTH) {
      fail('Keep starting values within 64 characters and operations within 240.',
        'خلّي الـ values في حدود 64 حرف، والـ operations في حدود 240 حرف.');
    }
    const startText = normalizeDigits(rawInput.start).trim();
    if (startText && !/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(startText)) {
      fail('Starting values: integers separated by commas or spaces. Leave blank for an empty tree.',
        'الـ values اللي هنبدأ بيها: أرقام صحيحة وافصل بينها بـ comma أو مسافة. سيبها فاضية لو عايز tree فاضية.');
    }
    const start = startText ? startText.split(/[,،\s]+/).map(Number) : [];
    if (start.length > MAX_START) fail('Start with at most 8 values.', 'ابدأ بـ 8 values بالكتير.');
    const entries = normalizeDigits(rawInput.operations).split(/[,،;؛\n]+/).map(entry => entry.trim()).filter(Boolean);
    if (entries.length > MAX_OPS) fail('Use at most 12 operations.', 'اكتب 12 operation بالكتير.');
    const ops = entries.map((entry, index) => {
      const match = /^(insert|search|delete|inorder)(?:\s+([+-]?\d+))?$/i.exec(entry);
      const name = match && match[1].toLowerCase();
      if (!match || (name === 'inorder') !== (match[2] === undefined)) {
        const shown = entry.length > 20 ? entry.slice(0, 20) + '…' : entry;
        fail(`Operation ${index + 1} ("${shown}") is not valid. Write insert 5, search 5, delete 5 or inorder.`,
          `الـ operation رقم ${index + 1} ("${shown}") مش مفهومة. اكتب insert 5 أو search 5 أو delete 5 أو inorder.`);
      }
      return { op: name, value: name === 'inorder' ? null : Number(match[2]) };
    });
    const input = { start, ops };
    validate(input);
    return input;
  }

  function build(input) {
    validate(input);
    const nodes = {};
    let rootId = null, nextId = 0;
    const newNode = value => { const id = `n${nextId++}`; nodes[id] = { id, value, left: null, right: null }; return id; };
    // The starting tree is built with the same insert rule, just without frames.
    for (const value of input.start) {
      if (rootId === null) { rootId = newNode(value); continue; }
      let id = rootId;
      while (true) {
        const side = value < nodes[id].value ? 'left' : 'right';
        if (nodes[id][side] === null) { nodes[id][side] = newNode(value); break; }
        id = nodes[id][side];
      }
    }

    const state = {
      nodes, root: rootId, ops: input.ops.map(opText), opIndex: null, op: null, value: null,
      node: null, parent: null, succ: null, side: null, path: [], focus: null, target: null,
      activeEdge: null, pruned: false, output: [], visited: [], stack: [],
      comparisons: 0, totalComparisons: 0, outcomes: [], condition: null, done: false, result: null,
    };
    const frames = [];

    const inorderIds = () => {
      const out = [];
      const walk = id => { if (id === null) return; walk(nodes[id].left); out.push(id); walk(nodes[id].right); };
      walk(state.root);
      return out;
    };
    const depths = () => {
      const out = {};
      const walk = (id, depth) => { if (id === null) return; out[id] = depth; walk(nodes[id].left, depth + 1); walk(nodes[id].right, depth + 1); };
      walk(state.root, 0);
      return out;
    };
    const height = () => { const values = Object.values(depths()); return values.length ? Math.max(...values) : -1; };
    const subtree = id => {
      const out = new Set();
      const walk = at => { if (at === null) return; out.add(at); walk(nodes[at].left); walk(nodes[at].right); };
      walk(id);
      return out;
    };
    const size = () => Object.keys(nodes).length;
    const valueOf = id => id === null ? 'null' : nodes[id].value;
    const sideWord = side => side === 'left' ? message('left', 'شمال') : message('right', 'يمين');

    function sceneFor() {
      const order = inorderIds(), depth = depths(), h = height(), n = order.length;
      const live = state.pruned && state.focus !== null && nodes[state.focus] ? subtree(state.focus) : null;
      const onPath = new Set(state.path), visited = new Set(state.visited), stacked = new Set(state.stack);
      const gap = h > 0 ? Math.min(MAX_LEVEL_GAP, LEVEL_SPAN / h) : 0;
      const top = CENTER_Y - (h > 0 ? h * gap : 0) / 2;
      const toneFor = id => {
        if (id === state.focus) return 'active';
        if (id === state.target || id === state.succ) return 'pivot';
        if (visited.has(id)) return 'sorted';
        if (onPath.has(id) || stacked.has(id)) return 'found';
        if (live && !live.has(id)) return 'muted';
        return 'default';
      };
      const graph = n ? {
        nodes: order.map((id, rank) => ({
          id, label: String(nodes[id].value), tone: toneFor(id),
          x: Math.round((CENTER_X + (rank - (n - 1) / 2) * RANK_STEP) * 10) / 10,
          y: Math.round((top + depth[id] * gap) * 10) / 10,
          detail: message(`depth ${depth[id]} · in-order rank ${rank}`, `الـ depth ${depth[id]} · ترتيبه في الـ inorder ${rank}`),
        })),
        edges: order.flatMap(id => ['left', 'right'].filter(side => nodes[id][side] !== null).map(side => {
          const child = nodes[id][side];
          const active = state.activeEdge && state.activeEdge.from === id && state.activeEdge.to === child;
          const pathEdge = (onPath.has(id) || id === state.focus || stacked.has(id)) && (onPath.has(child) || child === state.focus || child === state.target || child === state.succ);
          return { from: id, to: child, directed: true,
            tone: active ? 'active' : pathEdge ? 'found' : live && !live.has(child) ? 'muted' : 'default' };
        })),
      } : null;
      const rows = [];
      if (!n) rows.push({ id: 'bst-empty', label: message('Tree · root = null', 'الـ tree · root = null'), layout: 'cards', cells: [] });
      rows.push({ id: 'bst-probe', label: message('Looking for', 'بندوّر على'), layout: 'cards',
        cells: state.value === null ? [] : [{ id: 'probe', value: state.value, tone: 'active', marker: 'value' }] });
      rows.push({ id: 'bst-output', label: message('In-order output', 'الـ output بتاع الـ inorder'), layout: 'cards',
        cells: state.output.map((item, index) => ({ id: `out-${item.id}`, value: item.value, index, tone: 'sorted' })) });
      const collections = [{ label: message('Operations', 'الـ operations'),
        values: state.ops.map((text, index) => index === state.opIndex ? `▶ ${text}` : index < (state.opIndex ?? 0) || state.done ? `✓ ${text}` : text) }];
      if (state.op === 'inorder') {
        collections.push({ label: message('Call stack · waiting to output', 'الـ call stack · مستنيين يطلعوا في الـ output'),
          values: state.stack.map(id => nodes[id].value) });
      }
      const degenerate = n >= 3 && h === n - 1;
      const note = !n ? message('Empty tree: root is null, height is −1 by convention.', 'الـ tree فاضية: الـ root لسه null، والـ height بنعتبره −1.')
        : degenerate ? message(`${n} nodes in one chain: height ${h} = n − 1. This tree is really a linked list, so a walk can cost ${n} comparisons.`,
          `${n} nodes ورا بعض في خط واحد: الـ height بقى ${h}، يعني n − 1. الـ tree دي بقت linked list، فالمشوار ممكن يكلّف ${n} مقارنات.`)
          : message(`${n} nodes · height ${h}. Any walk from the root makes at most ${h + 1} comparisons.`,
            `${n} nodes · الـ height بتاعها ${h}. أي مشوار من الـ root مش هيعدّي ${h + 1} مقارنات.`);
      return { rows, graph, collections, note };
    }

    function emit(kind, lines, title, explanation, equation = '') {
      const h = height();
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'op', value: state.opIndex === null ? '—' : state.ops[state.opIndex] },
          { name: 'value', value: state.value ?? '—' },
          { name: 'node', value: state.node === undefined || state.op === null ? '—' : state.node === null ? 'null' : valueOf(state.node) },
          { name: state.op === 'delete' ? 'parent' : 'side', value: state.op === 'delete' ? (state.parent === null ? 'null' : valueOf(state.parent)) : state.side ?? '—' },
        ].concat(state.succ !== null ? [{ name: 'succ', value: valueOf(state.succ) }] : []),
        metrics: [
          { label: message('Comparisons · this operation', 'مقارنات الـ operation دي'), value: state.comparisons },
          { label: message('Comparisons · total', 'كل المقارنات'), value: state.totalComparisons },
          { label: message('Nodes', 'عدد الـ nodes'), value: size() },
          { label: message('Height', 'الـ height'), value: h },
        ],
        scene: sceneFor(),
      }));
    }

    const resetOp = () => {
      Object.assign(state, { op: null, value: null, node: null, parent: null, succ: null, side: null, path: [],
        focus: null, target: null, activeEdge: null, pruned: false, output: [], visited: [], stack: [], comparisons: 0, condition: null });
    };
    const compare = () => { state.comparisons++; state.totalComparisons++; };
    const record = (outcome, extra = {}) => state.outcomes.push({ op: state.op, value: state.value, outcome, comparisons: state.comparisons, ...extra });
    const skipped = (id, side) => { const other = nodes[id][side === 'left' ? 'right' : 'left']; return other === null ? 0 : subtree(other).size; };

    const startSize = size();
    emit('ready', [], message('A tree where left is smaller and right is larger', 'tree الصغير فيها على الشمال والكبير على اليمين'),
      message(startSize ? `The tree starts with ${startSize} nodes and height ${height()}. ${input.ops.length} operations follow; each one walks down from the root, one comparison per level.`
        : `The tree starts empty. ${input.ops.length} operations follow; each one walks down from the root, one comparison per level.`,
      startSize ? `الـ tree بتبدأ بـ ${startSize} nodes والـ height بتاعها ${height()}. وراها ${input.ops.length} operations، وكل واحدة بتنزل من الـ root، مقارنة واحدة في كل level.`
        : `الـ tree بتبدأ فاضية. وراها ${input.ops.length} operations، وكل واحدة بتنزل من الـ root، مقارنة واحدة في كل level.`));

    // A shared descent for insert/search/delete: compare at `id`, then step to the chosen child.
    function descend(id, side, lines) {
      const child = nodes[id][side];
      state.activeEdge = { from: id, to: child };
      state.path.push(id); state.focus = child; state.node = child;
      emit('descend', lines, message(`Go ${side} to ${nodes[child].value}`, `بننزل ${sideWord(side).ar} للـ ${nodes[child].value}`),
        message(`node moves to the ${side} child of ${nodes[id].value}. We are one level deeper, and only this subtree can still hold ${state.value}.`,
          `node نزلت للـ ${side} child بتاع الـ ${nodes[id].value}. نزلنا level، والـ subtree ده بس هو اللي ممكن يكون فيه الـ ${state.value}.`),
        `node = node.${side} → ${nodes[child].value}`);
      state.activeEdge = null;
    }

    function compareFrame(kind, lines, id) {
      const here = nodes[id].value, value = state.value;
      if (value === here) return;
      const side = value < here ? 'left' : 'right', others = skipped(id, side);
      const n = size(), chain = n >= 3 && height() === n - 1;
      state.side = side;
      emit(kind, lines, message(`${value} ${value < here ? '<' : '>'} ${here}, so go ${side}`, `الـ ${value} ${value < here ? 'أصغر' : 'أكبر'} من ${here}، يبقى هنروح ${sideWord(side).ar}`),
        message(`The invariant says everything ${side === 'left' ? 'smaller' : 'larger'} than ${here} lives in its ${side} subtree. ${others ? `The other side (${others} node${others === 1 ? '' : 's'}) is skipped without a single look.` : `The other side is empty, so this comparison rules nothing out.${chain ? ' In a chain every comparison is like this, which turns O(h) into O(n).' : ''}`}`,
          `الـ invariant بيقول إن أي رقم ${side === 'left' ? 'أصغر' : 'أكبر'} من ${here} لازم يكون في الـ ${side} subtree بتاعه. ${others ? `الناحية التانية، وعدد الـ nodes فيها ${others}، بنسيبها من غير ما نبص فيها خالص.` : `بس الناحية التانية فاضية، يعني المقارنة دي مش بتوفّر علينا حاجة.${chain ? ' وفي الخط الواحد كل المقارنات كده، وده اللي بيخلّي O(h) تبقى O(n).' : ''}`}`),
        `${value} ${value < here ? '<' : '>'} ${here} → ${side}`);
      return side;
    }

    function runInsert() {
      if (state.root === null) {
        const id = newNode(state.value);
        state.root = id; state.target = id; state.node = id;
        record('inserted', { depth: 0 });
        emit('insert-root', [2], message(`${state.value} becomes the root`, `الـ ${state.value} بقى الـ root`),
          message('root is null, so there is nothing to compare. The new node is the root and also a leaf: 0 comparisons.',
            'الـ root لسه null، يعني مفيش حاجة نقارن بيها. الـ node الجديدة بقت الـ root وفي نفس الوقت leaf: 0 مقارنات.'),
          `root = Node(${state.value})`);
        return;
      }
      let id = state.root;
      state.node = id; state.focus = id; state.pruned = true;
      while (true) {
        compare();
        if (state.value === nodes[id].value) {
          state.target = id; state.focus = null;
          record('duplicate');
          emit('duplicate', [5], message(`${state.value} is already here, so we skip it`, `الـ ${state.value} موجود أصلًا، فمش هنضيفه`),
            message(`${state.value} == node.value. A BST keeps each value once, so insert returns without changing the tree after ${count(state.comparisons)}. A second copy would break the strict left < node < right rule.`,
              `${state.value} == node.value. الـ BST هنا بيشيل كل رقم مرة واحدة، فالـ insert بيعمل return من غير ما يغيّر حاجة بعد ${state.comparisons} مقارنات. لو حطّينا نسخة تانية هنكسر القاعدة left < node < right.`),
            `${state.value} == ${nodes[id].value} → return`);
          return;
        }
        const side = compareFrame('compare', [5, 6], id);
        if (nodes[id][side] === null) {
          const child = newNode(state.value);
          nodes[id][side] = child;
          state.path.push(id); state.focus = null; state.target = child; state.node = child;
          state.activeEdge = { from: id, to: child };
          const depth = depths()[child];
          record('inserted', { depth });
          emit('attach', [7, 8], message(`Attach ${state.value} as a new leaf`, `بنعلّق الـ ${state.value} كـ leaf جديدة`),
            message(`The ${side} child of ${nodes[id].value} is null, so ${state.value} hangs there at depth ${depth}. It cost ${count(state.comparisons)}, one per level walked: that is why insert is O(h). No other node moves.`,
              `الـ ${side} child بتاع الـ ${nodes[id].value} فاضي (null)، فالـ ${state.value} بيتعلّق هناك على depth ${depth}. كلّفنا ${state.comparisons} مقارنات، واحدة في كل level نزلناه، وعشان كده الـ insert تكلفته O(h). ومفيش ولا node تانية اتحرّكت.`),
            `node.${side} = Node(${state.value})`);
          state.activeEdge = null;
          return;
        }
        descend(id, side, [7, 9]);
        id = nodes[id][side];
      }
    }

    function runSearch() {
      let id = state.root;
      state.node = id; state.focus = id; state.pruned = true;
      while (true) {
        if (id === null) {
          state.focus = null; state.node = null;
          record('not-found');
          emit('not-found', [12, 16], message(`${state.value} is not in the tree`, `الـ ${state.value} مش موجود في الـ tree`),
            message(state.comparisons ? `node is null: the only place ${state.value} could be is empty. ${count(state.comparisons)} prove it is missing without looking at the skipped subtrees.`
              : 'root is null, so the tree is empty and the loop never runs: 0 comparisons.',
            state.comparisons ? `node بقت null: المكان الوحيد اللي ممكن يكون فيه الـ ${state.value} طلع فاضي. ${state.comparisons} مقارنات كفاية نتأكد إنه مش موجود، من غير ما نبص في الـ subtrees اللي سبناها.`
              : 'الـ root لسه null، يعني الـ tree فاضية والـ loop مش هتلف خالص: 0 مقارنات.'),
            'node is null → return null');
          return;
        }
        compare();
        if (state.value === nodes[id].value) {
          state.focus = null; state.target = id;
          record('found', { depth: depths()[id] });
          emit('found', [12, 13], message(`Found ${state.value}`, `لقينا الـ ${state.value}`),
            message(`${state.value} == node.value at depth ${depths()[id]}, after ${count(state.comparisons)}. The search touched only the nodes on one root-to-node path.`,
              `${state.value} == node.value على depth ${depths()[id]}، بعد ${state.comparisons} مقارنات. الـ search لمس بس الـ nodes اللي على path واحد من الـ root.`),
            `${state.value} == ${nodes[id].value} → return node`);
          return;
        }
        const side = compareFrame('compare', [12, 13], id);
        if (nodes[id][side] === null) {
          state.path.push(id); state.node = null; state.activeEdge = null;
          emit('descend', [side === 'left' ? 14 : 15], message(`The ${side} child is null`, `الـ ${side} child طلع null`),
            message(`node = node.${side}, which is null. There is no deeper level to try.`,
              `node = node.${side}، وده null. مفيش level أعمق نجرّبه.`),
            `node = node.${side} → null`);
          id = null;
          continue;
        }
        descend(id, side, [side === 'left' ? 14 : 15]);
        id = nodes[id][side];
      }
    }

    function runInorder() {
      if (state.root === null) {
        record('output', { output: [] });
        emit('inorder-empty', [18], message('Nothing to output', 'مفيش حاجة تطلع'),
          message('inorder(root) is called with null, so it returns at once. An empty tree gives an empty sorted list.',
            'بننادي inorder(root) وهو null، فبيعمل return على طول. الـ tree الفاضية بتدّي list فاضية.'), 'node is null → return');
        return;
      }
      // An explicit stack mirrors the recursive calls that are waiting on line 19.
      const stack = [];
      let id = state.root;
      while (id !== null || stack.length) {
        while (id !== null) { stack.push(id); id = nodes[id].left; }
        const current = stack.pop();
        state.stack = [...stack];
        state.focus = current; state.node = current;
        state.output.push({ id: current, value: nodes[current].value });
        const leftDone = nodes[current].left !== null;
        emit('visit', [20], message(`Output ${nodes[current].value}`, `بنطلّع الـ ${nodes[current].value}`),
          message(`${leftDone ? `The left subtree of ${nodes[current].value} is finished` : `${nodes[current].value} has no left child`}, so every smaller value is already out. Output ${nodes[current].value}, then visit its right subtree.`,
            `${leftDone ? `الـ left subtree بتاع الـ ${nodes[current].value} خلص` : `الـ ${nodes[current].value} ملوش left child`}، يعني كل الأصغر منه طلع خلاص. بنطلّع الـ ${nodes[current].value}، وبعدين نروح للـ right subtree بتاعه.`),
          `output(${nodes[current].value})`);
        state.visited.push(current); state.focus = null;
        id = nodes[current].right;
      }
      state.stack = [];
      const values = state.output.map(item => item.value);
      record('output', { output: values });
      emit('inorder-done', [21], message('In-order gives sorted order', 'الـ inorder طلّع الأرقام مترتّبة'),
        message(`Left, node, right at every node prints the ${values.length} values in ascending order with no comparisons: each node is visited once, O(n).`,
          `لما عند كل node بنمشي شمال، بعدين الـ node، بعدين يمين، الأرقام كلها (${values.length}) بتطلع من الصغير للكبير ومن غير ولا مقارنة. كل node بنزورها مرة واحدة، يعني O(n).`),
        values.join(' < '));
    }

    function runDelete() {
      let id = state.root;
      state.node = id; state.parent = null; state.focus = id; state.pruned = true;
      while (true) {
        if (id === null) {
          state.focus = null;
          record('not-found');
          emit('not-found', [24, 27], message(`${state.value} is not there, nothing to delete`, `الـ ${state.value} مش موجود، مفيش حاجة نشيلها`),
            message(state.comparisons ? `The walk fell off the tree after ${count(state.comparisons)}. delete returns and the tree stays the same.`
              : 'The tree is empty, so delete returns at once and nothing changes.',
            state.comparisons ? `المشوار خلص لـ null بعد ${state.comparisons} مقارنات. الـ delete بيعمل return والـ tree زي ما هي.`
              : 'الـ tree فاضية، فالـ delete بيعمل return على طول ومفيش حاجة بتتغيّر.'),
            'node is null → return');
          return;
        }
        compare();
        if (state.value === nodes[id].value) break;
        const side = compareFrame('compare', [24], id);
        if (nodes[id][side] === null) {
          state.path.push(id); state.parent = id; state.node = null;
          emit('descend', [25, 26], message(`The ${side} child is null`, `الـ ${side} child طلع null`),
            message(`parent = ${nodes[id].value}, and node = node.${side}, which is null.`,
              `parent بقى ${nodes[id].value}، وnode = node.${side}، وده null.`),
            `node = node.${side} → null`);
          id = null;
          continue;
        }
        state.parent = id;
        descend(id, side, [25, 26]);
        id = nodes[id][side];
      }

      const target = id, removedValue = nodes[target].value;
      const children = ['left', 'right'].filter(side => nodes[target][side] !== null);
      state.focus = null; state.target = target;
      emit('found', [24], message(`Found ${removedValue}: ${children.length === 2 ? 'two children' : children.length === 1 ? 'one child' : 'a leaf'}`,
        `لقينا الـ ${removedValue}: ${children.length === 2 ? 'ليه 2 children' : children.length === 1 ? 'ليه child واحد' : 'ده leaf'}`),
        message(children.length === 2 ? `${removedValue} has two children, so we cannot just unlink it: two subtrees would need one parent slot. We will replace its value with the next larger one.`
          : children.length === 1 ? `${removedValue} has one child. Its child can take its place: every value under it already sits on the correct side of parent.`
            : `${removedValue} is a leaf. Removing it cannot break the order of anything else.`,
        children.length === 2 ? `الـ ${removedValue} ليه 2 children، فمينفعش نشيله وخلاص: هيبقى عندنا 2 subtrees ومكان واحد بس تحت الـ parent. هنحط مكان قيمته الرقم اللي بعده على طول.`
          : children.length === 1 ? `الـ ${removedValue} ليه child واحد. الـ child ده يقدر ياخد مكانه، لأن كل اللي تحته أصلًا في الناحية الصح من الـ parent.`
            : `الـ ${removedValue} ده leaf. لو شلناه مش هيبوّظ ترتيب أي حاجة تانية.`),
        `${state.value} == ${removedValue}`);

      let remove = target;
      if (children.length === 2) {
        state.parent = target;
        let succ = nodes[target].right;
        state.succ = succ; state.focus = null;
        state.activeEdge = { from: target, to: succ };
        emit('two-children', [28, 29], message('Look for the successor on the right', 'بندوّر على الـ successor في اليمين'),
          message(`The successor is the smallest value larger than ${removedValue}: the leftmost node of its right subtree. Start at ${nodes[succ].value}.`,
            `الـ successor هو أصغر رقم أكبر من ${removedValue}، يعني آخر node على الشمال في الـ right subtree بتاعه. بنبدأ من الـ ${nodes[succ].value}.`),
          `succ = node.right → ${nodes[succ].value}`);
        state.activeEdge = null;
        while (nodes[succ].left !== null) {
          const next = nodes[succ].left;
          state.path.push(succ); state.parent = succ; state.succ = next;
          state.activeEdge = { from: succ, to: next };
          emit('successor-step', [30], message(`Keep going left to ${nodes[next].value}`, `بنكمّل شمال للـ ${nodes[next].value}`),
            message(`${nodes[succ].value} has a left child, so a smaller candidate exists. Move succ to ${nodes[next].value}.`,
              `الـ ${nodes[succ].value} ليه left child، يعني فيه رقم أصغر ينفع. succ بقى ${nodes[next].value}.`),
            `succ = succ.left → ${nodes[next].value}`);
          state.activeEdge = null;
          succ = next;
        }
        const succValue = nodes[succ].value;
        emit('successor', [30], message(`${succValue} is the successor`, `الـ ${succValue} هو الـ successor`),
          message(`${succValue} has no left child, so it is the smallest value in the right subtree. It has at most one child (a right one), so removing it is the easy case.`,
            `الـ ${succValue} ملوش left child، فهو أصغر رقم في الـ right subtree. وعنده child واحد بالكتير (right)، فشيله هيبقى الحالة السهلة.`),
          `succ.left is null → succ = ${succValue}`);
        nodes[target].value = succValue;
        state.node = succ; state.target = target;
        emit('copy', [31, 32], message(`Copy ${succValue} up into ${removedValue}'s node`, `بننسخ الـ ${succValue} مكان الـ ${removedValue}`),
          message(`${succValue} is larger than everything on the left and smaller than everything else on the right, so it fits exactly where ${removedValue} was. Now the old ${succValue} node below is a duplicate, and that is the node we remove.`,
            `الـ ${succValue} أكبر من كل اللي على الشمال، وأصغر من كل اللي فاضل على اليمين، فبيقعد بالظبط مكان الـ ${removedValue}. دلوقتي الـ node القديمة بتاعة الـ ${succValue} تحت بقت نسخة زيادة، وهي دي اللي هنشيلها.`),
          `node.value = ${succValue}; node = succ`);
        remove = succ;
      }

      const parent = state.parent;
      const childSide = nodes[remove].left !== null ? 'left' : nodes[remove].right !== null ? 'right' : null;
      const child = childSide ? nodes[remove][childSide] : null;
      const removed = nodes[remove].value;
      const parentSide = parent === null ? null : nodes[parent].left === remove ? 'left' : 'right';
      if (parent === null) state.root = child;
      else nodes[parent][parentSide] = child;
      delete nodes[remove];
      state.path = state.path.filter(item => item !== remove);
      state.succ = null; state.node = child;
      state.target = children.length === 2 ? target : child;
      if (parent !== null && child !== null) state.activeEdge = { from: parent, to: child };
      const where = parent === null ? message('the root', 'الـ root') : message(`${nodes[parent].value}'s ${parentSide} child`, `الـ ${parentSide} child بتاع الـ ${nodes[parent].value}`);
      record('deleted', { case: children.length === 2 ? 'two-children' : children.length === 1 ? 'one-child' : 'leaf' });
      emit('unlink', [33, 34], message(child === null ? `Unlink the leaf ${removed}` : `${nodes[child].value} takes ${removed}'s place`,
        child === null ? `بنفك الـ leaf ${removed}` : `الـ ${nodes[child].value} بياخد مكان الـ ${removed}`),
        message(`${child === null ? `child is null, so ${where.en} becomes null` : `child = ${nodes[child].value} moves up to become ${where.en}, bringing its whole subtree`}. ${children.length === 2
          ? `${nodes[target].value} now sits where ${removedValue} was. Finding ${removedValue} took ${count(state.comparisons)}, and the successor walk goes further down the same tree, so the whole delete is still O(h); the relink itself is O(1).`
          : `${state.value} is gone after ${count(state.comparisons)}: the walk down is O(h), and the relink is O(1).`}`,
          `${child === null ? `child طلع null، يعني ${where.ar} بقى null` : `child = ${nodes[child].value} طلع لفوق وبقى ${where.ar}، ومعاه الـ subtree بتاعه كله`}. ${children.length === 2
          ? `الـ ${nodes[target].value} دلوقتي قاعد مكان الـ ${removedValue}. عدد المقارنات عشان نلاقي الـ ${removedValue} كان ${state.comparisons}، ومشوار الـ successor بينزل في نفس الـ tree، فالـ delete كله لسه O(h). وتغيير الـ link نفسه O(1).`
          : `الـ ${state.value} اتشال. عدد المقارنات ${state.comparisons}: النزول O(h)، وتغيير الـ link تكلفته O(1).`}`),
        `${parent === null ? 'root' : `${nodes[parent].value}.${parentSide}`} = ${child === null ? 'null' : nodes[child].value}`);
      state.activeEdge = null;
    }

    const opLines = { insert: [1], search: [10, 11], inorder: [17], delete: [22, 23] };
    for (const [index, op] of input.ops.entries()) {
      resetOp();
      state.opIndex = index; state.op = op.op; state.value = op.value;
      state.node = state.root;
      const lines = op.op === 'insert' && state.root !== null ? [1, 3] : opLines[op.op];
      const intro = {
        insert: message(`Insert ${op.value}: walk down comparing until a null child, then hang a leaf there.`,
          `insert ${op.value}: بننزل ونقارن لحد ما نلاقي child فاضي (null)، ونعلّق leaf جديدة هناك.`),
        search: message(`Search ${op.value}: at each node, equal means found; smaller goes left, larger goes right.`,
          `search ${op.value}: عند كل node، لو زيه يبقى لقيناه، لو أصغر نروح شمال، لو أكبر نروح يمين.`),
        inorder: message('In-order: left subtree, then the node, then the right subtree. No comparisons needed.',
          'الـ inorder: الـ left subtree، بعدين الـ node، بعدين الـ right subtree. مش محتاجين ولا مقارنة.'),
        delete: message(`Delete ${op.value}: first find it like a search, then fix the hole it leaves.`,
          `delete ${op.value}: الأول بندوّر عليه زي الـ search، وبعدين نسدّ المكان اللي هيفضى.`),
      }[op.op];
      emit('op', lines, message(`Operation ${index + 1}: ${opText(op)}`, `الـ operation رقم ${index + 1}: ${opText(op)}`), intro,
        op.op === 'inorder' ? 'inorder(root)' : `${op.op}(${op.value})`);
      ({ insert: runInsert, search: runSearch, inorder: runInorder, delete: runDelete })[op.op]();
    }

    resetOp();
    state.opIndex = null;
    const finalOrder = inorderIds().map(id => nodes[id].value), finalHeight = height();
    state.done = true;
    state.result = { values: finalOrder, size: finalOrder.length, height: finalHeight, outcomes: state.outcomes };
    emit('done', [], message('Script finished', 'الـ operations خلصت'),
      message(finalOrder.length ? `The tree holds ${finalOrder.length} value${finalOrder.length === 1 ? '' : 's'}, height ${finalHeight}, after ${count(state.totalComparisons)} in total. Reading it in order still gives ${finalOrder.join(', ')}.`
        : `The tree ends empty after ${count(state.totalComparisons)} in total.`,
      finalOrder.length ? `الـ tree فيها ${finalOrder.length} أرقام والـ height بتاعها ${finalHeight}، بعد ${state.totalComparisons} مقارنات في المجموع. ولو قريناها inorder هتطلع ${finalOrder.join(', ')}.`
        : `الـ tree خلصت فاضية بعد ${state.totalComparisons} مقارنات في المجموع.`));
    return frames;
  }

  const defaults = { start: '50, 30, 70, 20, 40', operations: 'insert 60, search 40, search 65, insert 30, inorder' };

  const lesson = {
    id: 'binary-search-tree', name: 'Binary Search Tree', theme: 'data-structures', category: 'structure', number: '16',
    label: 'BST', cost: 'O(h)',
    description: message('A tree where every left subtree is smaller and every right subtree is larger, so each comparison throws away one side.',
      'tree كل left subtree فيها أصغر وكل right subtree أكبر، فكل مقارنة بترمي ناحية كاملة.'),
    note: message('Insert, search and delete walk one root-to-leaf path: O(h). Balanced, h ≈ log n; inserting sorted values makes a chain with h = n − 1.',
      'الـ insert والـ search والـ delete بيمشوا على path واحد من الـ root: O(h). لو الـ tree متوازنة h تقريبًا log n، ولو دخّلنا أرقام مترتّبة هتبقى خط واحد وh = n − 1.'),
    code,
    keySteps: ['ready', 'op', 'insert-root', 'compare', 'attach', 'duplicate', 'found', 'not-found',
      'visit', 'inorder-done', 'inorder-empty', 'two-children', 'successor', 'copy', 'unlink', 'done'],
    view: {
      hideRows: [],
      legend: [
        { tone: 'active', role: 'current', label: message('Comparing now', 'بنقارن بيها دلوقتي') },
        { tone: 'found', role: 'path', label: message('Path from the root', 'الـ path من الـ root') },
        { tone: 'pivot', role: 'peek', label: message('New · found · successor', 'جديدة · لقيناها · الـ successor') },
        { tone: 'sorted', role: 'done', label: message('Already output', 'طلعت في الـ output') },
      ],
    },
    fields: [
      { name: 'start', type: 'text', maxLength: MAX_START_LENGTH,
        label: message('Starting values', 'الـ values اللي هنبدأ بيها'),
        help: message('Up to 8 distinct integers from -99 to 999, inserted in this order before the script runs. Leave blank for an empty tree.',
          'لحد 8 أرقام صحيحة مختلفة من -99 لـ 999، بتتعمل لها insert بالترتيب ده قبل الـ operations. سيبها فاضية لو عايز tree فاضية.') },
      { name: 'operations', type: 'textarea', maxLength: MAX_OPS_LENGTH,
        label: message('Operations', 'الـ operations'),
        help: message('Up to 12, separated by commas or new lines: insert 5, search 5, delete 5, inorder. Values are integers from -99 to 999. The tree can hold at most 8 nodes at any time.',
          'لحد 12، وافصل بينهم بـ comma أو سطر جديد: insert 5، search 5، delete 5، inorder. الأرقام صحيحة من -99 لـ 999. الـ tree مينفعش يبقى فيها أكتر من 8 nodes في أي وقت.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Insert, search, duplicate', 'insert وsearch ورقم مكرّر'), input: { ...defaults } },
      { id: 'balanced', label: message('Build a balanced tree · h = 2', 'بنبني tree متوازنة · h = 2'),
        input: { start: '', operations: 'insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, search 80' } },
      { id: 'degenerate', label: message('Sorted inserts · a chain, O(n)', 'insert لأرقام مترتّبة · خط واحد، O(n)'),
        input: { start: '', operations: 'insert 10, insert 20, insert 30, insert 40, insert 50, insert 60, insert 70, search 70, search 75' } },
      { id: 'delete-cases', label: message('Delete: leaf, one child, two children', 'delete: leaf وchild واحد و2 children'),
        input: { start: '50, 30, 70, 20, 40, 60, 80, 65', operations: 'delete 20, delete 30, delete 50, inorder' } },
      { id: 'not-found', label: message('Missing values', 'أرقام مش موجودة'),
        input: { start: '50, 30, 70', operations: 'search 45, delete 99, search 50' } },
      { id: 'duplicates', label: message('Duplicates are ignored', 'المكرّر مش بيتضاف'),
        input: { start: '8, 4, 12', operations: 'insert 8, insert 4, insert 12, insert 10, inorder' } },
      { id: 'limits', label: message('Negative values and limits', 'أرقام سالبة وأقصى الحدود'),
        input: { start: '0, -99, 999', operations: 'insert -50, search -99, delete 0, inorder' } },
      { id: 'empty', label: message('Empty tree', 'tree فاضية'),
        input: { start: '', operations: 'search 5, inorder, delete 5, insert 5' } },
    ],
    parse, build,
    summary(input) {
      validate(input);
      return message(`${input.start.length} starting values · ${input.ops.length} operations · at most 8 nodes`,
        `${input.start.length} values في الأول · ${input.ops.length} operations · 8 nodes بالكتير`);
    },
    theory: {
      idea: message('Every node keeps smaller values on its left and larger values on its right. So one comparison tells you which half to ignore, and you only walk one path down the tree.',
        'كل node بتحط الأصغر منها على الشمال والأكبر على اليمين. فمقارنة واحدة بتقولك أنهي ناحية تسيبها، وبتمشي في path واحد بس لتحت.'),
      title: message('One comparison per level', 'مقارنة واحدة في كل level'),
      intro: message('A tree is nodes joined by parent → child links with no cycles. The top node is the root; a node with no children is a leaf; depth counts edges from the root, and the height is the largest depth (one node: 0, empty: −1). In a binary tree each node has at most a left and a right child, and each child starts its own subtree. Every node is a separate object with two pointers, so unlike an array the values are not stored side by side.',
        'الـ tree عبارة عن nodes مربوطة بـ links من parent لـ child، ومفيش cycles. أول node فوق اسمها الـ root، والـ node اللي ملهاش children اسمها leaf. الـ depth هو عدد الـ edges من الـ root، والـ height هو أكبر depth (node واحدة: 0، فاضية: −1). في الـ binary tree كل node ليها left child وright child بالكتير، وكل child بيبدأ subtree لوحده. كل node object لوحده وفيه 2 pointers، فالأرقام مش جنب بعض في الـ memory زي الـ array.'),
      invariant: message('For every node, all values in its left subtree are smaller and all values in its right subtree are larger. Values are distinct. Insert keeps it by hanging new values where a search for them would end; delete keeps it by moving up a child or the in-order successor.',
        'عند كل node، كل الأرقام في الـ left subtree بتاعها أصغر منها، وكل اللي في الـ right subtree أكبر. ومفيش رقم متكرّر. الـ insert بيحافظ عليه لأنه بيعلّق الرقم الجديد في نفس المكان اللي الـ search كان هيخلص فيه. والـ delete بيحافظ عليه لأنه بيطلّع child أو الـ successor مكان الـ node.'),
      steps: [
        { title: message('Search walks one path', 'الـ search بيمشي في path واحد'),
          body: message('Start at the root. Equal means found. Smaller means the value can only be on the left, so go left; larger, go right. Reaching null proves it is missing. Each step goes one level deeper, so a search makes at most h + 1 comparisons.',
            'بنبدأ من الـ root. لو زيه يبقى لقيناه. لو أصغر، يبقى مكانه الوحيد على الشمال، فبنروح شمال، ولو أكبر يمين. لو وصلنا لـ null يبقى مش موجود. كل خطوة بتنزل level، فالـ search مش بيعدّي h + 1 مقارنات.') },
        { title: message('Insert = failed search + new leaf', 'الـ insert = search فشل + leaf جديدة'),
          body: message('Walk exactly like a search. If you meet the value, it is a duplicate and nothing changes. Otherwise you fall off at a null child, and that is the one spot where the invariant allows the new value. Hang a leaf there; no existing node moves.',
            'بنمشي بالظبط زي الـ search. لو قابلنا نفس الرقم يبقى مكرّر ومش هنغيّر حاجة. غير كده هنوصل لـ child فاضي (null)، وده المكان الوحيد اللي الـ invariant يسمح فيه بالرقم الجديد. بنعلّق leaf هناك، ومفيش node قديمة بتتحرّك.') },
        { title: message('Delete has three cases', 'الـ delete ليه 3 حالات'),
          body: message('A leaf is simply unlinked. A node with one child is replaced by that child. A node with two children takes the value of its in-order successor (the leftmost node of its right subtree), and then that successor node, which has no left child, is removed by one of the first two cases.',
            'لو leaf بنفكّها وخلاص. لو ليها child واحد، الـ child ده بياخد مكانها. لو ليها 2 children، بناخد قيمة الـ successor بتاعها (آخر node على الشمال في الـ right subtree)، وبعدين نشيل الـ node بتاعة الـ successor بواحدة من أول حالتين، لأن ملهاش left child.') },
        { title: message('In-order reads it sorted', 'الـ inorder بيقراها مترتّبة'),
          body: message('Visit the left subtree, then the node, then the right subtree. By the invariant, everything printed before a node is smaller and everything after is larger, so the output is ascending. It touches every node once: O(n), with no comparisons.',
            'بنزور الـ left subtree، بعدين الـ node، بعدين الـ right subtree. بسبب الـ invariant، كل اللي بيطلع قبل الـ node أصغر منها، وكل اللي بعدها أكبر، فالـ output بيطلع من الصغير للكبير. بنعدّي على كل node مرة واحدة: O(n) ومن غير مقارنات.') },
      ],
      notes: [
        message('Cost depends on the height, not directly on n. A balanced tree with n nodes has h ≈ log₂ n, so 1,000,000 values need about 20 comparisons.',
          'التكلفة على حسب الـ height، مش على n على طول. الـ tree المتوازنة اللي فيها n nodes الـ height بتاعها تقريبًا log₂ n، يعني مليون رقم محتاجين حوالي 20 مقارنة بس.'),
        message('The degenerate case: inserting values in sorted order gives every node only a right child. The tree becomes a linked list with h = n − 1, and search, insert and delete all fall to O(n). Try the sorted-inserts preset.',
          'الحالة الوحشة: لو دخّلنا الأرقام مترتّبة، كل node هيبقى ليها right child بس. الـ tree بتبقى linked list وh = n − 1، والـ search والـ insert والـ delete كلهم بيبقوا O(n). جرّب الـ preset بتاع الأرقام المترتّبة.'),
        message('This plain BST never rebalances. Self-balancing versions (AVL, red-black trees) rotate nodes after updates to keep h = O(log n) in the worst case; that is what TreeMap in Java and std::map in C++ use.',
          'الـ BST العادي ده عمره ما بيعيد توازنه. فيه نسخ بتوازن نفسها (AVL، red-black trees) بتعمل rotations بعد كل تعديل عشان h تفضل O(log n) حتى في الـ worst case. ودي اللي TreeMap في Java وstd::map في C++ بيستخدموها.'),
        message('When to pick it: a BST keeps data ordered while it changes, so it answers min, max, next larger value and range queries. A sorted array also searches in O(log n) but inserts in O(n) because it must shift elements. A hash table finds values in O(1) on average but has no order.',
          'إمتى تختاره؟ الـ BST بيخلّي الـ data مترتّبة وهي بتتغيّر، فيقدر يجاوب على min وmax وأول رقم أكبر وrange queries. الـ sorted array برضه بتعمل search في O(log n)، بس الـ insert فيها O(n) عشان لازم تزحّزح الـ elements. والـ hash table بتلاقي الرقم في O(1) في المتوسط، بس مفيهاش ترتيب.'),
        message('This lesson stores distinct integers and ignores duplicates. Comparisons count one three-way check (equal, smaller or larger) per node visited. The view draws at most 8 nodes, so scripts that would grow past 8 are rejected.',
          'الدرس ده بيشيل أرقام صحيحة مختلفة وبيتجاهل المكرّر. المقارنات بنعدّها مقارنة واحدة لكل node بنزورها (زيه، أصغر، ولا أكبر). الشاشة بترسم 8 nodes بالكتير، فأي operations هتكبّر الـ tree عن 8 بنرفضها.'),
      ],
      costs: [
        { label: message('Search / insert / delete', 'search / insert / delete'), value: 'O(h)' },
        { label: message('Balanced tree', 'tree متوازنة'), value: 'O(log n)' },
        { label: message('Degenerate chain (sorted inserts)', 'خط واحد (أرقام مترتّبة)'), value: 'O(n)' },
        { label: message('In-order traversal', 'الـ inorder traversal'), value: 'O(n)' },
        { label: message('Space', 'المساحة'), value: 'O(n) nodes' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
