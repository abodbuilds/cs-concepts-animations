(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const CAPACITY = 8;
  const MAX_OPERATIONS = 12;
  const MIN_VALUE = -99;
  const MAX_VALUE = 999;
  const MAX_INITIAL_LENGTH = 64;
  const MAX_OPERATIONS_LENGTH = 240;
  const OPS = ['insert', 'extract', 'peek'];

  const code = [
    'insert(heap, value):',
    '  if size(heap) == CAPACITY: error "overflow"',
    '  heap.append(value)',
    '  i = size(heap) - 1',
    '  while i > 0:',
    '    parent = (i - 1) // 2',
    '    if heap[parent] <= heap[i]: break',
    '    swap(heap[i], heap[parent])',
    '    i = parent',
    'extractMin(heap):',
    '  if heap is empty: error "underflow"',
    '  min = heap[0]',
    '  last = heap.pop()',
    '  if heap is not empty:',
    '    heap[0] = last',
    '    i = 0',
    '    while 2 * i + 1 < size(heap):',
    '      child = 2 * i + 1',
    '      right = child + 1',
    '      if right < size(heap) and heap[right] < heap[child]:',
    '        child = right',
    '      if heap[i] <= heap[child]: break',
    '      swap(heap[i], heap[child])',
    '      i = child',
    '  return min',
    'peek(heap):',
    '  if heap is empty: error "underflow"',
    '  return heap[0]',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const isValue = value => Number.isSafeInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE;
  const parentOf = i => Math.floor((i - 1) / 2);
  const heightOf = size => size > 0 ? Math.floor(Math.log2(size)) : 0;
  const describe = op => op.op === 'insert' ? `insert ${op.value}` : op.op;
  const westernDigits = text => text
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));

  // Public build input: {initial: number[], operations: [{op:'insert', value} | {op:'extract'} | {op:'peek'}]}.
  // Copy and check everything here so build enforces the same limits as parse.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        !Array.isArray(input.initial) || !Array.isArray(input.operations)) {
      fail('Expected an object with initial and operations arrays.',
        'محتاجين object جواه initial و operations، والاتنين arrays.');
    }
    if (input.initial.length > CAPACITY) {
      fail(`The starting heap holds at most ${CAPACITY} values.`, `الـ heap في الأول ياخد ${CAPACITY} أرقام بالكتير.`);
    }
    if (input.operations.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operation بالكتير.`);
    }
    const initial = [];
    for (const value of input.initial) {
      if (!isValue(value)) {
        fail(`Every value must be an integer from ${MIN_VALUE} to ${MAX_VALUE}.`,
          `كل رقم لازم يكون صحيح ومن ${MIN_VALUE} لحد ${MAX_VALUE}.`);
      }
      initial.push(value);
    }
    const operations = [];
    for (const op of input.operations) {
      const keys = op && typeof op === 'object' && !Array.isArray(op) ? Object.keys(op).sort().join(',') : '';
      const ok = keys === 'op,value' ? op.op === 'insert' && isValue(op.value)
        : keys === 'op' && (op.op === 'extract' || op.op === 'peek');
      if (!ok) {
        fail(`Each operation is {op:'insert', value} with an integer from ${MIN_VALUE} to ${MAX_VALUE}, {op:'extract'} or {op:'peek'}.`,
          `كل operation لازم تبقى {op:'insert', value} برقم صحيح من ${MIN_VALUE} لـ ${MAX_VALUE}، أو {op:'extract'}، أو {op:'peek'}.`);
      }
      operations.push(op.op === 'insert' ? { op: 'insert', value: op.value } : { op: op.op });
    }
    return { initial, operations };
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) ||
        typeof rawInput.initial !== 'string' || typeof rawInput.operations !== 'string') {
      fail('Enter the starting heap and the operations as text.', 'اكتب الـ heap اللي بنبدأ بيه والـ operations كـ text.');
    }
    if (rawInput.initial.length > MAX_INITIAL_LENGTH || rawInput.operations.length > MAX_OPERATIONS_LENGTH) {
      fail(`Keep the starting heap within ${MAX_INITIAL_LENGTH} characters and the operations within ${MAX_OPERATIONS_LENGTH}.`,
        `خلّي الـ heap اللي في الأول في حدود ${MAX_INITIAL_LENGTH} حرف، والـ operations في حدود ${MAX_OPERATIONS_LENGTH} حرف.`);
    }
    const initialText = westernDigits(rawInput.initial).trim();
    if (initialText && !/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(initialText)) {
      fail('Write the starting heap as integers separated by commas or spaces, or leave it blank.',
        'اكتب الـ heap اللي في الأول أرقام صحيحة وافصل بينها بـ comma أو مسافة، أو سيبه فاضي.');
    }
    const initial = initialText ? initialText.split(/[,،\s]+/).map(Number) : [];
    const operations = [];
    for (const entry of westernDigits(rawInput.operations).split(/[,،;\r\n]+/)) {
      const token = entry.trim().toLowerCase();
      if (!token) continue;
      let match;
      if ((match = /^(?:insert|push)\s+([+-]?\d+)$/.exec(token))) operations.push({ op: 'insert', value: Number(match[1]) });
      else if (/^(?:extract|extractmin|pop)$/.test(token)) operations.push({ op: 'extract' });
      else if (/^(?:peek|top)$/.test(token)) operations.push({ op: 'peek' });
      else {
        fail(`"${entry.trim().slice(0, 20)}" is not an operation. Use insert 5 (or push 5), extract (or pop), or peek.`,
          `"${entry.trim().slice(0, 20)}" مش operation. استخدم insert 5 (أو push 5)، أو extract (أو pop)، أو peek.`);
      }
    }
    return validate({ initial, operations });
  }

  // Tree placement for the 440 × 336 canvas: one row per level, slots spread evenly across the width.
  function place(index) {
    const level = Math.floor(Math.log2(index + 1)), slot = index - (2 ** level - 1);
    return { x: Math.round(440 * (slot + 0.5) / 2 ** level * 10) / 10, y: 52 + level * 80 };
  }

  function build(input) {
    const { initial, operations } = validate(input);
    let nextId = 0;
    const heap = [];
    // The starting values go in with the same insert, before the first frame.
    for (const value of initial) {
      heap.push({ id: `heap-${nextId++}`, value });
      for (let i = heap.length - 1; i > 0 && heap[parentOf(i)].value > heap[i].value; i = parentOf(i)) {
        [heap[i], heap[parentOf(i)]] = [heap[parentOf(i)], heap[i]];
      }
    }
    const state = {
      heap, op: null, opIndex: null, i: null, parent: null, child: null, left: null, right: null,
      min: null, found: null, phase: 'ok', outputs: [], comparisons: 0, swaps: 0,
      condition: null, done: false, result: null,
    };
    const frames = [];
    const values = () => state.heap.map(entry => entry.value);

    function note() {
      const n = state.heap.length;
      if (!n) return message('The heap is empty.', 'الـ heap فاضي.');
      if (state.phase === 'up') {
        return message(`Heap order can only be broken between index ${state.i} and its parent.`,
          `الترتيب ممكن يبقى بايظ بس بين index ${state.i} والـ parent بتاعه.`);
      }
      if (state.phase === 'down') {
        return message(`Heap order can only be broken between index ${state.i} and its children.`,
          `الترتيب ممكن يبقى بايظ بس بين index ${state.i} والـ children بتوعه.`);
      }
      return message(`Heap order holds: every parent ≤ its children. The minimum ${state.heap[0].value} is at index 0.`,
        `الـ heap order صح: كل parent أصغر من أو بيساوي الـ children بتوعه. أصغر رقم، الـ ${state.heap[0].value}، عند index 0.`);
    }

    function scene() {
      const n = state.heap.length, focus = new Set([state.parent, state.child, state.left, state.right].filter(v => v !== null));
      const toneAt = index => index === state.found ? 'found' : index === state.i ? 'active' : focus.has(index) ? 'pivot' : 'default';
      const markerAt = index => {
        const marks = [];
        if (index === state.i) marks.push('i');
        if (index === state.parent) marks.push('parent');
        if (index === state.child) marks.push('child');
        else if (index === state.left || index === state.right) marks.push(index === state.left ? 'left' : 'right');
        if (index === state.found) marks.push('min');
        return marks.join(' · ');
      };
      const edgeActive = child => state.i !== null && (
        (child === state.i && state.parent === parentOf(child)) ||
        (parentOf(child) === state.i && (child === state.child || child === state.left || child === state.right)));
      return {
        rows: [{
          id: 'heap', label: message('Heap array', 'الـ heap array'), layout: 'cards',
          cells: state.heap.map((entry, index) => ({ id: entry.id, value: entry.value, index, tone: toneAt(index), marker: markerAt(index) })),
        }],
        graph: n ? {
          nodes: state.heap.map((entry, index) => ({ id: entry.id, label: String(entry.value), tone: toneAt(index),
            detail: message(`index ${index}`, `index ${index}`), ...place(index) })),
          edges: state.heap.slice(1).map((entry, k) => ({ from: state.heap[parentOf(k + 1)].id, to: entry.id,
            tone: edgeActive(k + 1) ? 'active' : 'default' })),
        } : null,
        collections: [{ label: message('Results', 'النتايج'), values: [...state.outputs] }],
        note: note(),
      };
    }

    function emit(kind, lines, title, explanation, equation = '') {
      const dash = value => value === null ? '—' : value;
      frames.push(copy({
        kind, lines, title, explanation, equation, state: { ...state, heap: state.heap },
        variables: [
          { name: 'op', value: state.op ? describe(state.op) : '—' },
          { name: 'i', value: dash(state.i) },
          { name: 'parent', value: dash(state.parent) },
          { name: 'child', value: dash(state.child) },
          { name: 'min', value: dash(state.min) },
          { name: 'size', value: state.heap.length },
        ],
        metrics: [
          { label: message('Comparisons', 'المقارنات'), value: state.comparisons },
          { label: message('Swaps', 'الـ swaps'), value: state.swaps },
          { label: message('Size', 'الـ size'), value: `${state.heap.length} / ${CAPACITY}` },
          { label: message('Height ⌊log₂ n⌋', 'الـ height ⌊log₂ n⌋'), value: state.heap.length ? heightOf(state.heap.length) : '—' },
        ],
        scene: scene(),
      }));
    }

    function clearFocus() {
      state.i = null; state.parent = null; state.child = null; state.left = null; state.right = null;
      state.found = null; state.condition = null; state.phase = 'ok';
    }

    const n0 = initial.length;
    emit('ready', [],
      message('A min-heap: the smallest value on top', 'min-heap: أصغر رقم فوق'),
      n0 ? message(`The heap starts with ${n0} values, inserted in order before the script. Every parent is ≤ its children, so the minimum sits at index 0. ${operations.length} operations to run.`,
        `الـ heap بيبدأ بـ ${n0} أرقام، دخّلناهم بالترتيب قبل الـ operations. كل parent أصغر من أو بيساوي الـ children بتوعه، فأصغر رقم دايمًا عند index 0. عدد الـ operations: ${operations.length}.`)
        : message(`The heap starts empty. ${operations.length} operations to run.`,
          `الـ heap بيبدأ فاضي. عدد الـ operations: ${operations.length}.`));

    function insert(value) {
      const n = state.heap.length;
      if (n === CAPACITY) {
        state.outputs.push(`insert ${value}: overflow`);
        emit('overflow', [1, 2], message('Overflow: the heap is full', 'overflow: الـ heap مليان'),
          message(`All ${CAPACITY} slots are used. This lab gives the array a fixed capacity of ${CAPACITY}, so insert ${value} fails and the heap stays the same.`,
            `الـ ${CAPACITY} أماكن كلهم مليانين. الـ array هنا مساحتها ثابتة، ${CAPACITY} أرقام بس، فالـ insert ${value} بيفشل والـ heap بيفضل زي ما هو.`),
          `size ${n} == CAPACITY ${CAPACITY}`);
        return;
      }
      emit('operation', [1, 2], message(`insert ${value}`, `بنعمل insert للـ ${value}`),
        message(`The heap uses ${n} of ${CAPACITY} slots, so there is room. The new value goes to the end of the array, then climbs while it is smaller than its parent.`,
          `الـ heap مستخدم ${n} من ${CAPACITY} أماكن، يعني لسه فيه مكان. الرقم الجديد هيروح آخر الـ array، وبعدين يطلع لفوق طول ما هو أصغر من الـ parent بتاعه.`),
        `size ${n} < CAPACITY ${CAPACITY}`);

      state.heap.push({ id: `heap-${nextId++}`, value });
      state.i = n; state.phase = n ? 'up' : 'ok';
      const p0 = parentOf(n);
      emit('append', [3, 4], message(`Append ${value} at index ${n}`, `الـ ${value} بيروح آخر مكان، index ${n}`),
        n ? message(`Index ${n} is the next free slot of the bottom level, filled left to right, so the tree stays complete. Its parent is at (${n} − 1) // 2 = ${p0}.`,
          `index ${n} هو أول مكان فاضي في آخر level، والـ level بيتملي من الشمال لليمين، فالـ tree بتفضل complete. الـ parent بتاعه عند (${n} − 1) // 2 = ${p0}.`)
          : message(`The heap was empty, so ${value} becomes the root at index 0.`, `الـ heap كان فاضي، فالـ ${value} بقى الـ root عند index 0.`),
        `heap.append(${value}); i = ${n}`);

      while (true) {
        const i = state.i;
        if (i === 0) {
          state.phase = 'ok'; state.parent = null;
          emit('reached-root', [5], message(`${value} is at the root`, `الـ ${value} وصل للـ root`),
            message(`i = 0, so the while condition i > 0 is false. ${value} is the minimum now.`,
              `i = 0، فالـ condition i > 0 طلع false. الـ ${value} بقى أصغر رقم في الـ heap.`),
            '0 > 0 → false');
          return;
        }
        const p = parentOf(i), pv = state.heap[p].value;
        state.parent = p; state.comparisons++; state.condition = pv <= value;
        if (state.condition) state.phase = 'ok';
        emit('compare-parent', [5, 6, 7],
          state.condition ? message(`${pv} ≤ ${value}: stop here`, `الـ ${pv} مش أكبر من الـ ${value}، يبقى بنقف هنا`)
            : message(`${value} < ${pv}: swap up`, `الـ ${value} أصغر من الـ parent، يبقى هنعمل swap`),
          state.condition ? message(`The parent at index ${p} holds ${pv}, which is not larger than ${value}. Order holds on this edge and every edge above was already fine, so insert is done.`,
            `الـ parent عند index ${p} فيه ${pv}، ومش أكبر من الـ ${value}. يعني الترتيب صح على الـ edge ده، واللي فوقه كان صح أصلًا، فالـ insert خلص.`)
            : message(`The parent at index ${p} holds ${pv}, which is larger than ${value}. The smaller value must sit above, so swap them.`,
              `الـ parent عند index ${p} فيه ${pv}، وده أكبر من الـ ${value}. الأصغر لازم يبقى فوق، فهنعمل swap.`),
          `parent = (${i} − 1) // 2 = ${p}; ${pv} <= ${value} → ${state.condition}`);
        if (state.condition) return;

        [state.heap[i], state.heap[p]] = [state.heap[p], state.heap[i]];
        state.swaps++; state.i = p; state.parent = null; state.condition = null;
        const h = heightOf(state.heap.length);
        emit('swap-up', [8, 9], message(`Swap ${value} with its parent ${pv}`, `بنعمل swap للـ ${value} والـ ${pv}`),
          message(`${value} moves up to index ${p} and ${pv} drops to index ${i}. Each swap climbs one level, so with ${state.heap.length} values insert makes at most ${h} swaps: O(log n).`,
            `الـ ${value} طلع لـ index ${p}، والـ ${pv} نزل لـ index ${i}. كل swap بيطلّعنا level واحد، فمع ${state.heap.length} أرقام الـ insert بيعمل ${h} swaps بالكتير، يعني O(log n).`),
          `swap(heap[${i}], heap[${p}]); i = ${p}`);
      }
    }

    function extract() {
      const n = state.heap.length;
      if (!n) {
        state.outputs.push('extract: underflow');
        emit('underflow', [10, 11], message('Underflow: nothing to extract', 'underflow: مفيش حاجة نطلّعها'),
          message('The heap is empty, so there is no minimum. extractMin reports underflow instead of returning a value.',
            'الـ heap فاضي، يعني مفيش أصغر رقم أصلًا. الـ extractMin بيرجّع underflow بدل رقم.'),
          'size 0 → underflow');
        return;
      }
      emit('operation', [10, 11], message('extractMin', 'بنعمل extractMin'),
        message(`The heap has ${n} values, so it is not empty. The minimum is always at index 0; removing it leaves a hole at the top that must be refilled.`,
          `الـ heap فيه ${n} أرقام، يعني مش فاضي. أصغر رقم دايمًا عند index 0. لما نشيله هيفضل مكان فاضي فوق، ولازم نملاه.`),
        `size ${n} > 0`);

      const min = state.heap[0].value;
      state.min = min; state.found = 0;
      emit('take-min', [12], message(`The minimum is ${min}`, `أصغر رقم هو الـ ${min}`),
        message(`Heap order puts the smallest value at the root, so reading it takes one step. Save min = ${min} to return it.`,
          `الـ heap order بيخلّي أصغر رقم في الـ root، فبنقراه في خطوة واحدة. بنحفظ min = ${min} عشان نعمله return.`),
        `min = heap[0] = ${min}`);

      state.outputs.push(`extract: ${min}`);
      const last = state.heap.pop();
      state.found = null;
      if (!state.heap.length) {
        emit('emptied', [13, 14], message('The heap is now empty', 'الـ heap بقى فاضي'),
          message(`${min} was the only value. heap.pop() removed it, so nothing has to move to the root.`,
            `الـ ${min} كان الرقم الوحيد. الـ heap.pop() شاله، فمفيش حاجة نحطها في الـ root.`),
          'heap.pop(); size = 0 → skip');
      } else {
        state.heap[0] = last; state.i = 0; state.phase = 'down';
        emit('move-last', [13, 14, 15, 16], message(`Move the last value ${last.value} to the root`, `آخر رقم، الـ ${last.value}، بيروح للـ root`),
          message(`Pop the last slot (index ${n - 1}) and write ${last.value} over the root. Taking the last value keeps the tree complete, but the root may now be too large, so it sifts down.`,
            `بنشيل آخر مكان (index ${n - 1}) ونحط الـ ${last.value} مكان الـ root. أخدنا آخر رقم عشان الـ tree تفضل complete. بس الـ root دلوقتي ممكن يكون كبير، فهنعمل sift down.`),
          `last = heap.pop() = ${last.value}; heap[0] = ${last.value}; i = 0`);

        while (true) {
          const i = state.i, size = state.heap.length, iv = state.heap[i].value;
          const l = 2 * i + 1, r = l + 1;
          state.child = null; state.left = null; state.right = null;
          if (l >= size) {
            state.phase = 'ok';
            emit('leaf', [17], message(`${iv} reached a leaf`, `الـ ${iv} وصل لـ leaf`),
              message(`Index ${i} has no children: 2 · ${i} + 1 = ${l} is not below size ${size}. Nothing is left to compare.`,
                `index ${i} مالوش children: 2 · ${i} + 1 = ${l} مش أصغر من الـ size ${size}. مفيش حاجة نقارنها تاني.`),
              `${l} < ${size} → false`);
            break;
          }
          const lv = state.heap[l].value;
          state.left = l;
          let c = l;
          if (r < size) {
            const rv = state.heap[r].value;
            state.right = r; state.comparisons++;
            if (rv < lv) c = r;
            emit('pick-child', c === r ? [17, 18, 19, 20, 21] : [17, 18, 19, 20],
              message(`Pick the smaller child: ${state.heap[c].value}`, `بنختار الـ child الأصغر: الـ ${state.heap[c].value}`),
              message(`Index ${i} has children at 2 · ${i} + 1 = ${l} (${lv}) and ${r} (${rv}). Only the smaller one can move up without breaking order with its sibling.`,
                `index ${i} ليه children عند 2 · ${i} + 1 = ${l} (الـ ${lv}) و ${r} (الـ ${rv}). الأصغر بس هو اللي ينفع يطلع فوق من غير ما يبوّظ الترتيب مع أخوه.`),
              `child = ${l}; right = ${r}; ${rv} < ${lv} → ${rv < lv}`);
          } else {
            emit('pick-child', [17, 18, 19, 20],
              message(`Only a left child: ${lv}`, `فيه left child بس: الـ ${lv}`),
              message(`Index ${i} has a left child at 2 · ${i} + 1 = ${l}, but ${r} is past the end (size ${size}).`,
                `index ${i} ليه left child عند 2 · ${i} + 1 = ${l}، بس ${r} برّه الـ array (الـ size ${size}).`),
              `child = ${l}; right = ${r}; ${r} < ${size} → false`);
          }
          const cv = state.heap[c].value;
          state.child = c; state.left = null; state.right = null; state.comparisons++;
          state.condition = iv <= cv;
          if (state.condition) state.phase = 'ok';
          emit('compare-child', [22],
            state.condition ? message(`${iv} ≤ ${cv}: stop here`, `الـ ${iv} مش أكبر من الـ ${cv}، يبقى بنقف هنا`)
              : message(`${iv} > ${cv}: swap down`, `الـ ${iv} أكبر من الـ child، يبقى هنعمل swap`),
            state.condition ? message(`${iv} is not larger than its smaller child, so it is ≤ both children. Heap order holds everywhere again.`,
              `الـ ${iv} مش أكبر من الـ child الأصغر، يعني أصغر من أو بيساوي الاتنين. كده الـ heap order رجع صح في كل حتة.`)
              : message(`${iv} is larger than its smaller child ${cv}. Swap them so the smaller value sits above.`,
                `الـ ${iv} أكبر من الـ child الأصغر، الـ ${cv}. هنعمل swap عشان الأصغر يبقى فوق.`),
            `${iv} <= ${cv} → ${state.condition}`);
          if (state.condition) break;

          [state.heap[i], state.heap[c]] = [state.heap[c], state.heap[i]];
          state.swaps++; state.i = c; state.child = null; state.condition = null;
          const h = heightOf(size);
          emit('swap-down', [23, 24], message(`Swap ${iv} down with ${cv}`, `بنعمل swap للـ ${iv} والـ ${cv}`),
            message(`${cv} moves up to index ${i} and ${iv} drops to index ${c}. Each swap goes one level down, so with ${size} values extractMin makes at most ${h} swaps: O(log n).`,
              `الـ ${cv} طلع لـ index ${i}، والـ ${iv} نزل لـ index ${c}. كل swap بينزّلنا level واحد، فمع ${size} أرقام الـ extractMin بيعمل ${h} swaps بالكتير، يعني O(log n).`),
            `swap(heap[${i}], heap[${c}]); i = ${c}`);
        }
      }
      clearFocus();
      const top = state.heap.length ? state.heap[0].value : null;
      emit('extracted', [25], message(`Return ${min}`, `بنعمل return للـ ${min}`),
        top === null ? message(`extractMin returns ${min}. The heap is empty now.`, `الـ extractMin بيرجّع الـ ${min}. والـ heap فاضي دلوقتي.`)
          : message(`extractMin returns ${min}. The new minimum is ${top}, at the root.`, `الـ extractMin بيرجّع الـ ${min}. أصغر رقم دلوقتي الـ ${top}، في الـ root.`),
        `return ${min}`);
    }

    function peek() {
      const n = state.heap.length;
      if (!n) {
        state.outputs.push('peek: underflow');
        emit('underflow', [26, 27], message('Underflow: nothing to peek at', 'underflow: مفيش حاجة نبص عليها'),
          message('The heap is empty, so there is no minimum to read. peek reports underflow.',
            'الـ heap فاضي، يعني مفيش أصغر رقم نقراه. الـ peek بيرجّع underflow.'),
          'size 0 → underflow');
        return;
      }
      emit('operation', [26, 27], message('peek', 'بنعمل peek'),
        message(`The heap has ${n} values, so the root holds the minimum.`,
          `الـ heap فيه ${n} أرقام، يعني الـ root فيه أصغر رقم.`),
        `size ${n} > 0`);
      const top = state.heap[0].value;
      state.min = top; state.found = 0;
      state.outputs.push(`peek: ${top}`);
      emit('peek', [28], message(`Peek: ${top}, nothing moves`, `peek: الـ ${top}، ومفيش حاجة اتحرّكت`),
        message(`peek reads heap[0] and returns ${top}. No swap and no comparison: O(1). The heap is unchanged.`,
          `الـ peek بيقرا heap[0] ويرجّع الـ ${top}. لا swap ولا مقارنة، يعني O(1). والـ heap زي ما هو.`),
        `return heap[0] = ${top}`);
    }

    for (const [index, op] of operations.entries()) {
      clearFocus(); state.min = null; state.op = op; state.opIndex = index;
      if (op.op === 'insert') insert(op.value);
      else if (op.op === 'extract') extract();
      else peek();
    }

    clearFocus(); state.min = null; state.op = null; state.opIndex = null;
    const final = values(), sorted = final.every((value, index) => index === 0 || final[index - 1] <= value);
    state.done = true;
    state.result = { heap: final, outputs: [...state.outputs] };
    emit('done', [], message('All operations done', 'خلّصنا كل الـ operations'),
      message(`Ran ${operations.length} operations with ${state.comparisons} comparisons and ${state.swaps} swaps. ` +
        (final.length < 2 ? 'With fewer than two values there is nothing to order.'
          : sorted ? 'The array happens to be sorted here, but heap order does not promise that.'
            : 'Notice the array is not sorted: heap order only compares each parent with its children.'),
      `خلّصنا ${operations.length} operations بـ ${state.comparisons} مقارنات و ${state.swaps} swaps. ` +
        (final.length < 2 ? 'ومع أقل من رقمين مفيش ترتيب أصلًا.'
          : sorted ? 'الـ array هنا طلعت sorted بالصدفة، بس الـ heap order مش بيوعد بكده.'
            : 'لاحظ إن الـ array مش sorted: الـ heap order بيقارن كل parent بالـ children بتوعه بس.')),
      `heap = [${final.join(', ')}]`);
    return frames;
  }

  const defaults = { initial: '4, 9, 6, 12, 10', operations: 'insert 2\npeek\nextract\nextract\ninsert 7' };
  const lesson = {
    id: 'heap', name: 'Binary Heap', theme: 'data-structures', category: 'structure', number: '17',
    label: 'BINARY HEAP', cost: 'O(log n)',
    description: message('A min-heap keeps the smallest value at the root of a complete tree stored in an array. Insert sifts up, extractMin sifts down.',
      'الـ min-heap بيخلّي أصغر رقم في الـ root بتاع complete tree متخزّنة في array. الـ insert بيعمل sift up، والـ extractMin بيعمل sift down.'),
    note: message('The parent of i is at (i − 1) // 2, its children at 2i + 1 and 2i + 2. Each fix walks one path, O(log n); peek is O(1).',
      'الـ parent بتاع i عند (i − 1) // 2، والـ children عند 2i + 1 و 2i + 2. كل تصليح بيمشي على path واحد، يعني O(log n). والـ peek بياخد O(1).'),
    code,
    keySteps: ['ready', 'append', 'compare-parent', 'swap-up', 'reached-root', 'take-min', 'move-last', 'emptied',
      'pick-child', 'compare-child', 'swap-down', 'leaf', 'peek', 'underflow', 'overflow', 'done'],
    view: {
      legend: [
        { tone: 'active', role: 'current', label: message('Moving value', 'الرقم اللي بيتحرّك') },
        { tone: 'pivot', role: 'peek', label: message('Compared with', 'بنقارن بيه') },
        { tone: 'found', role: 'path', label: message('Minimum', 'أصغر رقم') },
      ],
    },
    fields: [
      { name: 'initial', type: 'text', maxLength: MAX_INITIAL_LENGTH,
        label: message('Starting heap', 'الـ heap في الأول'),
        help: message(`Up to ${CAPACITY} integers from ${MIN_VALUE} to ${MAX_VALUE}, separated by commas or spaces. They are inserted in order before the operations run, without animation. Leave blank to start empty.`,
          `لحد ${CAPACITY} أرقام صحيحة من ${MIN_VALUE} لـ ${MAX_VALUE}، وافصل بينهم بـ comma أو مسافة. بندخّلهم بالترتيب قبل الـ operations ومن غير animation. سيبها فاضية لو عايز تبدأ بـ heap فاضي.`) },
      { name: 'operations', type: 'textarea', maxLength: MAX_OPERATIONS_LENGTH,
        label: message('Operations', 'الـ operations'),
        help: message(`Up to ${MAX_OPERATIONS}, one per line or separated by commas: insert 5 (or push 5), extract (or pop), peek. Values from ${MIN_VALUE} to ${MAX_VALUE}; the heap holds at most ${CAPACITY}. Arabic digits work too.`,
          `لحد ${MAX_OPERATIONS} operation، كل واحدة في سطر أو افصل بينهم بـ comma: insert 5 (أو push 5)، extract (أو pop)، peek. الأرقام من ${MIN_VALUE} لـ ${MAX_VALUE}، والـ heap بياخد ${CAPACITY} أرقام بالكتير. الأرقام العربي شغالة كمان.`) },
    ],
    defaults,
    presets: [
      { id: 'default', label: message('Insert, peek, extract', 'insert و peek و extract'), input: { ...defaults } },
      { id: 'build-up', label: message('Build from empty · new minimums climb', 'نبني من الصفر · الأصغر بيطلع لفوق'),
        input: { initial: '', operations: 'insert 5, insert 3, insert 8, insert 1, insert 4, insert 2' } },
      { id: 'drain', label: message('Extract everything · sorted output', 'نطلّع كل حاجة · بتطلع مترتّبة'),
        input: { initial: '7, 3, 9, 1, 5, 8, 2, 6', operations: 'extract, extract, extract, extract, extract, extract, extract, extract' } },
      { id: 'underflow', label: message('Empty heap · underflow', 'heap فاضي · underflow'),
        input: { initial: '', operations: 'peek, extract, insert 6, extract, extract' } },
      { id: 'overflow', label: message('Full heap · overflow', 'heap مليان · overflow'),
        input: { initial: '1, 2, 3, 4, 5, 6, 7, 8', operations: 'insert 0, extract, insert 0, peek' } },
      { id: 'duplicates', label: message('Duplicates · ties stop early', 'أرقام مكرّرة · التعادل بيوقّف'),
        input: { initial: '5, 5, 5', operations: 'insert 5, insert 2, extract, extract' } },
      { id: 'limits', label: message('Negative values and limits', 'أرقام سالبة وأقصى الحدود'),
        input: { initial: '999, 0, -99', operations: 'insert -50, peek, extract, insert 999, extract' } },
    ],
    parse, build,
    summary(input) {
      const { initial, operations } = validate(input);
      const count = op => operations.filter(entry => entry.op === op).length;
      return message(`Min-heap · starts with ${initial.length} values · ${count('insert')} inserts, ${count('extract')} extracts, ${count('peek')} peeks · capacity ${CAPACITY}`,
        `min-heap · بيبدأ بـ ${initial.length} أرقام · ${count('insert')} insert و ${count('extract')} extract و ${count('peek')} peek · الـ capacity ${CAPACITY}`);
    },
    theory: {
      whenToUse: {
        use: [
          { en: "You keep needing the smallest (or largest) item: task schedulers, event queues.", ar: "محتاج أصغر (أو أكبر) element كل شوية: الـ task schedulers، الـ event queues." },
          { en: "Your algorithm picks the cheapest next step: Dijkstra, Prim, merging sorted lists.", ar: "الـ algorithm بتختار أرخص خطوة جاية: Dijkstra، Prim، دمج sorted lists." },
          { en: "You want the top k of a stream without sorting all of it.", ar: "عايز أكبر k من stream من غير ما تعمل sort لكله." },
        ],
        avoid: [
          { en: "You search for an arbitrary value → a heap is not sorted, so that is O(n); use a hash table or a search tree.", ar: "بتدوّر على value أي كلام ← الـ heap مش sorted، فده O(n)؛ استخدم hash table أو search tree." },
          { en: "You need everything in order at once → just sort the array.", ar: "محتاج كل حاجة مترتّبة مرة واحدة ← اعمل sort للـ array وخلاص." },
        ],
      },
      idea: message('A heap keeps the smallest value on top so you can always grab it fast. Each parent is only smaller than its own children, so adding or removing a value repairs just one path from top to bottom.',
        'الـ heap بيخلّي أصغر رقم فوق، فتقدر تجيبه على طول. كل parent أصغر بس من الـ children بتوعه، فلما تضيف أو تشيل رقم بتصلّح path واحد من فوق لتحت.'),
      title: message('Smallest on top, in one flat array', 'أصغر رقم فوق، والـ tree كلها في array واحدة'),
      intro: message('You need arrays, integer division, and the idea of a binary tree. A binary min-heap is a complete binary tree stored level by level in an array. There are no pointers: the index of a slot tells you where its parent and children are. It is the usual way to build a priority queue.',
        'محتاج تعرف الـ array والقسمة الصحيحة وفكرة الـ binary tree. الـ binary min-heap هو complete binary tree متخزّنة level ورا level في array. مفيش pointers: الـ index بتاع أي مكان بيقولك الـ parent والـ children بتوعه فين. ودي الطريقة المعتادة اللي بنبني بيها priority queue.'),
      invariant: message('Shape: the tree is complete. Every level is full except the last, which fills left to right, so the array has no gaps. Order: for every index i > 0, heap[(i − 1) // 2] ≤ heap[i]. Together they put the minimum at index 0 and keep the height at ⌊log₂ n⌋.',
        'الشكل: الـ tree لازم تبقى complete. كل level مليان ما عدا آخر واحد، وده بيتملي من الشمال لليمين، فمفيش فراغات في الـ array. الترتيب: لكل index i > 0، heap[(i − 1) // 2] ≤ heap[i]. الاتنين مع بعض بيحطّوا أصغر رقم عند index 0، وبيخلّوا الـ height ⌊log₂ n⌋.'),
      steps: [
        { title: message('Index arithmetic', 'حساب الـ index'),
          body: message('For the slot at index i, the parent is at (i − 1) // 2, the left child at 2i + 1, and the right child at 2i + 2. A child index ≥ size means that child does not exist.',
            'لأي مكان عند index i، الـ parent عند (i − 1) // 2، والـ left child عند 2i + 1، والـ right child عند 2i + 2. لو الـ index بتاع الـ child أكبر من أو بيساوي الـ size، يبقى الـ child ده مش موجود.') },
        { title: message('insert: append, then sift up', 'الـ insert: بنحط في الآخر، وبعدين sift up'),
          body: message('Put the value in the first free slot, the end of the array, so the shape stays complete. Then compare it with its parent: while the parent is larger, swap and move up. Stop at the root or when the parent is not larger.',
            'بنحط الرقم في أول مكان فاضي، يعني آخر الـ array، عشان الشكل يفضل complete. بعدين بنقارنه بالـ parent: طول ما الـ parent أكبر، بنعمل swap ونطلع. بنقف عند الـ root أو لما الـ parent ميبقاش أكبر.') },
        { title: message('extractMin: last to the root, then sift down', 'الـ extractMin: آخر رقم يروح الـ root، وبعدين sift down'),
          body: message('Save the root, move the last value to index 0, and shrink the array by one. Then pick the smaller child; if the value is larger, swap and move down. Stop at a leaf or when the value is ≤ its smaller child.',
            'بنحفظ الـ root، وننقل آخر رقم لـ index 0، والـ array بتصغر مكان. بعدين بنختار الـ child الأصغر: لو الرقم أكبر منه بنعمل swap وننزل. بنقف عند leaf أو لما الرقم يبقى أصغر من أو بيساوي الـ child الأصغر.') },
        { title: message('peek: read the root', 'الـ peek: بنقرا الـ root'),
          body: message('The minimum is always heap[0], so peek is one read with no comparisons. On an empty heap, peek and extractMin report underflow.',
            'أصغر رقم دايمًا heap[0]، فالـ peek قراية واحدة من غير مقارنات. ولو الـ heap فاضي، الـ peek والـ extractMin بيرجّعوا underflow.') },
      ],
      notes: [
        message('A heap is not sorted. Siblings have no order between them; only each parent-child pair is ordered. Reading the array left to right does not give sorted output. You need n extractMin calls for that, which is heap sort, O(n log n).',
          'الـ heap مش sorted. الـ children اللي جنب بعض ملهمش ترتيب بينهم، الترتيب بس بين كل parent والـ children بتوعه. لو قريت الـ array من الشمال لليمين مش هتطلع مترتّبة. محتاج تعمل extractMin n مرة عشان كده، وده heap sort، O(n log n).'),
        message('Why the smaller child: after the swap it becomes the parent of its sibling, so it must be ≤ the sibling too. Swapping with the larger child would break order on the other side.',
          'ليه الـ child الأصغر؟ بعد الـ swap هيبقى parent لأخوه، فلازم يبقى أصغر منه أو بيساويه. لو عملنا swap مع الأكبر، الترتيب هيبوظ في الناحية التانية.'),
        message('A complete tree with n values has height ⌊log₂ n⌋. Sift up makes at most one comparison and one swap per level; sift down at most two comparisons and one swap. So insert and extractMin are O(log n), peek is O(1), and the extra space is O(1).',
          'الـ complete tree اللي فيها n أرقام الـ height بتاعها ⌊log₂ n⌋. الـ sift up بيعمل مقارنة واحدة و swap واحد بالكتير في كل level، والـ sift down مقارنتين و swap واحد. عشان كده الـ insert والـ extractMin بياخدوا O(log n)، والـ peek بياخد O(1)، والمساحة الزيادة O(1).'),
        message('Use a heap as a priority queue: schedulers, Dijkstra, merging k sorted lists, top-k. Pick it when you keep needing the current minimum while values keep arriving. Searching for an arbitrary value is O(n) in a heap; if you need that or ordered iteration, use a balanced search tree. If all values arrive up front, sorting once may be simpler.',
          'استخدم الـ heap كـ priority queue: الـ schedulers، و Dijkstra، ودمج k lists مترتّبة، و top-k. اختاره لما تكون محتاج أصغر رقم كل شوية والأرقام لسه بتدخل. التدوير على رقم معيّن في الـ heap بياخد O(n)؛ لو محتاج ده أو تلف على الأرقام بالترتيب، استخدم balanced search tree. ولو كل الأرقام موجودة من الأول، ممكن sort مرة واحدة يبقى أبسط.'),
        message('Equal values: the test heap[parent] <= heap[i] stops on a tie, so duplicates are allowed and never swap with each other. A heap is still not stable: equal values can come out in any order.',
          'الأرقام المتساوية: الـ condition heap[parent] <= heap[i] بيوقف لو الرقمين زي بعض، فالتكرار مسموح ومش بيعملوا swap مع بعض. بس الـ heap مش stable: الأرقام المتساوية ممكن تطلع بأي ترتيب.'),
        message(`In this lab the capacity is ${CAPACITY} values so the tree fits the canvas, values run from ${MIN_VALUE} to ${MAX_VALUE}, and a script has at most ${MAX_OPERATIONS} operations. Starting values go in with the same insert before the script, without animation. A real heap grows its array, and building it from n values at once (heapify) takes only O(n).`,
          `في الـ lab ده الـ capacity ${CAPACITY} أرقام عشان الـ tree تكفي الرسمة، والأرقام من ${MIN_VALUE} لـ ${MAX_VALUE}، والـ operations ${MAX_OPERATIONS} بالكتير. الأرقام اللي بيبدأ بيها الـ heap بتدخل بنفس الـ insert قبل الـ operations، ومن غير animation. الـ heap الحقيقي الـ array بتاعته بتكبر، ولو عندك n أرقام مرة واحدة، الـ heapify بيبني الـ heap في O(n) بس.`),
      ],
      costs: [
        { label: message('peek', 'الـ peek'), value: 'O(1)' },
        { label: message('insert', 'الـ insert'), value: 'O(log n)' },
        { label: message('extractMin', 'الـ extractMin'), value: 'O(log n)' },
        { label: message('Search for a value', 'التدوير على رقم'), value: 'O(n)' },
        { label: message('Build: n inserts / heapify', 'البناء: n insert / heapify'), value: 'O(n log n) / O(n)' },
        { label: message('Space', 'المساحة'), value: 'O(n) array · O(1) extra' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
