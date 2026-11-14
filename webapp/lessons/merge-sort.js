(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const MAX_LENGTH = 16;
  const MAX_TEXT_LENGTH = 256;
  // Clone the entire frame, including scene and content, preserving numeric -0.
  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, copy(entry)]));
    }
    return value;
  }

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  // Public parsed input is {numbers: number[]}; never retain the caller's array.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Array.isArray(input.numbers)) {
      fail('Use an input object with a numbers array.', 'ابعت object فيه numbers كصف أرقام.');
    }
    const numbers = input.numbers;
    if (numbers.length > MAX_LENGTH) {
      fail('Use at most 16 integers.', 'اكتب ١٦ رقم صحيح بالكتير.');
    }
    // An indexed loop also rejects holes in sparse arrays.
    for (let index = 0; index < numbers.length; index++) {
      if (!Number.isSafeInteger(numbers[index]) || Math.abs(numbers[index]) > 999) {
        fail('Every value must be an integer from -999 to 999.', 'كل value لازم تكون رقم صحيح من -999 لحد 999.');
      }
    }
    return numbers.slice();
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) || typeof rawInput.numbers !== 'string') {
      fail('Enter numbers as text.', 'اكتب الأرقام كنص في خانة numbers.');
    }
    if (rawInput.numbers.length > MAX_TEXT_LENGTH) {
      fail('Keep the input within 256 characters.', 'خلي النص ٢٥٦ حرف بالكتير.');
    }
    const text = rawInput.numbers.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    if (!text) return { numbers: [] };
    if (!/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/u.test(text)) {
      fail('Separate whole numbers with spaces or commas; do not leave empty entries.',
        'افصل الأرقام الصحيحة بمسافات أو فواصل، ومن غير خانات فاضية بين الفواصل.');
    }
    return { numbers: validate({ numbers: text.split(/[,،\s]+/u).map(Number) }) };
  }

  const code = [
    'mergeSort(numbers):',
    '  buffer = new array(length(numbers))',
    '  sortRange(0, length(numbers))',
    '  return numbers',
    'sortRange(left, right):  // right is exclusive',
    '  if right - left <= 1: return',
    '  middle = floor((left + right) / 2)',
    '  sortRange(left, middle)',
    '  sortRange(middle, right)',
    '  merge(left, middle, right)',
    '  return',
    'merge(left, middle, right):',
    '  i = left; j = middle; write = left',
    '  while i < middle and j < right:',
    '    if numbers[i] <= numbers[j]:',
    '      buffer[write] = numbers[i]',
    '      i = i + 1',
    '    else:',
    '      buffer[write] = numbers[j]',
    '      j = j + 1',
    '    write = write + 1',
    '  while i < middle:',
    '    buffer[write] = numbers[i]',
    '    i = i + 1; write = write + 1',
    '  while j < right:',
    '    buffer[write] = numbers[j]',
    '    j = j + 1; write = write + 1',
    '  for index = left .. right - 1:',
    '    numbers[index] = buffer[index]',
    '  return',
  ];

  function build(input) {
    const numbers = validate(input);
    const state = {
      numbers, original: numbers.slice(), slots: numbers.map((_, index) => `item-${index}`),
      buffer: [], bufferSlots: [], bufferValid: [], stack: [],
      comparisons: 0, bufferWrites: 0, copyBacks: 0, merges: 0,
      calls: 0, maxDepth: 0, auxiliarySlots: 0,
      condition: null, operation: null, done: false, result: null,
    };
    const frames = [];
    const current = () => state.stack[state.stack.length - 1];
    const interval = (left, right) => `[${left}, ${right})`;

    function scene() {
      const active = current();
      const merge = active && active.routine === 'merge' ? active : null;
      const operation = state.operation;
      const sourceIndex = operation && operation.type === 'buffer-write' ? operation.from : null;
      const destinationIndex = operation && operation.type === 'copy-back' ? operation.to : null;
      const comparing = operation && operation.type === 'compare';
      const arrayCells = state.numbers.map((value, index) => {
        const markers = [];
        if (active && index === active.left) markers.push('left');
        if (active && index === active.middle) markers.push('middle');
        if (active && index === active.right - 1) markers.push('right - 1');
        if (merge && merge.i < merge.middle && index === merge.i) markers.push('i');
        if (merge && merge.j < merge.right && index === merge.j) markers.push('j');
        if (index === destinationIndex) markers.push('copy');
        if (state.slots[index] === null) markers.push('old copy');
        const highlighted = index === sourceIndex || index === destinationIndex ||
          (comparing && (index === operation.leftIndex || index === operation.rightIndex));
        return {
          id: state.slots[index] === null ? `memory-${index}` : state.slots[index],
          value, index,
          tone: state.done ? 'sorted' : state.slots[index] === null ? 'muted' : highlighted ? 'active' :
            active && (index < active.left || index >= active.right) ? 'muted' : 'default',
          marker: markers.join(' · '),
        };
      });
      const rows = [{ id: 'numbers', label: message('Array · zero-based indices', 'الصف · الأماكن بتبدأ من 0'), layout: 'cards', cells: arrayCells }];
      if (state.auxiliarySlots > 0) {
        rows.push({
          id: 'buffer', label: message('Auxiliary buffer · reused', 'buffer مساعد · بنستخدمه تاني'), layout: 'cards',
          cells: state.buffer.map((value, index) => ({
            id: state.bufferValid[index] ? `aux-${state.bufferSlots[index]}` : `scratch-${index}`,
            value: value === null ? '·' : value, index,
            tone: operation && operation.type === 'buffer-write' && operation.to === index ? 'active' :
              operation && operation.type === 'copy-back' && operation.from === index ? 'active' :
                state.bufferValid[index] ? 'sorted' : 'muted',
            marker: merge && index === merge.write ? 'write' :
              value === null ? 'unused' : state.bufferValid[index] ? '' : 'old',
          })),
        });
      }
      let note;
      if (state.slots.includes(null)) {
        note = message('Copy back one slot at a time. A faded “old copy” is still in memory; its card identity is already represented elsewhere. The buffer keeps the full merge safe.',
          'بنرجّع خانة كل مرة. القيمة الباهتة «old copy» لسه في الذاكرة، بس هوية كارتها موجودة في مكان تاني. الدمج كامل ومحفوظ في buffer.');
      } else if (state.done) {
        note = message('Equal values kept their original card order. Buffer copies have separate IDs; all original cards are back in the array.',
          'القيم المتساوية فضلت بنفس ترتيب كروتها الأصلي. نُسخ buffer ليها IDs مختلفة، وكل الكروت الأصلية رجعت للصف.');
      } else if (active) {
        note = message(`Active range ${interval(active.left, active.right)} includes left and excludes right. Muted buffer slots are unused or from an older merge.`,
          `الجزء الحالي ${interval(active.left, active.right)} بيشمل left ومش بيشمل right. خانات buffer الباهتة فاضية أو من دمج فات.`);
      } else {
        note = message(numbers.length ? 'Indices start at 0. Split ranges, sort each half, then merge into a reusable buffer.' : 'An empty array is already sorted; no values will be read or moved.',
          numbers.length ? 'الأماكن بتبدأ من 0. نقسّم الأجزاء ونرتّب كل نصّ، وبعدها ندمج في buffer بنستخدمه تاني.' : 'الصف الفاضي مترتّب أصلًا؛ مش هنقرأ أو نحرّك أي قيمة.');
      }
      return {
        rows, graph: null,
        collections: [{
          label: message('Call stack · outer → current', 'Call stack · من أول نداء للحالي'),
          values: state.stack.map(call => `${call.routine} ${interval(call.left, call.right)}${call.middle === null ? '' : ` · middle=${call.middle}`} · ${call.phase}`),
        }],
        note,
      };
    }

    function emit(kind, lines, title, explanation, equation = '', operation = null, condition = null) {
      state.operation = operation;
      state.condition = condition;
      const active = current();
      const variables = [{ name: 'n', value: numbers.length }];
      for (const name of ['left', 'middle', 'right', 'i', 'j', 'write', 'index']) {
        variables.push({ name, value: active && active[name] != null ? active[name] : '—' });
      }
      frames.push(copy({
        kind, lines, title, explanation, equation, state, variables,
        metrics: [
          { label: message('Value comparisons', 'مقارنات القيم'), value: state.comparisons },
          { label: message('Buffer writes', 'كتابات buffer'), value: state.bufferWrites },
          { label: message('Array writes', 'كتابات الصف'), value: state.copyBacks },
          { label: message('Completed merges', 'عمليات دمج خلصت'), value: state.merges },
          { label: message('Peak call frames', 'أكبر حجم للـ call stack'), value: state.maxDepth },
          { label: message('Buffer slots', 'خانات buffer'), value: state.auxiliarySlots },
        ],
        scene: scene(),
      }));
    }

    function merge(left, middle, right) {
      const call = { routine: 'merge', left, middle, right, i: null, j: null, write: null, index: null, phase: 'enter' };
      state.stack.push(call);
      state.maxDepth = Math.max(state.maxDepth, state.stack.length);
      // Validity is display metadata. Old buffer memory is NOT cleared or copied.
      state.bufferValid.fill(false);
      emit('merge-call', [10], message('Merge two sorted halves', 'ندمج النصّين المترتّبين'),
        message(`Both ${interval(left, middle)} and ${interval(middle, right)} are sorted. Reuse the same buffer for this range.`,
          `الجزئين ${interval(left, middle)} و${interval(middle, right)} مترتّبين. هنستخدم نفس buffer للجزء ده.`),
        `merge(${left}, ${middle}, ${right})`, { type: 'merge-call', left, middle, right });
      call.i = left; call.j = middle; call.write = left; call.phase = 'compare';
      emit('merge-init', [13], message('Point to both first candidates', 'نشاور على أول مرشّح في كل نصّ'),
        message('i scans the left half, j scans the right half, and write marks the next buffer slot.',
          'i بيتابع النصّ الشمال، وj بيتابع اليمين، وwrite هو مكان الكتابة الجاي في buffer.'),
        `i = ${left}; j = ${middle}; write = ${left}`);

      function write(side, line, remainder) {
        const from = side === 'left' ? call.i : call.j;
        const to = call.write;
        const value = state.numbers[from];
        const id = state.slots[from];
        state.buffer[to] = value;
        state.bufferSlots[to] = id;
        state.bufferValid[to] = true;
        state.bufferWrites++;
        emit('buffer-write', [line], message(`Write the ${side} candidate`, side === 'left' ? 'نكتب مرشّح الشمال' : 'نكتب مرشّح اليمين'),
          message(remainder ? `The other half is exhausted. Copy the next ${side} value without another value comparison.` :
            `The comparison selected the ${side} candidate. Store value ${value} at buffer index ${to}; the array is unchanged.`,
          remainder ? `النصّ التاني خلص. ننقل القيمة الجاية من ${side === 'left' ? 'الشمال' : 'اليمين'} من غير مقارنة قيم جديدة.` :
            `المقارنة اختارت كارت ${side === 'left' ? 'الشمال' : 'اليمين'}. نكتب value ${value} في buffer عند ${to}، والصف لسه زي ما هو.`),
          `buffer[${to}] = numbers[${from}] = ${value}`,
          { type: 'buffer-write', from, to, value, id, side, reason: remainder ? 'remainder' : 'comparison' });
      }

      while (true) {
        const condition = call.i < middle && call.j < right;
        emit('merge-check', [14], message(condition ? 'Both halves have a candidate' : 'One half is exhausted', condition ? 'لسه في كارت في كل نصّ' : 'واحد من النصّين خلص'),
          message(condition ? 'Both indices are in range, so comparing their values is safe.' : 'Stop comparing values. Any remaining half can be copied in order.',
            condition ? 'المكانين جوّه الحدود، فنقدر نقارن القيم بأمان.' : 'نوقف مقارنة القيم. اللي فاضل من النصّ التاني هيتنقل بترتيبه.'),
          `${call.i} < ${middle} and ${call.j} < ${right} → ${condition}`,
          { type: 'merge-check', left, middle, right, i: call.i, j: call.j }, condition);
        if (!condition) break;
        const leftValue = state.numbers[call.i], rightValue = state.numbers[call.j];
        const takeLeft = leftValue <= rightValue;
        state.comparisons++;
        emit('compare', [15], message(leftValue === rightValue ? 'Equal values: take the left card' : takeLeft ? 'The left candidate is smaller' : 'The right candidate is smaller',
          leftValue === rightValue ? 'القيم زي بعض: ناخد كارت الشمال' : takeLeft ? 'مرشّح الشمال أصغر' : 'مرشّح اليمين أصغر'),
        message(leftValue === rightValue ? 'The left card came earlier in the original input. Taking it first preserves the order of equal values.' :
          `Each half is sorted, so the smaller front value is the next value in the merged order. Choose index ${takeLeft ? call.i : call.j}.`,
        leftValue === rightValue ? 'كارت الشمال كان أسبق في الإدخال الأصلي. لما ناخده الأول، ترتيب القيم المتساوية بيفضل محفوظ.' :
          `كل نصّ مترتّب، فأصغر قيمة قدّامنا هي الجاية في الدمج. نختار المكان ${takeLeft ? call.i : call.j}.`),
        `${leftValue} <= ${rightValue} → ${takeLeft}`,
        { type: 'compare', leftIndex: call.i, rightIndex: call.j, leftValue, rightValue, take: takeLeft ? 'left' : 'right' }, takeLeft);
        if (takeLeft) {
          write('left', 16, false);
          call.i++;
          emit('advance-left', [17], message('Advance the left cursor', 'نقدّم مؤشّر الشمال'),
            message('The left candidate is safely in the buffer. Point i to its next neighbor.', 'كارت الشمال اتحفظ في buffer. نحرّك i للكارت اللي بعده.'), `i = ${call.i}`);
        } else {
          emit('take-right', [18], message('Take the right branch', 'نختار فرع اليمين'),
            message('The <= test was false. Only a strictly smaller right value takes this branch.', 'شرط <= طلع غلط. الفرع ده بيحصل بس لو قيمة اليمين أصغر فعلًا.'));
          write('right', 19, false);
          call.j++;
          emit('advance-right', [20], message('Advance the right cursor', 'نقدّم مؤشّر اليمين'),
            message('The right candidate is safely in the buffer. Point j to its next neighbor.', 'كارت اليمين اتحفظ في buffer. نحرّك j للكارت اللي بعده.'), `j = ${call.j}`);
        }
        call.write++;
        emit('advance-write', [21], message('Advance the buffer cursor', 'نقدّم مؤشّر الكتابة'),
          message('The buffer prefix is sorted. Move write to its next free slot.', 'الجزء اللي اتكتب في buffer مترتّب. نحرّك write للخانة الجاية.'), `write = ${call.write}`);
      }

      for (const side of ['left', 'right']) {
        const isLeft = side === 'left';
        const cursor = isLeft ? 'i' : 'j', end = isLeft ? middle : right;
        const checkLine = isLeft ? 22 : 25, writeLine = isLeft ? 23 : 26, advanceLine = isLeft ? 24 : 27;
        call.phase = `drain-${side}`;
        while (true) {
          const condition = call[cursor] < end;
          emit(`${side}-check`, [checkLine], message(`Check the ${side} remainder`, isLeft ? 'نشوف باقي الشمال' : 'نشوف باقي اليمين'),
            message(condition ? `The ${side} half still has a value. Its remaining order is already correct.` : `The ${side} half has no remaining values; skip the read.`,
              condition ? `لسه في قيمة في ${isLeft ? 'الشمال' : 'اليمين'}. الباقي مترتّب أصلًا.` : `مفيش قيم فاضلة في ${isLeft ? 'الشمال' : 'اليمين'}؛ مش هنقرأ برّه الحدود.`),
            `${call[cursor]} < ${end} → ${condition}`, { type: `${side}-check`, cursor: call[cursor], end }, condition);
          if (!condition) break;
          write(side, writeLine, true);
          call[cursor]++; call.write++;
          emit(`advance-${side}-remainder`, [advanceLine], message('Advance after the remainder write', 'نقدّم المؤشّرات بعد النقل'),
            message(`Advance ${cursor} and write together; one remaining value has been copied.`, `نزوّد ${cursor} وwrite بواحد؛ نقلنا قيمة من الباقي.`),
            `${cursor} = ${call[cursor]}; write = ${call.write}`);
        }
      }

      call.phase = 'copy-back';
      for (let index = left; ; index++) {
        call.index = index;
        const condition = index < right;
        emit('copy-index', [28], message(condition ? 'Choose the next copy-back slot' : 'The range is copied back', condition ? 'نختار الخانة اللي هنرجّعها' : 'رجّعنا الجزء كله'),
          message(condition ? 'The full merged range is safe in the buffer. Copy it back one index at a time.' : 'The loop stops at the exclusive right boundary. No out-of-range read occurs.',
            condition ? 'الجزء المدموج كامل ومحفوظ في buffer. هنرجّعه خانة خانة.' : 'الحلقة بتقف عند right، وهو خارج الجزء. مش هنقرأ برّه الحدود.'),
          `${index} < ${right} → ${condition}`, { type: 'copy-index', index, left, right }, condition);
        if (!condition) break;
        const id = state.bufferSlots[index], value = state.buffer[index];
        // Track card movement separately from raw memory, which can temporarily
        // contain duplicate copies during overwrite. Ghost cells show that memory
        // with slot-specific IDs instead of drawing an original card twice.
        const oldPosition = state.slots.indexOf(id);
        if (oldPosition !== -1) state.slots[oldPosition] = null;
        state.numbers[index] = value;
        state.slots[index] = id;
        state.copyBacks++;
        emit('copy-back', [29], message('Copy one value back', 'نرجّع قيمة واحدة للصف'),
          message(`Write value ${value} from buffer index ${index} to array index ${index}. Unwritten array slots may still contain old copies.`,
            `نرجّع value ${value} من buffer عند ${index} لنفس المكان في الصف. الخانات اللي لسه مكتبتش فيها ممكن يكون فيها نُسخ قديمة.`),
          `numbers[${index}] = buffer[${index}] = ${value}`,
          { type: 'copy-back', from: index, to: index, value, id });
      }
      state.merges++;
      state.stack.pop();
      current().phase = 'merged';
      emit('merge-return', [30], message('This range is now stably sorted', 'الجزء ده اترتّب بثبات'),
        message(`Range ${interval(left, right)} contains exactly its original cards in sorted order. Equal cards kept their order. Return to sortRange.`,
          `الجزء ${interval(left, right)} فيه نفس كروته الأصلية بترتيب تصاعدي، والمتساويين فضلوا بنفس ترتيبهم. نرجع لـ sortRange.`),
        `return from merge(${left}, ${middle}, ${right})`, { type: 'merge-return', left, middle, right });
    }

    function sortRange(left, right, callLine) {
      const call = { routine: 'sortRange', left, right, middle: null, phase: 'enter' };
      state.stack.push(call); state.calls++;
      state.maxDepth = Math.max(state.maxDepth, state.stack.length);
      emit('call', [callLine], message('Enter a subproblem', 'ندخل جزء جديد'),
        message(`Sort range ${interval(left, right)}, containing ${right - left} cards. The caller waits on the stack.`,
          `هنرتّب الجزء ${interval(left, right)}، وفيه ${right - left} كارت. النداء اللي طلبه مستنّي في call stack.`),
        `sortRange(${left}, ${right})`, { type: 'call', left, right });
      const base = right - left <= 1;
      call.phase = 'base-check';
      emit('base-check', [6], message(base ? 'No merge is needed' : 'This range needs splitting', base ? 'مش محتاجين دمج هنا' : 'الجزء ده محتاج يتقسّم'),
        message(base ? 'Zero or one card is already sorted. Return without any value comparison or write.' : 'At least two cards remain. Split the range before doing any merge.',
          base ? 'صفر أو كارت واحد مترتّب أصلًا. هنرجع من غير مقارنة قيم أو كتابة.' : 'لسه في كارتين أو أكتر. نقسّم الجزء قبل أي دمج.'),
        `${right} - ${left} <= 1 → ${base}`, { type: 'base-check', left, right }, base);
      if (base) {
        state.stack.pop();
        emit('base-return', [6], message('Return the sorted base case', 'نرجع من الحالة البسيطة'),
          message(`Range ${interval(left, right)} is ready. Resume its caller, if any.`, `الجزء ${interval(left, right)} جاهز. نكمّل النداء اللي طلبه لو موجود.`),
          'return', { type: 'base-return', left, right });
        return;
      }
      const middle = Math.floor((left + right) / 2);
      call.middle = middle; call.phase = 'split';
      emit('split', [7], message('Split at the midpoint', 'نقسّم عند النصّ'),
        message(`The disjoint halves ${interval(left, middle)} and ${interval(middle, right)} cover this range exactly, even when its length is odd.`,
          `النصّين ${interval(left, middle)} و${interval(middle, right)} بيغطّوا الجزء كله من غير تداخل، حتى لو العدد فردي.`),
        `middle = floor((${left} + ${right}) / 2) = ${middle}`, { type: 'split', left, middle, right });
      call.phase = 'wait-left';
      sortRange(left, middle, 8);
      call.phase = 'wait-right';
      sortRange(middle, right, 9);
      call.phase = 'wait-merge';
      merge(left, middle, right);
      state.stack.pop();
      emit('range-return', [11], message('Return this sorted subproblem', 'نرجّع الجزء بعد ما اترتّب'),
        message(`Sorting ${interval(left, right)} is complete. Its caller can now use this sorted half.`, `ترتيب ${interval(left, right)} خلص. النداء اللي طلبه يقدر يستخدمه كنصّ مترتّب.`),
        'return', { type: 'range-return', left, right });
    }

    emit('ready', [], message('Split first. Merge in order.', 'نقسّم الأول، وبعدين ندمج بالترتيب.'),
      message('Sort smaller ranges first, then merge their front candidates. Keep equal cards in their original order by taking the left one first.',
        'نرتّب الأجزاء الصغيرة الأول، وبعدين ندمج من أول كارت في كل نصّ. لو قيمتين زي بعض، ناخد الشمال الأول عشان نحافظ على ترتيبهم.'));
    state.buffer = Array(numbers.length).fill(null);
    state.bufferSlots = Array(numbers.length).fill(null);
    state.bufferValid = Array(numbers.length).fill(false);
    state.auxiliarySlots = numbers.length;
    emit('allocate', [2], message('Allocate one reusable buffer', 'نجهّز buffer واحد نستخدمه تاني'),
      message(`Reserve ${numbers.length} auxiliary slots once. Recursive calls share this buffer; they do not allocate new subarrays.`,
        `نجهّز ${numbers.length} خانة مساعدة مرة واحدة. كل النداءات بتستخدم نفس buffer، من غير صفوف جديدة لكل جزء.`),
      `length(buffer) = ${numbers.length}`, { type: 'allocate', size: numbers.length });
    sortRange(0, numbers.length, 3);
    state.done = true; state.result = state.numbers.slice();
    emit('done', [4], message('The array is stably sorted', 'الصف اترتّب وحافظنا على ترتيب المتساويين'),
      message(`All ${numbers.length} cards are in ascending order. There were ${state.comparisons} value comparisons, ${state.bufferWrites} buffer writes, and ${state.copyBacks} array writes.`,
        `كل الـ ${numbers.length} كارت مترتّبين تصاعدي. عملنا ${state.comparisons} مقارنة قيم، و${state.bufferWrites} كتابة في buffer، و${state.copyBacks} كتابة في الصف.`),
      'return numbers', { type: 'done' });
    return frames;
  }

  const lesson = {
    id: 'merge-sort', name: 'Merge Sort', category: 'sort', number: '05',
    label: 'MERGE SORT', cost: 'O(n log n)',
    description: message('Split into smaller ranges, then merge sorted halves with a reusable buffer.', 'نقسّم لأجزاء أصغر، وبعدين ندمج النصّين المترتّبين باستخدام buffer واحد.'),
    note: message('Stable: take left on equality. Time O(n log n), auxiliary storage O(n), plus O(log n) call frames.', 'ثابت: عند التساوي ناخد الشمال. الوقت O(n log n)، والذاكرة المساعدة O(n)، ومعاها O(log n) نداءات.'),
    code,
    keySteps: ['ready', 'split', 'compare', 'buffer-write', 'merge-return', 'done'],
    view: { markers: { buffer: ['write'] } },
    fields: [{ name: 'numbers', type: 'text', maxLength: MAX_TEXT_LENGTH,
      label: message('Numbers', 'الأرقام'),
      help: message('Up to 16 integers from -999 to 999. Separate with spaces or commas (including ،). Arabic digits work. Leave blank for an empty array.',
        '١٦ رقم صحيح بالكتير من -999 لحد 999. افصل بمسافات أو فواصل، ومنها ،. الأرقام العربي شغّالة، وسيبها فاضية لو عايز صف فاضي.') }],
    defaults: { numbers: '7, 3, 5, 3, -2, 8, 1, 5' },
    presets: [
      { id: 'default', label: message('Mixed values and ties', 'قيم مختلفة وفيها تساوي'), input: { numbers: '7, 3, 5, 3, -2, 8, 1, 5' } },
      { id: 'cross-half-ties', label: message('Equal cards across halves', 'قيم متساوية في النصّين'), input: { numbers: '2, 1, 2, 1' } },
      { id: 'sorted', label: message('Already sorted', 'مترتّب أصلًا'), input: { numbers: '-4, -1, 0, 3, 6, 9' } },
      { id: 'reverse-odd', label: message('Reversed · odd length', 'بالعكس · عدد فردي'), input: { numbers: '9, 7, 5, 3, 1' } },
      { id: 'equal', label: message('All equal', 'كلهم زي بعض'), input: { numbers: '4, 4, 4, 4' } },
      { id: 'singleton', label: message('One card', 'كارت واحد'), input: { numbers: '-7' } },
      { id: 'empty', label: message('Empty array', 'صف فاضي'), input: { numbers: '' } },
    ],
    parse, build,
    summary(input) {
      const numbers = validate(input), repeated = numbers.length - new Set(numbers).size;
      return message(`${numbers.length} cards · ${repeated} repeated occurrences · stable ascending sort`,
        `${numbers.length} كارت · ${repeated} تكرار زيادة · ترتيب تصاعدي ثابت`);
    },
    theory: {
      idea: message('Split the array in half until every piece is a single card, then merge the sorted pieces back together by always taking the smaller front card.',
        'اقسم الصف نصّين لحد ما كل جزء يبقى كارت واحد، وبعدين ادمج الأجزاء المترتّبة مع بعض: كل مرة خُد الكارت الأصغر من أول الجزئين.'),
      title: message('Small sorted halves make a sorted whole', 'نصّين مترتّبين يعملوا جزء كامل مترتّب'),
      intro: message('Start with array indices, loops, and function calls. Recursion pauses a caller while a smaller subproblem runs. No initial sorting is required. This top-down version uses zero-based, half-open ranges [left, right).',
        'ابدأ بفهم أماكن الصف والحلقات ونداءات الدوال. Recursion بيوقّف النداء لحد ما الجزء الأصغر يخلص. مش محتاجين الإدخال يكون مترتّب. النسخة top-down دي بتبدأ الأماكن من 0 وبتستخدم [left, right)، يعني right مش ضمن الجزء.'),
      invariant: message('Before merging, both halves are sorted and stable. Each buffer write extends a sorted prefix containing exactly the consumed cards, in stable order. The smaller front is the next minimum; taking left on equality keeps earlier equal cards first. Copying the full buffer range back preserves this order. Singleton and empty base cases plus smaller recursive ranges prove correctness and termination.',
        'قبل الدمج، كل نصّ مترتّب وثابت. كل كتابة بتكبّر جزء مترتّب في buffer فيه بالضبط الكروت اللي خدناها وبنفس ترتيب المتساويين. أصغر كارت قدّامنا هو الجاي؛ ولو في تساوي، الشمال كان أسبق فناخده الأول. لما نرجّع buffer، الترتيب ده بيتحفظ. الأجزاء بتصغر لحد صفر أو كارت واحد، وده بيضمن الصحة وإننا هنخلص.'),
      steps: [
        { title: message('Split and pause', 'نقسّم ونستنى'), body: message('Calculate middle, recursively sort the left half, then the right half. The stack records waiting ranges. A range of size at most one returns immediately.',
          'نحسب middle ونرتّب الشمال بنداء أصغر، وبعده اليمين. Call stack بيحفظ الأجزاء المستنيّة. الجزء اللي فيه كارت واحد أو فاضي بيرجع فورًا.') },
        { title: message('Compare and buffer', 'نقارن ونكتب في buffer'), body: message('Compare only when both cursors are valid. Copy the smaller front to the buffer and advance that cursor. Use <= to select the left card on a tie. Once a half ends, copy the other remainder without value comparisons.',
          'نقارن بس لما المؤشّرين جوّه حدودهم. نكتب الأصغر في buffer ونقدّم مؤشّره. شرط <= بيختار الشمال عند التساوي. لو نصّ خلص، ننقل باقي التاني من غير مقارنة قيم.') },
        { title: message('Copy back and return', 'نرجّع ونكمل'), body: message('Copy every merged value back to the same index in the array before returning. No parent merges until both children return, so the same n-slot buffer can serve every level.',
          'نرجّع كل قيمة مدموجة لنفس المكان في الصف قبل الرجوع. النداء الأكبر مش بيدمج غير لما النصّين يخلصوا، فعشان كده buffer حجمه n يكفّي كل المستويات.') },
      ],
      notes: [
        message('Stable identities distinguish equal cards. Scratch copies have separate IDs. During copy back, faded old copies show actual memory without displaying one original card twice.',
          'كل كارت ليه هوية ثابتة حتى لو قيمته مكرّرة. نُسخ buffer ليها IDs تانية. وإحنا بنرجّع، النُسخ القديمة الباهتة بتوضح الذاكرة من غير ما نرسم نفس الكارت الأصلي مرتين.'),
        message('Each level writes every participating card to the buffer and back. Balanced splitting gives O(log n) levels and O(n log n) time for n ≥ 2, assuming constant-time integer comparison and assignment. This version does not skip already ordered merges.',
          'كل مستوى بيكتب الكروت المشاركة في buffer وبيرجّعها. التقسيم المتوازن بيدي O(log n) مستويات، فالوقت O(n log n) لما n ≥ 2، بافتراض المقارنة والكتابة وقتهم ثابت. النسخة دي مش بتتخطّى الدمج لو النصّين مترتّبين مع بعض أصلًا.'),
        message('Compared with in-place sorts, this version needs an n-slot buffer and extra writes. It offers stable ordering and predictable worst-case time, but it is not adaptive on nearly sorted input. Empty and singleton inputs take O(1) time.',
          'مقارنة بالترتيب in-place، النسخة دي محتاجة buffer بحجم n وكتابات زيادة. مقابل ده بتضمن الثبات ووقت أسوأ حالة واضح، بس مش بتستفيد من إن الإدخال شبه مترتّب. الصف الفاضي والكارت الواحد بياخدوا O(1) وقت.'),
        message('Metrics count value comparisons and individual writes; loop-bound checks are shown but excluded from the value-comparison count.',
          'العدادات بتحسب مقارنات القيم وكل كتابة لوحدها؛ فحص حدود الحلقات ظاهر بس مش ضمن عدّاد مقارنات القيم.'),
      ],
      costs: [
        { label: message('Best / average / worst time', 'أفضل / متوسط / أسوأ وقت'), value: 'O(n log n) for n ≥ 2' },
        { label: message('Reusable auxiliary buffer', 'buffer مساعد بنستخدمه تاني'), value: 'O(n)' },
        { label: message('Call stack', 'مساحة نداءات Call stack'), value: 'O(log n) for n ≥ 2' },
        { label: message('Stability', 'الثبات'), value: 'Stable: left wins equality (<=)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
