(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_NODES = 6;
  const MAX_OPERATIONS = 12;
  const MIN_VALUE = -99;
  const MAX_VALUE = 999;
  const MAX_VALUES_LENGTH = 64;
  const MAX_OPERATIONS_LENGTH = 300;
  const NAMES = { inserthead: 'insertHead', append: 'append', find: 'find', delete: 'delete', insertafter: 'insertAfter' };
  const ARITY = { insertHead: 1, append: 1, find: 1, delete: 1, insertAfter: 2 };

  const code = [
    'insertHead(list, value):',
    '  node = new Node(value)',
    '  node.next = list.head',
    '  list.head = node',
    'append(list, value):',
    '  node = new Node(value)',
    '  if list.head == null:',
    '    list.head = node; return',
    '  current = list.head',
    '  while current.next != null:',
    '    current = current.next',
    '  current.next = node',
    'find(list, value):',
    '  current = list.head',
    '  while current != null:',
    '    if current.value == value: return current',
    '    current = current.next',
    '  return null',
    'delete(list, value):',
    '  prev = null; current = list.head',
    '  while current != null:',
    '    if current.value == value: break',
    '    prev = current; current = current.next',
    '  if current == null: return false',
    '  if prev == null: list.head = current.next',
    '  else: prev.next = current.next',
    '  return true',
    'insertAfter(list, target, value):',
    '  current = find(list, target)',
    '  if current == null: return false',
    '  node = new Node(value)',
    '  node.next = current.next',
    '  current.next = node',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const isValue = value => Number.isSafeInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE;
  const opText = item => item.op === 'insertAfter' ? `insertAfter ${item.target} ${item.value}` : `${item.op} ${item.value}`;
  const clip = text => text.length > 20 ? text.slice(0, 20) + '…' : text;

  // Replays the script on plain values; validation uses it to keep every intermediate list drawable.
  function simulate(values, operations) {
    const list = [...values];
    const sizes = [];
    for (const item of operations) {
      if (item.op === 'insertHead') list.unshift(item.value);
      else if (item.op === 'append') list.push(item.value);
      else if (item.op === 'delete') { const at = list.indexOf(item.value); if (at >= 0) list.splice(at, 1); }
      else if (item.op === 'insertAfter') { const at = list.indexOf(item.target); if (at >= 0) list.splice(at + 1, 0, item.value); }
      sizes.push(list.length);
    }
    return { list, sizes };
  }

  // Public build input: {values: number[], operations: [{op, value} | {op:'insertAfter', target, value}]}.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        !Array.isArray(input.values) || !Array.isArray(input.operations)) {
      fail('Expected an object with a values array and an operations array.',
        'محتاجين object جواه values و operations، والاتنين array.');
    }
    if (input.values.length > MAX_NODES) {
      fail(`Start with at most ${MAX_NODES} values.`, `ابدأ بـ ${MAX_NODES} أرقام بالكتير.`);
    }
    const values = [];
    // for...of also rejects sparse slots.
    for (const value of input.values) {
      if (!isValue(value)) fail('Every value must be an integer from -99 to 999.', 'كل رقم لازم يكون صحيح ومن -99 لحد 999.');
      values.push(value + 0);
    }
    if (input.operations.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operation بالكتير.`);
    }
    const operations = [];
    for (const item of input.operations) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !Object.hasOwn(ARITY, item.op)) {
        fail('Each operation must be insertHead, append, find, delete or insertAfter.',
          'كل operation لازم تكون insertHead أو append أو find أو delete أو insertAfter.');
      }
      const keys = item.op === 'insertAfter' ? ['op', 'target', 'value'] : ['op', 'value'];
      if (Object.keys(item).length !== keys.length || keys.some(key => !Object.hasOwn(item, key)) ||
          !isValue(item.value) || (item.op === 'insertAfter' && !isValue(item.target))) {
        fail('Operation values must be integers from -99 to 999; insertAfter needs a target and a value.',
          'أرقام الـ operations لازم تكون صحيحة ومن -99 لحد 999، والـ insertAfter محتاجة target و value.');
      }
      operations.push(item.op === 'insertAfter' ?
        { op: item.op, target: item.target + 0, value: item.value + 0 } : { op: item.op, value: item.value + 0 });
    }
    const { sizes } = simulate(values, operations);
    sizes.forEach((size, i) => {
      if (size > MAX_NODES) {
        fail(`Operation ${i + 1} (${opText(operations[i])}) would grow the list past ${MAX_NODES} nodes, the most this lab draws.`,
          `الـ operation رقم ${i + 1} (${opText(operations[i])}) هتخلّي الـ list أطول من ${MAX_NODES} nodes، ودي أكتر حاجة بنرسمها هنا.`);
      }
    });
    return { values, operations };
  }

  const normalizeDigits = text => text
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
  const parseNumber = token => /^[+-]?\d{1,3}$/.test(token) && isValue(Number(token)) ? Number(token) + 0 : null;

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) ||
        typeof rawInput.values !== 'string' || typeof rawInput.operations !== 'string') {
      fail('Enter the starting values and the operations as text.', 'اكتب الأرقام اللي هنبدأ بيها والـ operations كـ text.');
    }
    if (rawInput.values.length > MAX_VALUES_LENGTH || rawInput.operations.length > MAX_OPERATIONS_LENGTH) {
      fail(`Keep the values within ${MAX_VALUES_LENGTH} characters and the operations within ${MAX_OPERATIONS_LENGTH}.`,
        `خلّي الأرقام في حدود ${MAX_VALUES_LENGTH} character، والـ operations في حدود ${MAX_OPERATIONS_LENGTH}.`);
    }
    const valuesText = normalizeDigits(rawInput.values).trim();
    const values = [];
    if (valuesText) {
      for (const token of valuesText.split(/\s*[,،]\s*|\s+/)) {
        const value = parseNumber(token);
        if (value === null) {
          fail('Starting values must be integers from -99 to 999, separated by commas or spaces.',
            'الأرقام اللي بنبدأ بيها لازم تكون صحيحة ومن -99 لحد 999، وبينهم comma أو مسافة.');
        }
        values.push(value);
        if (values.length > MAX_NODES) fail(`Start with at most ${MAX_NODES} values.`, `ابدأ بـ ${MAX_NODES} أرقام بالكتير.`);
      }
    }
    const operations = [];
    for (const entry of normalizeDigits(rawInput.operations).split(/[\r\n,;،]+/)) {
      const text = entry.trim();
      // Blank lines and repeated separators are harmless; every operation itself is strict.
      if (!text) continue;
      const parts = text.split(/\s+/);
      const op = NAMES[parts[0].toLowerCase()];
      if (!op) {
        fail(`Unknown operation "${clip(parts[0])}". Use insertHead, append, find, delete or insertAfter.`,
          `مفيش operation اسمها "${clip(parts[0])}". استخدم insertHead أو append أو find أو delete أو insertAfter.`);
      }
      const numbers = parts.slice(1).map(parseNumber);
      if (numbers.length !== ARITY[op] || numbers.some(value => value === null)) {
        const example = op === 'insertAfter' ? 'insertAfter 5 7' : `${op} 5`;
        fail(`Write "${example}": ${op} takes ${ARITY[op] === 2 ? 'a target and a value' : 'one value'}, integers from -99 to 999.`,
          `اكتبها كده "${example}": الـ ${op} محتاجة ${ARITY[op] === 2 ? 'target و value' : 'رقم واحد'}، أرقام صحيحة من -99 لحد 999.`);
      }
      operations.push(op === 'insertAfter' ? { op, target: numbers[0], value: numbers[1] } : { op, value: numbers[0] });
      if (operations.length > MAX_OPERATIONS) {
        fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operation بالكتير.`);
      }
    }
    return validate({ values, operations });
  }

  const OP_LINE = { insertHead: 1, append: 5, find: 13, delete: 19, insertAfter: 28 };
  const ROW_Y = 168;

  function build(input) {
    const data = validate(input);
    const nodes = new Map();
    let nextId = 1;
    let head = null;
    const make = value => { const id = 'n' + nextId++; nodes.set(id, { id, value, next: null }); return id; };
    let last = null;
    for (const value of data.values) {
      const id = make(value);
      if (last === null) head = id; else nodes.get(last).next = id;
      last = id;
    }
    const val = id => id === null ? 'null' : nodes.get(id).value;
    const chain = () => { const ids = []; for (let id = head; id !== null; id = nodes.get(id).next) ids.push(id); return ids; };

    // current/prev are undefined while out of scope and null once they really hold null.
    const s = { index: -1, op: null, current: undefined, prev: undefined, pending: null, pendingAfter: null,
      removed: null, removedAfter: null, hit: null, written: null, condition: null,
      hops: 0, comparisons: 0, writes: 0, totalHops: 0, totalComparisons: 0, totalWrites: 0, results: [] };
    const frames = [];
    const show = id => id === undefined ? '—' : val(id);

    function toneOf(id) {
      if (id === s.removed) return 'muted';
      if (id === s.hit || id === s.pending) return 'found';
      if (id === s.current) return 'active';
      if (id === s.prev) return 'pivot';
      return 'default';
    }

    function sceneFor(order, done) {
      const inChain = new Set(order);
      const extra = [];
      if (s.pending !== null && !inChain.has(s.pending)) extra.push(s.pending);
      if (s.removed !== null && nodes.has(s.removed) && !inChain.has(s.removed)) extra.push(s.removed);
      // One row: head, the chain in next order, then null. Detached nodes float above (new) or below (unlinked).
      const slots = order.length + 2;
      const spacing = Math.min(72, 384 / (slots - 1));
      const x = slot => Math.round(220 - spacing * (slots - 1) / 2 + slot * spacing);
      const anchor = ref => ref === 'head' ? 0 : order.indexOf(ref) + 1;
      const graphNodes = [{ id: 'head', label: 'head', tone: 'default', x: x(0), y: ROW_Y }];
      order.forEach((id, i) => graphNodes.push({ id, label: String(nodes.get(id).value), tone: toneOf(id), x: x(i + 1), y: ROW_Y,
        detail: message(`value ${nodes.get(id).value} · next → ${val(nodes.get(id).next)}`, `الرقم ${nodes.get(id).value} · الـ next → ${val(nodes.get(id).next)}`) }));
      for (const id of extra) {
        const above = id === s.pending;
        graphNodes.push({ id, label: String(nodes.get(id).value), tone: toneOf(id),
          x: x(anchor(above ? s.pendingAfter : s.removedAfter) + 0.5), y: above ? ROW_Y - 96 : ROW_Y + 96,
          detail: above ? message('New node, not linked yet', 'node جديدة، لسه مش متوصّلة') : message('Unlinked node', 'node اتشالت من الـ list') });
      }
      graphNodes.push({ id: 'null', label: 'null', tone: 'default', x: x(order.length + 1), y: ROW_Y });
      const edgeTone = from => from === s.written ? 'active' : from === s.removed ? 'muted' : 'default';
      const edges = [{ from: 'head', to: head ?? 'null', directed: true, tone: edgeTone('head') }];
      for (const id of [...order, ...extra]) edges.push({ from: id, to: nodes.get(id).next ?? 'null', directed: true, tone: edgeTone(id) });
      const markers = id => [id === head ? 'head' : '', id === s.prev ? 'prev' : '', id === s.current ? 'current' : '']
        .filter(Boolean).join(' · ');
      return {
        rows: [{ id: 'chain', label: message('List · following next from head', 'الـ list · ماشيين ورا next من الـ head'), layout: 'cards',
          cells: order.map((id, i) => ({ id, value: nodes.get(id).value, index: i, tone: toneOf(id), marker: markers(id) })) }],
        graph: { nodes: graphNodes, edges },
        collections: [
          { label: message('Operations', 'الـ operations'),
            values: data.operations.map((item, i) => (done || i < s.index ? '✓ ' : i === s.index ? '▶ ' : '') + opText(item)) },
          { label: message('Returned', 'اللي رجع'), values: s.results },
        ],
        note: message('Each arrow is a next pointer. A node belongs to the list only if you can reach it from head.',
          'كل سهم ده next pointer. الـ node تبقى في الـ list بس لو نقدر نوصلها من الـ head.'),
      };
    }

    function emit(kind, lines, title, explanation, equation = '', done = false) {
      const order = chain();
      const list = order.map(id => nodes.get(id).value);
      frames.push(copy({ kind, lines, title, explanation, equation,
        state: { done, result: done ? { list, results: s.results } : null, list, chain: order, head,
          operation: s.op ? opText(s.op) : null, operationIndex: s.index,
          current: s.current ?? null, prev: s.prev ?? null, pending: s.pending, removed: s.removed, condition: s.condition,
          hops: s.hops, comparisons: s.comparisons, writes: s.writes,
          totalHops: s.totalHops, totalComparisons: s.totalComparisons, totalWrites: s.totalWrites },
        variables: [
          { name: 'operation', value: s.op ? opText(s.op) : '—' },
          { name: 'head', value: val(head) },
          { name: 'current', value: show(s.current) },
          { name: 'prev', value: show(s.prev) },
          { name: 'length', value: order.length },
          { name: 'condition', value: s.condition ?? '—' },
        ],
        metrics: [
          { label: message('Hops this operation', 'خطوات المشي في الـ operation دي'), value: s.hops },
          { label: message('Value comparisons', 'مقارنات الأرقام'), value: s.comparisons },
          { label: message('Pointer writes', 'الـ pointers اللي اتغيّرت'), value: s.writes },
          { label: message('Total hops', 'كل خطوات المشي'), value: s.totalHops },
        ],
        scene: sceneFor(order, done),
      }));
    }

    const hop = () => { s.hops++; s.totalHops++; };
    const compare = () => { s.comparisons++; s.totalComparisons++; };
    const write = from => { s.writes++; s.totalWrites++; s.written = from; };
    const length = () => chain().length;

    function startWalk(lines, target) {
      s.current = head;
      s.condition = null;
      s.written = null;
      emit('start-walk', lines, message(`current = head (${val(head)})`, `current بيبدأ من الـ head (${val(head)})`),
        message(head === null ? 'head is null, so the walk is over before it starts.' :
          `There is no index to jump to ${target}. We start at the first node and can only move forward through next.`,
        head === null ? 'الـ head بـ null، يعني مفيش حاجة نمشي فيها أصلًا.' :
          `مفيش index نروح بيه للـ ${target} على طول. بنبدأ من أول node، ومش هنقدر نتحرّك غير لقدّام عن طريق next.`),
        `current = head = ${val(head)}`);
    }

    function walkCheck(line) {
      s.condition = s.current !== null;
      emit('walk-check', [line], s.condition ? message(`current is ${val(s.current)}: still inside the list`, `current على الـ ${val(s.current)}: لسه جوه الـ list`) :
        message('current is null: we walked off the end', 'current بقى null: خرجنا من آخر الـ list'),
      s.condition ? message('There is a node here, so check its value.', 'فيه node هنا، يبقى نشوف الرقم اللي فيها.') :
        head === null ? message('The list is empty: there is no node to check.', 'الـ list فاضية: مفيش ولا node نبص عليها.') :
        message('The last node\'s next was null, so every node has been checked.', 'الـ next بتاع آخر node كان null، يعني بصّينا على كل الـ nodes.'),
      `current != null → ${s.condition}`);
      return s.condition;
    }

    function step(line, withPrev) {
      const from = val(s.current);
      if (withPrev) s.prev = s.current;
      s.current = nodes.get(s.current).next;
      s.condition = null;
      hop();
      emit('step', [line], withPrev ? message(`prev → ${from}, current → ${val(s.current)}`, `prev بقى على الـ ${from}، و current على ${val(s.current)}`) :
        message(`current → ${val(s.current)}`, `current بقى على ${val(s.current)}`),
      withPrev ? message(`Hop ${s.hops}. prev stays one node behind current, because next only points forward and we will need the node before the target.`,
        `دي خطوة رقم ${s.hops}. prev بيفضل ورا current بـ node واحدة، عشان next بيشاور لقدّام بس، وإحنا هنحتاج الـ node اللي قبل الـ target.`) :
        message(`Hop ${s.hops}: follow the next pointer of ${from}. There is no shortcut through a linked list.`,
          `دي خطوة رقم ${s.hops}: بنمشي ورا الـ next بتاع الـ ${from}. مفيش اختصار في الـ linked list.`),
      withPrev ? 'prev = current; current = current.next' : `current = ${from}.next = ${val(s.current)}`);
    }

    // find's loop, shared by find and insertAfter. Returns the matching node id or null.
    function walkFind(target, context) {
      startWalk(context === 'find' ? [14] : [29, 14], target);
      while (walkCheck(15)) {
        compare();
        const value = val(s.current);
        s.condition = value === target;
        if (s.condition) {
          s.hit = s.current;
          emit('found', [16], message(`${value} == ${target}: found`, `${value} == ${target}: لقيناه`),
            context === 'find' ? message(`Found after ${s.comparisons} comparisons and ${s.hops} hops. If ${target} were last or missing, find would check all ${length()} nodes: O(n).`,
              `لقيناه، وعدد المقارنات ${s.comparisons} وخطوات المشي ${s.hops}. لو الـ ${target} كان آخر node أو مش موجود، كنا هنبص على كل الـ nodes، وعددهم ${length()}: O(n).`) :
              message(`The ${target} node is where the new node goes after. Reaching it cost ${s.hops} hops.`,
                `الـ node بتاعة ${target} هي اللي الـ node الجديدة هتيجي بعدها. عدد خطوات المشي لحد ما وصلنا لها: ${s.hops}.`),
            `${value} == ${target} → true`);
          return s.current;
        }
        emit('compare', [16], message(`${value} ≠ ${target}`, `الـ ${value} مش ${target}`),
          message(`Not this node. Move on to its next.`, 'مش دي. هنكمّل على الـ next بتاعها.'), `${value} == ${target} → false`);
        step(17, false);
      }
      return null;
    }

    function insertHead(value) {
      emit('op', [OP_LINE.insertHead], message(`insertHead ${value}`, `بنعمل insertHead للـ ${value}`),
        message(head === null ? `The list is empty, so ${value} will be its only node. We never walk: only head and the new node change.` :
          `${value} goes in front of ${val(head)}. We never walk the list: only head and the new node change.`,
        head === null ? `الـ list فاضية، فالـ ${value} هيبقى الـ node الوحيدة فيها. مش هنمشي خالص، اللي هيتغيّر الـ head والـ node الجديدة بس.` :
          `الـ ${value} هيدخل قبل الـ ${val(head)}. مش هنمشي في الـ list خالص، اللي هيتغيّر الـ head والـ node الجديدة بس.`),
        `insertHead(list, ${value})`);
      s.pending = make(value);
      s.pendingAfter = 'head';
      emit('create', [2], message(`Create a node for ${value}`, `بنعمل node جديدة فيها ${value}`),
        message('It exists in memory, but nothing points to it yet, so it is not in the list. Its next starts as null.',
          'الـ node دي موجودة في الـ memory، بس مفيش pointer بيشاور عليها، فهي لسه مش في الـ list. والـ next بتاعها null لحد دلوقتي.'),
        `node = new Node(${value})`);
      nodes.get(s.pending).next = head;
      write(s.pending);
      emit('link', [3], message(`${value}.next → ${val(head)}`, `الـ next بتاع الـ ${value} بقى بيشاور على ${val(head)}`),
        head === null ? message('head is null, so the new node\'s next stays null: it will also be the last node.',
          'الـ head بـ null، فالـ next بتاع الـ node الجديدة فضل null، يعني هي كمان هتبقى آخر node.') :
          message(`Point the new node at ${val(head)} before moving head. If head moved first, we would lose the only way to reach the old nodes.`,
            `بنخلّي الـ node الجديدة تشاور على الـ ${val(head)} قبل ما نحرّك الـ head. لو حرّكنا الـ head الأول، هنضيّع الطريق الوحيد للـ nodes القديمة.`),
        `node.next = head = ${val(head)}`);
      head = s.pending;
      write('head');
      s.hit = s.pending;
      s.pending = null;
      emit('head', [4], message(`head → ${value}`, `الـ head بقى بيشاور على ${value}`),
        message(`${value} is first now. It took ${s.writes} pointer writes and no hops, whatever the length: insertHead is O(1).`,
          `الـ ${value} بقى أول node. غيّرنا pointers اتنين بس ومن غير ولا خطوة مشي، مهما كان طول الـ list. يبقى الـ insertHead بـ O(1).`),
        'head = node');
      s.results.push(`insertHead ${value} ✓`);
    }

    function append(value) {
      const before = length();
      emit('op', [OP_LINE.append], message(`append ${value}`, `بنعمل append للـ ${value}`),
        message(before ? 'The list does not store its tail. To add at the end we must start at head and walk until a node\'s next is null.' :
          'The list is empty, so the new node will simply become head.',
        before ? 'الـ list مش حافظة آخر node فين. عشان نضيف في الآخر لازم نبدأ من الـ head ونمشي لحد node الـ next بتاعها null.' :
          'الـ list فاضية، فالـ node الجديدة هتبقى هي الـ head على طول.'),
        `append(list, ${value})`);
      s.pending = make(value);
      s.pendingAfter = head === null ? 'head' : chain().at(-1);
      emit('create', [6], message(`Create a node for ${value}`, `بنعمل node جديدة فيها ${value}`),
        message('Nothing points to it yet. Its next is null, which is right for a node that will be last.',
          'مفيش حاجة بتشاور عليها لسه. والـ next بتاعها null، وده مظبوط لـ node هتبقى في الآخر.'),
        `node = new Node(${value})`);
      s.condition = head === null;
      emit('empty-check', [7], s.condition ? message('head is null: the list is empty', 'الـ head بـ null: الـ list فاضية') :
        message(`head is ${val(head)}: the list is not empty`, `الـ head على الـ ${val(head)}: الـ list مش فاضية`),
      s.condition ? message('With no nodes there is no tail to find; head itself takes the new node.', 'مفيش nodes، يبقى مفيش آخر node ندوّر عليه. الـ head نفسه هياخد الـ node الجديدة.') :
        message('We need the tail, and the only way there is through every next pointer.', 'محتاجين آخر node، والطريق الوحيد ليها إننا نعدّي على كل next pointer.'),
      `head == null → ${s.condition}`);
      const node = s.pending;
      if (s.condition) {
        head = node;
        write('head');
        s.hit = node;
        s.pending = null;
        s.condition = null;
        emit('head', [8], message(`head → ${value}`, `الـ head بقى بيشاور على ${value}`),
          message('The empty case needs no walk: 0 hops, one pointer write.', 'في حالة الـ list الفاضية مش محتاجين نمشي: صفر خطوات، و pointer واحد اتغيّر.'),
          'head = node; return');
        s.results.push(`append ${value} ✓`);
        return;
      }
      s.current = head;
      s.condition = null;
      emit('start-walk', [9], message(`current = head (${val(head)})`, `current بيبدأ من الـ head (${val(head)})`),
        message('Start at the first node. We can only move forward through next.', 'بنبدأ من أول node، ومش هنقدر نتحرّك غير لقدّام عن طريق next.'),
        `current = head = ${val(head)}`);
      while (true) {
        const next = nodes.get(s.current).next;
        s.condition = next !== null;
        emit('tail-check', [10], s.condition ? message(`${val(s.current)}.next is ${val(next)}: keep walking`, `الـ next بتاع الـ ${val(s.current)} على ${val(next)}: نكمّل`) :
          message(`${val(s.current)}.next is null: this is the tail`, `الـ next بتاع الـ ${val(s.current)} بـ null: دي آخر node`),
        s.condition ? message(`${val(s.current)} is not the last node, because something comes after it.`, `الـ ${val(s.current)} مش آخر node، عشان فيه حاجة بعده.`) :
          message(`Found the tail after ${s.hops} hops.`, `لقينا آخر node، وعدد خطوات المشي ${s.hops}.`),
        `current.next != null → ${s.condition}`);
        if (!s.condition) break;
        step(11, false);
      }
      nodes.get(s.current).next = node;
      write(s.current);
      s.hit = node;
      s.pending = null;
      s.condition = null;
      emit('relink', [12], message(`${val(s.current)}.next → ${value}`, `الـ next بتاع الـ ${val(s.current)} بقى بيشاور على ${value}`),
        message(`Hook ${value} after the old tail. It took ${s.hops} hops for ${before} nodes (n − 1). Without a tail pointer append is O(n); keeping one would make it O(1).`,
          `ربطنا الـ ${value} بعد آخر node. عدد خطوات المشي ${s.hops}، وعدد الـ nodes ${before}، يعني n − 1. من غير tail pointer الـ append بـ O(n)، ولو حافظين الـ tail هتبقى O(1).`),
        'current.next = node');
      s.results.push(`append ${value} ✓`);
    }

    function find(value) {
      emit('op', [OP_LINE.find], message(`find ${value}`, `بنعمل find للـ ${value}`),
        message('A linked list has no index, so searching means visiting nodes one by one from head.',
          'الـ linked list مفيهاش index، فالـ search معناه إننا نزور الـ nodes واحدة واحدة من الـ head.'),
        `find(list, ${value})`);
      const found = walkFind(value, 'find');
      if (found === null) {
        s.condition = null;
        emit('not-found', [18], message(`${value} is not in the list`, `الـ ${value} مش موجود في الـ list`),
          message(`We checked ${s.comparisons} nodes and reached null. This is find's worst case: every node, O(n).`,
            `بصّينا على كل الـ nodes (عدد المقارنات ${s.comparisons}) ووصلنا لـ null. ده الـ worst case بتاع الـ find: كل الـ nodes، يعني O(n).`),
          'return null');
      }
      s.results.push(`find ${value} → ${found === null ? 'null' : 'node'}`);
    }

    function remove(value) {
      emit('op', [OP_LINE.delete], message(`delete ${value}`, `بنعمل delete للـ ${value}`),
        message('To unlink a node we must change the next of the node before it. next only points forward, so we walk with prev one step behind current.',
          'عشان نشيل node لازم نغيّر الـ next بتاع الـ node اللي قبلها. والـ next بيشاور لقدّام بس، فهنمشي و prev ورا current بخطوة.'),
        `delete(list, ${value})`);
      s.prev = null;
      s.current = head;
      emit('start-walk', [20], message(`prev = null, current = head (${val(head)})`, `prev بـ null، و current بيبدأ من الـ head (${val(head)})`),
        message(head === null ? 'The list is empty: current is already null.' : 'Nothing comes before the first node, so prev starts as null.',
          head === null ? 'الـ list فاضية: current بـ null من الأول.' : 'مفيش حاجة قبل أول node، فـ prev بيبدأ null.'),
        `prev = null; current = ${val(head)}`);
      while (walkCheck(21)) {
        compare();
        const current = val(s.current);
        s.condition = current === value;
        if (s.condition) {
          s.hit = s.current;
          emit('match', [22], message(`${current} == ${value}: stop here`, `${current} == ${value}: هنقف هنا`),
            s.prev === null ? message('prev is null, so the target is the first node: head itself has to move.',
              'prev بـ null، يعني الـ target هو أول node، والـ head نفسه هو اللي هيتحرّك.') :
              message(`prev is ${val(s.prev)}: that is the node whose next must skip ${value}.`,
                `prev على الـ ${val(s.prev)}: دي الـ node اللي الـ next بتاعها لازم يعدّي الـ ${value}.`),
            `${current} == ${value} → true`);
          break;
        }
        emit('compare', [22], message(`${current} ≠ ${value}`, `الـ ${current} مش ${value}`),
          message('Not this one. Move both pointers forward.', 'مش دي. هنحرّك الـ pointers الاتنين لقدّام.'), `${current} == ${value} → false`);
        step(23, true);
      }
      if (s.current === null) {
        s.condition = null;
        emit('not-found', [24], message(`${value} is not in the list`, `الـ ${value} مش موجود في الـ list`),
          message(head === null ? 'Deleting from an empty list finds nothing. Nothing is unlinked; delete returns false.' :
            `current reached null after ${s.comparisons} comparisons. Nothing is unlinked; delete returns false.`,
          head === null ? 'الـ delete من list فاضية مش هيلاقي حاجة. مفيش node اتشالت، والـ delete بترجع false.' :
            `current وصل لـ null، وعدد المقارنات ${s.comparisons}. مفيش node اتشالت، والـ delete بترجع false.`),
          'return false');
        s.results.push(`delete ${value} → false`);
        return;
      }
      const target = s.current;
      const after = nodes.get(target).next;
      s.condition = null;
      s.hit = null;
      s.removed = target;
      s.removedAfter = s.prev === null ? 'head' : s.prev;
      if (s.prev === null) {
        head = after;
        write('head');
      } else {
        nodes.get(s.prev).next = after;
        write(s.prev);
      }
      const holder = s.prev === null ? 'head' : `${val(s.prev)}.next`;
      emit('unlink', [s.prev === null ? 25 : 26], message(`${holder} → ${val(after)}`, `الـ ${holder} بقى بيشاور على ${val(after)}`),
        message(`The chain now skips ${value} with one pointer write. Nothing shifts like in an array; the O(n) part was finding the node and its prev (${s.hops} hops).`,
          `السلسلة دلوقتي بتعدّي الـ ${value}، وده بتغيير pointer واحد. مفيش حاجة بتتزق زي الـ array. الجزء اللي بـ O(n) كان إننا نلاقي الـ node والـ prev بتاعها (عدد خطوات المشي ${s.hops}).`),
        s.prev === null ? `head = current.next = ${val(after)}` : `prev.next = current.next = ${val(after)}`);
      nodes.delete(target);
      s.removed = null;
      s.current = undefined;
      const remaining = chain().some(id => nodes.get(id).value === value);
      emit('removed', [27], message(`${value} is gone: return true`, `الـ ${value} اتشال: بنعمل return true`),
        message(`Nothing points to that node anymore, so it is unreachable and its memory can be freed.${remaining ? ` Another ${value} is still there: delete stops at the first match.` : ''}`,
          `مفيش حاجة بتشاور على الـ node دي خلاص، فمحدّش يقدر يوصلها، والـ memory بتاعتها ممكن تتفضّى.${remaining ? ` لسه فيه ${value} تاني في الـ list، عشان الـ delete بتقف عند أول match.` : ''}`),
        'return true');
      s.results.push(`delete ${value} → true`);
    }

    function insertAfter(target, value) {
      emit('op', [OP_LINE.insertAfter], message(`insertAfter ${target} ${value}`, `بنعمل insertAfter للـ ${value} بعد الـ ${target}`),
        message(`First find the node holding ${target}; that walk is O(n). The insertion itself is just two pointer writes.`,
          `الأول بندوّر على الـ node اللي فيها ${target}، والمشي ده بـ O(n). أما الإضافة نفسها فهي تغيير pointers اتنين بس.`),
        `insertAfter(list, ${target}, ${value})`);
      const anchor = walkFind(target, 'insertAfter');
      if (anchor === null) {
        s.condition = null;
        emit('not-found', [18, 30], message(`${target} is not in the list`, `الـ ${target} مش موجود في الـ list`),
          message(`find returned null after ${s.comparisons} comparisons, so there is nowhere to insert. No node is created; return false.`,
            `الـ find رجّعت null، وعدد المقارنات ${s.comparisons}، فمفيش مكان نضيف فيه. مش هنعمل node جديدة، وبنعمل return false.`),
          'current == null → return false');
        s.results.push(`insertAfter ${target} ${value} → false`);
        return;
      }
      s.hit = null;
      s.condition = null;
      s.pending = make(value);
      s.pendingAfter = anchor;
      emit('create', [31], message(`Create a node for ${value}`, `بنعمل node جديدة فيها ${value}`),
        message(`current is the ${target} node. The new node is not linked to anything yet.`, `current على الـ ${target}. والـ node الجديدة لسه مش متوصّلة بحاجة.`),
        `node = new Node(${value})`);
      const after = nodes.get(anchor).next;
      nodes.get(s.pending).next = after;
      write(s.pending);
      emit('link', [32], message(`${value}.next → ${val(after)}`, `الـ next بتاع الـ ${value} بقى بيشاور على ${val(after)}`),
        message(`Copy current.next into the new node first, so ${after === null ? 'it ends the list' : `the rest of the list from ${val(after)} stays reachable`}.`,
          `بننسخ current.next في الـ node الجديدة الأول، ${after === null ? 'فهي هتبقى آخر node' : `عشان باقي الـ list من أول الـ ${val(after)} يفضل نقدر نوصله`}.`),
        `node.next = current.next = ${val(after)}`);
      nodes.get(anchor).next = s.pending;
      write(anchor);
      s.hit = s.pending;
      s.pending = null;
      emit('relink', [33], message(`${target}.next → ${value}`, `الـ next بتاع الـ ${target} بقى بيشاور على ${value}`),
        message(`${value} is in the list. ${s.writes} pointer writes and nothing moved; the cost was the find walk (${s.hops} hops), O(n).`,
          `الـ ${value} بقى في الـ list. غيّرنا pointers اتنين بس ومفيش حاجة اتزقّت. التكلفة كلها كانت في مشي الـ find (عدد الخطوات ${s.hops})، يعني O(n).`),
        'current.next = node');
      s.results.push(`insertAfter ${target} ${value} ✓`);
    }

    const count = data.operations.length;
    emit('ready', [], message(head === null ? 'An empty list: head is null' : 'A chain of nodes starting at head',
      head === null ? 'list فاضية: الـ head بـ null' : 'سلسلة nodes بتبدأ من الـ head'),
    message(`${data.values.length} nodes and ${count} operations. Each arrow is a next pointer; the list is whatever you reach by following arrows from head until null.`,
      `عدد الـ nodes ${data.values.length}، وعدد الـ operations ${count}. كل سهم ده next pointer، والـ list هي كل اللي نوصله لما نمشي ورا الأسهم من الـ head لحد null.`));

    data.operations.forEach((item, i) => {
      Object.assign(s, { index: i, op: item, current: undefined, prev: undefined, pending: null, pendingAfter: null,
        removed: null, removedAfter: null, hit: null, written: null, condition: null, hops: 0, comparisons: 0, writes: 0 });
      if (item.op === 'insertHead') insertHead(item.value);
      else if (item.op === 'append') append(item.value);
      else if (item.op === 'find') find(item.value);
      else if (item.op === 'delete') remove(item.value);
      else insertAfter(item.target, item.value);
    });

    Object.assign(s, { index: count, op: null, current: undefined, prev: undefined, pending: null, hit: null, written: null,
      condition: null, hops: 0, comparisons: 0, writes: 0 });
    const size = length();
    emit('done', [], message(count ? 'All operations are done' : 'No operations to run', count ? 'خلّصنا كل الـ operations' : 'مفيش operations نشغّلها'),
      message(`The list has ${size} nodes. In total: ${s.totalHops} hops, ${s.totalComparisons} value comparisons and ${s.totalWrites} pointer writes.`,
        `عدد الـ nodes في الـ list دلوقتي ${size}. في المجموع: خطوات المشي ${s.totalHops}، والمقارنات ${s.totalComparisons}، والـ pointers اللي اتغيّرت ${s.totalWrites}.`),
      '', true);
    return frames;
  }

  const defaults = { values: '3, 8, 5', operations: 'insertHead 1\nappend 9\nfind 5\ndelete 8\ninsertAfter 5 7' };
  const lesson = {
    id: 'linked-list', name: 'Linked List', theme: 'data-structures', category: 'structure', number: '12',
    label: 'LINKED LIST', cost: 'O(n)',
    description: message('Nodes chained by next pointers from head. Adding at the front is O(1); anything else starts with a walk from head.',
      'nodes ماسكة في بعض بـ next pointers من الـ head. الإضافة في الأول بـ O(1)، وأي حاجة تانية بتبدأ بمشي من الـ head.'),
    note: message('Singly linked, head pointer only (no tail). find, delete and insertAfter act on the first matching value. At most 6 nodes so the chain fits on screen.',
      'singly linked، وفيه head pointer بس من غير tail. الـ find والـ delete والـ insertAfter بيشتغلوا على أول رقم يطابق. لحد 6 nodes عشان السلسلة تبان كلها.'),
    code,
    keySteps: ['ready', 'op', 'create', 'link', 'relink', 'head', 'tail-check', 'compare', 'found', 'match', 'unlink', 'removed', 'not-found', 'done'],
    view: {
      legend: [
        { tone: 'active', role: 'current', label: message('current', 'current') },
        { tone: 'pivot', role: 'peek', label: message('prev', 'prev') },
        { tone: 'found', role: 'path', label: message('New node or match', 'node جديدة أو لقيناها') },
      ],
    },
    fields: [
      { name: 'values', type: 'text', maxLength: MAX_VALUES_LENGTH,
        label: message('Starting list · head first', 'الـ list في الأول · من الـ head'),
        help: message('Integers from -99 to 999, separated by commas or spaces, in order from head. Up to 6; duplicates allowed. Blank means an empty list.',
          'أرقام صحيحة من -99 لحد 999، بينهم comma أو مسافة، بالترتيب من الـ head. لحد 6 أرقام، وعادي تتكرّر. لو سبته فاضي يبقى list فاضية.') },
      { name: 'operations', type: 'textarea', maxLength: MAX_OPERATIONS_LENGTH,
        label: message('Operations · run in order', 'الـ operations · بتتنفّذ بالترتيب'),
        help: message('One per line or comma-separated: insertHead 4, append 9, find 5, delete 8, insertAfter 5 7 (puts 7 after the first 5). Values from -99 to 999; up to 12 operations; the list may never exceed 6 nodes. Names ignore case. Blank means none.',
          'واحدة في كل سطر أو بينهم comma: insertHead 4، append 9، find 5، delete 8، insertAfter 5 7 (بتحط 7 بعد أول 5). الأرقام من -99 لحد 999، ولحد 12 operation، والـ list عمرها ما تعدّي 6 nodes. الـ capital والـ small زي بعض. لو سبته فاضي يبقى مفيش operations.') },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Every operation once', 'كل operation مرة'), input: { ...defaults } },
      { id: 'empty', label: message('Start from an empty list', 'نبدأ من list فاضية'),
        input: { values: '', operations: 'delete 4\nfind 4\nappend 6\ninsertHead 2\nappend 8' } },
      { id: 'not-found', label: message('Values that are not there', 'أرقام مش موجودة'),
        input: { values: '4, 7, 2', operations: 'find 9\ndelete 9\ninsertAfter 9 5' } },
      { id: 'duplicates', label: message('Duplicates: first match only', 'أرقام مكرّرة: أول match بس'),
        input: { values: '5, 2, 5, 5', operations: 'delete 5\nfind 5\ninsertAfter 5 1\ndelete 5' } },
      { id: 'tail', label: message('Append to a long list, then delete the tail', 'append لـ list طويلة، وبعدين نشيل آخر node'),
        input: { values: '1, 2, 3, 4, 5', operations: 'append 6\ndelete 6\ninsertHead 0' } },
    ],
    parse, build,
    summary(input) {
      const data = validate(input);
      return message(`${data.values.length} starting nodes · ${data.operations.length} operations · head only, no tail pointer`,
        `عدد الـ nodes في الأول ${data.values.length} · عدد الـ operations ${data.operations.length} · head بس من غير tail pointer`);
    },
    theory: {
      title: message('Linked list: nodes held together by pointers', 'الـ linked list: nodes ماسكة في بعض بـ pointers'),
      idea: message('Each node holds a value and a pointer to the next node; the list itself is only a pointer to the first one, called head. To reach any node you follow the pointers from head, one node at a time.',
        'كل node فيها رقم و pointer على الـ node اللي بعدها، والـ list نفسها مجرد pointer على أول node اسمه head. عشان توصل لأي node لازم تمشي ورا الـ pointers من الـ head، node ورا node.'),
      intro: message('An array keeps elements side by side in memory, so element i is one address calculation away. A linked list allocates each node separately, wherever memory is free, and stores the address of the next node inside it. That makes reaching position i a walk of i hops, but it also means inserting or removing never shifts other elements: once you stand at the right node, you rewrite one or two pointers. You need: nodes with value and next, a head pointer, and null to mark the end.',
        'الـ array بتحط الـ elements جنب بعض في الـ memory، فأي element على بعد حسبة واحدة. الـ linked list بتعمل كل node لوحدها في أي مكان فاضي في الـ memory، وجوه كل node عنوان الـ node اللي بعدها. علشان كده الوصول لمكان رقم i محتاج i خطوات مشي، بس الإضافة والمسح عمرهم ما بيزقّوا elements تانية: أول ما توصل للـ node الصح، بتغيّر pointer أو اتنين وخلاص. محتاج: nodes فيها value و next، و head pointer، و null يعلّم آخر الـ list.'),
      invariant: message('Following next from head visits every node of the list exactly once and ends at null. Every operation rewrites pointers in an order that never cuts the chain: link the new node to what follows before anything points to it, and unlink by pointing past a node, never into it.',
        'لو مشيت ورا next من الـ head هتعدّي على كل node في الـ list مرة واحدة بالظبط وتوصل لـ null. وكل operation بتغيّر الـ pointers بترتيب عمره ما يقطع السلسلة: بنوصّل الـ node الجديدة باللي بعدها قبل ما أي حاجة تشاور عليها، وبنشيل node بإننا نشاور على اللي بعدها.'),
      steps: [
        { title: message('1. insertHead: two writes, no walk', '1. الـ insertHead: pointers اتنين ومن غير مشي'),
          body: message('Create the node, set node.next = head, then head = node. The order matters: moving head first would lose the old list. The cost does not depend on the length: O(1).',
            'بنعمل الـ node، وبعدين node.next = head، وبعدين head = node. الترتيب مهم: لو حرّكنا الـ head الأول هنضيّع الـ list القديمة. والتكلفة مش بتفرق مع الطول: O(1).') },
        { title: message('2. append: walk to the tail', '2. الـ append: بنمشي لآخر node'),
          body: message('With only head stored, the tail is found by walking while current.next != null: n − 1 hops for n nodes, so O(n). Then one write: tail.next = node. An empty list is the special case: head = node.',
            'لما يبقى عندنا head بس، آخر node بنلاقيها بإننا نمشي طول ما current.next != null: يعني n − 1 خطوات لـ n nodes، فدي O(n). وبعدين تغيير واحد: tail.next = node. الحالة الخاصة إن الـ list تبقى فاضية، ساعتها head = node.') },
        { title: message('3. find: visit nodes one by one', '3. الـ find: بنزور الـ nodes واحدة واحدة'),
          body: message('There is no index and no ordering to exploit, so find compares each node from head until a match or null. The worst case, a missing value, checks all n nodes: O(n).',
            'مفيش index ومفيش ترتيب نستفيد منه، فالـ find بتقارن كل node من الـ head لحد ما تلاقي match أو توصل لـ null. الـ worst case إن الرقم مش موجود، وساعتها بنبص على الـ n nodes كلهم: O(n).') },
        { title: message('4. delete: walk with prev, then relink', '4. الـ delete: بنمشي ومعانا prev، وبعدين نغيّر الـ pointer'),
          body: message('Removing a node means changing the next of the node before it, and next only points forward, so prev trails current. When current matches, set prev.next = current.next, or head = current.next if it was first. The relink is O(1); the search makes it O(n).',
            'إننا نشيل node معناه نغيّر الـ next بتاع الـ node اللي قبلها، والـ next بيشاور لقدّام بس، فـ prev بيمشي ورا current. لما current يطابق، بنعمل prev.next = current.next، أو head = current.next لو كانت أول node. تغيير الـ pointer بـ O(1)، والـ search هو اللي بيخلّيها O(n).') },
        { title: message('5. insertAfter: find, then two writes', '5. الـ insertAfter: find وبعدين pointers اتنين'),
          body: message('Find the target, then node.next = current.next and current.next = node, in that order. If you already hold the node, insertion is O(1); finding it by value is the O(n) part.',
            'بنعمل find للـ target، وبعدين node.next = current.next و current.next = node، بالترتيب ده. لو الـ node في إيدك أصلًا، الإضافة بـ O(1). الـ O(n) جاية من إننا ندوّر عليها بالرقم.') },
      ],
      notes: [
        message('Keeping a tail pointer makes append O(1) (it must then be updated by delete and insert). A doubly linked list adds prev pointers, so a node you already hold can be removed in O(1) without a walk.',
          'لو حافظنا على tail pointer الـ append تبقى O(1)، بس لازم نحدّثه في الـ delete والـ insert. والـ doubly linked list فيها prev pointer كمان، فأي node في إيدك تقدر تشيلها بـ O(1) من غير مشي.'),
        message('Pick a linked list when you insert or remove at the front, or next to a node you already hold, much more than you index or scan. Pick an array for indexing, binary search, sorting and fast scans: its elements sit together in memory, so the CPU cache helps, while list nodes are scattered.',
          'استخدم linked list لما الإضافة والمسح في الأول، أو جنب node في إيدك، يبقوا أكتر بكتير من الوصول بالـ index أو الـ scan. واستخدم array للـ index والـ binary search والـ sorting والـ scan السريع: الـ elements بتاعتها جنب بعض في الـ memory فالـ cache بيساعد، أما الـ nodes فمتفرّقة.'),
        message('Each node also stores a pointer, so a list of n values uses O(n) extra memory beyond the values. Stacks and queues are often built on linked lists because they only touch the ends.',
          'كل node شايلة pointer كمان، فـ list فيها n أرقام بتاخد O(n) memory زيادة غير الأرقام نفسها. والـ stack والـ queue كتير بيتبنوا على linked list عشان بيشتغلوا على الأطراف بس.'),
        message('This lesson deletes, finds and inserts after the first matching value only. Values can repeat; each node is still a separate node.',
          'في الدرس ده الـ delete والـ find والـ insertAfter بيشتغلوا على أول رقم يطابق بس. الأرقام ممكن تتكرّر، وكل node برضه node لوحدها.'),
      ],
      costs: [
        { label: message('insertHead', 'الـ insertHead'), value: 'O(1)' },
        { label: message('append, no tail pointer', 'الـ append من غير tail pointer'), value: 'O(n)' },
        { label: message('append with a tail pointer', 'الـ append مع tail pointer'), value: 'O(1)' },
        { label: message('find / access by position', 'الـ find / الوصول لمكان معيّن'), value: 'O(n)' },
        { label: message('delete by value', 'الـ delete بالرقم'), value: 'O(n)' },
        { label: message('insertAfter a value', 'الـ insertAfter بعد رقم'), value: 'O(n) find + O(1) link' },
        { label: message('Extra memory', 'الـ memory الزيادة'), value: 'O(n) pointers' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module === 'object' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
